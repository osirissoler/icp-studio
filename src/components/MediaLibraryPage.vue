<template>
  <q-page>
    <ModuleWorkspace :title="moduleTitle" :description="moduleDescription" :icon="moduleIcon">
      <template #search>
        <div class="media-panel" tabindex="0" @keydown="handleSelectionKeydown">
          <div class="media-toolbar">
            <q-input
              v-model="searchText"
              dark
              outlined
              dense
              clearable
              :placeholder="`Buscar ${kind === 'image' ? 'imagen' : kind === 'video' ? 'video' : 'canción'} por nombre...`"
              class="media-search"
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>

            <q-btn
              flat
              round
              dense
              size="sm"
              color="light-blue-4"
              icon="add"
              class="library-toolbar-button"
              :loading="importing"
              :aria-label="`Importar ${kind === 'image' ? 'imágenes' : kind === 'video' ? 'videos' : 'canciones'}`"
              @click="importMedia"
            >
              <q-tooltip>
                {{
                  kind === 'image'
                    ? 'Seleccionar imágenes'
                    : kind === 'video'
                      ? 'Seleccionar videos'
                      : 'Seleccionar canciones'
                }}
              </q-tooltip>
            </q-btn>

            <q-btn
              flat
              round
              dense
              size="sm"
              :color="selectionMode ? 'amber-4' : 'blue-grey-4'"
              icon="checklist"
              class="library-toolbar-button"
              aria-label="Seleccionar elementos"
              @click="toggleSelectionMode"
            >
              <q-tooltip>{{
                selectionMode ? 'Cancelar selección' : 'Seleccionar elementos'
              }}</q-tooltip>
            </q-btn>

            <q-btn
              flat
              round
              dense
              size="sm"
              color="green-4"
              icon="playlist_add"
              class="library-toolbar-button"
              :disable="!selectedItem"
              aria-label="Agregar al servicio"
              @click="addSelectedToService"
            >
              <q-tooltip>Agregar al servicio</q-tooltip>
            </q-btn>

            <q-btn
              flat
              round
              dense
              size="sm"
              color="deep-purple-3"
              icon="present_to_all"
              class="library-toolbar-button"
              :disable="!selectedItem"
              aria-label="Proyectar ahora"
              @click="presentSelected"
            >
              <q-tooltip>Agregar al servicio y proyectar ahora</q-tooltip>
            </q-btn>
          </div>

          <div v-if="loading" class="empty-state">
            <q-spinner color="primary" size="34px" />
            <span>Cargando biblioteca local...</span>
          </div>

          <div
            v-else-if="filteredItems.length"
            class="media-grid"
            :class="`media-grid--${libraryViewMode}`"
          >
            <div
              v-for="item in filteredItems"
              :key="item.id"
              role="button"
              tabindex="0"
              class="media-card"
              :class="{
                'media-card--active': selectedItem?.id === item.id,
                'media-card--selected': selectedItemIds.has(item.id),
              }"
              @click="handleItemClick(item, $event)"
              @dblclick="handleItemDoubleClick(item)"
              @keydown.enter.prevent="selectItem(item)"
            >
              <span class="media-thumbnail">
                <q-checkbox
                  v-if="selectionMode || selectedItemIds.size > 0"
                  :model-value="selectedItemIds.has(item.id)"
                  dense
                  size="xs"
                  color="primary"
                  class="media-selection-checkbox"
                  @click.stop
                  @update:model-value="toggleItemSelection(item)"
                />
                <img v-if="kind === 'image'" :src="item.url" :alt="item.name" />
                <video v-else-if="kind === 'video'" :src="item.url" preload="metadata" muted />
                <span v-else class="audio-thumbnail">
                  <q-icon name="audio_file" />
                </span>
                <q-icon v-if="kind === 'video'" name="play_circle" class="video-mark" />
              </span>
              <span class="media-card-footer">
                <span class="media-copy">
                  <span class="media-name">{{ item.name }}</span>
                  <small class="media-details">{{ mediaDetails(item) }}</small>
                </span>
                <q-btn
                  v-if="kind === 'image'"
                  flat
                  round
                  dense
                  size="xs"
                  icon="edit"
                  color="blue-grey-4"
                  aria-label="Cambiar nombre de la imagen"
                  @click.stop="openRenameDialog(item)"
                  @dblclick.stop
                >
                  <q-tooltip>Cambiar nombre</q-tooltip>
                </q-btn>
              </span>
            </div>
          </div>

          <div v-else class="empty-state">
            <q-icon :name="moduleIcon" size="44px" />
            <strong>
              {{ items.length ? 'No encontramos coincidencias' : emptyTitle }}
            </strong>
            <span>{{ emptyDescription }}</span>
          </div>

          <SelectionActionBar
            :count="selectedItemIds.size"
            :all-selected="allFilteredItemsSelected"
            :deleting="deletingSelection"
            @toggle-all="toggleAllItems"
            @cancel="cancelSelection"
            @delete="void deleteSelectedItems()"
          />
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
              v-else-if="selectedItem && kind === 'video'"
              :key="selectedItem.id"
              :src="selectedItem.url"
              controls
              preload="metadata"
            />
            <div v-else-if="selectedItem" class="audio-preview">
              <q-icon name="album" size="64px" />
              <strong>{{ selectedItem.name }}</strong>
              <audio :key="selectedItem.id" :src="selectedItem.url" controls preload="metadata" />
            </div>
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

    <q-dialog v-model="renameDialogOpen">
      <q-card dark class="rename-card">
        <q-card-section>
          <div class="text-subtitle1">Cambiar nombre de la imagen</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="renameName"
            dark
            outlined
            autofocus
            maxlength="200"
            label="Nombre"
            @keyup.enter="saveRename"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Guardar"
            :loading="renaming"
            :disable="!renameName.trim()"
            @click="saveRename"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ModuleWorkspace from './ModuleWorkspace.vue';
