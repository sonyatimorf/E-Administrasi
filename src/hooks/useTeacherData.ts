import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AcademicEvent,
  Assessment,
  AttendanceSession,
  DailyTask,
  FIELD_LIMITS,
  GuidanceNote,
  Schedule,
  Student,
  TeachingDocument,
  TeachingJournal,
  UserProfile,
} from '../types';
import { seedInitialTeacherData } from '../utils/seedData';

export type SyncState = 'synced' | 'pending' | 'offline';

export function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function useTeacherData(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [teachingDocs, setTeachingDocs] = useState<TeachingDocument[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [guidanceNotes, setGuidanceNotes] = useState<GuidanceNote[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setStudents([]);
      setSchedules([]);
      setAcademicEvents([]);
      setTeachingDocs([]);
      setAttendance([]);
      setJournals([]);
      setAssessments([]);
      setGuidanceNotes([]);
      setDailyTasks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const unsubs: (() => void)[] = [];
    const uid = user.uid;

    const setup = async () => {
      setLoading(true);
      const userRef = doc(db, `users/${uid}`);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists() && !cancelled) {
          await seedInitialTeacherData(
            uid,
            user.displayName || 'Guru Pengajar',
            user.email || 'guru@sekolah.sch.id'
          );
        }
      } catch (err) {
        // Offline or transient error: listeners below still serve persistent local cache
        console.warn('Initial profile check deferred:', err);
      }

      if (cancelled) return;

      unsubs.push(
        onSnapshot(
          userRef,
          { includeMetadataChanges: true },
          (snap) => {
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
            }
            setHasPendingWrites(snap.metadata.hasPendingWrites);
            setLoading(false);
          },
          (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
        )
      );

      const bindCollection = <T extends { id: string }>(
        colName: string,
        setter: (items: T[]) => void
      ) => {
        const path = `users/${uid}/${colName}`;
        const q = query(collection(db, path), where('teacherId', '==', uid));
        const unsub = onSnapshot(
          q,
          { includeMetadataChanges: true },
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) } as T));
            setter(list);
            if (snap.metadata.hasPendingWrites) {
              setHasPendingWrites(true);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, path)
        );
        unsubs.push(unsub);
      };

      bindCollection<Student>('students', setStudents);
      bindCollection<Schedule>('schedules', setSchedules);
      bindCollection<AcademicEvent>('academicEvents', setAcademicEvents);
      bindCollection<TeachingDocument>('teachingDocs', setTeachingDocs);
      bindCollection<AttendanceSession>('attendance', setAttendance);
      bindCollection<TeachingJournal>('journals', setJournals);
      bindCollection<Assessment>('assessments', setAssessments);
      bindCollection<GuidanceNote>('guidanceNotes', setGuidanceNotes);
      bindCollection<DailyTask>('dailyTasks', setDailyTasks);
    };

    void setup();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [user]);

  const syncState: SyncState = !isOnline ? 'offline' : hasPendingWrites ? 'pending' : 'synced';

  // CRUD Helpers with strict schema truncation
  const uid = user?.uid ?? '';

  const updateProfile = async (
    updates: Partial<Pick<UserProfile, 'displayName' | 'schoolName' | 'nip' | 'subject' | 'academicYear' | 'activeSemester' | 'kkmDefault'>>
  ) => {
    if (!uid) return;
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, path), {
        ...(updates.displayName !== undefined ? { displayName: updates.displayName.trim().slice(0, FIELD_LIMITS.DISPLAY_NAME) } : {}),
        ...(updates.schoolName !== undefined ? { schoolName: updates.schoolName.trim().slice(0, FIELD_LIMITS.SCHOOL_NAME) } : {}),
        ...(updates.nip !== undefined ? { nip: updates.nip.trim().slice(0, FIELD_LIMITS.NIP) } : {}),
        ...(updates.subject !== undefined ? { subject: updates.subject.trim().slice(0, FIELD_LIMITS.SUBJECT) } : {}),
        ...(updates.academicYear !== undefined ? { academicYear: updates.academicYear.trim().slice(0, FIELD_LIMITS.ACADEMIC_YEAR) } : {}),
        ...(updates.activeSemester !== undefined ? { activeSemester: updates.activeSemester } : {}),
        ...(updates.kkmDefault !== undefined ? { kkmDefault: Math.min(100, Math.max(0, Number(updates.kkmDefault) || 75)) } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const saveStudent = async (data: Omit<Student, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('stu');
    const path = `users/${uid}/students/${id}`;
    const payload = {
      teacherId: uid,
      nis: data.nis.trim().slice(0, FIELD_LIMITS.NIS),
      name: data.name.trim().slice(0, FIELD_LIMITS.DISPLAY_NAME),
      className: data.className.trim().slice(0, FIELD_LIMITS.CLASS_NAME),
      gender: data.gender,
      guardianPhone: (data.guardianPhone || '').trim().slice(0, FIELD_LIMITS.PHONE),
      status: data.status,
      notes: (data.notes || '').trim().slice(0, FIELD_LIMITS.NOTES),
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeStudent = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/students/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const importStudentsBatch = async (
    items: Omit<Student, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<number> => {
    if (!uid || items.length === 0) return 0;
    const chunkSize = 400;
    let imported = 0;
    try {
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        const now = serverTimestamp();
        chunk.forEach((item, idx) => {
          const id = makeDocId(`stu_${i + idx}`);
          const ref = doc(db, `users/${uid}/students/${id}`);
          batch.set(ref, {
            teacherId: uid,
            nis: item.nis.trim().slice(0, FIELD_LIMITS.NIS) || `NIS-${Date.now()}-${i + idx}`,
            name: item.name.trim().slice(0, FIELD_LIMITS.DISPLAY_NAME),
            className: item.className.trim().slice(0, FIELD_LIMITS.CLASS_NAME) || 'X RPL 1',
            gender: item.gender === 'P' ? 'P' : 'L',
            guardianPhone: (item.guardianPhone || '').trim().slice(0, FIELD_LIMITS.PHONE),
            status: item.status === 'Mutasi' || item.status === 'Lulus' ? item.status : 'Aktif',
            notes: (item.notes || '').trim().slice(0, FIELD_LIMITS.NOTES),
            createdAt: now,
            updatedAt: now,
          });
        });
        await batch.commit();
        imported += chunk.length;
      }
      return imported;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/students`);
    }
  };

  const saveSchedule = async (data: Omit<Schedule, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('sch');
    const path = `users/${uid}/schedules/${id}`;
    const payload = {
      teacherId: uid,
      dayOfWeek: Math.min(7, Math.max(1, Number(data.dayOfWeek) || 1)),
      startTime: data.startTime.slice(0, 5),
      endTime: data.endTime.slice(0, 5),
      className: data.className.trim().slice(0, FIELD_LIMITS.CLASS_NAME),
      subject: data.subject.trim().slice(0, FIELD_LIMITS.SUBJECT),
      room: (data.room || '').trim().slice(0, FIELD_LIMITS.ROOM),
      topic: (data.topic || '').trim().slice(0, 200),
      semester: data.semester,
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeSchedule = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/schedules/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveAcademicEvent = async (data: Omit<AcademicEvent, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('evt');
    const path = `users/${uid}/academicEvents/${id}`;
    const payload = {
      teacherId: uid,
      title: data.title.trim().slice(0, FIELD_LIMITS.EVENT_TITLE),
      date: data.date.slice(0, 10),
      endDate: (data.endDate || '').slice(0, 10),
      category: data.category,
      description: (data.description || '').trim().slice(0, FIELD_LIMITS.DESCRIPTION),
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeAcademicEvent = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/academicEvents/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveTeachingDoc = async (data: Omit<TeachingDocument, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('doc');
    const path = `users/${uid}/teachingDocs/${id}`;
    const payload = {
      teacherId: uid,
      docType: data.docType,
      title: data.title.trim().slice(0, FIELD_LIMITS.DOC_TITLE),
      phaseOrGrade: data.phaseOrGrade.trim().slice(0, FIELD_LIMITS.PHASE_GRADE),
      semester: data.semester,
      subject: data.subject.trim().slice(0, FIELD_LIMITS.SUBJECT),
      targetOutcome: (data.targetOutcome || '').trim().slice(0, FIELD_LIMITS.TARGET_OUTCOME),
      kktpThreshold: Math.min(100, Math.max(0, Number(data.kktpThreshold ?? 75))),
      durationHours: Math.min(500, Math.max(0, Number(data.durationHours ?? 0))),
      contentSummary: (data.contentSummary || '').trim().slice(0, FIELD_LIMITS.CONTENT_SUMMARY),
      status: data.status,
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeTeachingDoc = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/teachingDocs/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveAttendanceSession = async (data: Omit<AttendanceSession, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('att');
    const path = `users/${uid}/attendance/${id}`;
    const payload = {
      teacherId: uid,
      date: data.date.slice(0, 10),
      className: data.className.trim().slice(0, FIELD_LIMITS.CLASS_NAME),
      subject: data.subject.trim().slice(0, FIELD_LIMITS.SUBJECT),
      semester: data.semester,
      records: data.records,
      notes: (data.notes || '').trim().slice(0, FIELD_LIMITS.NOTES),
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeAttendanceSession = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/attendance/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveJournal = async (data: Omit<TeachingJournal, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('jrn');
    const path = `users/${uid}/journals/${id}`;
    const payload = {
      teacherId: uid,
      date: data.date.slice(0, 10),
      className: data.className.trim().slice(0, FIELD_LIMITS.CLASS_NAME),
      subject: data.subject.trim().slice(0, FIELD_LIMITS.SUBJECT),
      meetingNo: Math.min(200, Math.max(1, Number(data.meetingNo) || 1)),
      topic: data.topic.trim().slice(0, FIELD_LIMITS.TOPIC),
      learningActivity: (data.learningActivity || '').trim().slice(0, FIELD_LIMITS.LEARNING_ACTIVITY),
      studentProgressNote: (data.studentProgressNote || '').trim().slice(0, FIELD_LIMITS.PROGRESS_NOTE),
      reflection: (data.reflection || '').trim().slice(0, FIELD_LIMITS.REFLECTION),
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeJournal = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/journals/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveAssessment = async (data: Omit<Assessment, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('asg');
    const path = `users/${uid}/assessments/${id}`;
    const payload = {
      teacherId: uid,
      title: data.title.trim().slice(0, FIELD_LIMITS.EVENT_TITLE),
      category: data.category,
      className: data.className.trim().slice(0, FIELD_LIMITS.CLASS_NAME),
      subject: data.subject.trim().slice(0, FIELD_LIMITS.SUBJECT),
      semester: data.semester,
      month: data.date.slice(0, 7),
      date: data.date.slice(0, 10),
      maxScore: Math.min(1000, Math.max(1, Number(data.maxScore) || 100)),
      kktp: Math.min(100, Math.max(0, Number(data.kktp) || 75)),
      instrumentNotes: (data.instrumentNotes || '').trim().slice(0, FIELD_LIMITS.INSTRUMENT_NOTES),
      scores: data.scores,
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeAssessment = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/assessments/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveGuidanceNote = async (data: Omit<GuidanceNote, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('gdn');
    const path = `users/${uid}/guidanceNotes/${id}`;
    const payload = {
      teacherId: uid,
      studentId: data.studentId,
      studentName: data.studentName.trim().slice(0, FIELD_LIMITS.DISPLAY_NAME),
      className: data.className.trim().slice(0, FIELD_LIMITS.CLASS_NAME),
      date: data.date.slice(0, 10),
      category: data.category,
      issueSummary: data.issueSummary.trim().slice(0, FIELD_LIMITS.GUIDANCE_SUMMARY),
      followUpPlan: (data.followUpPlan || '').trim().slice(0, FIELD_LIMITS.GUIDANCE_SUMMARY),
      status: data.status,
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeGuidanceNote = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/guidanceNotes/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveDailyTask = async (data: Omit<DailyTask, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!uid) return;
    const id = existingId || makeDocId('tsk');
    const path = `users/${uid}/dailyTasks/${id}`;
    const payload = {
      teacherId: uid,
      title: data.title.trim().slice(0, FIELD_LIMITS.TASK_TITLE),
      dueDate: data.dueDate.slice(0, 10),
      dueTime: (data.dueTime || '').slice(0, 5),
      priority: data.priority,
      category: (data.category || 'Umum').trim().slice(0, FIELD_LIMITS.TASK_CATEGORY),
      completed: Boolean(data.completed),
      updatedAt: serverTimestamp(),
    };
    try {
      if (existingId) {
        const { teacherId: _t, ...updateFields } = payload;
        void _t;
        await updateDoc(doc(db, path), updateFields);
      } else {
        await setDoc(doc(db, path), { ...payload, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const removeDailyTask = async (id: string) => {
    if (!uid) return;
    const path = `users/${uid}/dailyTasks/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return {
    loading,
    isOnline,
    syncState,
    profile,
    students,
    schedules,
    academicEvents,
    teachingDocs,
    attendance,
    journals,
    assessments,
    guidanceNotes,
    dailyTasks,
    actions: {
      updateProfile,
      saveStudent,
      removeStudent,
      importStudentsBatch,
      saveSchedule,
      removeSchedule,
      saveAcademicEvent,
      removeAcademicEvent,
      saveTeachingDoc,
      removeTeachingDoc,
      saveAttendanceSession,
      removeAttendanceSession,
      saveJournal,
      removeJournal,
      saveAssessment,
      removeAssessment,
      saveGuidanceNote,
      removeGuidanceNote,
      saveDailyTask,
      removeDailyTask,
    },
  };
}
