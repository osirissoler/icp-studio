import { contextBridge, ipcRenderer } from 'electron';
import { quasarRuntime } from '#q-app/electron/preload';
import { PROJECTION_CHANNELS, type ProjectionState } from '../src/shared/projection';
import { WINDOW_CHANNELS } from '../src/shared/window';

const windowApi = {
  openSongEditor: (): void => {
    ipcRenderer.send(WINDOW_CHANNELS.openSongEditor);
  },
};

const projectionApi = {
  setState: (state: ProjectionState): void => {
    ipcRenderer.send(PROJECTION_CHANNELS.setState, state);
  },
  onState: (listener: (state: ProjectionState) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, state: ProjectionState) => {
      listener(state);
    };

    ipcRenderer.on(PROJECTION_CHANNELS.stateChanged, subscription);

    return () => {
      ipcRenderer.removeListener(PROJECTION_CHANNELS.stateChanged, subscription);
    };
  },
};

/**
 * APIs available to Vue through the isolated preload bridge.
 */
contextBridge.exposeInMainWorld('quasarRuntime', quasarRuntime);
contextBridge.exposeInMainWorld('icpStudio', {
  projection: projectionApi,
  windows: windowApi,
});
