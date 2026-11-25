import {
  SCHEMA_VERSION,
  ConstraintLevel,
  ShiftType,
  EducationMode,
  parseBlockPattern
} from './constants.js';
import { createBlankProject, createConstraint, makeEntityMeta, nowIso } from './schema.js';

const LEGACY_TYPE_MAP = {
  ilk: 'ortaokul',
  iho: 'imam_hatip_ortaokulu',
  spor_oo: 'spor_ortaokulu',
  muzik_oo: 'guzel_sanatlar_muzik_ortaokulu',
  al: 'anadolu_lisesi',
  al_hz: 'anadolu_lisesi_hazirlik',
  fen: 'fen_lisesi',
  fen_hz: 'fen_lisesi_hazirlik',
  sbl: 'sosyal_bilimler_lisesi',
  sbl_hz: 'sosyal_bilimler_lisesi_hazirlik',
  ozel_al: 'ozel_program_anadolu_lisesi',
  ozel_fen: 'ozel_program_fen_lisesi',
  ozel_sbl: 'ozel_program_sosyal_bilimler_lisesi',
  aihl: 'anadolu_imam_hatip_lisesi',
  aihl_hz: 'anadolu_imam_hatip_lisesi_hazirlik',
  aihl_fsb: 'anadolu_imam_hatip_lisesi_fsb',
  gsl_gorsel: 'gsl_gorsel_sanatlar',
  gsl_tiyatro: 'gsl_tiyatro',
  gsl_muzik: 'gsl_muzik',
  gsl_tmuzik: 'gsl_turk_muzigi',
  spor_lise: 'spor_lisesi',
  spor_lise_tematik: 'spor_lisesi_tematik',
  mtal: 'mesleki_teknik_anadolu_lisesi',
  cpal: 'cok_programli_anadolu_lisesi',
  ozel_ogretim: 'ozel_ogretim',
  ozel_egitim: 'ozel_egitim'
};

/**
 * Eski Çarşaf v1/v2 projelerini sıfır veri kaybıyla EvrakPlus Multi Plus v3 şemasına dönüştürür.
 * Zaten v3 ise eksik alanları tamamlayarak döndürür.
 */
