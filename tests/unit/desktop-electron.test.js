import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBlankProject } from '../../packages/core-schema/src/index.js';
import { SqliteProjectStore } from '../../apps/desktop-electron/src/sqlite-store.js';
import { resolveEmbeddedPaths } from '../../apps/desktop-electron/src/engine-paths.js';

test('SqliteProjectStore: yerel SQLite CRUD, çözüm geçmişi ve KVKK token temizliği', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evrakplus-sqlite-'));
  const dbPath = path.join(tmpDir, 'test.sqlite');
  const store = new SqliteProjectStore(dbPath);

  try {
    const p = createBlankProject({ school: { name: 'Cumhuriyet Anadolu Lisesi' } });
    p.auth = { access_token: 'gizli-token-123', password: 'secret' };
    const saved = store.saveProject(p);

    const list = store.listProjects();
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Cumhuriyet Anadolu Lisesi');

    const loaded = store.loadProject(saved.id);
    assert.equal(loaded.school.name, 'Cumhuriyet Anadolu Lisesi');
    assert.equal(JSON.stringify(loaded).includes('gizli-token-123'), false, 'Token SQLite içine kaydedilmemeli!');

    // Çözüm geçmişi kaydı
    const histId = store.saveSolutionHistory(saved.id, {
      engine: 'ortools',
      status: 'OPTIMAL',
      qualityScore: 91.5,
      elapsedMs: 1200,
      placements: { 'a1:0': { day: 0, period: 0 } }
    });
    assert.ok(histId >= 1);
    const history = store.listSolutionHistory(saved.id);
    assert.equal(history.length, 1);
    assert.equal(history[0].engine, 'ortools');
    assert.equal(history[0].qualityScore, 91.5);

    // Kayıtlı ders dağıtımları (saved_plans) CRUD
    const sp1 = store.saveSavedPlan(saved.id, {
      id: 'sp-001',
      name: '1. Dönem Başlangıç',
      note: 'Tüm sınıflar tam yerleşik',
      savedAt: '2026-11-26T10:00:00.000Z',
      placed: 120,
      total: 120,
      locked: 12,
      place: { 'a1:0': { d: 0, p: 0, lock: true } },
      cardPatterns: { a1: '2+2' }
    });
    assert.equal(sp1.id, 'sp-001');
    const sp2 = store.saveSavedPlan(saved.id, {
      id: 'sp-002',
      name: '2. Alternatif',
      savedAt: '2026-11-26T11:00:00.000Z',
      placed: 118,
      total: 120,
      locked: 8,
      place: { 'a1:0': { d: 1, p: 2, lock: false } }
    });
    assert.equal(sp2.id, 'sp-002');
    const plans = store.listSavedPlans(saved.id);
    assert.equal(plans.length, 2);
    assert.equal(plans[0].id, 'sp-002', 'En yeni kayıtlı dağıtım ilk sırada gelmeli');
    assert.deepEqual(plans[1].cardPatterns, { a1: '2+2' });
    assert.equal(store.deleteSavedPlan('sp-001'), true);
    assert.equal(store.listSavedPlans(saved.id).length, 1);

    // Sync meta
    store.setSyncMeta('deviceId', 'dev-001');
    assert.equal(store.getSyncMeta('deviceId'), 'dev-001');

    // Silme
    assert.equal(store.deleteProject(saved.id), true);
    assert.equal(store.loadProject(saved.id), null);
  } finally {
    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Electron gömülü motor yolları ve electron-builder ASAR-dışı güvenlik yapılandırması', () => {
  const paths = resolveEmbeddedPaths({ isPackaged: false });
  assert.equal(paths.existence.python, true, 'Python çalışma ortamı bulunmalı');
  assert.equal(paths.existence.java, true, 'Gömülü Java 21 bulunmalı');
  assert.equal(paths.existence.minizinc, true, 'Gömülü MiniZinc bulunmalı');
  assert.equal(paths.existence.timefoldJar, true, 'Timefold JAR bulunmalı');
  assert.equal(paths.existence.chocoJar, true, 'Choco JAR bulunmalı');

  const builderCfg = JSON.parse(fs.readFileSync(path.resolve('apps/desktop-electron/electron-builder.json'), 'utf8'));
  assert.equal(builderCfg.asar, true);
  assert.ok(builderCfg.extraResources.some(r => r.to === 'engines'), 'Motorlar ASAR dışına (extraResources) konulmalı');
  assert.ok(builderCfg.extraResources.some(r => r.to === 'runtime'), 'Runtime ASAR dışına (extraResources) konulmalı');
  assert.equal(builderCfg.productName, 'DersMatrix Ultimate');
  assert.equal(builderCfg.executableName, 'DersMatrixUltimate');
  assert.equal(builderCfg.win.icon, 'build/icon.ico');
  assert.ok(builderCfg.nsis.artifactName.includes('Setup'));
  assert.equal(builderCfg.nsis.include, 'build/installer.nsh');
  const nshSrc = fs.readFileSync(path.resolve('apps/desktop-electron/build/installer.nsh'), 'utf8');
  assert.ok(nshSrc.includes('!macro customCheckAppRunning') && nshSrc.includes('taskkill.exe'));
  assert.equal(builderCfg.portable, undefined, 'Portable target must be disabled');
  assert.equal(builderCfg.win.target.some(t => t.target === 'portable'), false);

  // main.js güvenlik ve yerel PDF ayarlarının statik denetimi
  const mainSrc = fs.readFileSync(path.resolve('apps/desktop-electron/src/main.js'), 'utf8');
  assert.ok(mainSrc.includes('contextIsolation: true'));
  assert.ok(mainSrc.includes('nodeIntegration: false'));
  assert.ok(mainSrc.includes('sandbox: true'));
  assert.ok(mainSrc.includes('Content-Security-Policy'));
  assert.ok(mainSrc.includes('printToPDF'));
  assert.ok(mainSrc.includes("ipcMain.handle('export:pdf'"));
  assert.ok(mainSrc.includes("ipcMain.handle('export:print'"));
  assert.ok(mainSrc.includes("ipcMain.handle('export:savePngBatch'"));
  assert.ok(mainSrc.includes("ipcMain.handle('savedPlans:list'"));
  assert.ok(mainSrc.includes("ipcMain.handle('savedPlans:save'"));
  assert.ok(mainSrc.includes("ipcMain.handle('savedPlans:delete'"));
  assert.ok(mainSrc.includes('await shell.openPath(destPath)'), 'Güncelleme kurulumu terminal açmadan shell.openPath ile başlamalı');
  assert.equal(mainSrc.includes('ping -n 2 127.0.0.1'), false, 'Bozuk cmd.exe ping/start başlatıcısı olmamalı');
  assert.ok(mainSrc.includes('async function tryHotPatchInstall'), 'Akıllı mini yama uygulayıcı tanımlı olmalı');
  assert.ok(mainSrc.includes('extractZipSafe(zipPath, unpackedDir)'), 'Mini yama güvenli Node ZIP çıkarıcıyı kullanmalı');
  assert.ok(mainSrc.includes('function canHotPatch()'), 'Yazılabilirlik ve paket durumu kontrolü olmalı');
  assert.ok(mainSrc.includes('process.noAsar = true'), 'Electron sanal ASAR çakışmasını önlemek için process.noAsar kullanılmalı');
  assert.ok(mainSrc.includes('app.asar.bin'), 'Mini yama app.asar.bin paket adını desteklemeli');
  assert.ok(mainSrc.includes('run-hidden.vbs'), 'Mini yama gizli VBS başlatıcı ile terminal penceresi açmamalı');
  assert.ok(mainSrc.includes('print-preview.html') && mainSrc.includes('printPreview:execute'), 'Modern 2 panelli Yazdır Önizleme penceresi tanımlı olmalı');
  assert.ok(mainSrc.includes('Stop-Process -Force'), 'Mini yama uygulayıcı kilitli alt süreçleri temizlemeli');
  assert.ok(mainSrc.includes('pWin.webContents.print(') && mainSrc.includes('pageSize: paperSize'));
  assert.ok(mainSrc.includes('Menu.setApplicationMenu(null)') && mainSrc.includes('mainWindow.removeMenu()'));
});
