import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';
import { useQueueStore } from '../store/queueStore';
import { useShallow } from 'zustand/shallow';
import type { FullQueueState } from '../types';
import type { ConsultationType, Priority } from '../types';
import toast from 'react-hot-toast';

const SOCKET_URL = '';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
  }
  return socketInstance;
}

// Custom event for sound alert hook to listen to
const TOKEN_CALLED_EVENT = 'queue-cure:token-called';
export function onTokenCalled(cb: (data: { token: number; name: string; doctorId?: string }) => void) {
  const handler = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(TOKEN_CALLED_EVENT, handler);
  return () => window.removeEventListener(TOKEN_CALLED_EVENT, handler);
}

const EMERGENCY_ALERT_EVENT = 'queue-cure:emergency-alert';
export function onEmergencyAlert(cb: (data: { name: string; token: number; doctorId?: string }) => void) {
  const handler = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(EMERGENCY_ALERT_EVENT, handler);
  return () => window.removeEventListener(EMERGENCY_ALERT_EVENT, handler);
}

export function useSocket() {
  const { syncState, setConnected } = useQueueStore(useShallow(s => ({
    syncState: s.syncState,
    setConnected: s.setConnected,
  })));
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('reconnect:sync');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('queue:sync', (state: FullQueueState) => {
      syncState(state);
    });

    socket.on('queue:update', (state: FullQueueState) => {
      syncState(state);
    });

    socket.on('token:called', (data: { token: number; name: string; doctorId?: string }) => {
      window.dispatchEvent(new CustomEvent(TOKEN_CALLED_EVENT, { detail: data }));
    });

    socket.on('queue:paused', ({ reason }: { reason?: string }) => {
      toast(`Queue paused${reason ? `: ${reason}` : ''}`, {
        icon: '⏸',
        style: { background: '#0C1525', color: '#E8EDF5' },
      });
    });

    socket.on('queue:resumed', () => {
      toast('Queue resumed', {
        icon: '▶',
        style: { background: '#0C1525', color: '#10B981' },
      });
    });

    socket.on('emergency:alert', ({ patient }: { patient: { name: string; token: number } }) => {
      toast.error(`EMERGENCY: Token #${patient.token} — ${patient.name} added to front of queue`, {
        duration: 5000,
        position: 'top-center',
      });
      window.dispatchEvent(new CustomEvent(EMERGENCY_ALERT_EVENT, { detail: patient }));
    });

    return () => {
      // Keep singleton alive; don't disconnect on unmount
    };
  }, [syncState, setConnected]);

  return socketInstance;
}

function emit<T>(event: string, data: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    const timer = setTimeout(() => reject(new Error('Request timed out — check connection')), 8000);
    socket.emit(
      event,
      { ...data, eventId: uuidv4() },
      (res: { success: boolean; error?: string } & T) => {
        clearTimeout(timer);
        if (res?.success === false) reject(new Error(res.error ?? 'Unknown error'));
        else resolve(res);
      }
    );
  });
}

export const socketActions = {
  addPatient: (data: {
    name: string;
    age: number;
    consultationType: ConsultationType;
    priority: Priority;
    estimatedDuration?: number;
    notes?: string;
    doctorId?: string;
  }) => emit('patient:add', data),

  callNext: () => emit('token:next', {}),

  updatePatient: (data: {
    patientId: string;
    status: 'completed' | 'no-show' | 'cancelled';
  }) => emit('patient:update', data),

  setPatientDuration: (patientId: string, duration: number) =>
    emit('patient:setDuration', { patientId, duration }),

  setDefaultDuration: (minutes: number) => {
    getSocket().emit('queue:setDefaultDuration', { minutes });
  },

  insertEmergency: (data: {
    name: string;
    age: number;
    consultationType: ConsultationType;
    notes?: string;
    doctorId?: string;
  }) => emit('emergency:insert', data),

  updateNotes: (patientId: string, notes: string) =>
    emit('patient:notes', { patientId, notes }),

  assignDoctor: (patientId: string, doctorId: string) =>
    emit('patient:assignDoctor', { patientId, doctorId }),

  reorderPatient: (patientId: string, direction: 'up' | 'down') =>
    emit('patient:reorder', { patientId, direction }),

  pauseQueue: (reason?: string) => {
    getSocket().emit('queue:pause', { reason });
  },

  resumeQueue: () => {
    getSocket().emit('queue:resume');
  },

  addDoctor: (name: string, specialty: string) =>
    emit('doctor:add', { name, specialty }),

  toggleDoctor: (doctorId: string) =>
    emit('doctor:toggle', { doctorId }),

  getAnalytics: (): Promise<unknown> =>
    new Promise((resolve) => {
      getSocket().emit('analytics:get', resolve);
    }),
};
