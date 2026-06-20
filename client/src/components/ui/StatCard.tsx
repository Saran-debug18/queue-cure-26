import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: 'teal' | 'amber' | 'rose' | 'emerald' | 'dim';
  sub?: string;
  trend?: string;
}

const COLOR_MAP = {
  teal:    { bg: 'rgba(13,185,215,0.1)',   border: 'rgba(13,185,215,0.2)',   text: '#0DB9D7',  glow: 'rgba(13,185,215,0.15)' },
  amber:   { bg: 'rgba(245,166,35,0.1)',   border: 'rgba(245,166,35,0.2)',   text: '#F5A623',  glow: 'rgba(245,166,35,0.1)' },
  rose:    { bg: 'rgba(244,63,94,0.1)',    border: 'rgba(244,63,94,0.2)',    text: '#F43F5E',  glow: 'rgba(244,63,94,0.1)' },
  emerald: { bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)',   text: '#10B981',  glow: 'rgba(16,185,129,0.1)' },
  dim:     { bg: 'rgba(60,79,110,0.15)',   border: 'rgba(60,79,110,0.25)',   text: '#8C9BBB',  glow: 'transparent' },
};

export function StatCard({ label, value, icon, color = 'teal', sub, trend }: Props) {
  const c = COLOR_MAP[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-5 card-glow"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, boxShadow: `0 0 16px ${c.glow}` }}
        >
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-medium" style={{ color: '#10B981' }}>{trend}</span>
        )}
      </div>
      <p className="text-2xl font-bold font-mono tracking-tight" style={{ color: c.text }}>{value}</p>
      <p className="text-xs font-semibold mt-1" style={{ color: '#8C9BBB' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#6B7FA3' }}>{sub}</p>}
    </motion.div>
  );
}
