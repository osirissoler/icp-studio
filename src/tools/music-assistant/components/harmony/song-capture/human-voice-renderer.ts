import {
  type HumanVoiceRenderPlan,
  type HumanVoiceSegmentPlan,
  type VoiceShiftComplexity,
} from './human-voice-engine';

export interface HumanVoiceRenderResult {
  buffer: AudioBuffer;
  processedSegments: number;
  skippedSegments: number;
  renderedDurationMs: number;
}

interface SegmentRenderContext {
  input: Float32Array;
  output: Float32Array;
  sampleRate: number;
  segment: HumanVoiceSegmentPlan;
}

interface PsolaRenderRegion {
  startSample: number;
  endSample: number;
  sourceFrequency: number;
  targetFrequency: number;
  sourcePeriod: number;
  targetPeriod: number;
}

const minimumFrequency = 55;
const maximumFrequency = 1400;

const minimumProcessingSamples = 96;

const minimumPeriodSamples = 10;
const maximumPeriodSamples = 900;

const maximumPeakSearchSamples = 140;

const minimumWindowRadiusSamples = 24;
const maximumWindowRadiusSamples = 720;

const boundaryBlendMs = 14;

const silenceThreshold = 0.00002;

const minimumConfidenceForProcessing = 0.2;

/**
 * Renderiza una línea vocal utilizando la misma grabación
 * como fuente.
 *
 * La duración total y la posición temporal de cada segmento
 * permanecen intactas.
 *
 * El algoritmo utiliza una aproximación TD-PSOLA:
 *
 * 1. Conserva ataques y releases.
 * 2. Busca marcas periódicas dentro de la parte vocal estable.
 * 3. Extrae pequeños fragmentos centrados en esas marcas.
 * 4. Los vuelve a superponer usando el período de la nota destino.
 * 5. Normaliza la suma de ventanas.
 * 6. Mezcla suavemente los límites con la grabación original.
 *
 * Este es el primer procesador real del prototipo. No pretende
 * todavía sustituir un motor vocal profesional.
 */
export function renderHumanVoice(
  sourceBuffer: AudioBuffer,
  plan: HumanVoiceRenderPlan,
): HumanVoiceRenderResult {
  const outputBuffer = createCompatibleAudioBuffer(sourceBuffer);

  copyAudioBuffer(sourceBuffer, outputBuffer);

  let processedSegments = 0;
  let skippedSegments = 0;

  for (const segment of plan.segments) {
    if (!shouldProcessSegment(segment)) {
      skippedSegments += 1;
      continue;
    }

    let segmentProcessed = false;

    for (let channelIndex = 0; channelIndex < sourceBuffer.numberOfChannels; channelIndex += 1) {
      const input = sourceBuffer.getChannelData(channelIndex);

      const output = outputBuffer.getChannelData(channelIndex);

      const wasProcessed = renderSegment({
        input,
        output,
        sampleRate: sourceBuffer.sampleRate,
        segment,
      });

      segmentProcessed ||= wasProcessed;
    }

    if (segmentProcessed) {
      processedSegments += 1;
    } else {
      skippedSegments += 1;
    }
  }

  return {
    buffer: outputBuffer,
    processedSegments,
    skippedSegments,
    renderedDurationMs: (outputBuffer.length / outputBuffer.sampleRate) * 1000,
  };
}

function shouldProcessSegment(segment: HumanVoiceSegmentPlan): boolean {
  if (segment.complexity === 'passthrough') {
    return false;
  }

  if (segment.processingDurationMs <= 0) {
    return false;
  }

  if (segment.sourceConfidence < minimumConfidenceForProcessing) {
    return false;
  }

  if (!Number.isFinite(segment.sourceFrequency) || !Number.isFinite(segment.targetFrequency)) {
    return false;
  }

  return (
    segment.sourceFrequency >= minimumFrequency &&
    segment.sourceFrequency <= maximumFrequency &&
    segment.targetFrequency >= minimumFrequency &&
    segment.targetFrequency <= maximumFrequency
  );
}

