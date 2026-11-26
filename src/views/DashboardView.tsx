import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  AcademicEvent,
  Assessment,
  AttendanceSession,
  DAY_NAMES,
  DailyTask,
  GuidanceNote,
  Schedule,
  Student,
  TaskPriority,
  TeachingJournal,
  UserProfile,
} from '../types';

export type NavTab =
  | 'dashboard'
  | 'schedule'
  | 'docs'
  | 'attendance'
  | 'grades'
  | 'students'
  | 'settings';

interface DashboardViewProps {
  profile: UserProfile | null;
  students: Student[];
  schedules: Schedule[];
  academicEvents: AcademicEvent[];
  attendance: AttendanceSession[];
  journals: TeachingJournal[];
  assessments: Assessment[];
  guidanceNotes: GuidanceNote[];
  dailyTasks: DailyTask[];
  onNavigate: (tab: NavTab) => void;
  onSaveTask: (
    data: Omit<DailyTask, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function DashboardView({
  profile,
  students,
  schedules,
  academicEvents,
  attendance,
  journals,
  assessments,
  guidanceNotes,
  dailyTasks,
  onNavigate,
  onSaveTask,
  onDeleteTask,
}: DashboardViewProps) {
  const [now, setNow] = useState(() => new Date());
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('14:00');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('sedang');
  const [newTaskCategory, setNewTaskCategory] = useState('Administrasi');
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const todayStr = getTodayStr();
  const todayIsoDay = now.getDay() === 0 ? 7 : now.getDay();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const todaySchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.dayOfWeek === todayIsoDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedules, todayIsoDay]
  );

  const nextScheduleInfo = useMemo(() => {
    const upcomingToday = todaySchedules.find((s) => toMinutes(s.endTime) > currentMins);
    if (upcomingToday) {
      const startM = toMinutes(upcomingToday.startTime);
      const isOngoing = currentMins >= startM && currentMins <= toMinutes(upcomingToday.endTime);
      const diffMins = Math.max(0, startM - currentMins);
      return {
        schedule: upcomingToday,
        isToday: true,
        isOngoing,
        diffMins,
      };
    }
    // Find next day in week
    for (let offset = 1; offset <= 7; offset++) {
      const targetDay = ((todayIsoDay - 1 + offset) % 7) + 1;
      const dayList = schedules
        .filter((s) => s.dayOfWeek === targetDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      if (dayList.length > 0) {
        return {
          schedule: dayList[0],
          isToday: false,
          isOngoing: false,
          diffMins: offset * 24 * 60,
        };
      }
    }
    return null;
  }, [todaySchedules, schedules, currentMins, todayIsoDay]);

  const activeHolidayToday = useMemo(
    () =>
      academicEvents.find(
        (ev) =>
          (ev.category === 'libur_nasional' || ev.category === 'libur_sekolah') &&
          ev.date <= todayStr &&
          (ev.endDate ? ev.endDate >= todayStr : ev.date === todayStr)
      ),
    [academicEvents, todayStr]
  );

  // Attendance percentage across semester
  const attendanceStats = useMemo(() => {
    let total = 0;
    let present = 0;
    for (const sess of attendance) {
      for (const status of Object.values(sess.records || {})) {
        total += 1;
        if (status === 'H') present += 1;
      }
    }
    return {
      totalSessions: attendance.length,
      rate: total > 0 ? Math.round((present / total) * 100) : 100,
    };
  }, [attendance]);

  // Remedial count across assessments
  const remedialCount = useMemo(() => {
    let count = 0;
    for (const asg of assessments) {
      for (const entry of Object.values(asg.scores || {})) {
        if (
          entry.score !== null &&
          entry.score < asg.kktp &&
          (entry.remedialScore === null || entry.remedialScore === undefined || entry.remedialScore < asg.kktp)
        ) {
          count += 1;
        }
      }
    }
    return count;
  }, [assessments]);

  const pendingGuidance = useMemo(
    () => guidanceNotes.filter((g) => g.status !== 'selesai').length,
    [guidanceNotes]
  );

  const sortedTasks = useMemo(
    () =>
      [...dailyTasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pOrder = { tinggi: 0, sedang: 1, rendah: 2 };
        return pOrder[a.priority] - pOrder[b.priority];
      }),
    [dailyTasks]
  );

