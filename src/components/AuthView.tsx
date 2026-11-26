import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { BookOpenCheck, Cloud, FileSpreadsheet, Moon, ShieldCheck, Sun, WifiOff } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

interface AuthViewProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

export function AuthView({ darkMode, onToggleDark }: AuthViewProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5EFE1] dark:bg-[#161010] text-[#241716] dark:text-[#F5EFE1] flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-8">
        <span className="font-display text-xl font-bold tracking-tight text-[#790D16] dark:text-[#E5D3AF] whitespace-nowrap shrink-0">
          KaryaAjar
        </span>
        <button
          type="button"
          onClick={onToggleDark}
          aria-label="Ubah mode tampilan"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-xs font-medium hover:border-[#790D16] dark:hover:border-[#E5D3AF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {darkMode ? <Sun className="w-4 h-4 text-[#E5D3AF]" /> : <Moon className="w-4 h-4 text-[#790D16]" />}
          {darkMode ? 'Mode Terang' : 'Mode Gelap'}
        </button>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 md:py-16 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <p className="text-xs font-medium tracking-wide text-[#790D16] dark:text-[#AEC4D4]">
            Administrasi Guru Terpadu · Kurikulum Merdeka · Sinkronisasi Lintas Perangkat
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance text-[#241716] dark:text-[#F5EFE1]">
            Satu ruang kerja rapi untuk seluruh administrasi mengajar Anda.
          </h1>
          <p className="text-base leading-relaxed text-[#5C4946] dark:text-[#C8B9A6] max-w-2xl">
            Kelola rekap nilai otomatis, laporan bulanan PDF & Excel, presensi siswa real-time, perangkat ajar lengkap, jurnal harian, dan catatan bimbingan dari HP, tablet, maupun komputer—tetap dapat diedit saat luring.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#790D16] dark:text-[#E5D3AF]">
                <Cloud className="w-4 h-4" />
                <span>Sinkronisasi Cloud & Mode Luring</span>
              </div>
              <p className="text-xs leading-relaxed text-[#5C4946] dark:text-[#C8B9A6]">
                Data tersimpan otomatis ke cloud dan tetap bisa diedit tanpa koneksi internet.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#790D16] dark:text-[#E5D3AF]">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Laporan PDF & Excel Sekali Klik</span>
              </div>
              <p className="text-xs leading-relaxed text-[#5C4946] dark:text-[#C8B9A6]">
                Ekspor daftar nilai bulanan, presensi semester, jurnal, dan perangkat ajar.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#790D16] dark:text-[#E5D3AF]">
                <BookOpenCheck className="w-4 h-4" />
                <span>Perangkat Ajar & Evaluasi KKTP</span>
              </div>
              <p className="text-xs leading-relaxed text-[#5C4946] dark:text-[#C8B9A6]">
                CP/ATP, Prota, Promes, Modul Ajar, KKTP, hingga program remedial & pengayaan.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#790D16] dark:text-[#E5D3AF]">
                <WifiOff className="w-4 h-4" />
                <span>Pengingat Jadwal & Kalender Akademik</span>
              </div>
              <p className="text-xs leading-relaxed text-[#5C4946] dark:text-[#C8B9A6]">
                Pantau jadwal mengajar mendatang, hari libur sekolah, dan rencana tugas harian.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="p-7 sm:p-8 rounded-2xl bg-[#FDFBF7] dark:bg-[#201818] border border-[#E5D3AF] dark:border-[#3D2E2D] space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-[#241716] dark:text-[#F5EFE1]">
                Masuk ke Ruang Kerja Guru
              </h2>
              <p className="text-sm text-[#5C4946] dark:text-[#C8B9A6]">
                Gunakan akun Google Anda untuk menyinkronkan seluruh data administrasi secara aman.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#790D16]/10 border border-[#790D16]/30 text-xs text-[#790D16] dark:text-[#F5EFE1]">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-5 rounded-xl bg-[#790D16] hover:bg-[#610A11] text-[#F5EFE1] font-medium text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"
                />
              </svg>
              <span>{loading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
            </button>

            <div className="pt-4 border-t border-[#E5D3AF]/70 dark:border-[#3D2E2D] flex items-start gap-2.5 text-xs text-[#5C4946] dark:text-[#C8B9A6]">
              <ShieldCheck className="w-4 h-4 text-[#790D16] dark:text-[#AEC4D4] shrink-0 mt-0.5" />
              <span>
                Akses pribadi terenkripsi: data siswa, nilai, dan perangkat ajar hanya dapat dibuka oleh akun Anda. Data contoh siap pakai tersedia otomatis saat pertama kali masuk.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
