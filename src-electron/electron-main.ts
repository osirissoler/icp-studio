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

import { type ClockDisplayStyle, type TimeToolMode } from '../src/shared/time-tool';

import { WINDOW_CHANNELS } from '../src/shared/window';

import {
  DISPLAY_CHANNELS,
  type ApplyDisplayConfigurationRequest,
} from '../src/shared/display';

import { registerBibleIpc, unregisterBibleIpc } from './bible/bible-ipc';

import { closeBibleDatabase } from './bible/bible-database';

import { registerSongIpc, unregisterSongIpc } from './song/song-ipc';

import { registerMediaIpc, unregisterMediaIpc } from './media/media-ipc';

import {
  applyDisplayConfiguration,
  getConnectedDisplays,
  getDisplayStatus,
  identifyDisplays,
  loadDisplayConfiguration,
  resolveProjectionTargets,
} from './display/display-settings';

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

/*
 * Permite que el metrónomo proyectado
 * produzca audio aunque la ventana de
 * proyección no haya recibido un clic
 * directo del usuario.
 */
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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
    return new Response(null, {
      status,
      headers,
    });
  }

  const nodeStream = createReadStream(mediaPath, {
    start,
    end,
  });

  const body = Readable.toWeb(nodeStream) as unknown as BodyInit;

  return new Response(body, {
    status,
    headers,
  });
}

function registerMediaProtocol(): void {
  protocol.handle(
    'icp-media',

    async (request) => {
      const mediaUrl = new URL(request.url);

      if (mediaUrl.hostname !== 'library') {
        return new Response('Recurso no encontrado', {
          status: 404,
        });
      }

      const mediaRoot = path.resolve(app.getPath('userData'), 'media');

      const relativePath = decodeURIComponent(mediaUrl.pathname).replace(/^\/+/, '');

      const mediaPath = path.resolve(mediaRoot, relativePath);

      if (!mediaPath.startsWith(`${mediaRoot}${path.sep}`)) {
        return new Response('Ruta inválida', {
          status: 403,
        });
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

            headers: {
              'Content-Range': `bytes */${fileSize}`,
            },
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

            headers: {
              'Content-Range': `bytes */${fileSize}`,
            },
          });
        }

        return streamResponse(mediaPath, start, end, fileSize, 206, request.method);
      } catch {
        return new Response('Recurso no encontrado', {
          status: 404,
        });
      }
    },
  );
}

const windows: {
  main: BrowserWindow | null;
} = {
  main: null,
};

const projectionWindows = new Map<number, BrowserWindow>();

function notifyRendererDisplays(): void {
  windows.main?.webContents.send(DISPLAY_CHANNELS.changed, getConnectedDisplays());
  windows.main?.webContents.send(DISPLAY_CHANNELS.statusChanged, getDisplayStatus());
}

async function closeProjectionWindows(): Promise<void> {
  for (const projectionWindow of projectionWindows.values()) {
    if (!projectionWindow.isDestroyed()) {
      projectionWindow.close();
    }
  }
  projectionWindows.clear();
}

async function synchronizeProjectionWindows(forceRecreate = false): Promise<void> {
  const { displays: outputDisplays, audioDisplayId, usesOperatorDisplay } = resolveProjectionTargets();
  const outputDisplayIds = new Set(outputDisplays.map((display) => display.id));

  if (forceRecreate) {
    await closeProjectionWindows();
  } else {
    for (const [displayId, projectionWindow] of projectionWindows) {
      if (!outputDisplayIds.has(displayId)) {
        projectionWindows.delete(displayId);

        if (!projectionWindow.isDestroyed()) {
          projectionWindow.close();
        }
      }
    }
  }

  for (const [index, display] of outputDisplays.entries()) {
    if (!projectionWindows.has(display.id)) {
      await createProjectionWindow(
        display,
        index,
        usesOperatorDisplay,
        display.id === audioDisplayId,
      );
    }
  }

  notifyRendererDisplays();
}

function handleDisplayConfigurationChanged(): void {
  void synchronizeProjectionWindows();
}

