import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Edit3, FileSpreadsheet, Plus, Search, Trash2, Upload, Users, X } from 'lucide-react';
import { ExportMenu } from '../components/ExportMenu';
import {
  downloadStudentImportTemplate,
  ImportedStudentRow,
  parseStudentExcelFile,
  parseStudentPastedText,
} from '../utils/studentImportUtils';
import {
  GuidanceCategory,
  GuidanceNote,
  GuidanceStatus,
  Student,
  StudentGender,
  StudentStatus,
  UserProfile,
} from '../types';

interface StudentsGuidanceViewProps {
  profile: UserProfile | null;
  students: Student[];
  guidanceNotes: GuidanceNote[];
  onSaveStudent: (
    data: Omit<Student, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onImportStudents: (
    items: Omit<Student, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>[]
  ) => Promise<number>;
  onSaveGuidance: (
    data: Omit<GuidanceNote, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteGuidance: (id: string) => Promise<void>;
}

const GUIDANCE_CAT_LABELS: Record<GuidanceCategory, string> = {
  akademik: 'Akademik',
  kehadiran: 'Kehadiran',
  perilaku: 'Perilaku & Sikap',
  prestasi: 'Pengembangan Prestasi',
};

const GUIDANCE_STATUS_LABELS: Record<GuidanceStatus, string> = {
  perlu_tindak_lanjut: 'Perlu Tindak Lanjut',
  dalam_bimbingan: 'Dalam Bimbingan',
  selesai: 'Selesai',
};

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function StudentsGuidanceView({
  profile,
  students,
  guidanceNotes,
  onSaveStudent,
  onDeleteStudent,
  onImportStudents,
  onSaveGuidance,
  onDeleteGuidance,
}: StudentsGuidanceViewProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'guidance'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // Student Form
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [nis, setNis] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('X RPL 1');
  const [gender, setGender] = useState<StudentGender>('L');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [status, setStatus] = useState<StudentStatus>('Aktif');
  const [notes, setNotes] = useState('');

  // Bulk Import State (>30 siswa)
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [importDefaultClass, setImportDefaultClass] = useState('X RPL 1');
  const [pasteText, setPasteText] = useState('');
  const [previewRows, setPreviewRows] = useState<ImportedStudentRow[]>([]);
  const [skipDuplicateNis, setSkipDuplicateNis] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Guidance Form
  const [showGuidanceForm, setShowGuidanceForm] = useState(false);
  const [editingGuidanceId, setEditingGuidanceId] = useState<string | null>(null);
  const [gStudentId, setGStudentId] = useState(students[0]?.id || '');
  const [gDate, setGDate] = useState(getTodayStr());
  const [gCategory, setGCategory] = useState<GuidanceCategory>('akademik');
  const [gIssue, setGIssue] = useState('');
  const [gPlan, setGPlan] = useState('');
  const [gStatus, setGStatus] = useState<GuidanceStatus>('perlu_tindak_lanjut');

  const classList = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter((s) => {
        if (classFilter !== 'all' && s.className !== classFilter) return false;
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));
  }, [students, classFilter, searchQuery]);

  const sortedGuidance = useMemo(
    () => [...guidanceNotes].sort((a, b) => b.date.localeCompare(a.date)),
    [guidanceNotes]
  );

  const handleEditStudent = (s: Student) => {
    setEditingStudentId(s.id);
    setNis(s.nis);
    setName(s.name);
    setClassName(s.className);
    setGender(s.gender);
    setGuardianPhone(s.guardianPhone || '');
    setStatus(s.status);
    setNotes(s.notes || '');
    setShowStudentForm(true);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveStudent(
      { nis, name, className, gender, guardianPhone, status, notes },
      editingStudentId || undefined
    );
    setEditingStudentId(null);
    setNis('');
    setName('');
    setGuardianPhone('');
    setNotes('');
    setShowStudentForm(false);
  };

  const existingNisSet = useMemo(
    () => new Set(students.map((s) => s.nis.trim().toLowerCase())),
    [students]
  );

