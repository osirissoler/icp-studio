import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import {
  BIBLE_CHANNELS,
  type BibleBooksRequest,
  type BibleBookChaptersRequest,
  type BiblePassageSearch,
} from '../../src/shared/bible';
import {
  getBibleBookChapters,
  getBibleBooks,
  getBibleVersions,
  searchBiblePassage,
} from './bible-database';
import { exportBibleVersion, importBibleVersion, removeBibleVersion } from './bible-transfer';

type AuthorizedWindowsProvider = () => BrowserWindow[];

function validateSender(
  event: Pick<IpcMainInvokeEvent, 'sender'>,
  getAuthorizedWindows: AuthorizedWindowsProvider,
): BrowserWindow {
  const sourceWindow = getAuthorizedWindows().find(
    (window) => !window.isDestroyed() && event.sender === window.webContents,
  );

  if (!sourceWindow) {
    throw new Error('La solicitud bíblica no proviene de una ventana autorizada.');
  }

  return sourceWindow;
}

function parsePassageSearch(value: unknown): BiblePassageSearch {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Los datos de búsqueda no son válidos.');
  }

  const request = value as Record<string, unknown>;

  if (typeof request.reference !== 'string' || request.reference.trim().length === 0) {
    throw new Error('Debes escribir una referencia bíblica.');
  }

  const search: BiblePassageSearch = {
    reference: request.reference.trim().slice(0, 150),
  };

  if (typeof request.versionCode === 'string' && request.versionCode.trim().length > 0) {
    search.versionCode = request.versionCode.trim().slice(0, 30);
  }

  return search;
}

function parseBookChaptersRequest(value: unknown): BibleBookChaptersRequest {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Los datos del libro no son válidos.');
  }

  const request = value as Record<string, unknown>;

  if (typeof request.bookCode !== 'string' || request.bookCode.trim().length === 0) {
    throw new Error('Debes seleccionar un libro bíblico.');
  }

  const parsed: BibleBookChaptersRequest = {
    bookCode: request.bookCode.trim().toUpperCase().slice(0, 10),
  };

  if (typeof request.versionCode === 'string' && request.versionCode.trim()) {
    parsed.versionCode = request.versionCode.trim().slice(0, 30);
  }

  return parsed;
}

function parseBooksRequest(value: unknown): BibleBooksRequest {
  if (typeof value !== 'object' || value === null) return {};
  const request = value as Record<string, unknown>;
  return typeof request.versionCode === 'string' && request.versionCode.trim()
    ? { versionCode: request.versionCode.trim().slice(0, 30) }
    : {};
}

export function registerBibleIpc(getAuthorizedWindows: AuthorizedWindowsProvider): void {
  ipcMain.removeHandler(BIBLE_CHANNELS.getVersions);
  ipcMain.removeHandler(BIBLE_CHANNELS.getBooks);
  ipcMain.removeHandler(BIBLE_CHANNELS.getBookChapters);
  ipcMain.removeHandler(BIBLE_CHANNELS.searchPassage);
  ipcMain.removeHandler(BIBLE_CHANNELS.importVersion);
  ipcMain.removeHandler(BIBLE_CHANNELS.exportVersion);
  ipcMain.removeHandler(BIBLE_CHANNELS.removeVersion);
  ipcMain.removeAllListeners(BIBLE_CHANNELS.preferredVersionChanged);

  ipcMain.handle(BIBLE_CHANNELS.getVersions, (event) => {
    validateSender(event, getAuthorizedWindows);
    return getBibleVersions();
  });

  ipcMain.handle(BIBLE_CHANNELS.getBooks, (event, value: unknown) => {
    validateSender(event, getAuthorizedWindows);
    const request = parseBooksRequest(value);
    return getBibleBooks(request.versionCode);
  });

  ipcMain.handle(BIBLE_CHANNELS.getBookChapters, (event, value: unknown) => {
    validateSender(event, getAuthorizedWindows);

    const request = parseBookChaptersRequest(value);
    return getBibleBookChapters(request.bookCode, request.versionCode);
  });

  ipcMain.handle(BIBLE_CHANNELS.searchPassage, (event, value: unknown) => {
    validateSender(event, getAuthorizedWindows);

    const request = parsePassageSearch(value);

    return searchBiblePassage(request.versionCode, request.reference);
  });

  ipcMain.handle(BIBLE_CHANNELS.importVersion, async (event) => {
    const sourceWindow = validateSender(event, getAuthorizedWindows);
    return importBibleVersion(sourceWindow);
  });

  ipcMain.handle(BIBLE_CHANNELS.exportVersion, async (event, value: unknown) => {
    const sourceWindow = validateSender(event, getAuthorizedWindows);
    if (typeof value !== 'string' || !value.trim()) throw new Error('Versión inválida.');
    return exportBibleVersion(sourceWindow, value.trim());
  });

  ipcMain.handle(BIBLE_CHANNELS.removeVersion, (event, value: unknown) => {
    validateSender(event, getAuthorizedWindows);
    if (typeof value !== 'string' || !value.trim()) throw new Error('Versión inválida.');
    return removeBibleVersion(value.trim());
  });

  ipcMain.on(BIBLE_CHANNELS.preferredVersionChanged, (event, value: unknown) => {
    validateSender(event, getAuthorizedWindows);
    if (typeof value !== 'string' || !value.trim()) return;
    const versionCode = value.trim().slice(0, 30);
    for (const targetWindow of getAuthorizedWindows()) {
      if (!targetWindow.isDestroyed()) {
        targetWindow.webContents.send(BIBLE_CHANNELS.preferredVersionChanged, versionCode);
      }
    }
  });
}

export function unregisterBibleIpc(): void {
  ipcMain.removeHandler(BIBLE_CHANNELS.getVersions);
  ipcMain.removeHandler(BIBLE_CHANNELS.getBooks);
  ipcMain.removeHandler(BIBLE_CHANNELS.getBookChapters);
  ipcMain.removeHandler(BIBLE_CHANNELS.searchPassage);
  ipcMain.removeHandler(BIBLE_CHANNELS.importVersion);
  ipcMain.removeHandler(BIBLE_CHANNELS.exportVersion);
  ipcMain.removeHandler(BIBLE_CHANNELS.removeVersion);
  ipcMain.removeAllListeners(BIBLE_CHANNELS.preferredVersionChanged);
}
