export const MEDIA_CHANNELS = {
  list: 'media:list',
  select: 'media:select',
  remove: 'media:remove',
} as const;

export type MediaKind = 'image' | 'video';

export interface MediaLibraryItem {
  id: string;
  kind: MediaKind;
  name: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
}
