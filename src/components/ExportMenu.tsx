import { FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { ExportColumn, ExportMeta, exportToExcel, exportToPDF } from '../utils/exportUtils';

interface ExportMenuProps {
  meta: ExportMeta;
  columns: ExportColumn[];
  rows: Record<string, string | number>[];
  disabled?: boolean;
}

export function ExportMenu({ meta, columns, rows, disabled }: ExportMenuProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <button
        type="button"
        disabled={disabled || rows.length === 0}
        onClick={() => exportToPDF(meta, columns, rows)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-xs font-medium text-[#241716] dark:text-[#F5EFE1] hover:border-[#790D16] dark:hover:border-[#E5D3AF] disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <FileText className="w-3.5 h-3.5 text-[#790D16] dark:text-[#E5D3AF]" />
        Unduh PDF
      </button>
      <button
        type="button"
        disabled={disabled || rows.length === 0}
        onClick={() => exportToExcel(meta, columns, rows)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-xs font-medium text-[#241716] dark:text-[#F5EFE1] hover:border-[#790D16] dark:hover:border-[#E5D3AF] disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-[#3B6B8C] dark:text-[#AEC4D4]" />
        Unduh Excel
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5D3AF] dark:border-[#3D2E2D] bg-[#FDFBF7] dark:bg-[#201818] text-xs font-medium text-[#241716] dark:text-[#F5EFE1] hover:border-[#790D16] dark:hover:border-[#E5D3AF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5 text-[#5C4946] dark:text-[#C8B9A6]" />
        Cetak
      </button>
    </div>
  );
}
