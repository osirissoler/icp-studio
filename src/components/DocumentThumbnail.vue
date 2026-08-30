<template>
  <span ref="host" class="document-thumbnail">
    <canvas v-if="format !== 'spreadsheet'" ref="canvas" />
    <q-icon v-else name="table_view" size="20px" />
    <q-spinner v-if="loading" size="14px" color="blue-grey-4" />
    <q-icon v-else-if="failed" name="description" size="18px" />
  </span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { renderSlideToCanvas } from 'pptx-viewer';
import type { DocumentFormat } from '../shared/media';
import { getCachedPdf, getCachedPresentation } from '../services/document-thumbnail-cache';

const props = defineProps<{
  url: string;
  format: DocumentFormat;
  pageIndex: number;
}>();

const host = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const loading = ref(props.format !== 'spreadsheet');
const failed = ref(false);
let observer: IntersectionObserver | null = null;
let disposed = false;

async function renderThumbnail(): Promise<void> {
  if (!canvas.value || props.format === 'spreadsheet') return;

  try {
    if (props.format === 'pdf') {
      const document = await getCachedPdf(props.url);
      const pageNumber = Math.min(document.numPages, Math.max(1, props.pageIndex + 1));
      const page = await document.getPage(pageNumber);
      const original = page.getViewport({ scale: 1 });
      const scale = Math.min(88 / original.width, 50 / original.height);
      const viewport = page.getViewport({ scale });
      if (disposed || !canvas.value) return;
      canvas.value.width = Math.max(1, Math.floor(viewport.width));
      canvas.value.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.value.getContext('2d');
      if (!context) return;
      await page.render({ canvas: canvas.value, canvasContext: context, viewport }).promise;
    } else {
      const presentation = await getCachedPresentation(props.url);
      if (disposed || !canvas.value) return;
      const aspectRatio = presentation.slideSize.width / presentation.slideSize.height;
      canvas.value.width = 88;
      canvas.value.height = Math.max(1, Math.floor(88 / aspectRatio));
      await renderSlideToCanvas(presentation, props.pageIndex, canvas.value);
    }
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.format === 'spreadsheet') return;
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      void renderThumbnail();
    },
    { rootMargin: '120px' },
  );
  if (host.value) observer.observe(host.value);
});

onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
});
</script>

<style scoped>
.document-thumbnail {
  position: relative;
  display: grid;
  width: 58px;
  height: 36px;
  flex: 0 0 58px;
  overflow: hidden;
  color: #718198;
  background: #05080d;
  border: 1px solid #34465c;
  border-radius: 4px;
  place-items: center;
}

canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.q-spinner,
.q-icon {
  position: absolute;
}
</style>
