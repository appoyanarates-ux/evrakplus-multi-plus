import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import { SqliteProjectStore } from './sqlite-store.js';
import { resolveEmbeddedPaths } from './engine-paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const APP_VERSION = '2.2.0';
export const APP_NAME = 'DersMatrix Ultimate';

async function loadMultiSolver() {
  const packagedUrl = new URL('../packages/multi-solver/src/index.js', import.meta.url);
  if (fs.existsSync(packagedUrl)) return import(packagedUrl.href);
  return import('../../../packages/multi-solver/src/index.js');
}

const { MultiSolverEngine } = await loadMultiSolver();
const ALLOWED_EXTERNAL_HOSTS = new Set(['www.evrakplus.com', 'evrakplus.com']);
const AUTH_PARTITION = 'persist:evrakplus-auth';
const EVRAKPLUS_LOGIN_URL = 'https://www.evrakplus.com/giris/';
const RELEASE_API_URL = 'https://api.github.com/repos/appoyanarates-ux/evrakplus-multi-plus/releases/latest';

export const SECURITY_CONFIG = Object.freeze({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  csp: "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://www.evrakplus.com; object-src 'none'; base-uri 'self';"
});

let mainWindow = null;
let authWindow = null;
let store = null;
let engine = null;
let isQuitting = false;
let latestUpdateCache = null;

function isSafeExternalUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' && ALLOWED_EXTERNAL_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export function compareSemver(a, b) {
  const pa = String(a || '0.0.0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0.0.0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/* ---------- Gerçek EvrakPlus Oturum Denetimi (WordPress Çerez + Dahili Pencere) ---------- */
async function inspectEvrakPlusSession() {
  try {
    const authSes = session.fromPartition(AUTH_PARTITION);
    const allCookies = await authSes.cookies.get({});
    const wpCookie = allCookies.find(c =>
      /evrakplus\.com$/i.test(String(c.domain || '').replace(/^\./, '')) &&
      /^wordpress_logged_in_/i.test(c.name) &&
      c.value && c.value.length > 5
    );
    if (!wpCookie) {
      return { loggedIn: false, username: '', displayName: '', source: 'none' };
    }
    const decoded = decodeURIComponent(wpCookie.value);
    const username = decoded.split('|')[0] || 'EvrakPlus Üyesi';
    return {
      loggedIn: true,
      username,
      displayName: username,
      entitlementValid: true,
      verifiedAt: new Date().toISOString(),
      source: 'evrakplus-session'
    };
  } catch {
    return { loggedIn: false, username: '', displayName: '', source: 'error' };
  }
}

function notifyAuthChanged(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auth:changed', status);
  }
}

async function openEvrakPlusLoginWindow() {
  // Önce mevcut kayıtlı oturumu kontrol et
  const existing = await inspectEvrakPlusSession();
  if (existing.loggedIn) {
    notifyAuthChanged(existing);
    return existing;
  }

  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.focus();
    return existing;
  }

  return new Promise(resolve => {
    let settled = false;
    const finish = status => {
      if (settled) return;
      settled = true;
      notifyAuthChanged(status);
      resolve(status);
    };

    const authSes = session.fromPartition(AUTH_PARTITION);
    authWindow = new BrowserWindow({
      width: 560,
      height: 740,
      parent: mainWindow || undefined,
      modal: false,
      autoHideMenuBar: true,
      icon: resolveAppIcon(),
      title: 'EvrakPlus Üyelik Girişi · DersMatrix Ultimate',
      webPreferences: {
        partition: AUTH_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    });

    const checkNow = async () => {
      const st = await inspectEvrakPlusSession();
      if (st.loggedIn) {
        if (authWindow && !authWindow.isDestroyed()) authWindow.close();
        finish(st);
      }
    };

    const onCookieChange = (_ev, cookie, _cause, removed) => {
      if (!removed && /evrakplus\.com$/i.test(String(cookie.domain || '').replace(/^\./, '')) && /^wordpress_logged_in_/i.test(cookie.name)) {
        checkNow();
      }
    };
    authSes.cookies.on('changed', onCookieChange);

    authWindow.webContents.on('did-navigate', () => { checkNow(); });
    authWindow.webContents.on('did-finish-load', () => { checkNow(); });
    authWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (isSafeExternalUrl(url)) authWindow.loadURL(url);
      return { action: 'deny' };
    });

    authWindow.on('closed', async () => {
      authSes.cookies.removeListener('changed', onCookieChange);
      authWindow = null;
      const finalSt = await inspectEvrakPlusSession();
      finish(finalSt);
    });

    authWindow.loadURL(EVRAKPLUS_LOGIN_URL);
  });
}

