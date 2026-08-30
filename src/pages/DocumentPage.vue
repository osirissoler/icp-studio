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

          <q-banner
            v-if="importMessage"
            dense
            rounded
            :class="['import-message', { 'import-message--error': importFailed }]"
          >
            {{ importMessage }}
          </q-banner>

          <div v-if="loading" class="empty-state">
            <q-spinner color="primary" size="34px" />
            <span>Cargando documentos...</span>
          </div>

          <div v-else-if="filteredItems.length" class="document-list">
            <button
              v-for="item in filteredItems"
              :key="item.id"
              type="button"
              class="document-item"
              :class="{ 'document-item--active': selectedItem?.id === item.id }"
              @click="selectItem(item)"
              @dblclick="void addItemToService(item)"
            >
              <span class="document-icon" :class="`document-icon--${item.documentFormat}`">
                <q-icon :name="documentIcon(item)" />
              </span>
              <span class="document-details">
                <strong>{{ item.name }}</strong>
                <small>{{ formatLabel(item) }}</small>
              </span>
            </button>
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

          <div class="document-preview">
            <DocumentViewer
              v-if="selectedItem?.documentFormat"
              :key="selectedItem.id"
              :url="selectedItem.url"
              :format="selectedItem.documentFormat"
              :page-index="previewPageIndex"
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
import type { MediaImportProgress, MediaLibraryItem } from '../shared/media';
import { usePresentationStore } from '../stores/presentation-store';

const presentationStore = usePresentationStore();
const items = ref<MediaLibraryItem[]>([]);
const selectedItem = ref<MediaLibraryItem | null>(null);
const searchText = ref('');
const loading = ref(true);
const importing = ref(false);
const importProgress = ref<MediaImportProgress | null>(null);
const importMessage = ref('');
const importFailed = ref(false);
const previewPageIndex = ref(0);
const pageCount = ref(1);
const pageLabels = ref<string[]>([]);
const documentInfo = new Map<string, DocumentInfo>();
let unsubscribeImportProgress: (() => void) | undefined;
let messageTimer: number | undefined;

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

function showImportMessage(message: string, failed = false): void {
  if (messageTimer !== undefined) window.clearTimeout(messageTimer);
  importMessage.value = message;
  importFailed.value = failed;
  messageTimer = window.setTimeout(() => {
    importMessage.value = '';
    messageTimer = undefined;
  }, 4500);
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
  const cached = documentInfo.get(item.id);
  pageCount.value = Math.max(1, cached?.pageCount ?? 1);
  pageLabels.value = cached?.labels ?? [];
}

function movePreview(direction: -1 | 1): void {
  previewPageIndex.value = Math.min(
    pageCount.value - 1,
    Math.max(0, previewPageIndex.value + direction),
  );
}

async function ensureDocumentInfo(item: MediaLibraryItem): Promise<DocumentInfo> {
  const cached = documentInfo.get(item.id);
  if (cached) return cached;
  if (!item.documentFormat) throw new Error('Formato de documento no reconocido.');
  const info = await inspectDocument(item.url, item.documentFormat);
  documentInfo.set(item.id, info);
  return info;
}

async function addItemToService(item: MediaLibraryItem): Promise<boolean> {
  if (!item.documentFormat) return false;
  const documentFormat = item.documentFormat;
  const info = await ensureDocumentInfo(item);
  return presentationStore.addToService({
    id: `service-document-${item.id}`,
    sourceId: item.id,
    type: documentFormat === 'presentation' ? 'presentation' : 'document',
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
  importMessage.value = '';
  try {
    const imported = (await window.icpStudio?.media.select('document')) ?? [];
    items.value = [...items.value, ...imported];
    const lastItem = imported.at(-1);
    if (lastItem) selectItem(lastItem);
    if (imported.length > 0) {
      showImportMessage(
        `${imported.length === 1 ? 'Documento importado' : 'Documentos importados'} correctamente.`,
      );
    }
  } catch (error) {
    showImportMessage(
      error instanceof Error ? error.message : 'No fue posible importar el documento.',
      true,
    );
  } finally {
    importing.value = false;
    importProgress.value = null;
  }
}

onMounted(async () => {
  unsubscribeImportProgress = window.icpStudio?.media.onImportProgress((progress) => {
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
  if (messageTimer !== undefined) window.clearTimeout(messageTimer);
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

.import-message {
  margin-top: 8px;
  color: #bbf7d0;
  background: rgb(20 83 45 / 28%);
}

.import-message--error {
  color: #fecaca;
  background: rgb(127 29 29 / 30%);
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
