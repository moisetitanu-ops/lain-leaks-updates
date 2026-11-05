import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import path from "node:path";

const isDevelopment = !app.isPackaged;

type UpdateStatus = {
  status: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  percent?: number;
  message?: string;
};

function sendUpdateStatus(status: UpdateStatus): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send("updater:status", status);
  }
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.on("checking-for-update", () => sendUpdateStatus({ status: "checking" }));
autoUpdater.on("update-available", (info) => sendUpdateStatus({ status: "available", version: info.version }));
autoUpdater.on("update-not-available", () => sendUpdateStatus({ status: "not-available" }));
autoUpdater.on("download-progress", (progress) => sendUpdateStatus({ status: "downloading", percent: progress.percent }));
autoUpdater.on("update-downloaded", (info) => sendUpdateStatus({ status: "downloaded", version: info.version }));
autoUpdater.on("error", (error) => sendUpdateStatus({ status: "error", message: error.message }));

ipcMain.handle("updater:configure", (_event, configuration: unknown) => {
  if (!app.isPackaged || !configuration || typeof configuration !== "object") return null;

  const { signedIn } = configuration as Record<string, unknown>;
  if (signedIn !== true) return null;

  autoUpdater.requestHeaders = null;
  void autoUpdater.checkForUpdates().catch((error: unknown) => {
    sendUpdateStatus({
      status: "error",
      message: error instanceof Error ? error.message : "Unable to check for updates.",
    });
  });
  return null;
});

ipcMain.on("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});
ipcMain.on("window:toggle-maximize", (event) => {
  const target = BrowserWindow.fromWebContents(event.sender);
  if (!target) return;
  if (target.isMaximized()) {
    target.unmaximize();
  } else {
    target.maximize();
  }
});
ipcMain.on("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: "Lain Leaks",
    backgroundColor: "#000000",
    frame: false,
    roundedCorners: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  window.webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase();
    const opensDevTools =
      input.key === "F12"
      || ((input.control || input.meta) && input.shift && ["i", "j", "c"].includes(key));

    if (opensDevTools) event.preventDefault();
  });

  if (isDevelopment) {
    void window.loadURL("http://127.0.0.1:5173");
  } else {
    void window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
