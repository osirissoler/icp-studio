export type HumanVoiceId = 'principal' | 'second' | 'tenor' | 'baritone' | 'bass';

export type VoiceShiftComplexity = 'passthrough' | 'light' | 'moderate' | 'heavy';

export interface HumanVoiceSourceNote {
  id: string;
  noteIndex: number;
  octave: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  confidence?: number;
  cents?: number;
}

export interface HumanVoiceTargetNote {
  sourceNoteId: string;
  voiceId: HumanVoiceId;
  noteIndex: number;
  octave: number;
}

export interface HumanVoiceSegmentPlan {
  id: string;

  sourceNoteId: string;

  voiceId: HumanVoiceId;

  startedAt: number;
  endedAt: number;
  durationMs: number;

  sourceMidi: number;
  sourceFrequency: number;

  targetMidi: number;
  targetFrequency: number;

  semitoneShift: number;
  pitchRatio: number;

  sourceConfidence: number;
  sourceCents: number;

  attackProtectionMs: number;
  releaseProtectionMs: number;

  processingStartAt: number;
  processingEndAt: number;
  processingDurationMs: number;

  complexity: VoiceShiftComplexity;

  preserveTiming: true;
  preserveFormants: true;
}

export interface HumanVoiceRenderPlan {
  voiceId: HumanVoiceId;

  sourceDurationMs: number;

  segments: HumanVoiceSegmentPlan[];

  transformedSegments: number;

  passthroughSegments: number;

  maximumAbsoluteShift: number;

  averageAbsoluteShift: number;
}

const minimumSegmentDurationMs = 30;

const defaultConfidence = 1;

const maximumRecommendedShift = 12;

export function createHumanVoiceRenderPlan(
  voiceId: HumanVoiceId,
  sourceNotes: HumanVoiceSourceNote[],
  targetNotes: HumanVoiceTargetNote[],
  sourceDurationMs: number,
): HumanVoiceRenderPlan {
  const targetsBySourceId = new Map<string, HumanVoiceTargetNote>();

  for (const target of targetNotes) {
    if (target.voiceId !== voiceId) {
      continue;
    }

    targetsBySourceId.set(target.sourceNoteId, target);
  }

  const segments: HumanVoiceSegmentPlan[] = [];

  for (const source of sourceNotes) {
    const target = targetsBySourceId.get(source.id);

    if (!target) {
      continue;
    }

    const segment = createSegmentPlan(source, target, sourceDurationMs);

    if (segment) {
      segments.push(segment);
    }
  }

  segments.sort((left, right) => left.startedAt - right.startedAt);

  const shifts = segments.map((segment) => Math.abs(segment.semitoneShift));

  const transformedSegments = segments.filter(
    (segment) => segment.complexity !== 'passthrough',
  ).length;

  const passthroughSegments = segments.length - transformedSegments;

  const maximumAbsoluteShift = shifts.length > 0 ? Math.max(...shifts) : 0;

  const averageAbsoluteShift =
    shifts.length > 0 ? shifts.reduce((sum, value) => sum + value, 0) / shifts.length : 0;

  return {
    voiceId,

    sourceDurationMs: Math.max(0, sourceDurationMs),

    segments,

    transformedSegments,

    passthroughSegments,

    maximumAbsoluteShift,

    averageAbsoluteShift,
  };
}

export function createSegmentPlan(
  source: HumanVoiceSourceNote,
  target: HumanVoiceTargetNote,
  sourceDurationMs: number,
): HumanVoiceSegmentPlan | null {
  const safeSourceDuration = Math.max(0, sourceDurationMs);

  const startedAt = clamp(source.startedAt, 0, safeSourceDuration);

  const endedAt = clamp(source.endedAt, startedAt, safeSourceDuration);

  const durationMs = endedAt - startedAt;

  if (durationMs < minimumSegmentDurationMs) {
    return null;
  }

  const sourceMidi = noteToMidi(source.noteIndex, source.octave);

  const targetMidi = noteToMidi(target.noteIndex, target.octave);

  const sourceFrequency = midiToFrequency(sourceMidi);

  const targetFrequency = midiToFrequency(targetMidi);

  const semitoneShift = targetMidi - sourceMidi;

  const pitchRatio = Math.pow(2, semitoneShift / 12);

  const attackProtectionMs = calculateAttackProtection(durationMs);

  const releaseProtectionMs = calculateReleaseProtection(durationMs);

  let processingStartAt = startedAt + attackProtectionMs;

  let processingEndAt = endedAt - releaseProtectionMs;

  if (processingEndAt < processingStartAt) {
    const center = startedAt + durationMs / 2;

    processingStartAt = center;

    processingEndAt = center;
  }

  return {
    id: `${target.voiceId}-${source.id}`,

    sourceNoteId: source.id,

    voiceId: target.voiceId,

    startedAt,
    endedAt,
    durationMs,

    sourceMidi,
    sourceFrequency,

    targetMidi,
    targetFrequency,

    semitoneShift,
    pitchRatio,

    sourceConfidence: clamp(source.confidence ?? defaultConfidence, 0, 1),

    sourceCents: source.cents ?? 0,

    attackProtectionMs,

    releaseProtectionMs,

    processingStartAt,

    processingEndAt,

    processingDurationMs: Math.max(0, processingEndAt - processingStartAt),

    complexity: classifyShiftComplexity(semitoneShift),

    preserveTiming: true,

    preserveFormants: true,
  };
}

export function classifyShiftComplexity(semitoneShift: number): VoiceShiftComplexity {
  const distance = Math.abs(semitoneShift);

  if (distance < 0.35) {
    return 'passthrough';
  }

  if (distance <= 3) {
    return 'light';
  }

  if (distance <= 7) {
    return 'moderate';
  }

  return 'heavy';
}

export function isRecommendedVoiceShift(semitoneShift: number): boolean {
  return Math.abs(semitoneShift) <= maximumRecommendedShift;
}

export function noteToMidi(noteIndex: number, octave: number): number {
  const normalizedNote = normalizeNote(noteIndex);

  return (octave + 1) * 12 + normalizedNote;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function calculatePitchRatio(sourceMidi: number, targetMidi: number): number {
  return Math.pow(2, (targetMidi - sourceMidi) / 12);
}

export function calculateSemitoneShift(
  sourceNoteIndex: number,
  sourceOctave: number,
  targetNoteIndex: number,
  targetOctave: number,
): number {
  return noteToMidi(targetNoteIndex, targetOctave) - noteToMidi(sourceNoteIndex, sourceOctave);
}

function calculateAttackProtection(durationMs: number): number {
  /*
   * Las consonantes y ataques iniciales son especialmente
   * sensibles a la modificación de pitch.
   *
   * No queremos tratarlos igual que una vocal sostenida.
   */
  if (durationMs <= 90) {
    return Math.min(18, durationMs * 0.18);
  }

  if (durationMs <= 220) {
    return Math.min(28, durationMs * 0.15);
  }

  if (durationMs <= 600) {
    return Math.min(42, durationMs * 0.12);
  }

  return 48;
}

function calculateReleaseProtection(durationMs: number): number {
  /*
   * El final de una sílaba también puede contener consonantes,
   * respiración o caída natural de energía.
   */
  if (durationMs <= 90) {
    return Math.min(12, durationMs * 0.12);
  }

  if (durationMs <= 220) {
    return Math.min(22, durationMs * 0.11);
  }

  if (durationMs <= 600) {
    return Math.min(32, durationMs * 0.09);
  }

  return 36;
}

function normalizeNote(value: number): number {
  return ((value % 12) + 12) % 12;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
