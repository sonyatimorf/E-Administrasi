import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
}

export interface ExportMeta {
  title: string;
  subtitle?: string;
  teacherName?: string;
  schoolName?: string;
  academicYear?: string;
  semester?: string;
  filename: string;
}

export function exportToPDF(
  meta: ExportMeta,
  columns: ExportColumn[],
  rows: Record<string, string | number>[]
): void {
  const doc = new jsPDF({
    orientation: columns.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header band in #790D16
  doc.setFillColor(121, 13, 22);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 24, 'F');

  doc.setTextColor(245, 239, 225);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.title, 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const subParts = [
    meta.subtitle,
    meta.schoolName,
    meta.academicYear ? `TA ${meta.academicYear}` : undefined,
    meta.semester ? `Semester ${meta.semester}` : undefined,
  ].filter(Boolean);
  doc.text(subParts.join(' · '), 14, 18);

  const head = [columns.map((c) => c.header)];
  const body = rows.map((r) => columns.map((c) => String(r[c.key] ?? '-')));

  autoTable(doc, {
    startY: 30,
    head,
    body,
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [36, 23, 22],
      lineColor: [229, 211, 175],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [121, 13, 22],
      textColor: [245, 239, 225],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 246, 238],
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = Math.min(finalY + 14, pageHeight - 28);

  doc.setFontSize(8.5);
  doc.setTextColor(92, 73, 70);
  const dateLabel = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const rightX = doc.internal.pageSize.getWidth() - 65;
  doc.text(`Dicetak pada: ${dateLabel}`, 14, signY);
  if (meta.teacherName) {
    doc.text('Guru Mata Pelajaran,', rightX, signY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 23, 22);
    doc.text(meta.teacherName, rightX, signY + 14);
  }

  doc.save(`${meta.filename}.pdf`);
}

export function exportToExcel(
  meta: ExportMeta,
  columns: ExportColumn[],
  rows: Record<string, string | number>[]
): void {
  const headerRows: (string | number)[][] = [
    [meta.title],
    [
      [
        meta.subtitle,
        meta.schoolName,
        meta.academicYear ? `TA ${meta.academicYear}` : undefined,
        meta.semester ? `Semester ${meta.semester}` : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
    ],
    meta.teacherName ? [`Guru: ${meta.teacherName}`] : [],
    [],
    columns.map((c) => c.header),
  ].filter((r) => r.length > 0 || r === headerRows[3]);

  const dataRows = rows.map((r) => columns.map((c) => r[c.key] ?? ''));
  const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);

  // Auto-size columns gently
  worksheet['!cols'] = columns.map((col) => ({
    wch: Math.max(
      col.header.length + 4,
      ...rows.map((r) => String(r[col.key] ?? '').length + 2),
      12
    ),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
  XLSX.writeFile(workbook, `${meta.filename}.xlsx`);
}