  const rowsToImport = useMemo(() => {
    if (!skipDuplicateNis) return previewRows;
    return previewRows.filter((r) => !existingNisSet.has(r.nis.trim().toLowerCase()));
  }, [previewRows, skipDuplicateNis, existingNisSet]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportNotice(null);
    const parsed = await parseStudentExcelFile(file, importDefaultClass);
    setPreviewRows(parsed);
    if (parsed.length === 0) {
      setImportNotice('Tidak ditemukan baris siswa valid pada file. Gunakan template Excel yang tersedia.');
    }
  };

  const handleParsePaste = () => {
    setImportNotice(null);
    const parsed = parseStudentPastedText(pasteText, importDefaultClass);
    setPreviewRows(parsed);
    if (parsed.length === 0) {
      setImportNotice('Format teks belum terbaca. Tempel kolom NIS dan Nama dari Excel atau CSV.');
    }
  };

  const handleConfirmImport = async () => {
    if (rowsToImport.length === 0) return;
    setImporting(true);
    try {
      const count = await onImportStudents(rowsToImport);
      setImportNotice(`Berhasil mengimpor ${count} data siswa ke daftar induk.`);
      setPreviewRows([]);
      setPasteText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowImportPanel(false);
    } finally {
      setImporting(false);
    }
  };

  const handleEditGuidance = (g: GuidanceNote) => {
    setEditingGuidanceId(g.id);
    setGStudentId(g.studentId);
    setGDate(g.date);
    setGCategory(g.category);
    setGIssue(g.issueSummary);
    setGPlan(g.followUpPlan || '');
    setGStatus(g.status);
    setShowGuidanceForm(true);
  };

