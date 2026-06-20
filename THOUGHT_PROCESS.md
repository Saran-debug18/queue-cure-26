# Queue Cure '26 — Thought Process Document

*For hackathon judges: this document explains every design decision, algorithm, and trade-off.*

---

## 1. Problem Understanding

Clinics typically hand out paper tokens and call them manually. Patients have no visibility into how long they'll wait, leading to anxiety, complaints, and walk-outs. Receptionists juggle a whiteboard, phone calls, and paper tokens simultaneously — a recipe for errors.

The core product insight: **if patients can see a live, accurate estimate of when they'll be called, they relax.** If receptionists have a single, fast interface for all queue operations, they make fewer mistakes.

This drives two very different UX goals:

- **Receptionist screen**: optimized for *speed and correctness* (keyboard shortcuts, large buttons, confirmation on destructive actions, optimistic updates)
- **Waiting room screen**: optimized for *legibility and trust* (giant token number, real-time wait estimate, TV-ready layout, no interaction needed)

---

## 2. Design Decisions

### Single source of truth on the server

The server holds the canonical `QueueState`. Clients are dumb renderers of that state. This means:

- No conflicting client-side mutations
- Reconnecting clients instantly get the full current state
- Analytics and wait-time computation happen in one place with consistent data

### Full-state broadcast vs. delta events

I chose to broadcast the **full queue state** on every update rather than sending delta patches. Rationale:

- Queue operations happen at human speed (seconds apart), not machine speed
- Full-state eliminates "apply delta in wrong order" bugs entirely
- Reconnecting clients get complete state in one message
- State size for a real clinic queue (< 200 patients/day) is negligible (~20 KB)

At very large scale (10,000+ concurrent clients), switching to delta + version vectors would be warranted. Not for this domain.

### Separate socket event handlers from business logic

`QueueService` is a pure TypeScript class with zero socket awareness. `socket/handlers.ts` is a thin adapter layer. This means:

- Business logic is unit-testable without mocking Socket.IO
- Swapping from in-memory to MongoDB requires touching only `QueueService`
- Adding REST API endpoints reuses the same service

---

## 3. Queue Algorithm

The queue maintains a priority-ordered list of patients with status `waiting`. On every mutating operation, the queue is re-sorted by this comparator:

```typescript
function compare(a: Patient, b: Patient): number {
  // Primary: priority tier (0=emergency, 1=senior, 2=normal)
  const tierDiff = priorityWeight(a.priority) - priorityWeight(b.priority);
  if (tierDiff !== 0) return tierDiff;
  // Secondary: registration timestamp (FIFO within tier)
  return a.registeredAt - b.registeredAt;
}
```

This guarantees:
- Emergency patients always go first, regardless of when they registered
- Within each tier, earliest arrival is served first (FIFO)
- Re-sorting on every mutation keeps `position` fields consistent

Positions are re-assigned after every sort so the waiting room can display "#3 in queue" accurately.

---

## 4. Wait Time Calculation

**Formula:**

```
EstimatedWait(patient P) =
  RemainingTimeOfCurrentConsultation
  + Σ estimatedDuration(patient_i) for all patients i ahead of P in queue
```

**Where `estimatedDuration` comes from:**

1. If a per-patient override was set by the receptionist → use that
2. Else if there is consultation history for this type → use the rolling average of actual durations
3. Else → use the type-specific default (general=10, specialist=20, follow-up=8, emergency=15)

**Remaining time of current consultation:**

```typescript
const elapsed = (now - consultationStartedAt) / 60000; // minutes
const remaining = Math.max(0, estimatedDuration - elapsed);
```

The `Math.max(0, ...)` clamps to zero if a consultation is already overrunning — we don't let it "eat into" future wait times.

**Recalculation triggers:**

- Patient added / cancelled / completed
- Emergency insertion
- Consultation duration changed
- Token called (shifts everyone up)

Every `queue:update` broadcast includes the freshly computed `waitTimes` map so clients always show current numbers.

**Learning from history:**

```typescript
const history = this.consultationHistory.filter(h => h.consultationType === type);
const avg = history.length > 0
  ? Math.round(history.reduce((s, h) => s + h.duration, 0) / history.length)
  : DEFAULT_DURATION[type];
```

As the day progresses, the average improves: if this doctor is running 15-minute "general" consults today (vs. the default 10), the system learns that within the first few completions.

---

## 5. Concurrency Strategy

Three independent layers of protection:

### Layer 1: Server-side queue lock (mutex)

```typescript
acquireLock(holderId: string): boolean {
  if (this.isLocked) {
    const elapsed = Date.now() - this.lockTimestamp;
    if (elapsed < LOCK_TIMEOUT_MS) return false; // still locked
    // Auto-release stale lock (timeout safety)
  }
  this.isLocked = true;
  this.lockHolder = holderId;
  this.lockTimestamp = Date.now();
  return true;
}
```