import SelectionActionBar from './SelectionActionBar.vue';
import type { MediaKind, MediaLibraryItem } from '../shared/media';
import { usePresentationStore } from '../stores/presentation-store';
import { useLibraryViewSettingsStore } from '../stores/library-view-settings';
import { showAppNotification } from '../services/app-notification';

const props = defineProps<{ kind: MediaKind }>();
const presentationStore = usePresentationStore();
const libraryViewSettings = useLibraryViewSettingsStore();

const items = ref<MediaLibraryItem[]>([]);
const selectedItem = ref<MediaLibraryItem | null>(null);
const selectedItemIds = ref(new Set<string>());
const selectionMode = ref(false);
const deletingSelection = ref(false);
const searchText = ref('');
const loading = ref(true);
const importing = ref(false);
const renameDialogOpen = ref(false);
const renameItem = ref<MediaLibraryItem | null>(null);
const renameName = ref('');
const renaming = ref(false);
let lastSelectionIndex: number | null = null;

const moduleTitle = computed(() => {
  if (props.kind === 'image') return 'Imágenes';
  if (props.kind === 'video') return 'Videos';
  return 'Canciones MP3';
});
const libraryViewMode = computed(() => libraryViewSettings.views[props.kind]);
const moduleIcon = computed(() => {
  if (props.kind === 'image') return 'image';
  if (props.kind === 'video') return 'movie';
  return 'audio_file';
});
const moduleDescription = computed(() => {
  if (props.kind === 'image') {
    return 'Importa, organiza y proyecta imágenes almacenadas en esta computadora.';
  }
  if (props.kind === 'video') {
    return 'Importa, previsualiza y proyecta videos almacenados en esta computadora.';
  }
  return 'Importa, organiza y reproduce canciones guardadas en esta computadora.';
});
const emptyTitle = computed(() => {
  if (props.kind === 'image') return 'No hay imágenes guardadas';
  if (props.kind === 'video') return 'No hay videos guardados';
  return 'No hay canciones guardadas';
});
const emptyDescription = computed(() => {
  if (props.kind === 'image') {
    return 'Selecciona imágenes de tu computadora para agregarlas a ICP Studio.';
  }
  if (props.kind === 'video') {
    return 'Selecciona videos de tu computadora para agregarlos a ICP Studio.';
  }
  return 'Selecciona archivos de audio para agregarlos a ICP Studio.';
});
const filteredItems = computed(() => {
  const term = normalize(searchText.value);
  return term ? items.value.filter((item) => normalize(item.name).includes(term)) : items.value;
});
const allFilteredItemsSelected = computed(
  () =>
    filteredItems.value.length > 0 &&
    filteredItems.value.every((item) => selectedItemIds.value.has(item.id)),
);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaDetails(item: MediaLibraryItem): string {
  const type =
    props.kind === 'image' ? 'Imagen' : props.kind === 'video' ? 'Video' : 'Archivo de audio';
  return `${type} · ${formatBytes(item.size)}`;
}

async function loadItems(): Promise<void> {
  loading.value = true;
  try {
    items.value = (await window.icpStudio?.media.list(props.kind)) ?? [];
  } finally {
    loading.value = false;
  }
}

