import { BrowserWindow, app, ipcMain, screen, type Display } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { registerQuasarRuntime, resolveElectronAssetsPath } from '#q-app/electron/main';
import { PROJECTION_CHANNELS, type ProjectionState } from '../src/shared/projection';
import { WINDOW_CHANNELS } from '../src/shared/window';
import type { DisplayInfo } from '../src/shared/display';
import { registerBibleIpc, unregisterBibleIpc } from './bible/bible-ipc';
import { closeBibleDatabase } from './bible/bible-database';

const platform = process.platform || os.platform();

function getConnectedDisplays(): DisplayInfo[] {
  const primaryDisplayId = screen.getPrimaryDisplay().id;

  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    label: display.label || `Pantalla ${index + 1}`,
    isPrimary: display.id === primaryDisplayId,
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    },
    scaleFactor: display.scaleFactor,
  }));
}

const windows: {
  main: BrowserWindow | null;
} = {
  main: null,
};

const projectionWindows = new Map<number, BrowserWindow>();

let songEditorWindow: BrowserWindow | null = null;

let latestProjectionState: ProjectionState = {
  mode: 'blank',
};

function parseProjectionState(value: unknown): ProjectionState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const state = value as Record<string, unknown>;

  if (state.mode === 'blank') {
    return { mode: 'blank' };
  }

  if (
    state.mode === 'content' &&
    typeof state.title === 'string' &&
    typeof state.body === 'string'
  ) {
    const contentState: ProjectionState = {
      mode: 'content',
      title: state.title.slice(0, 200),
      body: state.body.slice(0, 5000),
    };

    return typeof state.footer === 'string'
      ? {
          ...contentState,
          footer: state.footer.slice(0, 500),
        }
      : contentState;
  }

  return null;
}

function broadcastProjectionState(state: ProjectionState): void {
  for (const projectionWindow of projectionWindows.values()) {
    if (!projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send(PROJECTION_CHANNELS.stateChanged, state);
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

async function loadAppWindow(targetWindow: BrowserWindow, route?: string): Promise<void> {
  if (import.meta.env.QUASAR_DEV) {
    const appUrl = new URL(import.meta.env.QUASAR_APP_URL);

    if (route) {
      appUrl.hash = route;
    }

    await targetWindow.loadURL(appUrl.toString());

    return;
  }

  if (route) {
    await targetWindow.loadFile('index.html', { hash: route });

    return;
  }

  await targetWindow.loadFile('index.html');
}

async function createSongEditorWindow(): Promise<void> {
  if (songEditorWindow && !songEditorWindow.isDestroyed()) {
    if (songEditorWindow.isMinimized()) {
      songEditorWindow.restore();
    }

    songEditorWindow.focus();
    return;
  }

  songEditorWindow = new BrowserWindow({
    title: 'ICP Studio - Nueva alabanza',
    icon: resolveElectronAssetsPath('icons/icon.png'),
    width: 1100,
    height: 760,
    minWidth: 850,
    minHeight: 620,
    center: true,
    fullscreen: false,
    fullscreenable: false,
    maximizable: false,
    resizable: true,
    movable: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0c131d',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'electron-preload.cjs'),
    },
  });

  songEditorWindow.once('ready-to-show', () => {
    songEditorWindow?.show();
  });

  songEditorWindow.on('closed', () => {
    songEditorWindow = null;
  });

  await loadAppWindow(songEditorWindow, '/song-editor/new');
}

function registerWindowIpc(): void {
  ipcMain.on(WINDOW_CHANNELS.openSongEditor, (event) => {
    if (event.sender !== windows.main?.webContents) {
      return;
    }

    void createSongEditorWindow();
  });
}

async function createProjectionWindow(display: Display | null, index: number): Promise<void> {
  const displayWindowOptions = display
    ? {
        width: Math.min(1280, Math.round(display.workArea.width * 0.78)),
        height: Math.min(720, Math.round(display.workArea.height * 0.78)),
        minWidth: 640,
        minHeight: 360,
        x:
          display.workArea.x +
          Math.round(
            (display.workArea.width -
              Math.min(1280, Math.round(display.workArea.width * 0.78))) /
              2,
          ),
        y:
          display.workArea.y +
          Math.round(
            (display.workArea.height -
              Math.min(720, Math.round(display.workArea.height * 0.78))) /
              2,
          ),
        frame: true,
        movable: true,
        resizable: true,
        maximizable: true,
        fullscreenable: true,
      }
    : {
        width: 1280,
        height: 720,
        minWidth: 640,
        minHeight: 360,
        center: true,
        frame: true,
        movable: true,
        resizable: true,
        maximizable: true,
        fullscreenable: true,
      };

  const projectorWindow = new BrowserWindow({
    title: display
      ? `ICP Studio - Proyector ${index + 1} - ${display.label}`
      : 'ICP Studio - Vista previa del proyector',
    icon: resolveElectronAssetsPath('icons/icon.png'),
    ...displayWindowOptions,
    useContentSize: false,
    show: false,
    autoHideMenuBar: true,
    skipTaskbar: false,
    backgroundColor: '#05070d',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'electron-preload.cjs'),
    },
  });

  const projectionId = display?.id ?? projectorWindow.id;

  projectionWindows.set(projectionId, projectorWindow);

  projectorWindow.once('ready-to-show', () => {
    projectorWindow.show();
  });

  projectorWindow.webContents.on('did-finish-load', () => {
    projectorWindow.webContents.send(PROJECTION_CHANNELS.stateChanged, latestProjectionState);
  });

  projectorWindow.on('closed', () => {
    projectionWindows.delete(projectionId);
  });

  await loadAppWindow(projectorWindow, '/projector');
}

async function createWindow(): Promise<void> {
  const mainWindow = new BrowserWindow({
    title: 'ICP Studio',
    icon: resolveElectronAssetsPath('icons/icon.png'),
    width: 1200,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'electron-preload.cjs'),
    },
  });

  windows.main = mainWindow;

  mainWindow.on('closed', () => {
    windows.main = null;
  });

  await loadAppWindow(mainWindow);

  const primaryDisplayId = screen.getPrimaryDisplay().id;

  const externalDisplays = screen
    .getAllDisplays()
    .filter((display) => display.id !== primaryDisplayId);

  if (externalDisplays.length === 0) {
    await createProjectionWindow(null, 0);
  } else {
    await Promise.all(
      externalDisplays.map((display, index) => createProjectionWindow(display, index)),
    );
  }

  if (import.meta.env.QUASAR_DEBUG) {
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }
}

void app.whenReady().then(() => {
  registerQuasarRuntime();

  const connectedDisplays = getConnectedDisplays();

  console.log('Pantallas detectadas:', connectedDisplays);

  registerProjectionIpc();
  registerWindowIpc();

  registerBibleIpc(() => windows.main);

  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('before-quit', () => {
  unregisterBibleIpc();
  closeBibleDatabase();
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});
