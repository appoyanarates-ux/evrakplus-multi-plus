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
  assert.ok(mainSrc.includes('Menu.setApplicationMenu(null)') && mainSrc.includes('mainWindow.removeMenu()'));
});