function renderSegment(context: SegmentRenderContext): boolean {
  const { input, output, sampleRate, segment } = context;

  const startSample = millisecondsToSample(segment.processingStartAt, sampleRate, input.length);

  const endSample = millisecondsToSample(segment.processingEndAt, sampleRate, input.length);

  if (endSample - startSample < minimumProcessingSamples) {
    return false;
  }

  if (!hasUsableEnergy(input, startSample, endSample)) {
    return false;
  }

  /*
   * El detector puede suministrar cents además de la nota MIDI.
   *
   * Por tanto, para PSOLA utilizamos la frecuencia real aproximada
   * cantada y no solamente el centro teórico de la nota.
   */
  const sourceFrequency = segment.sourceFrequency * Math.pow(2, segment.sourceCents / 1200);

  const targetFrequency = segment.targetFrequency;

  const sourcePeriod = clamp(
    sampleRate / sourceFrequency,
    minimumPeriodSamples,
    maximumPeriodSamples,
  );

  const targetPeriod = clamp(
    sampleRate / targetFrequency,
    minimumPeriodSamples,
    maximumPeriodSamples,
  );

  if (!Number.isFinite(sourcePeriod) || !Number.isFinite(targetPeriod)) {
    return false;
  }

  const region: PsolaRenderRegion = {
    startSample,
    endSample,
    sourceFrequency,
    targetFrequency,
    sourcePeriod,
    targetPeriod,
  };

  const processed = renderPsolaRegion(input, sampleRate, region);

  if (!processed) {
    return false;
  }

  blendProcessedRegion(input, output, processed, sampleRate, region, segment.complexity);

  return true;
}

function renderPsolaRegion(
  input: Float32Array,
  sampleRate: number,
  region: PsolaRenderRegion,
): Float32Array | null {
  const regionLength = region.endSample - region.startSample;

  if (regionLength < minimumProcessingSamples) {
    return null;
  }

  const rendered = new Float32Array(regionLength);

  const normalization = new Float32Array(regionLength);

  const sourceMarks = createSourcePitchMarks(input, region);

  if (sourceMarks.length < 2) {
    return null;
  }

  const synthesisMarks = createTargetSynthesisMarks(region);

  if (synthesisMarks.length < 2) {
    return null;
  }

  const windowRadius = calculateWindowRadius(region.sourcePeriod);

  for (let synthesisIndex = 0; synthesisIndex < synthesisMarks.length; synthesisIndex += 1) {
    const synthesisMark = synthesisMarks[synthesisIndex]!;

    const normalizedPosition =
      synthesisMarks.length <= 1 ? 0 : synthesisIndex / (synthesisMarks.length - 1);

    const sourceMark = findMappedSourceMark(sourceMarks, normalizedPosition);

    overlapGrain(input, rendered, normalization, region, sourceMark, synthesisMark, windowRadius);
  }

  normalizeOverlapAdd(rendered, normalization);

  return rendered;
}

function createSourcePitchMarks(input: Float32Array, region: PsolaRenderRegion): number[] {
  const marks: number[] = [];

  const searchRadius = Math.min(
    maximumPeakSearchSamples,
    Math.max(2, Math.round(region.sourcePeriod * 0.32)),
  );

  let expectedPosition = region.startSample + region.sourcePeriod * 0.5;

  let safetyCounter = 0;

  const maximumMarks =
    Math.ceil(
      (region.endSample - region.startSample) / Math.max(minimumPeriodSamples, region.sourcePeriod),
    ) + 8;

  while (expectedPosition < region.endSample && safetyCounter < maximumMarks) {
    const refinedMark = findLocalPeak(
      input,
      Math.round(expectedPosition),
      searchRadius,
      region.startSample,
      region.endSample,
    );

    if (
      marks.length === 0 ||
      refinedMark > marks[marks.length - 1]! + minimumPeriodSamples * 0.35
    ) {
      marks.push(refinedMark);
    }

    expectedPosition += region.sourcePeriod;

    safetyCounter += 1;
  }

  return marks;
}

