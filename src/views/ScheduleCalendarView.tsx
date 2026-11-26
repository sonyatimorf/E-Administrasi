import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit3, Plus, Trash2 } from 'lucide-react';
import { ExportMenu } from '../components/ExportMenu';
import {
  AcademicEvent,
  AcademicEventCategory,
  DAY_NAMES,
  Schedule,
  SemesterType,
  UserProfile,
} from '../types';

interface ScheduleCalendarViewProps {
  profile: UserProfile | null;
  schedules: Schedule[];
  academicEvents: AcademicEvent[];
  onSaveSchedule: (
    data: Omit<Schedule, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onSaveEvent: (
    data: Omit<AcademicEvent, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<AcademicEventCategory, string> = {
  libur_nasional: 'Libur Nasional',
  libur_sekolah: 'Libur Sekolah',
  ujian: 'Ujian / Asesmen',
  kegiatan_sekolah: 'Kegiatan Sekolah',
  efektif: 'Hari Efektif Khusus',
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function ScheduleCalendarView({
  profile,
  schedules,
  academicEvents,
  onSaveSchedule,
  onDeleteSchedule,
  onSaveEvent,
  onDeleteEvent,
}: ScheduleCalendarViewProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar'>('schedule');

  // Schedule Form State
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState('07:15');
  const [endTime, setEndTime] = useState('09:30');
  const [className, setClassName] = useState('X RPL 1');
  const [subject, setSubject] = useState(profile?.subject || 'Informatika');
  const [room, setRoom] = useState('Lab Komputer 1');
  const [topic, setTopic] = useState('');
  const [semester, setSemester] = useState<SemesterType>(profile?.activeSemester || 'Ganjil');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Calendar State
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );

  // Event Form State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(selectedDate);
  const [evEndDate, setEvEndDate] = useState('');
  const [evCategory, setEvCategory] = useState<AcademicEventCategory>('kegiatan_sekolah');
  const [evDescription, setEvDescription] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort((a, b) =>
        a.dayOfWeek !== b.dayOfWeek
          ? a.dayOfWeek - b.dayOfWeek
          : a.startTime.localeCompare(b.startTime)
      ),
    [schedules]
  );

  const handleEditSchedule = (sch: Schedule) => {
    setEditingScheduleId(sch.id);
    setDayOfWeek(sch.dayOfWeek);
    setStartTime(sch.startTime);
    setEndTime(sch.endTime);
    setClassName(sch.className);
    setSubject(sch.subject);
    setRoom(sch.room || '');
    setTopic(sch.topic || '');
    setSemester(sch.semester);
    setShowScheduleForm(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSchedule(
      { dayOfWeek, startTime, endTime, className, subject, room, topic, semester },
      editingScheduleId || undefined
    );
    setEditingScheduleId(null);
    setTopic('');
    setShowScheduleForm(false);
  };

  const handleEditEvent = (ev: AcademicEvent) => {
    setEditingEventId(ev.id);
    setEvTitle(ev.title);
    setEvDate(ev.date);
    setEvEndDate(ev.endDate || '');
    setEvCategory(ev.category);
    setEvDescription(ev.description || '');
    setShowEventForm(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveEvent(
      {
        title: evTitle,
        date: evDate,
        endDate: evEndDate,
        category: evCategory,
        description: evDescription,
      },
      editingEventId || undefined
    );
    setEditingEventId(null);
    setEvTitle('');
    setEvDescription('');
    setEvEndDate('');
    setShowEventForm(false);
  };

  // Build Monthly Calendar Cells
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const cells: { dateStr: string | null; dayNum: number | null; isoDay: number }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateStr: null, dayNum: null, isoDay: 0 });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const jsDay = new Date(calYear, calMonth, d).getDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;
      cells.push({ dateStr, dayNum: d, isoDay });
    }
    return cells;
  }, [calYear, calMonth]);

  const eventsOnDate = (dateStr: string) =>
    academicEvents.filter((e) => e.date <= dateStr && (e.endDate ? e.endDate >= dateStr : e.date === dateStr));

  const selectedIsoDay = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const js = new Date(y, (m || 1) - 1, d || 1).getDay();
    return js === 0 ? 7 : js;
  }, [selectedDate]);

  const selectedDateEvents = useMemo(() => eventsOnDate(selectedDate), [academicEvents, selectedDate]);
  const selectedDateSchedules = useMemo(
    () => sortedSchedules.filter((s) => s.dayOfWeek === selectedIsoDay),
    [sortedSchedules, selectedIsoDay]
  );

  const exportScheduleRows = sortedSchedules.map((s) => ({
    hari: DAY_NAMES[s.dayOfWeek] || '-',
    jam: `${s.startTime} - ${s.endTime}`,
    kelas: s.className,
    mapel: s.subject,
    ruang: s.room || '-',
    materi: s.topic || '-',
  }));

  const exportEventRows = [...academicEvents]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      tanggal: e.endDate ? `${e.date} s.d. ${e.endDate}` : e.date,
      agenda: e.title,
      kategori: CATEGORY_LABELS[e.category],
      keterangan: e.description || '-',
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-xl bg-[#EDE3CE] dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D] self-start">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#790D16] text-[#F5EFE1]'
                : 'text-[#5C4946] dark:text-[#C8B9A6] hover:text-[#241716] dark:hover:text-[#F5EFE1]'
            }`}
          >
            Jadwal Mengajar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#790D16] text-[#F5EFE1]'
                : 'text-[#5C4946] dark:text-[#C8B9A6] hover:text-[#241716] dark:hover:text-[#F5EFE1]'
            }`}
          >
            Kalender Akademik & Libur
          </button>
        </div>

        {activeTab === 'schedule' ? (
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              meta={{
                title: 'Jadwal Mengajar Guru',
                subtitle: profile?.subject || 'Semua Mata Pelajaran',
                teacherName: profile?.displayName,
                schoolName: profile?.schoolName,
                academicYear: profile?.academicYear,
                semester: profile?.activeSemester,
                filename: 'jadwal-mengajar',
              }}
              columns={[
                { header: 'Hari', key: 'hari' },
                { header: 'Jam', key: 'jam' },
                { header: 'Kelas', key: 'kelas' },
                { header: 'Mata Pelajaran', key: 'mapel' },
                { header: 'Ruang', key: 'ruang' },
                { header: 'Topik', key: 'materi' },
              ]}
              rows={exportScheduleRows}
            />
            <button
              type="button"
              onClick={() => {
                setEditingScheduleId(null);
                setShowScheduleForm((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer no-print"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Jadwal
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              meta={{
                title: 'Kalender Pendidikan & Akademik',
                subtitle: 'Jadwal Sekolah, Ujian, dan Hari Libur',
                teacherName: profile?.displayName,
                schoolName: profile?.schoolName,
                academicYear: profile?.academicYear,
                semester: profile?.activeSemester,
                filename: 'kalender-akademik',
              }}
              columns={[
                { header: 'Tanggal', key: 'tanggal' },
                { header: 'Agenda / Libur', key: 'agenda' },
                { header: 'Kategori', key: 'kategori' },
                { header: 'Keterangan', key: 'keterangan' },
              ]}
              rows={exportEventRows}
            />
            <button
              type="button"
              onClick={() => {
                setEditingEventId(null);
                setEvDate(selectedDate);
                setShowEventForm((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer no-print"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Agenda
            </button>
          </div>
        )}
      </div>

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {showScheduleForm && (
            <form
              onSubmit={handleScheduleSubmit}
              className="p-5 sm:p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1">Hari</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  {[1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Jam Mulai</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Jam Selesai</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kelas</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Mis. X RPL 1"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Ruangan / Lab</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as SemesterType)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Topik / Catatan</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Opsional"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="px-4 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#790D16] text-[#F5EFE1] text-xs font-medium hover:bg-[#610A11] cursor-pointer"
                >
                  {editingScheduleId ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          )}

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((dayNum) => {
              const items = sortedSchedules.filter((s) => s.dayOfWeek === dayNum);
              return (
                <section
                  key={dayNum}
                  className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#E5D3AF]/70 dark:border-[#3D2E2D] pb-2.5">
                    <h3 className="font-display text-base font-bold text-[#790D16] dark:text-[#E5D3AF]">
                      {DAY_NAMES[dayNum]}
                    </h3>
                    <span className="text-xs font-mono tabular-nums text-[#5C4946] dark:text-[#C8B9A6]">
                      {items.length} sesi
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6] py-3">
                      Tidak ada jadwal mengajar.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#E5D3AF]/50 dark:divide-[#3D2E2D]">
                      {items.map((sch) => (
                        <div key={sch.id} className="py-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono tabular-nums text-xs font-semibold text-[#3B6B8C] dark:text-[#AEC4D4]">
                              {sch.startTime}–{sch.endTime}
                            </span>
                            <div className="flex items-center gap-1 no-print">
                              <button
                                type="button"
                                onClick={() => handleEditSchedule(sch)}
                                aria-label="Edit jadwal"
                                className="p-1.5 rounded text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSchedule(sch.id)}
                                aria-label="Hapus jadwal"
                                className="p-1.5 rounded text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-[#241716] dark:text-[#F5EFE1]">
                            {sch.subject} · {sch.className}
                          </p>
                          <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                            {sch.room || 'Ruang Kelas'} {sch.topic ? `· ${sch.topic}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {showEventForm && (
            <form
              onSubmit={handleEventSubmit}
              className="p-5 sm:p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Nama Agenda / Hari Libur</label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="Mis. Penilaian Akhir Semester / Libur Nasional"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tanggal Selesai (Opsional)</label>
                <input
                  type="date"
                  value={evEndDate}
                  onChange={(e) => setEvEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kategori</label>
                <select
                  value={evCategory}
                  onChange={(e) => setEvCategory(e.target.value as AcademicEventCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium mb-1">Keterangan</label>
                <input
                  type="text"
                  value={evDescription}
                  onChange={(e) => setEvDescription(e.target.value)}
                  placeholder="Rincian kegiatan atau instruksi administrasi"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="px-4 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#790D16] text-[#F5EFE1] text-xs font-medium hover:bg-[#610A11] cursor-pointer"
                >
                  {editingEventId ? 'Simpan Perubahan' : 'Simpan Agenda'}
                </button>
              </div>
            </form>
          )}

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Monthly Calendar Grid */}
            <section className="lg:col-span-8 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#241716] dark:text-[#F5EFE1]">
                  {MONTH_NAMES[calMonth]} {calYear}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (calMonth === 0) {
                        setCalMonth(11);
                        setCalYear((y) => y - 1);
                      } else {
                        setCalMonth((m) => m - 1);
                      }
                    }}
                    className="p-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] hover:border-[#790D16] cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (calMonth === 11) {
                        setCalMonth(0);
                        setCalYear((y) => y + 1);
                      } else {
                        setCalMonth((m) => m + 1);
                      }
                    }}
                    className="p-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] hover:border-[#790D16] cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-[#5C4946] dark:text-[#C8B9A6] pb-1">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((cell, idx) => {
                  if (!cell.dateStr || !cell.dayNum) {
                    return <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-lg bg-[#F5EFE1]/30 dark:bg-[#161010]/30" />;
                  }
                  const dayEvents = eventsOnDate(cell.dateStr);
                  const isHoliday = dayEvents.some(
                    (e) => e.category === 'libur_nasional' || e.category === 'libur_sekolah'
                  );
                  const hasSchedule = schedules.some((s) => s.dayOfWeek === cell.isoDay) && !isHoliday && cell.isoDay !== 7;
                  const isSelected = cell.dateStr === selectedDate;

                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateStr!)}
                      className={`h-16 sm:h-20 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#790D16] dark:border-[#E5D3AF] bg-[#790D16]/10 dark:bg-[#790D16]/25'
                          : isHoliday
                          ? 'border-[#790D16]/40 bg-[#790D16]/5 dark:bg-[#790D16]/15'
                          : 'border-[#E5D3AF]/70 dark:border-[#3D2E2D] bg-[#F5EFE1]/50 dark:bg-[#2A2020]/50 hover:border-[#790D16]/60'
                      }`}
                    >
                      <span
                        className={`font-mono tabular-nums text-xs font-semibold ${
                          isHoliday || cell.isoDay === 7
                            ? 'text-[#790D16] dark:text-[#E5D3AF]'
                            : 'text-[#241716] dark:text-[#F5EFE1]'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 1).map((ev) => (
                          <p
                            key={ev.id}
                            className={`text-[10px] leading-tight truncate font-medium ${
                              ev.category === 'libur_nasional' || ev.category === 'libur_sekolah'
                                ? 'text-[#790D16] dark:text-[#E5D3AF]'
                                : 'text-[#3B6B8C] dark:text-[#AEC4D4]'
                            }`}
                          >
                            {ev.title}
                          </p>
                        ))}
                        {hasSchedule && dayEvents.length === 0 && (
                          <p className="text-[10px] leading-tight truncate text-[#5C4946] dark:text-[#C8B9A6]">
                            Mengajar
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                <span>Keterangan: Libur (Aksen Burgundy)</span>
                <span>·</span>
                <span>Ujian & Kegiatan (Biru Slate)</span>
                <span>·</span>
                <span>Klik tanggal untuk detail agenda & jadwal</span>
              </div>
            </section>

            {/* Selected Date Details */}
            <section className="lg:col-span-4 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-[#E5D3AF]/70 dark:border-[#3D2E2D] pb-3">
                <CalendarIcon className="w-4 h-4 text-[#790D16] dark:text-[#E5D3AF]" />
                <div>
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Detail Tanggal</p>
                  <p className="font-mono tabular-nums text-sm font-bold text-[#241716] dark:text-[#F5EFE1]">
                    {selectedDate} ({DAY_NAMES[selectedIsoDay]})
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-[#790D16] dark:text-[#E5D3AF]">
                  Agenda Kalender Akademik
                </h4>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                    Hari efektif belajar biasa (tidak ada libur atau agenda khusus).
                  </p>
                ) : (
                  selectedDateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-[#F5EFE1]/60 dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D] space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#241716] dark:text-[#F5EFE1]">
                          {ev.title}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditEvent(ev)}
                            className="p-1 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEvent(ev.id)}
                            className="p-1 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#790D16] dark:text-[#AEC4D4]">
                        {CATEGORY_LABELS[ev.category]}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">{ev.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2.5 pt-2 border-t border-[#E5D3AF]/70 dark:border-[#3D2E2D]">
                <h4 className="text-xs font-semibold text-[#241716] dark:text-[#F5EFE1]">
                  Jadwal Mengajar Tersinkron
                </h4>
                {selectedDateEvents.some(
                  (e) => e.category === 'libur_nasional' || e.category === 'libur_sekolah'
                ) ? (
                  <p className="text-xs text-[#790D16] dark:text-[#E5D3AF]">
                    KBM diliburkan sesuai kalender akademik.
                  </p>
                ) : selectedDateSchedules.length === 0 ? (
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                    Tidak ada jam mengajar pada hari {DAY_NAMES[selectedIsoDay]}.
                  </p>
                ) : (
                  selectedDateSchedules.map((sch) => (
                    <div
                      key={sch.id}
                      className="p-2.5 rounded-lg bg-[#AEC4D4]/20 dark:bg-[#2A2020] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#241716] dark:text-[#F5EFE1] truncate">
                          {sch.subject} · {sch.className}
                        </p>
                        <p className="text-[11px] text-[#5C4946] dark:text-[#C8B9A6] truncate">
                          {sch.room || 'Ruang Kelas'}
                        </p>
                      </div>
                      <span className="font-mono tabular-nums text-xs text-[#790D16] dark:text-[#AEC4D4] shrink-0">
                        {sch.startTime}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
