export function formatWaitTime(minutes: number): string {
  if (minutes <= 0) return 'Now';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ago`;
}

export const CONSULTATION_LABELS: Record<string, string> = {
  general: 'General',
  specialist: 'Specialist',
  followup: 'Follow-up',
  emergency: 'Emergency',
};

export const PRIORITY_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  senior: 'Senior',
  normal: 'Normal',
};

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
