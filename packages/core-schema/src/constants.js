export const SCHEMA_VERSION = 3;
export const APP_VERSION = '1.0.0';
export const TEMPLATE_VERSION = '2026.1';

export const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const DAYS_SHORT_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** 4 seviyeli kısıt öncelik sistemi */
export const ConstraintLevel = Object.freeze({
  HARD: 'HARD',             // Kesinlikle zorunlu (hiçbir PASS'ta esnetilmez)
  HIGH: 'HIGH',             // Yüksek öncelikli
  NORMAL: 'NORMAL',         // Normal öncelikli
  PREFERENCE: 'PREFERENCE'  // Kullanıcı tercihi
});

export const DEFAULT_CONSTRAINT_WEIGHTS = Object.freeze({
  HARD: 1_000_000,
  HIGH: 100,
  NORMAL: 25,
  PREFERENCE: 5
});

/** Ortak çözüm durumları (tüm 6 motor bu durumlara eşlenir) */
export const SolverStatus = Object.freeze({
  OPTIMAL: 'OPTIMAL',
  FEASIBLE: 'FEASIBLE',
  PARTIAL: 'PARTIAL',
  INFEASIBLE: 'INFEASIBLE',
  UNKNOWN: 'UNKNOWN',
  TIME_LIMIT: 'TIME_LIMIT',
  CANCELLED: 'CANCELLED',
  ERROR: 'ERROR'
});

/** Derslik türleri */
export const RoomType = Object.freeze({
  CLASSROOM: 'classroom',
  LAB_SCIENCE: 'lab_science',
  LAB_PHYSICS: 'lab_physics',
  LAB_CHEMISTRY: 'lab_chemistry',
  LAB_BIOLOGY: 'lab_biology',
  LAB_COMPUTER: 'lab_computer',
  WORKSHOP: 'workshop',
  GYM: 'gym',
  MUSIC: 'music',
  ART: 'art',
  LIBRARY: 'library',
  CONFERENCE: 'conference',
  OTHER: 'other'
});

/** Eğitim düzeni */
export const EducationMode = Object.freeze({
  FULL_DAY: 'full_day',
  DUAL_SHIFT: 'dual_shift'
});

export const ShiftType = Object.freeze({
  FULL: 'full',
  MORNING: 'morning',
  AFTERNOON: 'afternoon'
});

