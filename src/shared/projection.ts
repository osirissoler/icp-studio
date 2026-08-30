export const PROJECTION_CHANNELS = {
  setState: 'projection:set-state',
  stateChanged: 'projection:state-changed',
} as const;

export interface ProjectionContentState {
  mode: 'content';
  title: string;
  body: string;
  footer?: string;
}

export interface ProjectionBlankState {
  mode: 'blank';
}

export type ProjectionState = ProjectionContentState | ProjectionBlankState;
