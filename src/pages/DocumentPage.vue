<template>
  <q-page>
    <ModuleWorkspace
      title="Documentos"
      description="Importa, visualiza y proyecta documentos almacenados en esta computadora."
      icon="description"
    >
      <template #search>
        <div class="documents-panel">
          <div class="documents-toolbar">
            <q-input
              v-model="searchText"
              dark
              outlined
              dense
              clearable
              placeholder="Buscar documento por nombre..."
              class="documents-search"
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>

            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="upload_file"
              :loading="importing"
              aria-label="Importar documentos"
              @click="importDocuments"
            >
              <q-tooltip>Importar PDF, Excel o PowerPoint</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              size="sm"
              color="red-4"
              icon="delete_sweep"
              :disable="selectedDocumentIds.size === 0"
              aria-label="Eliminar documentos seleccionados"
              @click="void deleteSelectedDocuments()"
            >
              <q-tooltip>Eliminar documentos seleccionados</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="playlist_add"
              :disable="!selectedItem"
              aria-label="Agregar al servicio"
              @click="void addSelectedToService()"
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
              :disable="!selectedItem"
              aria-label="Proyectar ahora"
              @click="void presentSelected()"
            >
              <q-tooltip>Agregar al servicio y proyectar ahora</q-tooltip>
            </q-btn>
          </div>

          <div v-if="importProgress" class="import-progress">
            <div>
              <span>{{ importProgress.fileName }}</span>
              <strong>{{ importProgress.percent }}%</strong>
            </div>
            <q-linear-progress
              rounded
              size="7px"
              color="primary"
              track-color="blue-grey-9"
              :value="importProgress.percent / 100"
            />
            <small>
              {{ formatBytes(importProgress.completedBytes) }} de
              {{ formatBytes(importProgress.totalBytes) }}
            </small>
          </div>

          <div v-if="loading" class="empty-state">
            <q-spinner color="primary" size="34px" />
            <span>Cargando documentos...</span>
          </div>

          <div v-else-if="filteredItems.length" class="document-list">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              role="button"
              tabindex="0"
              class="document-item"
              :class="{ 'document-item--active': selectedItem?.id === item.id }"
              @click="selectItem(item)"
              @dblclick="void addItemToService(item)"
            >
              <q-checkbox
                :model-value="selectedDocumentIds.has(item.id)"
                dense
                size="xs"
                color="primary"
                @click.stop
                @update:model-value="toggleDocumentSelection(item.id)"
              />
              <span class="document-icon" :class="`document-icon--${item.documentFormat}`">
                <q-icon :name="documentIcon(item)" />
              </span>
              <span class="document-details">
                <strong>{{ item.name }}</strong>
                <small>{{ formatLabel(item) }}</small>
              </span>
              <q-btn
                flat
                round
                dense
                size="xs"
                color="red-4"
                icon="delete_outline"
                aria-label="Eliminar documento"
                @click.stop="void deleteDocument(item)"
                @dblclick.stop
              >
                <q-tooltip>Eliminar documento</q-tooltip>
              </q-btn>
            </div>
          </div>

          <div v-else class="empty-state">
            <q-icon name="description" size="44px" />
            <strong>{{
              items.length ? 'No encontramos coincidencias' : 'No hay documentos guardados'
            }}</strong>
            <span>Importa archivos PDF, Excel o PowerPoint desde tu computadora.</span>
          </div>
        </div>
      </template>

      <template #preview>
        <div class="preview-panel">
          <div class="preview-label">
            <span>Vista del operador</span>
            <span v-if="selectedItem">{{ selectedItem.name }}</span>
          </div>

          <div class="document-preview" @wheel="handlePreviewWheel">
            <DocumentViewer
              v-if="selectedItem?.documentFormat"
              :key="selectedItem.id"
              :url="selectedItem.url"
              :format="viewerFormat(selectedItem)"
              :page-index="previewPageIndex"
              :zoom="previewZoom"
              @loaded="handleDocumentLoaded"
            />
            <div v-else class="empty-state">
              <q-icon name="preview" size="44px" />
              <span>Selecciona un documento para previsualizarlo</span>
            </div>
          </div>

          <div v-if="selectedItem" class="navigation-bar">
            <q-btn
              flat
              round
              dense
              icon="keyboard_arrow_left"
              color="primary"
              :disable="previewPageIndex <= 0"
              @click="movePreview(-1)"
            />
            <span>{{ currentPageLabel }} · {{ previewPageIndex + 1 }} de {{ pageCount }}</span>
            <q-btn
              flat
              round
              dense
              icon="keyboard_arrow_right"
              color="primary"
              :disable="previewPageIndex >= pageCount - 1"
              @click="movePreview(1)"
            />
            <q-space />
            <q-btn
              flat
              round
              dense
              size="sm"
              icon="zoom_out"
              :disable="previewZoom <= 0.5"
              @click="changePreviewZoom(-0.25)"
            >
              <q-tooltip>Alejar</q-tooltip>
            </q-btn>
            <q-btn flat dense no-caps size="sm" @click="previewZoom = 1">
              {{ Math.round(previewZoom * 100) }}%
              <q-tooltip>Ajustar página</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              size="sm"
              icon="zoom_in"
              :disable="previewZoom >= 3"
              @click="changePreviewZoom(0.25)"
            >
              <q-tooltip>Ampliar</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="present_to_all"
              @click="void presentSelected()"
            >
              <q-tooltip>Proyectar documento</q-tooltip>
            </q-btn>
          </div>
        </div>
      </template>
    </ModuleWorkspace>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import DocumentViewer from '../components/DocumentViewer.vue';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';
