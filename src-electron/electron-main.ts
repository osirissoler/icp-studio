import {
  BrowserWindow,
  app,
  ipcMain,
  protocol,
  screen,
  type Display,
  type IpcMainEvent,
} from 'electron';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import os from 'node:os';
import { registerQuasarRuntime, resolveElectronAssetsPath } from '#q-app/electron/main';
import {
  PROJECTION_CHANNELS,
  type MediaPlaybackCommand,
  type ProjectionState,
} from '../src/shared/projection';
import { WINDOW_CHANNELS } from '../src/shared/window';
import { DISPLAY_CHANNELS, type DisplayInfo } from '../src/shared/display';
import { registerBibleIpc, unregisterBibleIpc } from './bible/bible-ipc';
import { closeBibleDatabase } from './bible/bible-database';
import { registerSongIpc, unregisterSongIpc } from './song/song-ipc';
import { registerMediaIpc, unregisterMediaIpc } from './media/media-ipc';
import {
  REMOTE_CHANNELS,
  type RemoteBridgeResponse,
  type RemoteControlState,
  type RemoteRequestAction,
} from '../src/shared/remote';
import {
  broadcastRemoteState,
  configureRemoteServer,
  getRemoteServerStatus,
  onRemoteServerStatusChanged,
  startRemoteServer,
  stopRemoteServer,
} from './remote/remote-server';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'icp-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

const platform = process.platform || os.platform();

function mediaMimeType(mediaPath: string): string {
  const extension = path.extname(mediaPath).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };

  return types[extension] ?? 'application/octet-stream';
}

function streamResponse(
  mediaPath: string,
  start: number,
  end: number,
  fileSize: number,
  status: 200 | 206,
  method: string,
): Response {
  const contentLength = end - start + 1;
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': String(contentLength),
    'Content-Type': mediaMimeType(mediaPath),
  });

  if (status === 206) {
    headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  }

  if (method === 'HEAD') {
    return new Response(null, { status, headers });
  }

  const nodeStream = createReadStream(mediaPath, { start, end });
  const body = Readable.toWeb(nodeStream) as unknown as BodyInit;
  return new Response(body, { status, headers });
}

function registerMediaProtocol(): void {
  protocol.handle('icp-media', async (request) => {
    const mediaUrl = new URL(request.url);

    if (mediaUrl.hostname !== 'library') {
      return new Response('Recurso no encontrado', { status: 404 });
    }

    const mediaRoot = path.resolve(app.getPath('userData'), 'media');
    const relativePath = decodeURIComponent(mediaUrl.pathname).replace(/^\/+/, '');
    const mediaPath = path.resolve(mediaRoot, relativePath);

    if (!mediaPath.startsWith(`${mediaRoot}${path.sep}`)) {
      return new Response('Ruta inválida', { status: 403 });
    }

    try {
      const fileInfo = await stat(mediaPath);
      const fileSize = fileInfo.size;
      const range = request.headers.get('range');

      if (!range) {
        return streamResponse(
          mediaPath,
          0,
          Math.max(0, fileSize - 1),
          fileSize,
          200,
          request.method,
        );
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!match) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const suffixLength = !match[1] && match[2] ? Number(match[2]) : null;
      const requestedStart =
        suffixLength === null ? Number(match[1]) : Math.max(0, fileSize - suffixLength);
      const requestedEnd = suffixLength === null && match[2] ? Number(match[2]) : fileSize - 1;
      const start = Math.max(0, requestedStart);
      const end = Math.min(fileSize - 1, requestedEnd);

      if (start > end || start >= fileSize) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      return streamResponse(mediaPath, start, end, fileSize, 206, request.method);
    } catch {
      return new Response('Recurso no encontrado', { status: 404 });
    }
  });
}

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

function notifyRendererDisplays(): void {
  windows.main?.webContents.send(DISPLAY_CHANNELS.changed, getConnectedDisplays());
}

async function synchronizeProjectionWindows(): Promise<void> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const externalDisplays = screen
    .getAllDisplays()
    .filter((display) => display.id !== primaryDisplay.id);
  const usesOperatorDisplay = externalDisplays.length === 0;
  const outputDisplays = usesOperatorDisplay ? [primaryDisplay] : externalDisplays;
  const outputDisplayIds = new Set(outputDisplays.map((display) => display.id));

  for (const [displayId, projectionWindow] of projectionWindows) {
    if (!outputDisplayIds.has(displayId)) {
      projectionWindows.delete(displayId);
      if (!projectionWindow.isDestroyed()) {
        projectionWindow.close();
      }
    }
  }

  for (const [index, display] of outputDisplays.entries()) {
    if (!projectionWindows.has(display.id)) {
      await createProjectionWindow(display, index, usesOperatorDisplay);
    }
  }
}

function handleDisplayConfigurationChanged(): void {
  void synchronizeProjectionWindows();
  notifyRendererDisplays();
}

