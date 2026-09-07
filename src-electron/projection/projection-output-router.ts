import { app, BrowserWindow, ipcMain, type Display } from 'electron';
import type { ActiveProjectionOutput } from '../../src/shared/display';
import {
  PROJECTION_CHANNELS,
  type MediaPlaybackCommand,
  type MediaPlaybackDispatchRequest,
  type ProjectionDispatchRequest,
  type ProjectionState,
} from '../../src/shared/projection';

interface ProjectionTargetsSnapshot {
  displays: Display[];
  outputs: ActiveProjectionOutput[];
}

type ResolveProjectionTargets = () => ProjectionTargetsSnapshot;

const projectionWindowTitlePrefixes = [
  'ICP Studio - Proyector',
  'ICP Studio - Presentación en pantalla del operador',
];

let registered = false;
const latestStateByOutput = new Map<string, ProjectionState>();

function isProjectionWindow(window: BrowserWindow): boolean {
  const title = window.getTitle();
  const url = window.webContents.getURL();
  return (
    url.includes('#/projector') ||
    projectionWindowTitlePrefixes.some((prefix) => title.startsWith(prefix))
  );
}

function windowBelongsToDisplay(window: BrowserWindow, display: Display): boolean {
  const bounds = window.getBounds();
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return (
    centerX >= display.bounds.x &&
    centerX < display.bounds.x + display.bounds.width &&
    centerY >= display.bounds.y &&
    centerY < display.bounds.y + display.bounds.height
  );
}

function isProjectionState(value: unknown): value is ProjectionState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const mode = (value as { mode?: unknown }).mode;
  return (
    mode === 'content' ||
    mode === 'media' ||
    mode === 'document' ||
    mode === 'activity' ||
    mode === 'roulette' ||
    mode === 'time-tool' ||
    mode === 'blank'
  );
}

function isMediaPlaybackCommand(value: unknown): value is MediaPlaybackCommand {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const command = value as Partial<MediaPlaybackCommand>;
  return (
    (command.action === 'play' || command.action === 'pause' || command.action === 'seek') &&
    (command.time === undefined ||
      (typeof command.time === 'number' && Number.isFinite(command.time)))
  );
}

function isDispatchRequest(value: unknown): value is ProjectionDispatchRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as Partial<ProjectionDispatchRequest>;
  return (
    typeof request.outputId === 'string' &&
    request.outputId.length > 0 &&
    request.outputId.length <= 120 &&
    isProjectionState(request.state)
  );
}

function isMediaDispatchRequest(value: unknown): value is MediaPlaybackDispatchRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as Partial<MediaPlaybackDispatchRequest>;
  return (
    typeof request.outputId === 'string' &&
    request.outputId.length > 0 &&
    request.outputId.length <= 120 &&
    isMediaPlaybackCommand(request.command)
  );
}

function isAllowedSender(event: Electron.IpcMainEvent): boolean {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  return Boolean(senderWindow && !senderWindow.isDestroyed() && !isProjectionWindow(senderWindow));
}

function resolveWindowOutput(
  window: BrowserWindow,
  snapshot: ProjectionTargetsSnapshot,
): ActiveProjectionOutput | null {
  if (!isProjectionWindow(window)) {
    return null;
  }

  for (const output of snapshot.outputs) {
    const display = snapshot.displays.find((item) => item.id === output.displayId);
    if (display && windowBelongsToDisplay(window, display)) {
      return output;
    }
  }

  return null;
}

function findOutputWindow(
  outputId: string,
  resolveTargets: ResolveProjectionTargets,
): BrowserWindow | null {
  const snapshot = resolveTargets();
  const output = snapshot.outputs.find((item) => item.outputId === outputId);
  if (!output) {
    return null;
  }

  const display = snapshot.displays.find((item) => item.id === output.displayId);
  if (!display) {
    return null;
  }

  return (
    BrowserWindow.getAllWindows().find(
      (window) =>
        !window.isDestroyed() &&
        isProjectionWindow(window) &&
        windowBelongsToDisplay(window, display),
    ) ?? null
  );
}

function sendStateToOutput(
  outputId: string,
  state: ProjectionState,
  resolveTargets: ResolveProjectionTargets,
): void {
  const window = findOutputWindow(outputId, resolveTargets);
  window?.webContents.send(PROJECTION_CHANNELS.stateChanged, state);
}

function sendMediaControlToOutput(
  outputId: string,
  command: MediaPlaybackCommand,
  resolveTargets: ResolveProjectionTargets,
): void {
  const window = findOutputWindow(outputId, resolveTargets);
  window?.webContents.send(PROJECTION_CHANNELS.mediaControl, command);
}

function restoreTargetedState(
  window: BrowserWindow,
  resolveTargets: ResolveProjectionTargets,
): void {
  if (window.isDestroyed()) {
    return;
  }

  const snapshot = resolveTargets();
  const output = resolveWindowOutput(window, snapshot);
  if (!output) {
    return;
  }

  const state = latestStateByOutput.get(output.outputId);
  if (state) {
    window.webContents.send(PROJECTION_CHANNELS.stateChanged, state);
  }
}

export function registerProjectionOutputRouter(
  resolveTargets: ResolveProjectionTargets,
): void {
  if (registered) {
    return;
  }

  registered = true;

  ipcMain.on(PROJECTION_CHANNELS.setState, (event) => {
    if (!isAllowedSender(event)) {
      return;
    }

    // Un envío global vuelve a sincronizar todas las salidas.
    latestStateByOutput.clear();
  });

  ipcMain.on(PROJECTION_CHANNELS.setStateForOutput, (event, value: unknown) => {
    if (!isAllowedSender(event) || !isDispatchRequest(value)) {
      return;
    }

    latestStateByOutput.set(value.outputId, value.state);
    sendStateToOutput(value.outputId, value.state, resolveTargets);
  });

  ipcMain.on(PROJECTION_CHANNELS.controlMediaForOutput, (event, value: unknown) => {
    if (!isAllowedSender(event) || !isMediaDispatchRequest(value)) {
      return;
    }

    sendMediaControlToOutput(value.outputId, value.command, resolveTargets);
  });

  app.on('browser-window-created', (_event, window) => {
    window.webContents.on('did-finish-load', () => {
      // electron-main envía primero su estado global al cargar. Restauramos
      // después el estado específico de la salida, si existe.
      setTimeout(() => {
        restoreTargetedState(window, resolveTargets);
      }, 0);
    });
  });
}