  const completedTasksCount = dailyTasks.filter((t) => t.completed).length;
  const taskProgressPct = dailyTasks.length > 0 ? Math.round((completedTasksCount / dailyTasks.length) * 100) : 0;

  const upcomingEvents = useMemo(
    () =>
      academicEvents
        .filter((e) => (e.endDate || e.date) >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4),
    [academicEvents, todayStr]
  );

  const recentJournals = useMemo(
    () => [...journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    [journals]
  );

  const handleEnableNotification = async () => {
    if (typeof Notification === 'undefined') {
      setReminderToast('Browser ini mendukung pengingat langsung di dalam aplikasi.');
      return;
    }
    const res = await Notification.requestPermission();
    setNotifPerm(res);
    if (res === 'granted' && nextScheduleInfo) {
      new Notification('Pengingat Jadwal Mengajar — KaryaAjar', {
        body: `${nextScheduleInfo.schedule.subject} (${nextScheduleInfo.schedule.className}) pukul ${nextScheduleInfo.schedule.startTime}`,
      });
      setReminderToast('Notifikasi pengingat jadwal telah diaktifkan.');
    } else {
      setReminderToast('Pengingat jadwal aktif di banner dasbor.');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      await onSaveTask({
        title: newTaskTitle.trim(),
        dueDate: todayStr,
        dueTime: newTaskTime,
        priority: newTaskPriority,
        category: newTaskCategory,
        completed: false,
      });
      setNewTaskTitle('');
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTask = async (task: DailyTask) => {
    await onSaveTask(
      {
        title: task.title,
        dueDate: task.dueDate,
        dueTime: task.dueTime || '',
        priority: task.priority,
        category: task.category || 'Umum',
        completed: !task.completed,
      },
      task.id
    );
  };

  const formattedToday = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Greeting & Notification Reminder Banner */}
      <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#5C4946] dark:text-[#C8B9A6]">
              {formattedToday} · {profile?.schoolName || 'Sekolah'} · Semester {profile?.activeSemester || 'Ganjil'} {profile?.academicYear || '2026/2027'}
            </p>
            <h2 className="font-display text-2xl font-bold text-[#241716] dark:text-[#F5EFE1] text-balance">
              Ringkasan Aktivitas Mengajar, {profile?.displayName?.split(' ')[0] || 'Guru'}
            </h2>
            {activeHolidayToday && (
              <p className="text-sm text-[#790D16] dark:text-[#E5D3AF] font-medium">
                Agenda Kalender Akademik Hari Ini: {activeHolidayToday.title}
              </p>
            )}
          </div>

          {/* Upcoming Class Reminder Card */}
          <div className="rounded-xl bg-[#EDE3CE]/60 dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D] p-4 flex flex-col sm:flex-row sm:items-center gap-4 lg:min-w-[400px]">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[#790D16] text-[#F5EFE1] flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#790D16] dark:text-[#E5D3AF]">
                  {nextScheduleInfo
                    ? nextScheduleInfo.isOngoing
                      ? 'Sedang Berlangsung'
                      : nextScheduleInfo.isToday
                      ? `Mulai dalam ${nextScheduleInfo.diffMins} menit`
                      : `Jadwal Mendatang · ${DAY_NAMES[nextScheduleInfo.schedule.dayOfWeek]}`
                    : 'Belum Ada Jadwal Terdaftar'}
                </p>
                {nextScheduleInfo ? (
                  <>
                    <p className="text-sm font-semibold text-[#241716] dark:text-[#F5EFE1] truncate">
                      {nextScheduleInfo.schedule.subject} · {nextScheduleInfo.schedule.className}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#5C4946] dark:text-[#C8B9A6]">
                      {nextScheduleInfo.schedule.startTime}–{nextScheduleInfo.schedule.endTime} · {nextScheduleInfo.schedule.room || 'Ruang Kelas'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                    Tambahkan jadwal mengajar untuk mengaktifkan pengingat otomatis.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEnableNotification}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-xs font-medium text-[#241716] dark:text-[#F5EFE1] hover:border-[#790D16] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {notifPerm === 'granted' ? (
                  <BellRing className="w-3.5 h-3.5 text-[#790D16] dark:text-[#E5D3AF]" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-[#790D16] dark:text-[#E5D3AF]" />
                )}
                {notifPerm === 'granted' ? 'Pengingat Aktif' : 'Aktifkan Notifikasi'}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="px-3 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Presensi
              </button>
            </div>
          </div>
        </div>
        {reminderToast && (
          <p className="mt-3 text-xs text-[#3B6B8C] dark:text-[#AEC4D4]">{reminderToast}</p>
        )}
      </section>

      {/* 4-column KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('schedule')}
          className="text-left p-4 sm:p-5 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] hover:border-[#790D16] dark:hover:border-[#E5D3AF] transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Sesi Mengajar Hari Ini</p>
          <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#241716] dark:text-[#F5EFE1]">
            {todaySchedules.length}
          </p>
          <p className="mt-1 text-xs text-[#790D16] dark:text-[#E5D3AF]">
            {schedules.length} total sesi per minggu
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="text-left p-4 sm:p-5 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] hover:border-[#790D16] dark:hover:border-[#E5D3AF] transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Kehadiran Siswa</p>
          <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#241716] dark:text-[#F5EFE1]">
            {attendanceStats.rate}%
          </p>
          <p className="mt-1 text-xs text-[#3B6B8C] dark:text-[#AEC4D4]">
            {attendanceStats.totalSessions} pertemuan tercatat · {students.length} siswa
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('grades')}
          className="text-left p-4 sm:p-5 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] hover:border-[#790D16] dark:hover:border-[#E5D3AF] transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Perlu Program Remedial</p>
          <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#790D16] dark:text-[#E5D3AF]">
            {remedialCount}
          </p>
          <p className="mt-1 text-xs text-[#5C4946] dark:text-[#C8B9A6]">
            Nilai di bawah KKTP · {assessments.length} instrumen
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('students')}
          className="text-left p-4 sm:p-5 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] hover:border-[#790D16] dark:hover:border-[#E5D3AF] transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Tindak Lanjut Bimbingan</p>
          <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#241716] dark:text-[#F5EFE1]">
            {pendingGuidance}
          </p>
          <p className="mt-1 text-xs text-[#5C4946] dark:text-[#C8B9A6]">
            Kasus aktif dalam pemantauan
          </p>
        </button>
      </section>

      {/* Main Split: Daily Task Planner & Today's Schedule + Academic Calendar */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Rencana Tugas Harian (Real-time progress) */}
        <section className="lg:col-span-7 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#241716] dark:text-[#F5EFE1]">
                Rencana Tugas Harian
              </h3>
              <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                {completedTasksCount} dari {dailyTasks.length} tugas selesai · Progres {taskProgressPct}%
              </p>
            </div>
            <span className="font-mono tabular-nums text-sm font-semibold text-[#790D16] dark:text-[#E5D3AF]">
              {taskProgressPct}%
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-[#EDE3CE] dark:bg-[#2A2020] overflow-hidden">
            <div
              className="h-full bg-[#790D16] dark:bg-[#AEC4D4] transition-all duration-300"
              style={{ width: `${taskProgressPct}%` }}
            />
          </div>

          <form onSubmit={handleAddTask} className="grid sm:grid-cols-12 gap-2.5">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Tambah rencana tugas hari ini (mis. Koreksi kuis X RPL 1)..."
              className="sm:col-span-6 px-3.5 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm text-[#241716] dark:text-[#F5EFE1] placeholder:text-[#5C4946]/60 dark:placeholder:text-[#C8B9A6]/50 focus:outline-none focus:border-[#790D16]"
            />
            <input
              type="time"
              value={newTaskTime}
              onChange={(e) => setNewTaskTime(e.target.value)}
              className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-xs font-mono text-[#241716] dark:text-[#F5EFE1]"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-xs text-[#241716] dark:text-[#F5EFE1]"
            >
              <option value="tinggi">Prioritas Tinggi</option>
              <option value="sedang">Prioritas Sedang</option>
              <option value="rendah">Prioritas Rendah</option>
            </select>
            <button
              type="submit"
              disabled={savingTask || !newTaskTitle.trim()}
              className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </button>
          </form>

          <div className="divide-y divide-[#E5D3AF]/60 dark:divide-[#3D2E2D]">
            {sortedTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Belum ada rencana tugas harian. Tambahkan tugas pertama Anda di atas.
              </div>
            ) : (
              sortedTasks.map((task) => (
                <div
                  key={task.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task)}
                    className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#3B6B8C] dark:text-[#AEC4D4] shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#790D16] dark:text-[#E5D3AF] shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          task.completed
                            ? 'line-through text-[#5C4946]/70 dark:text-[#C8B9A6]/50'
                            : 'text-[#241716] dark:text-[#F5EFE1]'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                        {task.category || 'Umum'} · Prioritas {task.priority}
                        {task.dueTime ? ` · Pukul ${task.dueTime}` : ''}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    aria-label="Hapus tugas"
                    className="p-2 rounded-lg text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] dark:hover:text-[#E5D3AF] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Today's Schedule & Upcoming Academic Calendar */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-[#241716] dark:text-[#F5EFE1]">
                Jadwal Mengajar Hari Ini
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('schedule')}
                className="text-xs font-medium text-[#790D16] dark:text-[#E5D3AF] hover:underline whitespace-nowrap cursor-pointer"
              >
                Kelola Jadwal
              </button>
            </div>
            {todaySchedules.length === 0 ? (
              <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Tidak ada jam mengajar terjadwal hari ini ({DAY_NAMES[todayIsoDay]}).
              </p>
            ) : (
              <div className="divide-y divide-[#E5D3AF]/60 dark:divide-[#3D2E2D]">
                {todaySchedules.map((sch) => (
                  <div key={sch.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#241716] dark:text-[#F5EFE1] truncate">
                        {sch.subject} — {sch.className}
                      </p>
                      <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6] truncate">
                        {sch.topic || 'Materi sesuai ATP'} · {sch.room || 'Kelas'}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-medium text-[#790D16] dark:text-[#AEC4D4] shrink-0">
                      {sch.startTime}–{sch.endTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-[#241716] dark:text-[#F5EFE1]">
                Kalender Akademik Terdekat
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('schedule')}
                className="text-xs font-medium text-[#790D16] dark:text-[#E5D3AF] hover:underline whitespace-nowrap cursor-pointer"
              >
                Buka Kalender
              </button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Belum ada agenda kalender akademik mendatang.
              </p>
            ) : (
              <div className="divide-y divide-[#E5D3AF]/60 dark:divide-[#3D2E2D]">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#241716] dark:text-[#F5EFE1] truncate">
                        {ev.title}
                      </p>
                      <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                        {ev.category.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-xs text-[#5C4946] dark:text-[#C8B9A6] shrink-0">
                      {ev.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Recent Journals Strip */}
      <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#790D16] dark:text-[#E5D3AF]" />
            <h3 className="font-display text-lg font-semibold text-[#241716] dark:text-[#F5EFE1]">
              Jurnal & Catatan Perkembangan Siswa Terbaru
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="text-xs font-medium text-[#790D16] dark:text-[#E5D3AF] hover:underline whitespace-nowrap cursor-pointer"
          >
            Tulis Jurnal
          </button>
        </div>
        {recentJournals.length === 0 ? (
          <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
            Belum ada jurnal mengajar tercatat.
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {recentJournals.map((j) => (
              <div
                key={j.id}
                className="p-4 rounded-xl bg-[#F5EFE1]/50 dark:bg-[#2A2020] border border-[#E5D3AF]/70 dark:border-[#3D2E2D] space-y-1.5"
              >
                <p className="text-xs font-mono tabular-nums text-[#790D16] dark:text-[#AEC4D4]">
                  {j.date} · {j.className} · Pertemuan {j.meetingNo}
                </p>
                <p className="text-sm font-semibold text-[#241716] dark:text-[#F5EFE1] line-clamp-1">
                  {j.topic}
                </p>
                <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6] line-clamp-2">
                  {j.studentProgressNote || j.learningActivity || 'Tidak ada catatan khusus.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
