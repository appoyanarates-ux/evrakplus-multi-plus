import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_RELEASE_API = 'https://api.github.com/repos/appoyanarates-ux/evrakplus-multi-plus/releases/latest';
const TRUSTED_UPDATE_HOSTS = new Set(['api.github.com', 'github.com', 'objects.githubusercontent.com', 'www.evrakplus.com']);

export function detectUpdateStrategy(assets = []) {
  const list = Array.isArray(assets) ? assets : [];
  const setupAsset = list.find(a => /setup.*\.exe$/i.test(a.name || '')) || null;
  const blockmapAsset = list.find(a => /\.exe\.blockmap$/i.test(a.name || '')) || null;
  const latestYmlAsset = list.find(a => /^latest\.yml$/i.test(a.name || '')) || null;
  const shaAsset = list.find(a => /sha256/i.test(a.name || '')) || null;
  return {
    supportsDelta: Boolean(setupAsset && blockmapAsset),
    setupAsset,
    blockmapAsset,
    latestYmlAsset,
    shaAsset
  };
}

export function isTrustedHttpsUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' && TRUSTED_UPDATE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export function parseSemver(v) {
  const m = String(v || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) throw new Error(`Geçersiz SemVer sürümü: ${a} vs ${b}`);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

export function computeFileSha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function verifyFileSha256(filePath, expectedHex) {
  if (!expectedHex || typeof expectedHex !== 'string' || !/^[a-f0-9]{64}$/i.test(expectedHex.trim())) {
    return { valid: false, reason: 'INVALID_EXPECTED_HASH' };
  }
  const actual = computeFileSha256(filePath);
  const a = Buffer.from(actual.toLowerCase(), 'utf8');
  const b = Buffer.from(expectedHex.trim().toLowerCase(), 'utf8');
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { valid, actual, expected: expectedHex.trim().toLowerCase() };
}

/**
 * Güvenilir HTTPS GitHub Release kaynağından yeni sürüm denetler.
 */
export async function checkForUpdates({
  currentVersion = '1.0.0',
  releaseApiUrl = DEFAULT_RELEASE_API,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!isTrustedHttpsUrl(releaseApiUrl)) {
    throw new Error(`Güvenilmeyen güncelleme kaynağı reddedildi: ${releaseApiUrl}`);
  }
  const resp = await fetchImpl(releaseApiUrl, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'EvrakPlus-Multi-Plus-Updater/1.0.0' }
  });
  if (!resp.ok) {
    return { ok: false, updateAvailable: false, status: resp.status };
  }
  const rel = await resp.json();
  const latestVersion = String(rel.tag_name || '').replace(/^v/i, '');
  const updateAvailable = parseSemver(latestVersion) ? compareSemver(latestVersion, currentVersion) > 0 : false;
  const assets = (rel.assets || []).map(a => ({
    name: a.name,
    size: a.size,
    downloadUrl: a.browser_download_url
  }));
  return {
    ok: true,
    currentVersion,
    latestVersion,
    updateAvailable,
    releaseNotes: rel.body || '',
    publishedAt: rel.published_at || null,
    assets,
    strategy: detectUpdateStrategy(assets)
  };
}

/**
 * Kullanıcı onaylı, SHA-256 bütünlük doğrulamalı ve başarısızlıkta otomatik geri dönüşlü (rollback)
 * güvenli güncelleme uygular. Kullanıcı verileri asla silinmez.
 */
export async function applyUpdateWithRollback({
  userApproved = false,
  stagedFilePath,
  expectedSha256,
  targetFilePath,
  backupDir,
  applyFn
}) {
  if (userApproved !== true) {
    return { applied: false, reason: 'USER_APPROVAL_REQUIRED' };
  }

  const hashCheck = verifyFileSha256(stagedFilePath, expectedSha256);
  if (!hashCheck.valid) {
    return { applied: false, reason: 'SHA256_MISMATCH', ...hashCheck };
  }

  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `${path.basename(targetFilePath)}.bak`);
  const hadOriginal = fs.existsSync(targetFilePath);
  if (hadOriginal) {
    fs.copyFileSync(targetFilePath, backupFile);
  }

  try {
    if (typeof applyFn === 'function') {
      await applyFn({ stagedFilePath, targetFilePath, backupFile });
    } else {
      fs.copyFileSync(stagedFilePath, targetFilePath);
    }
    return { applied: true, rolledBack: false, backupFile: hadOriginal ? backupFile : null };
  } catch (err) {
    // Başarısız güncellemede önceki çalışan sürüme güvenli geri dönüş
    if (hadOriginal && fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, targetFilePath);
    }
    return {
      applied: false,
      rolledBack: true,
      reason: 'APPLY_FAILED_ROLLED_BACK',
      error: err.message
    };
  }
}
