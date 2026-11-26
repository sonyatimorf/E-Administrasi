import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, Plus, Save, Trash2 } from 'lucide-react';
import { ExportMenu } from '../components/ExportMenu';
import {
  AttendanceSession,
  AttendanceStatus,
  SemesterType,
  Student,
  TeachingJournal,
  UserProfile,
} from '../types';

interface AttendanceJournalViewProps {
  profile: UserProfile | null;
  students: Student[];
  attendance: AttendanceSession[];
  journals: TeachingJournal[];
  onSaveAttendance: (
    data: Omit<AttendanceSession, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteAttendance: (id: string) => Promise<void>;
  onSaveJournal: (
    data: Omit<TeachingJournal, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteJournal: (id: string) => Promise<void>;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AttendanceJournalView({
  profile,
  students,
  attendance,
  journals,
  onSaveAttendance,
  onDeleteAttendance,
  onSaveJournal,
  onDeleteJournal,
}: AttendanceJournalViewProps) {
  const [activeTab, setActiveTab] = useState<'realtime' | 'recap' | 'journal'>('realtime');

  const classList = useMemo(() => {
    const set = new Set(students.map((s) => s.className));
    if (set.size === 0) set.add('X RPL 1');
    return Array.from(set).sort();
  }, [students]);

  // Real-time Attendance State
  const [attDate, setAttDate] = useState(getTodayStr());
  const [attClass, setAttClass] = useState(classList[0] || 'X RPL 1');
  const [attSubject, setAttSubject] = useState(profile?.subject || 'Informatika');
  const [attSemester, setAttSemester] = useState<SemesterType>(profile?.activeSemester || 'Ganjil');
  const [attNotes, setAttNotes] = useState('');
  const [draftRecords, setDraftRecords] = useState<Record<string, AttendanceStatus>>({});
  const [editingAttId, setEditingAttId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Recap filter
  const [recapClass, setRecapClass] = useState(classList[0] || 'X RPL 1');
  const [recapSemester, setRecapSemester] = useState<SemesterType>(profile?.activeSemester || 'Ganjil');

  // Journal State
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [jDate, setJDate] = useState(getTodayStr());
  const [jClass, setJClass] = useState(classList[0] || 'X RPL 1');
  const [jSubject, setJSubject] = useState(profile?.subject || 'Informatika');
  const [jMeetingNo, setJMeetingNo] = useState(1);
  const [jTopic, setJTopic] = useState('');
  const [jActivity, setJActivity] = useState('');
  const [jProgress, setJProgress] = useState('');
  const [jReflection, setJReflection] = useState('');

  const classStudents = useMemo(
    () =>
      students
        .filter((s) => s.className === attClass && s.status === 'Aktif')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, attClass]
  );

  // Load existing session if matching date + class
  useEffect(() => {
    const existing = attendance.find(
      (a) => a.date === attDate && a.className === attClass
    );
    if (existing) {
      setEditingAttId(existing.id);
      setAttSubject(existing.subject);
      setAttSemester(existing.semester);
      setAttNotes(existing.notes || '');
      setDraftRecords(existing.records || {});
    } else {
      setEditingAttId(null);
      const init: Record<string, AttendanceStatus> = {};
      classStudents.forEach((s) => {
        init[s.id] = 'H';
      });
      setDraftRecords(init);
      setAttNotes('');
    }
  }, [attDate, attClass, attendance, classStudents]);

  const handleMarkAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      next[s.id] = 'H';
    });
    setDraftRecords(next);
  };

