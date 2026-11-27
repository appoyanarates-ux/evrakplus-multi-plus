const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('printPreviewApi', Object.freeze({
  getJob: () => ipcRenderer.invoke('printPreview:getJob'),
  execute: opts => ipcRenderer.invoke('printPreview:execute', opts),
  cancel: () => ipcRenderer.invoke('printPreview:cancel')
}));
