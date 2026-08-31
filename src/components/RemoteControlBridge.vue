<template>
  <span class="remote-control-bridge" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { getPreferredBibleVersion } from '../services/bible-settings';
import { inspectDocument } from '../services/document-reader';
import { getSongs, initializeSongLibrary } from '../services/song-library';
import type { BibleBook, BiblePassage, BibleVerse } from '../shared/bible';
import type { DocumentFormat, MediaKind, MediaLibraryItem } from '../shared/media';
import type { PresentationFrame, ServicePresentationItem } from '../shared/presentation';
import type {
  RemoteBridgeRequest,
  RemoteCatalogItem,
  RemoteCatalogResponse,
  RemoteControlState,
  RemoteModule,
  RemotePreviewFrame,
} from '../shared/remote';
import type { Song, SongPartType } from '../shared/song';
import { usePresentationStore } from '../stores/presentation-store';

const presentationStore = usePresentationStore();
const {
  liveFrame,
  liveFrameIndex,
  liveItem,
  mediaPlayback,
  previewFrame,
  previewFrameIndex,
  previewItem,
  serviceItems,
} = storeToRefs(presentationStore);
let unsubscribeRemoteRequests: (() => void) | undefined;
let songsInitialized = false;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortBookName(value: string): string {
  return value.replace(/^San\s+/i, '');
}

function normalizeBibleReference(value: string): string {
  return value
    .trim()
    .replace(/([\p{L}])(\d)/gu, '$1 $2')
    .replace(/\s+/g, ' ');
}

function matches(value: string, query: string): boolean {
  return !query || normalize(value).includes(normalize(query));
}

