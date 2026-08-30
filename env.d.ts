import type {
  BibleBook,
  BibleBookChaptersRequest,
  BiblePassage,
  BiblePassageSearch,
  BibleVersion,
} from './src/shared/bible';
import type { MediaKind, MediaLibraryItem } from './src/shared/media';
import type { MediaPlaybackCommand, ProjectionState } from './src/shared/projection';
import type { DefaultSongCollection } from './src/shared/song';

interface IcpStudioApi {
  bible: {
    getVersions: () => Promise<BibleVersion[]>;
    getBooks: () => Promise<BibleBook[]>;
    getBookChapters: (request: BibleBookChaptersRequest) => Promise<number[]>;
    searchPassage: (request: BiblePassageSearch) => Promise<BiblePassage>;
  };
  songs: {
    getDefaultCollection: () => Promise<DefaultSongCollection>;
  };
  media: {
    list: (kind: MediaKind) => Promise<MediaLibraryItem[]>;
    select: (kind: MediaKind) => Promise<MediaLibraryItem[]>;
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
  };
}

declare global {
  /**
   * Add types for custom environment variables configured through Quasar.
   */
  interface ImportMetaEnv {}

  /**
   * APIs exposed securely by Electron's preload script.
   */
  interface Window {
    icpStudio?: IcpStudioApi;
  }
}

export {};
