export const MEDIA_CHANNELS = {
  list: 'media:list',
  select: 'media:select',
  importProgress: 'media:import-progress',
  remove: 'media:remove',
  rename: 'media:rename',
} as const;

export type MediaKind = 'image' | 'video' | 'audio' | 'document';
export type DocumentFormat = 'pdf' | 'spreadsheet' | 'presentation';

export interface MediaLibraryItem {
  id: string;
  kind: MediaKind;
  name: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
  documentFormat?: DocumentFormat;
  renderFormat?: DocumentFormat;
  sourceStoredName?: string;
}

export interface MediaImportProgress {
  fileName: string;
  completedBytes: number;
  totalBytes: number;
  percent: number;
}