function registerDisplayMonitoring(): void {
  ipcMain.handle(DISPLAY_CHANNELS.list, () => getConnectedDisplays());
  screen.on('display-added', handleDisplayConfigurationChanged);
  screen.on('display-removed', handleDisplayConfigurationChanged);
  screen.on('display-metrics-changed', handleDisplayConfigurationChanged);
}

function unregisterDisplayMonitoring(): void {
  ipcMain.removeHandler(DISPLAY_CHANNELS.list);
  screen.off('display-added', handleDisplayConfigurationChanged);
  screen.off('display-removed', handleDisplayConfigurationChanged);
  screen.off('display-metrics-changed', handleDisplayConfigurationChanged);
}

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
    state.mode === 'media' &&
    (state.mediaType === 'image' || state.mediaType === 'video' || state.mediaType === 'audio') &&
    typeof state.url === 'string' &&
    state.url.startsWith('icp-media://library/') &&
    typeof state.name === 'string'
  ) {
    return {
      mode: 'media',
      mediaType: state.mediaType,
      url: state.url,
      name: state.name.slice(0, 300),
    };
  }

  if (
    state.mode === 'document' &&
    typeof state.url === 'string' &&
    state.url.startsWith('icp-media://library/documents/') &&
    typeof state.name === 'string' &&
    (state.format === 'pdf' || state.format === 'spreadsheet' || state.format === 'presentation') &&
    typeof state.pageIndex === 'number' &&
    Number.isInteger(state.pageIndex)
  ) {
    return {
      mode: 'document',
      url: state.url,
      name: state.name.slice(0, 300),
      format: state.format,
      pageIndex: Math.max(0, state.pageIndex),
    };
  }

  if (
    state.mode === 'activity' &&
    typeof state.id === 'string' &&
    typeof state.title === 'string' &&
    typeof state.dateLabel === 'string' &&
    typeof state.location === 'string' &&
    typeof state.description === 'string' &&
    typeof state.imageUrl === 'string' &&
    (state.imageUrl === '' || state.imageUrl.startsWith('icp-media://library/')) &&
    typeof state.showOverlayText === 'boolean' &&
    typeof state.showDescriptionOnImage === 'boolean' &&
    typeof state.categoryLabel === 'string' &&
    typeof state.categoryColor === 'string'
  ) {
    return {
      mode: 'activity',
      id: state.id.slice(0, 200),
      title: state.title.slice(0, 300),
      dateLabel: state.dateLabel.slice(0, 500),
      location: state.location.slice(0, 500),
      description: state.description.slice(0, 3000),
      imageUrl: state.imageUrl,
      showOverlayText: state.showOverlayText,
      showDescriptionOnImage: state.showDescriptionOnImage,
      categoryLabel: state.categoryLabel.slice(0, 100),
      categoryColor: /^#[0-9a-f]{6}$/i.test(state.categoryColor) ? state.categoryColor : '#60a5fa',
    };
  }

  if (
    state.mode === 'roulette' &&
    typeof state.id === 'string' &&
    typeof state.title === 'string' &&
    Array.isArray(state.options) &&
    typeof state.rotation === 'number' &&
    Number.isFinite(state.rotation) &&
    typeof state.winnerId === 'string' &&
    typeof state.spinning === 'boolean' &&
    typeof state.spinDuration === 'number' &&
    ['full', 'first-word', 'short', 'hidden'].includes(String(state.labelMode))
  ) {
    const options = state.options
      .slice(0, 40)
      .filter(
        (option): option is { id: string; label: string; color: string } =>
          typeof option === 'object' &&
          option !== null &&
          typeof (option as Record<string, unknown>).id === 'string' &&
          typeof (option as Record<string, unknown>).label === 'string' &&
          typeof (option as Record<string, unknown>).color === 'string',
      )
      .map((option) => ({
        id: option.id.slice(0, 200),
        label: option.label.slice(0, 120),
        color: /^#[0-9a-f]{6}$/i.test(option.color) ? option.color : '#60a5fa',
      }));
    if (options.length >= 2) {
      return {
        mode: 'roulette',
        id: state.id.slice(0, 200),
        title: state.title.slice(0, 200),
        options,
        rotation: state.rotation,
        winnerId: state.winnerId.slice(0, 200),
        spinning: state.spinning,
        spinDuration: Math.min(15000, Math.max(500, state.spinDuration)),
        labelMode: state.labelMode as 'full' | 'first-word' | 'short' | 'hidden',
      };
    }
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
  ipcMain.on(PROJECTION_CHANNELS.controlMedia, (event, command: MediaPlaybackCommand) => {
    if (event.sender !== windows.main?.webContents) return;
    if (!['play', 'pause', 'seek'].includes(command.action)) return;

    for (const projectionWindow of projectionWindows.values()) {
      if (!projectionWindow.isDestroyed()) {
        projectionWindow.webContents.send(PROJECTION_CHANNELS.mediaControl, command);
      }
    }
  });

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

async function createSongEditorWindow(songId?: string): Promise<void> {
  if (songEditorWindow && !songEditorWindow.isDestroyed()) {
    if (songEditorWindow.isMinimized()) {
      songEditorWindow.restore();
    }

    songEditorWindow.focus();
    return;
  }

  songEditorWindow = new BrowserWindow({
    title: songId ? 'ICP Studio - Editar alabanza' : 'ICP Studio - Nueva alabanza',
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

  const editorRoute = songId ? `/song-editor/${encodeURIComponent(songId)}` : '/song-editor/new';

  await loadAppWindow(songEditorWindow, editorRoute);
}

function registerWindowIpc(): void {
  ipcMain.on(WINDOW_CHANNELS.openSongEditor, (event, value: unknown) => {
    if (event.sender !== windows.main?.webContents) {
      return;
    }

    const songId = typeof value === 'string' && value.length <= 200 ? value : undefined;

    void createSongEditorWindow(songId);
  });
}

const pendingRemoteRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

function requestRemoteRenderer(
  action: RemoteRequestAction,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const mainWindow = windows.main;
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.reject(new Error('La ventana principal de ICP Studio todavía no está lista.'));
  }

  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRemoteRequests.delete(id);
      reject(new Error('ICP Studio tardó demasiado en responder.'));
    }, 45_000);
    pendingRemoteRequests.set(id, { resolve, reject, timeout });
    mainWindow.webContents.send(REMOTE_CHANNELS.request, { id, action, payload });
  });
}

