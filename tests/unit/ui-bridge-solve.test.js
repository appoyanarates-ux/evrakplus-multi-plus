import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { validateProjectSchema, buildSolverInput } from '../../packages/core-schema/src/index.js';
import { validateSchedule, evaluateSolution } from '../../packages/validator/src/index.js';
import { OrToolsAdapter } from '../../engines/ortools/adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const uiDir = path.join(rootDir, 'packages', 'ui-shared', 'public');

function loadUiNamespace() {
  const ctx = { console, Math, Date, Set, Map, Array, Object, Number, String, Boolean, JSON, RegExp, Int32Array, Int16Array, Int8Array, Uint8Array };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const file of ['meb-data.js', 'solver-bridge.js', 'reports-doc.js']) {
    const src = fs.readFileSync(path.join(uiDir, file), 'utf8');
    vm.runInContext(src, ctx, { filename: file });
  }
  return ctx.EP;
}

test('UI PASS 0 precheck detects Hall day-group shortage in conflict demo', () => {
  const EP = loadUiNamespace();
  const conflictSchool = EP.demo(true);
  const issues = EP.precheck(conflictSchool);
  assert.ok(issues.some(x => x.lvl === 'err' && x.grp === true), 'Conflict demo must trigger Hall day-group error');
});

test('UI state -> v3 schema -> real OR-Tools CP-SAT -> independent validator -> UI board & reports', async () => {
  const EP = loadUiNamespace();
  const schoolState = EP.demo(false);

  // 1. Convert UI state to v3 project and validate against core-schema
  const v3Project = EP.stateToV3Project(schoolState);
  const schemaCheck = validateProjectSchema(v3Project);
  assert.equal(schemaCheck.valid, true, `Schema errors: ${schemaCheck.errors.join('; ')}`);

  // 2. Solve live with real Google OR-Tools CP-SAT
  const venvPython = path.join(rootDir, '.venv', 'Scripts', 'python.exe');
  const adapter = new OrToolsAdapter({ pythonBin: fs.existsSync(venvPython) ? venvPython : 'python' });
  const input = buildSolverInput(v3Project, { timeLimitSeconds: 15, numWorkers: 2 });
  const res = await adapter.solve(input);

  assert.ok(['OPTIMAL', 'FEASIBLE'].includes(res.status), `Unexpected OR-Tools status: ${res.status}`);
  const validation = validateSchedule(input, res.placements);
  assert.equal(validation.isHardValid, true, `Hard violations: ${JSON.stringify(validation.hardViolations)}`);
  const score = evaluateSolution(input, res.placements, res.status);
  assert.ok(score.qualityScore > 50, `Expected high quality score, got ${score.qualityScore}`);

  // 3. Apply placements back into UI state and verify board occupancy + official reports
  const placedCount = EP.applyV3SolutionToState(schoolState, res, true);
  assert.equal(placedCount, input.blocks.length, 'Every block must be mapped back to UI state');

  const occ = EP.occ(schoolState);
  assert.equal(occ.un.length, 0, 'Zero unplaced blocks expected on UI board');

  const classDoc = EP.docsFor(schoolState, 'cp', '');
  const sheetDoc = EP.docsFor(schoolState, 'cs', '');
  const teacherDoc = EP.docsFor(schoolState, 'tp', '');
  const dutyAssigned = EP.dutyAuto(schoolState);
  const dutyDoc = EP.docsFor(schoolState, 'nb', '');
  const csv = EP.csvExport(schoolState);

  assert.ok(classDoc.includes('Sınıflar Ders Programı'));
  assert.ok(sheetDoc.includes('Sınıflar Ders Programı'));
  assert.ok(teacherDoc.includes('Aslını Aldım'));
  assert.ok(dutyAssigned > 0 && dutyDoc.includes('ÖĞRETMEN NÖBET VE SOSYAL KULÜP ÇİZELGESİ'));
  assert.ok(csv.includes('5/A') && csv.includes('MAT'));

  // 4. Verify v2 <-> v3 roundtrip & backup sanitization strips secrets
  schoolState.apiSecretToken = 'should-be-stripped';
  const clean = EP.sanitizeExportProject(schoolState);
  assert.equal(clean.apiSecretToken, undefined);
  const restored = EP.migrateState(v3Project);
  assert.equal(restored.classes.length, schoolState.classes.length);
  assert.equal(restored.teachers.length, schoolState.teachers.length);
});

