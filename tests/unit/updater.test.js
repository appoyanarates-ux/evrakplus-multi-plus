import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  compareSemver,
  isTrustedHttpsUrl,
  computeFileSha256,
  verifyFileSha256,
  detectUpdateStrategy,
  extractZipSafe,
  checkForUpdates,
  applyUpdateWithRollback
} from '../../apps/desktop-electron/src/updater.js';

test('SemVer karşılaştırması ve güvenilir HTTPS kaynak zorunluluğu', async () => {
  assert.equal(compareSemver('1.0.1', '1.0.0'), 1);
  assert.equal(compareSemver('1.1.0', '1.0.9'), 1);
  assert.equal(compareSemver('2.0.0', '1.9.9'), 1);
  assert.equal(compareSemver('1.0.0', '1.0.0'), 0);

  assert.equal(isTrustedHttpsUrl('https://api.github.com/repos/evrakplus/evrakplus-ders-dagitim-multi-plus/releases/latest'), true);
  assert.equal(isTrustedHttpsUrl('http://api.github.com/repos/evrakplus/test'), false, 'HTTP kesinlikle reddedilmeli');
  assert.equal(isTrustedHttpsUrl('https://evil.example.com/update.exe'), false, 'Güvenilmeyen domain reddedilmeli');

  await assert.rejects(() => checkForUpdates({ releaseApiUrl: 'http://evil.example.com/rel' }));

  const mockRes = await checkForUpdates({
    currentVersion: '1.0.0',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        tag_name: 'v1.1.0',
        body: 'Yeni iyileştirmeler',
        published_at: '2026-12-01T00:00:00Z',
        assets: [{ name: 'EvrakPlus-Multi-Plus-1.1.0-Setup.exe', size: 1024, browser_download_url: 'https://github.com/evrakplus/r/s.exe' }]
      })
    })
  });
  assert.equal(mockRes.updateAvailable, true);
  assert.equal(mockRes.latestVersion, '1.1.0');
  assert.equal(mockRes.strategy.supportsDelta, false);

  const deltaStrat = detectUpdateStrategy([
    { name: 'DersMatrix-Ultimate-2.7.0-Setup.exe', size: 250000000 },
    { name: 'DersMatrix-Patch-2.7.0.zip', size: 1450000 },
    { name: 'DersMatrix-Ultimate-2.7.0-Setup.exe.blockmap', size: 220000 },
    { name: 'latest.yml', size: 420 },
    { name: 'SHA256SUMS.txt', size: 190 }
  ]);
  assert.equal(deltaStrat.supportsPatch, true);
  assert.equal(deltaStrat.patchAsset.name, 'DersMatrix-Patch-2.7.0.zip');
  assert.equal(deltaStrat.supportsDelta, true);
  assert.ok(deltaStrat.blockmapAsset);
  assert.ok(deltaStrat.latestYmlAsset);
});

function buildTestZip(entries) {
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const rawBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8');
    const method = entry.deflate ? 8 : 0;
    const compBuf = method === 8 ? zlib.deflateRawSync(rawBuf) : rawBuf;

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt32LE(0, 14);
    lh.writeUInt32LE(compBuf.length, 18);
    lh.writeUInt32LE(rawBuf.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    localParts.push(lh, nameBuf, compBuf);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt32LE(0, 16);
    cd.writeUInt32LE(compBuf.length, 20);
    cd.writeUInt32LE(rawBuf.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt32LE(offset, 42);
    cdParts.push(cd, nameBuf);

    offset += lh.length + nameBuf.length + compBuf.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, cdBuf, eocd]);
}