import { inspectDocument, type DocumentInfo } from '../services/document-reader';
import type { DocumentFormat, MediaImportProgress, MediaLibraryItem } from '../shared/media';
import { usePresentationStore } from '../stores/presentation-store';
import { showAppNotification } from '../services/app-notification';

const presentationStore = usePresentationStore();
const items = ref<MediaLibraryItem[]>([]);
const selectedItem = ref<MediaLibraryItem | null>(null);
const selectedDocumentIds = ref(new Set<string>());
const searchText = ref('');
const loading = ref(true);
const importing = ref(false);
const importProgress = ref<MediaImportProgress | null>(null);
const previewPageIndex = ref(0);
const previewZoom = ref(1);
const pageCount = ref(1);
const pageLabels = ref<string[]>([]);
const documentInfo = new Map<string, DocumentInfo>();
let unsubscribeImportProgress: (() => void) | undefined;
let progressVisibleSince = 0;
let wheelLockedUntil = 0;

const filteredItems = computed(() => {
  const term = normalize(searchText.value);
  return term ? items.value.filter((item) => normalize(item.name).includes(term)) : items.value;
});

const currentPageLabel = computed(() => pageLabels.value[previewPageIndex.value] ?? 'Página');

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function documentIcon(item: MediaLibraryItem): string {
  if (item.documentFormat === 'pdf') return 'picture_as_pdf';
  if (item.documentFormat === 'spreadsheet') return 'table_view';
  return 'slideshow';
}

function formatLabel(item: MediaLibraryItem): string {
  if (item.documentFormat === 'pdf') return 'PDF';
  if (item.documentFormat === 'spreadsheet') return 'Hoja de cálculo';
  return 'PowerPoint';
}

function viewerFormat(item: MediaLibraryItem): DocumentFormat {
  return item.renderFormat ?? item.documentFormat ?? 'pdf';
}

function handleDocumentLoaded(count: number, labels: string[]): void {
  const item = selectedItem.value;
  if (!item) return;
  pageCount.value = Math.max(1, count);
  pageLabels.value = labels;
  documentInfo.set(item.id, { pageCount: count, labels });
}

function selectItem(item: MediaLibraryItem): void {
  selectedItem.value = item;
  previewPageIndex.value = 0;
  previewZoom.value = 1;
  const cached = documentInfo.get(item.id);
  pageCount.value = Math.max(1, cached?.pageCount ?? 1);
  pageLabels.value = cached?.labels ?? [];
}

function toggleDocumentSelection(itemId: string): void {
  const nextSelection = new Set(selectedDocumentIds.value);
  if (nextSelection.has(itemId)) nextSelection.delete(itemId);
  else nextSelection.add(itemId);
  selectedDocumentIds.value = nextSelection;
}

function changePreviewZoom(amount: number): void {
  previewZoom.value = Math.min(3, Math.max(0.5, previewZoom.value + amount));
}

