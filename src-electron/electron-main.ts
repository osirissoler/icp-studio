import { BrowserWindow, app } from "electron";
import path from "node:path";
import os from "node:os";
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from "#q-app/electron/main";

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const windows: {
  main: BrowserWindow | null;
  projector: BrowserWindow | null;
} = {
  main: null,
  projector: null
};

async function loadAppWindow(
  targetWindow: BrowserWindow,
  route?: string
): Promise<void> {
  if (import.meta.env.QUASAR_DEV) {
    const appUrl = new URL(import.meta.env.QUASAR_APP_URL);

    if (route) {
      appUrl.hash = route;
    }

    await targetWindow.loadURL(appUrl.toString());
    return;
  }

  if (route) {
    await targetWindow.loadFile("index.html", { hash: route });
    return;
  }

  await targetWindow.loadFile("index.html");
}

async function createWindow() {
  windows.main = new BrowserWindow({
    title: "ICP Studio",
    icon: resolveElectronAssetsPath("icons/icon.png"), // Windows and Linux
    width: 1200,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.join(import.meta.dirname, "electron-preload.cjs")
    }
  });

  windows.main.on("closed", () => {
    windows.main = null;
  });

  await loadAppWindow(windows.main);

  windows.projector = new BrowserWindow({
    title: "ICP Studio - Proyector",
    icon: resolveElectronAssetsPath("icons/icon.png"), // Windows and Linux
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    useContentSize: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#05070d",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, "electron-preload.cjs")
    }
  });

  windows.projector.once("ready-to-show", () => {
    windows.projector?.show();
  });

  windows.projector.on("closed", () => {
    windows.projector = null;
  });

  await loadAppWindow(windows.projector, "/projector");

  if (import.meta.env.QUASAR_DEBUG) {
    // if on DEV or Production with debug enabled
    windows.main.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    windows.main.webContents.on("devtools-opened", () => {
      windows.main?.webContents.closeDevTools();
    });
  }
}

void app.whenReady().then(() => {
  registerQuasarRuntime();
  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (platform !== "darwin") {
    app.quit();
  }
});
