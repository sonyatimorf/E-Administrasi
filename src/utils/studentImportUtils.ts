import * as XLSX from 'xlsx';
import { FIELD_LIMITS, StudentGender, StudentStatus } from '../types';

export interface ImportedStudentRow {
  nis: string;
  name: string;
  className: string;
  gender: StudentGender;
  guardianPhone: string;
  status: StudentStatus;
  notes: string;
}

function normalizeGender(val: unknown): StudentGender {
  const s = String(val ?? '').trim().toUpperCase();
  if (s === 'P' || s === 'PEREMPUAN' || s === 'PR' || s === 'W' || s === 'F') {
    return 'P';
  }
  return 'L';
}

function normalizeStatus(val: unknown): StudentStatus {
  const s = String(val ?? '').trim().toLowerCase();
  if (s === 'mutasi' || s === 'pindah') return 'Mutasi';
  if (s === 'lulus' || s === 'alumni') return 'Lulus';
  return 'Aktif';
}

export function downloadStudentImportTemplate(): void {
  const rows = [
    ['NIS', 'Nama Lengkap', 'Kelas', 'L/P', 'No HP Wali', 'Status', 'Catatan'],
    ['260101', 'Alya Putri Ramadhani', 'X RPL 1', 'P', '081234560101', 'Aktif', ''],
    ['260102', 'Bagas Pratama Wijaya', 'X RPL 1', 'L', '081234560102', 'Aktif', ''],
    ['260103', 'Citra Dewi Lestari', 'X RPL 1', 'P', '081234560103', 'Aktif', 'Contoh baris'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 8 },
    { wch: 18 },
    { wch: 12 },
    { wch: 24 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Siswa');
  XLSX.writeFile(wb, 'template-import-siswa.xlsx');
}

function findHeaderKey(keys: string[], candidates: string[]): string | undefined {
  return keys.find((k) => {
    const norm = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return candidates.some((c) => norm === c || norm.includes(c));
  });
}

export async function parseStudentExcelFile(
  file: File,
  fallbackClass: string
): Promise<ImportedStudentRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });
  if (rawRows.length === 0) return [];

  const sampleKeys = Object.keys(rawRows[0]);
  const nisKey = findHeaderKey(sampleKeys, ['nisn', 'nis', 'nomorinduk']);
  const nameKey = findHeaderKey(sampleKeys, ['namalengkap', 'namasiswa', 'nama', 'name']);
  const classKey = findHeaderKey(sampleKeys, ['kelas', 'rombel', 'class']);
  const genderKey = findHeaderKey(sampleKeys, ['lp', 'jeniskelamin', 'jk', 'gender', 'kelamin']);
  const phoneKey = findHeaderKey(sampleKeys, ['nohp', 'hp', 'telepon', 'telp', 'kontak', 'wa', 'phone']);
  const statusKey = findHeaderKey(sampleKeys, ['status']);
  const notesKey = findHeaderKey(sampleKeys, ['catatan', 'keterangan', 'notes']);

  const parsed: ImportedStudentRow[] = [];
  rawRows.forEach((row, index) => {
    const rawName = String(nameKey ? row[nameKey] : Object.values(row)[1] ?? '').trim();
    if (!rawName) return;
    const rawNis = String(nisKey ? row[nisKey] : Object.values(row)[0] ?? '').trim();
    const rawClass = String(classKey ? row[classKey] : fallbackClass).trim();

    parsed.push({
      nis: (rawNis || `AUTO-${index + 1}`).slice(0, FIELD_LIMITS.NIS),
      name: rawName.slice(0, FIELD_LIMITS.DISPLAY_NAME),
      className: (rawClass || fallbackClass || 'X RPL 1').slice(0, FIELD_LIMITS.CLASS_NAME),
      gender: normalizeGender(genderKey ? row[genderKey] : 'L'),
      guardianPhone: String(phoneKey ? row[phoneKey] : '').trim().slice(0, FIELD_LIMITS.PHONE),
      status: normalizeStatus(statusKey ? row[statusKey] : 'Aktif'),
      notes: String(notesKey ? row[notesKey] : '').trim().slice(0, FIELD_LIMITS.NOTES),
    });
  });

  return parsed;
}

export function parseStudentPastedText(
  rawText: string,
  fallbackClass: string
): ImportedStudentRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const parsed: ImportedStudentRow[] = [];

  lines.forEach((line, idx) => {
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length === 0) return;

    // Skip likely header row
    const firstLower = cols[0].toLowerCase();
    const secondLower = (cols[1] || '').toLowerCase();
    if (
      idx === 0 &&
      (firstLower === 'nis' ||
        firstLower === 'nisn' ||
        firstLower === 'no' ||
        secondLower.includes('nama'))
    ) {
      return;
    }

    let nis = '';
    let name = '';
    let className = fallbackClass || 'X RPL 1';
    let gender: StudentGender = 'L';
    let guardianPhone = '';
    let status: StudentStatus = 'Aktif';
    let notes = '';

    if (cols.length === 1) {
      name = cols[0];
      nis = `S-${idx + 1}`;
    } else if (cols.length === 2) {
      nis = cols[0] || `S-${idx + 1}`;
      name = cols[1];
    } else {
      nis = cols[0] || `S-${idx + 1}`;
      name = cols[1];
      if (cols[2]) className = cols[2];
      if (cols[3]) gender = normalizeGender(cols[3]);
      if (cols[4]) guardianPhone = cols[4];
      if (cols[5]) status = normalizeStatus(cols[5]);
      if (cols[6]) notes = cols[6];
    }

    if (!name) return;

    parsed.push({
      nis: nis.slice(0, FIELD_LIMITS.NIS),
      name: name.slice(0, FIELD_LIMITS.DISPLAY_NAME),
      className: className.slice(0, FIELD_LIMITS.CLASS_NAME),
      gender,
      guardianPhone: guardianPhone.slice(0, FIELD_LIMITS.PHONE),
      status,
      notes: notes.slice(0, FIELD_LIMITS.NOTES),
    });
  });

  return parsed;
}