test('MEB social clubs, admin duty exemption, simplified menus & zero GitHub links in UI', () => {
  const EP = loadUiNamespace();

  // 1. Official MEB 8 mandatory clubs + thematic clubs present
  assert.ok(EP.SOCIAL_CLUBS.length >= 35, 'Expected full MEB social clubs catalog');
  for (const req of ['Kızılay Kulübü', 'Yeşilay Kulübü', 'Beyazay Kulübü', 'Siberay Kulübü', 'Tarih ve Kültürel Miras Kulübü', 'Tabiat ve Yaşanabilir Çevre Kulübü', 'Sağlıklı Yaşam ve Fiziksel Aktivite Kulübü', 'Yaşam Becerileri Kulübü']) {
    assert.ok(EP.SOCIAL_CLUBS.includes(req), `Missing mandatory MEB club: ${req}`);
  }

  // 2. Okul Müdürü & Müdür Yardımcıları never receive teacher duties; VPs fill Nöbetçi İdareci
  const st = EP.demo(false);
  st.school.mudur = 'Ahmet Yılmaz';
  st.school.myard = [{ id: 'my1', name: 'Mehmet Demir', gorev: 'Nöbet' }, { id: 'my2', name: 'Ayşe Kaya', gorev: 'Ders Programı' }];
  st.teachers[0].role = 'mudur';
  st.teachers[1].role = 'mudur_yardimcisi';
  st.teachers[2].dutyExempt = true;
  st.teachers[0].dutyD = '0'; st.teachers[0].dutyP = 'Bahçe';
  st.teachers[1].dutyD = '1'; st.teachers[1].dutyP = 'Koridor';

  EP.dutyAuto(st);
  assert.equal(st.teachers[0].dutyD, '', 'Okul Müdürü must never get teacher duty');
  assert.equal(st.teachers[1].dutyD, '', 'Müdür Yardımcısı must never get teacher duty');
  assert.equal(st.teachers[2].dutyD, '', 'Exempt teacher must never get teacher duty');
  assert.notEqual(st.teachers[3].dutyD, '', 'Regular teacher should get duty assigned');
  assert.equal(st.duty.admin[0], 'Mehmet Demir');
  assert.equal(st.duty.admin[1], 'Ayşe Kaya');

  // 3. Club auto-assign works and skips admins
  const assignedClubs = EP.clubAuto(st);
  assert.ok(assignedClubs >= 7);
  assert.equal(st.teachers[0].kulup, '', 'Okul Müdürü should not be auto-assigned a club');
  assert.ok(EP.SOCIAL_CLUBS.includes(st.teachers[3].kulup));

  // 4. Redundant menus 10 & 11 removed, rooms moved inside school settings, dedicated duty menu present, zero GitHub links in UI files
  const menuIds = EP.MENUS.map(m => m[0]);
  assert.ok(!menuIds.includes('multi_solver'));
  assert.ok(!menuIds.includes('manual_schedule'));
  assert.ok(!menuIds.includes('rooms'), 'Derslikler ve Binalar must live inside Okul Ayarları');
  assert.ok(menuIds.includes('duty'), 'Dedicated Okul Nöbeti menu must exist');
  assert.equal(EP.TYPES.ilk.ad, 'Ortaokul');
  assert.deepEqual([...EP.TYPES.ilk.grades], [5, 6, 7, 8]);
  assert.ok(Array.isArray(EP.VIVID_PALETTE) && EP.VIVID_PALETTE.length >= 30, 'Vivid color palette must have >= 30 distinct colors');

  // 4c. Monthly duty calendar, open/close dates & strict max-1-day/week rule
  const mRows = EP.buildMonthlyDuty(st, '2026-11', 'rotate');
  assert.ok(mRows.length >= 20, 'November 2026 must generate >= 20 school duty days');
  // Close a specific date (e.g. 2026-11-10) and verify it gets zero duties while weekly max-1-day rule holds
  const closedNow = EP.toggleDutyClosedDate(st, '2026-11-10');
  assert.equal(closedNow, true, '2026-11-10 must be marked closed');
  const rowsAfterClose = st.duty.monthly['2026-11'];
  const closedRow = rowsAfterClose.find(r => r.date === '2026-11-10');
  assert.ok(closedRow && closedRow.closed === true, 'Closed date must have closed=true');
  assert.equal(Object.values(closedRow.posts).flat().length, 0, 'Closed date must have zero assigned teachers');
  // Verify NO teacher has duty more than 1 day in ANY calendar week of the month
  const byWeek = new Map();
  for (const r of rowsAfterClose) {
    if (r.closed) continue;
    if (!byWeek.has(r.weekKey)) byWeek.set(r.weekKey, new Set());
    const seen = byWeek.get(r.weekKey);
    for (const arr of Object.values(r.posts || {})) {
      for (const nm of arr) {
        assert.ok(!seen.has(nm), `Teacher "${nm}" assigned more than 1 day in calendar week ${r.weekKey}`);
        seen.add(nm);
      }
    }
  }
  // Verify manual same-week duplicate detector catches violations
  const openInSameWeek = rowsAfterClose.filter(r => !r.closed && r.weekKey === closedRow.weekKey);
  if (openInSameWeek.length >= 2) {
    const firstAssigned = Object.values(openInSameWeek[0].posts).flat()[0];
    if (firstAssigned) {
      const idx2 = rowsAfterClose.indexOf(openInSameWeek[1]);
      const dup = EP.checkMonthlyWeekDup(rowsAfterClose, idx2, EP.dutyPlaces(st)[0], [firstAssigned]);
      assert.ok(dup && dup.name === firstAssigned, 'checkMonthlyWeekDup must detect same-week duplicate');
    }
  }
  const mDocClean = EP.docMonthlyDuty(st, '2026-11', { watermark: false });
  const mDocWm = EP.docMonthlyDuty(st, '2026-11', { watermark: true });
  assert.ok(mDocClean.includes('KASIM 2026 AYI ÖĞRETMEN NÖBET ÇİZELGESİ') && mDocClean.includes('KAPALI / TATİL') && !mDocClean.includes('wm-giant'));
  assert.ok(mDocWm.includes('wm-giant') && mDocWm.includes('EVRAK PLUS'));

  // 4b. Duplicate course assignment to the same class must be blocked
  const cls0 = st.classes[0];
  const beforeCount = st.cards.length;
  const dupAttempt = EP.newCard(st, cls0.id, 'MAT', 5, 'zorunlu');
  assert.equal(dupAttempt, null, 'Assigning the same subject twice to the same class must return null');
  assert.equal(st.cards.length, beforeCount);
  assert.ok(EP.findClassSubjCard(st, cls0.id, 'MAT'));

  for (const f of ['index.html', 'styles.css', 'meb-data.js', 'solver-bridge.js', 'reports-doc.js', 'app.js']) {
    const content = fs.readFileSync(path.join(uiDir, f), 'utf8');
    assert.ok(!/github\.com/i.test(content), `Found forbidden github.com reference in ${f}`);
  }

  // 5. Guest export includes giant + small EVRAK PLUS watermarks; member export is 100% clean
  const wmDoc = EP.docsFor(st, 'cp', '', { watermark: true });
  const cleanDoc = EP.docsFor(st, 'cp', '', { watermark: false });
  assert.ok(wmDoc.includes('wm-giant') && wmDoc.includes('EVRAK PLUS') && wmDoc.includes('wm-big') && wmDoc.includes('wm-q1') && wmDoc.includes('wm-top'));
  assert.ok(!cleanDoc.includes('wm-giant') && !cleanDoc.includes('wm-big') && !cleanDoc.includes('wm-layer'));

  const wmCsv = EP.csvExport(st, { watermark: true });
  const cleanCsv = EP.csvExport(st, { watermark: false });
  assert.ok(wmCsv.includes('EVRAK PLUS'));
  assert.ok(!cleanCsv.includes('EVRAK PLUS'));
});

