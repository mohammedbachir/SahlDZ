const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { autoUpdater } = require("electron-updater");

// ─── Configuration ────────────────────────────────────────────
// The desktop always boots straight into the unified staff login:
// activation code → employee → PIN.
// TEST BUILD — while the final deployment is not published we boot to the
// local dev server on port 8080. Switch DEFAULT_BASE to
// "https://sahldz.com" when the production release is ready.
const DEFAULT_BASE = process.env.APP_BASE_URL || "http://localhost:8080";
const APP_URL =
  (process.env.VITE_DEV_SERVER_URL || DEFAULT_BASE) + "/staff-login";
const configPath = path.join(app.getPath("userData"), "config.json");

// ─── Helpers ──────────────────────────────────────────────────
function checkServer(url, timeout = 3000) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout }, (res) => {
      resolve(res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

// ─── Config Management ────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (err) {
    console.error("[CONFIG] Load failed:", err.message);
  }
  return null;
}

function saveConfig(config) {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error("[CONFIG] Save failed:", err.message);
    return false;
  }
}

function clearConfig() {
  try {
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    return true;
  } catch {
    return false;
  }
}

// ─── Window ───────────────────────────────────────────────────
let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "SahlDZ",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#141210",
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("dom-ready", () => {
    mainWindow.webContents.executeJavaScript(
      `window.__ELECTRON__=true;`
    ).catch(() => {});
  });

  navigateToApp();
}

function loadOfflinePage(type) {
  const page = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      background:#141210;color:#f0ece6;min-height:100vh;display:flex;align-items:center;
      justify-content:center;direction:rtl}
    .box{text-align:center;max-width:420px;padding:40px}
    .icon{width:72px;height:72px;border-radius:16px;margin:0 auto 24px;
      display:flex;align-items:center;justify-content:center;font-size:32px}
    .icon.wait{background:#1e1c18;border:2px solid #d4a84a}
    .icon.err{background:rgba(220,38,38,0.1);border:2px solid rgba(220,38,38,0.3)}
    h1{font-size:22px;margin-bottom:8px}
    p{color:#8a8580;font-size:14px;line-height:1.8;margin-bottom:24px}
    .btn{display:inline-block;padding:10px 28px;border-radius:10px;border:none;
      background:#d4a84a;color:#141210;font-size:14px;font-weight:600;cursor:pointer}
    .btn:hover{opacity:0.9}
    .details{margin-top:16px;padding:12px;border-radius:8px;background:#1e1c18;
      font-size:12px;color:#5a5550;font-family:monospace}
  </style>
</head>
<body>
  <div class="box">
    ${type === "waiting"
      ? `<div class="icon wait" style="font-family:monospace;color:#d4a84a">S</div>
         <h1>SahlDZ</h1>
         <p>جاري الاتصال بالخادم...</p>
         <div class="details">${APP_URL}</div>`
      : `<div class="icon err" style="color:#f87171">X</div>
         <h1>تعذر الاتصال</h1>
         <p>تعذّر الوصول إلى الخدمة. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.</p>
         <div class="details">${APP_URL}</div>
         <br>
         <button class="btn" onclick="location.reload()">إعادة المحاولة</button>`
    }
  </div>
</body>
</html>`;

  const tempFile = path.join(app.getPath("temp"), `sahldz-${type}.html`);
  fs.writeFileSync(tempFile, page, "utf8");
  return mainWindow.loadFile(tempFile);
}

async function navigateToApp() {
  console.log("[NAV] Checking server:", APP_URL);
  loadOfflinePage("waiting");

  let retries = 0;
  const maxRetries = 10;
  const interval = 2000;

  const tryConnect = async () => {
    const alive = await checkServer(APP_URL);
    if (alive) {
      console.log("[NAV] Server is up, loading app");
      mainWindow.loadURL(APP_URL);
    } else if (retries < maxRetries) {
      retries++;
      console.log(`[NAV] Server not ready, retry ${retries}/${maxRetries}`);
      setTimeout(tryConnect, interval);
    } else {
      console.log("[NAV] Server unreachable, showing error");
      loadOfflinePage("error");
    }
  };

  await tryConnect();
}

// ─── IPC ──────────────────────────────────────────────────────
ipcMain.handle("get-config", () => loadConfig());
ipcMain.handle("save-config", (_, config) => saveConfig(config));
ipcMain.handle("clear-config", () => clearConfig());
ipcMain.handle("reload-app", () => navigateToApp());
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-platform", () => process.platform);
ipcMain.handle("open-external", (_, url) => shell.openExternal(url));
ipcMain.handle("get-app-url", () => APP_URL);
ipcMain.handle("logout", () => { clearConfig(); navigateToApp(); });
ipcMain.handle("check-for-updates", () => autoUpdater.checkForUpdates().catch(() => null));
ipcMain.handle("install-update", () => autoUpdater.quitAndInstall());

// ─── Auto Update ──────────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = {
  info: (m) => console.log("[UPDATE]", m),
  warn: (m) => console.warn("[UPDATE]", m),
  error: (m) => console.error("[UPDATE]", m),
};

autoUpdater.on("update-available", (info) => {
  if (mainWindow) mainWindow.webContents.send("update-available", { version: info.version });
});
autoUpdater.on("download-progress", (p) => {
  if (mainWindow) mainWindow.webContents.send("update-progress", { percent: Math.round(p.percent) });
});
autoUpdater.on("update-downloaded", (info) => {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "تحديث جديد",
      message: "تم تحميل التحديث " + info.version,
      detail: "سيتم إعادة تشغيل التطبيق لتطبيق التحديث.",
      buttons: ["إعادة التشغيل", "لاحقاً"],
    }).then(({ response }) => { if (response === 0) autoUpdater.quitAndInstall(); });
  }
});
autoUpdater.on("error", (err) => console.error("[UPDATE]", err.message));

// ─── Lifecycle ────────────────────────────────────────────────
let gotTheLock = true;
try { gotTheLock = app.requestSingleLock ? app.requestSingleLock() !== "denied" : true; } catch { gotTheLock = true; }

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createMainWindow();
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
    app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createMainWindow(); });
  });
}

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => autoUpdater.removeAllListeners());