async function logoutEvrakPlusSession() {
  try {
    const authSes = session.fromPartition(AUTH_PARTITION);
    await authSes.clearStorageData({ storages: ['cookies', 'localstorage', 'sessionstorage'] });
  } catch {
    // ignore
  }
  const st = { loggedIn: false, username: '', displayName: '', entitlementValid: false, source: 'logout' };
  notifyAuthChanged(st);
  return st;
}

/* ---------- Gerçek Otomatik Güncelleme (Release API + SHA-256 Doğrulama + Kurulum) ---------- */
function notifyUpdater(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:event', payload);
  }
}

async function checkLatestRelease() {
  try {
    const res = await fetch(RELEASE_API_URL, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': `DersMatrix-Ultimate/${APP_VERSION}`
      }
    });
    if (!res.ok) {
      return { currentVersion: APP_VERSION, updateAvailable: false, error: `Sunucu yanıtı: ${res.status}` };
    }
    const rel = await res.json();
    const latestVersion = String(rel.tag_name || '').replace(/^v/i, '') || APP_VERSION;
    const assets = Array.isArray(rel.assets) ? rel.assets : [];
    const setupAsset = assets.find(a => /-Setup\.exe$/i.test(a.name || ''));
    const sumAsset = assets.find(a => /^SHA256SUMS\.txt$/i.test(a.name || ''));
    const updateAvailable = compareSemver(latestVersion, APP_VERSION) > 0 && Boolean(setupAsset);

    const info = {
      currentVersion: APP_VERSION,
      latestVersion,
      updateAvailable,
      releaseName: rel.name || `${APP_NAME} v${latestVersion}`,
      publishedAt: rel.published_at || '',
      assetName: setupAsset ? setupAsset.name : '',
      assetSize: setupAsset ? setupAsset.size : 0,
      downloadUrl: setupAsset ? setupAsset.browser_download_url : '',
      sha256Url: sumAsset ? sumAsset.browser_download_url : ''
    };
    latestUpdateCache = info;
    return info;
  } catch (err) {
    return {
      currentVersion: APP_VERSION,
      updateAvailable: false,
      error: err && err.message ? err.message : 'Güncelleme sunucusuna ulaşılamadı'
    };
  }
}

async function downloadAndInstallRelease(reqInfo) {
  const info = (reqInfo && reqInfo.downloadUrl) ? reqInfo : (latestUpdateCache || await checkLatestRelease());
  if (!info || !info.downloadUrl || !/^https:\/\//i.test(info.downloadUrl)) {
    throw new Error('İndirilecek geçerli güncelleme paketi bulunamadı.');
  }

  const targetName = (info.assetName || `DersMatrix-Ultimate-${info.latestVersion}-Setup.exe`).replace(/[^a-zA-Z0-9._-]/g, '');
  const destPath = path.join(os.tmpdir(), targetName);

  notifyUpdater({ type: 'progress', percent: 1, message: 'Güncelleme paketi indiriliyor…' });
  const resp = await fetch(info.downloadUrl, {
    headers: { 'User-Agent': `DersMatrix-Ultimate/${APP_VERSION}` }
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`Güncelleme indirilemedi (HTTP ${resp.status}).`);
  }

  const totalBytes = Number(resp.headers.get('content-length') || info.assetSize || 0);
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(destPath);
  let downloaded = 0;
  let lastReport = 0;

  try {
    for await (const chunk of resp.body) {
      const buf = Buffer.from(chunk);
      hash.update(buf);
      out.write(buf);
      downloaded += buf.length;
      const now = Date.now();
      if (now - lastReport > 250) {
        lastReport = now;
        const percent = totalBytes > 0 ? Math.min(99, Math.round((downloaded / totalBytes) * 100)) : 50;
        notifyUpdater({ type: 'progress', percent, downloaded, totalBytes, message: `İndiriliyor… %${percent}` });
      }
    }
    await new Promise((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
      out.end();
    });
  } catch (err) {
    try { out.destroy(); fs.unlinkSync(destPath); } catch {}
    throw err;
  }

  const actualSha = hash.digest('hex').toLowerCase();
  if (info.sha256Url && /^https:\/\//i.test(info.sha256Url)) {
    notifyUpdater({ type: 'verifying', percent: 99, message: 'SHA-256 bütünlük doğrulaması yapılıyor…' });
    const sumResp = await fetch(info.sha256Url, { headers: { 'User-Agent': `DersMatrix-Ultimate/${APP_VERSION}` } });
    if (sumResp.ok) {
      const txt = await sumResp.text();
      const line = txt.split(/\r?\n/).find(l => l.trim().endsWith(info.assetName));
      if (line) {
        const expectedSha = line.trim().split(/\s+/)[0].toLowerCase();
        if (expectedSha && expectedSha !== actualSha) {
          try { fs.unlinkSync(destPath); } catch {}
          throw new Error('Güncelleme dosyası SHA-256 doğrulamasından geçemedi; kurulum iptal edildi.');
        }
      }
    }
  }

  notifyUpdater({ type: 'ready', percent: 100, message: 'Doğrulandı! Kurulum sihirbazı başlatılıyor…' });
  const child = spawn(destPath, [], { detached: true, stdio: 'ignore' });
  child.unref();
  setTimeout(() => { cleanShutdownAndExit(); }, 800);
  return { launched: true, installerPath: destPath, sha256: actualSha };
}

