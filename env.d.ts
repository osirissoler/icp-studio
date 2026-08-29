import type { ProjectionState } from './src/shared/projection';

interface IcpStudioApi {
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