function isDisplayConfigurationRequest(value: unknown): value is ApplyDisplayConfigurationRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as Partial<ApplyDisplayConfigurationRequest>;
  return (
    (request.mode === 'automatic' || request.mode === 'custom') &&
    Array.isArray(request.projectionDisplayIds) &&
    request.projectionDisplayIds.every((id) => typeof id === 'number' && Number.isInteger(id)) &&
    (request.audioDisplayId === null ||
      (typeof request.audioDisplayId === 'number' && Number.isInteger(request.audioDisplayId)))
  );
}

function registerDisplayMonitoring(): void {
  ipcMain.handle(DISPLAY_CHANNELS.list, () => getConnectedDisplays());

  ipcMain.handle(DISPLAY_CHANNELS.getStatus, () => getDisplayStatus());

  ipcMain.handle(DISPLAY_CHANNELS.applyConfiguration, async (event, value: unknown) => {
    if (event.sender !== windows.main?.webContents || !isDisplayConfigurationRequest(value)) {
      throw new Error('Configuración de pantallas inválida.');
    }

    await applyDisplayConfiguration(value);
    await synchronizeProjectionWindows(true);
    return getDisplayStatus();
  });

  ipcMain.handle(DISPLAY_CHANNELS.identify, async (event) => {
    if (event.sender !== windows.main?.webContents) {
      return;
    }
    await identifyDisplays();
  });

  screen.on('display-added', handleDisplayConfigurationChanged);

  screen.on('display-removed', handleDisplayConfigurationChanged);

  screen.on('display-metrics-changed', handleDisplayConfigurationChanged);
}

function unregisterDisplayMonitoring(): void {
  ipcMain.removeHandler(DISPLAY_CHANNELS.list);
  ipcMain.removeHandler(DISPLAY_CHANNELS.getStatus);
  ipcMain.removeHandler(DISPLAY_CHANNELS.applyConfiguration);
  ipcMain.removeHandler(DISPLAY_CHANNELS.identify);

  screen.off('display-added', handleDisplayConfigurationChanged);

  screen.off('display-removed', handleDisplayConfigurationChanged);

  screen.off('display-metrics-changed', handleDisplayConfigurationChanged);
}

let songEditorWindow: BrowserWindow | null = null;

let latestProjectionState: ProjectionState = {
  mode: 'blank',
};

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function isTimeToolMode(value: unknown): value is TimeToolMode {
  return value === 'clock' || value === 'timer' || value === 'stopwatch' || value === 'metronome';
}

function isClockDisplayStyle(value: unknown): value is ClockDisplayStyle {
  return value === 'digital' || value === 'analog';
}

