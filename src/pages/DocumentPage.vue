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
import { computed, onMounted, ref } from 'vue';
import DocumentViewer from '../components/DocumentViewer.vue';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';
import { inspectDocument, type DocumentInfo } from '../services/document-reader';
import type { MediaLibraryItem } from '../shared/media';
import { usePresentationStore } from '../stores/presentation-store';

const presentationStore = usePresentationStore();
const items = ref<MediaLibraryItem[]>([]);
const selectedItem = ref<MediaLibraryItem | null>(null);
const searchText = ref('');
const loading = ref(true);
const importing = ref(false);
const previewPageIndex = ref(0);
const pageCount = ref(1);
const pageLabels = ref<string[]>([]);
const documentInfo = new Map<string, DocumentInfo>();

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
  try {
    const imported = (await window.icpStudio?.media.select('document')) ?? [];
    items.value = [...items.value, ...imported];
    const lastItem = imported.at(-1);
    if (lastItem) selectItem(lastItem);
  } finally {
    importing.value = false;
  }
}

onMounted(async () => {
  try {
    items.value = (await window.icpStudio?.media.list('document')) ?? [];
  } finally {
    loading.value = false;
  }
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
