export type SongPartType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'ending' | 'other';

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
