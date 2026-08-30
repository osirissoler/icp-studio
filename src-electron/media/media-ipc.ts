import { app, dialog, ipcMain, type BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  MEDIA_CHANNELS,
  type MediaKind,
  type MediaLibraryItem,
} from '../../src/shared/media';

type StoredMediaItem = Omit<MediaLibraryItem, 'url'>;

function mediaRoot(): string {
  return path.join(app.getPath('userData'), 'media');
}

function catalogPath(): string {
  return path.join(mediaRoot(), 'catalog.json');
}

function mediaFolder(kind: MediaKind): string {
  return path.join(mediaRoot(), kind === 'image' ? 'images' : 'videos');
}

function itemUrl(item: StoredMediaItem): string {
  const folder = item.kind === 'image' ? 'images' : 'videos';
  return `icp-media://library/${folder}/${encodeURIComponent(item.storedName)}`;
}

function withUrl(item: StoredMediaItem): MediaLibraryItem {
  return { ...item, url: itemUrl(item) };
}

async function readCatalog(): Promise<StoredMediaItem[]> {
  try {
    const content = await readFile(catalogPath(), 'utf8');
    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as StoredMediaItem[]) : [];
  } catch {
    return [];
  }
}

async function saveCatalog(items: StoredMediaItem[]): Promise<void> {
  await mkdir(mediaRoot(), { recursive: true });
  await writeFile(catalogPath(), JSON.stringify(items, null, 2), 'utf8');
}

function mimeTypeFor(extension: string, kind: MediaKind): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
  };

  return types[extension] ?? (kind === 'image' ? 'image/*' : 'video/*');
}

async function selectMedia(
  mainWindow: BrowserWindow | null,
  kind: MediaKind,
): Promise<MediaLibraryItem[]> {
  if (!mainWindow) return [];

  const result = await dialog.showOpenDialog(mainWindow, {
    title: kind === 'image' ? 'Seleccionar imágenes' : 'Seleccionar videos',
    properties: ['openFile', 'multiSelections'],
    filters: [
      kind === 'image'
        ? { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
        : { name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'm4v'] },
    ],
  });

  if (result.canceled) return [];

  const catalog = await readCatalog();
  const imported: MediaLibraryItem[] = [];
  await mkdir(mediaFolder(kind), { recursive: true });

  for (const sourcePath of result.filePaths) {
    const extension = path.extname(sourcePath).toLowerCase();
    const storedName = `${randomUUID()}${extension}`;
    const destination = path.join(mediaFolder(kind), storedName);
    await copyFile(sourcePath, destination);

    const item: StoredMediaItem = {
      id: randomUUID(),
      kind,
      name: path.basename(sourcePath, extension),
      storedName,
      mimeType: mimeTypeFor(extension, kind),
      size: 0,
      createdAt: new Date().toISOString(),
    };

    catalog.push(item);
    imported.push(withUrl(item));
  }

  await saveCatalog(catalog);
  return imported;
}

export function registerMediaIpc(
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle(MEDIA_CHANNELS.list, async (_event, kind: MediaKind) => {
    const catalog = await readCatalog();
    return catalog.filter((item) => item.kind === kind).map(withUrl);
  });

  ipcMain.handle(MEDIA_CHANNELS.select, async (_event, kind: MediaKind) => {
    return selectMedia(getMainWindow(), kind);
  });

  ipcMain.handle(
    MEDIA_CHANNELS.rename,
    async (_event, itemId: string, nextName: string) => {
      const cleanName = nextName.trim().slice(0, 200);
      if (!cleanName) return null;

      const catalog = await readCatalog();
      const item = catalog.find((entry) => entry.id === itemId);
      if (!item) return null;

      item.name = cleanName;
      await saveCatalog(catalog);
      return withUrl(item);
    },
  );

  ipcMain.handle(MEDIA_CHANNELS.remove, async (_event, itemId: string) => {
    const catalog = await readCatalog();
    const item = catalog.find((entry) => entry.id === itemId);
    if (!item) return false;

    await rm(path.join(mediaFolder(item.kind), item.storedName), { force: true });
    await saveCatalog(catalog.filter((entry) => entry.id !== itemId));
    return true;
  });
}

export function unregisterMediaIpc(): void {
  ipcMain.removeHandler(MEDIA_CHANNELS.list);
  ipcMain.removeHandler(MEDIA_CHANNELS.select);
  ipcMain.removeHandler(MEDIA_CHANNELS.remove);
  ipcMain.removeHandler(MEDIA_CHANNELS.rename);
}
