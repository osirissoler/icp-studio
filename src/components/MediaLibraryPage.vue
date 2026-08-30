<template>
  <q-page>
    <ModuleWorkspace
      :title="moduleTitle"
      :description="moduleDescription"
      :icon="moduleIcon"
    >
      <template #search>
        <div class="media-panel">
          <div class="media-toolbar">
            <q-input
              v-model="searchText"
              dark
              outlined
              dense
              clearable
              :placeholder="`Buscar ${kind === 'image' ? 'imagen' : 'video'} por nombre...`"
              class="media-search"
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>

            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="add"
              class="media-action-button"
              :loading="importing"
              :aria-label="`Importar ${kind === 'image' ? 'imágenes' : 'videos'}`"
              @click="importMedia"
            >
              <q-tooltip>
                {{ kind === 'image' ? 'Seleccionar imágenes' : 'Seleccionar videos' }}
              </q-tooltip>
            </q-btn>

            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="playlist_add"
              class="media-action-button"
              :disable="!selectedItem"
              aria-label="Agregar al servicio"
              @click="addSelectedToService"
            >
              <q-tooltip>Agregar al servicio</q-tooltip>
            </q-btn>
          </div>

          <q-banner v-if="actionMessage" dense rounded class="action-banner">
            {{ actionMessage }}
          </q-banner>

          <div v-if="loading" class="empty-state">
            <q-spinner color="primary" size="34px" />
            <span>Cargando biblioteca local...</span>
          </div>

          <div v-else-if="filteredItems.length" class="media-grid">
            <button
              v-for="item in filteredItems"
              :key="item.id"
              type="button"
              class="media-card"
              :class="{ 'media-card--active': selectedItem?.id === item.id }"
              @click="selectItem(item)"
            >
              <span class="media-thumbnail">
                <img v-if="kind === 'image'" :src="item.url" :alt="item.name" />
                <video v-else :src="item.url" preload="metadata" muted />
                <q-icon v-if="kind === 'video'" name="play_circle" class="video-mark" />
              </span>
              <span class="media-name">{{ item.name }}</span>
            </button>
          </div>

          <div v-else class="empty-state">
            <q-icon :name="moduleIcon" size="44px" />
            <strong>
              {{ items.length ? 'No encontramos coincidencias' : emptyTitle }}
            </strong>
            <span>{{ emptyDescription }}</span>
          </div>
        </div>
      </template>

      <template #preview>
        <div class="media-panel">
          <div class="panel-label">
            <span>Vista del operador</span>
            <span v-if="selectedItem">{{ selectedItem.name }}</span>
          </div>

          <div class="media-preview">
            <img
              v-if="selectedItem && kind === 'image'"
              :src="selectedItem.url"
              :alt="selectedItem.name"
            />
            <video
              v-else-if="selectedItem"
              :key="selectedItem.id"
              :src="selectedItem.url"
              controls
              preload="metadata"
            />
            <template v-else>
              <q-icon name="preview" size="44px" />
              <span>Selecciona un elemento para previsualizarlo</span>
            </template>
          </div>

          <div class="preview-actions">
            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="present_to_all"
              :disable="!selectedItem"
              @click="presentSelected"
            >
              <q-tooltip>Enviar directamente a En vivo</q-tooltip>
            </q-btn>
          </div>
        </div>
      </template>
    </ModuleWorkspace>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ModuleWorkspace from './ModuleWorkspace.vue';
import type { MediaKind, MediaLibraryItem } from '../shared/media';
import { usePresentationStore } from '../stores/presentation-store';

const props = defineProps<{ kind: MediaKind }>();
const presentationStore = usePresentationStore();

const items = ref<MediaLibraryItem[]>([]);
const selectedItem = ref<MediaLibraryItem | null>(null);
const searchText = ref('');
const loading = ref(true);
const importing = ref(false);
const actionMessage = ref('');
let messageTimer: number | null = null;