export function migrateProject(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Geçersiz proje verisi: JSON nesnesi bekleniyor.');
  }

  if (Number(raw.schemaVersion) === SCHEMA_VERSION) {
    const base = createBlankProject({ id: raw.id });
    return {
      ...base,
      ...raw,
      school: { ...base.school, ...(raw.school || {}) },
      ui: { ...base.ui, ...(raw.ui || {}) },
      sync: { ...base.sync, ...(raw.sync || {}) },
      schemaVersion: SCHEMA_VERSION
    };
  }

  // Legacy v1 / v2 -> v3 dönüşümü
  const base = createBlankProject();
  const oldSchool = raw.school || {};
  const mappedType = LEGACY_TYPE_MAP[oldSchool.type] || oldSchool.type || 'ortaokul';
  const D = Number(oldSchool.D || 5);
  const P = Number(oldSchool.P || 7);

  base.school = {
    ...base.school,
    name: oldSchool.name || 'Aktarılan Okul',
    year: oldSchool.year || '2026-2027',
    term: oldSchool.donem || '1. Dönem',
    termStart: oldSchool.donemBas || '',
    termEnd: oldSchool.donemBit || '',
    schoolType: mappedType,
    educationMode: EducationMode.FULL_DAY,
    principal: oldSchool.mudur || (raw.report && raw.report.mudur) || '',
    vicePrincipals: Array.isArray(oldSchool.myard) ? oldSchool.myard : [],
    daysPerWeek: D,
    periodsPerDay: P,
    bellSchedule: {
      ...base.school.bellSchedule,
      full: {
        start: oldSchool.start || '08:30',
        lessonMinutes: Number(oldSchool.len || 40),
        breakMinutes: Number(oldSchool.brk || 10),
        lunchAfterPeriod: Number(oldSchool.lunchAfter || 5),
        lunchMinutes: Number(oldSchool.lunchLen || 40)
      }
    }
  };

  // Dersler (subjects)
  const oldSubjects = raw.subjects || {};
  base.subjects = {};
  for (const [key, val] of Object.entries(oldSubjects)) {
    if (Array.isArray(val)) {
      base.subjects[key] = {
        key,
        name: val[0] || key,
        short: val[1] || key.slice(0, 3),
        branch: val[2] || 'Diğer',
        requiredRoomType: null,
        allowSplit: true,
        forbidAcrossLunch: true,
        minDayGap: 0,
        preferredPeriods: []
      };
    } else if (val && typeof val === 'object') {
      base.subjects[key] = { key, ...val };
    }
  }
  base.customSubjects = Array.isArray(raw.custom) ? raw.custom : [];
  base.blockMode = raw.blkMode || 'fixed';
  base.blockRules = raw.blk || {};

  // Öğretmenler
  base.teachers = (raw.teachers || []).map(t => ({
    ...makeEntityMeta({ id: t.id }),
    name: t.name || 'İsimsiz Öğretmen',
    short: t.short || '',
    branch: t.branch || 'Diğer',
    dmin: 0,
    dmax: Number(t.dmax || P),
    wmin: 0,
    wmax: 30,
    cmax: Number(t.cmax || 0),
    maxDailyGaps: null,
    maxWeeklyGaps: null,
    maxDailyBuildingChanges: null,
    maxWeeklyBuildingChanges: null,
    preferredDays: [],
    avoidDays: [],
    compactDays: false,
    firstLastPref: null,
    av: t.av && typeof t.av === 'object' ? { ...t.av } : {},
    extra: Array.isArray(t.extra) ? [...t.extra] : [],
    dutyD: t.dutyD ?? '',
    dutyP: t.dutyP ?? '',
    kulup: t.kulup || ''
  }));

  // Sınıflar
  base.classes = (raw.classes || []).map(c => ({
    ...makeEntityMeta({ id: c.id }),
    name: c.name || 'Şube',
    grade: c.grade != null && c.grade !== '' ? Number(c.grade) : 5,
    shift: ShiftType.FULL,
    studentCount: 30,
    homeRoomId: null,
    dmin: 0,
    dmax: P,
    maxDailyGaps: 0,
    maxWeeklyGaps: 0,
    closed: Array.isArray(c.closed) ? [...c.closed] : [],
    rehber: c.rehber || '',
    studentGroups: []
  }));

  // Ders görevlendirmeleri (cards -> assignments)
  base.assignments = (raw.cards || []).map(cd => {
    const hours = Number(cd.hours || 1);
    const parts = parseBlockPattern(cd.pattern, hours);
    return {
      ...makeEntityMeta({ id: cd.id }),
      classId: cd.classId,
      studentGroupId: null,
      parallelGroupId: null,
      subjectKey: cd.subj,
      hours,
      pattern: parts.join('+'),
      bmode: cd.bmode || null,
      bpats: Array.isArray(cd.bpats) ? [...cd.bpats] : [],
      teacherId: cd.teacherId || '',
      coTeacherIds: [],
      roomId: null,
      requiredRoomType: null,
      kind: cd.kind || 'zorunlu',
      allowMultipleSameDay: false
    };
  });

  // Kurallar (rules -> constraints)
  base.constraints = [];
  for (const r of raw.rules || []) {
    if (r.type === 'diff') {
      base.constraints.push(createConstraint({
        id: r.id,
        type: 'subject_diff_days',
        level: ConstraintLevel.HARD,
        enabled: Boolean(r.on),
        description: 'Aynı dersin blokları farklı günlere dağılsın'
      }));
    } else if (r.type === 'forbid') {
      base.constraints.push(createConstraint({
        id: r.id,
        type: 'subject_forbid_periods',
        level: ConstraintLevel.HARD,
        enabled: Boolean(r.on),
        params: { subjectKey: r.a, periods: (r.periods || []).map(Number) },
        description: 'Ders saat yasağı'
      }));
    } else if (r.type === 'pair') {
      base.constraints.push(createConstraint({
        id: r.id,
        type: 'subject_pair_diff_day',
        level: ConstraintLevel.HARD,
        enabled: Boolean(r.on),
        params: { subjectA: r.a, subjectB: r.b },
        description: 'İki ders aynı sınıfta aynı güne düşmesin'
      }));
    } else if (r.type === 'tclass') {
      base.constraints.push(createConstraint({
        id: r.id,
        type: 'teacher_class_limit',
        level: ConstraintLevel.HIGH,
        enabled: Boolean(r.on),
        params: { scope: r.scope, max: Number(r.max), who: r.who, teacherIds: r.ids || [] },
        description: 'Sınıf başına öğretmen ders sınırı'
      }));
    }
  }

  // Yerleşimler (place -> placements)
  base.placements = {};
  for (const [blockId, pl] of Object.entries(raw.place || {})) {
    if (pl && Number.isInteger(pl.d) && Number.isInteger(pl.p)) {
      base.placements[blockId] = {
        day: pl.d,
        period: pl.p,
        roomId: pl.roomId || null,
        lock: Boolean(pl.lock),
        lockScope: pl.lock ? 'block' : null
      };
    }
  }

  base.report = { ...base.report, ...(raw.report || {}) };
  base.duty = { ...base.duty, ...(raw.duty || {}) };
  if (raw.ui) {
    base.ui = {
      ...base.ui,
      prio: raw.ui.prio || 'gaps',
      timeSeconds: Number(raw.ui.time || 120),
      view: raw.ui.view || 'sinif',
      amode: raw.ui.amode || 'brans_ek'
    };
  }
  base.updatedAt = nowIso();
  return base;
}
