import { useEffect, useState } from 'react';
import { Printer, X, TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import { socketActions } from '../../hooks/useSocket';
import type { Analytics } from '../../types';
import { useQueueStore } from '../../store/queueStore';

interface Props { onClose: () => void; }

function HourLabel(h: number) {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

export function EndOfDaySummary({ onClose }: Props) {
  const [data, setData] = useState<Analytics | null>(null);
  const stats = useQueueStore(s => s.stats);
  const doctors = useQueueStore(s => s.doctors);

  useEffect(() => {
    socketActions.getAnalytics().then(r => setData(r as Analytics));
  }, []);

  const today = new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(4,8,15,0.85)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto print:shadow-none print:rounded-none print:max-h-none"
        style={{ background: '#080F1D', border: '1px solid #162035', boxShadow: '0 0 80px rgba(13,185,215,0.08)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 print:static"
          style={{ background: '#080F1D', borderBottom: '1px solid #162035', zIndex: 1 }}
        >
          <div>
            <h2 className="font-bold text-lg" style={{ color: '#E8EDF5' }}>End of Day Summary</h2>
            <p className="text-xs mt-0.5" style={{ color: '#3C4F6E' }}>{today}</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'rgba(13,185,215,0.12)', color: '#0DB9D7', border: '1px solid rgba(13,185,215,0.25)' }}
            >
              <Printer size={13} /> Print
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ background: '#0C1525', border: '1px solid #162035', color: '#3C4F6E' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Patients', value: data?.totalToday ?? stats.totalCompleted + stats.totalNoShow, icon: <Users size={15} />, color: '#0DB9D7' },
              { label: 'Completed', value: stats.totalCompleted, icon: <CheckCircle size={15} />, color: '#10B981' },
              { label: 'No-shows', value: stats.totalNoShow, icon: <X size={15} />, color: '#F43F5E' },
              { label: 'Completion %', value: data ? `${Math.round(data.completionRate * 100)}%` : '—', icon: <TrendingUp size={15} />, color: '#F5A623' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: '#04080F', border: '1px solid #162035' }}>
                <div className="flex justify-center mb-1.5" style={{ color, opacity: 0.7 }}>{icon}</div>
                <p className="font-mono font-bold text-xl" style={{ color }}>{value}</p>
                <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#3C4F6E' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Timing stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Avg Wait Time', value: `${stats.averageWaitTime} min`, icon: <Clock size={14} /> },
              { label: 'Avg Consult Time', value: `${stats.averageConsultationTime} min`, icon: <Clock size={14} /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#04080F', border: '1px solid #162035' }}>
                <span style={{ color: '#3C4F6E' }}>{icon}</span>
                <div>
                  <p className="font-mono font-semibold text-sm" style={{ color: '#8C9BBB' }}>{value}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: '#3C4F6E' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Peak hour */}
          {data?.peakHour && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)' }}>
              <span className="text-sm font-medium" style={{ color: '#F5A623' }}>Peak Hour</span>
              <span className="font-mono font-bold" style={{ color: '#F5A623' }}>
                {HourLabel(data.peakHour.hour)} — {data.peakHour.count} patients
              </span>
            </div>
          )}

          {/* By consultation type */}
          {data?.byType && data.byType.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #162035' }}>
              <div className="px-4 py-3" style={{ background: '#04080F', borderBottom: '1px solid #162035' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3C4F6E' }}>By Consultation Type</p>
              </div>
              {data.byType.map((row, i) => (
                <div
                  key={row.type}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: '#04080F', borderBottom: i < data.byType.length - 1 ? '1px solid #0C1525' : 'none' }}
                >
                  <span className="text-sm capitalize" style={{ color: '#8C9BBB' }}>{row.type}</span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span style={{ color: '#3C4F6E' }}>{Math.round(row.avgDuration)}m avg</span>
                    <span className="font-bold" style={{ color: '#0DB9D7' }}>{row.count} patients</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Doctor breakdown */}
          {doctors.length > 0 && data?.byDoctor && data.byDoctor.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #162035' }}>
              <div className="px-4 py-3" style={{ background: '#04080F', borderBottom: '1px solid #162035' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3C4F6E' }}>Doctor Breakdown</p>
              </div>
              {doctors.map((doc, i) => {
                const row = data.byDoctor.find(d => d.doctorId === doc.id);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: '#04080F', borderBottom: i < doctors.length - 1 ? '1px solid #0C1525' : 'none' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#8C9BBB' }}>{doc.name}</p>
                      <p className="text-[10px]" style={{ color: '#3C4F6E' }}>{doc.specialty}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      {row ? (
                        <>
                          <span style={{ color: '#3C4F6E' }}>{Math.round(row.avgDuration)}m avg</span>
                          <span className="font-bold" style={{ color: '#10B981' }}>{row.count} patients</span>
                        </>
                      ) : (
                        <span style={{ color: '#1E3050' }}>No patients</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(.print-target) { display: none !important; }
          .print-target { display: block !important; }
        }
      `}</style>
    </div>
  );
}
