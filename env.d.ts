import type {
  BibleBook,
  BibleBookChaptersRequest,
  BibleBooksRequest,
  BiblePassage,
  BiblePassageSearch,
  BibleTransferResult,
  BibleVersion,
} from './src/shared/bible';
import type { DisplayInfo } from './src/shared/display';
import type { MediaImportProgress, MediaKind, MediaLibraryItem } from './src/shared/media';
import type { MediaPlaybackCommand, ProjectionState } from './src/shared/projection';
import type { DefaultSongCollection } from './src/shared/song';

interface IcpStudioApi {
  displays: {
    list: () => Promise<DisplayInfo[]>;
    onChanged: (listener: (displays: DisplayInfo[]) => void) => () => void;
  };
  bible: {
    getVersions: () => Promise<BibleVersion[]>;
    getBooks: (request?: BibleBooksRequest) => Promise<BibleBook[]>;
    getBookChapters: (request: BibleBookChaptersRequest) => Promise<number[]>;
    searchPassage: (request: BiblePassageSearch) => Promise<BiblePassage>;
    importVersion: () => Promise<BibleTransferResult>;
    exportVersion: (versionCode: string) => Promise<BibleTransferResult>;
    removeVersion: (versionCode: string) => Promise<boolean>;
    setPreferredVersion: (versionCode: string) => void;
    onPreferredVersionChanged: (listener: (versionCode: string) => void) => () => void;
  };
  songs: {
    getDefaultCollection: () => Promise<DefaultSongCollection>;
  };
  media: {
    list: (kind: MediaKind) => Promise<MediaLibraryItem[]>;
    select: (kind: MediaKind) => Promise<MediaLibraryItem[]>;
    onImportProgress: (listener: (progress: MediaImportProgress) => void) => () => void;
    remove: (itemId: string) => Promise<boolean>;
    rename: (itemId: string, name: string) => Promise<MediaLibraryItem | null>;
  };
  projection: {
    setState: (state: ProjectionState) => void;
    controlMedia: (command: MediaPlaybackCommand) => void;
    onMediaControl: (listener: (command: MediaPlaybackCommand) => void) => () => void;
    onState: (listener: (state: ProjectionState) => void) => () => void;
  };
  windows: {
    openSongEditor: (songId?: string) => void;
    openSettings: () => void;
  };
}

declare global {
  /**
   * Add types for custom environment variables configured through Quasar.
   */
  type ImportMetaEnv = Readonly<Record<string, string | boolean | undefined>>;

  /**
   * APIs exposed securely by Electron's preload script.
   */
  interface Window {
    icpStudio?: IcpStudioApi;
  }
}

export {};