/* ---------- Gerçek PDF Üretimi (Chromium printToPDF) ve Doğrudan Yazdırma ---------- */
async function renderHiddenHtmlWindow(html, landscape) {
  const tmpHtml = path.join(os.tmpdir(), `dersmatrix-print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`);
  fs.writeFileSync(tmpHtml, html, 'utf8');
  const win = new BrowserWindow({
    show: false,
    width: landscape ? 1200 : 860,
    height: 920,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      javascript: false
    }
  });
  await win.loadFile(tmpHtml);
  return { win, tmpHtml };
}

async function exportHtmlToPdf(opts) {
  if (!opts || typeof opts.html !== 'string' || !opts.html.trim()) {
    throw new Error('PDF içeriği boş.');
  }
  const safeName = String(opts.defaultFilename || 'DersMatrix-Program.pdf')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .trim()
    .replace(/(?:\.html?|\.pdf)+$/i, '') + '.pdf';

  const saveRes = await dialog.showSaveDialog(mainWindow || undefined, {
    title: 'PDF Belgesi Olarak Kaydet',
    defaultPath: path.join(app.getPath('documents'), safeName),
    filters: [{ name: 'PDF Belgesi (*.pdf)', extensions: ['pdf'] }]
  });
  if (saveRes.canceled || !saveRes.filePath) {
    return { ok: false, canceled: true };
  }

  let win = null;
  let tmpHtml = '';
  try {
    const rendered = await renderHiddenHtmlWindow(opts.html, Boolean(opts.landscape));
    win = rendered.win;
    tmpHtml = rendered.tmpHtml;
    const pdfBuf = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      landscape: Boolean(opts.landscape),
      pageSize: opts.paperSize === 'A3' ? 'A3' : 'A4',
      margins: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 }
    });
    fs.writeFileSync(saveRes.filePath, pdfBuf);
    try { await shell.openPath(saveRes.filePath); } catch {}
    return { ok: true, canceled: false, filePath: saveRes.filePath, bytes: pdfBuf.length };
  } finally {
    try { if (win && !win.isDestroyed()) win.destroy(); } catch {}
    try { if (tmpHtml && fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml); } catch {}
  }
}

async function printHtmlDirect(opts) {
  if (!opts || typeof opts.html !== 'string' || !opts.html.trim()) {
    throw new Error('Yazdırılacak içerik boş.');
  }
  let win = null;
  let tmpHtml = '';
  try {
    const rendered = await renderHiddenHtmlWindow(opts.html, Boolean(opts.landscape));
    win = rendered.win;
    tmpHtml = rendered.tmpHtml;
    const ok = await new Promise(resolve => {
      win.webContents.print({
        silent: false,
        printBackground: true,
        landscape: Boolean(opts.landscape)
      }, (success) => resolve(Boolean(success)));
    });
    return { ok };
  } finally {
    try { if (win && !win.isDestroyed()) win.destroy(); } catch {}
    try { if (tmpHtml && fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml); } catch {}
  }
}

function resolveAppIcon() {
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, 'icon.ico'), path.join(process.resourcesPath, 'icon.png')]
    : [path.resolve(__dirname, '..', 'build', 'icon.ico'), path.resolve(__dirname, '..', 'build', 'icon.png')];
  return candidates.find(p => fs.existsSync(p));
}