`callNextToken` acquires the lock before mutating the queue and releases it in a `finally` block. If two sockets send `token:next` simultaneously, the second one gets `{ success: false }` immediately. Lock auto-releases after 5 seconds to handle server crashes.

### Layer 2: Event idempotency

Every socket event carries a client-generated `eventId` (UUID v4). The server maintains a `Set<string>` of processed IDs:

```typescript
if (this.isEventProcessed(data.eventId)) {
  ack({ success: true }); // idempotent — already processed
  return;
}
this.markEventProcessed(data.eventId);
```

This handles: network retries, double-clicks before server ACK, Socket.IO's own retry logic on reconnect. The set is pruned to 1000 entries to avoid unbounded growth.

### Layer 3: Reconnect sync

On every `connect` event (initial and reconnect), the server immediately sends `queue:sync` with full state. The client also emits `reconnect:sync` to handle the case where the server is mid-broadcast at connect time.

### Double-click protection on client

The "Call Next" button has a local `callingNext` boolean that prevents re-submission while an ACK is pending. Combined with server-side locking, this gives defense in depth.

---

## 6. Edge Case Handling

| Edge Case | Detection | Resolution |
|---|---|---|
| Empty queue + Call Next | `waiting.length === 0` | Button disabled; server returns null |
| Emergency during active consultation | Always allowed | Emergency patient inserted at front; current consultation continues uninterrupted |
| Socket disconnect mid-operation | `disconnect` event | Client shows "Reconnecting…" badge; Zustand state frozen until reconnect |
| Browser refresh | `connect` fires | Server sends full `queue:sync` |
| Two receptionists | Server lock | First caller proceeds; second gets error response |
| Average duration = 0 | History empty | Fall through to type-specific defaults |
| Long overrun | `Math.max(0, remaining)` | Clamp remaining to 0; doesn't penalize patients behind |
| Duplicate patient names | No constraint | Patients are distinguished by unique UUID + token number |
| No-show patient | Status `no-show` | Removed from wait calculation; duration NOT added to history |
| Cancelled patient | Status `cancelled` | Same as no-show for queue purposes |

---

## 7. Scalability Plan

### Current: Single Node.js process, in-memory

Works for: 1 clinic, 1 receptionist, 50-200 patients/day

### Phase 2: Persistent store

- Add MongoDB with Mongoose
- `QueueService` methods become async, write to DB
- Session resumable after server restart

### Phase 3: Multi-instance horizontal scale

```
                        [Load Balancer]
                       /               \
              [Node 1]                 [Node 2]
             (Socket.IO)              (Socket.IO)
                 |                        |
            [Redis Pub/Sub]  ←→  [Redis Pub/Sub]
                         \      /
                      [MongoDB]
```

- `socket.io-redis` adapter broadcasts events across all instances
- Redis holds queue lock (atomic `SET NX EX` for distributed mutex)
- MongoDB persists state across restarts

### Phase 4: Multi-clinic

- Socket.IO namespaces: `/clinic/abc123`
- Separate Zustand slices or separate React roots per clinic
- Multi-tenant MongoDB with clinic ID on every document

### Phase 5: Intelligence

- Replace rolling average with XGBoost model trained on time-of-day, day-of-week, doctor, consultation type
- Predict queue wait within ±2 minutes after 2 weeks of data

---

## 8. Future Roadmap

**Week 1 (Post-hackathon)**
- MongoDB persistence (so queue survives server restart)
- Doctor-facing view (see who's coming next without full receptionist access)
- Basic auth (JWT) separating receptionist vs. display-only access

**Month 1**
- Patient self-registration via QR code on phone
- SMS notification when "you're next"
- Analytics dashboard: peak hour chart, completion rate trend

**Month 3**
- Appointment integration (convert scheduled appointments to tokens automatically)
- Multi-clinic support
- Audit log with export to CSV

**Month 6**
- ML wait time prediction
- Patient satisfaction survey after consultation
- Bi-directional: patient can notify if they need to step out briefly

---

## Key Technical Takeaways for Judges

1. **Wait time is never hardcoded.** It's computed from actual consultation timestamps recorded to the second. The system learns as the day progresses.

2. **Concurrency has three independent layers.** Locking, idempotency, and client-side guard. Any one layer alone is insufficient; together they handle every realistic race condition.

3. **The architecture scales linearly.** Adding Redis and MongoDB is a two-file change (QueueService + index.ts). The rest of the system is already ready for it.

4. **Both screens are designed for their audiences.** The receptionist gets keyboard shortcuts and instant feedback. The patient gets large text and zero interaction required. These are fundamentally different UX contexts and the product treats them that way.