function parseProjectionState(value: unknown): ProjectionState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const state = value as Record<string, unknown>;

  if (state.mode === 'blank') {
    return {
      mode: 'blank',
    };
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

      categoryColor: safeColor(state.categoryColor, '#60a5fa'),
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
    typeof state.pendingWinnerId === 'string' &&
    typeof state.spinning === 'boolean' &&
    typeof state.spinDuration === 'number' &&
    typeof state.spinStartedAt === 'number' &&
    typeof state.timedSpin === 'boolean' &&
    typeof state.allowRepeats === 'boolean' &&
    typeof state.removeWinner === 'boolean' &&
    Array.isArray(state.usedWinnerIds) &&
    ['full', 'first-word', 'short', 'colors-text', 'hidden'].includes(String(state.labelMode))
  ) {
    const options = state.options
      .slice(0, 40)
      .filter(
        (
          option,
        ): option is {
          id: string;
          label: string;
          color: string;
        } =>
          typeof option === 'object' &&
          option !== null &&
          typeof (option as Record<string, unknown>).id === 'string' &&
          typeof (option as Record<string, unknown>).label === 'string' &&
          typeof (option as Record<string, unknown>).color === 'string',
      )
      .map((option) => ({
        id: option.id.slice(0, 200),

        label: option.label.slice(0, 120),

        color: safeColor(option.color, '#60a5fa'),
      }));

    if (options.length >= 2) {
      return {
        mode: 'roulette',

        id: state.id.slice(0, 200),

        title: state.title.slice(0, 200),

        options,

        rotation: state.rotation,

        winnerId: state.winnerId.slice(0, 200),

        pendingWinnerId: state.pendingWinnerId.slice(0, 200),

        spinning: state.spinning,

        spinDuration: Math.min(600000, Math.max(1000, state.spinDuration)),

        spinStartedAt: Math.max(0, state.spinStartedAt),

        timedSpin: state.timedSpin,

        allowRepeats: state.allowRepeats,

        removeWinner: state.removeWinner,

        usedWinnerIds: state.usedWinnerIds
          .filter((id): id is string => typeof id === 'string')
          .slice(0, 40)
          .map((id) => id.slice(0, 200)),

        labelMode: state.labelMode as 'full' | 'first-word' | 'short' | 'colors-text' | 'hidden',

        backgroundColor: safeColor(state.backgroundColor, '#050b12'),

        showTitle: typeof state.showTitle === 'boolean' ? state.showTitle : true,

        winnerTextSize:
          state.winnerTextSize === 'small' || state.winnerTextSize === 'large'
            ? state.winnerTextSize
            : 'medium',

        confettiEnabled: typeof state.confettiEnabled === 'boolean' ? state.confettiEnabled : true,

        confettiIntensity:
          state.confettiIntensity === 'low' || state.confettiIntensity === 'high'
            ? state.confettiIntensity
            : 'medium',

        confettiDuration: [0, 3, 5, 10].includes(Number(state.confettiDuration))
          ? Number(state.confettiDuration)
          : 0,

        soundEnabled: typeof state.soundEnabled === 'boolean' ? state.soundEnabled : false,

        soundVolume:
          typeof state.soundVolume === 'number' && Number.isFinite(state.soundVolume)
            ? Math.min(1, Math.max(0.05, state.soundVolume))
            : 0.45,

        spinSoundEnabled:
          typeof state.spinSoundEnabled === 'boolean' ? state.spinSoundEnabled : true,

        brakeSoundEnabled:
          typeof state.brakeSoundEnabled === 'boolean' ? state.brakeSoundEnabled : true,

        winnerSoundEnabled:
          typeof state.winnerSoundEnabled === 'boolean' ? state.winnerSoundEnabled : true,

        winnerSoundPreset:
          state.winnerSoundPreset === 'crowd' || state.winnerSoundPreset === 'custom'
            ? state.winnerSoundPreset
            : 'chime',

        customWinnerSoundUrl:
          typeof state.customWinnerSoundUrl === 'string' &&
          (state.customWinnerSoundUrl === '' ||
            state.customWinnerSoundUrl.startsWith('icp-media://library/audio/'))
            ? state.customWinnerSoundUrl
            : '',

        customWinnerSoundName:
          typeof state.customWinnerSoundName === 'string'
            ? state.customWinnerSoundName.slice(0, 200)
            : '',
      };
    }
  }

  /*
   * Herramientas de tiempo:
   *
   * reloj
   * temporizador
   * cronómetro
   * metrónomo
   */
  if (state.mode === 'time-tool' && typeof state.tool === 'object' && state.tool !== null) {
    const tool = state.tool as Record<string, unknown>;

    if (
      typeof tool.id === 'string' &&
      typeof tool.title === 'string' &&
      isTimeToolMode(tool.mode) &&
      isClockDisplayStyle(tool.clockStyle) &&
      typeof tool.use24Hour === 'boolean' &&
      typeof tool.showSeconds === 'boolean' &&
      typeof tool.showDate === 'boolean' &&
      typeof tool.showMilliseconds === 'boolean' &&
      typeof tool.durationMs === 'number' &&
      Number.isFinite(tool.durationMs) &&
      typeof tool.baseTimeMs === 'number' &&
      Number.isFinite(tool.baseTimeMs) &&
      typeof tool.startedAt === 'number' &&
      Number.isFinite(tool.startedAt) &&
      typeof tool.running === 'boolean' &&
      typeof tool.completed === 'boolean' &&
      typeof tool.countdownSound === 'boolean' &&
      typeof tool.completionSound === 'boolean' &&
      typeof tool.soundVolume === 'number' &&
      Number.isFinite(tool.soundVolume) &&
      typeof tool.backgroundColor === 'string' &&
      typeof tool.accentColor === 'string' &&
      typeof tool.textColor === 'string' &&
      (tool.displayScale === undefined ||
        (typeof tool.displayScale === 'number' && Number.isFinite(tool.displayScale)))
    ) {
      /*
       * Estos dos valores ya están
       * correctamente estrechados por
       * nuestros type guards.
       *
       * Aquí deja de existir el error:
       * unknown -> TimeToolMode.
       */
      const mode: TimeToolMode = tool.mode;

      const clockStyle: ClockDisplayStyle = tool.clockStyle;

      const isMetronome = mode === 'metronome';

      return {
        mode: 'time-tool',

        tool: {
          id: tool.id.slice(0, 200),

          title: tool.title.slice(0, 200),

          mode,

          clockStyle,

          use24Hour: tool.use24Hour,

          showSeconds: tool.showSeconds,

          showDate: tool.showDate,

          showMilliseconds: tool.showMilliseconds,

          durationMs: Math.min(359_999_000, Math.max(0, tool.durationMs)),

          baseTimeMs: Math.min(359_999_000, Math.max(0, tool.baseTimeMs)),

          startedAt: Math.max(0, tool.startedAt),

          running: tool.running,

          completed: tool.completed,

          countdownSound: tool.countdownSound,

          completionSound: tool.completionSound,

          soundVolume: Math.min(1, Math.max(0, tool.soundVolume)),

          backgroundColor: safeColor(tool.backgroundColor, '#07111d'),

          accentColor: safeColor(tool.accentColor, isMetronome ? '#a78bfa' : '#38bdf8'),

          textColor: safeColor(tool.textColor, '#f8fafc'),

          displayScale:
            typeof tool.displayScale === 'number'
              ? Math.min(1.6, Math.max(0.6, tool.displayScale))
              : 1,

          metronomeBpm:
            isMetronome &&
            typeof tool.metronomeBpm === 'number' &&
            Number.isFinite(tool.metronomeBpm)
              ? Math.round(Math.min(300, Math.max(30, tool.metronomeBpm)))
              : 120,

          metronomeBeatsPerMeasure:
            isMetronome &&
            typeof tool.metronomeBeatsPerMeasure === 'number' &&
            Number.isFinite(tool.metronomeBeatsPerMeasure)
              ? Math.round(Math.min(12, Math.max(2, tool.metronomeBeatsPerMeasure)))
              : 4,

          metronomeBeatUnit: tool.metronomeBeatUnit === 8 ? 8 : 4,

          metronomeAccentFirstBeat:
            typeof tool.metronomeAccentFirstBeat === 'boolean'
              ? tool.metronomeAccentFirstBeat
              : true,

          metronomeSoundEnabled:
            typeof tool.metronomeSoundEnabled === 'boolean' ? tool.metronomeSoundEnabled : true,

          metronomeSoundStyle:
            tool.metronomeSoundStyle === 'wood' || tool.metronomeSoundStyle === 'digital'
              ? tool.metronomeSoundStyle
              : 'classic',

          metronomeShowBeat:
            typeof tool.metronomeShowBeat === 'boolean' ? tool.metronomeShowBeat : true,

          metronomeShowTempoName:
            typeof tool.metronomeShowTempoName === 'boolean' ? tool.metronomeShowTempoName : true,
        },
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
  ipcMain.on(
    PROJECTION_CHANNELS.controlMedia,

    (event, command: MediaPlaybackCommand) => {
      if (event.sender !== windows.main?.webContents) {
        return;
      }

      if (!['play', 'pause', 'seek'].includes(command.action)) {
        return;
      }

      for (const projectionWindow of projectionWindows.values()) {
        if (!projectionWindow.isDestroyed()) {
          projectionWindow.webContents.send(PROJECTION_CHANNELS.mediaControl, command);
        }
      }
    },
  );

  ipcMain.on(
    PROJECTION_CHANNELS.setState,

    (event, value: unknown) => {
      if (event.sender !== windows.main?.webContents) {
        return;
      }

      const state = parseProjectionState(value);

      if (!state) {
        return;
      }

      latestProjectionState = state;

      broadcastProjectionState(state);
    },
  );
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
    await targetWindow.loadFile('index.html', {
      hash: route,
    });

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

  songEditorWindow.once(
    'ready-to-show',

    () => {
      songEditorWindow?.show();
    },
  );

  songEditorWindow.on(
    'closed',

    () => {
      songEditorWindow = null;
    },
  );

  const editorRoute = songId ? `/song-editor/${encodeURIComponent(songId)}` : '/song-editor/new';

  await loadAppWindow(songEditorWindow, editorRoute);
}

function registerWindowIpc(): void {
  ipcMain.on(
    WINDOW_CHANNELS.openSongEditor,

    (event, value: unknown) => {
      if (event.sender !== windows.main?.webContents) {
        return;
      }

      const songId = typeof value === 'string' && value.length <= 200 ? value : undefined;

      void createSongEditorWindow(songId);
    },
  );
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

    pendingRemoteRequests.set(id, {
      resolve,
      reject,
      timeout,
    });

    mainWindow.webContents.send(REMOTE_CHANNELS.request, {
      id,
      action,
      payload,
    });
  });
}

