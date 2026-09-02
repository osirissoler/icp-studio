import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { app, ipcMain, type BrowserWindow } from 'electron';
import {
  SONG_CHANNELS,
  type DefaultSong,
  type DefaultSongCollection,
  type SongPart,
  type SongPartType,
} from '../../src/shared/song';

const SONG_PART_TYPES = new Set<SongPartType>([
  'verse',
  'chorus',
  'bridge',
  'intro',
  'ending',
  'other',
]);

let cachedCollection: DefaultSongCollection | null = null;

function getDefaultSongsPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icp-studio-default-songs.json');
  }

  return path.join(process.cwd(), 'resources', 'songs', 'icp-studio-default-songs.json');
}

function parsePart(value: unknown): SongPart | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const part = value as Record<string, unknown>;

  if (
    typeof part.id !== 'string' ||
    typeof part.type !== 'string' ||
    !SONG_PART_TYPES.has(part.type as SongPartType) ||
    typeof part.content !== 'string' ||
    !part.content.trim()
  ) {
    return null;
  }

  return {
    id: part.id,
    type: part.type as SongPartType,
    content: part.content,
  };
}

function parseSong(value: unknown): DefaultSong | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const song = value as Record<string, unknown>;

  if (
    typeof song.id !== 'string' ||
    typeof song.number !== 'number' ||
    typeof song.title !== 'string' ||
    !song.title.trim() ||
    typeof song.author !== 'string' ||
    typeof song.musicalKey !== 'string' ||
    typeof song.reference !== 'string' ||
    typeof song.source !== 'string' ||
    !Array.isArray(song.parts)
  ) {
    return null;
  }

  const parts = song.parts.map(parsePart);

  if (parts.some((part) => part === null)) {
    return null;
  }

  return {
    id: song.id,
    number: song.number,
    title: song.title,
    author: song.author,
    musicalKey: song.musicalKey,
    reference: song.reference,
    source: song.source,
    parts: parts.filter((part): part is SongPart => part !== null),
  };
}

function loadDefaultSongCollection(): DefaultSongCollection {
  if (cachedCollection) {
    return cachedCollection;
  }

  const collectionPath = getDefaultSongsPath();

  if (!existsSync(collectionPath)) {
    throw new Error(`No se encontró la biblioteca inicial de alabanzas en: ${collectionPath}`);
  }

  const parsedValue: unknown = JSON.parse(readFileSync(collectionPath, 'utf8'));

  if (typeof parsedValue !== 'object' || parsedValue === null) {
    throw new Error('La biblioteca inicial de alabanzas no es válida.');
  }

  const collection = parsedValue as Record<string, unknown>;

  if (
    typeof collection.schemaVersion !== 'number' ||
    typeof collection.collectionId !== 'string' ||
    typeof collection.collectionName !== 'string' ||
    typeof collection.language !== 'string' ||
    !Array.isArray(collection.songs)
  ) {
    throw new Error('La estructura de la biblioteca inicial no es válida.');
  }

  const songs = collection.songs.map(parseSong);

  if (songs.some((song) => song === null)) {
    throw new Error('La biblioteca inicial contiene una o más alabanzas inválidas.');
  }

  cachedCollection = {
    schemaVersion: collection.schemaVersion,
    collectionId: collection.collectionId,
    collectionName: collection.collectionName,
    language: collection.language,
    songs: songs.filter((song): song is DefaultSong => song !== null),
  };

  return cachedCollection;
}

export function registerSongIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(SONG_CHANNELS.getDefaultCollection, (event) => {
    if (event.sender !== getMainWindow()?.webContents) {
      throw new Error('Ventana no autorizada para leer las alabanzas.');
    }

    return loadDefaultSongCollection();
  });
}

export function unregisterSongIpc(): void {
  ipcMain.removeHandler(SONG_CHANNELS.getDefaultCollection);
}
