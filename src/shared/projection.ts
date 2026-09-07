export const PROJECTION_CHANNELS = {
  setState: 'projection:set-state',
  setStateForOutput: 'projection:set-state-for-output',
  stateChanged: 'projection:state-changed',
  controlMedia: 'projection:control-media',
  controlMediaForOutput: 'projection:control-media-for-output',
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
  mediaType: 'image' | 'video' | 'audio';
  url: string;
  name: string;
}

export interface ProjectionBlankState {
  mode: 'blank';
}

export interface ProjectionActivityState {
  mode: 'activity';
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  description: string;
  imageUrl: string;
  showOverlayText: boolean;
  showDescriptionOnImage: boolean;
  categoryLabel: string;
  categoryColor: string;
}

export interface ProjectionDocumentState {
  mode: 'document';
  url: string;
  name: string;
  format: 'pdf' | 'spreadsheet' | 'presentation';
  pageIndex: number;
}

import type { RoulettePresentationData } from './roulette';
import type { TimeToolPresentationData } from './time-tool';

export interface ProjectionRouletteState extends RoulettePresentationData {
  mode: 'roulette';
}

export interface ProjectionTimeToolState {
  mode: 'time-tool';
  tool: TimeToolPresentationData;
}

export interface MediaPlaybackCommand {
  action: 'play' | 'pause' | 'seek';
  time?: number;
}

export type ProjectionState =
  | ProjectionContentState
  | ProjectionMediaState
  | ProjectionDocumentState
  | ProjectionActivityState
  | ProjectionRouletteState
  | ProjectionTimeToolState
  | ProjectionBlankState;

/**
 * null significa que el contenido se envía a todas las salidas activas.
 * Un string identifica una salida concreta, por ejemplo output-1.
 */
export type ProjectionOutputTarget = string | null;

/**
 * Contrato para enrutar un estado de proyección hacia una salida concreta.
 * El envío global continúa usando PROJECTION_CHANNELS.setState para conservar
 * compatibilidad con todo el flujo actual.
 */
export interface ProjectionDispatchRequest {
  state: ProjectionState;
  outputId: string;
}

export interface MediaPlaybackDispatchRequest {
  command: MediaPlaybackCommand;
  outputId: string;
}
