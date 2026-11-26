const { contextBridge, ipcRenderer } = require('electron');

/**
 * Sınırlı ve güvenli Electron Preload API'si (contextIsolation: true, sandbox: true).
 * Renderer süreci Node.js veya dosya sistemine doğrudan erişemez.
 */
contextBridge.exposeInMainWorld('evrakplusBridge', Object.freeze({
  platform: 'windows-electron',
  appName: 'DersMatrix Ultimate',
  appVersion: '2.4.0',
  listProjects: () => ipcRenderer.invoke('project:list'),
  loadProject: id => ipcRenderer.invoke('project:load', id),
  saveProject: project => ipcRenderer.invoke('project:save', project),
  deleteProject: id => ipcRenderer.invoke('project:delete', id),
  healthCheckAll: () => ipcRenderer.invoke('solver:healthCheckAll'),
  solve: (project, options) => ipcRenderer.invoke('solver:solve', { project, options }),
  cancelSolve: () => ipcRenderer.invoke('solver:cancel'),
  listSolutions: projectId => ipcRenderer.invoke('solver:listSolutions', projectId),
  startAuth: () => ipcRenderer.invoke('auth:openLogin'),
  getAuthStatus: () => ipcRenderer.invoke('auth:status'),
  logoutAuth: () => ipcRenderer.invoke('auth:logout'),
  onAuthChanged: handler => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('auth:changed', listener);
    return () => ipcRenderer.removeListener('auth:changed', listener);
  },
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  downloadAndInstallUpdate: info => ipcRenderer.invoke('updater:downloadAndInstall', info),
  exportPdf: opts => ipcRenderer.invoke('export:pdf', opts),
  printHtml: opts => ipcRenderer.invoke('export:print', opts),
  onUpdaterEvent: handler => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('updater:event', listener);
    return () => ipcRenderer.removeListener('updater:event', listener);
  },
  onSolverProgress: handler => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('solver:progress', listener);
    return () => ipcRenderer.removeListener('solver:progress', listener);
  }
}));