function movePreview(direction: -1 | 1): void {
  previewPageIndex.value = Math.min(
    pageCount.value - 1,
    Math.max(0, previewPageIndex.value + direction),
  );
}

function handlePreviewWheel(event: WheelEvent): void {
  if (!selectedItem.value || viewerFormat(selectedItem.value) === 'spreadsheet') return;
  if (viewerFormat(selectedItem.value) === 'pdf' && previewZoom.value > 1) return;
  event.preventDefault();
  const now = Date.now();
  if (now < wheelLockedUntil || Math.abs(event.deltaY) < 4) return;
  wheelLockedUntil = now + 220;
  movePreview(event.deltaY > 0 ? 1 : -1);
}

async function deleteDocument(item: MediaLibraryItem): Promise<void> {
  const confirmed = window.confirm(`¿Quieres eliminar “${item.name}” de ICP Studio?`);
  if (!confirmed) return;

  try {
    const removed = await window.icpStudio?.media.remove(item.id);
    if (!removed) {
      showAppNotification('No fue posible eliminar el documento.', 'negative', 'error_outline');
      return;
    }

    if (presentationStore.liveItem?.sourceId === item.id) {
      presentationStore.clearLive();
    }

    presentationStore.serviceItems
      .filter((serviceItem) => serviceItem.sourceId === item.id)
      .forEach((serviceItem) => {
        presentationStore.removeFromService(serviceItem.id);
      });

    items.value = items.value.filter((entry) => entry.id !== item.id);
    const nextSelection = new Set(selectedDocumentIds.value);
    nextSelection.delete(item.id);
    selectedDocumentIds.value = nextSelection;
    documentInfo.delete(item.id);
    if (selectedItem.value?.id === item.id) {
      selectedItem.value = null;
      previewPageIndex.value = 0;
      pageCount.value = 1;
      pageLabels.value = [];
    }
    showAppNotification(`${item.name} fue eliminado.`, 'positive', 'delete_outline');
  } catch (error) {
    showAppNotification(
      error instanceof Error ? error.message : 'No fue posible eliminar el documento.',
      'negative',
      'error_outline',
    );
  }
}

async function deleteSelectedDocuments(): Promise<void> {
  const selectedItems = items.value.filter((item) => selectedDocumentIds.value.has(item.id));
  if (selectedItems.length === 0) return;
  const confirmed = window.confirm(
    `¿Quieres eliminar los ${selectedItems.length} documentos seleccionados de ICP Studio?`,
  );
  if (!confirmed) return;

  let removedCount = 0;
  for (const item of selectedItems) {
    try {
      const removed = await window.icpStudio?.media.remove(item.id);
      if (!removed) continue;
      if (presentationStore.liveItem?.sourceId === item.id) presentationStore.clearLive();
      presentationStore.serviceItems
        .filter((serviceItem) => serviceItem.sourceId === item.id)
        .forEach((serviceItem) => presentationStore.removeFromService(serviceItem.id));
      items.value = items.value.filter((entry) => entry.id !== item.id);
      documentInfo.delete(item.id);
      if (selectedItem.value?.id === item.id) selectedItem.value = null;
      removedCount += 1;
    } catch {
      // Continúa con los demás archivos y reporta el resultado al finalizar.
    }
  }

  selectedDocumentIds.value = new Set();
  previewPageIndex.value = 0;
  previewZoom.value = 1;
  pageCount.value = 1;
  pageLabels.value = [];
  showAppNotification(
    removedCount === selectedItems.length
      ? `${removedCount} documentos fueron eliminados.`
      : `Se eliminaron ${removedCount} de ${selectedItems.length} documentos.`,
    removedCount === selectedItems.length ? 'positive' : 'warning',
    'delete_sweep',
  );
}

async function ensureDocumentInfo(item: MediaLibraryItem): Promise<DocumentInfo> {
  const cached = documentInfo.get(item.id);
  if (cached) return cached;
  if (!item.documentFormat) throw new Error('Formato de documento no reconocido.');
  const inspectedInfo = await inspectDocument(item.url, viewerFormat(item));
  const info =
    item.documentFormat === 'presentation' && item.renderFormat === 'pdf'
      ? {
          ...inspectedInfo,
          labels: inspectedInfo.labels.map((_, index) => `Diapositiva ${index + 1}`),
        }
      : inspectedInfo;
  documentInfo.set(item.id, info);
  return info;
}

