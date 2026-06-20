import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, Clock, ChevronRight,
  Plus, Zap, Settings, BarChart2, Timer, Hash,
  Search, Pause, Play, Volume2, VolumeX, CalendarCheck,
  Filter, X,
} from 'lucide-react';
import { useQueueStore } from '../../store/queueStore';
import { useShallow } from 'zustand/shallow';
import { socketActions } from '../../hooks/useSocket';
import { useSoundAlert } from '../../hooks/useSoundAlert';
import { useOvertimeTracker } from '../../hooks/useOvertimeTracker';
import { ConnectionStatus } from '../../components/ui/ConnectionStatus';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { AddPatientForm } from './AddPatientForm';
import { PatientRow } from './PatientRow';
import { ActivityFeed } from './ActivityFeed';
import { AnalyticsPanel } from './AnalyticsPanel';
import { EndOfDaySummary } from './EndOfDaySummary';
import { formatWaitTime } from '../../utils/format';
import toast from 'react-hot-toast';

type Tab = 'queue' | 'history' | 'analytics';

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="rgba(13,185,215,0.12)" />
      <rect x="14" y="6" width="4" height="20" rx="2" fill="#0DB9D7" />
      <rect x="6" y="14" width="20" height="4" rx="2" fill="#0DB9D7" />
    </svg>
  );
}

function EmptyQueue({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="36" stroke="#162035" strokeWidth="2" />
        <path d="M26 52 C26 44 30 38 40 38 C50 38 54 44 54 52" stroke="#1E3050" strokeWidth="2" strokeLinecap="round" />
        <circle cx="40" cy="28" r="8" stroke="#1E3050" strokeWidth="2" />
        <path d="M56 24 L60 28 M60 24 L56 28" stroke="#162035" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 56 L26 60 M26 56 L22 60" stroke="#162035" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: '#8C9BBB' }}>{label}</p>
        <p className="text-xs mt-1" style={{ color: '#6B7FA3' }}>
          {label.includes('history') ? 'Completed patients will appear here' : 'Add a patient to get started'}
        </p>
      </div>
    </div>
  );
}