  const handleSaveAttendance = async () => {
    await onSaveAttendance(
      {
        date: attDate,
        className: attClass,
        subject: attSubject,
        semester: attSemester,
        records: draftRecords,
        notes: attNotes,
      },
      editingAttId || undefined
    );
    setSaveFeedback('Presensi tersimpan dan disinkronkan.');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // Semester Recap Calculation
  const recapRows = useMemo(() => {
    const targetStudents = students
      .filter((s) => s.className === recapClass)
      .sort((a, b) => a.name.localeCompare(b.name));
    const sessions = attendance.filter(
      (a) => a.className === recapClass && a.semester === recapSemester
    );

    return targetStudents.map((stu, index) => {
      let H = 0;
      let S = 0;
      let I = 0;
      let A = 0;
      sessions.forEach((sess) => {
        const st = sess.records?.[stu.id];
        if (st === 'H') H += 1;
        else if (st === 'S') S += 1;
        else if (st === 'I') I += 1;
        else if (st === 'A') A += 1;
      });
      const total = H + S + I + A;
      const pct = total > 0 ? Math.round((H / total) * 100) : 100;
      return {
        no: index + 1,
        nis: stu.nis,
        nama: stu.name,
        hadir: H,
        sakit: S,
        izin: I,
        alpha: A,
        total,
        persentase: `${pct}%`,
      };
    });
  }, [students, attendance, recapClass, recapSemester]);

  const sortedJournals = useMemo(
    () => [...journals].sort((a, b) => b.date.localeCompare(a.date)),
    [journals]
  );

  const handleEditJournal = (j: TeachingJournal) => {
    setEditingJournalId(j.id);
    setJDate(j.date);
    setJClass(j.className);
    setJSubject(j.subject);
    setJMeetingNo(j.meetingNo);
    setJTopic(j.topic);
    setJActivity(j.learningActivity || '');
    setJProgress(j.studentProgressNote || '');
    setJReflection(j.reflection || '');
    setShowJournalForm(true);
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveJournal(
      {
        date: jDate,
        className: jClass,
        subject: jSubject,
        meetingNo: jMeetingNo,
        topic: jTopic,
        learningActivity: jActivity,
        studentProgressNote: jProgress,
        reflection: jReflection,
      },
      editingJournalId || undefined
    );
    setEditingJournalId(null);
    setJTopic('');
    setJActivity('');
    setJProgress('');
    setJReflection('');
    setShowJournalForm(false);
  };

  const journalExportRows = sortedJournals.map((j) => ({
    tanggal: j.date,
    pertemuan: j.meetingNo,
    kelas: j.className,
    mapel: j.subject,
    topik: j.topic,
    perkembangan: j.studentProgressNote || '-',
    refleksi: j.reflection || '-',
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-xl bg-[#EDE3CE] dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D] self-start overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('realtime')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'realtime'
                ? 'bg-[#790D16] text-[#F5EFE1]'
                : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Presensi Harian
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recap')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'recap'
                ? 'bg-[#790D16] text-[#F5EFE1]'
                : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Rekapitulasi Semester
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('journal')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-[#790D16] text-[#F5EFE1]'
                : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Jurnal Mengajar
          </button>
        </div>

        {activeTab === 'recap' && (
          <ExportMenu
            meta={{
              title: `Rekapitulasi Presensi Semester ${recapSemester}`,
              subtitle: `Kelas ${recapClass}`,
              teacherName: profile?.displayName,
              schoolName: profile?.schoolName,
              academicYear: profile?.academicYear,
              semester: recapSemester,
              filename: `rekap-presensi-${recapClass.replace(/\s+/g, '-')}`,
            }}
            columns={[
              { header: 'No', key: 'no' },
              { header: 'NIS', key: 'nis' },
              { header: 'Nama Siswa', key: 'nama' },
              { header: 'Hadir', key: 'hadir' },
              { header: 'Sakit', key: 'sakit' },
              { header: 'Izin', key: 'izin' },
              { header: 'Alpha', key: 'alpha' },
              { header: 'Kehadiran', key: 'persentase' },
            ]}
            rows={recapRows}
          />
        )}

        {activeTab === 'journal' && (
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              meta={{
                title: 'Jurnal Agenda Mengajar & Perkembangan Siswa',
                subtitle: profile?.subject || 'Semua Mata Pelajaran',
                teacherName: profile?.displayName,
                schoolName: profile?.schoolName,
                academicYear: profile?.academicYear,
                semester: profile?.activeSemester,
                filename: 'jurnal-mengajar',
              }}
              columns={[
                { header: 'Tanggal', key: 'tanggal' },
                { header: 'Pert.', key: 'pertemuan' },
                { header: 'Kelas', key: 'kelas' },
                { header: 'Mapel', key: 'mapel' },
                { header: 'Topik Pembelajaran', key: 'topik' },
                { header: 'Catatan Perkembangan Siswa', key: 'perkembangan' },
              ]}
              rows={journalExportRows}
            />
            <button
              type="button"
              onClick={() => {
                setEditingJournalId(null);
                setShowJournalForm((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer no-print"
            >
              <Plus className="w-3.5 h-3.5" />
              Catat Jurnal
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: REALTIME ATTENDANCE */}
      {activeTab === 'realtime' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <section className="lg:col-span-8 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-5">
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tanggal</label>
                <input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kelas</label>
                <select
                  value={attClass}
                  onChange={(e) => setAttClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={attSubject}
                  onChange={(e) => setAttSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Semester</label>
                <select
                  value={attSemester}
                  onChange={(e) => setAttSemester(e.target.value as SemesterType)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                {classStudents.length} siswa aktif di kelas {attClass}
              </p>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium hover:border-[#790D16] cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-[#3B6B8C] dark:text-[#AEC4D4]" />
                Tandai Semua Hadir
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5D3AF] dark:border-[#3D2E2D] text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                    <th className="py-2.5 pr-3">NIS</th>
                    <th className="py-2.5 pr-3">Nama Siswa</th>
                    <th className="py-2.5 text-right">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D3AF]/50 dark:divide-[#3D2E2D]">
                  {classStudents.map((stu) => {
                    const current = draftRecords[stu.id] || 'H';
                    return (
                      <tr key={stu.id} className="text-sm">
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                          {stu.nis}
                        </td>
                        <td className="py-2.5 pr-3 font-medium text-[#241716] dark:text-[#F5EFE1]">
                          {stu.name}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="inline-flex gap-1">
                            {(['H', 'S', 'I', 'A'] as AttendanceStatus[]).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setDraftRecords((prev) => ({ ...prev, [stu.id]: st }))
                                }
                                className={`w-9 h-8 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                                  current === st
                                    ? st === 'H'
                                      ? 'bg-[#3B6B8C] text-white'
                                      : st === 'A'
                                      ? 'bg-[#790D16] text-[#F5EFE1]'
                                      : 'bg-[#E5D3AF] text-[#241716]'
                                    : 'bg-[#F5EFE1]/70 dark:bg-[#2A2020] text-[#5C4946] dark:text-[#C8B9A6] hover:bg-[#EDE3CE]'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 pt-2">
              <input
                type="text"
                value={attNotes}
                onChange={(e) => setAttNotes(e.target.value)}
                placeholder="Catatan sesi presensi (mis. siswa izin lomba atau sakit)..."
                className="w-full px-3.5 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                {saveFeedback ? (
                  <span className="text-xs font-medium text-[#3B6B8C] dark:text-[#AEC4D4]">
                    {saveFeedback}
                  </span>
                ) : (
                  <span className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                    H: Hadir · S: Sakit · I: Izin · A: Alpha
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={classStudents.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Presensi
                </button>
              </div>
            </div>
          </section>

          {/* Recent Attendance Log */}
          <section className="lg:col-span-4 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-[#241716] dark:text-[#F5EFE1]">
              Riwayat Presensi Tersimpan
            </h3>
            <div className="divide-y divide-[#E5D3AF]/60 dark:divide-[#3D2E2D]">
              {attendance.length === 0 ? (
                <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                  Belum ada riwayat presensi.
                </p>
              ) : (
                [...attendance]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((sess) => {
                    const vals = Object.values(sess.records || {});
                    const hadirCount = vals.filter((v) => v === 'H').length;
                    return (
                      <div key={sess.id} className="py-3 flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAttDate(sess.date);
                            setAttClass(sess.className);
                          }}
                          className="text-left flex-1 min-w-0 cursor-pointer"
                        >
                          <p className="text-sm font-semibold text-[#241716] dark:text-[#F5EFE1]">
                            {sess.className} · {sess.subject}
                          </p>
                          <p className="text-xs font-mono tabular-nums text-[#5C4946] dark:text-[#C8B9A6]">
                            {sess.date} · Hadir {hadirCount}/{vals.length}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAttendance(sess.id)}
                          aria-label="Hapus sesi presensi"
                          className="p-1.5 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: SEMESTER RECAP */}
      {activeTab === 'recap' && (
        <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Kelas</label>
              <select
                value={recapClass}
                onChange={(e) => setRecapClass(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Semester</label>
              <select
                value={recapSemester}
                onChange={(e) => setRecapSemester(e.target.value as SemesterType)}
                className="px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5D3AF] dark:border-[#3D2E2D] text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                  <th className="py-2.5 pr-3">No</th>
                  <th className="py-2.5 pr-3">NIS</th>
                  <th className="py-2.5 pr-3">Nama Siswa</th>
                  <th className="py-2.5 px-3 text-right">Hadir</th>
                  <th className="py-2.5 px-3 text-right">Sakit</th>
                  <th className="py-2.5 px-3 text-right">Izin</th>
                  <th className="py-2.5 px-3 text-right">Alpha</th>
                  <th className="py-2.5 pl-3 text-right">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D3AF]/50 dark:divide-[#3D2E2D]">
                {recapRows.map((r) => (
                  <tr key={r.nis} className="text-sm">
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-xs">{r.no}</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                      {r.nis}
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{r.nama}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.hadir}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.sakit}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.izin}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#790D16] dark:text-[#E5D3AF]">
                      {r.alpha}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-semibold">
                      {r.persentase}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: TEACHING JOURNAL */}
      {activeTab === 'journal' && (
        <div className="space-y-6">
          {showJournalForm && (
            <form
              onSubmit={handleSaveJournal}
              className="p-5 sm:p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={jDate}
                  onChange={(e) => setJDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kelas</label>
                <select
                  value={jClass}
                  onChange={(e) => setJClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={jSubject}
                  onChange={(e) => setJSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Pertemuan Ke-</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={jMeetingNo}
                  onChange={(e) => setJMeetingNo(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-medium mb-1">Topik / Materi Pembelajaran</label>
                <input
                  type="text"
                  required
                  value={jTopic}
                  onChange={(e) => setJTopic(e.target.value)}
                  placeholder="Mis. Implementasi Struktur Percabangan Bertingkat"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Aktivitas Pembelajaran</label>
                <textarea
                  rows={2}
                  value={jActivity}
                  onChange={(e) => setJActivity(e.target.value)}
                  placeholder="Kegiatan inti, diskusi, praktik lab..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Catatan Perkembangan Siswa (Terintegrasi)
                </label>
                <textarea
                  rows={2}
                  value={jProgress}
                  onChange={(e) => setJProgress(e.target.value)}
                  placeholder="Catat siswa yang menonjol maupun yang butuh pendampingan khusus..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-medium mb-1">Refleksi Guru</label>
                <input
                  type="text"
                  value={jReflection}
                  onChange={(e) => setJReflection(e.target.value)}
                  placeholder="Evaluasi metode & rencana perbaikan pertemuan selanjutnya"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJournalForm(false)}
                  className="px-4 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#790D16] text-[#F5EFE1] text-xs font-medium hover:bg-[#610A11] cursor-pointer"
                >
                  {editingJournalId ? 'Simpan Perubahan' : 'Simpan Jurnal'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {sortedJournals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] text-center text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Belum ada jurnal mengajar tercatat.
              </div>
            ) : (
              sortedJournals.map((j) => (
                <article
                  key={j.id}
                  className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono tabular-nums text-[#790D16] dark:text-[#AEC4D4]">
                        {j.date} · {j.className} · {j.subject} · Pertemuan {j.meetingNo}
                      </p>
                      <h3 className="font-display text-base font-bold text-[#241716] dark:text-[#F5EFE1]">
                        {j.topic}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 no-print">
                      <button
                        type="button"
                        onClick={() => handleEditJournal(j)}
                        className="p-1.5 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteJournal(j.id)}
                        className="p-1.5 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {j.learningActivity && (
                    <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                      <strong className="text-[#241716] dark:text-[#F5EFE1]">Aktivitas:</strong> {j.learningActivity}
                    </p>
                  )}
                  {j.studentProgressNote && (
                    <p className="text-xs text-[#241716] dark:text-[#F5EFE1] p-3 rounded-xl bg-[#F5EFE1]/60 dark:bg-[#2A2020] border border-[#E5D3AF]/70 dark:border-[#3D2E2D]">
                      <strong>Perkembangan Siswa:</strong> {j.studentProgressNote}
                    </p>
                  )}
                  {j.reflection && (
                    <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                      <strong className="text-[#241716] dark:text-[#F5EFE1]">Refleksi:</strong> {j.reflection}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
