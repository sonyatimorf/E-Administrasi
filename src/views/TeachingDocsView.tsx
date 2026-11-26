import { useMemo, useState } from 'react';
import { BookOpen, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { ExportMenu } from '../components/ExportMenu';
import {
  TeachingDocStatus,
  TeachingDocType,
  TeachingDocument,
  UserProfile,
} from '../types';

interface TeachingDocsViewProps {
  profile: UserProfile | null;
  teachingDocs: TeachingDocument[];
  onSaveDoc: (
    data: Omit<TeachingDocument, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
}

const DOC_TYPE_LABELS: Record<TeachingDocType, string> = {
  cp_atp: 'CP & ATP',
  prota: 'Program Tahunan (Prota)',
  promes: 'Program Semester (Promes)',
  modul_ajar: 'Modul Ajar',
  kktp: 'KKTP',
};

export function TeachingDocsView({
  profile,
  teachingDocs,
  onSaveDoc,
  onDeleteDoc,
}: TeachingDocsViewProps) {
  const [filterType, setFilterType] = useState<'all' | TeachingDocType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form states
  const [docType, setDocType] = useState<TeachingDocType>('modul_ajar');
  const [title, setTitle] = useState('');
  const [phaseOrGrade, setPhaseOrGrade] = useState('Fase E / Kelas X');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap' | 'Tahunan'>(
    profile?.activeSemester || 'Ganjil'
  );
  const [subject, setSubject] = useState(profile?.subject || 'Informatika');
  const [targetOutcome, setTargetOutcome] = useState('');
  const [kktpThreshold, setKktpThreshold] = useState<number>(profile?.kkmDefault || 75);
  const [durationHours, setDurationHours] = useState<number>(6);
  const [contentSummary, setContentSummary] = useState('');
  const [status, setStatus] = useState<TeachingDocStatus>('Siap Pakai');

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teachingDocs.filter((d) => {
      if (filterType !== 'all' && d.docType !== filterType) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        d.phaseOrGrade.toLowerCase().includes(q)
      );
    });
  }, [teachingDocs, filterType, searchQuery]);

  const resetForm = () => {
    setEditingId(null);
    setDocType('modul_ajar');
    setTitle('');
    setPhaseOrGrade('Fase E / Kelas X');
    setSemester(profile?.activeSemester || 'Ganjil');
    setSubject(profile?.subject || 'Informatika');
    setTargetOutcome('');
    setKktpThreshold(profile?.kkmDefault || 75);
    setDurationHours(6);
    setContentSummary('');
    setStatus('Siap Pakai');
  };

  const handleEdit = (doc: TeachingDocument) => {
    setEditingId(doc.id);
    setDocType(doc.docType);
    setTitle(doc.title);
    setPhaseOrGrade(doc.phaseOrGrade);
    setSemester(doc.semester);
    setSubject(doc.subject);
    setTargetOutcome(doc.targetOutcome || '');
    setKktpThreshold(doc.kktpThreshold ?? 75);
    setDurationHours(doc.durationHours ?? 0);
    setContentSummary(doc.contentSummary || '');
    setStatus(doc.status);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveDoc(
      {
        docType,
        title,
        phaseOrGrade,
        semester,
        subject,
        targetOutcome,
        kktpThreshold,
        durationHours,
        contentSummary,
        status,
      },
      editingId || undefined
    );
    resetForm();
    setShowForm(false);
  };

  const exportRows = filteredDocs.map((d) => ({
    jenis: DOC_TYPE_LABELS[d.docType],
    judul: d.title,
    fase: d.phaseOrGrade,
    semester: d.semester,
    mapel: d.subject,
    jp: d.durationHours ?? 0,
    kktp: d.kktpThreshold ?? '-',
    status: d.status,
    ringkasan: d.contentSummary || d.targetOutcome || '-',
  }));

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#EDE3CE] dark:bg-[#2A2020] border border-[#E5D3AF] dark:border-[#3D2E2D]">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#790D16] text-[#F5EFE1]'
                : 'text-[#5C4946] dark:text-[#C8B9A6] hover:text-[#241716] dark:hover:text-[#F5EFE1]'
            }`}
          >
            Semua ({teachingDocs.length})
          </button>
          {(Object.keys(DOC_TYPE_LABELS) as TeachingDocType[]).map((key) => {
            const count = teachingDocs.filter((d) => d.docType === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterType(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterType === key
                    ? 'bg-[#790D16] text-[#F5EFE1]'
                    : 'text-[#5C4946] dark:text-[#C8B9A6] hover:text-[#241716] dark:hover:text-[#F5EFE1]'
                }`}
              >
                {key === 'cp_atp'
                  ? 'CP & ATP'
                  : key === 'prota'
                  ? 'Prota'
                  : key === 'promes'
                  ? 'Promes'
                  : key === 'modul_ajar'
                  ? 'Modul Ajar'
                  : 'KKTP'}{' '}
                ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportMenu
            meta={{
              title: 'Dokumen Perangkat Ajar Guru',
              subtitle:
                filterType === 'all'
                  ? 'CP/ATP, Prota, Promes, Modul Ajar, & KKTP'
                  : DOC_TYPE_LABELS[filterType],
              teacherName: profile?.displayName,
              schoolName: profile?.schoolName,
              academicYear: profile?.academicYear,
              semester: profile?.activeSemester,
              filename: 'perangkat-ajar',
            }}
            columns={[
              { header: 'Jenis', key: 'jenis' },
              { header: 'Judul Dokumen', key: 'judul' },
              { header: 'Fase / Kelas', key: 'fase' },
              { header: 'Semester', key: 'semester' },
              { header: 'Mapel', key: 'mapel' },
              { header: 'Alokasi JP', key: 'jp' },
              { header: 'KKTP', key: 'kktp' },
              { header: 'Status', key: 'status' },
            ]}
            rows={exportRows}
          />
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer no-print"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Perangkat Ajar
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md no-print">
        <Search className="w-4 h-4 text-[#5C4946] dark:text-[#C8B9A6] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari judul CP/ATP, Modul Ajar, atau mata pelajaran..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-sm focus:outline-none focus:border-[#790D16]"
        />
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Jenis Perangkat Ajar</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as TeachingDocType)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            >
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Judul Dokumen</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Modul Ajar Pertemuan 5 — Struktur Data Array"
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
            <label className="block text-xs font-medium mb-1">Fase / Tingkat Kelas</label>
            <input
              type="text"
              required
              value={phaseOrGrade}
              onChange={(e) => setPhaseOrGrade(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Periode Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap' | 'Tahunan')}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
              <option value="Tahunan">Tahunan (Prota)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Alokasi Waktu (JP)</label>
            <input
              type="number"
              min={0}
              max={500}
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Ambang KKTP (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={kktpThreshold}
              onChange={(e) => setKktpThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status Dokumen</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TeachingDocStatus)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            >
              <option value="Draf">Draf</option>
              <option value="Siap Pakai">Siap Pakai</option>
              <option value="Terlaksana">Terlaksana</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium mb-1">
              Capaian Pembelajaran (CP) / Tujuan Pembelajaran (TP)
            </label>
            <textarea
              rows={2}
              value={targetOutcome}
              onChange={(e) => setTargetOutcome(e.target.value)}
              placeholder="Tuliskan rumusan CP, ATP, atau target ketuntasan..."
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium mb-1">
              Rincian Langkah / Struktur Materi / Rubrik KKTP
            </label>
            <textarea
              rows={3}
              value={contentSummary}
              onChange={(e) => setContentSummary(e.target.value)}
              placeholder="Uraikan skenario pembelajaran, distribusi pekan efektif, atau interval kriteria KKTP..."
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
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
              {editingId ? 'Simpan Perubahan' : 'Simpan Dokumen'}
            </button>
          </div>
        </form>
      )}

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] text-center space-y-2">
          <BookOpen className="w-8 h-8 text-[#790D16] dark:text-[#E5D3AF] mx-auto" />
          <p className="text-sm font-medium">Belum ada perangkat ajar pada kategori ini.</p>
          <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
            Klik tombol &ldquo;Tambah Perangkat Ajar&rdquo; untuk menyusun CP/ATP, Prota, Promes, Modul Ajar, atau KKTP.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocs.map((doc) => {
            const isExpanded = expandedId === doc.id;
            return (
              <article
                key={doc.id}
                className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#790D16] dark:text-[#AEC4D4]">
                      {DOC_TYPE_LABELS[doc.docType]} · {doc.subject} · {doc.phaseOrGrade} · Semester {doc.semester}
                    </p>
                    <h3 className="font-display text-base sm:text-lg font-bold text-[#241716] dark:text-[#F5EFE1]">
                      {doc.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 no-print">
                    <span className="text-xs font-mono tabular-nums text-[#5C4946] dark:text-[#C8B9A6]">
                      {doc.durationHours ? `${doc.durationHours} JP` : 'KKTP'} · {doc.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEdit(doc)}
                      aria-label="Edit perangkat ajar"
                      className="p-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDoc(doc.id)}
                      aria-label="Hapus perangkat ajar"
                      className="p-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] text-[#5C4946] hover:text-[#790D16] dark:text-[#C8B9A6] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {doc.targetOutcome && (
                  <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6] leading-relaxed">
                    <strong className="text-[#241716] dark:text-[#F5EFE1] font-medium">Tujuan / Capaian:</strong>{' '}
                    {doc.targetOutcome}
                  </p>
                )}

                {doc.contentSummary && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                      className="text-xs font-medium text-[#790D16] dark:text-[#E5D3AF] hover:underline cursor-pointer no-print"
                    >
                      {isExpanded ? 'Sembunyikan rincian materi' : 'Lihat rincian langkah & alokasi'}
                    </button>
                    {(isExpanded || typeof window === 'undefined') && (
                      <div className="mt-2 p-3.5 rounded-xl bg-[#F5EFE1]/60 dark:bg-[#2A2020] border border-[#E5D3AF]/70 dark:border-[#3D2E2D] text-xs leading-relaxed text-[#241716] dark:text-[#F5EFE1] whitespace-pre-line">
                        {doc.contentSummary}
                        {doc.kktpThreshold !== undefined && (
                          <p className="mt-2 font-mono tabular-nums text-[#790D16] dark:text-[#AEC4D4]">
                            Ambang Ketuntasan (KKTP): {doc.kktpThreshold}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
