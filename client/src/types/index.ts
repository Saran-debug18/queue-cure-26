export type Priority = 'emergency' | 'senior' | 'normal';
export type ConsultationType = 'general' | 'specialist' | 'followup' | 'emergency';
export type PatientStatus = 'waiting' | 'in-consultation' | 'completed' | 'no-show' | 'cancelled';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  isActive: boolean;
}

export interface Patient {
  id: string;
  token: number;
  name: string;
  age: number;
  consultationType: ConsultationType;
  priority: Priority;
  status: PatientStatus;
  estimatedDuration: number;
  actualDuration?: number;
  registeredAt: string;
  calledAt?: string;
  consultationStartedAt?: string;
  consultationEndedAt?: string;
  position: number;
  notes?: string;
  doctorId?: string;
  manualOrder?: number;
}

export interface QueueStats {
  totalWaiting: number;
  totalCompleted: number;
  totalNoShow: number;
  averageWaitTime: number;
  averageConsultationTime: number;
  currentToken: number | null;
  lastUpdated: string;
}

export interface WaitTimeEstimate {
  patientId: string;
  tokensAhead: number;
  estimatedWaitMinutes: number;
  estimatedCallTime: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  patientToken?: number;
  patientName?: string;
}

export interface ConsultationHistory {
  consultationType: ConsultationType;
  duration: number;
  completedAt: string;
  doctorId?: string;
  hour: number;
}

export interface FullQueueState {
  patients: Patient[];
  stats: QueueStats;
  defaultConsultationDuration: number;
  waitTimes: Record<string, WaitTimeEstimate>;
  activityLog: ActivityLog[];
  consultationHistory: ConsultationHistory[];
  doctors: Doctor[];
  isPaused: boolean;
  pauseReason?: string;
}

export interface Analytics {
  peakHour: { hour: number; count: number } | null;
  byType: { type: string; count: number; avgDuration: number }[];
  byDoctor: { doctorId: string; name: string; count: number; avgDuration: number }[];
  byHour: { hour: number; count: number; avgDuration: number }[];
  completionRate: number;
  totalToday: number;
}
