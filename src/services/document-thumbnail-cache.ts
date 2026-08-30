import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import { loadPresentation, type Presentation } from 'pptx-viewer';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export type CachedPresentation = Presentation & { cleanup: () => void };

const pdfCache = new Map<string, Promise<PDFDocumentProxy>>();
const presentationCache = new Map<string, Promise<CachedPresentation>>();

async function readBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No fue posible leer el documento.');
  return response.arrayBuffer();
}

export function getCachedPdf(url: string): Promise<PDFDocumentProxy> {
  const cached = pdfCache.get(url);
  if (cached) return cached;
  const request = readBuffer(url).then(async (buffer) => getDocument({ data: buffer }).promise);
  pdfCache.set(url, request);
  return request;
}

export function getCachedPresentation(url: string): Promise<CachedPresentation> {
  const cached = presentationCache.get(url);
  if (cached) return cached;
  const request = readBuffer(url).then(async (buffer) => loadPresentation(buffer));
  presentationCache.set(url, request);
  return request;
}