export function ReceptionistDashboard({ onBack }: { onBack?: () => void }) {
  const {
    patients, stats, defaultConsultationDuration,
    isPaused, pauseReason, doctors,
    soundEnabled, toggleSound,
    searchQuery, filterPriority, filterDoctor,
    setSearch, setFilterPriority, setFilterDoctor,
  } = useQueueStore(useShallow(s => ({
    patients: s.patients,
    stats: s.stats,
    defaultConsultationDuration: s.defaultConsultationDuration,
    isPaused: s.isPaused,
    pauseReason: s.pauseReason,
    doctors: s.doctors,
    soundEnabled: s.soundEnabled,
    toggleSound: s.toggleSound,
    searchQuery: s.searchQuery,
    filterPriority: s.filterPriority,
    filterDoctor: s.filterDoctor,
    setSearch: s.setSearch,
    setFilterPriority: s.setFilterPriority,
    setFilterDoctor: s.setFilterDoctor,
  })));

  const [showAdd, setShowAdd] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [callingNext, setCallingNext] = useState(false);
  const [durationInput, setDurationInput] = useState(String(defaultConsultationDuration));
  const [tab, setTab] = useState<Tab>('queue');
  const [pauseInputReason, setPauseInputReason] = useState('');

  // Activate hooks
  useSoundAlert();
  const { overtimeSeconds, isOvertime } = useOvertimeTracker();

  const waiting = patients.filter(p => p.status === 'waiting');
  const inConsultation = patients.find(p => p.status === 'in-consultation');
  const history = patients.filter(p => ['completed', 'no-show', 'cancelled'].includes(p.status));

  // Filtered waiting list for queue display
  const filteredWaiting = waiting.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    if (filterDoctor) {
      if (filterDoctor === 'unassigned') return !p.doctorId;
      if (p.doctorId !== filterDoctor) return false;
    }
    return true;
  });

  const queueDisplayed = tab === 'queue'
    ? [...(inConsultation ? [inConsultation] : []), ...filteredWaiting]
    : history;

  const handleCallNext = useCallback(async () => {
    if (callingNext || waiting.length === 0 || isPaused) return;
    setCallingNext(true);
    try {
      await socketActions.callNext();
      toast.success(`Now calling Token #${String(waiting[0]?.token).padStart(3, '0')}`);
    } catch (err: unknown) {
      toast.error(String(err));
    } finally {
      setCallingNext(false);
    }
  }, [callingNext, waiting, isPaused]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); setShowAdd(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleCallNext(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); setShowEmergency(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCallNext]);

  useEffect(() => { setDurationInput(String(defaultConsultationDuration)); }, [defaultConsultationDuration]);

  const completionRate = patients.length > 0
    ? Math.round(stats.totalCompleted / patients.length * 100)
    : 0;

  const overtimeLabel = (() => {
    const m = Math.floor(overtimeSeconds / 60);
    const s = overtimeSeconds % 60;
    return m > 0 ? `+${m}m ${s}s over` : `+${s}s over`;
  })();

  const hasFilters = searchQuery || filterPriority || filterDoctor;

  return (
    <div className="min-h-screen" style={{ background: '#04080F' }}>

      {/* ─── Header ─── */}
      <header style={{ background: '#080F1D', borderBottom: '1px solid #162035', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
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
            <Logo />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base" style={{ color: '#E8EDF5', letterSpacing: '-0.02em' }}>Queue Cure</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(13,185,215,0.15)', color: '#0DB9D7', border: '1px solid rgba(13,185,215,0.2)' }}>'26</span>
              </div>
              <p className="text-[10px] font-medium" style={{ color: '#6B7FA3' }}>Receptionist Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Overtime alert in header */}
            <AnimatePresence>
              {isOvertime && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#F43F5E' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Consultation {overtimeLabel}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute announcements' : 'Enable announcements'}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: soundEnabled ? 'rgba(13,185,215,0.1)' : '#0C1525',
                border: `1px solid ${soundEnabled ? 'rgba(13,185,215,0.3)' : '#162035'}`,
                color: soundEnabled ? '#0DB9D7' : '#3C4F6E',
              }}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* End of Day Summary */}
            <button
              onClick={() => setShowSummary(true)}
              title="End of day summary"
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: '#0C1525', border: '1px solid #162035', color: '#3C4F6E' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8C9BBB')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3C4F6E')}
            >
              <CalendarCheck size={15} />
            </button>

            <ConnectionStatus />

            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: '#0C1525', border: '1px solid #162035', color: '#3C4F6E' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8C9BBB')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3C4F6E')}
              onClick={() => setShowSettings(true)}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Pause banner ─── */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            style={{ background: 'rgba(245,166,35,0.08)', borderBottom: '1px solid rgba(245,166,35,0.2)' }}
          >
            <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm font-medium" style={{ color: '#F5A623' }}>
                <Pause size={14} />
                Queue is paused{pauseReason ? ` — ${pauseReason}` : ''}
              </div>
              <button
                onClick={() => socketActions.resumeQueue()}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(245,166,35,0.15)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)' }}
              >
                <Play size={12} /> Resume
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

        {/* ─── Hero Row: Call Next + Stats ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Call Next card */}
          <div
            className="lg:col-span-2 rounded-xl p-6 flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, #065368 0%, #0C1525 60%, #080F1D 100%)',
              border: `1px solid ${isOvertime ? 'rgba(244,63,94,0.3)' : 'rgba(13,185,215,0.2)'}`,
              boxShadow: isOvertime ? '0 0 60px rgba(244,63,94,0.08)' : '0 0 60px rgba(13,185,215,0.08)',
              minHeight: 200,
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: inConsultation ? (isOvertime ? '#F43F5E' : '#10B981') : '#3C4F6E',
                    boxShadow: inConsultation ? `0 0 8px ${isOvertime ? 'rgba(244,63,94,0.6)' : 'rgba(16,185,129,0.6)'}` : 'none',
                    animation: isOvertime ? 'glowPulse 1s ease-in-out infinite' : 'none',
                  }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isOvertime ? '#F43F5E' : inConsultation ? '#8C9BBB' : '#6B7FA3' }}>
                  {inConsultation ? (isOvertime ? `Overtime — ${overtimeLabel}` : 'Now Serving') : 'Queue Idle'}
                </span>
              </div>

              <AnimatePresence mode="wait">
                {inConsultation ? (
                  <motion.div key={inConsultation.token} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p
                      className="font-mono font-black leading-none"
                      style={{
                        fontSize: '3.5rem',
                        color: isOvertime ? '#F43F5E' : '#0DB9D7',
                        letterSpacing: '-0.04em',
                        textShadow: isOvertime ? '0 0 40px rgba(244,63,94,0.5)' : '0 0 40px rgba(13,185,215,0.5)',
                      }}
                    >
                      #{String(inConsultation.token).padStart(3, '0')}
                    </p>
                    <p className="text-sm font-semibold mt-1.5" style={{ color: '#8C9BBB' }}>{inConsultation.name}</p>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="font-mono font-black text-5xl" style={{ color: '#2E4A72', letterSpacing: '-0.04em' }}>---</p>
                    <p className="text-sm mt-1.5" style={{ color: '#6B7FA3' }}>No active consultation</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: (waiting.length > 0 && !isPaused) ? 1.02 : 1 }}
              whileTap={{ scale: (waiting.length > 0 && !isPaused) ? 0.98 : 1 }}
              className="w-full mt-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all"
              onClick={handleCallNext}
              disabled={callingNext || waiting.length === 0 || isPaused}
              style={{
                background: isPaused ? '#0C1525' : waiting.length > 0 ? '#0DB9D7' : '#0C1525',
                color: isPaused ? '#F5A623' : waiting.length > 0 ? '#020F18' : '#1E3050',
                border: `1px solid ${isPaused ? 'rgba(245,166,35,0.3)' : waiting.length > 0 ? 'rgba(13,185,215,0.5)' : '#162035'}`,
                boxShadow: !isPaused && waiting.length > 0 ? '0 0 30px rgba(13,185,215,0.35)' : 'none',
                opacity: callingNext ? 0.7 : 1,
              }}
            >
              {callingNext ? (
                <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Calling…</>
              ) : isPaused ? (
                <><Pause size={18} /> Queue Paused</>
              ) : waiting.length > 0 ? (
                <><ChevronRight size={20} strokeWidth={2.5} /> Call Token #{String(waiting[0]?.token).padStart(3, '0')}</>
              ) : (
                <><Hash size={18} /> Queue is Empty</>
              )}
            </motion.button>
          </div>

          {/* Stats */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Waiting" value={stats.totalWaiting} icon={<Users size={16} strokeWidth={2} />} color="teal"
              sub={waiting[0] ? `Next: #${String(waiting[0].token).padStart(3, '0')}` : 'Queue clear'} />
            <StatCard label="Avg Wait" value={formatWaitTime(stats.averageWaitTime)} icon={<Clock size={16} strokeWidth={2} />} color="amber"
              sub={`Avg consult: ${stats.averageConsultationTime}m`} />
            <StatCard label="Completed" value={stats.totalCompleted} icon={<CheckCircle size={16} strokeWidth={2} />} color="emerald"
              sub={`${completionRate}% completion rate`} />
          </div>
        </div>

        {/* ─── Progress bar ─── */}
        {patients.length > 0 && (
          <div className="rounded-xl px-5 py-4 flex items-center gap-4" style={{ background: '#080F1D', border: '1px solid #162035' }}>
            <Timer size={15} style={{ color: '#3C4F6E', flexShrink: 0 }} />
            <div className="flex-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#162035' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #0DB9D7, #10B981)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
            <span className="text-xs font-mono font-semibold" style={{ color: '#8C9BBB', flexShrink: 0 }}>
              {stats.totalCompleted} / {patients.length} patients
            </span>
          </div>
        )}

        {/* ─── Action Bar ─── */}
        <div className="flex flex-wrap gap-3 items-center">
          <motion.button whileHover={{ y: -1 }} whileTap={{ y: 0 }} className="btn-ghost" onClick={() => setShowAdd(true)}>
            <Plus size={16} strokeWidth={2.5} /> Add Patient
          </motion.button>
          <motion.button whileHover={{ y: -1 }} whileTap={{ y: 0 }} className="btn-danger" onClick={() => setShowEmergency(true)}>
            <Zap size={16} strokeWidth={2.5} /> Emergency Insert
          </motion.button>

          {/* Pause / Resume */}
          {isPaused ? (
            <motion.button whileHover={{ y: -1 }} whileTap={{ y: 0 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
              onClick={() => socketActions.resumeQueue()}
            >
              <Play size={15} /> Resume Queue
            </motion.button>
          ) : (
            <motion.button whileHover={{ y: -1 }} whileTap={{ y: 0 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgba(245,166,35,0.08)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.2)' }}
              onClick={() => {
                socketActions.pauseQueue(pauseInputReason || undefined);
                setPauseInputReason('');
              }}
            >
              <Pause size={15} /> Pause Queue
            </motion.button>
          )}
        </div>

        {/* ─── Main Grid ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">

          {/* Queue / History / Analytics panel */}
          <div className="card overflow-hidden">

            {/* Tab bar */}
            <div className="flex items-center gap-0" style={{ borderBottom: '1px solid #162035', background: '#080F1D' }}>
              {(['queue', 'history', 'analytics'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="relative px-5 py-3.5 text-xs font-semibold transition-colors capitalize"
                  style={{ color: tab === t ? '#0DB9D7' : '#3C4F6E' }}
                >
                  {t === 'queue'
                    ? `Active Queue  (${waiting.length + (inConsultation ? 1 : 0)})`
                    : t === 'history'
                    ? `History  (${history.length})`
                    : `Analytics`}
                  {tab === t && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#0DB9D7' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Search + filter (queue tab only) */}
            {tab === 'queue' && (
              <div className="px-4 py-3 flex flex-wrap gap-2 items-center" style={{ borderBottom: '1px solid #162035', background: '#04080F' }}>
                {/* Search */}
                <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
                  <Search size={13} style={{ color: '#3C4F6E', flexShrink: 0 }} />
                  <input
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: '#E8EDF5', caretColor: '#0DB9D7' }}
                    placeholder="Search patient…"
                    value={searchQuery}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearch('')} style={{ color: '#3C4F6E' }}><X size={12} /></button>
                  )}
                </div>

                {/* Priority filter */}
                <div className="flex items-center gap-1">
                  <Filter size={11} style={{ color: '#3C4F6E' }} />
                  {['', 'emergency', 'senior', 'normal'].map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPriority(p)}
                      className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
                      style={{
                        background: filterPriority === p ? (p === 'emergency' ? 'rgba(244,63,94,0.15)' : p === 'senior' ? 'rgba(245,166,35,0.15)' : 'rgba(13,185,215,0.15)') : 'transparent',
                        color: filterPriority === p ? (p === 'emergency' ? '#F43F5E' : p === 'senior' ? '#F5A623' : '#0DB9D7') : '#3C4F6E',
                        border: `1px solid ${filterPriority === p ? (p === 'emergency' ? 'rgba(244,63,94,0.3)' : p === 'senior' ? 'rgba(245,166,35,0.3)' : 'rgba(13,185,215,0.3)') : 'transparent'}`,
                      }}
                    >
                      {p || 'All'}
                    </button>
                  ))}
                </div>

                {/* Doctor filter */}
                {doctors.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {[{ id: '', name: 'Any' }, { id: 'unassigned', name: 'Unassigned' }, ...doctors.filter(d => d.isActive)].map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setFilterDoctor(filterDoctor === doc.id ? '' : doc.id)}
                        className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
                        style={{
                          background: filterDoctor === doc.id ? 'rgba(13,185,215,0.12)' : 'transparent',
                          color: filterDoctor === doc.id ? '#0DB9D7' : '#3C4F6E',
                          border: `1px solid ${filterDoctor === doc.id ? 'rgba(13,185,215,0.3)' : 'transparent'}`,
                        }}
                      >
                        {doc.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Clear filters */}
                {hasFilters && (
                  <button
                    onClick={() => { setSearch(''); setFilterPriority(''); setFilterDoctor(''); }}
                    className="text-[10px] px-2 py-1 rounded transition-colors"
                    style={{ color: '#F43F5E' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Analytics panel */}
            {tab === 'analytics' && (
              <div className="px-5 overflow-y-auto" style={{ maxHeight: 600 }}>
                <AnalyticsPanel />
              </div>
            )}

            {/* Queue / History table */}
            {tab !== 'analytics' && (
              <>
                {queueDisplayed.length === 0 ? (
                  <EmptyQueue label={tab === 'queue' ? (hasFilters ? 'No matching patients' : 'Queue is empty') : 'No history yet'} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full queue-table">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #162035', background: '#04080F' }}>
                          {['Token', 'Patient', 'Status', 'Wait', 'Duration', 'Actions'].map(h => (
                            <th
                              key={h}
                              className="py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                              style={{ color: '#6B7FA3', paddingLeft: h === 'Token' ? '1.25rem' : '0.75rem', paddingRight: '0.75rem' }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {queueDisplayed.map((p) => {
                            const sameTier = waiting.filter(w => w.priority === p.priority);
                            const tierIdx = sameTier.findIndex(w => w.id === p.id);
                            return (
                              <PatientRow
                                key={p.id}
                                patient={p}
                                isFirst={tierIdx <= 0}
                                isLast={tierIdx >= sameTier.length - 1 || tierIdx < 0}
                              />
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}

                {queueDisplayed.length > 0 && (
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #0C1525' }}>
                    <span className="text-xs" style={{ color: '#6B7FA3' }}>
                      {queueDisplayed.length} patient{queueDisplayed.length !== 1 ? 's' : ''}
                      {hasFilters && tab === 'queue' && ` (filtered from ${waiting.length + (inConsultation ? 1 : 0)})`}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: '#6B7FA3' }}>
                      <BarChart2 size={11} /> Updates in real-time
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </main>

      {/* ─── Modals ─── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Patient" subtitle="New patient registration">
        <AddPatientForm onSuccess={() => setShowAdd(false)} />
      </Modal>
      <Modal isOpen={showEmergency} onClose={() => setShowEmergency(false)} title="Emergency Insert" subtitle="Patient jumps to front of queue">
        <AddPatientForm isEmergency onSuccess={() => setShowEmergency(false)} />
      </Modal>
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Queue Settings" maxWidth="max-w-sm">
        <div className="space-y-5">
          <div>
            <label className="label flex items-center gap-1.5"><Clock size={11} /> Default Consultation Duration (minutes)</label>
            <div className="flex gap-2">
              <input type="number" className="input" min={1} max={120}
                value={durationInput}
                onChange={e => setDurationInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { socketActions.setDefaultDuration(Number(durationInput)); toast.success('Updated'); setShowSettings(false); }}}
              />
              <button className="btn-teal px-4"
                onClick={() => { socketActions.setDefaultDuration(Number(durationInput)); toast.success('Updated'); setShowSettings(false); }}
              >Save</button>
            </div>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: '#3C4F6E' }}>
              System auto-learns from completed consultations per type.
            </p>
          </div>

          {/* Pause with reason */}
          {!isPaused && (
            <div>
              <label className="label">Pause Queue (optional reason)</label>
              <div className="flex gap-2">
                <input type="text" className="input" placeholder="Lunch break, emergency, etc."
                  value={pauseInputReason}
                  onChange={e => setPauseInputReason(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { socketActions.pauseQueue(pauseInputReason || undefined); setPauseInputReason(''); setShowSettings(false); }}}
                />
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.25)', whiteSpace: 'nowrap' }}
                  onClick={() => { socketActions.pauseQueue(pauseInputReason || undefined); setPauseInputReason(''); setShowSettings(false); }}
                >
                  <Pause size={13} /> Pause
                </button>
              </div>
            </div>
          )}

          {/* Queue health */}
          <div className="rounded-lg p-4 space-y-2" style={{ background: '#04080F', border: '1px solid #162035' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#3C4F6E' }}>Queue Health</p>
            {[
              { label: 'Completion rate', value: `${completionRate}%` },
              { label: 'No-shows', value: stats.totalNoShow },
              { label: 'Avg consult time', value: `${stats.averageConsultationTime}m` },
            ].map(row => (
              <div key={row.label} className="flex justify-between">
                <span className="text-xs" style={{ color: '#3C4F6E' }}>{row.label}</span>
                <span className="text-xs font-mono font-semibold" style={{ color: '#8C9BBB' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Active doctors */}
          {doctors.length > 0 && (
            <div className="rounded-lg p-4 space-y-2" style={{ background: '#04080F', border: '1px solid #162035' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#3C4F6E' }}>Doctors On Duty</p>
              {doctors.map(doc => (
                <div key={doc.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#8C9BBB' }}>{doc.name}</p>
                    <p className="text-[10px]" style={{ color: '#3C4F6E' }}>{doc.specialty}</p>
                  </div>
                  <button
                    onClick={() => socketActions.toggleDoctor(doc.id).catch(() => {})}
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all"
                    style={{
                      background: doc.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(60,79,110,0.12)',
                      color: doc.isActive ? '#10B981' : '#3C4F6E',
                      border: `1px solid ${doc.isActive ? 'rgba(16,185,129,0.3)' : '#162035'}`,
                    }}
                  >
                    {doc.isActive ? 'Active' : 'Off'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* End of Day Summary */}
      {showSummary && <EndOfDaySummary onClose={() => setShowSummary(false)} />}
    </div>
  );
}
