import {
  type HumanVoiceRenderPlan,
  type HumanVoiceSegmentPlan,
  type VoiceShiftComplexity,
} from './human-voice-engine';

import { analyzeRecordedMelody, type RefinedPitchFrame } from './pitch-refinement';

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
  pitchFrames: RefinedPitchFrame[];
}

interface DynamicPsolaRegion {
  startSample: number;
  endSample: number;
  startMs: number;
  endMs: number;
  semitoneShift: number;
  fallbackSourceFrequency: number;
}

interface PitchMark {
  sample: number;
  frequency: number;
}

const minimumFrequency = 55;
const maximumFrequency = 1400;

const minimumProcessingSamples = 96;

const minimumPeriodSamples = 10;
const maximumPeriodSamples = 900;

const minimumWindowRadiusSamples = 24;
const maximumWindowRadiusSamples = 720;

const maximumPeakSearchSamples = 110;

const boundaryBlendMs = 18;

const silenceThreshold = 0.00002;

const minimumConfidenceForProcessing = 0.2;

const minimumFrameConfidence = 0.45;

const maximumTrajectoryGapMs = 56;

/**
 * Segunda generación del renderer vocal.
 *
 * Diferencia fundamental:
 *
 * La versión anterior utilizaba una frecuencia origen fija
 * para toda una nota. Eso convertía una interpretación como:
 *
 * A3 -8c
 * A3 -3c
 * A3 +4c
 * A3 +10c
 * A3 +3c
 *
 * en un período prácticamente constante.
 *
 * Esta versión utiliza la trayectoria temporal real detectada
 * en la grabación.
 *
 * El desplazamiento de armonía se aplica sobre esa trayectoria,
 * por lo que vibrato y pequeñas variaciones naturales pueden
 * conservarse.
 */
