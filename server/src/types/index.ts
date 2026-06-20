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
  registeredAt: Date;
  calledAt?: Date;
  consultationStartedAt?: Date;
  consultationEndedAt?: Date;
  position: number;
  notes?: string;
  doctorId?: string;
  manualOrder?: number; // within-tier override
}

export interface QueueStats {
  totalWaiting: number;
  totalCompleted: number;
  totalNoShow: number;
  averageWaitTime: number;
  averageConsultationTime: number;
  currentToken: number | null;
  lastUpdated: Date;
}

export interface ConsultationHistory {
  consultationType: ConsultationType;
  duration: number;
  completedAt: Date;
  doctorId?: string;
  hour: number; // 0-23 for analytics
}

export interface QueueState {
  patients: Patient[];
  stats: QueueStats;
  defaultConsultationDuration: number;
  consultationHistory: ConsultationHistory[];
  doctors: Doctor[];
  isPaused: boolean;
  pauseReason?: string;
  isLocked: boolean;
  lockHolder?: string;
  lockTimestamp?: Date;
}

export interface WaitTimeEstimate {
  patientId: string;
  tokensAhead: number;
  estimatedWaitMinutes: number;
  estimatedCallTime: Date;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  patientToken?: number;
  patientName?: string;
}

export interface HourlyCount {
  hour: number;
  count: number;
  avgDuration: number;
}

export interface Analytics {
  peakHour: { hour: number; count: number } | null;
  byType: { type: string; count: number; avgDuration: number }[];
  byDoctor: { doctorId: string; name: string; count: number; avgDuration: number }[];
  byHour: HourlyCount[];
  completionRate: number;
  totalToday: number;
}
