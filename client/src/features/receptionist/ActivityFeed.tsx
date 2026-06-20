import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useQueueStore } from '../../store/queueStore';
import { formatRelative } from '../../utils/format';

const LOG_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  'Patient added':          { icon: '+', color: '#0DB9D7', bg: 'rgba(13,185,215,0.12)' },
  'Token called':           { icon: '→', color: '#F5A623', bg: 'rgba(245,166,35,0.12)' },
  'Consultation completed': { icon: '✓', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  'Patient no-show':        { icon: '!', color: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
  'Patient cancelled':      { icon: '×', color: '#3C4F6E', bg: 'rgba(60,79,110,0.15)' },
  'EMERGENCY inserted':     { icon: '⚡', color: '#F43F5E', bg: 'rgba(244,63,94,0.12)' },
};
const DEFAULT_LOG = { icon: '·', color: '#3C4F6E', bg: 'rgba(60,79,110,0.1)' };

export function ActivityFeed() {
  const activityLog = useQueueStore(s => s.activityLog);

  return (
    <div className="card h-full flex flex-col" style={{ minHeight: 320 }}>
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid #162035' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(13,185,215,0.1)', border: '1px solid rgba(13,185,215,0.2)' }}
        >
          <Activity size={14} style={{ color: '#0DB9D7' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#E8EDF5' }}>Activity</p>
          <p className="text-xs" style={{ color: '#6B7FA3' }}>Real-time log</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
          <span className="text-xs font-medium" style={{ color: '#10B981' }}>Live</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <AnimatePresence initial={false}>
          {activityLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="#162035" strokeWidth="2" />
                <path d="M16 10v6l4 2" stroke="#3C4F6E" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-xs font-medium" style={{ color: '#6B7FA3' }}>No activity yet</p>
            </div>
          ) : (
            activityLog.map(log => {
              const c = LOG_CONFIG[log.action] ?? DEFAULT_LOG;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 p-2.5 rounded-lg transition-colors"
                  style={{ cursor: 'default' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0C1525')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md text-xs font-bold"
                    style={{ background: c.bg, color: c.color }}
                  >
                    {c.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug" style={{ color: '#8C9BBB' }}>{log.details}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#5A6E8E' }}>
                      {log.action} · {formatRelative(log.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