async function importMedia(): Promise<void> {
  importing.value = true;
  try {
    const imported = (await window.icpStudio?.media.select(props.kind)) ?? [];
    if (imported.length === 0) return;
    items.value = [...items.value, ...imported];
    selectedItem.value = imported.at(-1) ?? null;
    showAppNotification(
      `${imported.length} ${imported.length === 1 ? 'archivo importado' : 'archivos importados'}.`,
      'positive',
      'upload_file',
    );
  } catch (error) {
    showAppNotification(
      error instanceof Error ? error.message : 'No fue posible importar el archivo.',
      'negative',
      'error_outline',
    );
  } finally {
    importing.value = false;
  }
}

function selectItem(item: MediaLibraryItem): void {
  selectedItem.value = item;
}

function toggleItemSelection(item: MediaLibraryItem): void {
  const nextSelection = new Set(selectedItemIds.value);
  if (nextSelection.has(item.id)) nextSelection.delete(item.id);
  else nextSelection.add(item.id);
  selectedItemIds.value = nextSelection;
  selectionMode.value = nextSelection.size > 0 || selectionMode.value;
  lastSelectionIndex = filteredItems.value.findIndex((entry) => entry.id === item.id);
}

function selectItemRange(item: MediaLibraryItem): void {
  const itemIndex = filteredItems.value.findIndex((entry) => entry.id === item.id);
  if (itemIndex < 0 || lastSelectionIndex === null) {
    toggleItemSelection(item);
    return;
  }

  const startIndex = Math.min(lastSelectionIndex, itemIndex);
  const endIndex = Math.max(lastSelectionIndex, itemIndex);
  const nextSelection = new Set(selectedItemIds.value);
  filteredItems.value.slice(startIndex, endIndex + 1).forEach((entry) => {
    nextSelection.add(entry.id);
  });
  selectedItemIds.value = nextSelection;
  lastSelectionIndex = itemIndex;
}

function handleItemClick(item: MediaLibraryItem, event: MouseEvent): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || selectionMode.value) {
    selectionMode.value = true;
    if (event.shiftKey) selectItemRange(item);
    else toggleItemSelection(item);
    return;
  }

  selectItem(item);
}

function handleItemDoubleClick(item: MediaLibraryItem): void {
  if (!selectionMode.value) addMediaFromList(item);
}

function toggleSelectionMode(): void {
  if (selectionMode.value) cancelSelection();
  else selectionMode.value = true;
}

function toggleAllItems(): void {
  if (allFilteredItemsSelected.value) {
    const visibleIds = new Set(filteredItems.value.map((item) => item.id));
    selectedItemIds.value = new Set(
      [...selectedItemIds.value].filter((itemId) => !visibleIds.has(itemId)),
    );
    return;
  }

  selectedItemIds.value = new Set([
    ...selectedItemIds.value,
    ...filteredItems.value.map((item) => item.id),
  ]);
  selectionMode.value = true;
}

function cancelSelection(): void {
  selectedItemIds.value = new Set();
  selectionMode.value = false;
  lastSelectionIndex = null;
}

function handleSelectionKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.matches('input, textarea, [contenteditable="true"]')) return;

  if (event.key === 'Escape') {
    cancelSelection();
    return;
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedItemIds.value.size > 0) {
    event.preventDefault();
    void deleteSelectedItems();
  }
}

async function deleteSelectedItems(): Promise<void> {
  const selectedItems = items.value.filter((item) => selectedItemIds.value.has(item.id));
  if (selectedItems.length === 0) return;

  const confirmed = window.confirm(
    selectedItems.length === 1
      ? `¿Quieres eliminar “${selectedItems[0]?.name}” de ICP Studio?`
      : `¿Quieres eliminar los ${selectedItems.length} elementos seleccionados de ICP Studio?`,
  );
  if (!confirmed) return;

  deletingSelection.value = true;
  const removedIds = new Set<string>();
  try {
    for (const item of selectedItems) {
      try {
        const removed = await window.icpStudio?.media.remove(item.id);
        if (!removed) continue;
        if (presentationStore.liveItem?.sourceId === item.id) presentationStore.clearLive();
        presentationStore.serviceItems
          .filter((serviceItem) => serviceItem.sourceId === item.id)
          .forEach((serviceItem) => presentationStore.removeFromService(serviceItem.id));
        removedIds.add(item.id);
      } catch {
        // Continúa eliminando los demás elementos seleccionados.
      }
    }

    items.value = items.value.filter((item) => !removedIds.has(item.id));
    selectedItemIds.value = new Set(
      selectedItems.filter((item) => !removedIds.has(item.id)).map((item) => item.id),
    );
    selectionMode.value = selectedItemIds.value.size > 0;
    if (selectedItem.value && removedIds.has(selectedItem.value.id)) selectedItem.value = null;

    const removedCount = removedIds.size;
    showAppNotification(
      removedCount === selectedItems.length
        ? removedCount === 1
          ? 'El elemento fue eliminado.'
          : `${removedCount} elementos fueron eliminados.`
        : `Se eliminaron ${removedCount} de ${selectedItems.length} elementos.`,
      removedCount === selectedItems.length ? 'positive' : 'warning',
      'delete_sweep',
    );
  } finally {
    deletingSelection.value = false;
  }
}

