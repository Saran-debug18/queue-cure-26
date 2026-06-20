import { create } from 'zustand';
import type { Patient, QueueStats, WaitTimeEstimate, ActivityLog, ConsultationHistory, FullQueueState, Doctor } from '../types';

interface QueueStore {
  patients: Patient[];
  stats: QueueStats;
  defaultConsultationDuration: number;
  waitTimes: Record<string, WaitTimeEstimate>;
  activityLog: ActivityLog[];
  consultationHistory: ConsultationHistory[];
  doctors: Doctor[];
  isPaused: boolean;
  pauseReason?: string;

  // UI state
  isConnected: boolean;
  isTVMode: boolean;
  soundEnabled: boolean;
  searchQuery: string;
  filterPriority: string;   // '' | 'emergency' | 'senior' | 'normal'
  filterDoctor: string;     // '' | doctorId
  activeTab: 'queue' | 'history' | 'analytics';

  // Actions
  syncState: (state: FullQueueState) => void;
  setConnected: (v: boolean) => void;
  toggleTVMode: () => void;
  toggleSound: () => void;
  setSearch: (q: string) => void;
  setFilterPriority: (p: string) => void;
  setFilterDoctor: (d: string) => void;
  setActiveTab: (t: 'queue' | 'history' | 'analytics') => void;

  // Derived
  getWaitingPatients: () => Patient[];
  getCurrentPatient: () => Patient | undefined;
  getFilteredWaiting: () => Patient[];
}

const defaultStats: QueueStats = {
  totalWaiting: 0, totalCompleted: 0, totalNoShow: 0,
  averageWaitTime: 0, averageConsultationTime: 10,
  currentToken: null, lastUpdated: new Date().toISOString(),
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  patients: [],
  stats: defaultStats,
  defaultConsultationDuration: 10,
  waitTimes: {},
  activityLog: [],
  consultationHistory: [],
  doctors: [],
  isPaused: false,
  pauseReason: undefined,
  isConnected: false,
  isTVMode: false,
  soundEnabled: true,
  searchQuery: '',
  filterPriority: '',
  filterDoctor: '',
  activeTab: 'queue',

  syncState: (state) => set({
    patients: state.patients,
    stats: state.stats,
    defaultConsultationDuration: state.defaultConsultationDuration,
    waitTimes: state.waitTimes,
    activityLog: state.activityLog,
    consultationHistory: state.consultationHistory,
    doctors: state.doctors,
    isPaused: state.isPaused,
    pauseReason: state.pauseReason,
  }),

  setConnected: (v) => set({ isConnected: v }),
  toggleTVMode: () => set(s => ({ isTVMode: !s.isTVMode })),
  toggleSound: () => set(s => ({ soundEnabled: !s.soundEnabled })),
  setSearch: (q) => set({ searchQuery: q }),
  setFilterPriority: (p) => set({ filterPriority: p }),
  setFilterDoctor: (d) => set({ filterDoctor: d }),
  setActiveTab: (t) => set({ activeTab: t }),

  getWaitingPatients: () => get().patients.filter(p => p.status === 'waiting'),
  getCurrentPatient: () => get().patients.find(p => p.status === 'in-consultation'),

  getFilteredWaiting: () => {
    const { patients, searchQuery, filterPriority, filterDoctor } = get();
    return patients.filter(p => {
      if (p.status !== 'waiting') return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterPriority && p.priority !== filterPriority) return false;
      if (filterDoctor && p.doctorId !== filterDoctor) return false;
      return true;
    });
  },
}));
