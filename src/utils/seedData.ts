import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

function formatDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function seedInitialTeacherData(
  userId: string,
  displayName: string,
  email: string
): Promise<void> {
  const now = serverTimestamp();
  const today = formatDateOffset(0);
  const currentMonth = today.slice(0, 7);
  const prevMonthDate = formatDateOffset(-28);
  const prevMonth = prevMonthDate.slice(0, 7);

  // 1. User Profile (created first so parentUserExists passes for subcollections)
  try {
    await setDoc(doc(db, `users/${userId}`), {
      teacherId: userId,
      displayName: displayName.slice(0, 120) || 'Guru Pengajar',
      email: email.slice(0, 180),
      schoolName: 'SMK Negeri 2 Nusantara',
      nip: '198904152019032008',
      subject: 'Informatika & Rekayasa Perangkat Lunak',
      academicYear: '2026/2027',
      activeSemester: 'Ganjil',
      kkmDefault: 75,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}`);
  }

  const batch = writeBatch(db);

  // 2. Students (X RPL 1 & XI RPL 2)
  const students = [
    { id: 'stu_01', nis: '260101', name: 'Alya Putri Ramadhani', className: 'X RPL 1', gender: 'P', guardianPhone: '081234560101', status: 'Aktif', notes: 'Aktif berdiskusi di kelas' },
    { id: 'stu_02', nis: '260102', name: 'Bagas Pratama Wijaya', className: 'X RPL 1', gender: 'L', guardianPhone: '081234560102', status: 'Aktif', notes: 'Perlu pendampingan logika algoritma' },
    { id: 'stu_03', nis: '260103', name: 'Citra Dewi Lestari', className: 'X RPL 1', gender: 'P', guardianPhone: '081234560103', status: 'Aktif', notes: 'Juara 2 LKS Web Design tingkat kota' },
    { id: 'stu_04', nis: '260104', name: 'Dimas Arya Saputra', className: 'X RPL 1', gender: 'L', guardianPhone: '081234560104', status: 'Aktif', notes: '' },
    { id: 'stu_05', nis: '260105', name: 'Eka Nurul Hidayah', className: 'X RPL 1', gender: 'P', guardianPhone: '081234560105', status: 'Aktif', notes: '' },
    { id: 'stu_06', nis: '260106', name: 'Fajar Ramadhan Hakim', className: 'X RPL 1', gender: 'L', guardianPhone: '081234560106', status: 'Aktif', notes: 'Sering terlambat jam pertama' },
    { id: 'stu_07', nis: '250201', name: 'Gita Sekar Sari', className: 'XI RPL 2', gender: 'P', guardianPhone: '081234560201', status: 'Aktif', notes: '' },
    { id: 'stu_08', nis: '250202', name: 'Hendra Kusuma Putra', className: 'XI RPL 2', gender: 'L', guardianPhone: '081234560202', status: 'Aktif', notes: '' },
    { id: 'stu_09', nis: '250203', name: 'Intan Permata Sari', className: 'XI RPL 2', gender: 'P', guardianPhone: '081234560203', status: 'Aktif', notes: 'Koordinator kelompok proyek' },
    { id: 'stu_10', nis: '250204', name: 'Joko Prasetyo Nugroho', className: 'XI RPL 2', gender: 'L', guardianPhone: '081234560204', status: 'Aktif', notes: '' },
  ];

  for (const s of students) {
    batch.set(doc(db, `users/${userId}/students/${s.id}`), {
      teacherId: userId,
      nis: s.nis,
      name: s.name,
      className: s.className,
      gender: s.gender,
      guardianPhone: s.guardianPhone,
      status: s.status,
      notes: s.notes,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 3. Weekly Teaching Schedules (ensure current day & upcoming hours appear cleanly)
  const jsDay = new Date().getDay();
  const todayIso = jsDay === 0 ? 7 : jsDay;
  const schedules = [
    { id: 'sch_01', dayOfWeek: 1, startTime: '07:15', endTime: '09:30', className: 'X RPL 1', subject: 'Dasar Pemrograman', room: 'Lab Komputer 1', topic: 'Struktur Percabangan & Perulangan', semester: 'Ganjil' },
    { id: 'sch_02', dayOfWeek: 2, startTime: '10:00', endTime: '12:15', className: 'XI RPL 2', subject: 'Pemrograman Web', room: 'Lab Komputer 2', topic: 'Integrasi REST API & State', semester: 'Ganjil' },
    { id: 'sch_03', dayOfWeek: todayIso, startTime: '08:00', endTime: '10:15', className: 'X RPL 1', subject: 'Informatika', room: 'Lab Komputer 1', topic: 'Analisis Data & Visualisasi Tabel', semester: 'Ganjil' },
    { id: 'sch_04', dayOfWeek: todayIso, startTime: '21:15', endTime: '22:30', className: 'XI RPL 2', subject: 'Basis Data', room: 'Lab Komputer 2', topic: 'Normalisasi Tabel & Relasi SQL', semester: 'Ganjil' },
    { id: 'sch_05', dayOfWeek: 4, startTime: '07:15', endTime: '09:30', className: 'XI RPL 2', subject: 'Pemrograman Web', room: 'Lab Komputer 2', topic: 'Autentikasi & Keamanan Form', semester: 'Ganjil' },
    { id: 'sch_06', dayOfWeek: 5, startTime: '08:00', endTime: '10:15', className: 'X RPL 1', subject: 'Dasar Pemrograman', room: 'Ruang Teori 4', topic: 'Review Proyek Mini Algoritma', semester: 'Ganjil' },
  ];

  for (const sch of schedules) {
    batch.set(doc(db, `users/${userId}/schedules/${sch.id}`), {
      teacherId: userId,
      dayOfWeek: sch.dayOfWeek,
      startTime: sch.startTime,
      endTime: sch.endTime,
      className: sch.className,
      subject: sch.subject,
      room: sch.room,
      topic: sch.topic,
      semester: sch.semester,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 4. Academic Calendar Events
  const events = [
    { id: 'evt_01', title: 'Hari Guru Nasional & Upacara', date: `${currentMonth}-25`, endDate: '', category: 'kegiatan_sekolah', description: 'Upacara bendera dan refleksi pembelajaran bersama seluruh dewan guru.' },
    { id: 'evt_02', title: 'Penilaian Akhir Semester (PAS) Ganjil', date: formatDateOffset(10), endDate: formatDateOffset(17), category: 'ujian', description: 'Pelaksanaan asesmen sumatif akhir semester ganjil berbasis komputer.' },
    { id: 'evt_03', title: 'Class Meeting & Remedial Terjadwal', date: formatDateOffset(19), endDate: formatDateOffset(21), category: 'efektif', description: 'Pengolahan nilai rapor, program remedial tuntas KKTP, dan kegiatan OSIS.' },
    { id: 'evt_04', title: 'Libur Hari Raya Natal', date: '2026-12-25', endDate: '', category: 'libur_nasional', description: 'Hari libur nasional sesuai SKB 3 Menteri.' },
    { id: 'evt_05', title: 'Libur Akhir Semester Ganjil', date: '2026-12-26', endDate: '2027-01-03', category: 'libur_sekolah', description: 'Libur semester ganjil tahun pelajaran 2026/2027.' },
  ];

  for (const ev of events) {
    batch.set(doc(db, `users/${userId}/academicEvents/${ev.id}`), {
      teacherId: userId,
      title: ev.title,
      date: ev.date,
      endDate: ev.endDate,
      category: ev.category,
      description: ev.description,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 5. Perangkat Ajar (CP/ATP, Prota, Promes, Modul Ajar, KKTP)
  const docs = [
    {
      id: 'doc_01',
      docType: 'cp_atp',
      title: 'CP & ATP Fase E — Algoritma & Pemrograman Dasar',
      phaseOrGrade: 'Fase E / Kelas X',
      semester: 'Ganjil',
      subject: 'Informatika',
      targetOutcome: 'Peserta didik mampu memahami konsep variabel, tipe data, percabangan, perulangan, dan menyusun program terstruktur.',
      kktpThreshold: 75,
      durationHours: 36,
      contentSummary: 'Alur TP 1: Pengenalan Berpikir Komputasional (8 JP) -> TP 2: Flowchart & Pseudocode (10 JP) -> TP 3: Implementasi Percabangan & Loop (18 JP).',
      status: 'Siap Pakai',
    },
    {
      id: 'doc_02',
      docType: 'prota',
      title: 'Program Tahunan (Prota) Informatika TA 2026/2027',
      phaseOrGrade: 'Kelas X RPL',
      semester: 'Tahunan',
      subject: 'Informatika',
      targetOutcome: 'Distribusi alokasi waktu efektif 108 JP selama 2 semester mencakup Berpikir Komputasional, Analisis Data, dan Pemrograman.',
      kktpThreshold: 75,
      durationHours: 108,
      contentSummary: 'Semester Ganjil: 54 JP (3 Unit Kompetensi + Sumatif). Semester Genap: 54 JP (3 Unit Proyek + Uji Kompetensi).',
      status: 'Terlaksana',
    },
    {
      id: 'doc_03',
      docType: 'promes',
      title: 'Program Semester (Promes) Ganjil — Pemrograman Web',
      phaseOrGrade: 'Kelas XI RPL',
      semester: 'Ganjil',
      subject: 'Pemrograman Web',
      targetOutcome: 'Pemetaan minggu efektif Juli–Desember termasuk jadwal Formatif, PTS, dan PAS.',
      kktpThreshold: 78,
      durationHours: 72,
      contentSummary: 'Juli-Agustus: HTML Semantik & CSS Grid (18 JP). September: JS DOM & Async (18 JP). Oktober: PTS & API Integration (18 JP). November-Desember: Proyek Web & PAS (18 JP).',
      status: 'Siap Pakai',
    },
    {
      id: 'doc_04',
      docType: 'modul_ajar',
      title: 'Modul Ajar: Normalisasi Basis Data Relasional (1NF - 3NF)',
      phaseOrGrade: 'Fase F / Kelas XI',
      semester: 'Ganjil',
      subject: 'Basis Data',
      targetOutcome: 'Siswa mampu merancang ERD bebas anomali dan mengimplementasikan skema relasional dalam SQL.',
      kktpThreshold: 78,
      durationHours: 6,
      contentSummary: 'Model Problem Based Learning. Pemantik: studi kasus duplikasi data perpustakaan sekolah. Aktivitas: diskusi kelompok merancang 3NF. Asesmen: rubrik rancangan skema.',
      status: 'Siap Pakai',
    },
    {
      id: 'doc_05',
      docType: 'kktp',
      title: 'Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) Interval Nilai',
      phaseOrGrade: 'Fase E & F',
      semester: 'Ganjil',
      subject: 'Informatika & RPL',
      targetOutcome: 'Penetapan interval ketuntasan: 0-59 Belum Mencapai (Remedial seluruh bagian), 60-74 Belum Mencapai (Remedial bagian tertentu), 75-89 Tuntas, 90-100 Tuntas + Pengayaan.',
      kktpThreshold: 75,
      durationHours: 0,
      contentSummary: 'Menggunakan pendekatan interval nilai deskriptif & rubrik 4 kriteria (Baru Berkembang, Layak, Cakap, Mahir).',
      status: 'Terlaksana',
    },
  ];

  for (const d of docs) {
    batch.set(doc(db, `users/${userId}/teachingDocs/${d.id}`), {
      teacherId: userId,
      ...d,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 6. Attendance Sessions
  batch.set(doc(db, `users/${userId}/attendance/att_01`), {
    teacherId: userId,
    date: formatDateOffset(-2),
    className: 'X RPL 1',
    subject: 'Dasar Pemrograman',
    semester: 'Ganjil',
    records: {
      stu_01: 'H',
      stu_02: 'H',
      stu_03: 'H',
      stu_04: 'I',
      stu_05: 'H',
      stu_06: 'S',
    },
    notes: 'Dimas izin lomba pramuka, Fajar surat sakit dari orang tua.',
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, `users/${userId}/attendance/att_02`), {
    teacherId: userId,
    date: formatDateOffset(-1),
    className: 'XI RPL 2',
    subject: 'Pemrograman Web',
    semester: 'Ganjil',
    records: {
      stu_07: 'H',
      stu_08: 'H',
      stu_09: 'H',
      stu_10: 'A',
    },
    notes: 'Joko tanpa keterangan, perlu konfirmasi wali kelas.',
    createdAt: now,
    updatedAt: now,
  });

  // 7. Teaching Journals
  batch.set(doc(db, `users/${userId}/journals/jrn_01`), {
    teacherId: userId,
    date: formatDateOffset(-2),
    className: 'X RPL 1',
    subject: 'Dasar Pemrograman',
    meetingNo: 14,
    topic: 'Implementasi Perulangan For dan While pada Studi Kasus Kasir',
    learningActivity: 'Demonstrasi live coding, latihan mandiri membuat program hitung total belanja dengan diskon bertingkat.',
    studentProgressNote: 'Alya dan Citra menyelesaikan tantangan bonus lebih cepat. Bagas masih bingung menentukan kondisi berhenti while-loop.',
    reflection: 'Pertemuan berikutnya perlu tambahan lembar kerja visual tracing loop selama 15 menit.',
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, `users/${userId}/journals/jrn_02`), {
    teacherId: userId,
    date: formatDateOffset(-1),
    className: 'XI RPL 2',
    subject: 'Pemrograman Web',
    meetingNo: 16,
    topic: 'Integrasi Fetch API dan Penanganan Error Loading State',
    learningActivity: 'Praktik berpasangan menampilkan data cuaca dan katalog buku dari endpoint JSON.',
    studentProgressNote: 'Kelompok Intan sudah menerapkan skeleton loading dengan rapi. Hendra butuh bimbingan konsep async/await.',
    reflection: 'Siswa antusias saat melihat data nyata tampil di antarmuka web mereka.',
    createdAt: now,
    updatedAt: now,
  });

  // 8. Assessments & Grades
  batch.set(doc(db, `users/${userId}/assessments/asg_01`), {
    teacherId: userId,
    title: 'Sumatif 1 — Logika & Flowchart',
    category: 'sumatif',
    className: 'X RPL 1',
    subject: 'Informatika',
    semester: 'Ganjil',
    month: prevMonth,
    date: prevMonthDate,
    maxScore: 100,
    kktp: 75,
    instrumentNotes: '10 soal pilihan ganda analisis alur + 2 soal studi kasus pembuatan flowchart.',
    scores: {
      stu_01: { score: 88, isEnrichment: false, feedback: 'Pemahaman alur sangat baik' },
      stu_02: { score: 66, remedialScore: 78, remedialPlan: 'Latihan terbimbing simbol percabangan', feedback: 'Tuntas setelah remedial' },
      stu_03: { score: 96, isEnrichment: true, enrichmentNote: 'Proyek mini konverter bilangan', feedback: 'Sangat mahir' },
      stu_04: { score: 80, isEnrichment: false, feedback: '' },
      stu_05: { score: 76, isEnrichment: false, feedback: '' },
      stu_06: { score: 62, remedialScore: null, remedialPlan: 'Jadwal remedial Jumat siang', feedback: 'Perlu bimbingan intensif' },
    },
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, `users/${userId}/assessments/asg_02`), {
    teacherId: userId,
    title: 'Praktik 2 — Visualisasi & Pivot Tabel',
    category: 'praktik',
    className: 'X RPL 1',
    subject: 'Informatika',
    semester: 'Ganjil',
    month: currentMonth,
    date: formatDateOffset(-3),
    maxScore: 100,
    kktp: 75,
    instrumentNotes: 'Rubrik praktik pengolahan dataset sekolah menjadi grafik perbandingan.',
    scores: {
      stu_01: { score: 92, isEnrichment: true, enrichmentNote: 'Eksplorasi dashboard interaktif', feedback: 'Rapi dan akurat' },
      stu_02: { score: 70, remedialScore: null, remedialPlan: 'Ulang bagian filter agregasi', feedback: 'Kurang 5 poin dari KKTP' },
      stu_03: { score: 95, isEnrichment: true, enrichmentNote: 'Asisten tutor sebaya', feedback: 'Sangat baik' },
      stu_04: { score: 84, isEnrichment: false, feedback: '' },
      stu_05: { score: 79, isEnrichment: false, feedback: '' },
      stu_06: { score: 68, remedialScore: null, remedialPlan: 'Klinik praktik di lab', feedback: 'Belum selesai grafik kedua' },
    },
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, `users/${userId}/assessments/asg_03`), {
    teacherId: userId,
    title: 'Sumatif Tengah Semester — Pemrograman Web',
    category: 'pts',
    className: 'XI RPL 2',
    subject: 'Pemrograman Web',
    semester: 'Ganjil',
    month: currentMonth,
    date: formatDateOffset(-5),
    maxScore: 100,
    kktp: 78,
    instrumentNotes: 'Uji kompetensi membangun komponen form validasi responsif.',
    scores: {
      stu_07: { score: 86, isEnrichment: false, feedback: '' },
      stu_08: { score: 72, remedialScore: null, remedialPlan: 'Perbaikan validasi JavaScript', feedback: 'Perlu remedial' },
      stu_09: { score: 94, isEnrichment: true, enrichmentNote: 'Integrasi localStorage & filter', feedback: 'Sangat baik' },
      stu_10: { score: 81, isEnrichment: false, feedback: '' },
    },
    createdAt: now,
    updatedAt: now,
  });

  // 9. Guidance & Follow-Up Notes
  batch.set(doc(db, `users/${userId}/guidanceNotes/gdn_01`), {
    teacherId: userId,
    studentId: 'stu_02',
    studentName: 'Bagas Pratama Wijaya',
    className: 'X RPL 1',
    date: formatDateOffset(-2),
    category: 'akademik',
    issueSummary: 'Nilai praktik analisis data (70) dan pemahaman kondisi loop masih di bawah KKTP 75.',
    followUpPlan: 'Diberikan modul latihan bertahap 3 soal dasar + sesi pendampingan 20 menit sepulang sekolah.',
    status: 'dalam_bimbingan',
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, `users/${userId}/guidanceNotes/gdn_02`), {
    teacherId: userId,
    studentId: 'stu_10',
    studentName: 'Joko Prasetyo Nugroho',
    className: 'XI RPL 2',
    date: formatDateOffset(-1),
    category: 'kehadiran',
    issueSummary: 'Tidak hadir tanpa keterangan pada jam mata pelajaran Pemrograman Web.',
    followUpPlan: 'Koordinasi dengan wali kelas XI RPL 2 dan konfirmasi via pesan ke wali murid.',
    status: 'perlu_tindak_lanjut',
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db, `users/${userId}/guidanceNotes/gdn_03`), {
    teacherId: userId,
    studentId: 'stu_03',
    studentName: 'Citra Dewi Lestari',
    className: 'X RPL 1',
    date: formatDateOffset(-4),
    category: 'prestasi',
    issueSummary: 'Konsisten memperoleh nilai di atas 95 dan menunjukkan kemampuan membimbing teman sebaya.',
    followUpPlan: 'Direkomendasikan mengikuti pembinaan tim LKS Web Technologies sekolah.',
    status: 'selesai',
    createdAt: now,
    updatedAt: now,
  });

  // 10. Daily Tasks
  const tasks = [
    { id: 'tsk_01', title: 'Input nilai remedial Bagas & Fajar untuk Sumatif 1', dueDate: today, dueTime: '14:00', priority: 'tinggi', category: 'Penilaian', completed: false },
    { id: 'tsk_02', title: 'Siapkan soal kisi-kisi PAS Informatika Kelas X', dueDate: today, dueTime: '16:00', priority: 'tinggi', category: 'Perangkat Ajar', completed: false },
    { id: 'tsk_03', title: 'Cetak rekapitulasi presensi bulan berjalan untuk arsip BK', dueDate: formatDateOffset(1), dueTime: '10:00', priority: 'sedang', category: 'Presensi', completed: true },
    { id: 'tsk_04', title: 'Konfirmasi kehadiran Joko dengan wali kelas XI RPL 2', dueDate: today, dueTime: '13:00', priority: 'sedang', category: 'Bimbingan', completed: false },
  ];

  for (const t of tasks) {
    batch.set(doc(db, `users/${userId}/dailyTasks/${t.id}`), {
      teacherId: userId,
      ...t,
      createdAt: now,
      updatedAt: now,
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}
