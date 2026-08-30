export type PresentationItemType =
  | 'bible'
  | 'song'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'presentation'
  | 'game';

export interface PresentationFrame {
  id: string;
  label: string;
  text: string;
  mediaType?: 'image' | 'video' | 'audio';
  mediaUrl?: string;
  mimeType?: string;
}

export interface ServicePresentationItem {
  id: string;
  sourceId: string;
  type: PresentationItemType;
  title: string;
  footer: string;
  frames: PresentationFrame[];
}
