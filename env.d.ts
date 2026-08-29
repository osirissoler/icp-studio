import type { ProjectionState } from "./src/shared/projection";

/**
 * Add types (that are not auto-magically added by Quasar CLI already)
 * for custom environment variables and APIs exposed by Electron.
 */
interface ImportMetaEnv {}

interface IcpStudioApi {
  projection: {
    setState: (state: ProjectionState) => void;
    onState: (listener: (state: ProjectionState) => void) => () => void;
  };
}

declare global {
  interface Window {
    icpStudio?: IcpStudioApi;
  }
}

export {};
