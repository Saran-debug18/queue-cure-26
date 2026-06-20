import { useState, useRef, useEffect } from 'react';
import { User, Clock, Stethoscope, ChevronRight, FileText } from 'lucide-react';
import { socketActions } from '../../hooks/useSocket';
import { useQueueStore } from '../../store/queueStore';
import type { ConsultationType, Priority } from '../../types';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; isEmergency?: boolean; }

const initialForm = {
  name: '', age: '',
  consultationType: 'general' as ConsultationType,
  priority: 'normal' as Priority,
  estimatedDuration: '',
  notes: '',
  doctorId: '',
};

const CONSULT_TYPES: { value: ConsultationType; label: string; icon: string }[] = [
  { value: 'general',    label: 'General',    icon: '🩺' },
  { value: 'specialist', label: 'Specialist', icon: '🔬' },
  { value: 'followup',   label: 'Follow-up',  icon: '📋' },
  { value: 'emergency',  label: 'Emergency',  icon: '🚨' },
];

const PRIORITIES: { value: Priority; label: string; color: string; bg: string; border: string }[] = [
  { value: 'normal',    label: 'Normal',      color: '#8C9BBB', bg: 'rgba(60,79,110,0.15)',   border: 'rgba(60,79,110,0.3)' },
  { value: 'senior',    label: '⭐ Senior',   color: '#F5A623', bg: 'rgba(245,166,35,0.1)',   border: 'rgba(245,166,35,0.35)' },
  { value: 'emergency', label: '⚡ Emergency', color: '#F43F5E', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.35)' },
];

export function AddPatientForm({ onSuccess, isEmergency = false }: Props) {
  const allDoctors = useQueueStore(s => s.doctors);
  const doctors = allDoctors.filter(d => d.isActive);
  const [form, setForm] = useState({ ...initialForm, priority: (isEmergency ? 'emergency' : 'normal') as Priority });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Patient name is required';
    const age = Number(form.age);
    if (!form.age || isNaN(age) || age < 0 || age > 150) e.age = 'Valid age (0–150) required';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = {
        name: form.name.trim(),
        age: Number(form.age),
        consultationType: form.consultationType,
        priority: form.priority,
        ...(form.estimatedDuration ? { estimatedDuration: Number(form.estimatedDuration) } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        ...(form.doctorId ? { doctorId: form.doctorId } : {}),
      };
      if (isEmergency) {
        await socketActions.insertEmergency(data);
        toast.success('Emergency patient added to front of queue');
      } else {
        await socketActions.addPatient(data);
        toast.success(`${form.name} added to queue`);
      }
      setForm({ ...initialForm, priority: isEmergency ? 'emergency' : 'normal' });
      setErrors({});
      onSuccess?.();
      nameRef.current?.focus();
    } catch (err: unknown) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEmergency && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#F43F5E' }}>
          <span className="text-xl">⚡</span>
          <span>This patient will bypass the queue and be placed first immediately.</span>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="label flex items-center gap-1.5"><User size={11} /> Patient Name</label>
        <input
          ref={nameRef} className="input"
          style={errors.name ? { borderColor: '#F43F5E', boxShadow: '0 0 0 3px rgba(244,63,94,0.12)' } : {}}
          placeholder="Full name"
          value={form.name}
          onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })); }}
        />
        {errors.name && <p className="text-xs mt-1 font-medium" style={{ color: '#F43F5E' }}>{errors.name}</p>}
      </div>

      {/* Age + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Age</label>
          <input
            type="number" className="input" placeholder="e.g. 45" min={0} max={150}
            style={errors.age ? { borderColor: '#F43F5E', boxShadow: '0 0 0 3px rgba(244,63,94,0.12)' } : {}}
            value={form.age}
            onChange={e => { setForm(f => ({ ...f, age: e.target.value })); setErrors(er => ({ ...er, age: '' })); }}
          />
          {errors.age && <p className="text-xs mt-1 font-medium" style={{ color: '#F43F5E' }}>{errors.age}</p>}
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Clock size={11} /> Duration (min)</label>
          <input
            type="number" className="input" placeholder="Auto-calc" min={1} max={180}
            value={form.estimatedDuration}
            onChange={e => setForm(f => ({ ...f, estimatedDuration: e.target.value }))}
          />
        </div>
      </div>

      {/* Consultation Type */}
      <div>
        <label className="label flex items-center gap-1.5"><Stethoscope size={11} /> Consultation Type</label>
        <div className="grid grid-cols-2 gap-2">
          {CONSULT_TYPES.map(ct => (
            <button key={ct.value} type="button"
              onClick={() => setForm(f => ({ ...f, consultationType: ct.value }))}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
              style={{
                background: form.consultationType === ct.value ? 'rgba(13,185,215,0.12)' : 'rgba(12,21,37,0.8)',
                border: `1px solid ${form.consultationType === ct.value ? 'rgba(13,185,215,0.5)' : '#162035'}`,
                color: form.consultationType === ct.value ? '#0DB9D7' : '#8C9BBB',
                boxShadow: form.consultationType === ct.value ? '0 0 12px rgba(13,185,215,0.1)' : 'none',
              }}
            >
              <span>{ct.icon}</span><span>{ct.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      {!isEmergency && (
        <div>
          <label className="label">Priority Level</label>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES.map(p => (
              <button key={p.value} type="button"
                onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                className="py-2.5 px-3 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: form.priority === p.value ? p.bg : 'rgba(12,21,37,0.6)',
                  border: `1px solid ${form.priority === p.value ? p.border : '#162035'}`,
                  color: form.priority === p.value ? p.color : '#3C4F6E',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Doctor assignment */}
      {doctors.length > 0 && (
        <div>
          <label className="label flex items-center gap-1.5"><Stethoscope size={11} /> Assign Doctor (optional)</label>
          <div className="flex flex-wrap gap-2">
            <button type="button"
              onClick={() => setForm(f => ({ ...f, doctorId: '' }))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: !form.doctorId ? 'rgba(13,185,215,0.12)' : '#04080F',
                border: `1px solid ${!form.doctorId ? 'rgba(13,185,215,0.4)' : '#162035'}`,
                color: !form.doctorId ? '#0DB9D7' : '#3C4F6E',
              }}
            >
              Any
            </button>
            {doctors.map(doc => (
              <button key={doc.id} type="button"
                onClick={() => setForm(f => ({ ...f, doctorId: doc.id }))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: form.doctorId === doc.id ? 'rgba(13,185,215,0.12)' : '#04080F',
                  border: `1px solid ${form.doctorId === doc.id ? 'rgba(13,185,215,0.4)' : '#162035'}`,
                  color: form.doctorId === doc.id ? '#0DB9D7' : '#3C4F6E',
                }}
              >
                {doc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="label flex items-center gap-1.5"><FileText size={11} /> Notes (optional)</label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="Symptoms, previous visits, allergies…"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <button
        type="submit" disabled={submitting}
        className={`w-full py-3 font-semibold text-sm justify-center rounded-lg flex items-center gap-2 transition-all ${isEmergency ? 'btn-danger' : 'btn-teal'}`}
      >
        {submitting ? (
          <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Adding…</>
        ) : (
          <>{isEmergency ? '⚡' : <ChevronRight size={16} />}{isEmergency ? 'Insert Emergency Patient' : 'Add Patient to Queue'}</>
        )}
      </button>
    </form>
  );
}
