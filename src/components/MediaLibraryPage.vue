<template>
  <q-page>
    <ModuleWorkspace :title="moduleTitle" :description="moduleDescription" :icon="moduleIcon">
      <template #search>
        <div class="media-panel">
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
              color="primary"
              icon="add"
              class="media-action-button"
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
              color="red-4"
              icon="delete_outline"
              class="media-action-button media-action-button--danger"
              :disable="!selectedItem"
              aria-label="Eliminar elemento seleccionado"
              @click="void deleteSelectedItem()"
            >
              <q-tooltip>Eliminar seleccionado</q-tooltip>
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

            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="present_to_all"
              class="media-action-button"
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

          <div v-else-if="filteredItems.length" class="media-grid">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              role="button"
              tabindex="0"
              class="media-card"
              :class="{ 'media-card--active': selectedItem?.id === item.id }"
              @click="selectItem(item)"
              @dblclick="addMediaFromList(item)"
              @keydown.enter.prevent="selectItem(item)"
            >
              <span class="media-thumbnail">
                <img v-if="kind === 'image'" :src="item.url" :alt="item.name" />
                <video v-else-if="kind === 'video'" :src="item.url" preload="metadata" muted />
                <span v-else class="audio-thumbnail">
                  <q-icon name="audio_file" />
                </span>
                <q-icon v-if="kind === 'video'" name="play_circle" class="video-mark" />
              </span>
              <span class="media-card-footer">
                <span class="media-name">{{ item.name }}</span>
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
import type { MediaKind, MediaLibraryItem } from '../shared/media';
import { usePresentationStore } from '../stores/presentation-store';
import { showAppNotification } from '../services/app-notification';

const props = defineProps<{ kind: MediaKind }>();
const presentationStore = usePresentationStore();

const items = ref<MediaLibraryItem[]>([]);
const selectedItem = ref<MediaLibraryItem | null>(null);
const searchText = ref('');
const loading = ref(true);
const importing = ref(false);
const renameDialogOpen = ref(false);
const renameItem = ref<MediaLibraryItem | null>(null);
const renameName = ref('');
const renaming = ref(false);

const moduleTitle = computed(() => {
  if (props.kind === 'image') return 'Imágenes';
  if (props.kind === 'video') return 'Videos';
  return 'Canciones MP3';
});
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

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
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

async function deleteSelectedItem(): Promise<void> {
  const item = selectedItem.value;
  if (!item) return;

  const confirmed = window.confirm(`¿Quieres eliminar “${item.name}” de ICP Studio?`);
  if (!confirmed) return;

  try {
    const removed = await window.icpStudio?.media.remove(item.id);
    if (!removed) {
      showAppNotification('No fue posible eliminar el archivo.', 'negative', 'error_outline');
      return;
    }

    if (presentationStore.liveItem?.sourceId === item.id) {
      presentationStore.clearLive();
    }

    presentationStore.serviceItems
      .filter((serviceItem) => serviceItem.sourceId === item.id)
      .forEach((serviceItem) => presentationStore.removeFromService(serviceItem.id));

    items.value = items.value.filter((entry) => entry.id !== item.id);
    selectedItem.value = null;
    showAppNotification(`${item.name} fue eliminado.`, 'positive', 'delete_outline');
  } catch (error) {
    showAppNotification(
      error instanceof Error ? error.message : 'No fue posible eliminar el archivo.',
      'negative',
      'error_outline',
    );
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

.media-action-button--danger:not(.disabled) {
  color: #fca5a5;
}

.media-action-button:hover {
  background: #193253;
  border-color: #4b83c5;
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

.media-name {
  display: block;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