test('extractZipSafe: Store ve Deflate mini yama arşivlerini güvenle açar ve Zip-Slip saldırısını engeller', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evrakplus-zip-'));
  try {
    const manifestJson = JSON.stringify({ version: '2.7.0', minElectron: '34.5.8', requiresFullInstaller: false });
    const htmlBody = '<!doctype html><html><body>DersMatrix Ultimate v2.7.0 Mini Yama</body></html>';
    const asarBytes = Buffer.from('FAKE_ASAR_BINARY_PAYLOAD_1234567890', 'utf8');

    const goodZipPath = path.join(tmp, 'DersMatrix-Patch-2.7.0.zip');
    fs.writeFileSync(goodZipPath, buildTestZip([
      { name: 'manifest.json', data: manifestJson, deflate: false },
      { name: 'app.asar', data: asarBytes, deflate: true },
      { name: 'ui-shared/public/index.html', data: htmlBody, deflate: true }
    ]));

    const outDir = path.join(tmp, 'extracted');
    const files = extractZipSafe(goodZipPath, outDir);
    assert.deepEqual(files.sort(), ['app.asar', 'manifest.json', 'ui-shared/public/index.html']);
    assert.equal(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'), manifestJson);
    assert.equal(fs.readFileSync(path.join(outDir, 'ui-shared', 'public', 'index.html'), 'utf8'), htmlBody);
    assert.deepEqual(fs.readFileSync(path.join(outDir, 'app.asar')), asarBytes);

    // Zip-Slip (../evil.txt) güvenlik ihlali kesinlikle reddedilmeli
    const evilZipPath = path.join(tmp, 'evil.zip');
    fs.writeFileSync(evilZipPath, buildTestZip([
      { name: '../evil.txt', data: 'ATTACK', deflate: false }
    ]));
    assert.throws(() => extractZipSafe(evilZipPath, path.join(tmp, 'safe-out')), /Güvenlik ihlali/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('SHA-256 doğrulama, kullanıcı onayı zorunluluğu ve başarısız güncellemede güvenli rollback', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evrakplus-upd-'));
  try {
    const target = path.join(tmp, 'app.bin');
    const staged = path.join(tmp, 'staged.bin');
    const backupDir = path.join(tmp, 'backups');
    fs.writeFileSync(target, 'OLD_STABLE_VERSION_1_0_0', 'utf8');
    fs.writeFileSync(staged, 'NEW_VERSION_1_1_0', 'utf8');
    const goodHash = computeFileSha256(staged);

    // 1. Kullanıcı onayı olmadan güncelleme başlamamalı
    const noApproval = await applyUpdateWithRollback({ userApproved: false, stagedFilePath: staged, expectedSha256: goodHash, targetFilePath: target, backupDir });
    assert.equal(noApproval.applied, false);
    assert.equal(noApproval.reason, 'USER_APPROVAL_REQUIRED');

    // 2. Yanlış SHA-256 ile güncelleme kesinlikle reddedilmeli
    const badHash = verifyFileSha256(staged, '0'.repeat(64));
    assert.equal(badHash.valid, false);
    const rejected = await applyUpdateWithRollback({ userApproved: true, stagedFilePath: staged, expectedSha256: '0'.repeat(64), targetFilePath: target, backupDir });
    assert.equal(rejected.applied, false);
    assert.equal(rejected.reason, 'SHA256_MISMATCH');

    // 3. Uygulama sırasında hata olursa önceki çalışan sürüme güvenli rollback yapılmalı!
    const failed = await applyUpdateWithRollback({
      userApproved: true,
      stagedFilePath: staged,
      expectedSha256: goodHash,
      targetFilePath: target,
      backupDir,
      applyFn: async ({ targetFilePath }) => {
        fs.writeFileSync(targetFilePath, 'CORRUPTED_PARTIAL_WRITE', 'utf8');
        throw new Error('Disk yazma hatası simülasyonu');
      }
    });
    assert.equal(failed.applied, false);
    assert.equal(failed.rolledBack, true);
    assert.equal(fs.readFileSync(target, 'utf8'), 'OLD_STABLE_VERSION_1_0_0', 'Rollback eski çalışan sürümü geri getirmeli!');

    // 4. Başarılı güncelleme
    const ok = await applyUpdateWithRollback({ userApproved: true, stagedFilePath: staged, expectedSha256: goodHash, targetFilePath: target, backupDir });
    assert.equal(ok.applied, true);
    assert.equal(fs.readFileSync(target, 'utf8'), 'NEW_VERSION_1_1_0');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
