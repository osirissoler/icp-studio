import { app, BrowserWindow, ipcMain, type Display } from 'electron';
import type { ActiveProjectionOutput } from '../../src/shared/display';
import {
  PROJECTION_CHANNELS,
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
  return projectionWindowTitlePrefixes.some((prefix) => title.startsWith(prefix));
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

function sendStateToOutput(
  outputId: string,
  state: ProjectionState,
  resolveTargets: ResolveProjectionTargets,
): void {
  const snapshot = resolveTargets();
  const output = snapshot.outputs.find((item) => item.outputId === outputId);
  if (!output) {
    return;
  }

  const display = snapshot.displays.find((item) => item.id === output.displayId);
  if (!display) {
    return;
  }

  for (const window of BrowserWindow.getAllWindows()) {
    if (
      !window.isDestroyed() &&
      isProjectionWindow(window) &&
      windowBelongsToDisplay(window, display)
    ) {
      window.webContents.send(PROJECTION_CHANNELS.stateChanged, state);
    }
  }
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

  ipcMain.on(PROJECTION_CHANNELS.setState, () => {
    // Un envío global vuelve a sincronizar todas las salidas.
    latestStateByOutput.clear();
  });

  ipcMain.on(PROJECTION_CHANNELS.setStateForOutput, (_event, value: unknown) => {
    if (!isDispatchRequest(value)) {
      return;
    }

    latestStateByOutput.set(value.outputId, value.state);
    sendStateToOutput(value.outputId, value.state, resolveTargets);
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
