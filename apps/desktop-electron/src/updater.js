import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const DEFAULT_RELEASE_API = 'https://api.github.com/repos/appoyanarates-ux/evrakplus-multi-plus/releases/latest';
const TRUSTED_UPDATE_HOSTS = new Set(['api.github.com', 'github.com', 'objects.githubusercontent.com', 'www.evrakplus.com']);

export function detectUpdateStrategy(assets = []) {
  const list = Array.isArray(assets) ? assets : [];
  const setupAsset = list.find(a => /setup.*\.exe$/i.test(a.name || '')) || null;
  const patchAsset = list.find(a => /patch.*\.zip$/i.test(a.name || '')) || null;
  const blockmapAsset = list.find(a => /\.exe\.blockmap$/i.test(a.name || '')) || null;
  const latestYmlAsset = list.find(a => /^latest\.yml$/i.test(a.name || '')) || null;
  const shaAsset = list.find(a => /sha256/i.test(a.name || '')) || null;
  return {
    supportsPatch: Boolean(patchAsset),
    supportsDelta: Boolean(setupAsset && blockmapAsset),
    patchAsset,
    setupAsset,
    blockmapAsset,
    latestYmlAsset,
    shaAsset
  };
}

/**
 * Sıfır dış bağımlılıklı güvenli ZIP çıkarıcı (Store=0 & Deflate=8, Zip-Slip korumalı).
 * Harici PowerShell/terminal açmadan mini yama paketini doğrudan Node içinde açar.
 */
export function extractZipSafe(zipPath, destDir) {
  const buf = fs.readFileSync(zipPath);
  const absDest = path.resolve(destDir);
  fs.mkdirSync(absDest, { recursive: true });

  // End of Central Directory (EOCD: 0x06054b50) konumunu sondan ara
  let eocdOff = -1;
  const minOff = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minOff; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOff = i;
      break;
    }
  }
  if (eocdOff < 0) throw new Error('Geçersiz ZIP arşivi (EOCD bulunamadı).');

  const totalEntries = buf.readUInt16LE(eocdOff + 10);
  const cdOffset = buf.readUInt32LE(eocdOff + 16);
  let ptr = cdOffset;
  const extracted = [];

  for (let idx = 0; idx < totalEntries; idx++) {
    if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== 0x02014b50) {
      throw new Error('Geçersiz ZIP merkezi dizin kaydı.');
    }
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOff = buf.readUInt32LE(ptr + 42);
    const rawName = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
    ptr += 46 + nameLen + extraLen + commentLen;

    const cleanRel = rawName.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!cleanRel || cleanRel.endsWith('/')) continue;
    const outPath = path.resolve(absDest, cleanRel);
    if (!outPath.startsWith(absDest + path.sep) && outPath !== absDest) {
      throw new Error(`Güvenlik ihlali: geçersiz arşiv yolu (${rawName})`);
    }

    if (localHeaderOff + 30 > buf.length || buf.readUInt32LE(localHeaderOff) !== 0x04034b50) {
      throw new Error(`Geçersiz yerel ZIP başlığı (${rawName})`);
    }
    const lhNameLen = buf.readUInt16LE(localHeaderOff + 26);
    const lhExtraLen = buf.readUInt16LE(localHeaderOff + 28);
    const dataStart = localHeaderOff + 30 + lhNameLen + lhExtraLen;
    const compData = buf.subarray(dataStart, dataStart + compSize);

    let fileData;
    if (method === 0) {
      fileData = compData;
    } else if (method === 8) {
      fileData = zlib.inflateRawSync(compData);
    } else {
      throw new Error(`Desteklenmeyen ZIP sıkıştırma yöntemi: ${method}`);
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, fileData);
    extracted.push(cleanRel);
  }
  return extracted;
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
