import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Event {
  direction: 'c2s' | 's2c';
  name: string;
  trigger: string;
  payload: string;
  response?: string;
  color: string;
}

const EVENTS: Event[] = [
  {
    direction: 'c2s',
    name: 'patient:add',
    trigger: 'Receptionist submits Add Patient form',
    payload: '{ name, age, consultationType, priority, notes?, doctorId?, eventId }',
    response: 'ACK → { success, data: Patient } + queue:update broadcast',
    color: '#0DB9D7',
  },
  {
    direction: 'c2s',
    name: 'token:next',
    trigger: '"Call Next" button clicked',
    payload: '{ eventId }',
    response: 'ACK → { success, data: Patient } + queue:update + token:called broadcasts',
    color: '#0DB9D7',
  },
  {
    direction: 'c2s',
    name: 'emergency:insert',
    trigger: 'Emergency Insert form submitted',
    payload: '{ name, age, consultationType, notes?, doctorId?, eventId }',
    response: 'ACK → { success } + queue:update + emergency:alert broadcasts',
    color: '#F43F5E',
  },
  {
    direction: 'c2s',
    name: 'patient:update',
    trigger: '"Done" / "No-show" / "Cancel" clicked on PatientRow',
    payload: '{ patientId, status: completed|no-show|cancelled, eventId }',
    response: 'ACK → { success } + queue:update broadcast',
    color: '#0DB9D7',
  },
  {
    direction: 'c2s',
    name: 'patient:notes',
    trigger: 'Notes saved on PatientRow inline editor',
    payload: '{ patientId, notes, eventId }',
    response: 'ACK → { success } + queue:update broadcast',
    color: '#0DB9D7',
  },
  {
    direction: 'c2s',
    name: 'patient:reorder',
    trigger: '↑ / ↓ reorder buttons clicked',
    payload: '{ patientId, direction: up|down, eventId }',
    response: 'ACK → { success } + queue:update broadcast',
    color: '#0DB9D7',
  },
  {
    direction: 'c2s',
    name: 'patient:assignDoctor',
    trigger: 'Doctor pill selected on PatientRow',
    payload: '{ patientId, doctorId, eventId }',
    response: 'ACK → { success } + queue:update broadcast',
    color: '#0DB9D7',
  },
  {
    direction: 'c2s',
    name: 'queue:pause / queue:resume',
    trigger: 'Pause / Resume button clicked',
    payload: '{ reason? } / {}',
    response: 'queue:update + queue:paused|queue:resumed broadcasts',
    color: '#F5A623',
  },
  {
    direction: 'c2s',
    name: 'reconnect:sync',
    trigger: 'Socket reconnects after disconnect',
    payload: '{}',
    response: 'Server emits queue:sync with full current state',
    color: '#6B7FA3',
  },
  {
    direction: 's2c',
    name: 'queue:sync',
    trigger: 'On initial connect OR after reconnect:sync',
    payload: 'FullQueueState { patients, stats, doctors, waitTimes, activityLog, isPaused }',
    color: '#10B981',
  },
  {
    direction: 's2c',
    name: 'queue:update',
    trigger: 'After any mutation (broadcast to ALL clients)',
    payload: 'FullQueueState — same shape as queue:sync',
    color: '#10B981',
  },
  {
    direction: 's2c',
    name: 'token:called',
    trigger: 'When token:next is processed',
    payload: '{ token: number, name: string, doctorId? }',
    color: '#F5A623',
  },
  {
    direction: 's2c',
    name: 'emergency:alert',
    trigger: 'When emergency:insert is processed',
    payload: '{ patient: Patient }',
    color: '#F43F5E',
  },
  {
    direction: 's2c',
    name: 'queue:paused / queue:resumed',
    trigger: 'When queue:pause / queue:resume is processed',
    payload: '{ reason? } / {}',
    color: '#F5A623',
  },
];

const C2S = EVENTS.filter(e => e.direction === 'c2s');
const S2C = EVENTS.filter(e => e.direction === 's2c');

function EventPill({ event, onClick, active }: { event: Event; onClick: () => void; active: boolean }) {
  const isC2S = event.direction === 'c2s';
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left rounded-xl px-4 py-3 transition-all"
      style={{
        background: active ? `${event.color}18` : '#080F1D',
        border: `1px solid ${active ? event.color + '60' : '#162035'}`,
        boxShadow: active ? `0 0 20px ${event.color}18` : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: isC2S ? 'rgba(13,185,215,0.15)' : 'rgba(16,185,129,0.15)', color: isC2S ? '#0DB9D7' : '#10B981' }}
          >
            {isC2S ? 'C→S' : 'S→C'}
          </span>
          <code className="text-xs font-bold font-mono" style={{ color: event.color }}>{event.name}</code>
        </div>
        {active && <span style={{ color: event.color, fontSize: 10 }}>▸ details</span>}
      </div>
      <p className="text-[10px] mt-1 leading-relaxed" style={{ color: '#6B7FA3' }}>{event.trigger}</p>
    </motion.button>
  );
}

