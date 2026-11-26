import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  compareSemver,
  isTrustedHttpsUrl,
  computeFileSha256,
  verifyFileSha256,
  detectUpdateStrategy,
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
    { name: 'DersMatrix-Ultimate-2.5.0-Setup.exe', size: 250000000 },
    { name: 'DersMatrix-Ultimate-2.5.0-Setup.exe.blockmap', size: 220000 },
    { name: 'latest.yml', size: 420 },
    { name: 'SHA256SUMS.txt', size: 101 }
  ]);
  assert.equal(deltaStrat.supportsDelta, true);
  assert.ok(deltaStrat.blockmapAsset);
  assert.ok(deltaStrat.latestYmlAsset);
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
