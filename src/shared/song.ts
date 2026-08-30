export type SongPartType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'ending' | 'other';

export const SONG_CHANNELS = {
  getDefaultCollection: 'song:get-default-collection',
} as const;


export interface SongPart {
  id: string;
  type: SongPartType;
  content: string;
}

export interface SongDraft {
  title: string;
  author: string;
  musicalKey: string;
  parts: SongPart[];
}

export interface Song extends SongDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultSong extends SongDraft {
  id: string;
  number: number;
  reference: string;
  source: string;
}

export interface DefaultSongCollection {
  schemaVersion: number;
  collectionId: string;
  collectionName: string;
  language: string;
  songs: DefaultSong[];
}

export const SONG_PART_TYPE_OPTIONS: ReadonlyArray<{
  label: string;
  value: SongPartType;
  icon: string;
}> = [
  { label: 'Estrofa', value: 'verse', icon: 'notes' },
  { label: 'Coro', value: 'chorus', icon: 'repeat' },
  { label: 'Puente', value: 'bridge', icon: 'commit' },
  { label: 'Introducción', value: 'intro', icon: 'first_page' },
  { label: 'Final', value: 'ending', icon: 'last_page' },
  { label: 'Parte', value: 'other', icon: 'segment' },
];
