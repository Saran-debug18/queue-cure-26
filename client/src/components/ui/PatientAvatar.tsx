import type { Priority } from '../../types';

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; ring: string }> = {
  emergency: { bg: 'rgba(244,63,94,0.15)', text: '#F43F5E', ring: 'rgba(244,63,94,0.4)' },
  senior:    { bg: 'rgba(245,166,35,0.15)', text: '#F5A623', ring: 'rgba(245,166,35,0.4)' },
  normal:    { bg: 'rgba(13,185,215,0.12)', text: '#0DB9D7', ring: 'rgba(13,185,215,0.3)' },
};

export function PatientAvatar({ name, priority, size = 36 }: { name: string; priority: Priority; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const c = PRIORITY_COLORS[priority];
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center font-bold rounded-full font-mono"
      style={{
        width: size,
        height: size,
        background: c.bg,
        color: c.text,
        border: `1.5px solid ${c.ring}`,
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </div>
  );
}
