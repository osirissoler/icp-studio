import type { OpticalScoreDocument, OpticalScorePage } from './optical-score-types';

const MAX_IMAGE_DIMENSION = 2600;

export async function loadOpticalScoreImage(file: File): Promise<OpticalScoreDocument> {
  const image = await loadImage(file);

  const normalized = normalizeImage(image);

  const page: OpticalScorePage = {
    id: createId('image-page'),
    pageNumber: 1,
    width: normalized.width,
    height: normalized.height,
    dataUrl: normalized.dataUrl,
  };

  return {
    id: createId('image-score'),
    sourceKind: 'image',
    sourceFileName: file.name,
    mimeType: file.type || detectMimeType(file.name),
    pages: [page],
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      reject(new Error('No fue posible abrir la imagen seleccionada.'));
    };

    image.src = objectUrl;
  });
}

function normalizeImage(image: HTMLImageElement): {
  width: number;
  height: number;
  dataUrl: string;
} {
  const sourceWidth = Math.max(1, image.naturalWidth || image.width);

  const sourceHeight = Math.max(1, image.naturalHeight || image.height);

  const largestDimension = Math.max(sourceWidth, sourceHeight);

  const scale = largestDimension > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestDimension : 1;

  const width = Math.max(1, Math.round(sourceWidth * scale));

  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', {
    alpha: false,
  });

  if (!context) {
    throw new Error('No fue posible preparar la imagen para análisis.');
  }

  context.fillStyle = '#ffffff';

  context.fillRect(0, 0, width, height);

  context.imageSmoothingEnabled = true;

  context.imageSmoothingQuality = 'high';

  context.drawImage(image, 0, 0, width, height);

  return {
    width,
    height,
    dataUrl: canvas.toDataURL('image/png'),
  };
}

function detectMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
