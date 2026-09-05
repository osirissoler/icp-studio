import {
  analyzeRecordedMelody,
  type RefinedPitchFrame,
  type RefinedPitchNote,
} from './pitch-refinement';

export interface VocalRegion {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  type: 'voiced' | 'unvoiced' | 'silence';
  averageRms: number;
}

export interface VocalDynamicPoint {
  timeMs: number;
  rms: number;
}

export interface VocalAttack {
  noteId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export interface VocalRelease {
  noteId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export interface VocalAnalyzedNote extends RefinedPitchNote {
  averageFrequency: number;
  averageRms: number;
  voicedStartedAt: number;
  voicedEndedAt: number;
  attackEndAt: number;
  releaseStartAt: number;
  pitchFrames: RefinedPitchFrame[];
}

export interface VocalRecordingAnalysis {
  durationMs: number;
  sampleRate: number;
  notes: VocalAnalyzedNote[];
  pitchFrames: RefinedPitchFrame[];
  voicedRegions: VocalRegion[];
  unvoicedRegions: VocalRegion[];
  silenceRegions: VocalRegion[];
  attacks: VocalAttack[];
  releases: VocalRelease[];
  dynamics: VocalDynamicPoint[];
  averageConfidence: number;
}

interface EnergyFrame {
  timeMs: number;
  rms: number;
}

const energyWindowMs = 20;
const energyHopMs = 10;

const silenceRmsFloor = 0.006;
const voicedFrameGapMs = 48;
const minimumRegionDurationMs = 24;

const maximumAttackMs = 90;
const maximumReleaseMs = 120;

/**
 * Análisis maestro de la grabación completa.
 *
 * Este archivo no genera armonías ni modifica audio.
 *
 * Su responsabilidad es describir la interpretación
 * original con el mayor detalle útil posible antes
 * de que cualquier motor vocal intente transformarla.
 */
export function analyzeVocalRecording(audioBuffer: AudioBuffer): VocalRecordingAnalysis {
  const pitchAnalysis = analyzeRecordedMelody(audioBuffer);

  const energyFrames = analyzeEnergy(audioBuffer);

  const voicedRegions = buildVoicedRegions(pitchAnalysis.frames, energyFrames);

  const silenceRegions = buildSilenceRegions(energyFrames, audioBuffer.duration * 1000);

  const unvoicedRegions = buildUnvoicedRegions(
    voicedRegions,
    silenceRegions,
    audioBuffer.duration * 1000,
    energyFrames,
  );

  const notes = pitchAnalysis.notes.map((note) =>
    enrichNote(note, pitchAnalysis.frames, energyFrames),
  );

  const attacks = notes.map((note) => ({
    noteId: note.id,
    startedAt: note.startedAt,
    endedAt: note.attackEndAt,
    durationMs: Math.max(0, note.attackEndAt - note.startedAt),
  }));

  const releases = notes.map((note) => ({
    noteId: note.id,
    startedAt: note.releaseStartAt,
    endedAt: note.endedAt,
    durationMs: Math.max(0, note.endedAt - note.releaseStartAt),
  }));

  return {
    durationMs: audioBuffer.duration * 1000,

    sampleRate: audioBuffer.sampleRate,

    notes,

    pitchFrames: pitchAnalysis.frames,

    voicedRegions,

    unvoicedRegions,

    silenceRegions,

    attacks,

    releases,

    dynamics: energyFrames.map((frame) => ({
      timeMs: frame.timeMs,
      rms: frame.rms,
    })),

    averageConfidence: calculateAverageConfidence(pitchAnalysis.frames),
  };
}

function analyzeEnergy(audioBuffer: AudioBuffer): EnergyFrame[] {
  const mono = createMonoSignal(audioBuffer);

  const sampleRate = audioBuffer.sampleRate;

  const windowSamples = Math.max(16, Math.round((energyWindowMs / 1000) * sampleRate));

  const hopSamples = Math.max(8, Math.round((energyHopMs / 1000) * sampleRate));

  const frames: EnergyFrame[] = [];

  for (let start = 0; start + windowSamples <= mono.length; start += hopSamples) {
    const frame = mono.subarray(start, start + windowSamples);

    frames.push({
      timeMs: ((start + windowSamples / 2) / sampleRate) * 1000,

      rms: calculateRms(frame),
    });
  }

  return frames;
}

function buildVoicedRegions(
  pitchFrames: RefinedPitchFrame[],
  energyFrames: EnergyFrame[],
): VocalRegion[] {
  if (!pitchFrames.length) {
    return [];
  }

  const regions: VocalRegion[] = [];

  let regionStart = pitchFrames[0]!.timeMs;

  let previousTime = regionStart;

  let regionFrames: RefinedPitchFrame[] = [pitchFrames[0]!];

  for (let index = 1; index < pitchFrames.length; index += 1) {
    const frame = pitchFrames[index];

    if (!frame) {
      continue;
    }

    const gap = frame.timeMs - previousTime;

    if (gap > voicedFrameGapMs) {
      appendRegion(regions, regionStart, previousTime, 'voiced', energyFrames);

      regionStart = frame.timeMs;

      regionFrames = [];
    }

    regionFrames.push(frame);

    previousTime = frame.timeMs;
  }

  void regionFrames;

  appendRegion(regions, regionStart, previousTime, 'voiced', energyFrames);

  return regions;
}

function buildSilenceRegions(energyFrames: EnergyFrame[], durationMs: number): VocalRegion[] {
  if (!energyFrames.length) {
    return [];
  }

  const regions: VocalRegion[] = [];

  let activeStart: number | null = null;

  let previousTime = 0;

  for (const frame of energyFrames) {
    const silent = frame.rms <= silenceRmsFloor;

    if (silent && activeStart === null) {
      activeStart = frame.timeMs;
    }

    if (!silent && activeStart !== null) {
      appendRegion(regions, activeStart, previousTime, 'silence', energyFrames);

      activeStart = null;
    }

    previousTime = frame.timeMs;
  }

  if (activeStart !== null) {
    appendRegion(
      regions,
      activeStart,
      Math.min(durationMs, previousTime + energyHopMs),
      'silence',
      energyFrames,
    );
  }

  return regions;
}

function buildUnvoicedRegions(
  voicedRegions: VocalRegion[],
  silenceRegions: VocalRegion[],
  durationMs: number,
  energyFrames: EnergyFrame[],
): VocalRegion[] {
  const boundaries = new Set<number>();

  boundaries.add(0);
  boundaries.add(durationMs);

  voicedRegions.forEach((region) => {
    boundaries.add(region.startedAt);

    boundaries.add(region.endedAt);
  });

  silenceRegions.forEach((region) => {
    boundaries.add(region.startedAt);

    boundaries.add(region.endedAt);
  });

  const ordered = Array.from(boundaries).sort((left, right) => left - right);

  const regions: VocalRegion[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const startedAt = ordered[index];

    const endedAt = ordered[index + 1];

    if (startedAt === undefined || endedAt === undefined) {
      continue;
    }

    if (endedAt - startedAt < minimumRegionDurationMs) {
      continue;
    }

    const midpoint = (startedAt + endedAt) / 2;

    const insideVoiced = voicedRegions.some(
      (region) => midpoint >= region.startedAt && midpoint <= region.endedAt,
    );

    if (insideVoiced) {
      continue;
    }

    const insideSilence = silenceRegions.some(
      (region) => midpoint >= region.startedAt && midpoint <= region.endedAt,
    );

    if (insideSilence) {
      continue;
    }

    appendRegion(regions, startedAt, endedAt, 'unvoiced', energyFrames);
  }

  return regions;
}

function enrichNote(
  note: RefinedPitchNote,
  pitchFrames: RefinedPitchFrame[],
  energyFrames: EnergyFrame[],
): VocalAnalyzedNote {
  const noteFrames = pitchFrames.filter(
    (frame) => frame.timeMs >= note.startedAt && frame.timeMs <= note.endedAt,
  );

  const averageFrequency = noteFrames.length
    ? noteFrames.reduce((sum, frame) => sum + frame.frequency, 0) / noteFrames.length
    : midiToFrequency(noteToMidi(note.noteIndex, note.octave));

  const averageRms = averageEnergyBetween(energyFrames, note.startedAt, note.endedAt);

  const voicedStartedAt = noteFrames[0]?.timeMs ?? note.startedAt;

  const voicedEndedAt = noteFrames[noteFrames.length - 1]?.timeMs ?? note.endedAt;

  const attackEndAt = calculateAttackEnd(note, energyFrames, voicedStartedAt);

  const releaseStartAt = calculateReleaseStart(note, energyFrames, voicedEndedAt);

  return {
    ...note,

    averageFrequency,

    averageRms,

    voicedStartedAt,

    voicedEndedAt,

    attackEndAt,

    releaseStartAt,

    pitchFrames: noteFrames,
  };
}

function calculateAttackEnd(
  note: RefinedPitchNote,
  energyFrames: EnergyFrame[],
  voicedStartedAt: number,
): number {
  const maximumEnd = Math.min(note.endedAt, note.startedAt + maximumAttackMs);

  const targetEnd = Math.max(note.startedAt, voicedStartedAt);

  const frames = energyFrames.filter(
    (frame) => frame.timeMs >= note.startedAt && frame.timeMs <= maximumEnd,
  );

  if (frames.length < 2) {
    return Math.min(maximumEnd, targetEnd);
  }

  const peak = Math.max(...frames.map((frame) => frame.rms));

  const stableThreshold = peak * 0.62;

  const stable = frames.find((frame) => frame.rms >= stableThreshold);

  return clamp(Math.max(targetEnd, stable?.timeMs ?? targetEnd), note.startedAt, maximumEnd);
}

function calculateReleaseStart(
  note: RefinedPitchNote,
  energyFrames: EnergyFrame[],
  voicedEndedAt: number,
): number {
  const minimumStart = Math.max(note.startedAt, note.endedAt - maximumReleaseMs);

  const frames = energyFrames.filter(
    (frame) => frame.timeMs >= minimumStart && frame.timeMs <= note.endedAt,
  );

  if (frames.length < 2) {
    return clamp(voicedEndedAt, minimumStart, note.endedAt);
  }

  const peak = Math.max(...frames.map((frame) => frame.rms));

  const releaseThreshold = peak * 0.48;

  let releaseStart = voicedEndedAt;

  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = frames[index];

    if (!frame) {
      continue;
    }

    if (frame.rms >= releaseThreshold) {
      releaseStart = frame.timeMs;

      break;
    }
  }

  return clamp(releaseStart, minimumStart, note.endedAt);
}

function appendRegion(
  regions: VocalRegion[],
  startedAt: number,
  endedAt: number,
  type: VocalRegion['type'],
  energyFrames: EnergyFrame[],
): void {
  const safeStart = Math.max(0, startedAt);

  const safeEnd = Math.max(safeStart, endedAt);

  const durationMs = safeEnd - safeStart;

  if (durationMs < minimumRegionDurationMs) {
    return;
  }

  regions.push({
    id: makeId(),

    startedAt: safeStart,

    endedAt: safeEnd,

    durationMs,

    type,

    averageRms: averageEnergyBetween(energyFrames, safeStart, safeEnd),
  });
}

function averageEnergyBetween(frames: EnergyFrame[], startedAt: number, endedAt: number): number {
  const matching = frames.filter((frame) => frame.timeMs >= startedAt && frame.timeMs <= endedAt);

  if (!matching.length) {
    return 0;
  }

  return matching.reduce((sum, frame) => sum + frame.rms, 0) / matching.length;
}

function calculateAverageConfidence(frames: RefinedPitchFrame[]): number {
  if (!frames.length) {
    return 0;
  }

  return frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length;
}

function createMonoSignal(audioBuffer: AudioBuffer): Float32Array {
  const output = new Float32Array(audioBuffer.length);

  const channels = Math.max(1, audioBuffer.numberOfChannels);

  for (let channel = 0; channel < channels; channel += 1) {
    const source = audioBuffer.getChannelData(channel);

    for (let index = 0; index < source.length; index += 1) {
      output[index] = (output[index] ?? 0) + (source[index] ?? 0) / channels;
    }
  }

  return output;
}

function calculateRms(frame: Float32Array): number {
  if (!frame.length) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < frame.length; index += 1) {
    const value = frame[index] ?? 0;

    sum += value * value;
  }

  return Math.sqrt(sum / frame.length);
}

function noteToMidi(noteIndex: number, octave: number): number {
  return (octave + 1) * 12 + noteIndex;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
