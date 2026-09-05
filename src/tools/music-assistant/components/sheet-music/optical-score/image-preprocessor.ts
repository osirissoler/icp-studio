import type { OpticalBinaryImage, OpticalScorePage } from './optical-score-types';

const DEFAULT_THRESHOLD = 180;

export async function preprocessScorePage(page: OpticalScorePage): Promise<OpticalBinaryImage> {
  const image = await loadImage(page.dataUrl);

  const canvas = document.createElement('canvas');

  canvas.width = page.width;
  canvas.height = page.height;

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
    alpha: false,
  });

  if (!context) {
    throw new Error(`No fue posible preparar la página ${page.pageNumber} para reconocimiento.`);
  }

  context.fillStyle = '#ffffff';

  context.fillRect(0, 0, canvas.width, canvas.height);

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const grayscale = createGrayscale(imageData);

  const threshold = calculateAdaptiveThreshold(grayscale);

  const pixels = new Uint8Array(canvas.width * canvas.height);

  for (let index = 0; index < grayscale.length; index += 1) {
    pixels[index] = (grayscale[index] ?? 255) < threshold ? 1 : 0;
  }

  return {
    width: canvas.width,
    height: canvas.height,
    pixels,
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(new Error('No fue posible abrir la página preparada.'));
    };

    image.src = dataUrl;
  });
}

function createGrayscale(imageData: ImageData): Uint8Array {
  const result = new Uint8Array(imageData.width * imageData.height);

  const data = imageData.data;

  for (
    let pixelIndex = 0, dataIndex = 0;
    pixelIndex < result.length;
    pixelIndex += 1, dataIndex += 4
  ) {
    const red = data[dataIndex] ?? 255;
    const green = data[dataIndex + 1] ?? 255;
    const blue = data[dataIndex + 2] ?? 255;

    result[pixelIndex] = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
  }

  return result;
}

function calculateAdaptiveThreshold(grayscale: Uint8Array): number {
  if (!grayscale.length) {
    return DEFAULT_THRESHOLD;
  }

  const histogram = new Uint32Array(256);

  grayscale.forEach((value) => {
    histogram[value] = (histogram[value] ?? 0) + 1;
  });

  const total = grayscale.length;

  let weightedTotal = 0;

  for (let index = 0; index < 256; index += 1) {
    weightedTotal += index * (histogram[index] ?? 0);
  }

  let backgroundWeight = 0;

  let backgroundSum = 0;

  let maximumVariance = -1;

  let selectedThreshold = DEFAULT_THRESHOLD;

  for (let threshold = 0; threshold < 256; threshold += 1) {
    const amount = histogram[threshold] ?? 0;

    backgroundWeight += amount;

    if (backgroundWeight === 0) {
      continue;
    }

    const foregroundWeight = total - backgroundWeight;

    if (foregroundWeight === 0) {
      break;
    }

    backgroundSum += threshold * amount;

    const backgroundMean = backgroundSum / backgroundWeight;

    const foregroundMean = (weightedTotal - backgroundSum) / foregroundWeight;

    const variance =
      backgroundWeight * foregroundWeight * Math.pow(backgroundMean - foregroundMean, 2);

    if (variance > maximumVariance) {
      maximumVariance = variance;

      selectedThreshold = threshold;
    }
  }

  return Math.min(215, Math.max(115, selectedThreshold));
}
