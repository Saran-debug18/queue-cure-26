import { useState, useEffect } from 'react';
import { useQueueStore } from '../store/queueStore';

export function useOvertimeTracker() {
  const patients = useQueueStore(s => s.patients);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);

  const active = patients.find(p => p.status === 'in-consultation');

  useEffect(() => {
    if (!active?.consultationStartedAt) { setOvertimeSeconds(0); return; }
    const startMs = new Date(active.consultationStartedAt).getTime();
    const limitMs = active.estimatedDuration * 60 * 1000;

    const tick = () => {
      const elapsed = Date.now() - startMs;
      const over = elapsed - limitMs;
      setOvertimeSeconds(over > 0 ? Math.floor(over / 1000) : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active?.id, active?.consultationStartedAt, active?.estimatedDuration]);

  return { overtimeSeconds, isOvertime: overtimeSeconds > 0, activePatient: active };
}
