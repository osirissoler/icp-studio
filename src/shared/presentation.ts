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

export interface PresentationFrame {
  id: string;
  label: string;
  text: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mimeType?: string;
  documentFormat?: 'pdf' | 'spreadsheet' | 'presentation';
  pageIndex?: number;
}

export interface ServicePresentationItem {
  id: string;
  sourceId: string;
  type: PresentationItemType;
  title: string;
  footer: string;
  frames: PresentationFrame[];
}
