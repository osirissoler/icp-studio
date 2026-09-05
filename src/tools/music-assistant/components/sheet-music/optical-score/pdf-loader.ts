import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import type { OpticalScoreDocument, OpticalScorePage } from './optical-score-types';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TARGET_PAGE_WIDTH = 1800;

const MIN_RENDER_SCALE = 1.25;

const MAX_RENDER_SCALE = 2.4;

export async function loadOpticalScorePdf(file: File): Promise<OpticalScoreDocument> {
  const data = new Uint8Array(await file.arrayBuffer());

  const loadingTask = getDocument({
    data,
  });

  const pdf = await loadingTask.promise;

  const pages: OpticalScorePage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);

    const baseViewport = page.getViewport({
      scale: 1,
    });

    const desiredScale = TARGET_PAGE_WIDTH / Math.max(1, baseViewport.width);

    const renderScale = Math.min(MAX_RENDER_SCALE, Math.max(MIN_RENDER_SCALE, desiredScale));

    const viewport = page.getViewport({
      scale: renderScale,
    });

    const canvas = document.createElement('canvas');

    canvas.width = Math.max(1, Math.round(viewport.width));

    canvas.height = Math.max(1, Math.round(viewport.height));

    const context = canvas.getContext('2d', {
      alpha: false,
    });

    if (!context) {
      throw new Error(`No fue posible preparar la página ${pageNumber} del PDF.`);
    }

    context.fillStyle = '#ffffff';

    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    pages.push({
      id: createId(`pdf-page-${pageNumber}`),
      pageNumber,
      width: canvas.width,
      height: canvas.height,
      dataUrl: canvas.toDataURL('image/png'),
    });

    page.cleanup();
  }

  if (!pages.length) {
    throw new Error('El PDF no contiene páginas que puedan analizarse.');
  }

  return {
    id: createId('pdf-score'),
    sourceKind: 'pdf',
    sourceFileName: file.name,
    mimeType: file.type || 'application/pdf',
    pages,
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
