import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { useTeacherData } from './hooks/useTeacherData';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthView } from './components/AuthView';
import { AppShell } from './components/AppShell';
import { DashboardView, NavTab } from './views/DashboardView';
import { ScheduleCalendarView } from './views/ScheduleCalendarView';
import { TeachingDocsView } from './views/TeachingDocsView';
import { AttendanceJournalView } from './views/AttendanceJournalView';
import { GradesEvaluationView } from './views/GradesEvaluationView';
import { StudentsGuidanceView } from './views/StudentsGuidanceView';
import { SettingsProfileView } from './views/SettingsProfileView';

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('karyaajar_theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('karyaajar_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('karyaajar_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const {
    loading,
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
    actions,
  } = useTeacherData(user);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5EFE1] dark:bg-[#161010] text-sm text-[#5C4946] dark:text-[#C8B9A6]">
        Memuat sesi ruang kerja guru...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthView
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      profile={profile}
      syncState={syncState}
      darkMode={darkMode}
      onToggleDark={() => setDarkMode((d) => !d)}
    >
      {loading && !profile ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardView
              profile={profile}
              students={students}
              schedules={schedules}
              academicEvents={academicEvents}
              attendance={attendance}
              journals={journals}
              assessments={assessments}
              guidanceNotes={guidanceNotes}
              dailyTasks={dailyTasks}
              onNavigate={setActiveTab}
              onSaveTask={actions.saveDailyTask}
              onDeleteTask={actions.removeDailyTask}
            />
          )}
          {activeTab === 'schedule' && (
            <ScheduleCalendarView
              profile={profile}
              schedules={schedules}
              academicEvents={academicEvents}
              onSaveSchedule={actions.saveSchedule}
              onDeleteSchedule={actions.removeSchedule}
              onSaveEvent={actions.saveAcademicEvent}
              onDeleteEvent={actions.removeAcademicEvent}
            />
          )}
          {activeTab === 'docs' && (
            <TeachingDocsView
              profile={profile}
              teachingDocs={teachingDocs}
              onSaveDoc={actions.saveTeachingDoc}
              onDeleteDoc={actions.removeTeachingDoc}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceJournalView
              profile={profile}
              students={students}
              attendance={attendance}
              journals={journals}
              onSaveAttendance={actions.saveAttendanceSession}
              onDeleteAttendance={actions.removeAttendanceSession}
              onSaveJournal={actions.saveJournal}
              onDeleteJournal={actions.removeJournal}
            />
          )}
          {activeTab === 'grades' && (
            <GradesEvaluationView
              profile={profile}
              students={students}
              assessments={assessments}
              onSaveAssessment={actions.saveAssessment}
              onDeleteAssessment={actions.removeAssessment}
            />
          )}
          {activeTab === 'students' && (
            <StudentsGuidanceView
              profile={profile}
              students={students}
              guidanceNotes={guidanceNotes}
              onSaveStudent={actions.saveStudent}
              onDeleteStudent={actions.removeStudent}
              onImportStudents={actions.importStudentsBatch}
              onSaveGuidance={actions.saveGuidanceNote}
              onDeleteGuidance={actions.removeGuidanceNote}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsProfileView
              profile={profile}
              syncState={syncState}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
              onUpdateProfile={actions.updateProfile}
            />
          )}
        </>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
