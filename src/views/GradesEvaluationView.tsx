import { useMemo, useState } from 'react';
import { BarChart3, Edit3, Plus, Save, Trash2 } from 'lucide-react';
import { ExportMenu } from '../components/ExportMenu';
import {
  Assessment,
  AssessmentCategory,
  SemesterType,
  Student,
  StudentScoreEntry,
  UserProfile,
} from '../types';

interface GradesEvaluationViewProps {
  profile: UserProfile | null;
  students: Student[];
  assessments: Assessment[];
  onSaveAssessment: (
    data: Omit<Assessment, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteAssessment: (id: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  formatif: 'Asesmen Formatif',
  sumatif: 'Asesmen Sumatif',
  tugas: 'Tugas Terstruktur',
  pts: 'Sumatif Tengah Semester (PTS)',
  pas: 'Sumatif Akhir Semester (PAS)',
  praktik: 'Asesmen Praktik / Proyek',
};

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getEffectiveScore(entry?: StudentScoreEntry): number | null {
  if (!entry || entry.score === null || entry.score === undefined) return null;
  if (entry.remedialScore !== null && entry.remedialScore !== undefined) {
    return Math.max(entry.score, entry.remedialScore);
  }
  return entry.score;
}

export function GradesEvaluationView({
  profile,
  students,
  assessments,
  onSaveAssessment,
  onDeleteAssessment,
}: GradesEvaluationViewProps) {
  const [activeTab, setActiveTab] = useState<'gradebook' | 'recap' | 'remedial' | 'analysis'>('gradebook');

  const classList = useMemo(() => {
    const set = new Set(students.map((s) => s.className));
    if (set.size === 0) set.add('X RPL 1');
    return Array.from(set).sort();
  }, [students]);

  const [selectedClass, setSelectedClass] = useState(classList[0] || 'X RPL 1');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Create / Edit Assessment Instrument Form
  const [showForm, setShowForm] = useState(false);
  const [editingAsgId, setEditingAsgId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState('');
  const [fCategory, setFCategory] = useState<AssessmentCategory>('sumatif');
  const [fClass, setFClass] = useState(classList[0] || 'X RPL 1');
  const [fSubject, setFSubject] = useState(profile?.subject || 'Informatika');
  const [fSemester, setFSemester] = useState<SemesterType>(profile?.activeSemester || 'Ganjil');
  const [fDate, setFDate] = useState(getTodayStr());
  const [fMaxScore, setFMaxScore] = useState(100);
  const [fKktp, setFKktp] = useState(profile?.kkmDefault || 75);
  const [fInstrumentNotes, setFInstrumentNotes] = useState('');

  // Inline score draft for currently selected assessment
  const [draftScores, setDraftScores] = useState<Record<string, StudentScoreEntry>>({});
  const [scoreSavedMsg, setScoreSavedMsg] = useState<string | null>(null);

  const classAssessments = useMemo(
    () =>
      assessments
        .filter((a) => a.className === selectedClass)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [assessments, selectedClass]
  );

  const activeAssessment = useMemo(() => {
    if (selectedAssessmentId) {
      const found = classAssessments.find((a) => a.id === selectedAssessmentId);
      if (found) return found;
    }
    return classAssessments[0] || null;
  }, [classAssessments, selectedAssessmentId]);

  const classStudents = useMemo(
    () =>
      students
        .filter((s) => s.className === selectedClass && s.status === 'Aktif')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, selectedClass]
  );

  // Available months for monthly report
  const availableMonths = useMemo(() => {
    const set = new Set(classAssessments.map((a) => a.month));
    return Array.from(set).sort().reverse();
  }, [classAssessments]);

  const handleOpenCreate = () => {
    setEditingAsgId(null);
    setFTitle('');
    setFCategory('sumatif');
    setFClass(selectedClass);
    setFSubject(profile?.subject || 'Informatika');
    setFSemester(profile?.activeSemester || 'Ganjil');
    setFDate(getTodayStr());
    setFMaxScore(100);
    setFKktp(profile?.kkmDefault || 75);
    setFInstrumentNotes('');
    setShowForm(true);
  };

  const handleEditAssessment = (asg: Assessment) => {
    setEditingAsgId(asg.id);
    setFTitle(asg.title);
    setFCategory(asg.category);
    setFClass(asg.className);
    setFSubject(asg.subject);
    setFSemester(asg.semester);
    setFDate(asg.date);
    setFMaxScore(asg.maxScore);
    setFKktp(asg.kktp);
    setFInstrumentNotes(asg.instrumentNotes || '');
    setShowForm(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const existingScores = editingAsgId
      ? assessments.find((a) => a.id === editingAsgId)?.scores || {}
      : {};
    await onSaveAssessment(
      {
        title: fTitle,
        category: fCategory,
        className: fClass,
        subject: fSubject,
        semester: fSemester,
        month: fDate.slice(0, 7),
        date: fDate,
        maxScore: fMaxScore,
        kktp: fKktp,
        instrumentNotes: fInstrumentNotes,
        scores: existingScores,
      },
      editingAsgId || undefined
    );
    setSelectedClass(fClass);
    setShowForm(false);
    setEditingAsgId(null);
  };

  const getScoreRecord = (asg: Assessment, stuId: string): StudentScoreEntry => {
    const key = `${asg.id}__${stuId}`;
    if (draftScores[key]) return draftScores[key];
    return asg.scores?.[stuId] || { score: null };
  };

  const updateDraftScore = (asg: Assessment, stuId: string, patch: Partial<StudentScoreEntry>) => {
    const key = `${asg.id}__${stuId}`;
    const current = getScoreRecord(asg, stuId);
    setDraftScores((prev) => ({
      ...prev,
      [key]: { ...current, ...patch },
    }));
  };

  const handleCommitScores = async (asg: Assessment) => {
    const mergedScores: Record<string, StudentScoreEntry> = { ...(asg.scores || {}) };
    classStudents.forEach((stu) => {
      const key = `${asg.id}__${stu.id}`;
      if (draftScores[key]) {
        mergedScores[stu.id] = draftScores[key];
      }
    });
    await onSaveAssessment(
      {
        title: asg.title,
        category: asg.category,
        className: asg.className,
        subject: asg.subject,
        semester: asg.semester,
        month: asg.month,
        date: asg.date,
        maxScore: asg.maxScore,
        kktp: asg.kktp,
        instrumentNotes: asg.instrumentNotes || '',
        scores: mergedScores,
      },
      asg.id
    );
    setScoreSavedMsg('Daftar nilai berhasil disimpan dan direkapitulasi.');
    setTimeout(() => setScoreSavedMsg(null), 3000);
  };

  // Monthly & Semester Recapitulation Matrix
  const recapAssessments = useMemo(() => {
    if (selectedMonth === 'all') return classAssessments;
    return classAssessments.filter((a) => a.month === selectedMonth);
  }, [classAssessments, selectedMonth]);

  const recapMatrix = useMemo(() => {
    const defaultKktp = profile?.kkmDefault || 75;
    return classStudents.map((stu, idx) => {
      const values: Record<string, string | number> = {};
      let sum = 0;
      let count = 0;

      recapAssessments.forEach((asg) => {
        const eff = getEffectiveScore(asg.scores?.[stu.id]);
        values[asg.id] = eff !== null ? eff : '-';
        if (eff !== null) {
          sum += eff;
          count += 1;
        }
      });

      const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      return {
        no: idx + 1,
        nis: stu.nis,
        nama: stu.name,
        ...values,
        rataRata: count > 0 ? avg : '-',
        status: count === 0 ? 'Belum Ada Nilai' : avg >= defaultKktp ? 'Tuntas' : 'Perlu Remedial',
      };
    });
  }, [classStudents, recapAssessments, profile]);

  // Remedial & Pengayaan List
  const remedialItems = useMemo(() => {
    const list: {
      assessment: Assessment;
      student: Student;
      entry: StudentScoreEntry;
    }[] = [];
    classAssessments.forEach((asg) => {
      classStudents.forEach((stu) => {
        const entry = getScoreRecord(asg, stu.id);
        if (entry.score !== null && entry.score < asg.kktp) {
          list.push({ assessment: asg, student: stu, entry });
        }
      });
    });
    return list;
  }, [classAssessments, classStudents, draftScores]);

  const enrichmentItems = useMemo(() => {
    const list: {
      assessment: Assessment;
      student: Student;
      entry: StudentScoreEntry;
    }[] = [];
    classAssessments.forEach((asg) => {
      classStudents.forEach((stu) => {
        const entry = getScoreRecord(asg, stu.id);
        if (entry.score !== null && (entry.score >= 90 || entry.isEnrichment)) {
          list.push({ assessment: asg, student: stu, entry });
        }
      });
    });
    return list;
  }, [classAssessments, classStudents, draftScores]);

  // Evaluation Analysis Metrics for Active Assessment
  const analysisMetrics = useMemo(() => {
    if (!activeAssessment) return null;
    const rawScores: number[] = [];
    const effectiveScores: number[] = [];
    classStudents.forEach((stu) => {
      const entry = activeAssessment.scores?.[stu.id];
      if (entry && entry.score !== null && entry.score !== undefined) {
        rawScores.push(entry.score);
        const eff = getEffectiveScore(entry);
        if (eff !== null) effectiveScores.push(eff);
      }
    });
    if (effectiveScores.length === 0) return null;

    const sorted = [...effectiveScores].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mean = Math.round((sum / sorted.length) * 10) / 10;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const passed = sorted.filter((s) => s >= activeAssessment.kktp).length;
    const passRate = Math.round((passed / sorted.length) * 100);

    const buckets = [
      { label: '0–59 (Belum Tuntas)', count: sorted.filter((s) => s < 60).length },
      { label: `60–${activeAssessment.kktp - 1} (Remedial)`, count: sorted.filter((s) => s >= 60 && s < activeAssessment.kktp).length },
      { label: `${activeAssessment.kktp}–89 (Tuntas)`, count: sorted.filter((s) => s >= activeAssessment.kktp && s < 90).length },
      { label: '90–100 (Pengayaan)', count: sorted.filter((s) => s >= 90).length },
    ];

    return { mean, median, min, max, passed, total: sorted.length, passRate, buckets };
  }, [activeAssessment, classStudents]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-xl bg-[#EDE3CE] dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D] self-start overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('gradebook')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'gradebook' ? 'bg-[#790D16] text-[#F5EFE1]' : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Instrumen & Daftar Nilai
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recap')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'recap' ? 'bg-[#790D16] text-[#F5EFE1]' : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Rekap & Laporan Bulanan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('remedial')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'remedial' ? 'bg-[#790D16] text-[#F5EFE1]' : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Remedial & Pengayaan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'analysis' ? 'bg-[#790D16] text-[#F5EFE1]' : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Analisis Evaluasi
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedAssessmentId('');
            }}
            className="px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-xs font-medium"
          >
            {classList.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Instrumen Penilaian
          </button>
        </div>
      </div>

      {/* Create / Edit Assessment Modal Card */}
      {showForm && (
        <form
          onSubmit={handleSaveForm}
          className="p-5 sm:p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Nama Penilaian / Instrumen</label>
            <input
              type="text"
              required
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              placeholder="Mis. Sumatif 2 — Basis Data Relasional"
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Kategori</label>
            <select
              value={fCategory}
              onChange={(e) => setFCategory(e.target.value as AssessmentCategory)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Kelas</label>
            <select
              value={fClass}
              onChange={(e) => setFClass(e.target.value)}
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
              value={fSubject}
              onChange={(e) => setFSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tanggal Pelaksanaan</label>
            <input
              type="date"
              required
              value={fDate}
              onChange={(e) => setFDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Skor Maksimal</label>
            <input
              type="number"
              min={1}
              max={1000}
              required
              value={fMaxScore}
              onChange={(e) => setFMaxScore(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Batas Tuntas (KKTP)</label>
            <input
              type="number"
              min={0}
              max={100}
              required
              value={fKktp}
              onChange={(e) => setFKktp(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium mb-1">
              Kisi-kisi / Rubrik Instrumen Asesmen
            </label>
            <input
              type="text"
              value={fInstrumentNotes}
              onChange={(e) => setFInstrumentNotes(e.target.value)}
              placeholder="Indikator pencapaian, jumlah soal, atau bobot penilaian praktik"
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Semester</label>
            <select
              value={fSemester}
              onChange={(e) => setFSemester(e.target.value as SemesterType)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#790D16] text-[#F5EFE1] text-xs font-medium hover:bg-[#610A11] cursor-pointer"
            >
              {editingAsgId ? 'Simpan Perubahan' : 'Simpan Instrumen'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: GRADEBOOK & INSTRUMENTS */}
      {activeTab === 'gradebook' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-[#241716] dark:text-[#F5EFE1]">
              Instrumen Asesmen ({classAssessments.length})
            </h3>
            {classAssessments.length === 0 ? (
              <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                Belum ada instrumen penilaian untuk kelas {selectedClass}.
              </p>
            ) : (
              <div className="space-y-2">
                {classAssessments.map((asg) => {
                  const isActive = activeAssessment?.id === asg.id;
                  return (
                    <div
                      key={asg.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isActive
                          ? 'border-[#790D16] dark:border-[#E5D3AF] bg-[#790D16]/8 dark:bg-[#790D16]/25'
                          : 'border-[#E5D3AF]/70 dark:border-[#3D2E2D] bg-[#F5EFE1]/40 dark:bg-[#2A2020]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAssessmentId(asg.id)}
                          className="text-left flex-1 min-w-0 cursor-pointer"
                        >
                          <p className="text-xs font-mono tabular-nums text-[#790D16] dark:text-[#AEC4D4]">
                            {asg.date} · {CATEGORY_LABELS[asg.category]}
                          </p>
                          <p className="text-sm font-semibold text-[#241716] dark:text-[#F5EFE1] truncate">
                            {asg.title}
                          </p>
                          <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                            KKTP {asg.kktp} · Skor Maks {asg.maxScore}
                          </p>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 no-print">
                          <button
                            type="button"
                            onClick={() => handleEditAssessment(asg)}
                            className="p-1 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAssessment(asg.id)}
                            className="p-1 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="lg:col-span-8 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
            {!activeAssessment ? (
              <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Pilih atau buat instrumen penilaian untuk mulai mengisi daftar nilai siswa.
              </p>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5D3AF]/70 dark:border-[#3D2E2D] pb-4">
                  <div>
                    <p className="text-xs text-[#790D16] dark:text-[#AEC4D4] font-medium">
                      {activeAssessment.subject} · {activeAssessment.className} · KKTP {activeAssessment.kktp}
                    </p>
                    <h3 className="font-display text-lg font-bold text-[#241716] dark:text-[#F5EFE1]">
                      {activeAssessment.title}
                    </h3>
                    {activeAssessment.instrumentNotes && (
                      <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6] mt-0.5">
                        {activeAssessment.instrumentNotes}
                      </p>
                    )}
                  </div>
                  <ExportMenu
                    meta={{
                      title: `Daftar Nilai: ${activeAssessment.title}`,
                      subtitle: `${activeAssessment.className} · ${activeAssessment.subject} · KKTP ${activeAssessment.kktp}`,
                      teacherName: profile?.displayName,
                      schoolName: profile?.schoolName,
                      academicYear: profile?.academicYear,
                      semester: activeAssessment.semester,
                      filename: `nilai-${activeAssessment.className.replace(/\s+/g, '-')}`,
                    }}
                    columns={[
                      { header: 'NIS', key: 'nis' },
                      { header: 'Nama Siswa', key: 'nama' },
                      { header: 'Nilai Awal', key: 'nilai' },
                      { header: 'Remedial', key: 'remedial' },
                      { header: 'Nilai Akhir', key: 'akhir' },
                      { header: 'Status', key: 'status' },
                    ]}
                    rows={classStudents.map((stu) => {
                      const entry = getScoreRecord(activeAssessment, stu.id);
                      const eff = getEffectiveScore(entry);
                      return {
                        nis: stu.nis,
                        nama: stu.name,
                        nilai: entry.score ?? '-',
                        remedial: entry.remedialScore ?? '-',
                        akhir: eff ?? '-',
                        status:
                          eff === null
                            ? 'Belum Dinilai'
                            : eff >= activeAssessment.kktp
                            ? 'Tuntas'
                            : 'Remedial',
                      };
                    })}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5D3AF] dark:border-[#3D2E2D] text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                        <th className="py-2.5 pr-3">NIS</th>
                        <th className="py-2.5 pr-3">Nama Siswa</th>
                        <th className="py-2.5 px-2 w-24">Nilai</th>
                        <th className="py-2.5 px-2">Catatan Umpan Balik</th>
                        <th className="py-2.5 pl-2 text-right">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5D3AF]/50 dark:divide-[#3D2E2D]">
                      {classStudents.map((stu) => {
                        const entry = getScoreRecord(activeAssessment, stu.id);
                        const eff = getEffectiveScore(entry);
                        const isPassed = eff !== null && eff >= activeAssessment.kktp;
                        return (
                          <tr key={stu.id} className="text-sm">
                            <td className="py-2 pr-3 font-mono tabular-nums text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                              {stu.nis}
                            </td>
                            <td className="py-2 pr-3 font-medium">{stu.name}</td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min={0}
                                max={activeAssessment.maxScore}
                                value={entry.score ?? ''}
                                onChange={(e) =>
                                  updateDraftScore(activeAssessment, stu.id, {
                                    score: e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                                className="w-20 px-2.5 py-1.5 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono tabular-nums text-right"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={entry.feedback || ''}
                                onChange={(e) =>
                                  updateDraftScore(activeAssessment, stu.id, {
                                    feedback: e.target.value,
                                  })
                                }
                                placeholder="Catatan singkat..."
                                className="w-full min-w-[140px] px-2.5 py-1.5 rounded-lg border border-[#E5D3AF]/70 dark:border-[#3D2E2D] bg-transparent text-xs"
                              />
                            </td>
                            <td className="py-2 pl-2 text-right text-xs font-medium whitespace-nowrap">
                              {eff === null ? (
                                <span className="text-[#5C4946] dark:text-[#C8B9A6]">—</span>
                              ) : isPassed ? (
                                <span className="text-[#3B6B8C] dark:text-[#AEC4D4]">
                                  Tuntas ({eff})
                                </span>
                              ) : (
                                <span className="text-[#790D16] dark:text-[#E5D3AF]">
                                  Remedial ({eff})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 no-print">
                  <span className="text-xs text-[#3B6B8C] dark:text-[#AEC4D4]">
                    {scoreSavedMsg || 'Ubah nilai di tabel lalu klik Simpan Nilai.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCommitScores(activeAssessment)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Simpan Nilai
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: REKAP & LAPORAN BULANAN */}
      {activeTab === 'recap' && (
        <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Filter Periode Laporan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                >
                  <option value="all">Seluruh Semester ({classAssessments.length} penilaian)</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      Laporan Bulan {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ExportMenu
              meta={{
                title:
                  selectedMonth === 'all'
                    ? `Rekapitulasi Nilai Semester — ${selectedClass}`
                    : `Laporan Bulanan Nilai Siswa (${selectedMonth}) — ${selectedClass}`,
                subtitle: `KKTP Standar: ${profile?.kkmDefault || 75}`,
                teacherName: profile?.displayName,
                schoolName: profile?.schoolName,
                academicYear: profile?.academicYear,
                semester: profile?.activeSemester,
                filename: `laporan-nilai-${selectedClass.replace(/\s+/g, '-')}-${selectedMonth}`,
              }}
              columns={[
                { header: 'No', key: 'no' },
                { header: 'NIS', key: 'nis' },
                { header: 'Nama Siswa', key: 'nama' },
                ...recapAssessments.map((a) => ({ header: a.title.slice(0, 22), key: a.id })),
                { header: 'Rata-rata', key: 'rataRata' },
                { header: 'Ketuntasan', key: 'status' },
              ]}
              rows={recapMatrix}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5D3AF] dark:border-[#3D2E2D] text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                  <th className="py-2.5 pr-3">No</th>
                  <th className="py-2.5 pr-3">NIS</th>
                  <th className="py-2.5 pr-3">Nama Siswa</th>
                  {recapAssessments.map((a) => (
                    <th key={a.id} className="py-2.5 px-2 text-right max-w-[130px] truncate" title={a.title}>
                      {a.title}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Rata-rata</th>
                  <th className="py-2.5 pl-3 text-right">Status KKTP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D3AF]/50 dark:divide-[#3D2E2D]">
                {recapMatrix.map((row) => (
                  <tr key={row.nis} className="text-sm">
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-xs">{row.no}</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                      {row.nis}
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{row.nama}</td>
                    {recapAssessments.map((a) => (
                      <td key={a.id} className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {(row as Record<string, string | number>)[a.id]}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                      {row.rataRata}
                    </td>
                    <td
                      className={`py-2.5 pl-3 text-right text-xs font-semibold ${
                        row.status === 'Perlu Remedial'
                          ? 'text-[#790D16] dark:text-[#E5D3AF]'
                          : 'text-[#3B6B8C] dark:text-[#AEC4D4]'
                      }`}
                    >
                      {row.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: REMEDIAL & PENGAYAAN */}
      {activeTab === 'remedial' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#790D16] dark:text-[#E5D3AF]">
                  Program & Hasil Remedial ({remedialItems.length})
                </h3>
                <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                  Siswa dengan capaian awal di bawah ambang KKTP.
                </p>
              </div>
              <ExportMenu
                meta={{
                  title: `Program & Hasil Remedial — ${selectedClass}`,
                  teacherName: profile?.displayName,
                  schoolName: profile?.schoolName,
                  academicYear: profile?.academicYear,
                  semester: profile?.activeSemester,
                  filename: `program-remedial-${selectedClass.replace(/\s+/g, '-')}`,
                }}
                columns={[
                  { header: 'Siswa', key: 'siswa' },
                  { header: 'Asesmen', key: 'asesmen' },
                  { header: 'Nilai Awal', key: 'awal' },
                  { header: 'KKTP', key: 'kktp' },
                  { header: 'Rencana Remedial', key: 'rencana' },
                  { header: 'Nilai Remedial', key: 'hasil' },
                ]}
                rows={remedialItems.map((it) => ({
                  siswa: it.student.name,
                  asesmen: it.assessment.title,
                  awal: it.entry.score ?? '-',
                  kktp: it.assessment.kktp,
                  rencana: it.entry.remedialPlan || '-',
                  hasil: it.entry.remedialScore ?? 'Belum Tes',
                }))}
              />
            </div>

            {remedialItems.length === 0 ? (
              <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Seluruh siswa di kelas {selectedClass} telah mencapai KKTP.
              </p>
            ) : (
              <div className="divide-y divide-[#E5D3AF]/60 dark:divide-[#3D2E2D]">
                {remedialItems.map(({ assessment, student, entry }) => (
                  <div key={`${assessment.id}_${student.id}`} className="py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{student.name}</p>
                        <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                          {assessment.title} · Awal:{' '}
                          <span className="font-mono font-semibold text-[#790D16] dark:text-[#E5D3AF]">
                            {entry.score}
                          </span>{' '}
                          (KKTP {assessment.kktp})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCommitScores(assessment)}
                        className="px-3 py-1.5 rounded-lg bg-[#790D16] text-[#F5EFE1] text-xs font-medium cursor-pointer no-print"
                      >
                        Simpan
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={entry.remedialPlan || ''}
                        onChange={(e) =>
                          updateDraftScore(assessment, student.id, {
                            remedialPlan: e.target.value,
                          })
                        }
                        placeholder="Bentuk program remedial (mis. tutor sebaya / tes ulang)"
                        className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-xs"
                      />
                      <input
                        type="number"
                        min={0}
                        max={assessment.maxScore}
                        value={entry.remedialScore ?? ''}
                        onChange={(e) =>
                          updateDraftScore(assessment, student.id, {
                            remedialScore: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="Nilai Rem."
                        className="px-3 py-1.5 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#3B6B8C] dark:text-[#AEC4D4]">
                Program & Hasil Pengayaan ({enrichmentItems.length})
              </h3>
              <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                Siswa melampaui target optimal (&ge; 90) untuk pendalaman materi.
              </p>
            </div>
            {enrichmentItems.length === 0 ? (
              <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Belum ada peserta pengayaan tercatat di kelas {selectedClass}.
              </p>
            ) : (
              <div className="divide-y divide-[#E5D3AF]/60 dark:divide-[#3D2E2D]">
                {enrichmentItems.map(({ assessment, student, entry }) => (
                  <div key={`${assessment.id}_${student.id}`} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{student.name}</p>
                        <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                          {assessment.title} · Skor{' '}
                          <span className="font-mono font-semibold text-[#3B6B8C] dark:text-[#AEC4D4]">
                            {entry.score}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCommitScores(assessment)}
                        className="px-3 py-1.5 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium hover:border-[#790D16] cursor-pointer no-print"
                      >
                        Simpan
                      </button>
                    </div>
                    <input
                      type="text"
                      value={entry.enrichmentNote || ''}
                      onChange={(e) =>
                        updateDraftScore(assessment, student.id, {
                          isEnrichment: true,
                          enrichmentNote: e.target.value,
                        })
                      }
                      placeholder="Catat aktivitas pengayaan (proyek lanjutan / tutor sebaya)..."
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: ANALISIS HASIL PENILAIAN */}
      {activeTab === 'analysis' && (
        <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[#790D16] dark:text-[#E5D3AF]" />
              <select
                value={activeAssessment?.id || ''}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-medium"
              >
                {classAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.date})
                  </option>
                ))}
              </select>
            </div>

            {activeAssessment && analysisMetrics && (
              <ExportMenu
                meta={{
                  title: `Analisis Hasil Penilaian: ${activeAssessment.title}`,
                  subtitle: `${activeAssessment.className} · Ketuntasan ${analysisMetrics.passRate}%`,
                  teacherName: profile?.displayName,
                  schoolName: profile?.schoolName,
                  academicYear: profile?.academicYear,
                  semester: activeAssessment.semester,
                  filename: `analisis-evaluasi-${activeAssessment.className.replace(/\s+/g, '-')}`,
                }}
                columns={[
                  { header: 'Rentang / Indikator', key: 'indikator' },
                  { header: 'Nilai / Jumlah', key: 'nilai' },
                ]}
                rows={[
                  { indikator: 'Rata-rata Kelas (Mean)', nilai: analysisMetrics.mean },
                  { indikator: 'Nilai Tengah (Median)', nilai: analysisMetrics.median },
                  { indikator: 'Nilai Tertinggi', nilai: analysisMetrics.max },
                  { indikator: 'Nilai Terendah', nilai: analysisMetrics.min },
                  { indikator: `Siswa Tuntas (KKTP >= ${activeAssessment.kktp})`, nilai: `${analysisMetrics.passed} dari ${analysisMetrics.total} (${analysisMetrics.passRate}%)` },
                  ...analysisMetrics.buckets.map((b) => ({
                    indikator: `Distribusi ${b.label}`,
                    nilai: `${b.count} siswa`,
                  })),
                ]}
              />
            )}
          </div>

          {!activeAssessment || !analysisMetrics ? (
            <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
              Pilih instrumen penilaian yang sudah memiliki nilai siswa untuk melihat analisis evaluasi.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-[#F5EFE1]/60 dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D]">
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Rata-rata</p>
                  <p className="mt-1 font-mono tabular-nums text-2xl font-bold">{analysisMetrics.mean}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F5EFE1]/60 dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D]">
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Median</p>
                  <p className="mt-1 font-mono tabular-nums text-2xl font-bold">{analysisMetrics.median}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F5EFE1]/60 dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D]">
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Tertinggi</p>
                  <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-[#3B6B8C] dark:text-[#AEC4D4]">
                    {analysisMetrics.max}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#F5EFE1]/60 dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D]">
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Terendah</p>
                  <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-[#790D16] dark:text-[#E5D3AF]">
                    {analysisMetrics.min}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#790D16] text-[#F5EFE1] col-span-2 md:col-span-1">
                  <p className="text-xs opacity-85">Daya Serap (KKTP {activeAssessment.kktp})</p>
                  <p className="mt-1 font-mono tabular-nums text-2xl font-bold">
                    {analysisMetrics.passRate}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Distribusi Capaian Belajar Siswa</h4>
                <div className="space-y-2.5">
                  {analysisMetrics.buckets.map((b, i) => {
                    const pct = Math.round((b.count / analysisMetrics.total) * 100);
                    return (
                      <div key={b.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{b.label}</span>
                          <span className="font-mono tabular-nums font-medium">
                            {b.count} siswa ({pct}%)
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-[#EDE3CE] dark:bg-[#2A2020] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              i < 2
                                ? 'bg-[#790D16]'
                                : i === 2
                                ? 'bg-[#3B6B8C] dark:bg-[#AEC4D4]'
                                : 'bg-[#C4A56D] dark:bg-[#E5D3AF]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#AEC4D4]/20 dark:bg-[#2A2020] border border-[#AEC4D4]/50 dark:border-[#3D2E2D] text-xs leading-relaxed">
                <strong>Kesimpulan Evaluasi Pembelajaran:</strong> Dari {analysisMetrics.total} siswa yang dinilai,{' '}
                {analysisMetrics.passed} siswa ({analysisMetrics.passRate}%) telah mencapai KKTP {activeAssessment.kktp}.{' '}
                {analysisMetrics.passRate >= 85
                  ? 'Ketuntasan klasikal sangat baik; pembelajaran dapat dilanjutkan ke Tujuan Pembelajaran berikutnya dengan pengayaan bagi siswa mahir.'
                  : 'Diperlukan program remedial terstruktur pada indikator esensial bagi siswa yang belum tuntas sebelum melanjutkan materi baru.'}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