function createTargetSynthesisMarks(region: PsolaRenderRegion): number[] {
  const marks: number[] = [];

  const length = region.endSample - region.startSample;

  let position = region.targetPeriod * 0.5;

  let safetyCounter = 0;

  const maximumMarks = Math.ceil(length / Math.max(minimumPeriodSamples, region.targetPeriod)) + 8;

  while (position < length && safetyCounter < maximumMarks) {
    marks.push(Math.round(position));

    position += region.targetPeriod;

    safetyCounter += 1;
  }

  return marks;
}

function findMappedSourceMark(sourceMarks: number[], normalizedPosition: number): number {
  if (sourceMarks.length === 1) {
    return sourceMarks[0]!;
  }

  const boundedPosition = clamp(normalizedPosition, 0, 1);

  const mappedIndex = Math.round(boundedPosition * (sourceMarks.length - 1));

  return sourceMarks[clamp(mappedIndex, 0, sourceMarks.length - 1)]!;
}

function overlapGrain(
  input: Float32Array,
  rendered: Float32Array,
  normalization: Float32Array,
  region: PsolaRenderRegion,
  sourceMark: number,
  synthesisMark: number,
  windowRadius: number,
): void {
  const grainLength = windowRadius * 2 + 1;

  if (grainLength <= 1) {
    return;
  }

  for (let grainOffset = -windowRadius; grainOffset <= windowRadius; grainOffset += 1) {
    const sourceIndex = sourceMark + grainOffset;

    const targetIndex = synthesisMark + grainOffset;

    if (sourceIndex < region.startSample || sourceIndex >= region.endSample) {
      continue;
    }

    if (targetIndex < 0 || targetIndex >= rendered.length) {
      continue;
    }

    const windowPosition = (grainOffset + windowRadius) / (grainLength - 1);

    const window = hannWindow(windowPosition);

    const currentRendered = rendered[targetIndex] ?? 0;

    const currentNormalization = normalization[targetIndex] ?? 0;

    const sourceSample = input[sourceIndex] ?? 0;

    rendered[targetIndex] = currentRendered + sourceSample * window;

    normalization[targetIndex] = currentNormalization + window;
  }
}

function normalizeOverlapAdd(rendered: Float32Array, normalization: Float32Array): void {
  for (let index = 0; index < rendered.length; index += 1) {
    const weight = normalization[index] ?? 0;

    if (weight > 0.000001) {
      const currentValue = rendered[index] ?? 0;

      rendered[index] = currentValue / weight;
    }
  }
}

function blendProcessedRegion(
  input: Float32Array,
  output: Float32Array,
  processed: Float32Array,
  sampleRate: number,
  region: PsolaRenderRegion,
  complexity: VoiceShiftComplexity,
): void {
  const regionLength = region.endSample - region.startSample;

  const requestedBlendSamples = Math.round((boundaryBlendMs / 1000) * sampleRate);

  const blendSamples = Math.max(
    1,
    Math.min(requestedBlendSamples, Math.floor(regionLength * 0.18)),
  );

  /*
   * En desplazamientos extremos dejamos una pequeña porción
   * del original. Esto ayuda a conservar articulación y reduce
   * algunos artefactos metálicos de esta primera versión.
   */
  const maximumProcessedMix = processingMixForComplexity(complexity);

  for (let localIndex = 0; localIndex < regionLength; localIndex += 1) {
    const absoluteIndex = region.startSample + localIndex;

    const original = input[absoluteIndex] ?? 0;

    const transformed = processed[localIndex] ?? 0;

    let boundaryMix = 1;

    if (localIndex < blendSamples) {
      boundaryMix = localIndex / blendSamples;
    } else if (localIndex > regionLength - blendSamples) {
      boundaryMix = (regionLength - localIndex) / blendSamples;
    }

    boundaryMix = smoothStep(clamp(boundaryMix, 0, 1));

    const processedMix = boundaryMix * maximumProcessedMix;

    output[absoluteIndex] = original * (1 - processedMix) + transformed * processedMix;
  }
}

