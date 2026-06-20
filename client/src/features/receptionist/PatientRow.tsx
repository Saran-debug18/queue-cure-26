import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, Pencil, AlertTriangle, FileText, ChevronUp, ChevronDown, Stethoscope } from 'lucide-react';
import type { Patient } from '../../types';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { PatientAvatar } from '../../components/ui/PatientAvatar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { socketActions } from '../../hooks/useSocket';
import { CONSULTATION_LABELS, formatRelative, formatWaitTime } from '../../utils/format';
import { useQueueStore } from '../../store/queueStore';
import toast from 'react-hot-toast';

const WAIT_ALERT_MINUTES = 30;

interface Props {
  patient: Patient;
  isFirst?: boolean;
  isLast?: boolean;
}

export function PatientRow({ patient, isFirst, isLast }: Props) {
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState(String(patient.estimatedDuration));
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState(patient.notes ?? '');
  const [loading, setLoading] = useState<string | null>(null);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const wt = useQueueStore(s => s.waitTimes[patient.id]);
  const doctors = useQueueStore(s => s.doctors);

  const isActive  = patient.status === 'in-consultation';
  const isWaiting = patient.status === 'waiting';
  const isDone    = ['completed', 'no-show', 'cancelled'].includes(patient.status);

  const waitTooLong = isWaiting && wt && wt.estimatedWaitMinutes > WAIT_ALERT_MINUTES;

  // Overtime tracker for active consultation
  useEffect(() => {
    if (!isActive || !patient.consultationStartedAt) { setOvertimeSeconds(0); return; }
    const startMs = new Date(patient.consultationStartedAt).getTime();
    const limitMs = patient.estimatedDuration * 60 * 1000;
    const tick = () => {
      const elapsed = Date.now() - startMs;
      const over = elapsed - limitMs;
      setOvertimeSeconds(over > 0 ? Math.floor(over / 1000) : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, patient.consultationStartedAt, patient.estimatedDuration]);

  useEffect(() => {
    if (editingNotes) notesRef.current?.focus();
  }, [editingNotes]);

  async function doAction(action: () => Promise<unknown>, label: string) {
    if (loading) return;
    setLoading(label);
    try { await action(); }
    catch (err: unknown) { toast.error(String(err)); }
    finally { setLoading(null); }
  }

  async function saveDuration() {
    const d = Number(durationInput);
    if (isNaN(d) || d < 1) return;
    await doAction(() => socketActions.setPatientDuration(patient.id, d), 'duration');
    setEditingDuration(false);
    toast.success('Duration updated');
  }

  async function saveNotes() {
    await doAction(() => socketActions.updateNotes(patient.id, notesInput), 'notes');
    setEditingNotes(false);
    toast.success('Notes saved');
  }

  const isOvertime = overtimeSeconds > 0;
  const overtimeLabel = (() => {
    const m = Math.floor(overtimeSeconds / 60);
    const s = overtimeSeconds % 60;
    return m > 0 ? `+${m}m ${s}s over` : `+${s}s over`;
  })();

  const assignedDoctor = patient.doctorId ? doctors.find(d => d.id === patient.doctorId) : null;

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    waiting:          { bg: 'rgba(13,185,215,0.08)',  color: '#0DB9D7', label: 'Waiting' },
    'in-consultation':{ bg: 'rgba(16,185,129,0.1)',   color: '#10B981', label: '● Consulting' },
    completed:        { bg: 'rgba(60,79,110,0.12)',   color: '#3C4F6E', label: 'Done' },
    'no-show':        { bg: 'rgba(245,166,35,0.08)',  color: '#F5A623', label: 'No-show' },
    cancelled:        { bg: 'rgba(60,79,110,0.08)',   color: '#3C4F6E', label: 'Cancelled' },
  };
  const ss = STATUS_STYLE[patient.status] ?? STATUS_STYLE.waiting;

  return (
    <>
      <motion.tr
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ duration: 0.2 }}
        className="queue-table-row"
        style={{
          borderBottom: '1px solid #0C1525',
          background: isActive
            ? isOvertime
              ? 'rgba(244,63,94,0.05)'
              : 'rgba(16,185,129,0.04)'
            : waitTooLong
            ? 'rgba(245,166,35,0.04)'
            : 'transparent',
          outline: isOvertime ? '1px solid rgba(244,63,94,0.15)' : 'none',
        }}
      >
        {/* Token */}
        <td className="pl-5 pr-3 py-3.5 w-16">
          <div
            className="w-10 h-10 flex items-center justify-center rounded-lg font-mono font-bold text-sm flex-shrink-0 relative"
            style={{
              background: isActive
                ? isOvertime ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)'
                : patient.priority === 'emergency' ? 'rgba(244,63,94,0.12)' : 'rgba(13,185,215,0.08)',
              border: `1px solid ${isActive
                ? isOvertime ? 'rgba(244,63,94,0.4)' : 'rgba(16,185,129,0.4)'
                : patient.priority === 'emergency' ? 'rgba(244,63,94,0.3)' : 'rgba(13,185,215,0.2)'}`,
              color: isActive
                ? isOvertime ? '#F43F5E' : '#10B981'
                : patient.priority === 'emergency' ? '#F43F5E' : '#0DB9D7',
              boxShadow: isActive
                ? isOvertime
                  ? '0 0 12px rgba(244,63,94,0.2)'
                  : '0 0 12px rgba(16,185,129,0.15)'
                : 'none',
              animation: isOvertime ? 'glowPulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            {String(patient.token).padStart(3, '0')}
          </div>
        </td>

        {/* Patient */}
        <td className="px-3 py-3.5">
          <div className="flex items-center gap-3">
            <PatientAvatar name={patient.name} priority={patient.priority} size={34} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm" style={{ color: '#E8EDF5' }}>{patient.name}</span>
                {patient.priority !== 'normal' && <PriorityBadge priority={patient.priority} />}
                {waitTooLong && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,0.15)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)' }}>
                    Long wait
                  </span>
                )}
                {isOvertime && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(244,63,94,0.15)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.3)' }}>
                    {overtimeLabel}
                  </span>
                )}
              </div>
              <span className="text-xs" style={{ color: '#3C4F6E' }}>
                {patient.age}y · {CONSULTATION_LABELS[patient.consultationType]} · {formatRelative(patient.registeredAt)}
                {assignedDoctor && <span className="ml-1.5" style={{ color: '#0DB9D7' }}>· {assignedDoctor.name}</span>}
              </span>
              {/* Inline notes display */}
              {patient.notes && !editingNotes && (
                <p className="text-xs mt-0.5 italic truncate max-w-[200px]" style={{ color: '#8C9BBB' }}>
                  {patient.notes}
                </p>
              )}
              {/* Inline notes editor */}
              {editingNotes && (
                <div className="mt-1.5 flex items-start gap-1.5">
                  <textarea
                    ref={notesRef}
                    className="input text-xs py-1.5 px-2 resize-none"
                    style={{ minWidth: 180, maxWidth: 240 }}
                    rows={2}
                    placeholder="Add notes…"
                    value={notesInput}
                    onChange={e => setNotesInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNotes(); }
                      if (e.key === 'Escape') setEditingNotes(false);
                    }}
                  />
                  <button onClick={saveNotes} className="p-1 rounded" style={{ color: '#10B981' }}><Check size={12} strokeWidth={3} /></button>
                  <button onClick={() => setEditingNotes(false)} className="p-1 rounded" style={{ color: '#3C4F6E' }}><X size={12} strokeWidth={3} /></button>
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="px-3 py-3.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: ss.bg, color: ss.color }}>
            {ss.label}
          </span>
        </td>

        {/* Wait */}
        <td className="px-3 py-3.5 font-mono text-sm">
          {isWaiting && wt ? (
            <div>
              <span style={{ color: waitTooLong ? '#F5A623' : '#F5A623' }}>{formatWaitTime(wt.estimatedWaitMinutes)}</span>
              <div className="text-xs" style={{ color: '#3C4F6E' }}>#{wt.tokensAhead} ahead</div>
            </div>
          ) : isActive && isOvertime ? (
            <span className="text-xs" style={{ color: '#F43F5E' }}>{overtimeLabel}</span>
          ) : <span style={{ color: '#3C4F6E' }}>—</span>}
        </td>

        {/* Duration */}
        <td className="px-3 py-3.5">
          {editingDuration ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number" className="input w-16 py-1.5 text-sm font-mono"
                value={durationInput}
                onChange={e => setDurationInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveDuration(); if (e.key === 'Escape') setEditingDuration(false); }}
                autoFocus min={1}
              />
              <button onClick={saveDuration} className="p-1 rounded" style={{ color: '#10B981' }}><Check size={13} strokeWidth={3} /></button>
              <button onClick={() => setEditingDuration(false)} className="p-1 rounded" style={{ color: '#3C4F6E' }}><X size={13} strokeWidth={3} /></button>
            </div>
          ) : (
            <button
              disabled={isDone}
              onClick={() => { if (!isDone) { setDurationInput(String(patient.estimatedDuration)); setEditingDuration(true); }}}
              className="flex items-center gap-1.5 text-xs font-mono group"
              style={{ color: '#8C9BBB' }}
            >
              <Clock size={11} style={{ color: '#3C4F6E' }} />
              {patient.estimatedDuration}m
              {!isDone && <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#0DB9D7' }} />}
            </button>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 pr-5 py-3.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Notes toggle */}
            {!isDone && (
              <button
                title="Notes"
                onClick={() => { setNotesInput(patient.notes ?? ''); setEditingNotes(v => !v); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{
                  background: patient.notes ? 'rgba(13,185,215,0.1)' : '#04080F',
                  border: '1px solid #162035',
                  color: patient.notes ? '#0DB9D7' : '#3C4F6E',
                }}
              >
                <FileText size={12} />
              </button>
            )}

            {/* Reorder (waiting only, within tier) */}
            {isWaiting && (
              <>
                <button
                  title="Move up"
                  disabled={!!isFirst || !!loading}
                  onClick={() => doAction(() => socketActions.reorderPatient(patient.id, 'up'), 'reorder-up')}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                  style={{ background: '#04080F', border: '1px solid #162035', color: '#3C4F6E' }}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  title="Move down"
                  disabled={!!isLast || !!loading}
                  onClick={() => doAction(() => socketActions.reorderPatient(patient.id, 'down'), 'reorder-down')}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                  style={{ background: '#04080F', border: '1px solid #162035', color: '#3C4F6E' }}
                >
                  <ChevronDown size={12} />
                </button>
              </>
            )}

            {isActive && (
              <>
                <button
                  className="btn-success text-xs py-1.5 px-3"
                  disabled={!!loading}
                  onClick={() => doAction(() => socketActions.updatePatient({ patientId: patient.id, status: 'completed' }), 'complete')}
                >
                  <Check size={12} strokeWidth={2.5} /> Done
                </button>
                <button
                  className="btn-amber text-xs py-1.5 px-3"
                  disabled={!!loading}
                  onClick={() => setShowNoShowConfirm(true)}
                >
                  <AlertTriangle size={12} /> No-show
                </button>
              </>
            )}
            {isWaiting && (
              <button
                className="btn-ghost text-xs py-1.5 px-3"
                style={{ color: '#F43F5E' }}
                disabled={!!loading}
                onClick={() => doAction(() => socketActions.updatePatient({ patientId: patient.id, status: 'cancelled' }), 'cancel')}
              >
                <X size={12} strokeWidth={2.5} /> Cancel
              </button>
            )}
          </div>
        </td>
      </motion.tr>

      {/* Doctor assignment row for waiting patients with doctors available */}
      {isWaiting && (
        <tr style={{ borderBottom: '1px solid #0C1525' }}>
          <td colSpan={6} className="px-5 pb-2 pt-0">
            <div className="flex items-center gap-2 flex-wrap" style={{ paddingLeft: 64 }}>
              <Stethoscope size={10} style={{ color: '#3C4F6E' }} />
              {[{ id: '', name: 'Unassigned', isActive: true }, ...doctors.filter(d => d.isActive)].map(doc => (
                <button
                  key={doc.id}
                  onClick={() => { if (doc.id) doAction(() => socketActions.assignDoctor(patient.id, doc.id), 'doctor'); }}
                  className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                  style={{
                    background: patient.doctorId === doc.id ? 'rgba(13,185,215,0.15)' : (!doc.id && !patient.doctorId) ? 'rgba(13,185,215,0.15)' : '#04080F',
                    border: `1px solid ${patient.doctorId === doc.id || (!doc.id && !patient.doctorId) ? 'rgba(13,185,215,0.4)' : '#162035'}`,
                    color: patient.doctorId === doc.id || (!doc.id && !patient.doctorId) ? '#0DB9D7' : '#3C4F6E',
                    cursor: doc.id ? 'pointer' : 'default',
                  }}
                >
                  {doc.name}
                </button>
              ))}
            </div>
          </td>
        </tr>
      )}

      <ConfirmDialog
        isOpen={showNoShowConfirm}
        onClose={() => setShowNoShowConfirm(false)}
        onConfirm={() => doAction(() => socketActions.updatePatient({ patientId: patient.id, status: 'no-show' }), 'noshow')}
        title="Mark as No-Show?"
        message={`Confirm that ${patient.name} (Token #${patient.token}) did not arrive for their appointment.`}
        confirmLabel="Mark No-Show"
        variant="warning"
      />
    </>
  );
}
