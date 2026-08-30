import type { Song, SongDraft, SongPart } from '../shared/song';

export const SONG_LIBRARY_STORAGE_KEY = 'icp-studio:songs:v1';

function isSongPart(value: unknown): value is SongPart {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const part = value as Record<string, unknown>;

  return (
    typeof part.id === 'string' &&
    typeof part.type === 'string' &&
    typeof part.content === 'string'
  );
}

function isSong(value: unknown): value is Song {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const song = value as Record<string, unknown>;

  return (
    typeof song.id === 'string' &&
    typeof song.title === 'string' &&
    typeof song.author === 'string' &&
    typeof song.musicalKey === 'string' &&
    typeof song.createdAt === 'string' &&
    typeof song.updatedAt === 'string' &&
    Array.isArray(song.parts) &&
    song.parts.every(isSongPart)
  );
}

export function getSongs(): Song[] {
  const storedValue = window.localStorage.getItem(SONG_LIBRARY_STORAGE_KEY);

  if (!storedValue) {
    return [];
  }

  try {
    const songs: unknown = JSON.parse(storedValue);

    return Array.isArray(songs)
      ? songs
          .filter(isSong)
          .sort((first, second) => first.title.localeCompare(second.title, 'es'))
      : [];
  } catch {
    return [];
  }
}

export function saveSong(draft: SongDraft): Song {
  const songs = getSongs();
  const now = new Date().toISOString();
  const song: Song = {
    id: window.crypto.randomUUID(),
    title: draft.title.trim(),
    author: draft.author.trim(),
    musicalKey: draft.musicalKey.trim(),
    parts: draft.parts.map((part) => ({ ...part })),
    createdAt: now,
    updatedAt: now,
  };

  window.localStorage.setItem(
    SONG_LIBRARY_STORAGE_KEY,
    JSON.stringify([...songs, song]),
  );

  return song;
}
