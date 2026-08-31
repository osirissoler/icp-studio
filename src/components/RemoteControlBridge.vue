<template>
  <span class="remote-control-bridge" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { getPreferredBibleVersion } from '../services/bible-settings';
import { inspectDocument } from '../services/document-reader';
import { getSongs, initializeSongLibrary } from '../services/song-library';
import type { BiblePassage, BibleVerse } from '../shared/bible';
import type { DocumentFormat, MediaKind, MediaLibraryItem } from '../shared/media';
import type { ServicePresentationItem } from '../shared/presentation';
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
const { previewFrame, previewFrameIndex, previewItem, serviceItems } =
  storeToRefs(presentationStore);
let unsubscribeRemoteRequests: (() => void) | undefined;
let songsInitialized = false;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
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

  if (!query.trim()) return response;

  const passage = await bibleApi.searchPassage({
    reference: query,
    ...(version?.code ? { versionCode: version.code } : {}),
  });
  response.items = passage.verses.map((verse, index) => ({
    id: `${verse.versionCode}:${verse.bookCode}:${verse.chapter}:${verse.verseLabel}`,
    module: 'bible',
    title: verse.reference,
    subtitle: verse.text,
    badge: verse.versionCode,
    groupReference: query,
    frameIndex: index,
  }));
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

async function biblePreview(reference: string, frameIndex: number): Promise<void> {
  const bibleApi = window.icpStudio?.bible;
  if (!bibleApi) throw new Error('La Biblia no está disponible.');
  const versions = await bibleApi.getVersions();
  const versionCode = getPreferredBibleVersion(versions);
  const passage = await bibleApi.searchPassage({
    reference,
    ...(versionCode ? { versionCode } : {}),
  });
  const title = bibleTitle(passage);
  presentationStore.setPreviewItem(
    {
      id: `remote-bible-${passage.versionCode}-${reference}`,
      sourceId: `remote:${passage.versionCode}:${reference}`,
      type: 'bible',
      title,
      footer: title,
      frames: passage.verses.map((verse) => ({
        id: verseKey(verse),
        label: verse.reference,
        text: verse.text,
      })),
    },
    frameIndex,
  );
}

async function songPreview(songId: string): Promise<void> {
  const song = (await songs()).find((item) => item.id === songId);
  if (!song) throw new Error('No se encontró la alabanza seleccionada.');
  presentationStore.setPreviewItem({
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
  });
}

function viewerFormat(item: MediaLibraryItem): DocumentFormat {
  return item.renderFormat ?? item.documentFormat ?? 'pdf';
}

async function mediaPreview(module: RemoteModule, itemId: string): Promise<void> {
  const kind = mediaKind(module);
  if (!kind) throw new Error('Módulo remoto no compatible.');
  const item = ((await window.icpStudio?.media.list(kind)) ?? []).find(
    (entry) => entry.id === itemId,
  );
  if (!item) throw new Error('No se encontró el archivo seleccionado.');

  let previewItem: ServicePresentationItem;
  if (item.kind === 'document') {
    if (!item.documentFormat) throw new Error('Formato de documento no reconocido.');
    const format = viewerFormat(item);
    const info = await inspectDocument(item.url, format);
    previewItem = {
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
  } else {
    previewItem = {
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
  presentationStore.setPreviewItem(previewItem);
}

function moduleFromItem(item: ServicePresentationItem): RemoteModule {
  if (item.type === 'song') return 'song';
  if (item.type === 'bible') return 'bible';
  if (item.type === 'image' || item.type === 'video' || item.type === 'audio') return item.type;
  return 'document';
}

function remoteFrame(): RemotePreviewFrame | null {
  const frame = previewFrame.value;
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

function state(): RemoteControlState {
  const item = previewItem.value;
  const frame = remoteFrame();
  return {
    preview:
      item && frame
        ? {
            itemId: item.id,
            module: moduleFromItem(item),
            title: item.title,
            footer: item.footer,
            frameIndex: previewFrameIndex.value,
            frameCount: item.frames.length,
            frame,
            frames: item.frames.map((itemFrame) => ({ label: itemFrame.label })),
          }
        : null,
    serviceCount: serviceItems.value.length,
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
    } else if (request.action === 'preview') {
      const module = stringPayload(request.payload.module) as RemoteModule;
      const itemId = stringPayload(request.payload.itemId);
      if (module === 'bible') {
        await biblePreview(
          stringPayload(request.payload.groupReference),
          Number(request.payload.frameIndex ?? 0),
        );
      } else if (module === 'song') {
        await songPreview(itemId);
      } else {
        await mediaPreview(module, itemId);
      }
      data = state();
    } else if (request.action === 'move-preview') {
      presentationStore.movePreviewFrame(Number(request.payload.direction) < 0 ? -1 : 1);
      data = state();
    } else if (request.action === 'set-preview-frame') {
      presentationStore.setPreviewFrame(Number(request.payload.frameIndex));
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

watch([previewItem, previewFrameIndex, serviceItems], publishState, { deep: true });

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
