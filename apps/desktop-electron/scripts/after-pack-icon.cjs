const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function findRcedit() {
  const candidates = [];
  const ebCache = process.env.ELECTRON_BUILDER_CACHE || 'D:\\evrakplus-build\\eb-cache';
  const winCodeSign = path.join(ebCache, 'winCodeSign');
  if (fs.existsSync(winCodeSign)) {
    for (const d of fs.readdirSync(winCodeSign)) {
      const p = path.join(winCodeSign, d, 'rcedit-x64.exe');
      if (fs.existsSync(p)) candidates.push(p);
    }
  }
  return candidates[0] || null;
}

exports.default = async function afterPack(context) {
  if (process.platform !== 'win32') return;
  const rcedit = findRcedit();
  const exeName = (context.packager.appInfo.productFilename || 'DersMatrixUltimate') + '.exe';
  const exePath = path.join(context.appOutDir, exeName);
  const icoPath = path.resolve(__dirname, '..', 'build', 'icon.ico');
  const ver = context.packager.appInfo.version || '2.1.0';

  if (!rcedit || !fs.existsSync(exePath) || !fs.existsSync(icoPath)) {
    console.log('[afterPack] skip rcedit:', { rcedit: Boolean(rcedit), exeExists: fs.existsSync(exePath), icoExists: fs.existsSync(icoPath) });
    return;
  }

  console.log('[afterPack] Patching EXE icon & metadata via rcedit:', exePath);
  execFileSync(rcedit, [
    exePath,
    '--set-icon', icoPath,
    '--set-version-string', 'ProductName', 'DersMatrix Ultimate',
    '--set-version-string', 'FileDescription', 'DersMatrix Ultimate · Haftalık Ders Dağıtım Sistemi',
    '--set-version-string', 'CompanyName', 'EvrakPlus',
    '--set-version-string', 'LegalCopyright', 'Copyright © 2026 EvrakPlus',
    '--set-file-version', ver,
    '--set-product-version', ver
  ], { stdio: 'inherit' });
};