function addMediaFromList(item: MediaLibraryItem): void {
  selectItem(item);
  addItemToService(item);
}

function openRenameDialog(item: MediaLibraryItem): void {
  renameItem.value = item;
  renameName.value = item.name;
  renameDialogOpen.value = true;
}

async function saveRename(): Promise<void> {
  const item = renameItem.value;
  const name = renameName.value.trim();
  if (!item || !name) return;

  renaming.value = true;
  try {
    const updated = await window.icpStudio?.media.rename(item.id, name);
    if (!updated) {
      showAppNotification(
        'No fue posible cambiar el nombre de la imagen.',
        'negative',
        'error_outline',
      );
      return;
    }

    items.value = items.value.map((entry) => (entry.id === updated.id ? updated : entry));
    if (selectedItem.value?.id === updated.id) {
      selectedItem.value = updated;
    }

    const serviceItem = presentationStore.serviceItems.find(
      (entry) => entry.type === updated.kind && entry.sourceId === updated.id,
    );
    if (serviceItem) {
      presentationStore.updateServiceItem({
        ...serviceItem,
        title: updated.name,
        frames: serviceItem.frames.map((frame) => ({
          ...frame,
          label: updated.name,
        })),
      });
    }

    renameDialogOpen.value = false;
    showAppNotification('Nombre actualizado correctamente.', 'positive', 'edit');
  } finally {
    renaming.value = false;
  }
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
    frames: [
      {
        id: item.id,
        label: item.name,
        text: '',
        mediaType: item.kind,
        mediaUrl: item.url,
        mimeType: item.mimeType,
      },
    ],
  });
}

function addSelectedToService(): void {
  const item = selectedItem.value;
  if (!item) return;
  addItemToService(item);
}

function presentSelected(): void {
  const item = selectedItem.value;
  if (!item) return;

  const presentationId = serviceId(item);
  const alreadyInService = presentationStore.serviceItems.some(
    (serviceItem) => serviceItem.id === presentationId,
  );

  if (!alreadyInService) {
    addItemToService(item);
  }

  presentationStore.activateServiceItem(presentationId);
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
  outline: none;
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

.media-grid {
  display: grid;
  min-height: 0;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 7px;
  margin-top: 10px;
  overflow-y: auto;
}

.media-grid--list,
.media-grid--details {
  grid-template-columns: 1fr;
}

.media-grid--list .media-card,
.media-grid--details .media-card {
  display: grid;
  align-items: center;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 9px;
}

.media-grid--list .media-thumbnail,
.media-grid--details .media-thumbnail {
  width: 72px;
}

.media-grid--list .media-card-footer,
.media-grid--details .media-card-footer {
  margin-top: 0;
}

.media-grid--details .media-card {
  grid-template-columns: 96px minmax(0, 1fr);
  padding: 7px;
}

.media-grid--details .media-thumbnail {
  width: 96px;
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
.media-card--active,
.media-card--selected {
  background: #12243a;
  border-color: #3b82f6;
}

.media-card--selected {
  box-shadow: inset 0 0 0 1px #60a5fa;
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

.media-selection-checkbox {
  position: absolute;
  z-index: 2;
  top: 4px;
  left: 4px;
  padding: 2px;
  background: rgb(5 12 22 / 85%);
  border-radius: 5px;
}

.media-thumbnail img,
.media-thumbnail video,
.media-preview img,
.media-preview video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.audio-preview {
  display: flex;
  width: min(90%, 520px);
  align-items: center;
  flex-direction: column;
  gap: 12px;
  color: #c7d2e0;
}

.audio-preview audio {
  width: 100%;
}

.video-mark {
  position: absolute;
  color: rgb(255 255 255 / 75%);
  font-size: 30px;
}

.audio-thumbnail {
  display: grid;
  width: 100%;
  height: 100%;
  color: #93c5fd;
  background: radial-gradient(circle, #1d3a5f, #08111d 70%);
  font-size: 38px;
  place-items: center;
}

.media-card-footer {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
}

.media-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.media-name {
  display: block;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-details {
  display: none;
  color: #78899e;
  font-size: 9px;
}

.media-grid--list .media-details,
.media-grid--details .media-details {
  display: block;
}

.media-grid--list .media-name,
.media-grid--details .media-name {
  font-size: 11px;
}

.media-grid--details .media-name {
  font-size: 12px;
}

.rename-card {
  width: min(92vw, 430px);
  background: #111b28;
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