function processingMixForComplexity(complexity: VoiceShiftComplexity): number {
  switch (complexity) {
    case 'passthrough':
      return 0;

    case 'light':
      return 1;

    case 'moderate':
      return 0.96;

    case 'heavy':
      return 0.86;
  }
}

function calculateWindowRadius(sourcePeriod: number): number {
  /*
   * Un grano de aproximadamente dos períodos alrededor
   * de la marca mantiene mejor la envolvente espectral
   * que una ventana arbitraria fija.
   */
  return Math.round(
    clamp(sourcePeriod * 1.15, minimumWindowRadiusSamples, maximumWindowRadiusSamples),
  );
}

function findLocalPeak(
  input: Float32Array,
  center: number,
  radius: number,
  minimum: number,
  maximum: number,
): number {
  const start = clamp(center - radius, minimum, maximum - 1);

  const end = clamp(center + radius, start, maximum - 1);

  let bestIndex = center;

  let bestScore = -Infinity;

  for (let index = start; index <= end; index += 1) {
    const current = input[index] ?? 0;

    const previous = input[index - 1] ?? current;

    const next = input[index + 1] ?? current;

    /*
     * Preferimos extremos locales de gran amplitud.
     * Esto aproxima una marca glotal sin necesitar
     * todavía un detector GCI completo.
     */
    const isLocalMaximum = current >= previous && current >= next;

    const isLocalMinimum = current <= previous && current <= next;

    if (!isLocalMaximum && !isLocalMinimum) {
      continue;
    }

    const amplitude = Math.abs(current);

    const distancePenalty = Math.abs(index - center) / Math.max(1, radius);

    const score = amplitude - distancePenalty * 0.08;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  if (bestScore !== -Infinity) {
    return bestIndex;
  }

  /*
   * Si no encontramos un extremo claro,
   * usamos la muestra de mayor amplitud.
   */
  let strongestIndex = clamp(center, start, end);

  let strongestAmplitude = Math.abs(input[strongestIndex] ?? 0);

  for (let index = start; index <= end; index += 1) {
    const amplitude = Math.abs(input[index] ?? 0);

    if (amplitude > strongestAmplitude) {
      strongestAmplitude = amplitude;

      strongestIndex = index;
    }
  }

  return strongestIndex;
}

function hasUsableEnergy(input: Float32Array, startSample: number, endSample: number): boolean {
  const length = endSample - startSample;

  if (length <= 0) {
    return false;
  }

  const step = Math.max(1, Math.floor(length / 512));

  let sumSquares = 0;
  let samples = 0;

  for (let index = startSample; index < endSample; index += step) {
    const sample = input[index] ?? 0;

    sumSquares += sample * sample;

    samples += 1;
  }

  if (samples === 0) {
    return false;
  }

  const rms = Math.sqrt(sumSquares / samples);

  return rms >= silenceThreshold;
}

function createCompatibleAudioBuffer(source: AudioBuffer): AudioBuffer {
  return new AudioBuffer({
    length: source.length,
    numberOfChannels: source.numberOfChannels,
    sampleRate: source.sampleRate,
  });
}

function copyAudioBuffer(source: AudioBuffer, destination: AudioBuffer): void {
  const channels = Math.min(source.numberOfChannels, destination.numberOfChannels);

  for (let channel = 0; channel < channels; channel += 1) {
    destination.getChannelData(channel).set(source.getChannelData(channel));
  }
}

function millisecondsToSample(
  milliseconds: number,
  sampleRate: number,
  maximumLength: number,
): number {
  return Math.round(clamp((milliseconds / 1000) * sampleRate, 0, maximumLength));
}

function hannWindow(normalizedPosition: number): number {
  const position = clamp(normalizedPosition, 0, 1);

  return 0.5 - 0.5 * Math.cos(2 * Math.PI * position);
}

function smoothStep(value: number): number {
  const bounded = clamp(value, 0, 1);

  return bounded * bounded * (3 - 2 * bounded);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
