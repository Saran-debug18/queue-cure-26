import { useEffect, useState, useCallback } from 'react';
import { BarChart2, Clock, Users, TrendingUp } from 'lucide-react';
import { socketActions } from '../../hooks/useSocket';
import type { Analytics } from '../../types';
import { useQueueStore } from '../../store/queueStore';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HourLabel(h: number) {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

export function AnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const consultationHistory = useQueueStore(s => s.consultationHistory);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await socketActions.getAnalytics();
      setData(result as Analytics);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, consultationHistory.length]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#162035', borderTopColor: '#0DB9D7' }} />
      </div>
    );
  }

  if (!data || data.totalToday === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <BarChart2 size={40} style={{ color: '#1E3050' }} />
        <p className="text-sm font-semibold" style={{ color: '#3C4F6E' }}>No data yet</p>
        <p className="text-xs" style={{ color: '#1E3050' }}>Analytics will appear as patients are seen</p>
      </div>
    );
  }

  const maxCount = Math.max(...HOURS.map(h => {
    const found = data.byHour.find(b => b.hour === h);
    return found?.count ?? 0;
  }), 1);

  return (
    <div className="space-y-5 py-2">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Today', value: data.totalToday, icon: <Users size={14} />, color: '#0DB9D7' },
          { label: 'Completion %', value: `${Math.round(data.completionRate * 100)}%`, icon: <TrendingUp size={14} />, color: '#10B981' },
          {
            label: 'Peak Hour',
            value: data.peakHour ? `${HourLabel(data.peakHour.hour)} (${data.peakHour.count})` : 'N/A',
            icon: <Clock size={14} />,
            color: '#F5A623',
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: '#04080F', border: '1px solid #162035' }}>
            <div className="flex justify-center mb-1.5" style={{ color, opacity: 0.7 }}>{icon}</div>
            <p className="font-mono font-bold text-base" style={{ color }}>{value}</p>
            <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#3C4F6E' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Hourly bar chart */}
      <div className="rounded-xl p-4" style={{ background: '#04080F', border: '1px solid #162035' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: '#3C4F6E' }}>Consultations by Hour</p>
        <div className="flex items-end gap-1 h-24">
          {HOURS.map(h => {
            const row = data.byHour.find(b => b.hour === h);
            const count = row?.count ?? 0;
            const pct = count / maxCount;
            const isPeak = data.peakHour?.hour === h;
            return (
              <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${HourLabel(h)}: ${count} patients`}>
                <div className="w-full rounded-sm transition-all duration-300 relative overflow-hidden" style={{ height: 80 }}>
                  <div
                    className="absolute bottom-0 w-full rounded-sm transition-all duration-500"
                    style={{
                      height: `${Math.max(pct * 100, count > 0 ? 4 : 0)}%`,
                      background: isPeak
                        ? 'linear-gradient(180deg, #F5A623, rgba(245,166,35,0.5))'
                        : count > 0
                        ? 'linear-gradient(180deg, #0DB9D7, rgba(13,185,215,0.3))'
                        : '#0C1525',
                      boxShadow: isPeak ? '0 0 8px rgba(245,166,35,0.4)' : count > 0 ? '0 0 6px rgba(13,185,215,0.25)' : 'none',
                    }}
                  />
                </div>
                {/* Show label only for even hours or peak */}
                {(h % 4 === 0 || isPeak) && (
                  <span className="text-[8px] font-mono" style={{ color: isPeak ? '#F5A623' : '#1E3050' }}>
                    {HourLabel(h)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* By type table */}
      {data.byType.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #162035' }}>
          <div className="px-4 py-3" style={{ background: '#04080F', borderBottom: '1px solid #162035' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3C4F6E' }}>By Consultation Type</p>
          </div>
          <div className="divide-y" style={{ borderColor: '#0C1525' }}>
            {data.byType.map(row => (
              <div key={row.type} className="flex items-center justify-between px-4 py-2.5" style={{ background: '#04080F' }}>
                <span className="text-sm capitalize" style={{ color: '#8C9BBB' }}>{row.type}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono" style={{ color: '#3C4F6E' }}>{Math.round(row.avgDuration)}m avg</span>
                  <span className="font-mono font-bold text-sm" style={{ color: '#0DB9D7' }}>{row.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By doctor */}
      {data.byDoctor.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #162035' }}>
          <div className="px-4 py-3" style={{ background: '#04080F', borderBottom: '1px solid #162035' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3C4F6E' }}>By Doctor</p>
          </div>
          <div className="divide-y" style={{ borderColor: '#0C1525' }}>
            {data.byDoctor.map(row => (
              <div key={row.doctorId} className="flex items-center justify-between px-4 py-2.5" style={{ background: '#04080F' }}>
                <span className="text-sm" style={{ color: '#8C9BBB' }}>{row.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono" style={{ color: '#3C4F6E' }}>{Math.round(row.avgDuration)}m avg</span>
                  <span className="font-mono font-bold text-sm" style={{ color: '#10B981' }}>{row.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
