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

  // 4. Redundant menus 10 & 11 removed, rooms moved inside school settings, zero GitHub links in UI files
  const menuIds = EP.MENUS.map(m => m[0]);
  assert.ok(!menuIds.includes('multi_solver'));
  assert.ok(!menuIds.includes('manual_schedule'));
  assert.ok(!menuIds.includes('rooms'), 'Derslikler ve Binalar must live inside Okul Ayarları');

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