function handleRemoteBridgeResponse(event: IpcMainEvent, response: RemoteBridgeResponse): void {
  if (event.sender !== windows.main?.webContents || !response || typeof response.id !== 'string') {
    return;
  }

  const pending = pendingRemoteRequests.get(response.id);

  if (!pending) {
    return;
  }

  clearTimeout(pending.timeout);

  pendingRemoteRequests.delete(response.id);

  if (response.success) {
    pending.resolve(response.data);
  } else {
    pending.reject(new Error(response.error ?? 'No se pudo completar la solicitud remota.'));
  }
}

function handleRemoteState(event: IpcMainEvent, state: RemoteControlState): void {
  if (event.sender === windows.main?.webContents) {
    broadcastRemoteState(state);
  }
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
  audioMaster = false,
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

      /*
       * Muy importante para el
       * metrónomo.
       *
       * Electron no debe reducir la
       * frecuencia de animación ni
       * temporizadores de esta ventana
       * cuando el operador esté
       * trabajando en otra.
       */
      backgroundThrottling: false,

      preload: path.join(import.meta.dirname, 'electron-preload.cjs'),
    },
  });

  const projectionId = display?.id ?? projectorWindow.id;

  projectionWindows.set(projectionId, projectorWindow);

  projectorWindow.once(
    'ready-to-show',

    () => {
      projectorWindow.show();
    },
  );

  projectorWindow.webContents.on(
    'did-finish-load',

    () => {
      projectorWindow.webContents.send(PROJECTION_CHANNELS.stateChanged, latestProjectionState);
    },
  );

  projectorWindow.on(
    'closed',

    () => {
      projectionWindows.delete(projectionId);
    },
  );

  /*
   * Solo la pantalla configurada como audio principal
   * reproduce el clic del metrónomo. Las demás conservan
   * exactamente la misma imagen sin duplicar el sonido.
   */
  const metronomeAudioMaster = audioMaster ? '1' : '0';

  await loadAppWindow(projectorWindow, `/projector?metronomeAudio=${metronomeAudioMaster}`);
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

  mainWindow.on(
    'closed',

    () => {
      windows.main = null;
    },
  );

  await loadAppWindow(mainWindow);

  await loadDisplayConfiguration();
  await synchronizeProjectionWindows();

  if (import.meta.env.QUASAR_DEBUG) {
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.webContents.on(
      'devtools-opened',

      () => {
        mainWindow.webContents.closeDevTools();
      },
    );
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

  app.on(
    'activate',

    () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    },
  );
});

app.on(
  'before-quit',

  () => {
    unregisterBibleIpc();

    unregisterSongIpc();

    unregisterMediaIpc();

    unregisterRemoteIpc();

    unregisterDisplayMonitoring();

    void stopRemoteServer();

    closeBibleDatabase();
  },
);

app.on(
  'window-all-closed',

  () => {
    if (platform !== 'darwin') {
      app.quit();
    }
  },
);
