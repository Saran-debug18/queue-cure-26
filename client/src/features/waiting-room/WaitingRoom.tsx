import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Tv2, Sun, Clock, Users, CheckCircle, AlertCircle, PauseCircle } from 'lucide-react';
import { useQueueStore } from '../../store/queueStore';
import { useShallow } from 'zustand/shallow';
import { ConnectionStatus } from '../../components/ui/ConnectionStatus';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { PatientAvatar } from '../../components/ui/PatientAvatar';
import { formatWaitTime, formatTime } from '../../utils/format';

/* Animated pulse rings */
function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ border: '1px solid rgba(13,185,215,0.2)', width: 120 + i * 60, height: 120 + i * 60 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 3, delay: i * 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* Token display hero */
function NowServing({ token, name, type, isTVMode }: { token?: number; name?: string; type?: string; isTVMode: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {token != null ? (
        <motion.div
          key={token}
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0)' }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(4px)' }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="text-center"
        >
          <motion.div
            className="font-mono font-black leading-none inline-block"
            style={{
              fontSize: isTVMode ? '10rem' : '7rem',
              background: 'linear-gradient(135deg, #0DB9D7 0%, #38ECFF 50%, #0DB9D7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.06em',
              filter: 'drop-shadow(0 0 40px rgba(13,185,215,0.5))',
            }}
          >
            {String(token).padStart(3, '0')}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <p className="font-semibold mt-3" style={{ color: '#E8EDF5', fontSize: isTVMode ? '1.5rem' : '1.1rem' }}>{name}</p>
            <p className="text-sm mt-1 capitalize" style={{ color: '#3C4F6E' }}>{type} consultation</p>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div
            className="font-mono font-black leading-none"
            style={{ fontSize: isTVMode ? '8rem' : '6rem', color: '#2E4A72', letterSpacing: '-0.06em' }}
          >
            ---
          </div>
          <p className="text-sm mt-4" style={{ color: '#6B7FA3' }}>Waiting for first patient…</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Mini step-indicator for queue position */
function QueueSteps({ total, current }: { total: number; current: number }) {
  const visible = Math.min(total, 12);
  return (
    <div className="flex items-center gap-1 flex-wrap justify-center">
      {Array.from({ length: visible }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-500"
          style={{
            width: i < current ? 6 : 20,
            height: 6,
            background: i < current ? '#10B981' : i === current ? '#0DB9D7' : '#162035',
            boxShadow: i === current ? '0 0 8px rgba(13,185,215,0.6)' : 'none',
          }}
        />
      ))}
      {total > visible && <span className="text-xs" style={{ color: '#3C4F6E' }}>+{total - visible}</span>}
    </div>
  );
}

export function WaitingRoom({ onBack }: { onBack?: () => void }) {
  const { patients, stats, waitTimes, isTVMode, toggleTVMode, isPaused, pauseReason } = useQueueStore(useShallow(s => ({
    patients: s.patients,
    stats: s.stats,
    waitTimes: s.waitTimes,
    isTVMode: s.isTVMode,
    toggleTVMode: s.toggleTVMode,
    isPaused: s.isPaused,
    pauseReason: s.pauseReason,
  })));
  const [tokenSearch, setTokenSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const waiting = patients.filter(p => p.status === 'waiting');
  const inConsultation = patients.find(p => p.status === 'in-consultation');

  const searchedPatient = tokenSearch.trim()
    ? patients.find(p => p.token === Number(tokenSearch) && p.status === 'waiting')
    : undefined;
  const searchedWait = searchedPatient ? waitTimes[searchedPatient.id] : undefined;

  const totalSeen = stats.totalCompleted + stats.totalWaiting + (inConsultation ? 1 : 0);
  const progress = totalSeen > 0 ? Math.round(stats.totalCompleted / totalSeen * 100) : 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#04080F' }}
    >
      {/* ─── Header ─── */}
      <header
        className="px-6 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #0C1525', background: '#080F1D' }}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: '#0C1525', border: '1px solid #162035', color: '#3C4F6E' }}
              title="Back to home"
            >
              ←
            </button>
          )}
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="rgba(13,185,215,0.1)" />
            <rect x="14" y="6" width="4" height="20" rx="2" fill="#0DB9D7" />
            <rect x="6" y="14" width="20" height="4" rx="2" fill="#0DB9D7" />
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: '#E8EDF5' }}>Queue Cure</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(13,185,215,0.1)', color: '#0DB9D7', border: '1px solid rgba(13,185,215,0.2)' }}>'26</span>
            </div>
            <p className="text-[10px]" style={{ color: '#6B7FA3' }}>Patient Waiting Room</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Live clock */}
          <div className="hidden sm:block text-center">
            <p className="font-mono font-bold text-lg" style={{ color: '#8C9BBB', letterSpacing: '0.05em' }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[10px]" style={{ color: '#6B7FA3' }}>
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <ConnectionStatus />
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: '#0C1525', border: '1px solid #162035', color: '#3C4F6E' }}
            onClick={toggleTVMode} title="TV Mode"
          >
            {isTVMode ? <Sun size={14} style={{ color: '#F5A623' }} /> : <Tv2 size={14} />}
          </button>
        </div>
      </header>

      {/* ─── Pause Banner ─── */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-center gap-3 py-3 px-5 text-sm font-semibold"
              style={{ background: 'rgba(245,166,35,0.1)', borderBottom: '1px solid rgba(245,166,35,0.25)', color: '#F5A623' }}
            >
              <PauseCircle size={16} />
              <span>Queue is temporarily paused{pauseReason ? ` — ${pauseReason}` : ''} · Please wait, we'll resume shortly</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-6 flex flex-col gap-5">

        {/* ─── NOW SERVING hero ─── */}
        <div
          className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(13,185,215,0.12) 0%, #080F1D 70%)',
            border: '1px solid #162035',
            minHeight: isTVMode ? 380 : 280,
            boxShadow: inConsultation ? '0 0 80px rgba(13,185,215,0.1)' : 'none',
          }}
        >
          {/* teal glow top */}
          {inConsultation && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-0.5 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, #0DB9D7, transparent)' }}
            />
          )}

          {/* pulse rings behind token */}
          {inConsultation && <PulseRings />}

          <div className="relative z-10 py-10 px-6">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.3em] text-center mb-6"
              style={{ color: inConsultation ? '#0DB9D7' : '#1E3050' }}
            >
              {inConsultation ? '● Now Serving' : '○ Waiting'}
            </p>
            <NowServing
              token={inConsultation?.token}
              name={inConsultation?.name}
              type={inConsultation?.consultationType}
              isTVMode={isTVMode}
            />
          </div>
        </div>

        {/* ─── Stats strip ─── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Users size={16} />, label: 'Waiting', value: stats.totalWaiting, color: '#0DB9D7', dim: 'rgba(13,185,215,0.08)' },
            { icon: <Clock size={16} />, label: 'Avg Wait', value: formatWaitTime(stats.averageWaitTime), color: '#F5A623', dim: 'rgba(245,166,35,0.08)' },
            { icon: <CheckCircle size={16} />, label: 'Done Today', value: stats.totalCompleted, color: '#10B981', dim: 'rgba(16,185,129,0.08)' },
          ].map(({ icon, label, value, color, dim }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{ background: dim, border: `1px solid ${dim}`, borderColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex justify-center mb-2" style={{ color, opacity: 0.7 }}>{icon}</div>
              <p className="font-mono font-bold text-xl" style={{ color }}>{value}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#8C9BBB' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ─── Progress ─── */}
        <div className="rounded-xl p-4" style={{ background: '#080F1D', border: '1px solid #0C1525' }}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-medium" style={{ color: '#8C9BBB' }}>Today's Queue Progress</span>
            <span className="text-xs font-mono font-bold" style={{ color: '#0DB9D7' }}>{progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#162035' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #0DB9D7, #10B981)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px]" style={{ color: '#6B7FA3' }}>{stats.totalCompleted} completed</span>
            <span className="text-[10px]" style={{ color: '#6B7FA3' }}>{stats.totalWaiting} remaining</span>
          </div>
        </div>

        {/* ─── Token Lookup ─── */}
        <div className="rounded-xl p-4" style={{ background: '#080F1D', border: '1px solid #0C1525' }}>
          <label className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8C9BBB' }}>
            <Search size={12} /> Find Your Position
          </label>
          <input
            type="number"
            className="w-full py-3 px-4 rounded-xl font-mono font-bold text-2xl outline-none text-center transition-all"
            style={{
              background: '#04080F',
              border: '1px solid #162035',
              color: '#0DB9D7',
              caretColor: '#0DB9D7',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#0DB9D7'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,185,215,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#162035'; e.currentTarget.style.boxShadow = 'none'; }}
            placeholder="000"
            value={tokenSearch}
            onChange={e => setTokenSearch(e.target.value)}
          />

          <AnimatePresence>
            {tokenSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                {searchedPatient && searchedWait ? (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #162035' }}>
                    {/* Patient header */}
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{ background: '#0C1525', borderBottom: '1px solid #162035' }}
                    >
                      <div className="flex items-center gap-3">
                        <PatientAvatar name={searchedPatient.name} priority={searchedPatient.priority} size={36} />
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#E8EDF5' }}>{searchedPatient.name}</p>
                          <p className="text-xs" style={{ color: '#3C4F6E' }}>Token #{String(searchedPatient.token).padStart(3,'0')}</p>
                        </div>
                      </div>
                      <PriorityBadge priority={searchedPatient.priority} />
                    </div>
                    {/* Stats */}
                    <div className="grid grid-cols-3 divide-x" style={{ borderColor: '#162035' }}>
                      {[
                        { label: 'Ahead', value: String(searchedWait.tokensAhead), color: '#E8EDF5' },
                        { label: 'Wait', value: formatWaitTime(searchedWait.estimatedWaitMinutes), color: '#F5A623' },
                        { label: 'Called ~', value: formatTime(searchedWait.estimatedCallTime), color: '#0DB9D7' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="py-4 text-center" style={{ borderColor: '#162035' }}>
                          <p className="font-mono font-bold text-xl" style={{ color }}>{value}</p>
                          <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#8C9BBB' }}>{label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Queue position steps */}
                    {searchedWait.tokensAhead > 0 && (
                      <div className="py-3 px-4" style={{ borderTop: '1px solid #0C1525' }}>
                        <QueueSteps
                          total={waiting.length}
                          current={waiting.findIndex(p => p.id === searchedPatient.id)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs"
                    style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', color: '#F43F5E' }}
                  >
                    <AlertCircle size={13} /> Token not found in active queue
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Queue List ─── */}
        {waiting.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: '#080F1D', border: '1px solid #0C1525' }}>
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid #0C1525' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: '#8C9BBB' }}>
                <Users size={12} /> Upcoming
              </span>
              <span className="text-xs font-mono" style={{ color: '#6B7FA3' }}>{waiting.length} waiting</span>
            </div>

            <div className="divide-y" style={{ borderColor: '#0C1525' }}>
              <AnimatePresence initial={false}>
                {waiting.slice(0, isTVMode ? 5 : 8).map((p, i) => {
                  const wt = waitTimes[p.id];
                  const isNext = i === 0;
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                      style={{
                        background: p.priority === 'emergency' ? 'rgba(244,63,94,0.04)' : 'transparent',
                        borderColor: '#0C1525',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = p.priority === 'emergency' ? 'rgba(244,63,94,0.06)' : '#0C1525')}
                      onMouseLeave={e => (e.currentTarget.style.background = p.priority === 'emergency' ? 'rgba(244,63,94,0.04)' : 'transparent')}
                    >
                      {/* Position badge */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm flex-shrink-0"
                        style={{
                          background: isNext ? 'rgba(13,185,215,0.15)' : '#04080F',
                          border: `1px solid ${isNext ? 'rgba(13,185,215,0.4)' : '#162035'}`,
                          color: isNext ? '#0DB9D7' : '#3C4F6E',
                          boxShadow: isNext ? '0 0 12px rgba(13,185,215,0.15)' : 'none',
                        }}
                      >
                        {String(p.token).padStart(3, '0')}
                      </div>

                      {/* Avatar + info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <PatientAvatar name={p.name} priority={p.priority} size={32} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate" style={{ color: '#E8EDF5' }}>{p.name}</span>
                            {p.priority !== 'normal' && <PriorityBadge priority={p.priority} />}
                          </div>
                          <span className="text-xs" style={{ color: '#3C4F6E' }}>
                            #{i + 1} in queue · {p.age}y
                          </span>
                        </div>
                      </div>

                      {/* Wait time */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono font-semibold text-sm" style={{ color: '#F5A623' }}>
                          {wt ? formatWaitTime(wt.estimatedWaitMinutes) : '…'}
                        </p>
                        <p className="text-[10px]" style={{ color: '#3C4F6E' }}>
                          {wt ? `~${formatTime(wt.estimatedCallTime)}` : ''}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {waiting.length > (isTVMode ? 5 : 8) && (
              <div
                className="py-2.5 text-center text-xs"
                style={{ borderTop: '1px solid #0C1525', color: '#3C4F6E' }}
              >
                +{waiting.length - (isTVMode ? 5 : 8)} more patients in queue
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {waiting.length === 0 && !inConsultation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
            style={{ border: '1px solid #0C1525', borderRadius: 12, background: '#080F1D' }}
          >
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" stroke="#162035" strokeWidth="1.5" />
              <path d="M20 44 C20 36 24 30 32 30 C40 30 44 36 44 44" stroke="#1E3050" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="32" cy="22" r="6" stroke="#1E3050" strokeWidth="1.5"/>
              <circle cx="46" cy="20" r="3" stroke="#0DB9D7" strokeWidth="1.5" opacity="0.5"/>
              <path d="M46 20 L46 20" stroke="#0DB9D7" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div className="text-center">
              <p className="font-semibold text-sm" style={{ color: '#8C9BBB' }}>Queue is clear</p>
              <p className="text-xs mt-1" style={{ color: '#6B7FA3' }}>No patients are currently waiting</p>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="py-3 text-center flex-shrink-0"
        style={{ borderTop: '1px solid #080F1D' }}
      >
        <p className="text-[10px] font-medium" style={{ color: '#5A6E8E' }}>
          Queue Cure '26 · All times are estimates · Updates automatically without refresh
        </p>
      </footer>
    </div>
  );
}
