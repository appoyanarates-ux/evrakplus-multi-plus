import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import { SqliteProjectStore } from './sqlite-store.js';
import { resolveEmbeddedPaths } from './engine-paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadMultiSolver() {
  const packagedUrl = new URL('../packages/multi-solver/src/index.js', import.meta.url);
  if (fs.existsSync(packagedUrl)) return import(packagedUrl.href);
  return import('../../../packages/multi-solver/src/index.js');
}

const { MultiSolverEngine } = await loadMultiSolver();
const ALLOWED_EXTERNAL_HOSTS = new Set(['www.evrakplus.com', 'evrakplus.com', 'github.com']);

export const SECURITY_CONFIG = Object.freeze({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  csp: "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://www.evrakplus.com https://api.github.com; object-src 'none'; base-uri 'self';"
});

let mainWindow = null;
let store = null;
let engine = null;

function isSafeExternalUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' && ALLOWED_EXTERNAL_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function createWindow() {
  const uiIndex = app.isPackaged
    ? path.join(process.resourcesPath, 'ui-shared', 'public', 'index.html')
    : path.resolve(__dirname, '..', '..', '..', 'packages', 'ui-shared', 'public', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: 'EvrakPlus Ders Dağıtım Multi Plus · v1.0.0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: SECURITY_CONFIG.contextIsolation,
      nodeIntegration: SECURITY_CONFIG.nodeIntegration,
      sandbox: SECURITY_CONFIG.sandbox,
      webSecurity: SECURITY_CONFIG.webSecurity
    }
  });

  // Sıkı CSP başlığı uygula
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [SECURITY_CONFIG.csp]
      }
    });
  });

  // Harici bağlantıları yalnızca izinli HTTPS alan adları için sistem tarayıcısında aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
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

  ipcMain.handle('auth:openLogin', () => {
    const loginUrl = 'https://www.evrakplus.com/giris';
    if (isSafeExternalUrl(loginUrl)) shell.openExternal(loginUrl);
    return { opened: true, url: loginUrl };
  });

  ipcMain.handle('system:info', () => {
    const paths = resolveEmbeddedPaths({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath });
    return {
      appVersion: '1.0.0',
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

  ipcMain.handle('updater:check', () => ({
    currentVersion: '1.0.0',
    updateAvailable: false,
    releaseFeed: 'https://github.com/appoyanarates-ux/evrakplus-multi-plus/releases'
  }));
}

if (app && typeof app.whenReady === 'function') {
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

  app.on('before-quit', async () => {
    if (engine) await engine.cancelAll();
    if (store) store.close();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