/** MEB TTKB kurum türleri (gruplandırılmış) */
export const SchoolTypes = Object.freeze([
  // 1. Ortaokul Kurumları (5–8. Sınıf)
  { id: 'ortaokul', group: 'oo', name: 'Ortaokul', grades: [5, 6, 7, 8], defaultPeriods: 7 },
  { id: 'imam_hatip_ortaokulu', group: 'oo', name: 'İmam Hatip Ortaokulu', grades: [5, 6, 7, 8], defaultPeriods: 8 },
  { id: 'spor_ortaokulu', group: 'oo', name: 'Spor Ortaokulu', grades: [5, 6, 7, 8], defaultPeriods: 8 },
  { id: 'guzel_sanatlar_muzik_ortaokulu', group: 'oo', name: 'Güzel Sanatlar Müzik Ortaokulu', grades: [5, 6, 7, 8], defaultPeriods: 8 },
  // 2. Genel Ortaöğretim — Anadolu, Fen ve Sosyal Bilimler Liseleri
  { id: 'anadolu_lisesi', group: 'lise_genel', name: 'Anadolu Lisesi', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'anadolu_lisesi_hazirlik', group: 'lise_genel', name: 'Hazırlık Sınıfı Bulunan Anadolu Lisesi', grades: [0, 9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'fen_lisesi', group: 'lise_genel', name: 'Fen Lisesi', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'fen_lisesi_hazirlik', group: 'lise_genel', name: 'Hazırlık Sınıfı Bulunan Fen Lisesi', grades: [0, 9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'sosyal_bilimler_lisesi', group: 'lise_genel', name: 'Sosyal Bilimler Lisesi', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'sosyal_bilimler_lisesi_hazirlik', group: 'lise_genel', name: 'Hazırlık Sınıfı Bulunan Sosyal Bilimler Lisesi', grades: [0, 9, 10, 11, 12], defaultPeriods: 8 },
  // 3. Özel Program Uygulayan Proje Liseleri (45 Saat · Hazırlık + 9–12)
  { id: 'ozel_program_anadolu_lisesi', group: 'lise_proje', name: 'Özel Program Uygulayan Hazırlık Sınıfı Bulunan Anadolu Lisesi', grades: [0, 9, 10, 11, 12], defaultPeriods: 9 },
  { id: 'ozel_program_fen_lisesi', group: 'lise_proje', name: 'Özel Program Uygulayan Fen Lisesi', grades: [0, 9, 10, 11, 12], defaultPeriods: 9 },
  { id: 'ozel_program_sosyal_bilimler_lisesi', group: 'lise_proje', name: 'Özel Program Uygulayan Sosyal Bilimler Lisesi', grades: [0, 9, 10, 11, 12], defaultPeriods: 9 },
  // 4. İmam Hatip Liseleri
  { id: 'anadolu_imam_hatip_lisesi', group: 'lise_ihl', name: 'Anadolu İmam Hatip Lisesi', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'anadolu_imam_hatip_lisesi_hazirlik', group: 'lise_ihl', name: 'Hazırlık Sınıfı Bulunan Anadolu İmam Hatip Lisesi', grades: [0, 9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'anadolu_imam_hatip_lisesi_fsb', group: 'lise_ihl', name: 'Anadolu İmam Hatip Lisesi — Fen ve Sosyal Bilimler Programı', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  // 5. Güzel Sanatlar ve Spor Liseleri
  { id: 'gsl_gorsel_sanatlar', group: 'lise_gsl_spor', name: 'Güzel Sanatlar Lisesi — Görsel Sanatlar', grades: [9, 10, 11, 12], defaultPeriods: 9 },
  { id: 'gsl_tiyatro', group: 'lise_gsl_spor', name: 'Güzel Sanatlar Lisesi — Tiyatro', grades: [9, 10, 11, 12], defaultPeriods: 9 },
  { id: 'gsl_muzik', group: 'lise_gsl_spor', name: 'Güzel Sanatlar Lisesi — Müzik', grades: [9, 10, 11, 12], defaultPeriods: 9 },
  { id: 'gsl_turk_muzigi', group: 'lise_gsl_spor', name: 'Güzel Sanatlar Lisesi — Türk Müziği', grades: [9, 10, 11, 12], defaultPeriods: 9 },
  { id: 'spor_lisesi', group: 'lise_gsl_spor', name: 'Spor Lisesi', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'spor_lisesi_tematik', group: 'lise_gsl_spor', name: 'Tematik Program Uygulayan Spor Lisesi', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  // 6. Mesleki, Çok Programlı ve Özel Kurumlar (Düzenlenebilir Taslaklar)
  { id: 'mesleki_teknik_anadolu_lisesi', group: 'mesleki_ozel', name: 'Mesleki ve Teknik Anadolu Lisesi', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'cok_programli_anadolu_lisesi', group: 'mesleki_ozel', name: 'Çok Programlı Anadolu Lisesi', grades: [9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'ozel_ogretim', group: 'mesleki_ozel', name: 'Özel Öğretim Kurumları', grades: [5, 6, 7, 8, 9, 10, 11, 12], defaultPeriods: 8 },
  { id: 'ozel_egitim', group: 'mesleki_ozel', name: 'Özel Eğitim Kurumları', grades: [5, 6, 7, 8, 9, 10, 11, 12], defaultPeriods: 6 }
]);

/** Ders saatine göre hazır blok kombinasyonları */
export const PRESET_BLOCK_PATTERNS = Object.freeze({
  1: ['1'],
  2: ['2', '1+1'],
  3: ['3', '2+1', '1+1+1'],
  4: ['4', '3+1', '2+2', '2+1+1', '1+1+1+1'],
  5: ['3+2', '2+2+1', '3+1+1', '2+1+1+1'],
  6: ['3+3', '4+2', '2+2+2', '3+2+1', '2+2+1+1'],
  7: ['3+2+2', '2+2+2+1', '3+3+1'],
  8: ['2+2+2+2', '3+3+2', '4+2+2', '4+4'],
  9: ['3+3+3', '3+2+2+2', '4+3+2'],
  10: ['2+2+2+2+2', '3+3+2+2', '4+3+3']
});

export function getBlockPatternsForHours(hours) {
  const h = Math.max(1, Math.floor(Number(hours) || 1));
  if (PRESET_BLOCK_PATTERNS[h]) return [...PRESET_BLOCK_PATTERNS[h]];
  const def = [];
  let rem = h;
  while (rem >= 2) { def.push(2); rem -= 2; }
  if (rem > 0) def.push(rem);
  return [def.join('+')];
}

export function parseBlockPattern(pattern, expectedHours) {
  const parts = String(pattern || '')
    .split('+')
    .map(x => parseInt(x.trim(), 10))
    .filter(x => Number.isFinite(x) && x > 0);
  const sum = parts.reduce((a, b) => a + b, 0);
  if (parts.length && (!expectedHours || sum === Number(expectedHours))) return parts;
  const fallback = [];
  let rem = Math.max(1, Math.floor(Number(expectedHours) || sum || 1));
  while (rem >= 2) { fallback.push(2); rem -= 2; }
  if (rem > 0) fallback.push(rem);
  return fallback;
}

/** 18 ana menü tanımı (Masaüstü, Web ve PWA ortak) */
export const MAIN_MENUS = Object.freeze([
  { id: 'dashboard', order: 1, title: 'Ana Panel' },
  { id: 'school', order: 2, title: 'Okul Ayarları' },
  { id: 'teachers', order: 3, title: 'Öğretmenler' },
  { id: 'classes', order: 4, title: 'Sınıflar ve Şubeler' },
  { id: 'subjects', order: 5, title: 'Dersler ve Bloklar' },
  { id: 'rooms', order: 6, title: 'Derslikler ve Binalar' },
  { id: 'assignments', order: 7, title: 'Ders Görevlendirmeleri' },
  { id: 'constraints', order: 8, title: 'Kural ve Kısıt Yönetimi' },
  { id: 'auto_schedule', order: 9, title: 'Otomatik Ders Dağıtımı' },
  { id: 'multi_solver', order: 10, title: 'Multi Solver Merkezi' },
  { id: 'manual_schedule', order: 11, title: 'Manuel Ders Dağıtımı' },
  { id: 'timetables', order: 12, title: 'Haftalık Ders Programları' },
  { id: 'analytics', order: 13, title: 'Analiz ve İstatistikler' },
  { id: 'reports', order: 14, title: 'Raporlar ve Çıktılar' },
  { id: 'backup_sync', order: 15, title: 'Yedekleme ve Senkronizasyon' },
  { id: 'account', order: 16, title: 'EvrakPlus Hesabım' },
  { id: 'system', order: 17, title: 'Sistem ve Güncellemeler' },
  { id: 'help', order: 18, title: 'Yardım ve Destek' }
]);

/** Çözüm süre profilleri (saniye) */
export const TIME_PRESETS = Object.freeze([
  { id: 'fast', label: 'Hızlı çözüm', seconds: 30 },
  { id: 'normal', label: 'Normal çözüm', seconds: 120 },
  { id: 'advanced', label: 'Gelişmiş çözüm', seconds: 300 },
  { id: 'deep', label: 'Derin optimizasyon', seconds: 600 },
  { id: 'professional', label: 'Profesyonel optimizasyon', seconds: 1800 },
  { id: 'ultimate', label: 'Ultimate optimizasyon', seconds: 3600 },
  { id: 'custom', label: 'Özel süre', seconds: null },
  { id: 'until_stopped', label: 'Manuel durdurulana kadar çalış', seconds: 0 }
]);
