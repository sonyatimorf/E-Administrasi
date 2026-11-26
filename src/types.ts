export type SemesterType = 'Ganjil' | 'Genap';

export interface UserProfile {
  teacherId: string;
  displayName: string;
  email: string;
  schoolName?: string;
  nip?: string;
  subject?: string;
  academicYear: string;
  activeSemester: SemesterType;
  kkmDefault: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type StudentGender = 'L' | 'P';
export type StudentStatus = 'Aktif' | 'Mutasi' | 'Lulus';

export interface Student {
  id: string;
  teacherId: string;
  nis: string;
  name: string;
  className: string;
  gender: StudentGender;
  guardianPhone?: string;
  status: StudentStatus;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Schedule {
  id: string;
  teacherId: string;
  dayOfWeek: number; // 1 = Senin ... 7 = Minggu
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  className: string;
  subject: string;
  room?: string;
  topic?: string;
  semester: SemesterType;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AcademicEventCategory =
  | 'libur_nasional'
  | 'libur_sekolah'
  | 'ujian'
  | 'kegiatan_sekolah'
  | 'efektif';

export interface AcademicEvent {
  id: string;
  teacherId: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  category: AcademicEventCategory;
  description?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type TeachingDocType = 'cp_atp' | 'prota' | 'promes' | 'modul_ajar' | 'kktp';
export type TeachingDocStatus = 'Draf' | 'Siap Pakai' | 'Terlaksana';

export interface TeachingDocument {
  id: string;
  teacherId: string;
  docType: TeachingDocType;
  title: string;
  phaseOrGrade: string;
  semester: 'Ganjil' | 'Genap' | 'Tahunan';
  subject: string;
  targetOutcome?: string;
  kktpThreshold?: number;
  durationHours?: number;
  contentSummary?: string;
  status: TeachingDocStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AttendanceStatus = 'H' | 'S' | 'I' | 'A';

export interface AttendanceSession {
  id: string;
  teacherId: string;
  date: string;
  className: string;
  subject: string;
  semester: SemesterType;
  records: Record<string, AttendanceStatus>;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TeachingJournal {
  id: string;
  teacherId: string;
  date: string;
  className: string;
  subject: string;
  meetingNo: number;
  topic: string;
  learningActivity?: string;
  studentProgressNote?: string;
  reflection?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AssessmentCategory = 'formatif' | 'sumatif' | 'tugas' | 'pts' | 'pas' | 'praktik';

export interface StudentScoreEntry {
  score: number | null;
  remedialScore?: number | null;
  remedialPlan?: string;
  isEnrichment?: boolean;
  enrichmentNote?: string;
  feedback?: string;
}

export interface Assessment {
  id: string;
  teacherId: string;
  title: string;
  category: AssessmentCategory;
  className: string;
  subject: string;
  semester: SemesterType;
  month: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  maxScore: number;
  kktp: number;
  instrumentNotes?: string;
  scores: Record<string, StudentScoreEntry>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type GuidanceCategory = 'akademik' | 'kehadiran' | 'perilaku' | 'prestasi';
export type GuidanceStatus = 'perlu_tindak_lanjut' | 'dalam_bimbingan' | 'selesai';

export interface GuidanceNote {
  id: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  category: GuidanceCategory;
  issueSummary: string;
  followUpPlan?: string;
  status: GuidanceStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type TaskPriority = 'tinggi' | 'sedang' | 'rendah';

export interface DailyTask {
  id: string;
  teacherId: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  priority: TaskPriority;
  category?: string;
  completed: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const FIELD_LIMITS = {
  DISPLAY_NAME: 120,
  EMAIL: 180,
  SCHOOL_NAME: 180,
  NIP: 40,
  SUBJECT: 120,
  ACADEMIC_YEAR: 20,
  NIS: 30,
  CLASS_NAME: 40,
  PHONE: 30,
  NOTES: 500,
  ROOM: 60,
  TOPIC: 240,
  EVENT_TITLE: 160,
  DESCRIPTION: 600,
  DOC_TITLE: 200,
  PHASE_GRADE: 60,
  TARGET_OUTCOME: 1200,
  CONTENT_SUMMARY: 3000,
  LEARNING_ACTIVITY: 1500,
  PROGRESS_NOTE: 1500,
  REFLECTION: 1000,
  INSTRUMENT_NOTES: 1500,
  GUIDANCE_SUMMARY: 1000,
  TASK_TITLE: 200,
  TASK_CATEGORY: 60,
} as const;

export const DAY_NAMES: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};
