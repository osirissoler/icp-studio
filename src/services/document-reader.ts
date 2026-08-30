import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import { loadPresentation } from 'pptx-viewer';
import * as XLSX from 'xlsx';
import type { DocumentFormat } from '../shared/media';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface DocumentInfo {
  pageCount: number;
  labels: string[];
}

async function readBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No fue posible leer el documento local.');
  return response.arrayBuffer();
}

export async function inspectDocument(url: string, format: DocumentFormat): Promise<DocumentInfo> {
  const buffer = await readBuffer(url);

  if (format === 'pdf') {
    const document = await getDocument({ data: buffer }).promise;
    const pageCount = document.numPages;
    await document.cleanup();
    return {
      pageCount,
      labels: Array.from({ length: pageCount }, (_, index) => `Página ${index + 1}`),
    };
  }

  if (format === 'spreadsheet') {
    const workbook = XLSX.read(buffer, { type: 'array' });
    return {
      pageCount: workbook.SheetNames.length,
      labels: [...workbook.SheetNames],
    };
  }

  const presentation = await loadPresentation(buffer);
  const pageCount = presentation.slides.length;
  presentation.cleanup();
  return {
    pageCount,
    labels: Array.from({ length: pageCount }, (_, index) => `Diapositiva ${index + 1}`),
  };
}
