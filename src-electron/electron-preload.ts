import { contextBridge, ipcRenderer } from 'electron';
import { quasarRuntime } from '#q-app/electron/preload';
import {
  BIBLE_CHANNELS,
  type BibleBook,
  type BibleBookChaptersRequest,
  type BiblePassage,
  type BiblePassageSearch,
  type BibleVersion,
} from '../src/shared/bible';
import { PROJECTION_CHANNELS, type ProjectionState } from '../src/shared/projection';
import {
  SONG_CHANNELS,
  type DefaultSongCollection,
} from '../src/shared/song';
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

const songApi = {
  getDefaultCollection: (): Promise<DefaultSongCollection> => {
    return ipcRenderer.invoke(
      SONG_CHANNELS.getDefaultCollection,
    ) as Promise<DefaultSongCollection>;
  },
};

const bibleApi = {
  getVersions: (): Promise<BibleVersion[]> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.getVersions) as Promise<BibleVersion[]>;
  },
  getBooks: (): Promise<BibleBook[]> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.getBooks) as Promise<BibleBook[]>;
  },
  getBookChapters: (request: BibleBookChaptersRequest): Promise<number[]> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.getBookChapters, request) as Promise<number[]>;
  },
  searchPassage: (request: BiblePassageSearch): Promise<BiblePassage> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.searchPassage, request) as Promise<BiblePassage>;
  },
};

/**
 * APIs available to Vue through the isolated preload bridge.
 */
contextBridge.exposeInMainWorld('quasarRuntime', quasarRuntime);
contextBridge.exposeInMainWorld('icpStudio', {
  bible: bibleApi,
  songs: songApi,
  projection: projectionApi,
  windows: windowApi,
});
