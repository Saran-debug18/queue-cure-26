import { v4 as uuidv4 } from 'uuid';
import {
  Patient, QueueState, QueueStats, ConsultationHistory,
  WaitTimeEstimate, Priority, ConsultationType, PatientStatus,
  ActivityLog, Doctor, Analytics, HourlyCount,
} from '../types';

const TYPE_DURATION_DEFAULTS: Record<ConsultationType, number> = {
  general: 10, specialist: 20, followup: 8, emergency: 15,
};
const LOCK_TIMEOUT_MS = 5000;

class QueueService {
  private state: QueueState;
  private tokenCounter: number = 1;
  private activityLog: ActivityLog[] = [];
  private processedEventIds: Set<string> = new Set();

  constructor() {
    this.state = {
      patients: [],
      stats: {
        totalWaiting: 0, totalCompleted: 0, totalNoShow: 0,
        averageWaitTime: 0, averageConsultationTime: 10,
        currentToken: null, lastUpdated: new Date(),
      },
      defaultConsultationDuration: 10,
      consultationHistory: [],
      doctors: [
        { id: 'doc-1', name: 'Dr. Sarah Chen',   specialty: 'General',    isActive: true },
        { id: 'doc-2', name: 'Dr. Arjun Patel',  specialty: 'Specialist', isActive: true },
        { id: 'doc-3', name: 'Dr. Mei Tanaka',   specialty: 'Pediatrics', isActive: true },
      ],
      isPaused: false,
      isLocked: false,
    };
  }

  // ── Idempotency ──
  isEventProcessed(id: string) { return this.processedEventIds.has(id); }
  markEventProcessed(id: string) {
    this.processedEventIds.add(id);
    if (this.processedEventIds.size > 1000) {
      const arr = Array.from(this.processedEventIds);
      this.processedEventIds = new Set(arr.slice(-500));
    }
  }

  // ── Lock ──
  acquireLock(holderId: string): boolean {
    if (this.state.isLocked) {
      const elapsed = Date.now() - (this.state.lockTimestamp?.getTime() ?? 0);
      if (elapsed < LOCK_TIMEOUT_MS) return false;
    }
    this.state.isLocked = true;
    this.state.lockHolder = holderId;
    this.state.lockTimestamp = new Date();
    return true;
  }
  releaseLock(holderId: string) {
    if (this.state.lockHolder === holderId) {
      this.state.isLocked = false;
      this.state.lockHolder = undefined;
      this.state.lockTimestamp = undefined;
    }
  }

  // ── Priority sort ──
  private priorityWeight(p: Priority) { return { emergency: 0, senior: 1, normal: 2 }[p]; }

  private sortQueue(patients: Patient[]): Patient[] {
    const waiting = patients.filter(p => p.status === 'waiting');
    const rest    = patients.filter(p => p.status !== 'waiting');

    waiting.sort((a, b) => {
      const pw = this.priorityWeight(a.priority) - this.priorityWeight(b.priority);
      if (pw !== 0) return pw;
      // within same priority, respect manualOrder then registration time
      if (a.manualOrder !== undefined && b.manualOrder !== undefined) return a.manualOrder - b.manualOrder;
      if (a.manualOrder !== undefined) return -1;
      if (b.manualOrder !== undefined) return 1;
      return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
    });

    waiting.forEach((p, i) => (p.position = i + 1));
    return [...waiting, ...rest];
  }

  // ── Duration helpers ──
  private getAvgDuration(type: ConsultationType): number {
    const h = this.state.consultationHistory.filter(h => h.consultationType === type);
    if (!h.length) return this.state.defaultConsultationDuration || TYPE_DURATION_DEFAULTS[type];
    return Math.round(h.reduce((s, x) => s + x.duration, 0) / h.length);
  }

  private getOverallAvgDuration(): number {
    const h = this.state.consultationHistory;
    if (!h.length) return this.state.defaultConsultationDuration;
    return Math.round(h.reduce((s, x) => s + x.duration, 0) / h.length);
  }