function stringPayload(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mediaPath(url: string): string {
  try {
    return `/media${new URL(url).pathname}`;
  } catch {
    return '';
  }
}

function partLabel(type: SongPartType): string {
  const labels: Record<SongPartType, string> = {
    verse: 'Estrofa',
    chorus: 'Coro',
    bridge: 'Puente',
    intro: 'Introducción',
    ending: 'Final',
    other: 'Parte',
  };
  return labels[type];
}

async function songs(): Promise<Song[]> {
  if (!songsInitialized) {
    await initializeSongLibrary();
    songsInitialized = true;
  }
  return getSongs();
}

function mediaKind(module: RemoteModule): MediaKind | null {
  if (module === 'image' || module === 'video' || module === 'audio') return module;
  if (module === 'document') return 'document';
  return null;
}

function mediaBadge(item: MediaLibraryItem): string {
  if (item.kind === 'image') return 'Imagen';
  if (item.kind === 'video') return 'Video';
  if (item.kind === 'audio') return 'Audio';
  if (item.documentFormat === 'pdf') return 'PDF';
  if (item.documentFormat === 'spreadsheet') return 'Hoja de cálculo';
  return 'Presentación';
}

function mediaSubtitle(item: MediaLibraryItem): string {
  const megabytes = item.size / (1024 * 1024);
  return `${mediaBadge(item)} · ${megabytes >= 1 ? `${megabytes.toFixed(1)} MB` : `${Math.max(1, Math.round(item.size / 1024))} KB`}`;
}

async function bibleCatalog(query: string): Promise<RemoteCatalogResponse> {
  const bibleApi = window.icpStudio?.bible;
  if (!bibleApi) throw new Error('La Biblia no está disponible en este dispositivo.');

  const versions = await bibleApi.getVersions();
  const versionCode = getPreferredBibleVersion(versions);
  const version = versions.find((item) => item.code === versionCode) ?? versions[0];
  const response: RemoteCatalogResponse = {
    module: 'bible',
    query,
    items: [],
    ...(version ? { bibleVersion: { code: version.code, name: version.name } } : {}),
  };

  const reference = normalizeBibleReference(query);
  if (!reference) return response;

  if (!/\d/.test(reference)) {
    const books: BibleBook[] = await bibleApi.getBooks({
      ...(version?.code ? { versionCode: version.code } : {}),
    });
    const term = normalize(reference);
    response.items = books
      .filter((book) =>
        [book.displayName, shortBookName(book.displayName), book.abbreviation].some((value) =>
          normalize(value).includes(term),
        ),
      )
      .slice(0, 12)
      .map((book) => {
        const name = shortBookName(book.displayName);
        return {
          id: `book:${book.code}`,
          module: 'bible',
          title: name,
          subtitle: 'Selecciona el libro y completa el capítulo y los versículos.',
          badge: version?.code ?? '',
          suggestionQuery: `${name} `,
        };
      });
    return response;
  }

  try {
    const passage = await bibleApi.searchPassage({
      reference,
      ...(version?.code ? { versionCode: version.code } : {}),
    });
    response.items = passage.verses.map((verse, index) => ({
      id: `${verse.versionCode}:${verse.bookCode}:${verse.chapter}:${verse.verseLabel}`,
      module: 'bible',
      title: verse.reference,
      subtitle: verse.text,
      badge: version?.name ?? verse.versionCode,
      groupReference: reference,
      frameIndex: index,
    }));
  } catch {
    response.items = [];
  }
  return response;
}

async function catalog(module: RemoteModule, query: string): Promise<RemoteCatalogResponse> {
  if (module === 'bible') return bibleCatalog(query);

  if (module === 'song') {
    const items: RemoteCatalogItem[] = (await songs())
      .filter((song) => matches(`${song.title} ${song.author}`, query))
      .map((song) => ({
        id: song.id,
        module,
        title: song.title,
        subtitle: song.author || `${song.parts.length} partes`,
        badge: `${song.parts.length} partes`,
      }));
    return { module, query, items };
  }

  const kind = mediaKind(module);
  if (!kind) return { module, query, items: [] };
  const mediaItems = (await window.icpStudio?.media.list(kind)) ?? [];
  return {
    module,
    query,
    items: mediaItems
      .filter((item) => matches(item.name, query))
      .map((item) => ({
        id: item.id,
        module,
        title: item.name,
        subtitle: mediaSubtitle(item),
        badge: mediaBadge(item),
        ...(item.kind === 'image' || item.kind === 'video'
          ? { mediaPath: mediaPath(item.url) }
          : {}),
      })),
  };
}

function verseKey(verse: BibleVerse): string {
  return `${verse.versionCode}:${verse.bookCode}:${verse.chapter}:${verse.verseLabel}`;
}

function bibleTitle(passage: BiblePassage): string {
  const first = passage.verses[0];
  const last = passage.verses.at(-1);
  if (!first || !last) return `${passage.bookName} ${passage.chapter}`;
  const range =
    first.verseLabel === last.verseLabel
      ? first.verseLabel
      : `${first.verseLabel}-${last.verseLabel}`;
  return `${passage.bookName} ${passage.chapter}:${range}`;
}

async function bibleItem(
  reference: string,
  selectedFrameIndexes?: number[],
): Promise<ServicePresentationItem> {
  const bibleApi = window.icpStudio?.bible;
  if (!bibleApi) throw new Error('La Biblia no está disponible.');
  const versions = await bibleApi.getVersions();
  const versionCode = getPreferredBibleVersion(versions);
  const passage = await bibleApi.searchPassage({
    reference,
    ...(versionCode ? { versionCode } : {}),
  });
  const title = bibleTitle(passage);
  const frames = passage.verses.map((verse) => ({
    id: verseKey(verse),
    label: verse.reference,
    text: verse.text,
  }));
  const selected = new Set(selectedFrameIndexes ?? frames.map((_, index) => index));
  return {
    id: `remote-bible-${passage.versionCode}-${reference}`,
    sourceId: `remote:${passage.versionCode}:${reference}`,
    type: 'bible',
    title,
    footer: title,
    frames: frames.filter((_, index) => selected.has(index)),
  };
}

async function songItem(songId: string): Promise<ServicePresentationItem> {
  const song = (await songs()).find((item) => item.id === songId);
  if (!song) throw new Error('No se encontró la alabanza seleccionada.');
  return {
    id: `remote-song-${song.id}`,
    sourceId: song.id,
    type: 'song',
    title: song.title,
    footer: song.title,
    frames: song.parts.map((part, index) => ({
      id: part.id,
      label: `${index + 1} · ${partLabel(part.type)}`,
      text: part.content,
    })),
  };
}

function viewerFormat(item: MediaLibraryItem): DocumentFormat {
  return item.renderFormat ?? item.documentFormat ?? 'pdf';
}

async function mediaItem(module: RemoteModule, itemId: string): Promise<ServicePresentationItem> {
  const kind = mediaKind(module);
  if (!kind) throw new Error('Módulo remoto no compatible.');
  const item = ((await window.icpStudio?.media.list(kind)) ?? []).find(
    (entry) => entry.id === itemId,
  );
  if (!item) throw new Error('No se encontró el archivo seleccionado.');

  if (item.kind === 'document') {
    if (!item.documentFormat) throw new Error('Formato de documento no reconocido.');
    const format = viewerFormat(item);
    const info = await inspectDocument(item.url, format);
    return {
      id: `remote-document-${item.id}`,
      sourceId: item.id,
      type: item.documentFormat === 'presentation' ? 'presentation' : 'document',
      title: item.name,
      footer: '',
      frames: info.labels.map((label, index) => ({
        id: `${item.id}-${index}`,
        label,
        text: '',
        mediaType: 'document',
        mediaUrl: item.url,
        mimeType: item.mimeType,
        documentFormat: format,
        pageIndex: index,
      })),
    };
  }

  return {
    id: `remote-${item.kind}-${item.id}`,
    sourceId: item.id,
    type: item.kind,
    title: item.name,
    footer: item.name,
    frames: [
      {
        id: item.id,
        label: mediaBadge(item),
        text: '',
        mediaType: item.kind,
        mediaUrl: item.url,
        mimeType: item.mimeType,
      },
    ],
  };
}

async function presentationItem(
  module: RemoteModule,
  itemId: string,
  groupReference: string,
  selectedFrameIndexes?: number[],
): Promise<ServicePresentationItem> {
  if (module === 'bible') return bibleItem(groupReference, selectedFrameIndexes);
  if (module === 'song') return songItem(itemId);
  return mediaItem(module, itemId);
}

function projectItem(item: ServicePresentationItem, frameIndex = 0): void {
  const added = presentationStore.addToService(item);
  if (!added) presentationStore.updateServiceItem(item);
  presentationStore.activateServiceItem(item.id);
  if (frameIndex > 0) presentationStore.setLiveFrame(frameIndex);
}

function moduleFromItem(item: ServicePresentationItem): RemoteModule {
  if (item.type === 'song') return 'song';
  if (item.type === 'bible') return 'bible';
  if (item.type === 'image' || item.type === 'video' || item.type === 'audio') return item.type;
  return 'document';
}

function remoteFrame(frame: PresentationFrame | null | undefined): RemotePreviewFrame | null {
  if (!frame) return null;
  return {
    label: frame.label,
    text: frame.text,
    ...(frame.mediaType ? { mediaType: frame.mediaType } : {}),
    ...(frame.mediaUrl ? { mediaPath: mediaPath(frame.mediaUrl) } : {}),
    ...(frame.documentFormat ? { documentFormat: frame.documentFormat } : {}),
    ...(frame.pageIndex !== undefined ? { pageIndex: frame.pageIndex } : {}),
  };
}

function remoteItemState(
  item: ServicePresentationItem | null,
  frame: PresentationFrame | null | undefined,
  frameIndex: number,
) {
  const serializedFrame = remoteFrame(frame);
  if (!item || !serializedFrame) return null;
  return {
    itemId: item.id,
    module: moduleFromItem(item),
    title: item.title,
    footer: item.footer,
    frameIndex,
    frameCount: item.frames.length,
    frame: serializedFrame,
    frames: item.frames.map((itemFrame) => ({ label: itemFrame.label })),
  };
}

function state(): RemoteControlState {
  return {
    preview: remoteItemState(previewItem.value, previewFrame.value, previewFrameIndex.value),
    live: remoteItemState(liveItem.value, liveFrame.value, liveFrameIndex.value),
    serviceCount: serviceItems.value.length,
    mediaPlayback: {
      isPlaying: mediaPlayback.value.isPlaying,
      time: mediaPlayback.value.time,
      duration: mediaPlayback.value.duration,
    },
  };
}

async function handleRemoteRequest(request: RemoteBridgeRequest): Promise<void> {
  try {
    let data: unknown;
    if (request.action === 'catalog') {
      data = await catalog(
        stringPayload(request.payload.module) as RemoteModule,
        stringPayload(request.payload.query),
      );
    } else if (request.action === 'preview' || request.action === 'project-item') {
      const module = stringPayload(request.payload.module) as RemoteModule;
      const frameIndex = Number(request.payload.frameIndex ?? 0);
      const itemId = stringPayload(request.payload.itemId);
      const item = await presentationItem(
        module,
        itemId,
        stringPayload(request.payload.groupReference),
        Array.isArray(request.payload.selectedFrameIndexes)
          ? request.payload.selectedFrameIndexes.filter(
              (index): index is number => typeof index === 'number',
            )
          : undefined,
      );
      if (request.action === 'preview') {
        presentationStore.setPreviewItem(item, frameIndex);
      } else {
        projectItem(item, frameIndex);
      }
      data = state();
    } else if (request.action === 'project-preview') {
      if (!previewItem.value)
        throw new Error('Primero selecciona un contenido para previsualizar.');
      projectItem(previewItem.value, previewFrameIndex.value);
      data = state();
    } else if (request.action === 'move-preview') {
      presentationStore.movePreviewFrame(Number(request.payload.direction) < 0 ? -1 : 1);
      data = state();
    } else if (request.action === 'set-preview-frame') {
      presentationStore.setPreviewFrame(Number(request.payload.frameIndex));
      data = state();
    } else if (request.action === 'move-live') {
      presentationStore.moveLiveFrame(Number(request.payload.direction) < 0 ? -1 : 1);
      data = state();
    } else if (request.action === 'set-live-frame') {
      presentationStore.setLiveFrame(Number(request.payload.frameIndex));
      data = state();
    } else if (request.action === 'control-media') {
      const action = stringPayload(request.payload.action);
      if (action !== 'play' && action !== 'pause' && action !== 'seek') {
        throw new Error('Control de reproducción inválido.');
      }
      presentationStore.controlLiveMedia({
        action,
        ...(typeof request.payload.time === 'number' ? { time: request.payload.time } : {}),
      });
      data = state();
    } else {
      data = state();
    }
    window.icpStudio?.remote.respond({ id: request.id, success: true, data });
  } catch (error) {
    window.icpStudio?.remote.respond({
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo completar la solicitud remota.',
    });
  }
}

function publishState(): void {
  window.icpStudio?.remote.publishState(state());
}

watch(
  [previewItem, previewFrameIndex, liveItem, liveFrameIndex, mediaPlayback, serviceItems],
  publishState,
  { deep: true },
);

onMounted(() => {
  unsubscribeRemoteRequests = window.icpStudio?.remote.onRequest((request) => {
    void handleRemoteRequest(request);
  });
  publishState();
});

onBeforeUnmount(() => unsubscribeRemoteRequests?.());
</script>

<style scoped>
.remote-control-bridge {
  display: none;
}
</style>