async function addItemToService(item: MediaLibraryItem): Promise<boolean> {
  try {
    if (!item.documentFormat) return false;
    const documentFormat = viewerFormat(item);
    const info = await ensureDocumentInfo(item);
    return presentationStore.addToService({
      id: `service-document-${item.id}`,
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
        documentFormat,
        pageIndex: index,
      })),
    });
  } catch (error) {
    showAppNotification(
      error instanceof Error
        ? error.message
        : 'No fue posible preparar el documento para el servicio.',
      'negative',
      'error_outline',
    );
    return false;
  }
}

async function addSelectedToService(): Promise<void> {
  if (selectedItem.value) await addItemToService(selectedItem.value);
}

async function presentSelected(): Promise<void> {
  const item = selectedItem.value;
  if (!item) return;
  const serviceId = `service-document-${item.id}`;
  if (!presentationStore.serviceItems.some((entry) => entry.id === serviceId)) {
    await addItemToService(item);
  }
  presentationStore.activateServiceItem(serviceId);
  presentationStore.setLiveFrame(previewPageIndex.value);
}

async function importDocuments(): Promise<void> {
  importing.value = true;
  importProgress.value = null;
  try {
    const imported = (await window.icpStudio?.media.select('document')) ?? [];
    items.value = [...items.value, ...imported];
    const lastItem = imported.at(-1);
    if (lastItem) selectItem(lastItem);
    if (imported.length > 0) {
      showAppNotification(
        `${imported.length === 1 ? 'Documento importado' : 'Documentos importados'} correctamente.`,
        'positive',
        'upload_file',
      );
    }
  } catch (error) {
    showAppNotification(
      error instanceof Error ? error.message : 'No fue posible importar el documento.',
      'negative',
      'error_outline',
    );
  } finally {
    importing.value = false;
    const elapsed = progressVisibleSince > 0 ? Date.now() - progressVisibleSince : 0;
    const remainingTime = Math.max(0, 900 - elapsed);
    if (remainingTime > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remainingTime));
    }
    importProgress.value = null;
    progressVisibleSince = 0;
  }
}

onMounted(async () => {
  unsubscribeImportProgress = window.icpStudio?.media.onImportProgress((progress) => {
    if (progressVisibleSince === 0) progressVisibleSince = Date.now();
    importProgress.value = progress;
  });

  try {
    items.value = (await window.icpStudio?.media.list('document')) ?? [];
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  unsubscribeImportProgress?.();
});
</script>

<style scoped>
.documents-panel,
.preview-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.documents-toolbar,
.preview-label,
.navigation-bar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.documents-search {
  min-width: 0;
  flex: 1;
}

.document-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
  overflow-y: auto;
}

.import-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 8px;
  padding: 8px;
  color: #aebdce;
  background: #0d1928;
  border: 1px solid #29415f;
  border-radius: 7px;
  font-size: 9px;
}

.import-progress > div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.import-progress span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 7px;
  color: #b9c5d4;
  background: #0d1621;
  border: 1px solid #26364b;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
}

.document-item:hover,
.document-item--active {
  background: #12243a;
  border-color: #3b82f6;
}

.document-icon {
  display: grid;
  width: 34px;
  height: 38px;
  flex: 0 0 34px;
  background: #1d3553;
  border-radius: 5px;
  font-size: 20px;
  place-items: center;
}

.document-icon--pdf {
  color: #fca5a5;
}
.document-icon--spreadsheet {
  color: #86efac;
}
.document-icon--presentation {
  color: #fdba74;
}

.document-details {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.document-item > .q-btn {
  flex: 0 0 auto;
}

.document-details strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-details small,
.preview-label,
.navigation-bar {
  color: #8492a6;
  font-size: 9px;
}

.preview-label {
  justify-content: space-between;
  margin-bottom: 7px;
}

.document-preview {
  min-height: 180px;
  flex: 1;
  overflow: hidden;
  border: 1px solid #293649;
  border-radius: 8px;
}

.navigation-bar {
  min-height: 36px;
  margin-top: 6px;
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
  font-size: 11px;
  text-align: center;
}
</style>
