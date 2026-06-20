import type { Priority } from '../../types';

const CONFIG: Record<Priority, { label: string; dot: string; bg: string; border: string; color: string }> = {
  emergency: {
    label: 'Emergency',
    dot: '#F43F5E',
    bg: 'rgba(244,63,94,0.1)',
    border: 'rgba(244,63,94,0.3)',
    color: '#F43F5E',
  },
  senior: {
    label: 'Senior',
    dot: '#F5A623',
    bg: 'rgba(245,166,35,0.1)',
    border: 'rgba(245,166,35,0.3)',
    color: '#F5A623',
  },
  normal: {
    label: 'Normal',
    dot: '#3C4F6E',
    bg: 'rgba(60,79,110,0.15)',
    border: 'rgba(60,79,110,0.3)',
    color: '#8C9BBB',
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = CONFIG[priority];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}