function handleRemoteBridgeResponse(event: IpcMainEvent, response: RemoteBridgeResponse): void {
  if (event.sender !== windows.main?.webContents || !response || typeof response.id !== 'string') {
    return;
  }
  const pending = pendingRemoteRequests.get(response.id);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingRemoteRequests.delete(response.id);
  if (response.success) pending.resolve(response.data);
  else pending.reject(new Error(response.error ?? 'No se pudo completar la solicitud remota.'));
}

function handleRemoteState(event: IpcMainEvent, state: RemoteControlState): void {
  if (event.sender === windows.main?.webContents) broadcastRemoteState(state);
}

function registerRemoteIpc(): void {
  ipcMain.handle(REMOTE_CHANNELS.status, () => getRemoteServerStatus());
  ipcMain.handle(REMOTE_CHANNELS.start, () => startRemoteServer());
  ipcMain.handle(REMOTE_CHANNELS.stop, () => stopRemoteServer());
  ipcMain.on(REMOTE_CHANNELS.response, handleRemoteBridgeResponse);
  ipcMain.on(REMOTE_CHANNELS.publishState, handleRemoteState);

  configureRemoteServer({
    handleAction: requestRemoteRenderer,
    mediaRoot: () => path.join(app.getPath('userData'), 'media'),
  });

  onRemoteServerStatusChanged((status) => {
    windows.main?.webContents.send(REMOTE_CHANNELS.statusChanged, status);
  });
}

function unregisterRemoteIpc(): void {
  ipcMain.removeHandler(REMOTE_CHANNELS.status);
  ipcMain.removeHandler(REMOTE_CHANNELS.start);
  ipcMain.removeHandler(REMOTE_CHANNELS.stop);
  ipcMain.off(REMOTE_CHANNELS.response, handleRemoteBridgeResponse);
  ipcMain.off(REMOTE_CHANNELS.publishState, handleRemoteState);
  for (const pending of pendingRemoteRequests.values()) {
    clearTimeout(pending.timeout);
    pending.reject(new Error('ICP Studio se está cerrando.'));
  }
  pendingRemoteRequests.clear();
  onRemoteServerStatusChanged(null);
}

async function createProjectionWindow(
  display: Display | null,
  index: number,
  usesOperatorDisplay = false,
): Promise<void> {
  const displayWindowOptions = display
    ? {
        width: Math.min(1280, Math.round(display.workArea.width * 0.78)),
        height: Math.min(720, Math.round(display.workArea.height * 0.78)),
        minWidth: 640,
        minHeight: 360,
        x:
          display.workArea.x +
          Math.round(
            (display.workArea.width - Math.min(1280, Math.round(display.workArea.width * 0.78))) /
              2,
          ),
        y:
          display.workArea.y +
          Math.round(
            (display.workArea.height - Math.min(720, Math.round(display.workArea.height * 0.78))) /
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
    title: usesOperatorDisplay
      ? 'ICP Studio - Presentación en pantalla del operador'
      : display
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

  await synchronizeProjectionWindows();

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
  registerMediaProtocol();

  const connectedDisplays = getConnectedDisplays();

  console.log('Pantallas detectadas:', connectedDisplays);

  registerProjectionIpc();
  registerWindowIpc();
  registerRemoteIpc();
  registerDisplayMonitoring();

  registerBibleIpc(() => (windows.main ? [windows.main] : []));
  registerSongIpc(() => windows.main);
  registerMediaIpc(() => windows.main);

  void startRemoteServer();
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('before-quit', () => {
  unregisterBibleIpc();
  unregisterSongIpc();
  unregisterMediaIpc();
  unregisterRemoteIpc();
  unregisterDisplayMonitoring();
  void stopRemoteServer();
  closeBibleDatabase();
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});
