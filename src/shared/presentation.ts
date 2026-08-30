export type PresentationItemType =
  | 'bible'
  | 'song'
  | 'image'
  | 'video'
  | 'document'
  | 'presentation'
  | 'game';

export interface PresentationFrame {
  id: string;
  label: string;
  text: string;
  mediaType?: 'image' | 'video';
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