  // ── Wait time ──
  computeWaitTime(patientId: string): WaitTimeEstimate | null {
    const patient = this.state.patients.find(p => p.id === patientId);
    if (!patient || patient.status !== 'waiting') return null;

    const waiting = this.state.patients
      .filter(p => p.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    const pos = waiting.findIndex(p => p.id === patientId);
    if (pos === -1) return null;

    let totalWait = 0;
    for (let i = 0; i < pos; i++) totalWait += waiting[i].estimatedDuration;

    const inConsult = this.state.patients.find(p => p.status === 'in-consultation');
    if (inConsult?.consultationStartedAt) {
      const elapsed = (Date.now() - new Date(inConsult.consultationStartedAt).getTime()) / 60000;
      totalWait += Math.max(0, inConsult.estimatedDuration - elapsed);
    }

    return {
      patientId, tokensAhead: pos,
      estimatedWaitMinutes: Math.round(totalWait),
      estimatedCallTime: new Date(Date.now() + totalWait * 60000),
    };
  }

  computeAllWaitTimes(): Record<string, WaitTimeEstimate> {
    const result: Record<string, WaitTimeEstimate> = {};
    for (const p of this.state.patients) {
      if (p.status === 'waiting') {
        const wt = this.computeWaitTime(p.id);
        if (wt) result[p.id] = wt;
      }
    }
    return result;
  }

  // ── Stats ──
  private refreshStats() {
    const patients  = this.state.patients;
    const waiting   = patients.filter(p => p.status === 'waiting');
    const completed = patients.filter(p => p.status === 'completed');
    const noShow    = patients.filter(p => p.status === 'no-show');
    const inConsult = patients.find(p => p.status === 'in-consultation');

    const avgWait = waiting.length > 0
      ? Math.round(waiting.reduce((s, p) => {
          const wt = this.computeWaitTime(p.id);
          return s + (wt?.estimatedWaitMinutes ?? 0);
        }, 0) / waiting.length)
      : 0;

    this.state.stats = {
      totalWaiting: waiting.length,
      totalCompleted: completed.length,
      totalNoShow: noShow.length,
      averageWaitTime: avgWait,
      averageConsultationTime: this.getOverallAvgDuration(),
      currentToken: inConsult?.token ?? null,
      lastUpdated: new Date(),
    };
  }

  private log(action: string, details: string, patient?: Patient) {
    const entry: ActivityLog = {
      id: uuidv4(), timestamp: new Date(), action, details,
      patientToken: patient?.token, patientName: patient?.name,
    };
    this.activityLog.unshift(entry);
    if (this.activityLog.length > 100) this.activityLog.pop();
  }

  // ── Add patient ──
  addPatient(data: {
    name: string; age: number; consultationType: ConsultationType;
    priority: Priority; estimatedDuration?: number; notes?: string; doctorId?: string;
  }): Patient {
    const avgDur = this.getAvgDuration(data.consultationType);
    const patient: Patient = {
      id: uuidv4(), token: this.tokenCounter++,
      name: data.name, age: data.age,
      consultationType: data.consultationType, priority: data.priority,
      status: 'waiting',
      estimatedDuration: data.estimatedDuration ?? avgDur,
      registeredAt: new Date(), position: 0,
      notes: data.notes, doctorId: data.doctorId,
    };
    this.state.patients.push(patient);
    this.state.patients = this.sortQueue(this.state.patients);
    this.refreshStats();
    this.log('Patient added', `Token #${patient.token} — ${patient.name}`, patient);
    return patient;
  }

  // ── Call next ──
  callNextToken(callerId: string): Patient | null {
    if (!this.acquireLock(callerId)) return null;
    try {
      const next = this.state.patients.find(p => p.status === 'waiting');
      if (!next) return null;

      const current = this.state.patients.find(p => p.status === 'in-consultation');
      if (current) this.completeConsultation(current.id, 'completed');

      next.status = 'in-consultation';
      next.calledAt = new Date();
      next.consultationStartedAt = new Date();
      next.manualOrder = undefined; // clear manual order once called

      this.state.patients = this.sortQueue(this.state.patients);
      this.refreshStats();
      this.log('Token called', `Token #${next.token} — ${next.name}`, next);
      return next;
    } finally {
      this.releaseLock(callerId);
    }
  }

  // ── Complete / no-show ──
  completeConsultation(patientId: string, status: 'completed' | 'no-show'): Patient | null {
    const p = this.state.patients.find(x => x.id === patientId);
    if (!p) return null;

    const end = new Date();
    p.status = status;
    p.consultationEndedAt = end;

    if (status === 'completed' && p.consultationStartedAt) {
      const dur = Math.max(1, Math.round((end.getTime() - new Date(p.consultationStartedAt).getTime()) / 60000));
      p.actualDuration = dur;
      this.state.consultationHistory.push({
        consultationType: p.consultationType,
        duration: dur,
        completedAt: end,
        doctorId: p.doctorId,
        hour: end.getHours(),
      });
    }

    this.state.patients = this.sortQueue(this.state.patients);
    this.refreshStats();
    this.log(status === 'completed' ? 'Consultation completed' : 'Patient no-show', `Token #${p.token} — ${p.name}`, p);
    return p;
  }

  // ── Cancel ──
  cancelPatient(patientId: string): Patient | null {
    const p = this.state.patients.find(x => x.id === patientId);
    if (!p || p.status === 'completed') return null;
    p.status = 'cancelled';
    this.state.patients = this.sortQueue(this.state.patients);
    this.refreshStats();
    this.log('Patient cancelled', `Token #${p.token} — ${p.name}`, p);
    return p;
  }

  // ── Duration override ──
  updatePatientDuration(patientId: string, duration: number): Patient | null {
    const p = this.state.patients.find(x => x.id === patientId);
    if (!p) return null;
    p.estimatedDuration = Math.max(1, duration);
    this.refreshStats();
    return p;
  }

  // ── Notes ──
  updatePatientNotes(patientId: string, notes: string): Patient | null {
    const p = this.state.patients.find(x => x.id === patientId);
    if (!p) return null;
    p.notes = notes.trim();
    return p;
  }

  // ── Doctor assign ──
  assignDoctor(patientId: string, doctorId: string): Patient | null {
    const p = this.state.patients.find(x => x.id === patientId);
    if (!p) return null;
    p.doctorId = doctorId;
    this.log('Doctor assigned', `Token #${p.token} assigned to ${this.getDoctor(doctorId)?.name ?? doctorId}`, p);
    this.refreshStats();
    return p;
  }

  // ── Reorder (within same priority tier) ──
  reorderPatient(patientId: string, direction: 'up' | 'down'): boolean {
    const waiting = this.state.patients.filter(p => p.status === 'waiting').sort((a, b) => a.position - b.position);
    const idx = waiting.findIndex(p => p.id === patientId);
    if (idx === -1) return false;

    const patient = waiting[idx];
    const tierPatients = waiting.filter(p => p.priority === patient.priority);
    const tierIdx = tierPatients.findIndex(p => p.id === patientId);

    if (direction === 'up' && tierIdx === 0) return false;
    if (direction === 'down' && tierIdx === tierPatients.length - 1) return false;

    const swapWith = tierPatients[direction === 'up' ? tierIdx - 1 : tierIdx + 1];

    // Swap manualOrder values
    const tmpOrder = patient.position;
    patient.manualOrder = swapWith.position;
    swapWith.manualOrder = tmpOrder;

    this.state.patients = this.sortQueue(this.state.patients);
    this.refreshStats();
    return true;
  }

  // ── Pause / Resume ──
  pauseQueue(reason?: string) {
    this.state.isPaused = true;
    this.state.pauseReason = reason;
    this.log('Queue paused', reason ?? 'Queue paused by receptionist');
  }

  resumeQueue() {
    this.state.isPaused = false;
    this.state.pauseReason = undefined;
    this.log('Queue resumed', 'Queue resumed by receptionist');
  }

  // ── Default duration ──
  setDefaultDuration(minutes: number) {
    this.state.defaultConsultationDuration = Math.max(1, minutes);
    this.refreshStats();
  }

  // ── Emergency ──
  insertEmergency(data: { name: string; age: number; consultationType: ConsultationType; notes?: string; doctorId?: string }): Patient {
    const p = this.addPatient({ ...data, priority: 'emergency' });
    this.log('EMERGENCY inserted', `Token #${p.token} — ${p.name}`, p);
    return p;
  }

  // ── Doctors ──
  getDoctors(): Doctor[] { return this.state.doctors; }

  getDoctor(id: string): Doctor | undefined { return this.state.doctors.find(d => d.id === id); }

  addDoctor(name: string, specialty: string): Doctor {
    const doc: Doctor = { id: uuidv4(), name, specialty, isActive: true };
    this.state.doctors.push(doc);
    return doc;
  }

  toggleDoctor(id: string): Doctor | null {
    const d = this.state.doctors.find(x => x.id === id);
    if (!d) return null;
    d.isActive = !d.isActive;
    return d;
  }

  // ── Full state for broadcast ──
  getFullState() {
    return {
      patients: this.state.patients,
      stats: this.state.stats,
      defaultConsultationDuration: this.state.defaultConsultationDuration,
      waitTimes: this.computeAllWaitTimes(),
      activityLog: this.activityLog.slice(0, 20),
      consultationHistory: this.state.consultationHistory.slice(-50),
      doctors: this.state.doctors,
      isPaused: this.state.isPaused,
      pauseReason: this.state.pauseReason,
    };
  }

  getActivityLog(): ActivityLog[] { return this.activityLog; }

  // ── Analytics ──
  getAnalytics(): Analytics {
    const h = this.state.consultationHistory;

    const byHourMap: Record<number, { count: number; total: number }> = {};
    const byTypeMap: Record<string, { count: number; total: number }> = {};
    const byDoctorMap: Record<string, { count: number; total: number }> = {};

    for (const entry of h) {
      // hour
      if (!byHourMap[entry.hour]) byHourMap[entry.hour] = { count: 0, total: 0 };
      byHourMap[entry.hour].count++;
      byHourMap[entry.hour].total += entry.duration;
      // type
      if (!byTypeMap[entry.consultationType]) byTypeMap[entry.consultationType] = { count: 0, total: 0 };
      byTypeMap[entry.consultationType].count++;
      byTypeMap[entry.consultationType].total += entry.duration;
      // doctor
      if (entry.doctorId) {
        if (!byDoctorMap[entry.doctorId]) byDoctorMap[entry.doctorId] = { count: 0, total: 0 };
        byDoctorMap[entry.doctorId].count++;
        byDoctorMap[entry.doctorId].total += entry.duration;
      }
    }

    const byHour: HourlyCount[] = Object.entries(byHourMap).map(([hr, d]) => ({
      hour: Number(hr), count: d.count, avgDuration: Math.round(d.total / d.count),
    })).sort((a, b) => a.hour - b.hour);

    const peakEntry = byHour.reduce<HourlyCount | null>((best, x) => (!best || x.count > best.count ? x : best), null);

    const totalPatients = this.state.patients.length;
    const completed = this.state.patients.filter(p => p.status === 'completed').length;

    return {
      peakHour: peakEntry ? { hour: peakEntry.hour, count: peakEntry.count } : null,
      byType: Object.entries(byTypeMap).map(([type, d]) => ({
        type, count: d.count, avgDuration: Math.round(d.total / d.count),
      })),
      byDoctor: Object.entries(byDoctorMap).map(([doctorId, d]) => ({
        doctorId,
        name: this.getDoctor(doctorId)?.name ?? doctorId,
        count: d.count,
        avgDuration: Math.round(d.total / d.count),
      })),
      byHour,
      completionRate: totalPatients > 0 ? Math.round(completed / totalPatients * 100) : 0,
      totalToday: totalPatients,
    };
  }
}

export const queueService = new QueueService();