export function renderHumanVoice(
  sourceBuffer: AudioBuffer,
  plan: HumanVoiceRenderPlan,
): HumanVoiceRenderResult {
  const outputBuffer = createCompatibleAudioBuffer(sourceBuffer);

  const analysis = analyzeRecordedMelody(sourceBuffer);

  /*
   * Principal conserva la grabación completa.
   *
   * Las voces armónicas comienzan en silencio. Después copiamos
   * únicamente las regiones correspondientes a segmentos vocales.
   *
   * Esto evita que Segunda, Tenor, Barítono y Bajo contengan
   * también una copia completa de la voz principal durante
   * silencios y zonas no pertenecientes a sus segmentos.
   */
  if (plan.voiceId === 'principal') {
    copyAudioBuffer(sourceBuffer, outputBuffer);
  }

  let processedSegments = 0;
  let skippedSegments = 0;

  for (const segment of plan.segments) {
    const segmentFrames = framesForSegment(analysis.frames, segment);

    let segmentProcessed = false;

    for (let channelIndex = 0; channelIndex < sourceBuffer.numberOfChannels; channelIndex += 1) {
      const input = sourceBuffer.getChannelData(channelIndex);

      const output = outputBuffer.getChannelData(channelIndex);

      /*
       * En las voces armónicas copiamos primero el segmento
       * original completo.
       *
       * Luego reemplazamos progresivamente su núcleo sonoro
       * por el resultado PSOLA.
       *
       * De esta manera ataques, consonantes y releases permanecen
       * naturales incluso cuando no existe F0 confiable.
       */
      if (plan.voiceId !== 'principal') {
        copySegment(input, output, sourceBuffer.sampleRate, segment.startedAt, segment.endedAt);
      }

      if (!shouldProcessSegment(segment)) {
        continue;
      }

      const wasProcessed = renderSegment({
        input,
        output,
        sampleRate: sourceBuffer.sampleRate,
        segment,
        pitchFrames: segmentFrames,
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

function framesForSegment(
  frames: RefinedPitchFrame[],
  segment: HumanVoiceSegmentPlan,
): RefinedPitchFrame[] {
  return frames.filter(
    (frame) =>
      frame.timeMs >= segment.processingStartAt - maximumTrajectoryGapMs &&
      frame.timeMs <= segment.processingEndAt + maximumTrajectoryGapMs &&
      frame.confidence >= minimumFrameConfidence &&
      frame.frequency >= minimumFrequency &&
      frame.frequency <= maximumFrequency,
  );
}

function renderSegment(context: SegmentRenderContext): boolean {
  const { input, output, sampleRate, segment, pitchFrames } = context;

  const startSample = millisecondsToSample(segment.processingStartAt, sampleRate, input.length);

  const endSample = millisecondsToSample(segment.processingEndAt, sampleRate, input.length);

  if (endSample - startSample < minimumProcessingSamples) {
    return false;
  }

  if (!hasUsableEnergy(input, startSample, endSample)) {
    return false;
  }

  const fallbackSourceFrequency = segment.sourceFrequency * Math.pow(2, segment.sourceCents / 1200);

  if (
    !Number.isFinite(fallbackSourceFrequency) ||
    fallbackSourceFrequency < minimumFrequency ||
    fallbackSourceFrequency > maximumFrequency
  ) {
    return false;
  }

  /*
   * El desplazamiento musical es constante para la nota,
   * pero se aplica sobre la trayectoria variable original.
   *
   * Ejemplo:
   *
   * original:
   * 220, 221, 223, 222 Hz
   *
   * una tercera arriba:
   * 277, 278, 281, 280 Hz
   *
   * No:
   * 277, 277, 277, 277 Hz
   */
  const semitoneShift = segment.semitoneShift;

  const region: DynamicPsolaRegion = {
    startSample,
    endSample,
    startMs: segment.processingStartAt,
    endMs: segment.processingEndAt,
    semitoneShift,
    fallbackSourceFrequency,
  };

  const processed = renderDynamicPsolaRegion(input, sampleRate, region, pitchFrames);

  if (!processed) {
    return false;
  }

  blendProcessedRegion(input, output, processed, sampleRate, region, segment.complexity);

  return true;
}

function renderDynamicPsolaRegion(
  input: Float32Array,
  sampleRate: number,
  region: DynamicPsolaRegion,
  pitchFrames: RefinedPitchFrame[],
): Float32Array | null {
  const regionLength = region.endSample - region.startSample;

  if (regionLength < minimumProcessingSamples) {
    return null;
  }

  const sourceMarks = createDynamicSourcePitchMarks(input, sampleRate, region, pitchFrames);

  if (sourceMarks.length < 3) {
    return null;
  }

  const synthesisMarks = createDynamicSynthesisMarks(sourceMarks, sampleRate, region, pitchFrames);

  if (synthesisMarks.length < 3) {
    return null;
  }

  const rendered = new Float32Array(regionLength);

  const normalization = new Float32Array(regionLength);

  for (let synthesisIndex = 0; synthesisIndex < synthesisMarks.length; synthesisIndex += 1) {
    const synthesisMark = synthesisMarks[synthesisIndex];

    if (!synthesisMark) {
      continue;
    }

    const sourceMark = findNearestSourceMarkForTime(sourceMarks, synthesisMark.sample, region);

    if (!sourceMark) {
      continue;
    }

    const sourcePeriod = clamp(
      sampleRate / sourceMark.frequency,
      minimumPeriodSamples,
      maximumPeriodSamples,
    );

    const windowRadius = calculateWindowRadius(sourcePeriod);

    overlapGrain(
      input,
      rendered,
      normalization,
      region,
      sourceMark.sample,
      synthesisMark.sample,
      windowRadius,
    );
  }

  normalizeOverlapAdd(rendered, normalization);

  fillSmallRenderHoles(rendered, normalization, input, region);

  return rendered;
}

function createDynamicSourcePitchMarks(
  input: Float32Array,
  sampleRate: number,
  region: DynamicPsolaRegion,
  frames: RefinedPitchFrame[],
): PitchMark[] {
  const marks: PitchMark[] = [];

  const firstFrequency = frequencyAtTime(frames, region.startMs, region.fallbackSourceFrequency);

  let currentPeriod = clamp(
    sampleRate / firstFrequency,
    minimumPeriodSamples,
    maximumPeriodSamples,
  );

  /*
   * Buscamos una primera marca estable cerca del comienzo
   * del núcleo vocal.
   */
  let expectedSample = region.startSample + currentPeriod * 0.5;

  let safetyCounter = 0;

  const maximumMarks =
    Math.ceil((region.endSample - region.startSample) / minimumPeriodSamples) + 16;

  while (expectedSample < region.endSample && safetyCounter < maximumMarks) {
    const timeMs = sampleToMilliseconds(expectedSample, sampleRate);

    const frequency = frequencyAtTime(frames, timeMs, region.fallbackSourceFrequency);

    currentPeriod = clamp(sampleRate / frequency, minimumPeriodSamples, maximumPeriodSamples);

    const searchRadius = Math.min(
      maximumPeakSearchSamples,
      Math.max(2, Math.round(currentPeriod * 0.24)),
    );

    const refinedSample = findPhaseConsistentPeak(
      input,
      Math.round(expectedSample),
      searchRadius,
      region.startSample,
      region.endSample,
      marks.length ? (input[marks[marks.length - 1]!.sample] ?? 0) : null,
    );

    const previous = marks[marks.length - 1];

    if (!previous || refinedSample > previous.sample + minimumPeriodSamples * 0.35) {
      marks.push({
        sample: refinedSample,
        frequency,
      });
    }

    /*
     * Importante:
     * avanzamos desde la marca refinada, no desde una
     * cuadrícula global fija.
     *
     * Así evitamos acumular error de fase.
     */
    expectedSample = refinedSample + currentPeriod;

    safetyCounter += 1;
  }

  return marks;
}

function createDynamicSynthesisMarks(
  sourceMarks: PitchMark[],
  sampleRate: number,
  region: DynamicPsolaRegion,
  frames: RefinedPitchFrame[],
): PitchMark[] {
  const marks: PitchMark[] = [];

  if (!sourceMarks.length) {
    return marks;
  }

  const shiftRatio = Math.pow(2, region.semitoneShift / 12);

  let position = Math.max(0, sourceMarks[0]!.sample - region.startSample);

  let safetyCounter = 0;

  const maximumMarks =
    Math.ceil((region.endSample - region.startSample) / minimumPeriodSamples) + 24;

  while (position < region.endSample - region.startSample && safetyCounter < maximumMarks) {
    const absoluteSample = region.startSample + position;

    const timeMs = sampleToMilliseconds(absoluteSample, sampleRate);

    const sourceFrequency = frequencyAtTime(frames, timeMs, region.fallbackSourceFrequency);

    /*
     * Conservamos el movimiento relativo de la interpretación.
     */
    const targetFrequency = clamp(sourceFrequency * shiftRatio, minimumFrequency, maximumFrequency);

    marks.push({
      sample: Math.round(position),
      frequency: targetFrequency,
    });

    const targetPeriod = clamp(
      sampleRate / targetFrequency,
      minimumPeriodSamples,
      maximumPeriodSamples,
    );

    position += targetPeriod;

    safetyCounter += 1;
  }

  return marks;
}

function frequencyAtTime(
  frames: RefinedPitchFrame[],
  timeMs: number,
  fallbackFrequency: number,
): number {
  if (!frames.length) {
    return fallbackFrequency;
  }

  let previous: RefinedPitchFrame | null = null;

  let next: RefinedPitchFrame | null = null;

  for (const frame of frames) {
    if (frame.timeMs <= timeMs) {
      previous = frame;
      continue;
    }

    next = frame;
    break;
  }

  if (previous && next) {
    const gap = next.timeMs - previous.timeMs;

    if (gap > 0 && gap <= maximumTrajectoryGapMs * 2) {
      const interpolation = clamp((timeMs - previous.timeMs) / gap, 0, 1);

      /*
       * Interpolamos en MIDI y no directamente en Hz.
       * La percepción musical del pitch es logarítmica.
       */
      const midiFloat = previous.midiFloat + (next.midiFloat - previous.midiFloat) * interpolation;

      return midiFloatToFrequency(midiFloat);
    }
  }

  const nearest = nearestPitchFrame(frames, timeMs);

  if (nearest && Math.abs(nearest.timeMs - timeMs) <= maximumTrajectoryGapMs) {
    return nearest.frequency;
  }

  return fallbackFrequency;
}

function nearestPitchFrame(frames: RefinedPitchFrame[], timeMs: number): RefinedPitchFrame | null {
  let best: RefinedPitchFrame | null = null;

  let bestDistance = Number.POSITIVE_INFINITY;

  for (const frame of frames) {
    const distance = Math.abs(frame.timeMs - timeMs);

    if (distance < bestDistance) {
      bestDistance = distance;

      best = frame;
    }
  }

  return best;
}

function findNearestSourceMarkForTime(
  sourceMarks: PitchMark[],
  synthesisLocalSample: number,
  region: DynamicPsolaRegion,
): PitchMark | null {
  if (!sourceMarks.length) {
    return null;
  }

  const targetAbsoluteSample = region.startSample + synthesisLocalSample;

  let best = sourceMarks[0] ?? null;

  let bestDistance = best ? Math.abs(best.sample - targetAbsoluteSample) : Number.POSITIVE_INFINITY;

  for (let index = 1; index < sourceMarks.length; index += 1) {
    const candidate = sourceMarks[index];

    if (!candidate) {
      continue;
    }

    const distance = Math.abs(candidate.sample - targetAbsoluteSample);

    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

function overlapGrain(
  input: Float32Array,
  rendered: Float32Array,
  normalization: Float32Array,
  region: DynamicPsolaRegion,
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

function fillSmallRenderHoles(
  rendered: Float32Array,
  normalization: Float32Array,
  input: Float32Array,
  region: DynamicPsolaRegion,
): void {
  for (let index = 0; index < rendered.length; index += 1) {
    const weight = normalization[index] ?? 0;

    if (weight > 0.000001) {
      continue;
    }

    const absoluteIndex = region.startSample + index;

    rendered[index] = input[absoluteIndex] ?? 0;
  }
}

function blendProcessedRegion(
  input: Float32Array,
  output: Float32Array,
  processed: Float32Array,
  sampleRate: number,
  region: DynamicPsolaRegion,
  complexity: VoiceShiftComplexity,
): void {
  const regionLength = region.endSample - region.startSample;

  const requestedBlendSamples = Math.round((boundaryBlendMs / 1000) * sampleRate);

  const blendSamples = Math.max(1, Math.min(requestedBlendSamples, Math.floor(regionLength * 0.2)));

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
      return 0.98;

    case 'moderate':
      return 0.93;

    case 'heavy':
      /*
       * Desplazamientos grandes son los más delicados.
       * Conservamos una fracción del original para proteger
       * articulación mientras todavía no tenemos corrección
       * espectral/formantes explícita.
       */
      return 0.82;
  }
}

function calculateWindowRadius(sourcePeriod: number): number {
  return Math.round(
    clamp(sourcePeriod * 1.05, minimumWindowRadiusSamples, maximumWindowRadiusSamples),
  );
}

function findPhaseConsistentPeak(
  input: Float32Array,
  center: number,
  radius: number,
  minimum: number,
  maximum: number,
  previousPeakValue: number | null,
): number {
  const start = clamp(center - radius, minimum, maximum - 1);

  const end = clamp(center + radius, start, maximum - 1);

  let bestIndex = clamp(center, start, end);

  let bestScore = Number.NEGATIVE_INFINITY;

  const preferredPolarity = previousPeakValue === null ? 0 : Math.sign(previousPeakValue);

  for (let index = start; index <= end; index += 1) {
    const current = input[index] ?? 0;

    const previous = input[index - 1] ?? current;

    const next = input[index + 1] ?? current;

    const isMaximum = current >= previous && current >= next;

    const isMinimum = current <= previous && current <= next;

    if (!isMaximum && !isMinimum) {
      continue;
    }

    const amplitude = Math.abs(current);

    const distance = Math.abs(index - center) / Math.max(1, radius);

    const polarity = Math.sign(current);

    const polarityBonus = preferredPolarity === 0 || polarity === preferredPolarity ? 0.12 : -0.12;

    const score = amplitude + polarityBonus - distance * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function copySegment(
  input: Float32Array,
  output: Float32Array,
  sampleRate: number,
  startedAt: number,
  endedAt: number,
): void {
  const start = millisecondsToSample(startedAt, sampleRate, input.length);

  const end = millisecondsToSample(endedAt, sampleRate, input.length);

  for (let index = start; index < end; index += 1) {
    output[index] = input[index] ?? 0;
  }
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

function sampleToMilliseconds(sample: number, sampleRate: number): number {
  return (sample / sampleRate) * 1000;
}

function midiFloatToFrequency(midiFloat: number): number {
  return 440 * Math.pow(2, (midiFloat - 69) / 12);
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