test('TTKB 2025/2026 school type groups, mandatory/elective math audit & Hazırlık (grade 0) roundtrip', () => {
  const EP = loadUiNamespace();

  // 1. TYPE_GROUPS covers 100% of EP.TYPES with zero orphans or duplicates
  assert.equal(EP.TYPE_GROUPS.length, 6, 'Expected 6 MEB school type groups');
  const groupedKeys = EP.TYPE_GROUPS.flatMap(g => g.types);
  const typeKeys = Object.keys(EP.TYPES);
  assert.equal(groupedKeys.length, new Set(groupedKeys).size, 'Duplicate type key in TYPE_GROUPS');
  assert.deepEqual([...groupedKeys].sort(), [...typeKeys].sort(), 'TYPE_GROUPS must match EP.TYPES 1-to-1');
  assert.equal(typeKeys.length, 26, 'Expected 26 school types (22 official TTKB + 4 editable drafts)');

  // 2. Elementary 1-4 grades must NOT be in ilk, muzik_oo, ozel_ogretim, ozel_egitim
  for (const k of ['ilk', 'iho', 'spor_oo', 'muzik_oo']) {
    assert.deepEqual([...EP.TYPES[k].grades], [5, 6, 7, 8], `${k} must cover grades 5-8 only`);
  }
  assert.deepEqual([...EP.TYPES.ozel_ogretim.grades], [5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual([...EP.TYPES.ozel_egitim.grades], [5, 6, 7, 8, 9, 10, 11, 12]);

  // 3. Mathematical integrity check across EVERY school type & grade column
  for (const [key, t] of Object.entries(EP.TYPES)) {
    assert.equal(t.grades.length, t.total.length, `${key}: grades/total length mismatch`);
    assert.equal(t.grades.length, t.sec.length, `${key}: grades/sec length mismatch`);
    assert.ok(!t.poolNote, `${key}: should not carry outdated poolNote warning`);

    for (const row of t.z) {
      assert.equal(row[1].length, t.grades.length, `${key} mandatory "${row[0]}" length mismatch`);
    }
    for (let i = 0; i < t.grades.length; i++) {
      const zSum = t.z.reduce((acc, r) => acc + Number(r[1][i] || 0), 0);
      assert.equal(
        zSum + t.sec[i],
        t.total[i],
        `${key} grade ${t.grades[i]}: mandatory(${zSum}) + elective(${t.sec[i]}) !== total(${t.total[i]})`
      );
    }

    const seenPoolNames = new Set();
    for (const row of t.pool) {
      assert.ok(EP.GRP[row[1]], `${key} elective "${row[0]}" references unknown GRP "${row[1]}"`);
      assert.ok(t.groups.includes(row[1]), `${key} elective "${row[0]}" group "${row[1]}" missing from t.groups`);
      assert.equal(
        row[3].split('|').length,
        t.poolGrades.length,
        `${key} elective "${row[0]}" pipe columns (${row[3].split('|').length}) !== poolGrades (${t.poolGrades.length})`
      );
      assert.ok(!seenPoolNames.has(row[0]), `${key} duplicate elective name "${row[0]}"`);
      seenPoolNames.add(row[0]);
    }
  }

  // 4. Verify specific TTKB fixes (SBL Osmanlı Türkçesi 11th grade = 2, GSL = 43 hrs, Proje = 45 hrs)
  const sblOsm = EP.TYPES.sbl.z.find(r => r[0] === 'Osmanlı Türkçesi');
  assert.deepEqual([...sblOsm[1]], [2, 2, 2, 0]);
  assert.deepEqual([...EP.TYPES.gsl_gorsel.total], [43, 43, 43, 43]);
  assert.deepEqual([...EP.TYPES.ozel_al.total], [45, 45, 45, 45, 45]);
  assert.deepEqual([...EP.TYPES.ozel_fen.total], [45, 45, 45, 45, 45]);
  assert.deepEqual([...EP.TYPES.ozel_sbl.total], [45, 45, 45, 45, 45]);
  assert.deepEqual([...EP.TYPES.spor_lise.total], [40, 40, 40, 40]);

  // 5. Hazırlık (grade: 0) end-to-end roundtrip: applyTemplate -> v3 -> schema validate -> v3ToState
  const st = EP.blank();
  st.school.type = 'ozel_fen';
  st.school.P = 9;
  const hzCls = { id: 'c_hz', name: 'Hz/A', grade: 0, shift: 'full', studentCount: 28, homeRoomId: '', closed: [] };
  st.classes.push(hzCls);
  const created = EP.applyTemplate(st, hzCls, false);
  assert.ok(created.length >= 5, 'Hazırlık template must create mandatory courses');
  const hzHours = created.reduce((a, c) => a + c.hours, 0);
  assert.equal(hzHours, 31, 'Özel Program Fen Lisesi Hazırlık mandatory hours (incl. Rehberlik) must equal 31');
  for (const c of created) {
    assert.ok(!c.subj.endsWith('_SO'), `Hazırlık subject ${c.subj} must never be tagged as Sınıf Öğretmenliği`);
    assert.notEqual(st.subjects[c.subj][2], 'Sınıf Öğretmenliği');
  }
  const v3 = EP.stateToV3Project(st);
  assert.equal(v3.school.schoolType, 'ozel_program_fen_lisesi');
  assert.equal(v3.classes[0].grade, 0, 'v3 export must preserve grade 0 for Hazırlık');
  const check = validateProjectSchema(v3);
  assert.equal(check.valid, true, `Hazırlık v3 schema errors: ${check.errors.join('; ')}`);
  const restored = EP.v3ToState(Object.assign({}, v3, { meta: {} }));
  assert.equal(restored.school.type, 'ozel_fen');
  assert.equal(restored.classes[0].grade, 0, 'v3ToState must preserve grade 0 for Hazırlık');
  assert.equal(EP.gradeLabel(0), 'Hazırlık');
  assert.equal(EP.gradeRange([0, 9, 10, 11, 12]), 'Hazırlık–12. sınıf');
});

test('v2.4.0: haftalık nöbet en yoğun gün + yığılmasız eşit dağıtım (7 öğretmen / 5 gün)', () => {
  const EP = loadUiNamespace();
  const S = EP.blank();
  S.school.D = 5;
  S.school.P = 7;
  S.duty.strategy = 'max_lessons';
  S.duty.avoidZeroDay = true;
  S.classes = [
    { id: 'c1', name: '5/A', grade: 5, closed: [] },
    { id: 'c2', name: '6/A', grade: 6, closed: [] },
    { id: 'c3', name: '7/A', grade: 7, closed: [] },
    { id: 'c4', name: '8/A', grade: 8, closed: [] },
    { id: 'c5', name: '5/B', grade: 5, closed: [] },
    { id: 'c6', name: '6/B', grade: 6, closed: [] },
    { id: 'c7', name: '7/B', grade: 7, closed: [] }
  ];
  // 7 öğretmen: hepsinin en yoğun günleri Pzt(0) ve Sal(1) olmasına rağmen 5 güne eşit [2,2,1,1,1] yayılmalı
  const dailyPatterns = [
    [6, 5, 3, 2, 1], // t0: en yoğun Pzt(6), Sal(5)
    [6, 4, 2, 2, 1], // t1: en yoğun Pzt(6)
    [5, 6, 3, 2, 1], // t2: en yoğun Sal(6)
    [4, 5, 4, 2, 1], // t3: en yoğun Sal(5), Çar(4)
    [3, 4, 5, 3, 2], // t4: en yoğun Çar(5)
    [3, 4, 3, 5, 2], // t5: en yoğun Per(5)
    [3, 4, 2, 3, 5]  // t6: en yoğun Cum(5)
  ];
  S.teachers = dailyPatterns.map((_, i) => ({
    id: `t${i}`,
    name: `Öğretmen ${i + 1}`,
    branch: 'Matematik',
    role: 'ogretmen',
    dutyExempt: false,
    dutyD: '',
    dutyP: '',
    av: {}
  }));
  S.cards = [];
  S.place = {};
  let cardSeq = 0;
  for (let ti = 0; ti < dailyPatterns.length; ti++) {
    for (let d = 0; d < 5; d++) {
      const cnt = dailyPatterns[ti][d];
      for (let p = 0; p < cnt; p++) {
        const cid = `cd_${cardSeq++}`;
        S.cards.push({ id: cid, classId: `c${ti + 1}`, subj: 'MAT', hours: 1, pattern: '1', teacherId: `t${ti}`, kind: 'zorunlu' });
        S.place[`${cid}:0`] = { d, p, lock: false };
      }
    }
  }

  const assigned = EP.dutyAuto(S);
  assert.equal(assigned, 7, 'Tüm 7 öğretmen nöbete atanmalı');

  const counts = [0, 0, 0, 0, 0];
  for (const t of S.teachers) {
    const d = Number(t.dutyD);
    assert.ok(d >= 0 && d < 5, `${t.name} geçerli güne atanmalı`);
    counts[d]++;
  }
  const sorted = [...counts].sort((a, b) => a - b);
  assert.deepEqual(sorted, [1, 1, 1, 2, 2], `7 öğretmen 5 güne yığılmasız [1,1,1,2,2] dağılmalı, gelen: [${counts.join(',')}]`);
  // En yoğun günleri Pzt(0) ve Sal(1) olan öğretmenler ağırlıklı olduğu için 2'şer kişilik günler Pzt ve Sal olmalı
  assert.equal(counts[0], 2, 'En yoğun gün Pzt 2 nöbetçi almalı');
  assert.equal(counts[1], 2, 'İkinci en yoğun gün Sal 2 nöbetçi almalı');
  assert.equal(Number(S.teachers[4].dutyD), 2, 'Çarşamba en yoğun olan t4 Çarşamba atanmalı');
  assert.equal(Number(S.teachers[5].dutyD), 3, 'Perşembe en yoğun olan t5 Perşembe atanmalı');
  assert.equal(Number(S.teachers[6].dutyD), 4, 'Cuma en yoğun olan t6 Cuma atanmalı');
});

test('v2.4.0: özel zil saatleri, müdür yardımcısı bilgisi, WhatsApp görselleri ve Excel kaldırma', () => {
  const EP = loadUiNamespace();
  const S = EP.demo(false);
  S.school.name = 'Cumhuriyet Ortaokulu';
  S.school.mudur = 'Mehmet Demir';
  S.school.mudurYardimcisi = 'Ayşe Kaya';
  S.school.customTimes = [{ start: '08:15', end: '08:55' }, { start: '09:05', end: '09:45' }];

  const tm = EP.times(S);
  assert.equal(tm[0], '08:15–08:55');
  assert.equal(tm[1], '09:05–09:45');
  assert.ok(tm[2].includes('–'), 'Üçüncü ders otomatik hesaplanmalı');

  const o = EP.occ(S);
  const classDoc = EP.docClass(S, S.classes[0], o);
  assert.ok(classDoc.includes('Cumhuriyet Ortaokulu'));
  assert.ok(classDoc.includes('Mehmet Demir'));
  assert.ok(classDoc.includes('Ayşe Kaya'));
  assert.ok(classDoc.includes('08:15<br>08:55'));

  const teacherDoc = EP.docTeacher(S, S.teachers[0], o);
  assert.ok(teacherDoc.includes('Mehmet Demir'));
  assert.ok(teacherDoc.includes('Ayşe Kaya'));
  assert.ok(teacherDoc.includes('08:15<br>08:55'));

  const dutyDoc = EP.docDuty(S);
  assert.ok(dutyDoc.includes('Mehmet Demir'));
  assert.ok(dutyDoc.includes('Ayşe Kaya'));

  // Raporlar ekranı: Excel yok, ayrı Sınıf ve Öğretmen WhatsApp PNG düğmeleri var
  const raporHtml = EP.vRapor(S, (t) => `<h1>${t}</h1>`, true);
  assert.equal(raporHtml.includes('data-act="exExcel"'), false, 'Excel butonu kaldırılmış olmalı');
  assert.ok(raporHtml.includes('data-act="waSingle" data-kind="c"'), 'Sınıf tekli WhatsApp PNG butonu olmalı');
  assert.ok(raporHtml.includes('data-act="waBatch" data-kind="c"'), 'Sınıf toplu WhatsApp PNG butonu olmalı');
  assert.ok(raporHtml.includes('data-act="waSingle" data-kind="t"'), 'Öğretmen tekli WhatsApp PNG butonu olmalı');
  assert.ok(raporHtml.includes('data-act="waBatch" data-kind="t"'), 'Öğretmen toplu WhatsApp PNG butonu olmalı');

  // migrateState savedPlans, mudurYardimcisi ve customTimes alanlarını korumalı
  S.savedPlans = [{ id: 'sp1', name: 'Dönem Başı', placed: 10, total: 10, place: { 'a:0': { d: 0, p: 0, lock: false } } }];
  const migrated = EP.migrateState(JSON.parse(JSON.stringify(S)));
  assert.equal(migrated.school.mudurYardimcisi, 'Ayşe Kaya');
  assert.equal(migrated.school.customTimes[0].start, '08:15');
  assert.equal(migrated.savedPlans.length, 1);
  assert.equal(migrated.savedPlans[0].name, 'Dönem Başı');
});
