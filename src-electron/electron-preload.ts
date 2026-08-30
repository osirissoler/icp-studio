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
import {
  PROJECTION_CHANNELS,
  type MediaPlaybackCommand,
  type ProjectionState,
} from '../src/shared/projection';
import {
  SONG_CHANNELS,
  type DefaultSongCollection,
} from '../src/shared/song';
import { WINDOW_CHANNELS } from '../src/shared/window';
import {
  MEDIA_CHANNELS,
  type MediaKind,
  type MediaLibraryItem,
} from '../src/shared/media';

const windowApi = {
  openSongEditor: (songId?: string): void => {
    ipcRenderer.send(WINDOW_CHANNELS.openSongEditor, songId);
  },
};

const projectionApi = {
  setState: (state: ProjectionState): void => {
    ipcRenderer.send(PROJECTION_CHANNELS.setState, state);
  },
  controlMedia: (command: MediaPlaybackCommand): void => {
    ipcRenderer.send(PROJECTION_CHANNELS.controlMedia, command);
  },
  onMediaControl: (
    listener: (command: MediaPlaybackCommand) => void,
  ): (() => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      command: MediaPlaybackCommand,
    ) => listener(command);

    ipcRenderer.on(PROJECTION_CHANNELS.mediaControl, subscription);
    return () => ipcRenderer.removeListener(
      PROJECTION_CHANNELS.mediaControl,
      subscription,
    );
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

const mediaApi = {
  list: (kind: MediaKind): Promise<MediaLibraryItem[]> => {
    return ipcRenderer.invoke(MEDIA_CHANNELS.list, kind) as Promise<MediaLibraryItem[]>;
  },
  select: (kind: MediaKind): Promise<MediaLibraryItem[]> => {
    return ipcRenderer.invoke(MEDIA_CHANNELS.select, kind) as Promise<MediaLibraryItem[]>;
  },
  remove: (itemId: string): Promise<boolean> => {
    return ipcRenderer.invoke(MEDIA_CHANNELS.remove, itemId) as Promise<boolean>;
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
  media: mediaApi,
  projection: projectionApi,
  windows: windowApi,
});
