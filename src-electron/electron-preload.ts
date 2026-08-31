import { contextBridge, ipcRenderer } from 'electron';
import { quasarRuntime } from '#q-app/electron/preload';
import {
  BIBLE_CHANNELS,
  type BibleBook,
  type BibleBookChaptersRequest,
  type BibleBooksRequest,
  type BiblePassage,
  type BiblePassageSearch,
  type BibleTransferResult,
  type BibleVersion,
} from '../src/shared/bible';
import {
  PROJECTION_CHANNELS,
  type MediaPlaybackCommand,
  type ProjectionState,
} from '../src/shared/projection';
import { SONG_CHANNELS, type DefaultSongCollection } from '../src/shared/song';
import { WINDOW_CHANNELS } from '../src/shared/window';
import { DISPLAY_CHANNELS, type DisplayInfo } from '../src/shared/display';
import {
  MEDIA_CHANNELS,
  type MediaImportProgress,
  type MediaKind,
  type MediaLibraryItem,
} from '../src/shared/media';

const displayApi = {
  list: (): Promise<DisplayInfo[]> => {
    return ipcRenderer.invoke(DISPLAY_CHANNELS.list) as Promise<DisplayInfo[]>;
  },
  onChanged: (listener: (displays: DisplayInfo[]) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, displays: DisplayInfo[]) =>
      listener(displays);

    ipcRenderer.on(DISPLAY_CHANNELS.changed, subscription);
    return () => ipcRenderer.removeListener(DISPLAY_CHANNELS.changed, subscription);
  },
};

const windowApi = {
  openSongEditor: (songId?: string): void => {
    ipcRenderer.send(WINDOW_CHANNELS.openSongEditor, songId);
  },
  openSettings: (): void => {
    ipcRenderer.send(WINDOW_CHANNELS.openSettings);
  },
};

const projectionApi = {
  setState: (state: ProjectionState): void => {
    ipcRenderer.send(PROJECTION_CHANNELS.setState, state);
  },
  controlMedia: (command: MediaPlaybackCommand): void => {
    ipcRenderer.send(PROJECTION_CHANNELS.controlMedia, command);
  },
  onMediaControl: (listener: (command: MediaPlaybackCommand) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, command: MediaPlaybackCommand) =>
      listener(command);

    ipcRenderer.on(PROJECTION_CHANNELS.mediaControl, subscription);
    return () => ipcRenderer.removeListener(PROJECTION_CHANNELS.mediaControl, subscription);
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
    return ipcRenderer.invoke(SONG_CHANNELS.getDefaultCollection) as Promise<DefaultSongCollection>;
  },
};

const mediaApi = {
  list: (kind: MediaKind): Promise<MediaLibraryItem[]> => {
    return ipcRenderer.invoke(MEDIA_CHANNELS.list, kind) as Promise<MediaLibraryItem[]>;
  },
  select: (kind: MediaKind): Promise<MediaLibraryItem[]> => {
    return ipcRenderer.invoke(MEDIA_CHANNELS.select, kind) as Promise<MediaLibraryItem[]>;
  },
  onImportProgress: (listener: (progress: MediaImportProgress) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, progress: MediaImportProgress) =>
      listener(progress);

    ipcRenderer.on(MEDIA_CHANNELS.importProgress, subscription);
    return () => ipcRenderer.removeListener(MEDIA_CHANNELS.importProgress, subscription);
  },
  remove: (itemId: string): Promise<boolean> => {
    return ipcRenderer.invoke(MEDIA_CHANNELS.remove, itemId) as Promise<boolean>;
  },
  rename: (itemId: string, name: string): Promise<MediaLibraryItem | null> => {
    return ipcRenderer.invoke(
      MEDIA_CHANNELS.rename,
      itemId,
      name,
    ) as Promise<MediaLibraryItem | null>;
  },
};

const bibleApi = {
  getVersions: (): Promise<BibleVersion[]> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.getVersions) as Promise<BibleVersion[]>;
  },
  getBooks: (request: BibleBooksRequest = {}): Promise<BibleBook[]> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.getBooks, request) as Promise<BibleBook[]>;
  },
  getBookChapters: (request: BibleBookChaptersRequest): Promise<number[]> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.getBookChapters, request) as Promise<number[]>;
  },
  searchPassage: (request: BiblePassageSearch): Promise<BiblePassage> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.searchPassage, request) as Promise<BiblePassage>;
  },
  importVersion: (): Promise<BibleTransferResult> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.importVersion) as Promise<BibleTransferResult>;
  },
  exportVersion: (versionCode: string): Promise<BibleTransferResult> => {
    return ipcRenderer.invoke(
      BIBLE_CHANNELS.exportVersion,
      versionCode,
    ) as Promise<BibleTransferResult>;
  },
  removeVersion: (versionCode: string): Promise<boolean> => {
    return ipcRenderer.invoke(BIBLE_CHANNELS.removeVersion, versionCode) as Promise<boolean>;
  },
  setPreferredVersion: (versionCode: string): void => {
    ipcRenderer.send(BIBLE_CHANNELS.preferredVersionChanged, versionCode);
  },
  onPreferredVersionChanged: (listener: (versionCode: string) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, versionCode: string) =>
      listener(versionCode);
    ipcRenderer.on(BIBLE_CHANNELS.preferredVersionChanged, subscription);
    return () => ipcRenderer.removeListener(BIBLE_CHANNELS.preferredVersionChanged, subscription);
  },
};

/**
 * APIs available to Vue through the isolated preload bridge.
 */
contextBridge.exposeInMainWorld('quasarRuntime', quasarRuntime);
contextBridge.exposeInMainWorld('icpStudio', {
  bible: bibleApi,
  displays: displayApi,
  songs: songApi,
  media: mediaApi,
  projection: projectionApi,
  windows: windowApi,
});
