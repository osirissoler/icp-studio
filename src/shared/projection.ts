export const PROJECTION_CHANNELS = {
  setState: 'projection:set-state',
  stateChanged: 'projection:state-changed',
  controlMedia: 'projection:control-media',
  mediaControl: 'projection:media-control',
} as const;

export interface ProjectionContentState {
  mode: 'content';
  title: string;
  body: string;
  footer?: string;
}

export interface ProjectionMediaState {
  mode: 'media';
  mediaType: 'image' | 'video';
  url: string;
  name: string;
}

export interface ProjectionBlankState {
  mode: 'blank';
}

export interface MediaPlaybackCommand {
  action: 'play' | 'pause' | 'seek';
  time?: number;
}

export type ProjectionState =
  | ProjectionContentState
  | ProjectionMediaState
  | ProjectionBlankState;
