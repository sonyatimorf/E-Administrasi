import { useEffect, useState } from 'react';
import { Cloud, LogOut, Moon, Save, Sun, WifiOff } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { SyncState } from '../hooks/useTeacherData';
import { SemesterType, UserProfile } from '../types';

interface SettingsProfileViewProps {
  profile: UserProfile | null;
  syncState: SyncState;
  darkMode: boolean;
  onToggleDark: () => void;
  onUpdateProfile: (
    updates: Partial<
      Pick<
        UserProfile,
        'displayName' | 'schoolName' | 'nip' | 'subject' | 'academicYear' | 'activeSemester' | 'kkmDefault'
      >
    >
  ) => Promise<void>;
}

export function SettingsProfileView({
  profile,
  syncState,
  darkMode,
  onToggleDark,
  onUpdateProfile,
}: SettingsProfileViewProps) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [schoolName, setSchoolName] = useState(profile?.schoolName || '');
  const [nip, setNip] = useState(profile?.nip || '');
  const [subject, setSubject] = useState(profile?.subject || '');
  const [academicYear, setAcademicYear] = useState(profile?.academicYear || '2026/2027');
  const [activeSemester, setActiveSemester] = useState<SemesterType>(profile?.activeSemester || 'Ganjil');
  const [kkmDefault, setKkmDefault] = useState(profile?.kkmDefault || 75);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setSchoolName(profile.schoolName || '');
      setNip(profile.nip || '');
      setSubject(profile.subject || '');
      setAcademicYear(profile.academicYear || '2026/2027');
      setActiveSemester(profile.activeSemester || 'Ganjil');
      setKkmDefault(profile.kkmDefault ?? 75);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      displayName,
      schoolName,
      nip,
      subject,
      academicYear,
      activeSemester,
      kkmDefault,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-bold">Identitas Guru & Tahun Pelajaran</h2>
          <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
            Informasi ini otomatis tercantum pada kepala dokumen laporan PDF dan Excel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Nama Lengkap & Gelar</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">NIP / NUPTK</label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Nama Satuan Pendidikan</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Mata Pelajaran Utama</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tahun Pelajaran</label>
            <input
              type="text"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Semester Aktif</label>
              <select
                value={activeSemester}
                onChange={(e) => setActiveSemester(e.target.value as SemesterType)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">KKTP Standar</label>
              <input
                type="number"
                min={0}
                max={100}
                value={kkmDefault}
                onChange={(e) => setKkmDefault(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#161010] text-sm font-mono"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center justify-between pt-2">
            <span className="text-xs text-[#3B6B8C] dark:text-[#AEC4D4]">
              {savedNotice ? 'Profil dan tahun ajaran berhasil disimpan.' : profile?.email || ''}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] text-xs font-medium cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg font-bold">Tampilan, Sinkronisasi & Sesi Akun</h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[#E5D3AF]/60 dark:border-[#3D2E2D]">
          <div>
            <p className="text-sm font-medium">Mode Gelap (Kenyamanan Malam Hari)</p>
            <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
              Mengurangi silau layar saat merekap nilai atau menyusun modul ajar di malam hari.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDark}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#F5EFE1]/60 dark:bg-[#2A2020] text-xs font-medium cursor-pointer self-start sm:self-auto"
          >
            {darkMode ? <Sun className="w-4 h-4 text-[#E5D3AF]" /> : <Moon className="w-4 h-4 text-[#790D16]" />}
            {darkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[#E5D3AF]/60 dark:border-[#3D2E2D]">
          <div className="flex items-start gap-2.5">
            {syncState === 'offline' ? (
              <WifiOff className="w-4 h-4 text-[#790D16] dark:text-[#E5D3AF] mt-0.5 shrink-0" />
            ) : (
              <Cloud className="w-4 h-4 text-[#3B6B8C] dark:text-[#AEC4D4] mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                Status Cloud & Mode Luring:{' '}
                {syncState === 'offline'
                  ? 'Mode Luring Aktif (Perubahan disimpan lokal)'
                  : syncState === 'pending'
                  ? 'Menyinkronkan perubahan ke cloud...'
                  : 'Tersinkronisasi Penuh'}
              </p>
              <p className="text-xs text-[#5C4946] dark:text-[#C8B9A6]">
                Cache IndexedDB persisten memungkinkan Anda mengedit jadwal, nilai, dan presensi tanpa internet.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#790D16]/40 text-[#790D16] dark:text-[#E5D3AF] text-xs font-medium hover:bg-[#790D16] hover:text-[#F5EFE1] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar dari Akun
          </button>
        </div>
      </section>
    </div>
  );
}
