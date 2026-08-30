<template>
  <div ref="container" class="document-viewer">
    <div v-if="loading" class="viewer-message">
      <q-spinner color="primary" size="34px" />
      <span>Preparando documento...</span>
    </div>

    <div v-else-if="errorMessage" class="viewer-message viewer-message--error">
      <q-icon name="error_outline" size="36px" />
      <span>{{ errorMessage }}</span>
    </div>

    <canvas v-show="!loading && !errorMessage && format === 'pdf'" ref="pdfCanvas" />

    <div
      v-show="!loading && !errorMessage && format === 'presentation'"
      ref="presentationContainer"
      class="presentation-container"
    ></div>

    <div v-if="!loading && !errorMessage && format === 'spreadsheet'" class="spreadsheet-container">
      <table>
        <tbody>
          <tr v-for="(row, rowIndex) in spreadsheetRows" :key="rowIndex">
            <td v-for="(cell, cellIndex) in row" :key="cellIndex">
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import { loadPresentation, renderSlideToElement, type Presentation } from 'pptx-viewer';
import * as XLSX from 'xlsx';
import type { DocumentFormat } from '../shared/media';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const props = defineProps<{
  url: string;
  format: DocumentFormat;
  pageIndex: number;
}>();

const emit = defineEmits<{
  loaded: [pageCount: number, labels: string[]];
}>();

type LoadedPresentation = Presentation & { cleanup: () => void };

const container = ref<HTMLElement | null>(null);
const pdfCanvas = ref<HTMLCanvasElement | null>(null);
const presentationContainer = ref<HTMLElement | null>(null);
const spreadsheetRows = ref<string[][]>([]);
const loading = ref(true);
const errorMessage = ref('');
let pdfDocument: PDFDocumentProxy | null = null;
let presentation: LoadedPresentation | null = null;
let workbook: XLSX.WorkBook | null = null;
let loadSequence = 0;

async function readBuffer(): Promise<ArrayBuffer> {
  const response = await fetch(props.url);
  if (!response.ok) throw new Error('No fue posible leer el documento local.');
  return response.arrayBuffer();
}

async function renderCurrentPage(): Promise<void> {
  if (props.format === 'pdf' && pdfDocument && pdfCanvas.value) {
    const safePage = Math.min(pdfDocument.numPages, Math.max(1, props.pageIndex + 1));
    const page = await pdfDocument.getPage(safePage);
    const viewport = page.getViewport({ scale: 1.5 });
    const context = pdfCanvas.value.getContext('2d');
    if (!context) return;
    pdfCanvas.value.width = viewport.width;
    pdfCanvas.value.height = viewport.height;
    await page.render({ canvas: pdfCanvas.value, canvasContext: context, viewport }).promise;
    return;
  }

  if (props.format === 'presentation' && presentation && presentationContainer.value) {
    presentationContainer.value.replaceChildren();
    const safeSlideIndex = Math.min(presentation.slides.length - 1, Math.max(0, props.pageIndex));
    renderSlideToElement(presentation, safeSlideIndex, presentationContainer.value);
    return;
  }

  if (props.format === 'spreadsheet' && workbook) {
    const sheetName = workbook.SheetNames[props.pageIndex] ?? workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    spreadsheetRows.value = sheet
      ? XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
      : [];
  }
}

async function loadDocument(): Promise<void> {
  const sequence = ++loadSequence;
  loading.value = true;
  errorMessage.value = '';
  void pdfDocument?.cleanup();
  pdfDocument = null;
  presentation?.cleanup();
  presentation = null;
  workbook = null;

  try {
    const buffer = await readBuffer();
    if (sequence !== loadSequence) return;

    if (props.format === 'pdf') {
      pdfDocument = await getDocument({ data: buffer }).promise;
      emit(
        'loaded',
        pdfDocument.numPages,
        Array.from({ length: pdfDocument.numPages }, (_, index) => `Página ${index + 1}`),
      );
    } else if (props.format === 'spreadsheet') {
      workbook = XLSX.read(buffer, { type: 'array' });
      emit('loaded', workbook.SheetNames.length, [...workbook.SheetNames]);
    } else {
      await nextTick();
      if (!presentationContainer.value) return;
      presentation = await loadPresentation(buffer);
      emit(
        'loaded',
        presentation.slides.length,
        Array.from(
          { length: presentation.slides.length },
          (_, index) => `Diapositiva ${index + 1}`,
        ),
      );
    }

    loading.value = false;
    await nextTick();
    await renderCurrentPage();
  } catch (error) {
    loading.value = false;
    errorMessage.value =
      error instanceof Error ? error.message : 'No fue posible visualizar el documento.';
  }
}

watch(
  () => [props.url, props.format],
  () => void loadDocument(),
  { immediate: true },
);
watch(
  () => props.pageIndex,
  () => void renderCurrentPage(),
);

onBeforeUnmount(() => {
  loadSequence += 1;
  void pdfDocument?.cleanup();
  presentation?.cleanup();
});
</script>

<style scoped>
.document-viewer {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #05080d;
  place-items: center;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.presentation-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.spreadsheet-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: white;
}

table {
  min-width: 100%;
  color: #18212d;
  border-collapse: collapse;
  font-size: 11px;
}

td {
  min-width: 80px;
  padding: 5px 7px;
  border: 1px solid #cbd5e1;
  text-align: left;
  white-space: nowrap;
}

tr:nth-child(even) td {
  background: #f1f5f9;
}

.viewer-message {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 9px;
  color: #8492a6;
  font-size: 11px;
}

.viewer-message--error {
  color: #fca5a5;
}
</style>