export function SocketDiagram({ onBack }: { onBack?: () => void }) {
  const [selected, setSelected] = useState<Event | null>(null);

  const toggle = (e: Event) => setSelected(prev => prev?.name === e.name ? null : e);

  return (
    <div className="min-h-screen" style={{ background: '#04080F' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-8 py-5 flex items-center gap-4"
        style={{ background: '#080F1D', borderBottom: '1px solid #162035' }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: '#0C1525', border: '1px solid #162035', color: '#3C4F6E' }}
            title="Back to home"
          >
            ←
          </button>
        )}
        <div>
          <h1 className="text-xl font-black" style={{ color: '#E8EDF5', letterSpacing: '-0.03em' }}>
            Socket Event Diagram
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B7FA3' }}>
            Queue Cure '26 — Real-time event flow between Receptionist Client ↔ Node.js Server
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'rgba(13,185,215,0.1)', color: '#0DB9D7', border: '1px solid rgba(13,185,215,0.3)' }}
        >
          ⬇ Print / Export
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-2"><span className="w-8 h-0.5 inline-block" style={{ background: '#0DB9D7' }} /><span style={{ color: '#0DB9D7' }}>Client → Server</span></div>
          <div className="flex items-center gap-2"><span className="w-8 h-0.5 inline-block" style={{ background: '#10B981' }} /><span style={{ color: '#10B981' }}>Server → Client (broadcast)</span></div>
          <div className="flex items-center gap-2"><span className="w-8 h-0.5 inline-block" style={{ background: '#F5A623' }} /><span style={{ color: '#F5A623' }}>Queue state control</span></div>
          <div className="flex items-center gap-2"><span className="w-8 h-0.5 inline-block" style={{ background: '#F43F5E' }} /><span style={{ color: '#F43F5E' }}>Emergency / alerts</span></div>
        </div>

        {/* Main Flow Diagram (SVG) */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#080F1D', border: '1px solid #162035' }}>
          <svg viewBox="0 0 900 620" xmlns="http://www.w3.org/2000/svg" className="w-full">
            {/* Background */}
            <rect width="900" height="620" fill="#080F1D" />

            {/* Column headers */}
            <rect x="30" y="20" width="200" height="44" rx="10" fill="rgba(13,185,215,0.1)" stroke="rgba(13,185,215,0.3)" strokeWidth="1" />
            <text x="130" y="38" textAnchor="middle" fill="#0DB9D7" fontSize="11" fontWeight="700" fontFamily="monospace">RECEPTIONIST CLIENT</text>
            <text x="130" y="56" textAnchor="middle" fill="#6B7FA3" fontSize="9" fontFamily="monospace">React + Zustand + Socket.IO</text>

            <rect x="340" y="20" width="220" height="44" rx="10" fill="rgba(245,166,35,0.08)" stroke="rgba(245,166,35,0.25)" strokeWidth="1" />
            <text x="450" y="38" textAnchor="middle" fill="#F5A623" fontSize="11" fontWeight="700" fontFamily="monospace">SOCKET.IO SERVER</text>
            <text x="450" y="56" textAnchor="middle" fill="#6B7FA3" fontSize="9" fontFamily="monospace">Node.js + Express + Socket.IO</text>

            <rect x="670" y="20" width="200" height="44" rx="10" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
            <text x="770" y="38" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700" fontFamily="monospace">WAITING ROOM CLIENT</text>
            <text x="770" y="56" textAnchor="middle" fill="#6B7FA3" fontSize="9" fontFamily="monospace">React + Zustand + Socket.IO</text>

            {/* Vertical timelines */}
            <line x1="130" y1="70" x2="130" y2="610" stroke="#162035" strokeWidth="1.5" strokeDasharray="4,4" />
            <line x1="450" y1="70" x2="450" y2="610" stroke="#162035" strokeWidth="1.5" strokeDasharray="4,4" />
            <line x1="770" y1="70" x2="770" y2="610" stroke="#162035" strokeWidth="1.5" strokeDasharray="4,4" />

            {/* ── Flow 1: patient:add ── */}
            {/* Arrow C→S */}
            <line x1="140" y1="110" x2="440" y2="110" stroke="#0DB9D7" strokeWidth="1.5" markerEnd="url(#arrowTeal)" />
            <text x="285" y="104" textAnchor="middle" fill="#0DB9D7" fontSize="9" fontWeight="700" fontFamily="monospace">patient:add</text>
            {/* ACK S→C */}
            <line x1="440" y1="125" x2="140" y2="125" stroke="#0DB9D7" strokeWidth="1" strokeDasharray="3,2" markerEnd="url(#arrowTealDim)" />
            <text x="285" y="138" textAnchor="middle" fill="#3C4F6E" fontSize="8" fontFamily="monospace">ACK {'{'}success, patient{'}'}</text>
            {/* Broadcast S→both */}
            <line x1="460" y1="148" x2="760" y2="148" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
            <line x1="440" y1="148" x2="150" y2="148" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
            <text x="450" y="142" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="700" fontFamily="monospace">queue:update (broadcast)</text>

            {/* ── Flow 2: token:next ── */}
            <line x1="140" y1="195" x2="440" y2="195" stroke="#0DB9D7" strokeWidth="1.5" markerEnd="url(#arrowTeal)" />
            <text x="285" y="189" textAnchor="middle" fill="#0DB9D7" fontSize="9" fontWeight="700" fontFamily="monospace">token:next</text>
            <line x1="460" y1="210" x2="760" y2="210" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
            <line x1="440" y1="210" x2="150" y2="210" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
            <text x="450" y="204" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="700" fontFamily="monospace">queue:update (broadcast)</text>
            <line x1="460" y1="228" x2="760" y2="228" stroke="#F5A623" strokeWidth="1.5" markerEnd="url(#arrowAmber)" />
            <line x1="440" y1="228" x2="150" y2="228" stroke="#F5A623" strokeWidth="1.5" markerEnd="url(#arrowAmber)" />
            <text x="450" y="222" textAnchor="middle" fill="#F5A623" fontSize="9" fontWeight="700" fontFamily="monospace">token:called (broadcast)</text>

            {/* ── Flow 3: emergency:insert ── */}
            <line x1="140" y1="275" x2="440" y2="275" stroke="#F43F5E" strokeWidth="1.5" markerEnd="url(#arrowRose)" />
            <text x="285" y="269" textAnchor="middle" fill="#F43F5E" fontSize="9" fontWeight="700" fontFamily="monospace">emergency:insert</text>
            <line x1="460" y1="290" x2="760" y2="290" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
            <line x1="440" y1="290" x2="150" y2="290" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
            <text x="450" y="284" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="700" fontFamily="monospace">queue:update (broadcast)</text>
            <line x1="460" y1="308" x2="760" y2="308" stroke="#F43F5E" strokeWidth="1.5" markerEnd="url(#arrowRose)" />
            <line x1="440" y1="308" x2="150" y2="308" stroke="#F43F5E" strokeWidth="1.5" markerEnd="url(#arrowRose)" />
            <text x="450" y="302" textAnchor="middle" fill="#F43F5E" fontSize="9" fontWeight="700" fontFamily="monospace">emergency:alert (broadcast)</text>

            {/* ── Flow 4: queue:pause ── */}
            <line x1="140" y1="355" x2="440" y2="355" stroke="#F5A623" strokeWidth="1.5" markerEnd="url(#arrowAmber)" />
            <text x="285" y="349" textAnchor="middle" fill="#F5A623" fontSize="9" fontWeight="700" fontFamily="monospace">queue:pause / queue:resume</text>
            <line x1="460" y1="370" x2="760" y2="370" stroke="#F5A623" strokeWidth="1.5" markerEnd="url(#arrowAmber)" />
            <line x1="440" y1="370" x2="150" y2="370" stroke="#F5A623" strokeWidth="1.5" markerEnd="url(#arrowAmber)" />
            <text x="450" y="364" textAnchor="middle" fill="#F5A623" fontSize="9" fontWeight="700" fontFamily="monospace">queue:paused | queue:resumed (broadcast)</text>

            {/* ── Flow 5: reconnect ── */}
            <line x1="140" y1="415" x2="440" y2="415" stroke="#6B7FA3" strokeWidth="1.5" markerEnd="url(#arrowGray)" />
            <text x="285" y="409" textAnchor="middle" fill="#6B7FA3" fontSize="9" fontWeight="700" fontFamily="monospace">reconnect:sync (on reconnect)</text>
            <line x1="440" y1="430" x2="150" y2="430" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
            <text x="285" y="424" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="700" fontFamily="monospace">queue:sync (full state)</text>

            {/* ── Idempotency note ── */}
            <rect x="310" y="460" width="280" height="70" rx="8" fill="rgba(245,166,35,0.06)" stroke="rgba(245,166,35,0.2)" strokeWidth="1" />
            <text x="450" y="478" textAnchor="middle" fill="#F5A623" fontSize="9" fontWeight="700" fontFamily="monospace">⚡ CONCURRENCY GUARD</text>
            <text x="450" y="495" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">Each mutation carries a UUID eventId.</text>
            <text x="450" y="510" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">Server tracks processedEventIds (Set) to</text>
            <text x="450" y="525" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">deduplicate retried events on reconnect.</text>

            {/* ── Priority Queue note ── */}
            <rect x="30" y="460" width="260" height="70" rx="8" fill="rgba(13,185,215,0.05)" stroke="rgba(13,185,215,0.2)" strokeWidth="1" />
            <text x="160" y="478" textAnchor="middle" fill="#0DB9D7" fontSize="9" fontWeight="700" fontFamily="monospace">🏥 PRIORITY QUEUE</text>
            <text x="160" y="495" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">emergency (0) → senior (1) → normal (2)</text>
            <text x="160" y="510" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">FIFO within each tier. Wait time computed</text>
            <text x="160" y="525" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">from rolling avg of completed consults.</text>

            {/* ── Wait time note ── */}
            <rect x="610" y="460" width="260" height="70" rx="8" fill="rgba(16,185,129,0.05)" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
            <text x="740" y="478" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="700" fontFamily="monospace">⏱ WAIT TIME ENGINE</text>
            <text x="740" y="495" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">estimatedWait = Σ(durations ahead)</text>
            <text x="740" y="510" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">Duration per type = rolling average of</text>
            <text x="740" y="525" textAnchor="middle" fill="#8C9BBB" fontSize="8" fontFamily="monospace">completed consultations (not hardcoded).</text>

            {/* Section labels */}
            <text x="130" y="88" textAnchor="middle" fill="#3C4F6E" fontSize="8" fontFamily="monospace">── patient actions ──</text>
            <text x="130" y="175" textAnchor="middle" fill="#3C4F6E" fontSize="8" fontFamily="monospace">── call next ──</text>
            <text x="130" y="255" textAnchor="middle" fill="#3C4F6E" fontSize="8" fontFamily="monospace">── emergency ──</text>
            <text x="130" y="335" textAnchor="middle" fill="#3C4F6E" fontSize="8" fontFamily="monospace">── queue control ──</text>
            <text x="130" y="395" textAnchor="middle" fill="#3C4F6E" fontSize="8" fontFamily="monospace">── reconnection ──</text>

            {/* Watermark */}
            <text x="450" y="610" textAnchor="middle" fill="#162035" fontSize="9" fontFamily="monospace">Queue Cure '26 — Wooble Hackathon Submission</text>

            {/* Arrow markers */}
            <defs>
              <marker id="arrowTeal" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#0DB9D7" />
              </marker>
              <marker id="arrowTealDim" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#3C4F6E" />
              </marker>
              <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#10B981" />
              </marker>
              <marker id="arrowAmber" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#F5A623" />
              </marker>
              <marker id="arrowRose" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#F43F5E" />
              </marker>
              <marker id="arrowGray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#6B7FA3" />
              </marker>
            </defs>
          </svg>
        </div>

        {/* Event Reference Table */}
        <div>
          <h2 className="text-sm font-bold mb-4 uppercase tracking-widest" style={{ color: '#6B7FA3' }}>Full Event Reference</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#0DB9D7' }}>Client → Server</p>
              <div className="space-y-2">
                {C2S.map(e => (
                  <EventPill key={e.name} event={e} onClick={() => toggle(e)} active={selected?.name === e.name} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#10B981' }}>Server → Client</p>
              <div className="space-y-2">
                {S2C.map(e => (
                  <EventPill key={e.name} event={e} onClick={() => toggle(e)} active={selected?.name === e.name} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-2xl p-6 space-y-3"
              style={{ background: '#080F1D', border: `1px solid ${selected.color}40` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: selected.direction === 'c2s' ? 'rgba(13,185,215,0.15)' : 'rgba(16,185,129,0.15)', color: selected.direction === 'c2s' ? '#0DB9D7' : '#10B981' }}>
                  {selected.direction === 'c2s' ? 'Client → Server' : 'Server → Client'}
                </span>
                <code className="text-base font-black font-mono" style={{ color: selected.color }}>{selected.name}</code>
              </div>
              <p className="text-sm" style={{ color: '#8C9BBB' }}><span className="font-semibold" style={{ color: '#E8EDF5' }}>Trigger: </span>{selected.trigger}</p>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#3C4F6E' }}>Payload</p>
                <code className="text-xs block p-3 rounded-lg" style={{ background: '#04080F', color: '#0DB9D7', border: '1px solid #162035' }}>{selected.payload}</code>
              </div>
              {selected.response && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#3C4F6E' }}>Response / Side Effects</p>
                  <p className="text-sm" style={{ color: '#8C9BBB' }}>{selected.response}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
