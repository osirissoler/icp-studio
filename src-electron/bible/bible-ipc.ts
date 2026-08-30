import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { BIBLE_CHANNELS, type BiblePassageSearch } from '../../src/shared/bible';
import { getBibleVersions, searchBiblePassage } from './bible-database';

type MainWindowProvider = () => BrowserWindow | null;

function validateSender(event: IpcMainInvokeEvent, getMainWindow: MainWindowProvider): void {
  const mainWindow = getMainWindow();

  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    throw new Error('La solicitud bíblica no proviene de la ventana principal.');
  }
}

function parsePassageSearch(value: unknown): BiblePassageSearch {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Los datos de búsqueda no son válidos.');
  }

  const request = value as Record<string, unknown>;

  if (typeof request.versionCode !== 'string' || request.versionCode.trim().length === 0) {
    throw new Error('Debes seleccionar una versión bíblica.');
  }

  if (typeof request.reference !== 'string' || request.reference.trim().length === 0) {
    throw new Error('Debes escribir una referencia bíblica.');
  }

  return {
    versionCode: request.versionCode.trim().slice(0, 30),

    reference: request.reference.trim().slice(0, 150),
  };
}

export function registerBibleIpc(getMainWindow: MainWindowProvider): void {
  ipcMain.removeHandler(BIBLE_CHANNELS.getVersions);

  ipcMain.removeHandler(BIBLE_CHANNELS.searchPassage);

  ipcMain.handle(BIBLE_CHANNELS.getVersions, (event) => {
    validateSender(event, getMainWindow);
    return getBibleVersions();
  });

  ipcMain.handle(BIBLE_CHANNELS.searchPassage, (event, value: unknown) => {
    validateSender(event, getMainWindow);

    const request = parsePassageSearch(value);

    return searchBiblePassage(request.versionCode, request.reference);
  });
}

export function unregisterBibleIpc(): void {
  ipcMain.removeHandler(BIBLE_CHANNELS.getVersions);

  ipcMain.removeHandler(BIBLE_CHANNELS.searchPassage);
}
