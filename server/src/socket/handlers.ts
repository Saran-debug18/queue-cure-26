import { Server, Socket } from 'socket.io';
import { queueService } from '../services/QueueService';
import { ConsultationType, Priority } from '../types';

type Ack<T = unknown> = (res: { success: boolean; data?: T; error?: string }) => void;

function ok<T>(ack: Ack<T> | undefined, data?: T) { ack?.({ success: true, data }); }
function fail(ack: Ack | undefined, error: string) { ack?.({ success: false, error }); }

export function registerSocketHandlers(io: Server, socket: Socket) {
  const sid = socket.id;

  socket.emit('queue:sync', queueService.getFullState());

  function broadcast() { io.emit('queue:update', queueService.getFullState()); }

  function idempotent(eventId: string, ack: Ack | undefined, fn: () => void) {
    if (queueService.isEventProcessed(eventId)) { ok(ack); return; }
    queueService.markEventProcessed(eventId);
    fn();
  }

  // ── Add patient ──
  socket.on('patient:add', (data: {
    eventId: string; name: string; age: number;
    consultationType: ConsultationType; priority: Priority;
    estimatedDuration?: number; notes?: string; doctorId?: string;
  }, ack?: Ack) => {
    idempotent(data.eventId, ack, () => {
      try {
        const p = queueService.addPatient(data);
        broadcast();
        ok(ack, p);
      } catch (e) { fail(ack, String(e)); }
    });
  });

  // ── Call next ──
  socket.on('token:next', (data: { eventId: string }, ack?: Ack) => {
    idempotent(data.eventId, ack, () => {
      const p = queueService.callNextToken(sid);
      if (!p) { fail(ack, 'Queue empty or locked'); return; }
      broadcast();
      io.emit('token:called', { token: p.token, name: p.name, doctorId: p.doctorId });
      ok(ack, p);
    });
  });

  // ── Update patient status ──
  socket.on('patient:update', (data: {
    eventId: string; patientId: string;
    status: 'completed' | 'no-show' | 'cancelled'; estimatedDuration?: number;
  }, ack?: Ack) => {
    idempotent(data.eventId, ack, () => {
      if (data.status === 'cancelled') queueService.cancelPatient(data.patientId);
      else queueService.completeConsultation(data.patientId, data.status);
      if (data.estimatedDuration) queueService.updatePatientDuration(data.patientId, data.estimatedDuration);
      broadcast();
      ok(ack);
    });
  });

  // ── Override duration ──
  socket.on('patient:setDuration', (data: { eventId: string; patientId: string; duration: number }, ack?: Ack) => {
    idempotent(data.eventId, ack, () => {
      queueService.updatePatientDuration(data.patientId, data.duration);
      broadcast();
      ok(ack);
    });
  });

  // ── Notes ──
  socket.on('patient:notes', (data: { eventId: string; patientId: string; notes: string }, ack?: Ack) => {
    idempotent(data.eventId, ack, () => {
      queueService.updatePatientNotes(data.patientId, data.notes);
      broadcast();
      ok(ack);
    });
  });

  // ── Assign doctor ──
  socket.on('patient:assignDoctor', (data: { eventId: string; patientId: string; doctorId: string }, ack?: Ack) => {
    idempotent(data.eventId, ack, () => {
      queueService.assignDoctor(data.patientId, data.doctorId);
      broadcast();
      ok(ack);
    });
  });

  // ── Reorder ──
  socket.on('patient:reorder', (data: { eventId: string; patientId: string; direction: 'up' | 'down' }, ack?: Ack) => {
    idempotent(data.eventId, ack, () => {
      const moved = queueService.reorderPatient(data.patientId, data.direction);
      if (!moved) { fail(ack, 'Cannot move in that direction'); return; }
      broadcast();
      ok(ack);
    });
  });

  // ── Default duration ──
  socket.on('queue:setDefaultDuration', (data: { minutes: number }) => {
    queueService.setDefaultDuration(data.minutes);
    broadcast();
  });

  // ── Pause / Resume ──
  socket.on('queue:pause', (data: { reason?: string }) => {
    queueService.pauseQueue(data?.reason);
    broadcast();
    io.emit('queue:paused', { reason: data?.reason });
  });

  socket.on('queue:resume', () => {
    queueService.resumeQueue();
    broadcast();
    io.emit('queue:resumed', {});
  });

  // ── Emergency ──
  socket.on('emergency:insert', (data: {
    eventId: string; name: string; age: number;
    consultationType: ConsultationType; notes?: string; doctorId?: string;
  }, ack?: Ack) => {
    idempotent(data.eventId, ack, () => {
      const p = queueService.insertEmergency(data);
      broadcast();
      io.emit('emergency:alert', { patient: p });
      ok(ack, p);
    });
  });

  // ── Doctor management ──
  socket.on('doctor:add', (data: { name: string; specialty: string }, ack?: Ack) => {
    const doc = queueService.addDoctor(data.name, data.specialty);
    broadcast();
    ok(ack, doc);
  });

  socket.on('doctor:toggle', (data: { doctorId: string }, ack?: Ack) => {
    const doc = queueService.toggleDoctor(data.doctorId);
    if (!doc) { fail(ack, 'Doctor not found'); return; }
    broadcast();
    ok(ack, doc);
  });

  // ── Reconnect ──
  socket.on('reconnect:sync', () => { socket.emit('queue:sync', queueService.getFullState()); });

  // ── Analytics ──
  socket.on('analytics:get', (ack?: (data: unknown) => void) => { ack?.(queueService.getAnalytics()); });

  socket.on('disconnect', () => console.log(`[Socket] disconnected: ${sid}`));
}
