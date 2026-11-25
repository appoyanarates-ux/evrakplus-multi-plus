/* =========================================================================
 * EvrakPlus Ders Dağıtım Multi Plus v1.0.0 — Model, Ön Kontrol ve v3 6-Motor Köprüsü
 * - Çarşaf (v2) ve EvrakPlus Multi Plus (v3) veri biçimleri arasında kayıpsız dönüşüm
 * - 6 yerel optimizasyon motoru (OR-Tools, Timefold, Choco, MiniZinc, SCIP, HiGHS)
 *   için standart v3 proje nesnesi üretimi ve çözüm yerleştirme haritalaması
 * - PASS 0 Ön Kontrol (Hall gün-grubu kapasite denetimi, kilit etkisi, derslik kontrolü)
 * ========================================================================= */
(function (root) {
  'use strict';
  const EP = (root.EP = root.EP || {});

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 10));
  const hrsList = v => String(v || '').split('/').map(Number).filter(x => x > 0);
  const patSum = p => String(p || '').split('+').reduce((a, x) => a + (+x || 0), 0);
  const patFor = h => { h = +h || 0; const r = []; while (h >= 2) { r.push(2); h -= 2; } if (h) r.push(1); return r.join('+') || '1'; };

  function parsePat(pat, h) {
    const a = String(pat || '').split('+').map(x => parseInt(x, 10)).filter(x => x > 0);
    if (a.length && a.reduce((x, y) => x + y, 0) === +h) return a;
    const r = []; let n = +h || 0;
    while (n >= 2) { r.push(2); n -= 2; }
    if (n > 0) r.push(n);
    return r;
  }
  function patOk(c) {
    const a = String(c.pattern || '').split('+').map(x => parseInt(x, 10));
    return a.length > 0 && a.every(x => x > 0) && a.reduce((x, y) => x + y, 0) === +c.hours;
  }
  function autoDefault(h) {
    h = +h || 1; const r = [];
    let a = patFor(h).split('+').map(Number);
    r.push(a.join('+'));
    while (a.includes(2)) {
      const i = a.lastIndexOf(2);
      a = [...a.slice(0, i), 1, 1, ...a.slice(i + 1)];
      r.push(a.join('+'));
    }
    return r;
  }
  function partitions(h) {
    h = +h || 1; const out = [];
    const rec = (rem, max, acc) => {
      if (!rem) { out.push(acc.join('+')); return; }
      for (let p = Math.min(max, rem); p >= 1; p--) { acc.push(p); rec(rem - p, p, acc); acc.pop(); }
    };
    rec(h, Math.min(3, h), []);
    const def = autoDefault(h);
    return [...def, ...out.filter(p => !def.includes(p)).sort((a, b) => a.split('+').length - b.split('+').length || Math.max(...a.split('+').map(Number)) - Math.max(...b.split('+').map(Number)))];
  }
  const minPats = h => Math.min(2, partitions(h).length);
  function ensure2(pats, h) {
    pats = (pats || []).filter(p => patSum(p) === +h);
    for (const p of [...autoDefault(h), ...partitions(h)]) {
      if (pats.length >= minPats(h)) break;
      if (!pats.includes(p)) pats.push(p);
    }
    return pats;
  }

  /* ---------- Proje Oluşturma, Demo ve Kayıpsız Göç (v2 <-> v3) ---------- */
  function blank() {
    const bId = uid();
    return {
      v: 3,
      schemaVersion: 3,
      appVersion: '2.2.1',
      id: uid(),
      revision: 1,
      updatedAt: new Date().toISOString(),
      school: {
        name: 'Yeni Okul', year: '2026-2027', mudur: '', myard: [], donem: '1. Dönem',
        donemBas: '', donemBit: '', type: 'ilk', educationMode: 'full_day',
        D: 5, P: 7, start: '08:30', len: 40, brk: 10, lunchAfter: 5, lunchLen: 40
      },
      buildings: [{ id: bId, name: 'Ana Bina', code: 'B1', transitionPeriods: {} }],
      rooms: [{ id: uid(), name: 'Derslik 101', type: 'classroom', buildingId: bId, capacity: 32, closed: [] }],
      classes: [],
      teachers: [],
      cards: [],
      subjects: {},
      custom: [],
      blk: {},
      blkMode: 'fixed',
      report: { paper: 'A4' },
      duty: { places: ['Bahçe', 'Koridor'], admin: {}, strategy: 'min_lessons', avoidZeroDay: true, month: '', monthlyMode: 'rotate', monthly: {} },
      rules: [
        { id: uid(), type: 'diff', on: true, level: 'HARD', weight: 1000000 },
        { id: uid(), type: 'lunch', on: true, level: 'HIGH', weight: 100 }
      ],
      place: {},
      last: null,
      solutions: [],
      ui: {
        prio: 'gaps', time: 30, solverMode: 'smart', engine: 'ortools',
        view: 'sinif', ent: '', cf: '', tf: '', kf: '', only: false,
        sel: '', amode: 'brans_ek', stab: 'genel', dtab: 'sinif', htab: 'z', rtab: 'cp', csel: '',
        tsel: '', tpCls: '', tpQ: '', tpOnlyBranch: false, tpHideOther: false,
        unTab: 'class', dutyTab: 'weekly',
        openCls: '', openRoom: '', diagOpen: false, pmLock: false, bused: false,
        theme: 'auto'
      }
    };
  }

  function demo(conflict) {
    const s = blank();
    s.school.name = conflict ? 'Örnek Ortaokulu (Çakışmalı)' : 'Örnek Ortaokulu';
    s.subjects = JSON.parse(JSON.stringify(EP.LEGACY));
    const bId = s.buildings[0].id;
    s.rooms = [
      { id: uid(), name: 'Derslik 101', type: 'classroom', buildingId: bId, capacity: 32, closed: [] },
      { id: uid(), name: 'Derslik 102', type: 'classroom', buildingId: bId, capacity: 32, closed: [] },
      { id: uid(), name: 'Fen Laboratuvarı', type: 'science_lab', buildingId: bId, capacity: 30, closed: [] },
      { id: uid(), name: 'BT Sınıfı', type: 'computer_lab', buildingId: bId, capacity: 28, closed: [] }
    ];
    s.classes = [5, 6, 7, 8].map((g, idx) => ({
      id: uid(), name: g + '/A', grade: g, shift: 'full', studentCount: 28,
      homeRoomId: idx < 2 ? s.rooms[idx].id : '', closed: []
    }));
    const closed = conflict
      ? [[2], [2, 4], [0], [2, 4], [0, 3], [2, 4], [0, 1], [3, 4], [1, 2, 4]]
      : [[3], [2], [0], [4], [1], [2], [0, 1], [3, 4], [0, 1, 2]];
    const tn = [
      ['Türkçe Öğretmeni', 'Türkçe'], ['Matematik Öğretmeni', 'Matematik'], ['Fen Bilimleri Öğretmeni', 'Fen Bilimleri'],
      ['Sosyal Bilgiler Öğretmeni', 'Sosyal Bilgiler'], ['İngilizce Öğretmeni', 'İngilizce'],
      ['Din Kültürü Öğretmeni', 'Din Kültürü'], ['Beden Eğitimi Öğretmeni', 'Beden Eğitimi'],
      ['İngilizce Öğretmeni 2', 'İngilizce'], ['Görsel Sanatlar Öğretmeni', 'Görsel Sanatlar']
    ];
    s.teachers = tn.map((t, i) => {
      const av = {};
      for (const d of closed[i]) for (let p = 0; p < 7; p++) av[d + '-' + p] = 1;
      return { id: uid(), name: t[0], short: '', branch: t[1], role: 'ogretmen', dutyExempt: false, dmin: 0, dmax: 7, cmax: 0, wmax: 30, av, extra: [], dutyD: '', dutyP: '', kulup: '' };
    });
    s.teachers[2].extra = ['TKT'];
    s.teachers[3].extra = ['AVE'];
    s.teachers[7].extra = ['BTY'];
    s.teachers[8].extra = ['MZK'];
    const T = s.teachers.map(t => t.id);
    const who = (k, g) => ({ TRK: 0, MSL: 0, OKB: 0, MAT: 1, FEN: 2, TKT: 2, CEV: 2, SOS: 3, INK: 3, AVE: 3, REH: 3, ING: 4, DKB: 5, KUR: 5, BES: 6, BTY: 7, GRS: 8, MZK: 8, SYD: g <= 6 ? 4 : 7 })[k];
    for (const c of s.classes) {
      for (const [k, h, pt] of EP.TPL[c.grade]) {
        s.cards.push({ id: uid(), classId: c.id, subj: k, hours: h, pattern: pt, teacherId: T[who(k, c.grade)], roomId: '', kind: EP.LEG_SEC.has(k) ? 'secmeli' : 'zorunlu' });
      }
    }
    s.ui.ent = s.classes[0].id;
    s.ui.csel = s.classes[0].id;
    s.ui.tsel = s.teachers[0].id;
    return s;
  }

  const SCHOOL_TYPE_FROM_V3 = {
    ilkokul: 'ilk', ortaokul: 'ilk', imam_hatip_ortaokulu: 'iho', anadolu_lisesi: 'al',
    fen_lisesi: 'fen', sosyal_bilimler_lisesi: 'sbl', anadolu_imam_hatip_lisesi: 'aihl',
    mesleki_teknik_anadolu_lisesi: 'mtal', cok_programli_anadolu_lisesi: 'cpal',
    ozel_ogretim: 'ozel_ogretim', ozel_egitim: 'ozel_egitim'
  };
  const SCHOOL_TYPE_TO_V3 = {
    ilk: 'ortaokul', iho: 'imam_hatip_ortaokulu', al: 'anadolu_lisesi', fen: 'fen_lisesi',
    sbl: 'sosyal_bilimler_lisesi', aihl: 'anadolu_imam_hatip_lisesi', mtal: 'mesleki_teknik_anadolu_lisesi',
    cpal: 'cok_programli_anadolu_lisesi', ozel_ogretim: 'ozel_ogretim', ozel_egitim: 'ozel_egitim', '': 'ortaokul'
  };

  function v3ToState(v3) {
    if (v3 && v3.meta && v3.meta.uiFullState && v3.meta.uiFullState.school) {
      return migrateState(Object.assign(blank(), v3.meta.uiFullState, {
        id: v3.id || v3.meta.uiFullState.id,
        revision: v3.revision || 1,
        updatedAt: v3.updatedAt || new Date().toISOString()
      }));
    }
    const base = blank();
    base.id = v3.id || uid();
    base.revision = v3.revision || 1;
    base.updatedAt = v3.updatedAt || new Date().toISOString();
    const sc = v3.school || {};
    const bell = (sc.bellSchedule && sc.bellSchedule.full) || {};
    base.school = {
      name: sc.name || 'Yeni Okul',
      year: sc.year || '2026-2027',
      mudur: sc.principal || sc.mudur || '',
      myard: Array.isArray(sc.vicePrincipals) ? sc.vicePrincipals.map(x => typeof x === 'string' ? { id: uid(), name: x, gorev: '' } : Object.assign({ id: uid(), name: '', gorev: '' }, x)) : (sc.myard || []),
      donem: sc.term || sc.donem || '1. Dönem',
      donemBas: sc.termStart || sc.donemBas || '',
      donemBit: sc.termEnd || sc.donemBit || '',
      type: SCHOOL_TYPE_FROM_V3[sc.schoolType] || sc.type || 'ilk',
      educationMode: sc.educationMode || 'full_day',
      D: Number(sc.daysPerWeek || sc.D || 5),
      P: Number(sc.periodsPerDay || sc.P || 7),
      start: bell.startTime || sc.start || '08:30',
      len: Number(bell.lessonMinutes || sc.len || 40),
      brk: Number(bell.breakMinutes || sc.brk || 10),
      lunchAfter: Number(bell.lunchAfterPeriod ?? sc.lunchAfter ?? 5),
      lunchLen: Number(bell.lunchMinutes || sc.lunchLen || 40)
    };
    if (Array.isArray(v3.buildings) && v3.buildings.length) base.buildings = v3.buildings;
    if (Array.isArray(v3.rooms) && v3.rooms.length) base.rooms = v3.rooms;
    base.classes = (v3.classes || []).filter(c => !c.deletedAt).map(c => ({
      id: c.id || uid(), name: c.name || 'Şube', grade: Number(c.grade || 5),
      shift: c.shift || 'full', studentCount: Number(c.studentCount || 30),
      homeRoomId: c.homeRoomId || '', rehber: c.homeroomTeacherId || c.rehber || '',
      closed: Array.isArray(c.closed) ? c.closed : []
    }));
    base.teachers = (v3.teachers || []).filter(t => !t.deletedAt).map(t => ({
      id: t.id || uid(), name: t.name || 'Öğretmen', short: t.short || '', branch: t.branch || 'Diğer',
      dmin: Number(t.dmin || 0), dmax: Number(t.dmax || base.school.P), cmax: Number(t.cmax || 0), wmax: Number(t.wmax || 30),
      av: Object.assign({}, t.av || {}), extra: Array.isArray(t.extra) ? t.extra : [],
      dutyD: t.dutyD ?? '', dutyP: t.dutyP || '', kulup: t.kulup || ''
    }));
    const subjMap = {};
    for (const [k, v] of Object.entries(v3.subjects || {})) {
      if (Array.isArray(v)) subjMap[k] = v.slice(0, 3);
      else if (v && typeof v === 'object') subjMap[k] = [v.name || k, v.short || EP.autoShort(v.name || k), v.branch || 'Diğer'];
    }
    base.subjects = Object.keys(subjMap).length ? subjMap : JSON.parse(JSON.stringify(EP.LEGACY));
    const cardsSrc = Array.isArray(v3.assignments) ? v3.assignments : (Array.isArray(v3.cards) ? v3.cards : []);
    base.cards = cardsSrc.filter(c => !c.deletedAt).map(c => ({
      id: c.id || uid(), classId: c.classId, subj: c.subjectKey || c.subj, hours: Number(c.hours || 2),
      pattern: c.pattern || patFor(c.hours || 2), teacherId: c.teacherId || '', roomId: c.roomId || '',
      kind: c.kind || (EP.LEG_SEC.has(c.subjectKey || c.subj) ? 'secmeli' : 'zorunlu'),
      bmode: c.bmode, bpats: c.bpats
    }));
    const rules = [];
    for (const r of (v3.constraints || [])) {
      if (r.deletedAt) continue;
      if (r.type === 'subject_diff_days') rules.push({ id: r.id || uid(), type: 'diff', on: r.enabled !== false, level: r.level || 'HARD', weight: r.weight || 1000000 });
      else if (r.type === 'block_no_across_lunch') rules.push({ id: r.id || uid(), type: 'lunch', on: r.enabled !== false, level: r.level || 'HIGH', weight: r.weight || 100 });
      else if (r.type === 'subject_forbid_periods') rules.push({ id: r.id || uid(), type: 'forbid', on: r.enabled !== false, level: r.level || 'HARD', a: r.params?.subjectKey || '', periods: r.params?.periods || [] });
      else if (r.type === 'subject_pair_diff_day') rules.push({ id: r.id || uid(), type: 'pair', on: r.enabled !== false, level: r.level || 'HIGH', a: r.params?.subjectA || '', b: r.params?.subjectB || '' });
    }
    if (!rules.some(r => r.type === 'diff')) rules.unshift({ id: uid(), type: 'diff', on: true, level: 'HARD', weight: 1000000 });
    base.rules = rules;
    const plSrc = v3.placements || v3.place || {};
    base.place = {};
    for (const [k, p] of Object.entries(plSrc)) {
      if (!p) continue;
      base.place[k] = { d: Number(p.day ?? p.d ?? 0), p: Number(p.period ?? p.p ?? 0), lock: Boolean(p.lock), roomId: p.roomId || '' };
    }
    if (Array.isArray(v3.solutions)) base.solutions = v3.solutions;
    if (base.classes[0]) { base.ui.ent = base.classes[0].id; base.ui.csel = base.classes[0].id; }
    if (base.teachers[0]) base.ui.tsel = base.teachers[0].id;
    return migrateState(base);
  }

  function migrateState(o) {
    if (!o || typeof o !== 'object') return blank();
    if (o.schemaVersion === 3 && Array.isArray(o.assignments) && !Array.isArray(o.cards)) {
      return v3ToState(o);
    }
    const b = blank();
    o = Object.assign(b, o);
    o.school = Object.assign(b.school, o.school || {});
    if (!Array.isArray(o.school.myard)) o.school.myard = [];
    if (!o.school.mudur && o.report && o.report.mudur) o.school.mudur = o.report.mudur;
    if (!Array.isArray(o.custom)) o.custom = [];
    if (!Array.isArray(o.buildings) || !o.buildings.length) o.buildings = b.buildings;
    if (!Array.isArray(o.rooms)) o.rooms = b.rooms;
    if (!Array.isArray(o.solutions)) o.solutions = [];
    if (o.blk && o.subjects) {
      for (const k of Object.keys(o.blk)) {
        const [a, h] = k.split('|');
        if (o.subjects[a]) {
          const nk = o.subjects[a][0] + '|' + h;
          if (!o.blk[nk]) o.blk[nk] = o.blk[k];
          delete o.blk[k];
        }
      }
    }
    if (!o.subjects || !Object.keys(o.subjects).length) o.subjects = JSON.parse(JSON.stringify(EP.LEGACY));
    if (o.school.type === undefined) o.school.type = 'ilk';
    for (const c of o.cards || []) {
      if (!c.kind) c.kind = EP.LEG_SEC.has(c.subj) ? 'secmeli' : 'zorunlu';
      if (c.bmode === 'auto') c.bpats = ensure2(c.bpats, +c.hours);
      else if (!c.bmode && c.pattern && patSum(c.pattern) === +c.hours && c.pattern !== autoDefault(+c.hours)[0]) {
        c.bmode = 'fixed'; c.bpats = [c.pattern];
      }
    }
    for (const t of o.teachers || []) {
      if (!Array.isArray(t.extra)) t.extra = [];
      if (!t.av) t.av = {};
      if (!t.role) t.role = 'ogretmen';
      if (t.dutyExempt == null) t.dutyExempt = t.role !== 'ogretmen';
      if (t.dmax == null) t.dmax = +o.school.P || 7;
      if (t.cmax == null) t.cmax = 0;
    }
    if (!Array.isArray(o.customClubs)) o.customClubs = [];
    for (const c of o.classes || []) {
      if (!Array.isArray(c.closed)) c.closed = [];
      if (!c.shift) c.shift = 'full';
      if (!c.studentCount) c.studentCount = 30;
    }
    for (const k in o.blk || {}) {
      const bk = o.blk[k];
      if (bk && bk.mode === 'auto') bk.pats = ensure2(bk.pats, +k.split('|')[1]);
    }
    if (!o.report) o.report = { paper: 'A4' };
    if (!o.duty) o.duty = { places: ['Bahçe', 'Koridor'], admin: {}, strategy: 'min_lessons', avoidZeroDay: true, month: '', monthlyMode: 'rotate', monthly: {} };
    else o.duty = Object.assign({ places: ['Bahçe', 'Koridor'], admin: {}, strategy: 'min_lessons', avoidZeroDay: true, month: '', monthlyMode: 'rotate', monthly: {} }, o.duty);
    if (!Array.isArray(o.rules)) o.rules = b.rules;
    if (!o.rules.some(r => r.type === 'diff')) o.rules.unshift({ id: uid(), type: 'diff', on: true, level: 'HARD', weight: 1000000 });
    o.ui = Object.assign(b.ui, o.ui || {});
    if (!o.id) o.id = uid();
    return o;
  }

  /* ---------- 6 Gerçek Motor İçin v3 Proje Dönüştürücü ---------- */
  function stateToV3Project(S, options) {
    const opt = options || {};
    const D = Number(S.school.D || 5);
    const P = Number(S.school.P || 7);
    const subjectsV3 = {};
    for (const [k, arr] of Object.entries(S.subjects || {})) {
      subjectsV3[k] = {
        key: k,
        name: Array.isArray(arr) ? arr[0] : (arr.name || k),
        short: Array.isArray(arr) ? arr[1] : (arr.short || k),
        branch: Array.isArray(arr) ? arr[2] : (arr.branch || 'Diğer'),
        forbidAcrossLunch: (S.rules || []).some(r => r.type === 'lunch' && r.on)
      };
    }

    const constraintsV3 = [];
    for (const r of (S.rules || [])) {
      if (!r.on) continue;
      if (r.type === 'diff') {
        constraintsV3.push({ id: r.id, type: 'subject_diff_days', level: r.level || 'HARD', weight: r.weight || 1000000, enabled: true, params: {} });
      } else if (r.type === 'lunch') {
        constraintsV3.push({ id: r.id, type: 'block_no_across_lunch', level: r.level || 'HIGH', weight: r.weight || 100, enabled: true, params: { lunchAfterPeriod: Number(S.school.lunchAfter || 0) } });
      } else if (r.type === 'forbid' && r.a) {
        constraintsV3.push({ id: r.id, type: 'subject_forbid_periods', level: r.level || 'HARD', weight: r.weight || 1000000, enabled: true, params: { subjectKey: r.a, periods: (r.periods || []).map(Number) } });
      } else if (r.type === 'pair' && r.a && r.b) {
        constraintsV3.push({ id: r.id, type: 'subject_pair_diff_day', level: r.level || 'HIGH', weight: r.weight || 100, enabled: true, params: { subjectA: r.a, subjectB: r.b } });
      }
    }

    const placementsV3 = {};
    const keepUnplacedMode = opt.mode === 'fill';
    for (const [bid, pl] of Object.entries(S.place || {})) {
      if (!pl || pl.d >= D || pl.p >= P) continue;
      const isLocked = Boolean(pl.lock) || keepUnplacedMode;
      if (isLocked || opt.useHints !== false) {
        placementsV3[bid] = {
          day: Number(pl.d),
          period: Number(pl.p),
          lock: isLocked,
          roomId: pl.roomId || null
        };
      }
    }

    const cleanUiState = sanitizeExportProject(S);
    return {
      schemaVersion: 3,
      appVersion: '2.0.0',
      id: S.id || uid(),
      revision: Number(S.revision || 1),
      updatedAt: new Date().toISOString(),
      school: {
        name: S.school.name || 'Okul',
        year: S.school.year || '2026-2027',
        term: S.school.donem || '1. Dönem',
        termStart: S.school.donemBas || '',
        termEnd: S.school.donemBit || '',
        schoolType: SCHOOL_TYPE_TO_V3[S.school.type] || 'ortaokul',
        educationMode: S.school.educationMode || 'full_day',
        daysPerWeek: D,
        periodsPerDay: P,
        principal: S.school.mudur || '',
        vicePrincipals: (S.school.myard || []).map(m => ({ id: m.id, name: m.name, gorev: m.gorev || '' })),
        bellSchedule: {
          full: {
            startTime: S.school.start || '08:30',
            lessonMinutes: Number(S.school.len || 40),
            breakMinutes: Number(S.school.brk || 10),
            lunchAfterPeriod: Number(S.school.lunchAfter || 0),
            lunchMinutes: Number(S.school.lunchLen || 40)
          }
        }
      },
      buildings: (S.buildings || []).map(b => ({ id: b.id, name: b.name, code: b.code || '', transitionPeriods: b.transitionPeriods || {} })),
      rooms: (S.rooms || []).map(r => ({ id: r.id, name: r.name, type: r.type || 'classroom', buildingId: r.buildingId || null, capacity: Number(r.capacity || 30), closed: r.closed || [] })),
      teachers: (S.teachers || []).map(t => ({
        id: t.id, name: t.name, short: t.short || '', branch: t.branch || 'Diğer',
        dmin: Number(t.dmin || 0), dmax: Math.max(1, Math.min(P, Number(t.dmax || P))),
        wmin: 0, wmax: Number(t.wmax || D * P), cmax: Number(t.cmax || 0),
        av: t.av || {}, extra: t.extra || []
      })),
      classes: (S.classes || []).map(c => ({
        id: c.id, name: c.name, grade: Number(c.grade || 5), shift: c.shift || 'full',
        studentCount: Number(c.studentCount || 30), homeRoomId: c.homeRoomId || null,
        homeroomTeacherId: c.rehber || null, dmin: 0, dmax: P, closed: c.closed || []
      })),
      subjects: subjectsV3,
      assignments: (S.cards || []).map(c => ({
        id: c.id, classId: c.classId, subjectKey: c.subj, hours: Number(c.hours || 1),
        pattern: c.pattern || patFor(c.hours || 1), teacherId: c.teacherId || null,
        roomId: c.roomId || null, kind: c.kind || 'zorunlu'
      })),
      constraints: constraintsV3,
      placements: placementsV3,
      ui: { timeSeconds: Number(S.ui?.time || 30), prio: S.ui?.prio || 'gaps' },
      meta: { uiFullState: cleanUiState }
    };
  }

  function applyV3SolutionToState(S, bestResult, preserveLocks) {
    if (!bestResult || !bestResult.placements) return 0;
    const oldLocks = {};
    if (preserveLocks !== false) {
      for (const [k, v] of Object.entries(S.place || {})) if (v && v.lock) oldLocks[k] = true;
    }
    const nextPlace = {};
    let count = 0;
    for (const [bid, pl] of Object.entries(bestResult.placements)) {
      if (!pl || pl.day == null || pl.period == null) continue;
      nextPlace[bid] = {
        d: Number(pl.day),
        p: Number(pl.period),
        lock: Boolean(oldLocks[bid] || pl.lock),
        roomId: pl.roomId || ''
      };
      count++;
    }
    S.place = nextPlace;
    return count;
  }

  function sanitizeExportProject(S) {
    const forbidden = /password|token|secret|apikey|api_key|session|cookie|authHeader|refreshToken/i;
    const walk = v => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        const out = {};
        for (const [k, val] of Object.entries(v)) {
          if (forbidden.test(k)) continue;
          if (k === 'meta' && val && val.uiFullState) continue;
          out[k] = walk(val);
        }
        return out;
      }
      return v;
    };
    return walk(S);
  }

  /* ---------- Ders / Blok / Müfredat Yardımcıları ---------- */
  function typeOf(S) { return EP.TYPES[S.school.type] || null; }
  function gIdx(T, g) { return T ? T.grades.indexOf(+g) : -1; }
  function zFor(S, T, g) {
    const i = gIdx(T, g); if (i < 0) return [];
    return T.z.filter(r => r[1][i] > 0).map(r => ({ name: r[0], hours: r[1][i] }))
      .concat((S.custom || []).filter(x => x.kind === 'zorunlu' && +x.hrs[g] > 0).map(x => ({ name: x.name, hours: +x.hrs[g] })));
  }
  function poolFor(S, T, g) {
    if (!T) return [];
    const i = T.poolGrades.indexOf(+g);
    return (i < 0 ? [] : T.pool).map(r => {
      const o = (r[3].split('|')[i] || '').split('/').filter(Boolean).map(Number);
      return { name: r[0], grp: r[1], times: r[2], opts: o };
    }).filter(x => x.opts.length)
      .concat((S.custom || []).filter(x => x.kind === 'secmeli' && hrsList(x.hrs[g]).length).map(x => ({ name: x.name, grp: 'OZEL', times: x.times || 1, opts: hrsList(x.hrs[g]) })));
  }
  function secLimit(T, g) { const i = gIdx(T, g); return i < 0 ? 0 : T.sec[i]; }
  function targetOf(T, g) { const i = gIdx(T, g); return i < 0 ? 0 : T.total[i]; }

  function findSubj(S, name, so) { return Object.keys(S.subjects).find(k => S.subjects[k][0] === name && k.endsWith('_SO') === so); }
  function ensureSubj(S, name, grade) {
    const so = grade <= 4 && EP.SO_SET.has(name);
    const ex = findSubj(S, name, so); if (ex) return ex;
    const key = EP.trSlug(name) + (so ? '_SO' : '');
    if (!S.subjects[key]) {
      let sh = EP.autoShort(name);
      if (!so && !EP.SHORTS[name]) {
        const used = new Set(Object.values(S.subjects).map(v => v[1]));
        let k = 2, b = sh;
        while (used.has(sh)) sh = b + (k++);
      }
      S.subjects[key] = [name, sh, EP.branchOf(name, grade, S.school.type)];
    }
    return key;
  }

  const SN = (S, k) => (S.subjects[k] ? S.subjects[k][0] : '(silinmiş ders)');
  const SS = (S, k) => (S.subjects[k] ? S.subjects[k][1] : '?');
  const SB = (S, k) => (S.subjects[k] ? S.subjects[k][2] : '');
  const nameOf = (S, k) => (S.subjects[k] ? S.subjects[k][0] : k);
  const blkKey = (S, subj, h) => nameOf(S, subj) + '|' + h;

  function blkCfgN(S, name, h) {
    const b = (S.blk || {})[name + '|' + h];
    return b && b.pats && b.pats.length ? { mode: b.mode, pats: b.pats } : { mode: S.blkMode || 'fixed', pats: autoDefault(h), def: true };
  }
  function blkCfg(S, subj, h) { return blkCfgN(S, nameOf(S, subj), h); }
  function effCfg(S, c) {
    const h = +c.hours || 1;
    if (c.bmode) {
      const ps = (c.bpats || []).filter(p => patSum(p) === h);
      return { mode: c.bmode, pats: ps.length ? ps : (c.bmode === 'auto' ? blkCfg(S, c.subj, h).pats : autoDefault(h)), own: true };
    }
    return Object.assign({ own: false }, blkCfg(S, c.subj, h));
  }
  function effPats(S, c) { const e = effCfg(S, c); return e.mode === 'auto' ? e.pats : [e.pats[0]]; }
  function dropPlace(S, cid) { for (const k in S.place) if (k.split(':')[0] === cid) delete S.place[k]; }
  function syncPattern(S, c) { const ps = effPats(S, c); if (!ps.includes(c.pattern)) { c.pattern = ps[0]; dropPlace(S, c.id); return true; } return false; }
  function syncAll(S, f) { let n = 0; for (const c of S.cards) if (!f || f(c)) if (syncPattern(S, c)) n++; return n; }

  /* ---------- Model, Yerleşim ve Ön Kontrol ---------- */
  function times(S) {
    const s = S.school, x = (s.start || '08:30').split(':').map(Number);
    let t = (x[0] || 8) * 60 + (x[1] || 0);
    const f = v => String(Math.floor(v / 60) % 24).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0'), out = [];
    for (let p = 0; p < +s.P; p++) {
      const a = t, b = t + (+s.len || 40);
      out.push(f(a) + '–' + f(b));
      t = b + ((p + 1) === (+s.lunchAfter) ? (+s.lunchLen || 40) : (+s.brk || 10));
    }
    return out;
  }

  const cardMap = S => new Map(S.cards.map(c => [c.id, c]));
  const tName = t => (t ? t.name : 'Öğretmen yok');
  const tShort = t => (t ? (t.short || t.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()) : '—');
  const cName = (S, id) => { const c = S.classes.find(x => x.id === id); return c ? c.name : '?'; };
  function loads(S) { const L = {}; for (const c of S.cards) if (c.teacherId) L[c.teacherId] = (L[c.teacherId] || 0) + (+c.hours || 0); return L; }
  function openOf(S, t) {
    const D = +S.school.D, P = +S.school.P, dm = Math.min(P, +t.dmax || P);
    let tot = 0; const per = [];
    for (let d = 0; d < D; d++) {
      let o = 0; for (let p = 0; p < P; p++) if ((t.av || {})[d + '-' + p] !== 1) o++;
      per.push(Math.min(o, dm)); tot += Math.min(o, dm);
    }
    return { tot, per };
  }
  function classHours(S, id) { return S.cards.filter(c => c.classId === id).reduce((a, c) => a + (+c.hours || 0), 0); }
  function classOpen(S, c) {
    const D = +S.school.D, P = +S.school.P, cl = new Set(c.closed || []);
    const per = []; let tot = 0;
    for (let d = 0; d < D; d++) { let o = 0; for (let p = 0; p < P; p++) if (!cl.has(d + '-' + p)) o++; per.push(o); tot += o; }
    return { tot, per };
  }

  function buildModel(S) {
    const SK = Object.keys(S.subjects || {});
    const D = +S.school.D, P = +S.school.P, N = D * P;
    const ci = new Map(S.classes.map((c, i) => [c.id, i])), ti = new Map(S.teachers.map((t, i) => [t.id, i]));
    const classes = S.classes.map(c => {
      const a = new Uint8Array(N);
      for (const k of c.closed || []) { const x = k.split('-').map(Number); if (x[0] < D && x[1] < P) a[x[0] * P + x[1]] = 1; }
      return a;
    });
    const teachers = S.teachers.map(t => {
      const a = new Int8Array(N);
      for (const k in t.av || {}) { const x = k.split('-').map(Number); if (x[0] < D && x[1] < P) a[x[0] * P + x[1]] = t.av[k]; }
      return { av: a, dmax: Math.max(1, Math.min(P, +t.dmax || P)), cmax: +t.cmax || 0 };
    });
    const cards = []; let nL = 0;
    for (const cd of S.cards) {
      if (!ci.has(cd.classId)) continue;
      const l = nL++;
      const pats = effPats(S, cd).map(p => parsePat(p, cd.hours));
      let ch = pats.findIndex(p => p.join('+') === cd.pattern);
      if (ch < 0) { pats.unshift(parsePat(cd.pattern, cd.hours)); ch = 0; }
      cards.push({ id: cd.id, c: ci.get(cd.classId), t: ti.has(cd.teacherId) ? ti.get(cd.teacherId) : -1, l, sj: SK.indexOf(cd.subj), pats, ch });
    }
    const ex = EP.CX.expand({ P, cards }, cards.map(c => c.ch));
    const rules = { diff: false, noLunch: false, forbid: {}, pairs: [] };
    for (const r of S.rules || []) {
      if (!r.on) continue;
      if (r.type === 'diff') rules.diff = true;
      if (r.type === 'lunch') rules.noLunch = true;
      if (r.type === 'forbid') { const j = SK.indexOf(r.a); if (j >= 0) (rules.forbid[j] = rules.forbid[j] || []).push(...(r.periods || []).map(Number)); }
      if (r.type === 'pair') rules.pairs.push([SK.indexOf(r.a), SK.indexOf(r.b)]);
    }
    return { D, P, lunchAfter: Number(S.school.lunchAfter || 0), classes, teachers, blocks: ex.blocks, bid: ex.bid, cards, nL, nSj: Math.max(1, SK.length), rules };
  }

  function placedCore(S) {
    const m = buildModel(S), c = EP.CORE().make(m), bad = [];
    m.bid.forEach((id, i) => {
      const pl = S.place[id]; if (!pl) return;
      const b = m.blocks[i];
      if (pl.d >= m.D || pl.p + b.len > m.P) { bad.push(id); return; }
      const s = pl.d * m.P + pl.p;
      if (c.valid(i, s)) c.place(i, s); else bad.push(id);
    });
    return { m, c, bad };
  }

  function occ(S) {
    const m = buildModel(S), cm = cardMap(S), cG = {}, tG = {}, rG = {}, un = [];
    m.bid.forEach((id, i) => {
      const b = m.blocks[i], pl = S.place[id], card = cm.get(id.split(':')[0]);
      if (!pl || pl.d >= m.D || pl.p + b.len > m.P) { un.push(i); return; }
      const rid = pl.roomId || (card && card.roomId) || '';
      for (let k = 0; k < b.len; k++) {
        const key = pl.d + '-' + (pl.p + k), cell = { id, i, card, k, len: b.len, lock: !!pl.lock, roomId: rid };
        const cid = S.classes[b.c].id;
        (cG[cid] = cG[cid] || {})[key] = cell;
        if (b.t >= 0) { const tid = S.teachers[b.t].id; (tG[tid] = tG[tid] || {})[key] = cell; }
        if (rid) { (rG[rid] = rG[rid] || {})[key] = cell; }
      }
    });
    return { m, cG, tG, rG, un };
  }

  /* ---------- Öğretmen Atama, Branş Dışı & Sınıf Başına Sınır ---------- */
  const SCOPE = { dis: 'branş dışı', brans: 'branş', all: 'branş ve branş dışı (toplam)' };
  const inScope = (scope, m) => (scope === 'all' ? true : scope === 'dis' ? (m === 'ek' || m === 'dis') : m === 'brans');
  function modeFor(S, t, card) {
    const br = SB(S, card.subj);
    if (br === EP.REHB) return 'rehber';
    if (t.branch === br) return 'brans';
    return (t.extra || []).includes(card.subj) ? 'ek' : 'dis';
  }
  function tMode(S, card) { const t = S.teachers.find(x => x.id === card.teacherId); return t ? modeFor(S, t, card) : ''; }
  function tcRulesFor(S, t) { return (S.rules || []).filter(r => r.type === 'tclass' && r.on && (r.who === 'all' || (r.ids || []).includes(t.id))); }
  function tcHours(S, t, classId, scope, excl) {
    return S.cards.filter(c => c.teacherId === t.id && c.classId === classId && c.id !== excl && inScope(scope, modeFor(S, t, c))).reduce((a, c) => a + (+c.hours || 0), 0);
  }
  function tcViolation(S, t, card) {
    const m = modeFor(S, t, card);
    for (const r of tcRulesFor(S, t)) {
      if (!inScope(r.scope, m)) continue;
      const h = tcHours(S, t, card.classId, r.scope, card.id) + (+card.hours || 0);
      if (h > r.max) return { r, h };
    }
    return null;
  }
  function tcAll(S) {
    const out = [];
    for (const c of S.cards) {
      const t = S.teachers.find(x => x.id === c.teacherId); if (!t) continue;
      const v = tcViolation(S, t, c); if (v) out.push({ c, t, v });
    }
    return out;
  }

  function rehberOf(S, c) {
    const rc = S.cards.find(x => x.classId === c.id && SB(S, x.subj) === EP.REHB && x.teacherId && S.teachers.some(t => t.id === x.teacherId));
    if (rc) return rc.teacherId;
    return c.rehber && S.teachers.some(t => t.id === c.rehber) ? c.rehber : '';
  }

  function clsStat(S, c) {
    const T = typeOf(S), cards = S.cards.filter(x => x.classId === c.id);
    const sum = k => cards.filter(x => (x.kind || 'zorunlu') === k).reduce((a, x) => a + (+x.hours || 0), 0);
    return {
      z: sum('zorunlu'), s: sum('secmeli'), e: sum('ek'),
      tot: cards.reduce((a, x) => a + (+x.hours || 0), 0),
      lim: secLimit(T, c.grade), tg: targetOf(T, c.grade),
      noT: cards.filter(x => !x.teacherId).length,
      dis: cards.filter(x => tMode(S, x) === 'dis').length
    };
  }

  function pickTeacher(S, card, L, mode) {
    mode = mode || S.ui.amode;
    if (mode === 'off') return null;
    const br = SB(S, card.subj), h = +card.hours || 0;
    const cap = t => Math.min(+t.wmax || 30, openOf(S, t).tot) - (L[t.id] || 0) >= h && !tcViolation(S, t, card);
    const inCls = {};
    for (const c of S.cards) if (c.classId === card.classId && c.teacherId && c.id !== card.id) inCls[c.teacherId] = (inCls[c.teacherId] || 0) + (+c.hours || 0);
    const order = (a, b) => ((inCls[b.id] ? 1 : 0) - (inCls[a.id] ? 1 : 0)) || (L[a.id] || 0) - (L[b.id] || 0);
    let pool;
    if (br === EP.REHB) {
      const cl = S.classes.find(x => x.id === card.classId);
      const own = cl && cl.rehber && S.teachers.find(t => t.id === cl.rehber);
      if (own) return { t: own, m: 'rehber' };
      const rc = {};
      for (const c of S.cards) if (c.id !== card.id && c.classId !== card.classId && c.teacherId && SB(S, c.subj) === EP.REHB) rc[c.teacherId] = (rc[c.teacherId] || 0) + 1;
      for (const c of S.classes) if (c.id !== card.classId && c.rehber) rc[c.rehber] = (rc[c.rehber] || 0) + 1;
      pool = S.teachers.filter(t => inCls[t.id] && cap(t)).sort((a, b) => (rc[a.id] || 0) - (rc[b.id] || 0) || (inCls[b.id] || 0) - (inCls[a.id] || 0));
      if (!pool.length) pool = S.teachers.filter(cap).sort((a, b) => (rc[a.id] || 0) - (rc[b.id] || 0) || (L[a.id] || 0) - (L[b.id] || 0));
      return pool[0] ? { t: pool[0], m: 'rehber' } : null;
    }
    pool = S.teachers.filter(t => t.branch === br && cap(t)).sort(order);
    if (pool[0]) return { t: pool[0], m: 'brans' };
    if (mode === 'brans_ek') {
      pool = S.teachers.filter(t => t.branch !== br && (t.extra || []).includes(card.subj) && cap(t)).sort(order);
      if (pool[0]) return { t: pool[0], m: 'ek' };
    }
    return null;
  }

  function assignCards(S, cards, mode) {
    const L = loads(S); let n = 0, ek = 0;
    const rehber = cards.filter(c => SB(S, c.subj) === EP.REHB), rest = cards.filter(c => SB(S, c.subj) !== EP.REHB);
    for (const c of [...rest, ...rehber]) {
      if (c.teacherId) continue;
      const r = pickTeacher(S, c, L, mode);
      if (r) { c.teacherId = r.t.id; L[r.t.id] = (L[r.t.id] || 0) + (+c.hours || 0); n++; if (r.m === 'ek') ek++; }
    }
    return { n, ek, miss: cards.filter(c => !c.teacherId).length };
  }

  function setRehber(S, c, tid) {
    c.rehber = tid; let n = 0;
    for (const x of S.cards) if (x.classId === c.id && SB(S, x.subj) === EP.REHB && tid && x.teacherId !== tid) { x.teacherId = tid; n++; }
    return n;
  }

  function rehberAuto(S) {
    const used = new Set(), L = loads(S); let n = 0;
    for (const c of S.classes) {
      let t = c.rehber && !used.has(c.rehber) ? S.teachers.find(x => x.id === c.rehber) : null;
      if (!t) {
        const inCls = {};
        for (const x of S.cards) if (x.classId === c.id && x.teacherId && SB(S, x.subj) !== EP.REHB) inCls[x.teacherId] = (inCls[x.teacherId] || 0) + (+x.hours || 0);
        const cand = S.teachers.filter(x => !used.has(x.id)).sort((a, b) => (inCls[b.id] || 0) - (inCls[a.id] || 0) || (L[a.id] || 0) - (L[b.id] || 0));
        t = cand[0] || null;
      }
      if (t) { used.add(t.id); if (c.rehber !== t.id) n++; setRehber(S, c, t.id); }
    }
    return n;
  }

  function findClassSubjCard(S, classId, subj) {
    const targetName = String(SN(S, subj) || '').trim().toLocaleLowerCase('tr');
    return (S.cards || []).find(c =>
      c.classId === classId &&
      (c.subj === subj || (targetName && String(SN(S, c.subj) || '').trim().toLocaleLowerCase('tr') === targetName))
    ) || null;
  }

  function newCard(S, classId, subj, hours, kind) {
    if (findClassSubjCard(S, classId, subj)) return null;
    const c = { id: uid(), classId, subj, hours: +hours, pattern: patFor(hours), teacherId: '', roomId: '', kind };
    c.pattern = effPats(S, c)[0];
    S.cards.push(c);
    return c;
  }

  function applyTemplate(S, cls, onlyMissing) {
    const T = typeOf(S), out = [];
    for (const z of zFor(S, T, cls.grade)) {
      const k = ensureSubj(S, z.name, cls.grade);
      if (findClassSubjCard(S, cls.id, k)) continue;
      const nc = newCard(S, cls.id, k, z.hours, 'zorunlu');
      if (nc) out.push(nc);
    }
    return out;
  }

  function closeExtra(S, c) {
    const T = typeOf(S), tg = targetOf(T, c.grade), D = +S.school.D, P = +S.school.P;
    let extra = D * P - tg;
    if (!tg || extra <= 0) return;
    const cl = new Set(c.closed || []);
    for (let p = P - 1; p >= 0 && extra > 0; p--) {
      for (let d = D - 1; d >= 0 && extra > 0; d--) {
        if (!cl.has(d + '-' + p)) { cl.add(d + '-' + p); extra--; }
      }
    }
    c.closed = [...cl];
  }

  /* ---------- Kilit Etkisi & Neden Açıklayıcılar ---------- */
  function lockedIds(S) { return Object.keys(S.place || {}).filter(k => S.place[k].lock); }

  function lockedInClosed(S, kind, id) {
    const cm = cardMap(S), out = [];
    for (const k in S.place) {
      const pl = S.place[k]; if (!pl.lock) continue;
      const cd = cm.get(k.split(':')[0]); if (!cd) continue;
      const isT = kind !== 'cls';
      if (isT ? cd.teacherId !== id : cd.classId !== id) continue;
      const e = isT ? S.teachers.find(x => x.id === id) : S.classes.find(x => x.id === id);
      if (!e) continue;
      const len = parsePat(cd.pattern, cd.hours)[+k.split(':')[1]] || 1;
      for (let q = 0; q < len; q++) {
        const kk = pl.d + '-' + (pl.p + q);
        if (isT ? (e.av || {})[kk] === 1 : (e.closed || []).includes(kk)) {
          out.push({ k, txt: `${cName(S, cd.classId)} ${SS(S, cd.subj)} · ${EP.GUN[pl.d]} ${pl.p + 1}. ders` });
          break;
        }
      }
    }
    return out;
  }

  function lockImpact(S, fixedIds, ents) {
    const m = buildModel(S), D = m.D, P = m.P, out = [], cm = cardMap(S);
    const fixed = new Set(fixedIds.filter(id => S.place[id]));
    const tOcc = {}, cOcc = {}, tDay = {};
    const mark = (o, k) => { o[k] = (o[k] || 0) + 1; };
    m.bid.forEach((id, i) => {
      if (!fixed.has(id)) return;
      const b = m.blocks[i], pl = S.place[id];
      for (let k = 0; k < b.len; k++) {
        const kk = pl.d + '-' + (pl.p + k);
        mark(cOcc, S.classes[b.c].id + '|' + kk);
        if (b.t >= 0) { mark(tOcc, S.teachers[b.t].id + '|' + kk); mark(tDay, S.teachers[b.t].id + '|' + pl.d); }
      }
    });
    const core = EP.CORE().make(m);
    m.bid.forEach((id, i) => { if (fixed.has(id)) { const pl = S.place[id]; if (core.valid(i, pl.d * P + pl.p)) core.place(i, pl.d * P + pl.p); } });
    const want = (kind, id) => !ents || (kind === 't' ? ents.t.has(id) : ents.c.has(id));

    S.teachers.forEach((t, ti) => {
      if (!want('t', t.id)) return;
      let rem = 0, cap = 0; const lens = [], dm = +t.dmax || P;
      m.bid.forEach((id, i) => { const b = m.blocks[i]; if (b.t === ti && !fixed.has(id)) { rem += b.len; lens.push([id, i]); } });
      if (!rem) return;
      for (let d = 0; d < D; d++) {
        let f = 0;
        for (let p = 0; p < P; p++) { const kk = d + '-' + p; if ((t.av || {})[kk] !== 1 && !tOcc[t.id + '|' + kk]) f++; }
        cap += Math.max(0, Math.min(f, dm - (tDay[t.id + '|' + d] || 0)));
      }
      if (rem > cap) {
        out.push({ who: t.name, kind: 't', id: t.id, msg: `${t.name}: kilitli olmayan ${rem} saatlik dersi var, ama kapalı saatler${t.dmax ? ' ve günlük ' + t.dmax + ' ders sınırı' : ''} ile kilitli derslerden sonra yalnız ${cap} boş saati kalıyor.` });
      } else {
        const stuck = lens.filter(([, i]) => !core.cands[i].some(s => core.valid(i, s)));
        if (stuck.length) {
          const cd = cm.get(stuck[0][0].split(':')[0]);
          out.push({ who: t.name, kind: 't', id: t.id, msg: `${t.name}: ${stuck.length} blok artık hiçbir boş saate sığmıyor (ör. ${cName(S, cd.classId)} ${SS(S, cd.subj)} ×${m.blocks[stuck[0][1]].len}).` });
        } else {
          const diff = S.rules.some(r => r.type === 'diff' && r.on), segs = [], dcap = [], used = [];
          for (let d = 0; d < D; d++) {
            const sg = []; let run = 0;
            for (let p = 0; p <= P; p++) {
              const kk = d + '-' + p;
              if (p < P && (t.av || {})[kk] !== 1 && !tOcc[t.id + '|' + kk]) run++;
              else { if (run) sg.push(run); run = 0; }
            }
            segs.push(sg); dcap.push(dm - (tDay[t.id + '|' + d] || 0)); used.push(new Set());
          }
          const bl = lens.map(([id, i]) => ({ cid: id.split(':')[0], len: m.blocks[i].len })).sort((x, y) => y.len - x.len);
          let fail = null;
          for (const b of bl) {
            let best = null;
            for (let d = 0; d < D; d++) {
              if (dcap[d] < b.len || (diff && used[d].has(b.cid))) continue;
              const free = segs[d].reduce((x, y) => x + y, 0);
              segs[d].forEach((g, j) => { if (g >= b.len && (!best || free > best.free || (free === best.free && g < best.g))) best = { d, j, g, free }; });
            }
            if (!best) { fail = b; break; }
            segs[best.d][best.j] -= b.len; dcap[best.d] -= b.len; used[best.d].add(b.cid);
          }
          if (fail) {
            const cd = cm.get(fail.cid);
            out.push({ who: t.name, kind: 't', id: t.id, msg: `${t.name}: kapalı saatler ve kilitli derslerden sonra kalan boşluklar parçalı; ${cName(S, cd.classId)} ${SS(S, cd.subj)} ×${fail.len} bloğu sığmıyor.` });
          }
        }
      }
    });

    S.classes.forEach((c, ci) => {
      if (!want('c', c.id)) return;
      let rem = 0, cap = 0;
      m.bid.forEach((id, i) => { const b = m.blocks[i]; if (b.c === ci && !fixed.has(id)) rem += b.len; });
      if (!rem) return;
      for (let d = 0; d < D; d++) for (let p = 0; p < P; p++) { const kk = d + '-' + p; if (!(c.closed || []).includes(kk) && !cOcc[c.id + '|' + kk]) cap++; }
      if (rem > cap) out.push({ who: c.name, kind: 'c', id: c.id, msg: `${c.name}: kilitli olmayan ${rem} saatlik dersi var, ama kapalı ve kilitli saatlerden sonra yalnız ${cap} boş saat kalıyor.` });
    });
    return out;
  }

  function impactFor(S, ids) {
    const cm = cardMap(S), ents = { t: new Set(), c: new Set() }, notes = [];
    for (const id of ids) {
      const cd = cm.get(id.split(':')[0]), pl = S.place[id];
      if (!cd || !pl) continue;
      ents.c.add(cd.classId); if (cd.teacherId) ents.t.add(cd.teacherId);
      const t = S.teachers.find(x => x.id === cd.teacherId), len = parsePat(cd.pattern, cd.hours)[+id.split(':')[1]] || 1;
      for (let k = 0; k < len; k++) {
        const kk = pl.d + '-' + (pl.p + k);
        if (t && (t.av || {})[kk] === 2) notes.push(`${t.name} ${EP.GUN[pl.d]} ${pl.p + k + 1}. saati “tercihen boş” olarak işaretlemiş.`);
      }
    }
    const lk = lockedIds(S);
    const before = new Set(lockImpact(S, lk.filter(x => !ids.includes(x)), ents).map(x => x.msg));
    const after = lockImpact(S, [...new Set([...lk, ...ids])], ents).filter(x => !before.has(x.msg)).map(x => x.msg);
    return [...notes, ...after];
  }

  function whyText(S, w, m) {
    if (!w) return '';
    if (w === 'lunch') return 'blok öğle arasından bölünüyor';
    if (w === 'allow') return 'kapalı saat ya da blok gün sonuna taşıyor';
    if (w === 'cls') return 'sınıfın bu saati dolu';
    if (w === 'dmax') return 'öğretmenin günlük ders sınırı doluyor';
    if (w === 'cmax') return 'öğretmenin üst üste ders sınırı aşılıyor';
    if (w === 'diff') return 'aynı ders aynı güne düşüyor';
    if (w === 'pair') return 'birlikte yazılmayacak ders kuralı';
    if (w.startsWith('tch:')) {
      const j = +w.slice(4), cd = cardMap(S).get(m.bid[j].split(':')[0]);
      return 'öğretmenin bu saatte ' + (cd ? cName(S, cd.classId) + ' ' + SS(S, cd.subj) : 'başka') + ' dersi var';
    }
    return w;
  }

  function whyAt(S, m, c, i, s0) {
    const w = c.why(i, s0);
    if (w !== 'allow') return whyText(S, w, m);
    const b = m.blocks[i], P = m.P, d = (s0 / P) | 0, p = s0 % P, cl = S.classes[b.c], t = b.t >= 0 ? S.teachers[b.t] : null;
    for (let k = 0; k < b.len; k++) {
      const key = d + '-' + (p + k);
      if (p + k >= P) return b.len + ' saatlik blok gün sonuna taşıyor';
      if ((cl.closed || []).includes(key)) return cl.name + ' sınıfının ' + (p + k + 1) + '. saati kapalı';
      if (t && (t.av || {})[key] === 1) return t.name + ' bu saatte kapalı (öğretmen kısıtı)';
    }
    return 'bu saat bu ders için kapalı';
  }

  /* ---------- PASS 0 Ön Kontrol (Kapasite + Hall Gün Grubu + Kilit + Derslik) ---------- */
  function dayList(S, mask) {
    const r = [];
    for (let d = 0; d < +S.school.D; d++) if (mask >> d & 1) r.push(EP.GUN[d]);
    return r.length > 1 ? r.slice(0, -1).join(', ') + ' ve ' + r.at(-1) : r[0];
  }

  function precheck(S) {
    const out = [], D = +S.school.D, P = +S.school.P, L = loads(S);
    const noT = S.cards.filter(c => !c.teacherId || !S.teachers.some(t => t.id === c.teacherId));
    if (noT.length) out.push({ lvl: 'err', msg: `${noT.length} ders kartının öğretmeni yok (${noT.slice(0, 4).map(c => esc(cName(S, c.classId)) + ' ' + esc(SS(S, c.subj))).join(', ')}${noT.length > 4 ? '…' : ''}).`, sug: 'Ders Görevlendirmeleri ekranında “Boştaki derslere ata” ile doldurabilirsiniz.', go: 'assignments' });
    const badP = S.cards.filter(c => !patOk(c));
    if (badP.length) out.push({ lvl: 'err', msg: `${badP.length} kartın blok düzeni saatle tutmuyor (örnek: ${esc(cName(S, badP[0].classId))} ${esc(SN(S, badP[0].subj))}: ${esc(badP[0].pattern)} ≠ ${badP[0].hours} saat).`, sug: 'Blok düzenini güncelleyin.', go: 'assignments' });

    const T = S.teachers.map(t => ({ t, load: L[t.id] || 0, op: openOf(S, t) }));
    const C = S.classes.map(c => ({ c, h: classHours(S, c.id), op: classOpen(S, c) }));

    for (const x of T) {
      if (!x.load) continue;
      if (x.load > x.op.tot) out.push({ lvl: 'err', msg: `${esc(x.t.name)}: ${x.load} saat dersi var ama haftada en fazla ${x.op.tot} saat girebiliyor.`, sug: `Kapalı saatlerinden en az ${x.load - x.op.tot} saati açın veya bazı derslerini başka öğretmene verin.`, go: 'teachers', id: x.t.id });
      else if (x.load === x.op.tot) out.push({ lvl: 'warn', msg: `${esc(x.t.name)}: ${x.load} saat ders, ${x.op.tot} açık saat. Hiç esneklik yok; her açık saati dolu olmak zorunda.`, sug: 'Mümkünse 1–2 saat daha açın; dağıtım çok daha kolay bulunur.', go: 'teachers', id: x.t.id });
    }
    for (const x of C) {
      if (x.h > x.op.tot) out.push({ lvl: 'err', msg: `${esc(x.c.name)}: ${x.h} saat ders var, sınıfın açık saati ${x.op.tot}.`, sug: 'Sınıfın kapalı saatlerini azaltın veya ders saatlerini düşürün.', go: 'classes', id: x.c.id });
    }
    const full = C.filter(x => x.h && x.h === x.op.tot).length;
    if (full) out.push({ lvl: 'info', msg: `${full} sınıfta ders saati açık saate eşit; bu sınıflarda boş ders olmayacak.` });

    const m = buildModel(S), core = EP.CORE().make(m), cm = cardMap(S), seen = new Set();
    m.bid.forEach((id, i) => {
      const cid = id.split(':')[0]; if (seen.has(cid)) return;
      if (core.cands[i].length === 0 && effPats(S, cm.get(cid)).length === 1) {
        seen.add(cid); const cd = cm.get(cid);
        out.push({ lvl: 'err', msg: `${esc(cName(S, cd.classId))} ${esc(SN(S, cd.subj))}: ${m.blocks[i].len} saatlik blok için sınıfın ve öğretmenin aynı anda boş olduğu ardışık saat yok.`, sug: 'Öğretmenin kapalı saatlerini, öğle arası blok kuralını veya saat yasağını gözden geçirin.', go: 'teachers', id: cd.teacherId });
      }
    });
    if (S.rules.some(r => r.type === 'diff' && r.on)) {
      for (const cd of S.cards) {
        const t = S.teachers.find(x => x.id === cd.teacherId); if (!t) continue;
        const n = Math.min(...effPats(S, cd).map(p => p.split('+').length)); if (n > D) continue;
        const days = openOf(S, t).per.filter(v => v > 0).length;
        if (n > days) out.push({ lvl: 'err', msg: `${esc(cName(S, cd.classId))} ${esc(SN(S, cd.subj))} ${n} bloğa bölünmüş ve her blok ayrı güne gitmeli, ama ${esc(t.name)} yalnızca ${days} gün açık.`, sug: 'Blok düzenini azaltın (örneğin 3+2) veya öğretmene bir gün açın.', go: 'teachers', id: t.id });
      }
    }

    // Hall Gün Grubu Kapasite Kontrolü
    const found = [];
    for (let mask = 1; mask < (1 << D); mask++) {
      if (found.some(f => (f & mask) === f)) continue;
      let demand = 0, room = 0;
      for (const x of C) {
        let inD = 0, outD = 0;
        x.op.per.forEach((v, d) => { if (mask >> d & 1) inD += v; else outD += v; });
        room += inD; demand += Math.max(0, x.h - outD);
      }
      let supply = 0, tneed = 0; const lack = [], needers = [];
      for (const x of T) {
        if (!x.load) continue;
        let inD = 0, outD = 0, fullIn = 0;
        x.op.per.forEach((v, d) => { if (mask >> d & 1) { inD += v; fullIn += Math.min(P, +x.t.dmax || P); } else outD += v; });
        supply += Math.min(x.load, inD);
        const nd = Math.max(0, x.load - outD); tneed += nd;
        if (nd > 0) needers.push(x);
        const gain = Math.min(x.load, fullIn) - Math.min(x.load, inD);
        if (gain > 0) lack.push({ x, gain });
      }
      if (demand > supply) {
        found.push(mask); lack.sort((a, b) => b.gain - a.gain);
        out.push({
          lvl: 'err', grp: true, go: 'teachers', id: lack[0] && lack[0].x.t.id,
          msg: `${dayList(S, mask)}: sınıflarda bu günlerde en az ${demand} ders saati dolmalı, ama açık öğretmenler en fazla ${supply} saat girebilir (${demand - supply} saat eksik).`,
          sug: lack.length ? 'Öneri: ' + lack.slice(0, 3).map(l => `${esc(l.x.t.name)} kapalı saatlerini açarsa +${l.gain} saat`).join('; ') + '.' : 'Bu günlerde sınıf saatlerini azaltın.'
        });
      } else if (tneed > room) {
        found.push(mask);
        out.push({
          lvl: 'err', grp: true, go: 'teachers', id: needers[0] && needers[0].t.id,
          msg: `${dayList(S, mask)}: ${needers.map(x => esc(x.t.name)).slice(0, 4).join(', ')} başka günlere sığmayan toplam ${tneed} saati bu günlere koymak zorunda, ama sınıflarda ${room} saat var.`,
          sug: 'Öneri: bu öğretmenlerin diğer günlerdeki kapalı saatlerinden bazılarını açın.'
        });
      }
    }

    const ST = typeOf(S);
    if (ST) {
      const secBad = [], totBad = [];
      for (const c of S.classes) {
        if (gIdx(ST, c.grade) < 0) continue;
        const st = clsStat(S, c);
        if (st.lim && st.s !== st.lim) secBad.push(esc(c.name) + ' ' + st.s + '/' + st.lim);
        if (st.tg && st.tot !== st.tg) totBad.push(esc(c.name) + ' ' + st.tot + '/' + st.tg);
      }
      if (secBad.length) out.push({ lvl: 'warn', msg: `${secBad.length} şubede seçmeli ders saati çizelgeyle tutmuyor: ${secBad.slice(0, 6).join(', ')}${secBad.length > 6 ? '…' : ''}.`, sug: 'Ders Görevlendirmeleri adımında seçmeli havuzundan düzenleyin.', go: 'assignments' });
      if (totBad.length) out.push({ lvl: 'info', msg: `${totBad.length} şubenin haftalık toplamı çizelgeden farklı: ${totBad.slice(0, 6).join(', ')}${totBad.length > 6 ? '…' : ''}.`, go: 'assignments' });
    }

    const lk = lockedIds(S);
    if (lk.length) {
      const bad = [];
      for (const t of S.teachers) bad.push(...lockedInClosed(S, 'tch', t.id).map(x => x.txt + ' (' + esc(t.name) + ' bu saatte kapalı)'));
      for (const c of S.classes) bad.push(...lockedInClosed(S, 'cls', c.id).map(x => x.txt + ' (sınıfın bu saati kapalı)'));
      if (bad.length) out.push({ lvl: 'err', msg: `${bad.length} kilitli ders kapalı bir saatte duruyor: ${bad.slice(0, 3).join('; ')}.`, sug: 'Saati açın ya da Dağıtım ekranında kilidi açıp taşıyın.', go: 'auto_schedule' });
      const cm2 = cardMap(S), le = { t: new Set(), c: new Set() };
      for (const k of lk) { const cd = cm2.get(k.split(':')[0]); if (cd) { le.c.add(cd.classId); if (cd.teacherId) le.t.add(cd.teacherId); } }
      for (const x of lockImpact(S, lk, le).slice(0, 6)) out.push({ lvl: 'err', msg: esc(x.msg), sug: 'Kilitli derslerden birini taşıyın, kilidini açın ya da kapalı saatleri gevşetin.', go: x.kind === 't' ? 'teachers' : 'classes', id: x.id });
    }

    const byReh = {};
    for (const c of S.cards) if (SB(S, c.subj) === EP.REHB && c.teacherId) (byReh[c.teacherId] = byReh[c.teacherId] || new Set()).add(cName(S, c.classId));
    const dupReh = Object.entries(byReh).filter(([, v]) => v.size > 1);
    if (dupReh.length) {
      const [tid, cs] = dupReh[0], t = S.teachers.find(x => x.id === tid);
      out.push({ lvl: 'warn', msg: `Rehberlik dersleri aynı öğretmende: ${esc(t ? t.name : '?')} (${[...cs].map(esc).join(', ')}). Ortak rehberlik saati için her şubede ayrı rehber öğretmen gerekir.`, sug: 'Sınıflar ekranında “Rehber öğretmenleri dağıt” düğmesini kullanın.', go: 'classes' });
    }

    const vtc = tcAll(S);
    if (vtc.length) out.push({ lvl: 'warn', msg: `${vtc.length} ders, sınıf başına öğretmen ders sınırını aşıyor (ör. ${esc(vtc[0].t.name)}: ${esc(cName(S, vtc[0].c.classId))} ${vtc[0].v.h}/${vtc[0].v.r.max} sa).`, sug: 'Kural ve Kısıt Yönetimi adımındaki “yeniden ata” düğmesini kullanın.', go: 'constraints' });

    const order = { err: 0, warn: 1, info: 2 };
    return out.sort((a, b) => order[a.lvl] - order[b.lvl]);
  }

  function quality(S) {
    const D = +S.school.D, P = +S.school.P, o = occ(S), L = loads(S);
    return S.teachers.map(t => {
      const G = o.tG[t.id] || {}, per = [];
      let gaps = 0, maxc = 0, pv = 0, days = 0;
      for (let d = 0; d < D; d++) {
        let n = 0, f = -1, l = -1, run = 0;
        for (let p = 0; p < P; p++) {
          const c = G[d + '-' + p];
          if (c) { n++; if (f < 0) f = p; l = p; run++; maxc = Math.max(maxc, run); if ((t.av || {})[d + '-' + p] === 2) pv++; }
          else run = 0;
        }
        per.push(n); if (n) { days++; gaps += l - f + 1 - n; }
      }
      return { t, load: L[t.id] || 0, per, days, gaps, maxc, pv };
    });
  }

  function editInfoFor(S, targetId) {
    const { m, c } = placedCore(S), i = m.bid.indexOf(targetId);
    if (i < 0) return null;
    const from = c.pos[i];
    if (from >= 0) c.unplace(i);
    const tg = new Set(c.cands[i].filter(s => c.valid(i, s))), sw = new Map();
    if (from >= 0) {
      const b = m.blocks[i];
      m.bid.forEach((id, j) => {
        if (j === i) return;
        const bj = m.blocks[j], sj = c.pos[j];
        if (sj < 0 || bj.c !== b.c || bj.len !== b.len) return;
        c.unplace(j); let ok = false;
        if (c.valid(i, sj)) { c.place(i, sj); ok = c.valid(j, from); c.unplace(i); }
        c.place(j, sj);
        if (ok) sw.set(id, sj);
      });
    }
    return { i, from, tg, sw, m };
  }

  Object.assign(EP, {
    esc, uid, hrsList, patSum, patFor, parsePat, patOk, autoDefault, partitions, minPats, ensure2,
    blank, demo, v3ToState, migrateState, stateToV3Project, applyV3SolutionToState, sanitizeExportProject,
    typeOf, gIdx, zFor, poolFor, secLimit, targetOf, findSubj, ensureSubj,
    SN, SS, SB, nameOf, blkKey, blkCfgN, blkCfg, effCfg, effPats, dropPlace, syncPattern, syncAll,
    times, cardMap, tName, tShort, cName, loads, openOf, classHours, classOpen,
    buildModel, placedCore, occ, SCOPE, modeFor, tMode, tcRulesFor, tcHours, tcViolation, tcAll,
    rehberOf, clsStat, pickTeacher, assignCards, setRehber, rehberAuto, findClassSubjCard, newCard, applyTemplate, closeExtra,
    lockedIds, lockedInClosed, lockImpact, impactFor, whyText, whyAt, precheck, quality, editInfoFor
  });
})(typeof window !== 'undefined' ? window : globalThis);