const moduleTitle = computed(() => props.kind === 'image' ? 'Imágenes' : 'Videos');
const moduleIcon = computed(() => props.kind === 'image' ? 'image' : 'movie');
const moduleDescription = computed(() =>
  props.kind === 'image'
    ? 'Importa, organiza y proyecta imágenes almacenadas en esta computadora.'
    : 'Importa, previsualiza y proyecta videos almacenados en esta computadora.',
);
const emptyTitle = computed(() =>
  props.kind === 'image' ? 'No hay imágenes guardadas' : 'No hay videos guardados',
);
const emptyDescription = computed(() =>
  props.kind === 'image'
    ? 'Selecciona imágenes de tu computadora para agregarlas a ICP Studio.'
    : 'Selecciona videos de tu computadora para agregarlos a ICP Studio.',
);
const filteredItems = computed(() => {
  const term = normalize(searchText.value);
  return term
    ? items.value.filter((item) => normalize(item.name).includes(term))
    : items.value;
});

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function showMessage(message: string): void {
  if (messageTimer !== null) window.clearTimeout(messageTimer);
  actionMessage.value = message;
  messageTimer = window.setTimeout(() => {
    actionMessage.value = '';
    messageTimer = null;
  }, 3500);
}

async function loadItems(): Promise<void> {
  loading.value = true;
  try {
    items.value = await window.icpStudio?.media.list(props.kind) ?? [];
  } finally {
    loading.value = false;
  }
}

async function importMedia(): Promise<void> {
  importing.value = true;
  try {
    const imported = await window.icpStudio?.media.select(props.kind) ?? [];
    if (imported.length === 0) return;
    items.value = [...items.value, ...imported];
    selectedItem.value = imported.at(-1) ?? null;
    showMessage(
      `${imported.length} ${imported.length === 1 ? 'archivo importado' : 'archivos importados'}.`,
    );
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'No fue posible importar el archivo.');
  } finally {
    importing.value = false;
  }
}

function selectItem(item: MediaLibraryItem): void {
  selectedItem.value = item;
}

function serviceId(item: MediaLibraryItem): string {
  return `service-${item.kind}-${item.id}`;
}

function addItemToService(item: MediaLibraryItem): boolean {
  return presentationStore.addToService({
    id: serviceId(item),
    sourceId: item.id,
    type: item.kind,
    title: item.name,
    footer: '',
    frames: [{
      id: item.id,
      label: item.name,
      text: '',
      mediaType: item.kind,
      mediaUrl: item.url,
      mimeType: item.mimeType,
    }],
  });
}

function addSelectedToService(): void {
  const item = selectedItem.value;
  if (!item) return;
  const added = addItemToService(item);
  showMessage(
    added
      ? `${item.name} fue agregado al servicio.`
      : 'Este elemento ya está agregado al servicio.',
  );
}

function presentSelected(): void {
  const item = selectedItem.value;
  if (!item) return;
  addItemToService(item);
  presentationStore.activateServiceItem(serviceId(item));
}

onMounted(() => {
  void loadItems();
});
</script>

<style scoped>
.media-panel {
  display: flex;
  min-height: 100%;
  flex: 1;
  flex-direction: column;
}

.media-toolbar,
.panel-label,
.preview-actions {
  display: flex;
  align-items: center;
}

.media-toolbar {
  gap: 6px;
}

.media-search {
  min-width: 0;
  flex: 1;
}

.media-action-button {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  color: #93c5fd;
  background: #13243a;
  border: 1px solid #2d4665;
  border-radius: 7px;
}

.media-action-button:hover {
  background: #193253;
  border-color: #4b83c5;
}

.action-banner {
  margin-top: 8px;
  color: #bbf7d0;
  background: rgb(20 83 45 / 25%);
}

.media-grid {
  display: grid;
  min-height: 0;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 7px;
  margin-top: 10px;
  overflow-y: auto;
}

.media-card {
  min-width: 0;
  padding: 5px;
  color: #b9c5d4;
  background: #0d1621;
  border: 1px solid #26364b;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
}

.media-card:hover,
.media-card--active {
  background: #12243a;
  border-color: #3b82f6;
}

.media-thumbnail {
  position: relative;
  display: grid;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #05080d;
  border-radius: 5px;
  place-items: center;
}

.media-thumbnail img,
.media-thumbnail video,
.media-preview img,
.media-preview video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-mark {
  position: absolute;
  color: rgb(255 255 255 / 75%);
  font-size: 30px;
}

.media-name {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-label {
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 9px;
  color: #8492a6;
  font-size: 10px;
}

.panel-label span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-preview {
  display: flex;
  min-height: 180px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  color: #65748a;
  background: #05080d;
  border: 1px solid #293649;
  border-radius: 8px;
}

.preview-actions {
  justify-content: flex-end;
  margin-top: 7px;
}

.empty-state {
  display: flex;
  min-height: 180px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #66758a;
  text-align: center;
  font-size: 11px;
}
</style>
