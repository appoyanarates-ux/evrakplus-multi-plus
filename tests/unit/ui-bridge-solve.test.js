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
  assert.ok(dutyAssigned > 0 && dutyDoc.includes('ÖĞRETMEN NÖBET ÇİZELGESİ'));
  assert.ok(csv.includes('5/A') && csv.includes('MAT'));

  // 4. Verify v2 <-> v3 roundtrip & backup sanitization strips secrets
  schoolState.apiSecretToken = 'should-be-stripped';
  const clean = EP.sanitizeExportProject(schoolState);
  assert.equal(clean.apiSecretToken, undefined);
  const restored = EP.migrateState(v3Project);
  assert.equal(restored.classes.length, schoolState.classes.length);
  assert.equal(restored.teachers.length, schoolState.teachers.length);
});