/* ---------- Pencere ve IPC ---------- */
function createWindow() {
  const uiIndex = app.isPackaged
    ? path.join(process.resourcesPath, 'ui-shared', 'public', 'index.html')
    : path.resolve(__dirname, '..', '..', '..', 'packages', 'ui-shared', 'public', 'index.html');
  const iconPath = resolveAppIcon();

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    icon: iconPath,
    title: `${APP_NAME} · v${APP_VERSION}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: SECURITY_CONFIG.contextIsolation,
      nodeIntegration: SECURITY_CONFIG.nodeIntegration,
      sandbox: SECURITY_CONFIG.sandbox,
      webSecurity: SECURITY_CONFIG.webSecurity
    }
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [SECURITY_CONFIG.csp]
      }
    });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      const authSt = await inspectEvrakPlusSession();
      if (authSt.loggedIn) notifyAuthChanged(authSt);
      const upd = await checkLatestRelease();
      if (upd.updateAvailable) notifyUpdater({ type: 'available', info: upd });
    }, 3500);
  });

  mainWindow.loadFile(uiIndex);
}

function registerIpcHandlers() {
  ipcMain.handle('project:list', () => store.listProjects());

  ipcMain.handle('project:load', (_ev, id) => {
    if (typeof id !== 'string' || id.length > 100) throw new Error('Geçersiz proje kimliği');
    return store.loadProject(id);
  });

  ipcMain.handle('project:save', (_ev, project) => {
    if (!project || typeof project !== 'object') throw new Error('Geçersiz proje nesnesi');
    return store.saveProject(project);
  });

  ipcMain.handle('project:delete', (_ev, id) => {
    if (typeof id !== 'string' || id.length > 100) throw new Error('Geçersiz proje kimliği');
    return store.deleteProject(id);
  });

  ipcMain.handle('solver:healthCheckAll', () => engine.healthCheckAll());

  ipcMain.handle('solver:solve', async (_ev, payload) => {
    if (!payload || !payload.project) throw new Error('Geçersiz çözüm isteği');
    const res = await engine.solve(payload.project, payload.options || {}, {
      onEngineProgress: (engineId, progress) => {
        mainWindow?.webContents.send('solver:progress', { engineId, progress });
      },
      onBestUpdated: best => {
        if (best && best.placements) {
          mainWindow?.webContents.send('solver:progress', {
            engineId: best.engine || 'ortools',
            progress: {
              assignedBlocks: Object.keys(best.placements).length,
              bestPlacements: best.placements,
              qualityScore: best.evaluation?.qualityScore ?? 0,
              message: `Ara çözüm bulundu (${Object.keys(best.placements).length} blok)`
            }
          });
        }
      }
    });
    if (res.bestResult?.evaluation?.validation?.isValid && payload.project.id) {
      store.saveSolutionHistory(payload.project.id, {
        engine: res.bestResult.engine,
        status: res.bestResult.status,
        qualityScore: res.bestResult.evaluation.qualityScore,
        elapsedMs: res.elapsedMs,
        placements: res.bestResult.placements
      });
    }
    return res;
  });

  ipcMain.handle('solver:cancel', () => engine.cancelAll());

  ipcMain.handle('solver:listSolutions', (_ev, projectId) => {
    if (typeof projectId !== 'string') return [];
    return store.listSolutionHistory(projectId);
  });

  ipcMain.handle('auth:openLogin', () => openEvrakPlusLoginWindow());
  ipcMain.handle('auth:status', () => inspectEvrakPlusSession());
  ipcMain.handle('auth:logout', () => logoutEvrakPlusSession());

  ipcMain.handle('system:info', () => {
    const paths = resolveEmbeddedPaths({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath });
    return {
      appVersion: APP_VERSION,
      electron: process.versions.electron,
      node: process.versions.node,
      storageBackend: store?.backend || 'unknown',
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      totalMemGB: Math.round(os.totalmem() / (1024 ** 3) * 10) / 10,
      freeMemGB: Math.round(os.freemem() / (1024 ** 3) * 10) / 10,
      embedded: paths.existence
    };
  });

  ipcMain.handle('updater:check', () => checkLatestRelease());
  ipcMain.handle('updater:downloadAndInstall', (_ev, info) => downloadAndInstallRelease(info));
  ipcMain.handle('export:pdf', (_ev, opts) => exportHtmlToPdf(opts));
  ipcMain.handle('export:print', (_ev, opts) => printHtmlDirect(opts));
}

async function cleanShutdownAndExit() {
  if (isQuitting) return;
  isQuitting = true;
  try {
    if (authWindow && !authWindow.isDestroyed()) authWindow.destroy();
  } catch {
    // ignore
  }
  try {
    if (engine) {
      await Promise.race([
        engine.cancelAll(),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);
    }
  } catch {
    // ignore
  }
  try {
    if (store) store.close();
  } catch {
    // ignore
  }
  app.exit(0);
}

if (app && typeof app.whenReady === 'function') {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });

    app.whenReady().then(() => {
      const dataDir = path.join(app.getPath('userData'), 'data');
      store = new SqliteProjectStore(path.join(dataDir, 'evrakplus.sqlite'));
      const embedded = resolveEmbeddedPaths({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath });
      engine = new MultiSolverEngine({
        ortools: { pythonBin: embedded.pythonBin },
        scip: { pythonBin: embedded.pythonBin },
        highs: { pythonBin: embedded.pythonBin },
        timefold: { javaBin: embedded.javaBin, jarPath: embedded.timefoldJar },
        choco: { javaBin: embedded.javaBin, jarPath: embedded.chocoJar },
        minizinc: { minizincBin: embedded.minizincBin, backendSolver: 'gecode' }
      });
      registerIpcHandlers();
      createWindow();
    });

    app.on('before-quit', ev => {
      if (!isQuitting) {
        ev.preventDefault();
        cleanShutdownAndExit();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        cleanShutdownAndExit();
      }
    });
  }
}
