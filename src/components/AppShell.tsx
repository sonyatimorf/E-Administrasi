import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Cloud,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { SyncState } from '../hooks/useTeacherData';
import { UserProfile } from '../types';
import { NavTab } from '../views/DashboardView';

interface AppShellProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  profile: UserProfile | null;
  syncState: SyncState;
  darkMode: boolean;
  onToggleDark: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dasbor Harian', shortLabel: 'Dasbor', icon: LayoutDashboard },
  { id: 'schedule', label: 'Jadwal & Kalender', shortLabel: 'Jadwal', icon: CalendarDays },
  { id: 'docs', label: 'Perangkat Ajar', shortLabel: 'Perangkat', icon: BookOpen },
  { id: 'attendance', label: 'Presensi & Jurnal', shortLabel: 'Presensi', icon: ClipboardCheck },
  { id: 'grades', label: 'Nilai & Evaluasi', shortLabel: 'Nilai', icon: GraduationCap },
  { id: 'students', label: 'Siswa & Bimbingan', shortLabel: 'Siswa', icon: Users },
  { id: 'settings', label: 'Profil & Pengaturan', shortLabel: 'Akun', icon: Settings },
];

export function AppShell({
  activeTab,
  onSelectTab,
  profile,
  syncState,
  darkMode,
  onToggleDark,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentItem = NAV_ITEMS.find((i) => i.id === activeTab) || NAV_ITEMS[0];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5EFE1] dark:bg-[#161010] text-[#241716] dark:text-[#F5EFE1] flex">
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#FDFBF7] dark:bg-[#201818] border-r border-[#E5D3AF] dark:border-[#3D2E2D] no-print">
        <div className="px-6 py-5 border-b border-[#E5D3AF]/70 dark:border-[#3D2E2D]">
          <span className="font-display text-xl font-bold tracking-tight text-[#790D16] dark:text-[#E5D3AF]">
            KaryaAjar
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#790D16] text-[#F5EFE1]'
                    : 'text-[#5C4946] dark:text-[#C8B9A6] hover:bg-[#EDE3CE]/60 dark:hover:bg-[#2A2020] hover:text-[#241716] dark:hover:text-[#F5EFE1]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5D3AF]/70 dark:border-[#3D2E2D] space-y-1">
          <p className="text-xs font-semibold text-[#241716] dark:text-[#F5EFE1] truncate">
            {profile?.displayName || 'Guru Pengajar'}
          </p>
          <p className="text-[11px] text-[#5C4946] dark:text-[#C8B9A6] truncate">
            {profile?.schoolName || 'Sekolah'} · TA {profile?.academicYear || '2026/2027'}
          </p>
        </div>
      </aside>

      {/* Mobile Slide-out Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[82vw] bg-[#FDFBF7] dark:bg-[#201818] border-r border-[#E5D3AF] dark:border-[#3D2E2D] flex flex-col z-10">
            <div className="px-5 py-4 border-b border-[#E5D3AF]/70 dark:border-[#3D2E2D] flex items-center justify-between">
              <span className="font-display text-lg font-bold text-[#790D16] dark:text-[#E5D3AF]">
                KaryaAjar
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="p-1.5 rounded-lg text-[#5C4946] dark:text-[#C8B9A6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#790D16] text-[#F5EFE1]'
                        : 'text-[#5C4946] dark:text-[#C8B9A6] hover:bg-[#EDE3CE]/60 dark:hover:bg-[#2A2020]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 bg-[#F5EFE1]/95 dark:bg-[#161010]/95 backdrop-blur border-b border-[#E5D3AF] dark:border-[#3D2E2D] flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#241716] dark:text-[#F5EFE1] hover:bg-[#EDE3CE] dark:hover:bg-[#2A2020]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-sm sm:text-base font-bold text-[#241716] dark:text-[#F5EFE1] truncate">
              {currentItem.label}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#5C4946] dark:text-[#C8B9A6] whitespace-nowrap">
              {syncState === 'offline' ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-[#790D16] dark:text-[#E5D3AF]" />
                  <span>Mode Luring</span>
                </>
              ) : syncState === 'pending' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-[#C4A56D]" />
                  <span>Menyinkronkan...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-[#3B6B8C] dark:text-[#AEC4D4]" />
                  <span>Tersinkronisasi</span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={onToggleDark}
              aria-label="Ubah mode gelap atau terang"
              className="p-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] hover:border-[#790D16] dark:hover:border-[#E5D3AF] transition-colors cursor-pointer"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-[#E5D3AF]" />
              ) : (
                <Moon className="w-4 h-4 text-[#790D16]" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-8 print-only-full">
          {children}
        </main>

        {/* Mobile Bottom Quick Nav (compact height <= 56px, well within 15% mobile sticky cap) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-[#FDFBF7] dark:bg-[#201818] border-t border-[#E5D3AF] dark:border-[#3D2E2D] grid grid-cols-5 no-print">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  isActive
                    ? 'text-[#790D16] dark:text-[#E5D3AF]'
                    : 'text-[#5C4946] dark:text-[#C8B9A6]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[60px]">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
