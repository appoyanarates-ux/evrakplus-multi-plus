import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.join(__dirname, 'electron-runner.cjs');

function findElectronExe() {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'node_modules', 'electron', 'dist', 'electron.exe'),
    'D:\\evrakplus-build\\stage\\node_modules\\electron\\dist\\electron.exe'
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

test('E2E (Gerçek Chromium/Electron): 7 temel kullanıcı akışı uçtan uca doğrulaması', { timeout: 45000 }, t => {
  const electronExe = findElectronExe();
  if (!electronExe) {
    t.skip('Electron binary bulunamadı; E2E atlandı.');
    return;
  }
  const stdout = execFileSync(electronExe, [runnerPath], {
    encoding: 'utf8',
    timeout: 40000,
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0' }
  });
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  const jsonLine = [...lines].reverse().find(l => l.trim().startsWith('{'));
  assert.ok(jsonLine, `E2E JSON çıktısı bekleniyordu, gelen: ${stdout}`);
  const parsed = JSON.parse(jsonLine);
  assert.equal(parsed.ok, true, `E2E hatası: ${parsed.error || stdout}`);
  assert.equal(parsed.flows.length, 7, 'Tüm 7 E2E akışı başarıyla tamamlanmalı');
});
