import type {
  BibleBook,
  BibleBookChaptersRequest,
  BiblePassage,
  BiblePassageSearch,
  BibleVersion,
} from './src/shared/bible';
import type { ProjectionState } from './src/shared/projection';

interface IcpStudioApi {
  bible: {
    getVersions: () => Promise<BibleVersion[]>;
    getBooks: () => Promise<BibleBook[]>;
    getBookChapters: (request: BibleBookChaptersRequest) => Promise<number[]>;
    searchPassage: (request: BiblePassageSearch) => Promise<BiblePassage>;
  };
  projection: {
    setState: (state: ProjectionState) => void;
    onState: (listener: (state: ProjectionState) => void) => () => void;
  };
  windows: {
    openSongEditor: () => void;
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
