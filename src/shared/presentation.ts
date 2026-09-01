export type PresentationItemType =
  | 'bible'
  | 'song'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'presentation'
  | 'game'
  | 'activity';

export interface ActivityPresentationData {
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

import type { RoulettePresentationData } from './roulette';

export interface PresentationFrame {
  id: string;
  label: string;
  text: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mimeType?: string;
  documentFormat?: 'pdf' | 'spreadsheet' | 'presentation';
  pageIndex?: number;
  activity?: ActivityPresentationData;
  roulette?: RoulettePresentationData;
}

export interface ServicePresentationItem {
  id: string;
  sourceId: string;
  type: PresentationItemType;
  title: string;
  footer: string;
  frames: PresentationFrame[];
}
