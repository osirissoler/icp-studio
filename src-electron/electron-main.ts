import { BrowserWindow, app, ipcMain, screen } from "electron";
import path from "node:path";
import os from "node:os";
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from "#q-app/electron/main";
import {
  PROJECTION_CHANNELS,
  type ProjectionState
} from "../src/shared/projection";
import type { DisplayInfo } from "../src/shared/display";

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

function getConnectedDisplays(): DisplayInfo[] {
  const primaryDisplayId = screen.getPrimaryDisplay().id;

  return screen.getAllDisplays().map((display, index) => {
    return {
      id: display.id,
      label: display.label || `Pantalla ${index + 1}`,
      isPrimary: display.id === primaryDisplayId,
      bounds: {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height
      },
      scaleFactor: display.scaleFactor
    };
  });
}

const windows: {
  main: BrowserWindow | null;
} = {
  main: null
};

const projectionWindows = new Map<number, BrowserWindow>();
let latestProjectionState: ProjectionState = { mode: "blank" };

function parseProjectionState(value: unknown): ProjectionState | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const state = value as Record<string, unknown>;

  if (state.mode === "blank") {
    return { mode: "blank" };
  }

  if (
    state.mode === "content" &&
    typeof state.title === "string" &&
    typeof state.body === "string"
  ) {
    return {
      mode: "content",
      title: state.title.slice(0, 200),
      body: state.body.slice(0, 5000)
    };
  }

  return null;
}

function broadcastProjectionState(state: ProjectionState): void {
  for (const projectionWindow of projectionWindows.values()) {
    if (!projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send(
        PROJECTION_CHANNELS.stateChanged,
        state
      );
    }
  }
}

function registerProjectionIpc(): void {
  ipcMain.on(PROJECTION_CHANNELS.setState, (event, value: unknown) => {
    if (event.sender !== windows.main?.webContents) {
      return;
    }

    const state = parseProjectionState(value);

    if (!state) {
      return;
    }

    latestProjectionState = state;
    broadcastProjectionState(state);
  });
}

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
  const mainWindow = new BrowserWindow({
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

  windows.main = mainWindow;

  mainWindow.on("closed", () => {
    windows.main = null;
  });

  await loadAppWindow(mainWindow);

  const projectorWindow = new BrowserWindow({
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

  projectionWindows.set(projectorWindow.id, projectorWindow);

  projectorWindow.once("ready-to-show", () => {
    projectorWindow.show();
  });

  projectorWindow.webContents.on("did-finish-load", () => {
    projectorWindow.webContents.send(
      PROJECTION_CHANNELS.stateChanged,
      latestProjectionState
    );
  });

  projectorWindow.on("closed", () => {
    projectionWindows.delete(projectorWindow.id);
  });

  await loadAppWindow(projectorWindow, "/projector");

  if (import.meta.env.QUASAR_DEBUG) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }
}

void app.whenReady().then(() => {
  registerQuasarRuntime();

  const connectedDisplays = getConnectedDisplays();
  console.log("Pantallas detectadas:", connectedDisplays);

  registerProjectionIpc();
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
