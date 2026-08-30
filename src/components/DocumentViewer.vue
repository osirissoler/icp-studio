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
    <canvas
      v-show="!loading && !errorMessage && format === 'presentation'"
      ref="presentationCanvas"
    />

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
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import { loadPresentation, renderSlideToCanvas, type Presentation } from 'pptx-viewer';
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
  zoom?: number;
}>();

const emit = defineEmits<{
  loaded: [pageCount: number, labels: string[]];
}>();

type LoadedPresentation = Presentation & { cleanup: () => void };

const container = ref<HTMLElement | null>(null);
const pdfCanvas = ref<HTMLCanvasElement | null>(null);
const presentationCanvas = ref<HTMLCanvasElement | null>(null);
const spreadsheetRows = ref<string[][]>([]);
const loading = ref(true);
const errorMessage = ref('');
let pdfDocument: PDFDocumentProxy | null = null;
let presentation: LoadedPresentation | null = null;
let workbook: XLSX.WorkBook | null = null;
let loadSequence = 0;
let renderSequence = 0;
let resizeObserver: ResizeObserver | null = null;

async function readBuffer(): Promise<ArrayBuffer> {
  const response = await fetch(props.url);
  if (!response.ok) throw new Error('No fue posible leer el documento local.');
  return response.arrayBuffer();
}

async function renderCurrentPage(): Promise<void> {
  const sequence = ++renderSequence;

  if (props.format === 'pdf' && pdfDocument && pdfCanvas.value) {
    const safePage = Math.min(pdfDocument.numPages, Math.max(1, props.pageIndex + 1));
    const page = await pdfDocument.getPage(safePage);
    const baseViewport = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(1, container.value?.clientWidth ?? baseViewport.width);
    const availableHeight = Math.max(1, container.value?.clientHeight ?? baseViewport.height);
    const fitScale = Math.min(
      availableWidth / baseViewport.width,
      availableHeight / baseViewport.height,
    );
    const zoom = Math.max(0.5, props.zoom ?? 1);
    const viewport = page.getViewport({ scale: fitScale * zoom });
    const context = pdfCanvas.value.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, pdfCanvas.value.width, pdfCanvas.value.height);
    pdfCanvas.value.width = viewport.width;
    pdfCanvas.value.height = viewport.height;
    await page.render({ canvas: pdfCanvas.value, canvasContext: context, viewport }).promise;
    if (sequence !== renderSequence) return;
    return;
  }

  if (props.format === 'presentation' && presentation && presentationCanvas.value) {
    const safeSlideIndex = Math.min(presentation.slides.length - 1, Math.max(0, props.pageIndex));
    const canvas = presentationCanvas.value;
    const availableWidth = Math.max(1, container.value?.clientWidth ?? 1280);
    const availableHeight = Math.max(1, container.value?.clientHeight ?? 720);
    const aspectRatio = presentation.slideSize.width / presentation.slideSize.height;
    let width = availableWidth;
    let height = width / aspectRatio;
    if (height > availableHeight) {
      height = availableHeight;
      width = height * aspectRatio;
    }
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = Math.max(1, Math.floor(width));
    renderCanvas.height = Math.max(1, Math.floor(height));
    await renderSlideToCanvas(presentation, safeSlideIndex, renderCanvas);
    if (sequence !== renderSequence) return;
    canvas.width = renderCanvas.width;
    canvas.height = renderCanvas.height;
    const context = canvas.getContext('2d');
    context?.clearRect(0, 0, canvas.width, canvas.height);
    context?.drawImage(renderCanvas, 0, 0);
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
watch(
  () => props.zoom,
  () => void renderCurrentPage(),
);

onMounted(() => {
  if (!container.value) return;
  resizeObserver = new ResizeObserver(() => void renderCurrentPage());
  resizeObserver.observe(container.value);
});

onBeforeUnmount(() => {
  loadSequence += 1;
  renderSequence += 1;
  resizeObserver?.disconnect();
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
  overflow: auto;
  background: #05080d;
  place-items: start;
}

canvas {
  display: block;
  max-width: none;
  max-height: none;
  flex: 0 0 auto;
  margin: auto;
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