  const handleGuidanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id === gStudentId) || students[0];
    if (!stu) return;
    await onSaveGuidance(
      {
        studentId: stu.id,
        studentName: stu.name,
        className: stu.className,
        date: gDate,
        category: gCategory,
        issueSummary: gIssue,
        followUpPlan: gPlan,
        status: gStatus,
      },
      editingGuidanceId || undefined
    );
    setEditingGuidanceId(null);
    setGIssue('');
    setGPlan('');
    setShowGuidanceForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-xl bg-[#EDE3CE] dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D] self-start">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'students' ? 'bg-[#790D16] text-[#F5EFE1]' : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Data Induk Siswa ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guidance')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'guidance' ? 'bg-[#790D16] text-[#F5EFE1]' : 'text-[#5C4946] dark:text-[#C8B9A6]'
            }`}
          >
            Tindak Lanjut & Bimbingan ({guidanceNotes.length})
          </button>
        </div>

        {activeTab === 'students' ? (
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              meta={{
                title: 'Daftar Induk Siswa',
                subtitle: classFilter === 'all' ? 'Semua Kelas' : `Kelas ${classFilter}`,
                teacherName: profile?.displayName,
                schoolName: profile?.schoolName,
                academicYear: profile?.academicYear,
                semester: profile?.activeSemester,
                filename: 'data-siswa',
              }}
              columns={[
                { header: 'NIS', key: 'nis' },
                { header: 'Nama Siswa', key: 'nama' },
                { header: 'Kelas', key: 'kelas' },
                { header: 'L/P', key: 'jk' },
                { header: 'Kontak Wali', key: 'kontak' },
                { header: 'Status', key: 'status' },
              ]}
              rows={filteredStudents.map((s) => ({
                nis: s.nis,
                nama: s.name,
                kelas: s.className,
                jk: s.gender,
                kontak: s.guardianPhone || '-',
                status: s.status,
              }))}
            />
            <button
              type="button"
              onClick={() => {
                setShowStudentForm(false);
                setShowImportPanel((v) => !v);
                setImportNotice(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#790D16] dark:border-[#E5D3AF] text-[#790D16] dark:text-[#E5D3AF] hover:bg-[#790D16]/10 text-xs font-medium cursor-pointer no-print whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Siswa (Massal)
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImportPanel(false);
                setEditingStudentId(null);
                setShowStudentForm((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium cursor-pointer no-print whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Siswa
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              meta={{
                title: 'Catatan Tindak Lanjut & Bimbingan Siswa',
                teacherName: profile?.displayName,
                schoolName: profile?.schoolName,
                academicYear: profile?.academicYear,
                semester: profile?.activeSemester,
                filename: 'catatan-bimbingan',
              }}
              columns={[
                { header: 'Tanggal', key: 'tanggal' },
                { header: 'Nama Siswa', key: 'nama' },
                { header: 'Kelas', key: 'kelas' },
                { header: 'Kategori', key: 'kategori' },
                { header: 'Temuan / Masalah', key: 'temuan' },
                { header: 'Tindak Lanjut', key: 'rencana' },
                { header: 'Status', key: 'status' },
              ]}
              rows={sortedGuidance.map((g) => ({
                tanggal: g.date,
                nama: g.studentName,
                kelas: g.className,
                kategori: GUIDANCE_CAT_LABELS[g.category],
                temuan: g.issueSummary,
                rencana: g.followUpPlan || '-',
                status: GUIDANCE_STATUS_LABELS[g.status],
              }))}
            />
            <button
              type="button"
              onClick={() => {
                setEditingGuidanceId(null);
                if (!gStudentId && students[0]) setGStudentId(students[0].id);
                setShowGuidanceForm((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium cursor-pointer no-print"
            >
              <Plus className="w-3.5 h-3.5" />
              Catat Bimbingan
            </button>
          </div>
        )}
      </div>

      {activeTab === 'students' && (
        <div className="space-y-5">
          {importNotice && !showImportPanel && (
            <div className="p-3.5 rounded-xl bg-[#AEC4D4]/25 dark:bg-[#2A2020] border border-[#AEC4D4] dark:border-[#3D2E2D] flex items-center justify-between gap-3 text-xs font-medium text-[#241716] dark:text-[#F5EFE1]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#3B6B8C] dark:text-[#AEC4D4] shrink-0" />
                <span>{importNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportNotice(null)}
                className="p-1 text-[#5C4946] dark:text-[#C8B9A6] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {showImportPanel && (
            <section className="p-5 sm:p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] space-y-5 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5D3AF]/70 dark:border-[#3D2E2D] pb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[#241716] dark:text-[#F5EFE1]">
                    Import Data Siswa Massal (Mendukung &gt;30 hingga Ratusan Siswa)
                  </h3>
                  <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                    Unggah file Excel/CSV atau tempel langsung daftar siswa dari spreadsheet untuk dimasukkan sekaligus.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadStudentImportTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#2A2020] text-xs font-medium hover:border-[#790D16] transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#3B6B8C] dark:text-[#AEC4D4]" />
                  Unduh Template Excel
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex p-1 rounded-xl bg-[#EDE3CE] dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D]">
                  <button
                    type="button"
                    onClick={() => setImportMode('file')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      importMode === 'file' ? 'bg-[#790D16] text-[#F5EFE1]' : 'text-[#5C4946] dark:text-[#C8B9A6]'
                    }`}
                  >
                    Unggah Excel / CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('paste')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      importMode === 'paste' ? 'bg-[#790D16] text-[#F5EFE1]' : 'text-[#5C4946] dark:text-[#C8B9A6]'
                    }`}
                  >
                    Tempel dari Excel / Sheets
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">Kelas Default:</label>
                  <input
                    type="text"
                    value={importDefaultClass}
                    onChange={(e) => setImportDefaultClass(e.target.value)}
                    placeholder="X RPL 1"
                    className="w-28 px-2.5 py-1.5 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-xs"
                  />
                </div>
              </div>

              {importMode === 'file' ? (
                <div className="p-5 rounded-xl border border-dashed border-[#790D16]/40 dark:border-[#E5D3AF]/40 bg-[#F5EFE1]/40 dark:bg-[#161010]/40 space-y-2 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="block w-full max-w-sm mx-auto text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#790D16] file:text-[#F5EFE1] hover:file:bg-[#610A11] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#5C4946] dark:text-[#C8B9A6]">
                    Format didukung: .xlsx, .xls, atau .csv dengan kolom NIS, Nama Lengkap, Kelas, L/P, No HP Wali.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <textarea
                    rows={5}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={'Tempel baris data langsung dari Excel/Google Sheets (pisahkan dengan Tab atau koma):\n260111\tBudi Santoso\tX RPL 1\tL\t08123456789\n260112\tSiti Aminah\tX RPL 1\tP\t08129876543'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-xs font-mono"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParsePaste}
                      disabled={!pasteText.trim()}
                      className="px-4 py-2 rounded-lg border border-[#790D16] text-[#790D16] dark:border-[#E5D3AF] dark:text-[#E5D3AF] text-xs font-medium disabled:opacity-45 cursor-pointer"
                    >
                      Pratinjau Data Tempelan
                    </button>
                  </div>
                </div>
              )}

              {importNotice && (
                <p className="text-xs text-[#790D16] dark:text-[#E5D3AF] font-medium">{importNotice}</p>
              )}

              {previewRows.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#E5D3AF]/70 dark:border-[#3D2E2D]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[#241716] dark:text-[#F5EFE1]">
                      Pratinjau: {previewRows.length} baris terbaca · {rowsToImport.length} siap diimpor
                    </p>
                    <label className="inline-flex items-center gap-2 text-xs text-[#5C4946] dark:text-[#C8B9A6] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipDuplicateNis}
                        onChange={(e) => setSkipDuplicateNis(e.target.checked)}
                        className="accent-[#790D16]"
                      />
                      Lewati NIS yang sudah terdaftar
                    </label>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-[#E5D3AF] dark:border-[#3D2E2D]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#EDE3CE] dark:bg-[#2A2020]">
                        <tr>
                          <th className="py-2 px-3">No</th>
                          <th className="py-2 px-3">NIS</th>
                          <th className="py-2 px-3">Nama Siswa</th>
                          <th className="py-2 px-3">Kelas</th>
                          <th className="py-2 px-3">L/P</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5D3AF]/50 dark:divide-[#3D2E2D]">
                        {previewRows.map((row, idx) => {
                          const isDup = existingNisSet.has(row.nis.trim().toLowerCase());
                          return (
                            <tr
                              key={`${row.nis}_${idx}`}
                              className={isDup && skipDuplicateNis ? 'opacity-45' : ''}
                            >
                              <td className="py-1.5 px-3 font-mono tabular-nums">{idx + 1}</td>
                              <td className="py-1.5 px-3 font-mono tabular-nums">{row.nis}</td>
                              <td className="py-1.5 px-3 font-medium">{row.name}</td>
                              <td className="py-1.5 px-3">{row.className}</td>
                              <td className="py-1.5 px-3 font-mono">{row.gender}</td>
                              <td className="py-1.5 px-3">
                                {isDup ? 'Duplikat NIS' : 'Siap Import'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewRows([]);
                        setShowImportPanel(false);
                      }}
                      className="px-4 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium cursor-pointer"
                    >
                      Tutup
                    </button>
                    <button
                      type="button"
                      disabled={importing || rowsToImport.length === 0}
                      onClick={handleConfirmImport}
                      className="px-4 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {importing
                        ? 'Mengimpor...'
                        : `Import ${rowsToImport.length} Siswa Sekarang`}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {showStudentForm && (
            <form
              onSubmit={handleStudentSubmit}
              className="p-5 sm:p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1">NIS / NISN</label>
                <input
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kelas</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="X RPL 1"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Jenis Kelamin</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as StudentGender)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">No. HP Orang Tua / Wali</label>
                <input
                  type="text"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="08..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudentStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Mutasi">Mutasi</option>
                  <option value="Lulus">Lulus</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Catatan Khusus</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStudentForm(false)}
                  className="px-4 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#790D16] text-[#F5EFE1] text-xs font-medium hover:bg-[#610A11] cursor-pointer"
                >
                  {editingStudentId ? 'Simpan Perubahan' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-3 no-print">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-[#5C4946] dark:text-[#C8B9A6] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau NIS siswa..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-sm"
              />
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-sm"
            >
              <option value="all">Semua Kelas</option>
              {classList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 overflow-x-auto">
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Users className="w-7 h-7 mx-auto text-[#790D16] dark:text-[#E5D3AF]" />
                <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                  Tidak ada data siswa yang cocok dengan filter.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5D3AF] dark:border-[#3D2E2D] text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                    <th className="py-2.5 pr-3">NIS</th>
                    <th className="py-2.5 pr-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">L/P</th>
                    <th className="py-2.5 px-3">Kontak Wali</th>
                    <th className="py-2.5 px-3">Catatan</th>
                    <th className="py-2.5 pl-3 text-right no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D3AF]/50 dark:divide-[#3D2E2D]">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="text-sm">
                      <td className="py-2.5 pr-3 font-mono tabular-nums text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                        {s.nis}
                      </td>
                      <td className="py-2.5 pr-3 font-medium">{s.name}</td>
                      <td className="py-2.5 px-3 text-xs">{s.className}</td>
                      <td className="py-2.5 px-3 text-xs font-mono">{s.gender}</td>
                      <td className="py-2.5 px-3 text-xs font-mono tabular-nums">
                        {s.guardianPhone || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#5C4946] dark:text-[#C8B9A6] max-w-[240px] truncate">
                        {s.notes || '-'}
                      </td>
                      <td className="py-2.5 pl-3 text-right no-print">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditStudent(s)}
                            className="p-1.5 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStudent(s.id)}
                            className="p-1.5 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {activeTab === 'guidance' && (
        <div className="space-y-5">
          {showGuidanceForm && (
            <form
              onSubmit={handleGuidanceSubmit}
              className="p-5 sm:p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Siswa</label>
                <select
                  value={gStudentId}
                  onChange={(e) => setGStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={gDate}
                  onChange={(e) => setGDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kategori Bimbingan</label>
                <select
                  value={gCategory}
                  onChange={(e) => setGCategory(e.target.value as GuidanceCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  {Object.entries(GUIDANCE_CAT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Temuan / Ringkasan Masalah</label>
                <textarea
                  rows={2}
                  required
                  value={gIssue}
                  onChange={(e) => setGIssue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Rencana Tindak Lanjut</label>
                <textarea
                  rows={2}
                  value={gPlan}
                  onChange={(e) => setGPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status Penanganan</label>
                <select
                  value={gStatus}
                  onChange={(e) => setGStatus(e.target.value as GuidanceStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
                >
                  {Object.entries(GUIDANCE_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGuidanceForm(false)}
                  className="px-4 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#790D16] text-[#F5EFE1] text-xs font-medium hover:bg-[#610A11] cursor-pointer"
                >
                  {editingGuidanceId ? 'Simpan Perubahan' : 'Simpan Catatan'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {sortedGuidance.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] text-center text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Belum ada catatan tindak lanjut atau bimbingan siswa.
              </div>
            ) : (
              sortedGuidance.map((g) => (
                <article
                  key={g.id}
                  className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono tabular-nums text-[#790D16] dark:text-[#AEC4D4]">
                        {g.date} · {GUIDANCE_CAT_LABELS[g.category]} · {GUIDANCE_STATUS_LABELS[g.status]}
                      </p>
                      <h3 className="font-display text-base font-bold text-[#241716] dark:text-[#F5EFE1]">
                        {g.studentName} ({g.className})
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 no-print">
                      <button
                        type="button"
                        onClick={() => handleEditGuidance(g)}
                        className="p-1.5 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteGuidance(g.id)}
                        className="p-1.5 text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[#241716] dark:text-[#F5EFE1]">{g.issueSummary}</p>
                  {g.followUpPlan && (
                    <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6] p-3 rounded-xl bg-[#F5EFE1]/60 dark:bg-[#2A2020] border border-[#E5D3AF]/70 dark:border-[#3D2E2D]">
                      <strong>Tindak Lanjut:</strong> {g.followUpPlan}
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
