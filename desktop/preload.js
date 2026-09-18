const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Config management
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  clearConfig: () => ipcRenderer.invoke("clear-config"),
  logout: () => ipcRenderer.invoke("logout"),

  // Navigation
  reloadApp: () => ipcRenderer.invoke("reload-app"),
  getAppUrl: () => ipcRenderer.invoke("get-app-url"),

  // App info
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  isElectron: true,

  // External links
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", (_, info) => cb(info)),
  onUpdateProgress: (cb) => ipcRenderer.on("update-progress", (_, progress) => cb(progress)),
  onUpdateDownloaded: (cb) => ipcRenderer.on("update-downloaded", (_, info) => cb(info)),
});
