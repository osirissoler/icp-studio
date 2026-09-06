import type {
  ScoreDocument,
  ScoreGeneratedVoiceKind,
  ScoreGeneratedVoicePlacement,
  ScoreKeySignature,
  ScoreMeasure,
  ScoreNoteEvent,
  ScorePart,
  ScorePitch,
} from '../../shared/score';

import {
  analyzeHarmonicContexts,
  chordToneDistance,
  harmonicContextAtBeat,
  isChordTone,
  type HarmonicContext,
} from './harmonic-context-engine';

export type GeneratedVoiceKind = ScoreGeneratedVoiceKind;

export type GeneratedVoicePlacement = ScoreGeneratedVoicePlacement;

export interface GeneratedVoiceRequest {
  id: string;

  label: string;

  kind: GeneratedVoiceKind;

  placement: GeneratedVoicePlacement;

  customDiatonicOffset?: number | undefined;

  customSemitoneOffset?: number | undefined;

  minMidi?: number | undefined;

  maxMidi?: number | undefined;
}

interface GeneratedVoiceProfile {
  diatonicOffset: number;

  preferredSemitoneOffset: number;

  minMidi: number;

  maxMidi: number;

  chordToneWeight: number;

  voiceLeadingWeight: number;

  targetWeight: number;

  peerWeight: number;
}

interface VoiceGenerationState {
  previousGeneratedMidi: number | undefined;

  previousSourceMidi: number | undefined;

  previousMovement: number | undefined;
}

export function generateScoreParts(
  score: ScoreDocument,
  sourcePart: ScorePart,
  requests: GeneratedVoiceRequest[],
): ScorePart[] {
  const generated: ScorePart[] = [];

  requests.forEach((request, index) => {
    const temporaryScore: ScoreDocument = {
      ...score,

      parts: [...(score.parts ?? []), ...generated],
    };

    const contexts = analyzeHarmonicContexts(temporaryScore);

    const peers = generationPeerParts(temporaryScore, sourcePart, request);

    const part = generateScorePartWithContexts(
      temporaryScore,
      sourcePart,
      request,
      contexts,
      peers,
      index,
    );

    generated.push(part);
  });

  return generated;
}

export function generateScorePart(
  score: ScoreDocument,
  sourcePart: ScorePart,
  request: GeneratedVoiceRequest,
  requestIndex = 0,
): ScorePart {
  const contexts = analyzeHarmonicContexts(score);

  const peers = generationPeerParts(score, sourcePart, request);

  return generateScorePartWithContexts(score, sourcePart, request, contexts, peers, requestIndex);
}

function generateScorePartWithContexts(
  score: ScoreDocument,
  sourcePart: ScorePart,
  request: GeneratedVoiceRequest,
  harmonicContexts: HarmonicContext[],
  peerParts: ScorePart[],
  requestIndex: number,
): ScorePart {
  const profile = resolveProfile(request);

  const state: VoiceGenerationState = {
    previousGeneratedMidi: undefined,

    previousSourceMidi: undefined,

    previousMovement: undefined,
  };

  const measures = sourcePart.measures.map((measure) => {
    const keySignature = measure.keySignature ?? score.keySignature;

    return generateMeasure(
      measure,
      keySignature,
      request,
      profile,
      harmonicContexts,
      peerParts,
      state,
    );
  });

  return {
    id: buildGeneratedPartId(sourcePart.id, request, requestIndex),

    name: request.label,

    abbreviation: buildAbbreviation(request),

    source: 'generated',

    generatedFromPartId: sourcePart.id,

    generatedVoiceType: buildGeneratedVoiceType(request),

    generatedVoiceConfig: {
      requestId: request.id,

      label: request.label,

      kind: request.kind,

      placement: request.placement,

      customDiatonicOffset: request.customDiatonicOffset,

      customSemitoneOffset: request.customSemitoneOffset,

      minMidi: request.minMidi,

      maxMidi: request.maxMidi,
    },

    clef: {
      ...sourcePart.clef,
    },

    measures,
  };
}

function generateMeasure(
  measure: ScoreMeasure,
  keySignature: ScoreKeySignature,
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
  harmonicContexts: HarmonicContext[],
  peerParts: ScorePart[],
  state: VoiceGenerationState,
): ScoreMeasure {
  const events = measure.events.map((event) => {
    if (event.type !== 'note') {
      return {
        ...event,
      };
    }

    const context = harmonicContextAtBeat(harmonicContexts, event.absoluteBeat);

    const peerMidis = activePeerMidis(peerParts, event.absoluteBeat);

    const generatedMidi = chooseGeneratedMidi(
      event.pitch.midi,
      keySignature,
      request,
      profile,
      context,
      peerMidis,
      state,
    );

    const previousGenerated = state.previousGeneratedMidi;

    state.previousSourceMidi = event.pitch.midi;

    state.previousGeneratedMidi = generatedMidi;

    state.previousMovement =
      previousGenerated === undefined ? undefined : generatedMidi - previousGenerated;

    return generateNoteEvent(event, generatedMidi, request);
  });

  return {
    ...measure,

    timeSignature: measure.timeSignature
      ? {
          ...measure.timeSignature,
        }
      : undefined,

    keySignature: measure.keySignature
      ? {
          ...measure.keySignature,
        }
      : undefined,

    events,
  };
}

function generateNoteEvent(
  source: ScoreNoteEvent,
  midi: number,
  request: GeneratedVoiceRequest,
): ScoreNoteEvent {
  return {
    ...source,

    id: `${source.id}-${request.id}`,

    pitch: midiToPitch(midi),
  };
}

function chooseGeneratedMidi(
  sourceMidi: number,
  keySignature: ScoreKeySignature,
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
  context: HarmonicContext | null,
  peerMidis: number[],
  state: VoiceGenerationState,
): number {
  const scalePitchClasses = getScalePitchClasses(keySignature.rootNote, keySignature.scaleMode);

  const targetMidi = calculateTargetMidi(sourceMidi, scalePitchClasses, request, profile);

  const candidates = buildCandidates(scalePitchClasses, context, profile.minMidi, profile.maxMidi);

  if (!candidates.length) {
    return clamp(targetMidi, profile.minMidi, profile.maxMidi);
  }

  let bestMidi = candidates[0] ?? clamp(targetMidi, profile.minMidi, profile.maxMidi);

  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    const score = scoreCandidate(
      candidate,
      sourceMidi,
      targetMidi,
      request,
      profile,
      context,
      peerMidis,
      state,
    );

    if (score < bestScore) {
      bestScore = score;

      bestMidi = candidate;
    }
  });

  return bestMidi;
}

function calculateTargetMidi(
  sourceMidi: number,
  scalePitchClasses: number[],
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
): number {
  const sourcePitchClass = normalizeNote(sourceMidi);

  const sourceScalePosition = scalePitchClasses.indexOf(sourcePitchClass);

  let targetMidi = sourceMidi + profile.preferredSemitoneOffset;

  if (sourceScalePosition >= 0) {
    const targetScalePosition = sourceScalePosition + profile.diatonicOffset;

    const octaveShift = Math.floor(targetScalePosition / scalePitchClasses.length);

    const wrappedScalePosition = wrapIndex(targetScalePosition, scalePitchClasses.length);

    const targetPitchClass = scalePitchClasses[wrappedScalePosition] ?? normalizeNote(targetMidi);

    const sourceOctaveBase = Math.floor(sourceMidi / 12) * 12;

    targetMidi = sourceOctaveBase + targetPitchClass + octaveShift * 12;
  }

  while (request.placement === 'above' && targetMidi <= sourceMidi) {
    targetMidi += 12;
  }

  while (request.placement === 'below' && targetMidi >= sourceMidi) {
    targetMidi -= 12;
  }

  return targetMidi;
}

function scoreCandidate(
  candidate: number,
  sourceMidi: number,
  targetMidi: number,
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
  context: HarmonicContext | null,
  peerMidis: number[],
  state: VoiceGenerationState,
): number {
  let score = 0;

  score += Math.abs(candidate - targetMidi) * profile.targetWeight;

  score += placementPenalty(candidate, sourceMidi, request.placement);

  score += harmonyPenalty(candidate, sourceMidi, request, profile, context);

  score += voiceLeadingPenalty(candidate, sourceMidi, profile, state);

  score += peerVoicePenalty(candidate, request, peerMidis, profile.peerWeight);

  score += rangeEdgePenalty(candidate, profile.minMidi, profile.maxMidi);

  return score;
}

function placementPenalty(
  candidate: number,
  sourceMidi: number,
  placement: GeneratedVoicePlacement,
): number {
  if (candidate === sourceMidi) {
    return 45;
  }

  if (placement === 'above' && candidate <= sourceMidi) {
    return 38 + Math.abs(candidate - sourceMidi);
  }

  if (placement === 'below' && candidate >= sourceMidi) {
    return 38 + Math.abs(candidate - sourceMidi);
  }

  return 0;
}

function harmonyPenalty(
  candidate: number,
  sourceMidi: number,
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
  context: HarmonicContext | null,
): number {
  if (!context) {
    return 0;
  }

  let penalty = chordToneDistance(candidate, context) * profile.chordToneWeight;

  if (isChordTone(candidate, context)) {
    penalty -= 4;
  }

  const interval = Math.abs(candidate - sourceMidi);

  const intervalClass = interval % 12;

  if (intervalClass === 0) {
    penalty += 12;
  }

  if (intervalClass === 1 || intervalClass === 11) {
    penalty += 12;
  }

  if (intervalClass === 2 || intervalClass === 10) {
    penalty += 4;
  }

  if (intervalClass === 6) {
    penalty += 9;
  }

  if (
    request.kind === 'second' &&
    (intervalClass === 3 || intervalClass === 4 || intervalClass === 8 || intervalClass === 9)
  ) {
    penalty -= 4;
  }

  if (
    request.kind === 'tenor' &&
    (intervalClass === 3 || intervalClass === 4 || intervalClass === 5 || intervalClass === 7)
  ) {
    penalty -= 2;
  }

  if (request.kind === 'baritone') {
    if (
      intervalClass === 3 ||
      intervalClass === 4 ||
      intervalClass === 7 ||
      intervalClass === 8 ||
      intervalClass === 9
    ) {
      penalty -= 2;
    }
  }

  if (request.kind === 'bass') {
    const pitchClass = normalizeNote(candidate);

    if (pitchClass === context.chordRoot) {
      penalty -= 9;
    } else if (context.chordPitchClasses.includes(pitchClass)) {
      penalty -= 3;
    } else {
      penalty += 9;
    }

    if (pitchClass === context.bassPitchClass) {
      penalty -= 2;
    }
  }

  if (context.confidence < 0.5) {
    penalty *= 0.72;
  }

  return penalty;
}

function voiceLeadingPenalty(
  candidate: number,
  sourceMidi: number,
  profile: GeneratedVoiceProfile,
  state: VoiceGenerationState,
): number {
  const previousGeneratedMidi = state.previousGeneratedMidi;

  if (previousGeneratedMidi === undefined) {
    return 0;
  }

  const movement = candidate - previousGeneratedMidi;

  const movementSize = Math.abs(movement);

  let penalty = movementSize * profile.voiceLeadingWeight;

  if (movementSize === 0) {
    penalty -= 1.7;
  } else if (movementSize <= 2) {
    penalty -= 2.2;
  } else if (movementSize <= 4) {
    penalty -= 0.8;
  }

  if (movementSize > 7) {
    penalty += (movementSize - 7) * 1.6;
  }

  if (movementSize > 12) {
    penalty += 18;
  }

  if (
    state.previousMovement !== undefined &&
    Math.abs(state.previousMovement) > 7 &&
    movement !== 0 &&
    Math.sign(movement) === Math.sign(state.previousMovement)
  ) {
    penalty += 3;
  }

  if (state.previousSourceMidi !== undefined) {
    const previousInterval = Math.abs(previousGeneratedMidi - state.previousSourceMidi) % 12;

    const currentInterval = Math.abs(candidate - sourceMidi) % 12;

    const sourceMotion = sourceMidi - state.previousSourceMidi;

    const generatedMotion = candidate - previousGeneratedMidi;

    if (
      isPerfectInterval(previousInterval) &&
      isPerfectInterval(currentInterval) &&
      previousInterval === currentInterval &&
      movesInSameDirection(sourceMotion, generatedMotion)
    ) {
      penalty += 10;
    }

    if (
      sourceMotion !== 0 &&
      generatedMotion !== 0 &&
      Math.sign(sourceMotion) !== Math.sign(generatedMotion)
    ) {
      penalty -= 1.2;
    }
  }

  return penalty;
}

function peerVoicePenalty(
  candidate: number,
  request: GeneratedVoiceRequest,
  peerMidis: number[],
  weight: number,
): number {
  if (!peerMidis.length) {
    return 0;
  }

  let penalty = 0;

  peerMidis.forEach((peerMidi) => {
    const distance = Math.abs(candidate - peerMidi);

    if (distance === 0) {
      penalty += 13 * weight;

      return;
    }

    if (distance === 1) {
      penalty += 10 * weight;

      return;
    }

    if (distance === 2) {
      penalty += 4 * weight;
    }

    if (distance > 0 && distance < 3) {
      penalty += 2 * weight;
    }
  });

  if (request.kind === 'bass') {
    const lowestPeer = Math.min(...peerMidis);

    if (candidate >= lowestPeer) {
      penalty += 12 * weight;
    }
  }

  if (request.kind === 'baritone' && request.placement === 'below') {
    const lowestPeer = Math.min(...peerMidis);

    if (candidate > lowestPeer + 7) {
      penalty += 3 * weight;
    }
  }

  return penalty;
}

function rangeEdgePenalty(midi: number, minimum: number, maximum: number): number {
  const distanceFromMinimum = midi - minimum;

  const distanceFromMaximum = maximum - midi;

  const nearestEdge = Math.min(distanceFromMinimum, distanceFromMaximum);

  if (nearestEdge >= 5) {
    return 0;
  }

  return (5 - nearestEdge) * 0.55;
}

function resolveProfile(request: GeneratedVoiceRequest): GeneratedVoiceProfile {
  if (request.kind === 'second') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 2,
          preferredSemitoneOffset: 4,
          minMidi: request.minMidi ?? 55,
          maxMidi: request.maxMidi ?? 88,
          chordToneWeight: 3,
          voiceLeadingWeight: 0.78,
          targetWeight: 1,
          peerWeight: 1,
        }
      : {
          diatonicOffset: -2,
          preferredSemitoneOffset: -4,
          minMidi: request.minMidi ?? 48,
          maxMidi: request.maxMidi ?? 79,
          chordToneWeight: 3,
          voiceLeadingWeight: 0.78,
          targetWeight: 1,
          peerWeight: 1,
        };
  }

  if (request.kind === 'tenor') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 3,
          preferredSemitoneOffset: 5,
          minMidi: request.minMidi ?? 52,
          maxMidi: request.maxMidi ?? 79,
          chordToneWeight: 3.2,
          voiceLeadingWeight: 0.95,
          targetWeight: 0.82,
          peerWeight: 1.15,
        }
      : {
          diatonicOffset: -3,
          preferredSemitoneOffset: -5,
          minMidi: request.minMidi ?? 45,
          maxMidi: request.maxMidi ?? 74,
          chordToneWeight: 3.2,
          voiceLeadingWeight: 0.95,
          targetWeight: 0.82,
          peerWeight: 1.15,
        };
  }

  if (request.kind === 'baritone') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 5,
          preferredSemitoneOffset: 9,
          minMidi: request.minMidi ?? 48,
          maxMidi: request.maxMidi ?? 74,
          chordToneWeight: 3.4,
          voiceLeadingWeight: 1.05,
          targetWeight: 0.72,
          peerWeight: 1.3,
        }
      : {
          diatonicOffset: -5,
          preferredSemitoneOffset: -9,
          minMidi: request.minMidi ?? 40,
          maxMidi: request.maxMidi ?? 69,
          chordToneWeight: 3.4,
          voiceLeadingWeight: 1.05,
          targetWeight: 0.72,
          peerWeight: 1.3,
        };
  }

  if (request.kind === 'bass') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 7,
          preferredSemitoneOffset: 12,
          minMidi: request.minMidi ?? 43,
          maxMidi: request.maxMidi ?? 69,
          chordToneWeight: 4,
          voiceLeadingWeight: 1.15,
          targetWeight: 0.58,
          peerWeight: 1.6,
        }
      : {
          diatonicOffset: -7,
          preferredSemitoneOffset: -12,
          minMidi: request.minMidi ?? 32,
          maxMidi: request.maxMidi ?? 60,
          chordToneWeight: 4,
          voiceLeadingWeight: 1.15,
          targetWeight: 0.58,
          peerWeight: 1.6,
        };
  }

  const customDiatonicOffset =
    request.customDiatonicOffset ?? (request.placement === 'above' ? 2 : -2);

  const customSemitoneOffset =
    request.customSemitoneOffset ?? (request.placement === 'above' ? 4 : -4);

  return {
    diatonicOffset: customDiatonicOffset,

    preferredSemitoneOffset: customSemitoneOffset,

    minMidi: request.minMidi ?? 36,

    maxMidi: request.maxMidi ?? 88,

    chordToneWeight: 2.8,

    voiceLeadingWeight: 0.9,

    targetWeight: 1,

    peerWeight: 1,
  };
}

function generationPeerParts(
  score: ScoreDocument,
  sourcePart: ScorePart,
  request: GeneratedVoiceRequest,
): ScorePart[] {
  return (score.parts ?? []).filter((part) => {
    if (part.id === sourcePart.id) {
      return false;
    }

    if (
      part.source === 'generated' &&
      part.generatedFromPartId === sourcePart.id &&
      part.generatedVoiceConfig?.requestId === request.id
    ) {
      return false;
    }

    return true;
  });
}

function activePeerMidis(parts: ScorePart[], absoluteBeat: number): number[] {
  const result: number[] = [];

  parts.forEach((part) => {
    part.measures.forEach((measure) => {
      measure.events.forEach((event) => {
        if (event.type !== 'note') {
          return;
        }

        if (
          event.absoluteBeat <= absoluteBeat + 0.0001 &&
          event.absoluteBeat + event.durationBeats > absoluteBeat + 0.0001
        ) {
          result.push(event.pitch.midi);
        }
      });
    });
  });

  return result;
}

function buildCandidates(
  scalePitchClasses: number[],
  context: HarmonicContext | null,
  minimum: number,
  maximum: number,
): number[] {
  const allowedPitchClasses = new Set<number>(scalePitchClasses);

  context?.chordPitchClasses.forEach((pitchClass) => {
    allowedPitchClasses.add(pitchClass);
  });

  const candidates: number[] = [];

  for (let midi = minimum; midi <= maximum; midi += 1) {
    if (allowedPitchClasses.has(normalizeNote(midi))) {
      candidates.push(midi);
    }
  }

  return candidates;
}

function getScalePitchClasses(rootNote: number, mode: 'major' | 'minor'): number[] {
  const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];

  return intervals.map((interval) => normalizeNote(rootNote + interval));
}

function midiToPitch(midi: number): ScorePitch {
  return {
    noteIndex: normalizeNote(midi),

    octave: Math.floor(midi / 12) - 1,

    midi,
  };
}

function buildGeneratedPartId(
  sourcePartId: string,
  request: GeneratedVoiceRequest,
  requestIndex: number,
): string {
  const safeRequestId =
    request.id
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-') || `voice-${requestIndex + 1}`;

  return `generated-${sourcePartId}-${safeRequestId}`;
}

function buildGeneratedVoiceType(request: GeneratedVoiceRequest): string {
  return `${request.kind}:${request.placement}`;
}

function buildAbbreviation(request: GeneratedVoiceRequest): string {
  if (request.kind === 'second') {
    return request.placement === 'above' ? '2ª↑' : '2ª↓';
  }

  if (request.kind === 'tenor') {
    return request.placement === 'above' ? 'T↑' : 'T↓';
  }

  if (request.kind === 'baritone') {
    return request.placement === 'above' ? 'Brt↑' : 'Brt↓';
  }

  if (request.kind === 'bass') {
    return request.placement === 'above' ? 'B↑' : 'B↓';
  }

  return 'V';
}

function isPerfectInterval(intervalClass: number): boolean {
  return intervalClass === 0 || intervalClass === 7;
}

function movesInSameDirection(leftMovement: number, rightMovement: number): boolean {
  if (leftMovement === 0 || rightMovement === 0) {
    return false;
  }

  return Math.sign(leftMovement) === Math.sign(rightMovement);
}

function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

function wrapIndex(value: number, length: number): number {
  return ((value % length) + length) % length;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
import type {
  ScoreDocument,
  ScoreGeneratedVoiceKind,
  ScoreGeneratedVoicePlacement,
  ScoreKeySignature,
  ScoreMeasure,
  ScoreNoteEvent,
  ScorePart,
  ScorePitch,
} from '../../shared/score';

import {
  analyzeHarmonicContexts,
  chordToneDistance,
  harmonicContextAtBeat,
  isChordTone,
  type HarmonicContext,
} from './harmonic-context-engine';

export type GeneratedVoiceKind = ScoreGeneratedVoiceKind;

export type GeneratedVoicePlacement = ScoreGeneratedVoicePlacement;

export interface GeneratedVoiceRequest {
  id: string;

  label: string;

  kind: GeneratedVoiceKind;

  placement: GeneratedVoicePlacement;

  customDiatonicOffset?: number | undefined;

  customSemitoneOffset?: number | undefined;

  minMidi?: number | undefined;

  maxMidi?: number | undefined;
}

interface GeneratedVoiceProfile {
  diatonicOffset: number;

  preferredSemitoneOffset: number;

  minMidi: number;

  maxMidi: number;

  chordToneWeight: number;

  voiceLeadingWeight: number;

  targetWeight: number;

  peerWeight: number;

  spacingWeight: number;

  chordCoverageWeight: number;
}

interface VoiceGenerationState {
  previousGeneratedMidi: number | undefined;

  previousSourceMidi: number | undefined;

  previousMovement: number | undefined;
}

interface EnsembleNoteReference {
  part: ScorePart;

  event: ScoreNoteEvent;

  request: GeneratedVoiceRequest;

  profile: GeneratedVoiceProfile;

  previous: ScoreNoteEvent | null;

  next: ScoreNoteEvent | null;
}

const EPSILON = 0.0001;

const ENSEMBLE_PASSES = 3;

export function generateScoreParts(
  score: ScoreDocument,
  sourcePart: ScorePart,
  requests: GeneratedVoiceRequest[],
): ScorePart[] {
  if (!requests.length) {
    return [];
  }

  const contexts = analyzeHarmonicContexts(score);

  const generated: ScorePart[] = [];

  requests.forEach((request, index) => {
    const temporaryScore: ScoreDocument = {
      ...score,

      parts: [...(score.parts ?? []), ...generated],
    };

    const peers = generationPeerParts(temporaryScore, sourcePart, request);

    const part = generateScorePartWithContexts(score, sourcePart, request, contexts, peers, index);

    generated.push(part);
  });

  return optimizeGeneratedEnsemble(score, sourcePart, generated, requests, contexts);
}

export function generateScorePart(
  score: ScoreDocument,
  sourcePart: ScorePart,
  request: GeneratedVoiceRequest,
  requestIndex = 0,
): ScorePart {
  const contexts = analyzeHarmonicContexts(score);

  const peers = generationPeerParts(score, sourcePart, request);

  return generateScorePartWithContexts(score, sourcePart, request, contexts, peers, requestIndex);
}

function generateScorePartWithContexts(
  score: ScoreDocument,
  sourcePart: ScorePart,
  request: GeneratedVoiceRequest,
  harmonicContexts: HarmonicContext[],
  peerParts: ScorePart[],
  requestIndex: number,
): ScorePart {
  const profile = resolveProfile(request);

  const state: VoiceGenerationState = {
    previousGeneratedMidi: undefined,

    previousSourceMidi: undefined,

    previousMovement: undefined,
  };

  const measures = sourcePart.measures.map((measure) => {
    const keySignature = measure.keySignature ?? score.keySignature;

    return generateMeasure(
      measure,
      keySignature,
      request,
      profile,
      harmonicContexts,
      peerParts,
      state,
    );
  });

  return {
    id: buildGeneratedPartId(sourcePart.id, request, requestIndex),

    name: request.label,

    abbreviation: buildAbbreviation(request),

    source: 'generated',

    generatedFromPartId: sourcePart.id,

    generatedVoiceType: buildGeneratedVoiceType(request),

    generatedVoiceConfig: {
      requestId: request.id,

      label: request.label,

      kind: request.kind,

      placement: request.placement,

      customDiatonicOffset: request.customDiatonicOffset,

      customSemitoneOffset: request.customSemitoneOffset,

      minMidi: request.minMidi,

      maxMidi: request.maxMidi,
    },

    clef: {
      ...sourcePart.clef,
    },

    measures,
  };
}

function generateMeasure(
  measure: ScoreMeasure,
  keySignature: ScoreKeySignature,
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
  harmonicContexts: HarmonicContext[],
  peerParts: ScorePart[],
  state: VoiceGenerationState,
): ScoreMeasure {
  const events = measure.events.map((event) => {
    if (event.type !== 'note') {
      return {
        ...event,
      };
    }

    const context = harmonicContextAtBeat(harmonicContexts, event.absoluteBeat);

    const peerMidis = activePeerMidis(peerParts, event.absoluteBeat);

    const generatedMidi = chooseGeneratedMidi(
      event.pitch.midi,
      keySignature,
      request,
      profile,
      context,
      peerMidis,
      state,
    );

    const previousGenerated = state.previousGeneratedMidi;

    state.previousSourceMidi = event.pitch.midi;

    state.previousGeneratedMidi = generatedMidi;

    state.previousMovement =
      previousGenerated === undefined ? undefined : generatedMidi - previousGenerated;

    return generateNoteEvent(event, generatedMidi, request);
  });

  return {
    ...measure,

    timeSignature: measure.timeSignature
      ? {
          ...measure.timeSignature,
        }
      : undefined,

    keySignature: measure.keySignature
      ? {
          ...measure.keySignature,
        }
      : undefined,

    events,
  };
}

function generateNoteEvent(
  source: ScoreNoteEvent,
  midi: number,
  request: GeneratedVoiceRequest,
): ScoreNoteEvent {
  return {
    ...source,

    id: `${source.id}-${request.id}`,

    pitch: midiToPitch(midi),
  };
}

function chooseGeneratedMidi(
  sourceMidi: number,
  keySignature: ScoreKeySignature,
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
  context: HarmonicContext | null,
  peerMidis: number[],
  state: VoiceGenerationState,
): number {
  const scalePitchClasses = getScalePitchClasses(keySignature.rootNote, keySignature.scaleMode);

  const targetMidi = calculateTargetMidi(sourceMidi, scalePitchClasses, request, profile);

  const candidates = buildCandidates(scalePitchClasses, context, profile.minMidi, profile.maxMidi);

  if (!candidates.length) {
    return clamp(targetMidi, profile.minMidi, profile.maxMidi);
  }

  let bestMidi = candidates[0] ?? clamp(targetMidi, profile.minMidi, profile.maxMidi);

  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    const score = scoreCandidate(
      candidate,
      sourceMidi,
      targetMidi,
      request,
      profile,
      context,
      peerMidis,
      state,
    );

    if (score < bestScore) {
      bestScore = score;

      bestMidi = candidate;
    }
  });

  return bestMidi;
}

function optimizeGeneratedEnsemble(
  score: ScoreDocument,
  sourcePart: ScorePart,
  generatedParts: ScorePart[],
  requests: GeneratedVoiceRequest[],
  contexts: HarmonicContext[],
): ScorePart[] {
  const working = generatedParts.map(cloneGeneratedPart);

  if (working.length < 2) {
    return working;
  }

  for (let pass = 0; pass < ENSEMBLE_PASSES; pass += 1) {
    working.forEach((part) => {
      const request = requestForPart(part, requests);

      if (!request) {
        return;
      }

      const profile = resolveProfile(request);

      const notes = partNoteEvents(part);

      notes.forEach((event, index) => {
        const reference: EnsembleNoteReference = {
          part,

          event,

          request,

          profile,

          previous: notes[index - 1] ?? null,

          next: notes[index + 1] ?? null,
        };

        optimizeEnsembleNote(score, sourcePart, working, reference, contexts);
      });
    });
  }

  return working;
}

function optimizeEnsembleNote(
  score: ScoreDocument,
  sourcePart: ScorePart,
  generatedParts: ScorePart[],
  reference: EnsembleNoteReference,
  contexts: HarmonicContext[],
): void {
  const { part, event, request, profile, previous, next } = reference;

  const sourceMidi = sourceMidiAtBeat(sourcePart, event.absoluteBeat);

  if (sourceMidi === null) {
    return;
  }

  const context = harmonicContextAtBeat(contexts, event.absoluteBeat);

  const keySignature = keySignatureAtBeat(score, sourcePart, event.absoluteBeat);

  const scalePitchClasses = getScalePitchClasses(keySignature.rootNote, keySignature.scaleMode);

  const targetMidi = calculateTargetMidi(sourceMidi, scalePitchClasses, request, profile);

  const candidates = buildCandidates(scalePitchClasses, context, profile.minMidi, profile.maxMidi);

  if (!candidates.length) {
    return;
  }

  const peerParts = [
    ...(score.parts ?? []).filter(
      (candidate) => candidate.source === 'original' && candidate.id !== sourcePart.id,
    ),

    ...generatedParts.filter((candidate) => candidate.id !== part.id),
  ];

  const peerMidis = activePeerMidis(peerParts, event.absoluteBeat);

  const generatedPeerMidis = activePeerMidis(
    generatedParts.filter((candidate) => candidate.id !== part.id),
    event.absoluteBeat,
  );

  const previousSourceMidi = previous
    ? (sourceMidiAtBeat(sourcePart, previous.absoluteBeat) ?? undefined)
    : undefined;

  const state: VoiceGenerationState = {
    previousGeneratedMidi: previous?.pitch.midi,

    previousSourceMidi,

    previousMovement: previous
      ? previous.pitch.midi - (partNoteBefore(part, previous)?.pitch.midi ?? previous.pitch.midi)
      : undefined,
  };

  let bestMidi = event.pitch.midi;

  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    let score = scoreCandidate(
      candidate,
      sourceMidi,
      targetMidi,
      request,
      profile,
      context,
      peerMidis,
      state,
    );

    score += futureVoiceLeadingPenalty(candidate, next, profile);

    score += chordCoveragePenalty(candidate, context, generatedPeerMidis, sourceMidi, profile);

    score += generatedSpacingPenalty(candidate, generatedPeerMidis, profile);

    score += expectedVoiceOrderPenalty(
      candidate,
      sourceMidi,
      request,
      generatedParts,
      part.id,
      event.absoluteBeat,
    );

    score += cadencePenalty(candidate, request, context);

    if (candidate === event.pitch.midi) {
      score -= 0.35;
    }

    if (score < bestScore) {
      bestScore = score;

      bestMidi = candidate;
    }
  });

  event.pitch = midiToPitch(bestMidi);
}

function calculateTargetMidi(
  sourceMidi: number,
  scalePitchClasses: number[],
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
): number {
  const sourcePitchClass = normalizeNote(sourceMidi);

  const sourceScalePosition = scalePitchClasses.indexOf(sourcePitchClass);

  let targetMidi = sourceMidi + profile.preferredSemitoneOffset;

  if (sourceScalePosition >= 0) {
    const targetScalePosition = sourceScalePosition + profile.diatonicOffset;

    const octaveShift = Math.floor(targetScalePosition / scalePitchClasses.length);

    const wrappedScalePosition = wrapIndex(targetScalePosition, scalePitchClasses.length);

    const targetPitchClass = scalePitchClasses[wrappedScalePosition] ?? normalizeNote(targetMidi);

    const sourceOctaveBase = Math.floor(sourceMidi / 12) * 12;

    targetMidi = sourceOctaveBase + targetPitchClass + octaveShift * 12;
  }

  while (request.placement === 'above' && targetMidi <= sourceMidi) {
    targetMidi += 12;
  }

  while (request.placement === 'below' && targetMidi >= sourceMidi) {
    targetMidi -= 12;
  }

  return targetMidi;
}

function scoreCandidate(
  candidate: number,
  sourceMidi: number,
  targetMidi: number,
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
  context: HarmonicContext | null,
  peerMidis: number[],
  state: VoiceGenerationState,
): number {
  let score = 0;

  score += Math.abs(candidate - targetMidi) * profile.targetWeight;

  score += placementPenalty(candidate, sourceMidi, request.placement);

  score += harmonyPenalty(candidate, sourceMidi, request, profile, context);

  score += voiceLeadingPenalty(candidate, sourceMidi, profile, state);

  score += peerVoicePenalty(candidate, request, peerMidis, profile.peerWeight);

  score += rangeEdgePenalty(candidate, profile.minMidi, profile.maxMidi);

  return score;
}

function placementPenalty(
  candidate: number,
  sourceMidi: number,
  placement: GeneratedVoicePlacement,
): number {
  if (candidate === sourceMidi) {
    return 60;
  }

  if (placement === 'above' && candidate <= sourceMidi) {
    return 75 + Math.abs(candidate - sourceMidi) * 2;
  }

  if (placement === 'below' && candidate >= sourceMidi) {
    return 75 + Math.abs(candidate - sourceMidi) * 2;
  }

  return 0;
}

function harmonyPenalty(
  candidate: number,
  sourceMidi: number,
  request: GeneratedVoiceRequest,
  profile: GeneratedVoiceProfile,
  context: HarmonicContext | null,
): number {
  if (!context) {
    return 0;
  }

  let penalty = chordToneDistance(candidate, context) * profile.chordToneWeight;

  if (isChordTone(candidate, context)) {
    penalty -= context.confidence >= 0.65 ? 5 : 2.5;
  }

  const interval = Math.abs(candidate - sourceMidi);

  const intervalClass = interval % 12;

  if (intervalClass === 0) {
    penalty += 18;
  }

  if (intervalClass === 1 || intervalClass === 11) {
    penalty += 20;
  }

  if (intervalClass === 2 || intervalClass === 10) {
    penalty += 5;
  }

  if (intervalClass === 6) {
    penalty += 12;
  }

  if (
    request.kind === 'second' &&
    (intervalClass === 3 || intervalClass === 4 || intervalClass === 8 || intervalClass === 9)
  ) {
    penalty -= 5;
  }

  if (
    request.kind === 'tenor' &&
    (intervalClass === 3 ||
      intervalClass === 4 ||
      intervalClass === 5 ||
      intervalClass === 7 ||
      intervalClass === 8 ||
      intervalClass === 9)
  ) {
    penalty -= 2.5;
  }

  if (request.kind === 'baritone') {
    if (
      intervalClass === 3 ||
      intervalClass === 4 ||
      intervalClass === 7 ||
      intervalClass === 8 ||
      intervalClass === 9
    ) {
      penalty -= 3;
    }
  }

  if (request.kind === 'bass') {
    const pitchClass = normalizeNote(candidate);

    if (pitchClass === context.chordRoot) {
      penalty -= 12;
    } else if (context.chordPitchClasses.includes(pitchClass)) {
      penalty -= 4;
    } else {
      penalty += 12;
    }

    if (pitchClass === context.bassPitchClass) {
      penalty -= 2;
    }

    if (context.harmonicFunction === 'dominant' && pitchClass === context.chordRoot) {
      penalty -= 3;
    }
  }

  if (context.confidence < 0.5) {
    penalty *= 0.7;
  }

  return penalty;
}

function voiceLeadingPenalty(
  candidate: number,
  sourceMidi: number,
  profile: GeneratedVoiceProfile,
  state: VoiceGenerationState,
): number {
  const previousGeneratedMidi = state.previousGeneratedMidi;

  if (previousGeneratedMidi === undefined) {
    return 0;
  }

  const movement = candidate - previousGeneratedMidi;

  const movementSize = Math.abs(movement);

  let penalty = movementSize * profile.voiceLeadingWeight;

  if (movementSize === 0) {
    penalty -= 1.4;
  } else if (movementSize <= 2) {
    penalty -= 3;
  } else if (movementSize <= 4) {
    penalty -= 1.2;
  }

  if (movementSize > 5) {
    penalty += (movementSize - 5) * 0.8;
  }

  if (movementSize > 7) {
    penalty += (movementSize - 7) * 1.8;
  }

  if (movementSize > 12) {
    penalty += 24;
  }

  if (
    state.previousMovement !== undefined &&
    Math.abs(state.previousMovement) > 7 &&
    movement !== 0 &&
    Math.sign(movement) === Math.sign(state.previousMovement)
  ) {
    penalty += 5;
  }

  if (state.previousSourceMidi !== undefined) {
    const previousInterval = Math.abs(previousGeneratedMidi - state.previousSourceMidi) % 12;

    const currentInterval = Math.abs(candidate - sourceMidi) % 12;

    const sourceMotion = sourceMidi - state.previousSourceMidi;

    const generatedMotion = candidate - previousGeneratedMidi;

    if (
      isPerfectInterval(previousInterval) &&
      isPerfectInterval(currentInterval) &&
      previousInterval === currentInterval &&
      movesInSameDirection(sourceMotion, generatedMotion)
    ) {
      penalty += 16;
    }

    if (
      sourceMotion !== 0 &&
      generatedMotion !== 0 &&
      Math.sign(sourceMotion) !== Math.sign(generatedMotion)
    ) {
      penalty -= 2;
    }

    if (sourceMotion === generatedMotion && Math.abs(sourceMotion) > 4) {
      penalty += 2.5;
    }
  }

  return penalty;
}

function futureVoiceLeadingPenalty(
  candidate: number,
  next: ScoreNoteEvent | null,
  profile: GeneratedVoiceProfile,
): number {
  if (!next) {
    return 0;
  }

  const movement = Math.abs(next.pitch.midi - candidate);

  let penalty = movement * profile.voiceLeadingWeight * 0.45;

  if (movement <= 2) {
    penalty -= 1.5;
  }

  if (movement > 7) {
    penalty += (movement - 7) * 1.15;
  }

  if (movement > 12) {
    penalty += 12;
  }

  return penalty;
}

function peerVoicePenalty(
  candidate: number,
  request: GeneratedVoiceRequest,
  peerMidis: number[],
  weight: number,
): number {
  if (!peerMidis.length) {
    return 0;
  }

  let penalty = 0;

  peerMidis.forEach((peerMidi) => {
    const distance = Math.abs(candidate - peerMidi);

    if (distance === 0) {
      penalty += 18 * weight;

      return;
    }

    if (distance === 1) {
      penalty += 16 * weight;

      return;
    }

    if (distance === 2) {
      penalty += 6 * weight;
    }
  });

  if (request.kind === 'bass') {
    const lowestPeer = Math.min(...peerMidis);

    if (candidate >= lowestPeer) {
      penalty += 18 * weight;
    }
  }

  return penalty;
}

function generatedSpacingPenalty(
  candidate: number,
  peerMidis: number[],
  profile: GeneratedVoiceProfile,
): number {
  let penalty = 0;

  peerMidis.forEach((peerMidi) => {
    const distance = Math.abs(candidate - peerMidi);

    if (distance === 0) {
      penalty += 22 * profile.spacingWeight;
    } else if (distance === 1) {
      penalty += 18 * profile.spacingWeight;
    } else if (distance === 2) {
      penalty += 8 * profile.spacingWeight;
    } else if (distance > 12) {
      penalty += Math.min(6, (distance - 12) * 0.25) * profile.spacingWeight;
    }
  });

  return penalty;
}

function chordCoveragePenalty(
  candidate: number,
  context: HarmonicContext | null,
  peerMidis: number[],
  sourceMidi: number,
  profile: GeneratedVoiceProfile,
): number {
  if (!context || context.confidence < 0.45) {
    return 0;
  }

  const candidatePitchClass = normalizeNote(candidate);

  const existingPitchClasses = new Set<number>([
    normalizeNote(sourceMidi),

    ...peerMidis.map(normalizeNote),
  ]);

  let penalty = 0;

  if (existingPitchClasses.has(candidatePitchClass)) {
    penalty += 3.8 * profile.chordCoverageWeight;
  }

  if (
    context.chordPitchClasses.includes(candidatePitchClass) &&
    !existingPitchClasses.has(candidatePitchClass)
  ) {
    penalty -= 4.5 * profile.chordCoverageWeight;
  }

  const missingChordTones = context.chordPitchClasses.filter(
    (pitchClass) => !existingPitchClasses.has(pitchClass),
  );

  if (missingChordTones.includes(candidatePitchClass)) {
    penalty -= 2 * profile.chordCoverageWeight;
  }

  return penalty;
}

function expectedVoiceOrderPenalty(
  candidate: number,
  sourceMidi: number,
  request: GeneratedVoiceRequest,
  parts: ScorePart[],
  currentPartId: string,
  absoluteBeat: number,
): number {
  const currentTarget = targetRelativePosition(request);

  let penalty = 0;

  parts.forEach((part) => {
    if (part.id === currentPartId) {
      return;
    }

    const peerRequest = requestFromPart(part);

    if (!peerRequest) {
      return;
    }

    const peerMidi = activeMidiForPart(part, absoluteBeat);

    if (peerMidi === null) {
      return;
    }

    const peerTarget = targetRelativePosition(peerRequest);

    if (currentTarget > peerTarget && candidate <= peerMidi) {
      penalty += 24 + Math.abs(candidate - peerMidi);
    }

    if (currentTarget < peerTarget && candidate >= peerMidi) {
      penalty += 24 + Math.abs(candidate - peerMidi);
    }
  });

  if (request.placement === 'above' && candidate <= sourceMidi) {
    penalty += 30;
  }

  if (request.placement === 'below' && candidate >= sourceMidi) {
    penalty += 30;
  }

  return penalty;
}

function cadencePenalty(
  candidate: number,
  request: GeneratedVoiceRequest,
  context: HarmonicContext | null,
): number {
  if (!context) {
    return 0;
  }

  const pitchClass = normalizeNote(candidate);

  if (request.kind === 'bass' && context.harmonicFunction === 'tonic') {
    return pitchClass === context.chordRoot ? -5 : 2;
  }

  if (request.kind === 'bass' && context.harmonicFunction === 'dominant') {
    return pitchClass === context.chordRoot ? -4 : 1.5;
  }

  return 0;
}

function rangeEdgePenalty(midi: number, minimum: number, maximum: number): number {
  const distanceFromMinimum = midi - minimum;

  const distanceFromMaximum = maximum - midi;

  const nearestEdge = Math.min(distanceFromMinimum, distanceFromMaximum);

  if (nearestEdge >= 5) {
    return 0;
  }

  return (5 - nearestEdge) * 0.65;
}

function resolveProfile(request: GeneratedVoiceRequest): GeneratedVoiceProfile {
  if (request.kind === 'second') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 2,

          preferredSemitoneOffset: 4,

          minMidi: request.minMidi ?? 55,

          maxMidi: request.maxMidi ?? 88,

          chordToneWeight: 3.5,

          voiceLeadingWeight: 0.9,

          targetWeight: 1,

          peerWeight: 1.15,

          spacingWeight: 1.1,

          chordCoverageWeight: 1.1,
        }
      : {
          diatonicOffset: -2,

          preferredSemitoneOffset: -4,

          minMidi: request.minMidi ?? 48,

          maxMidi: request.maxMidi ?? 79,

          chordToneWeight: 3.5,

          voiceLeadingWeight: 0.9,

          targetWeight: 1,

          peerWeight: 1.15,

          spacingWeight: 1.1,

          chordCoverageWeight: 1.1,
        };
  }

  if (request.kind === 'tenor') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 3,

          preferredSemitoneOffset: 5,

          minMidi: request.minMidi ?? 52,

          maxMidi: request.maxMidi ?? 79,

          chordToneWeight: 3.8,

          voiceLeadingWeight: 1,

          targetWeight: 0.82,

          peerWeight: 1.25,

          spacingWeight: 1.25,

          chordCoverageWeight: 1.25,
        }
      : {
          diatonicOffset: -3,

          preferredSemitoneOffset: -5,

          minMidi: request.minMidi ?? 45,

          maxMidi: request.maxMidi ?? 74,

          chordToneWeight: 3.8,

          voiceLeadingWeight: 1,

          targetWeight: 0.82,

          peerWeight: 1.25,

          spacingWeight: 1.25,

          chordCoverageWeight: 1.25,
        };
  }

  if (request.kind === 'baritone') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 5,

          preferredSemitoneOffset: 9,

          minMidi: request.minMidi ?? 48,

          maxMidi: request.maxMidi ?? 74,

          chordToneWeight: 4,

          voiceLeadingWeight: 1.1,

          targetWeight: 0.7,

          peerWeight: 1.4,

          spacingWeight: 1.35,

          chordCoverageWeight: 1.35,
        }
      : {
          diatonicOffset: -5,

          preferredSemitoneOffset: -9,

          minMidi: request.minMidi ?? 40,

          maxMidi: request.maxMidi ?? 69,

          chordToneWeight: 4,

          voiceLeadingWeight: 1.1,

          targetWeight: 0.7,

          peerWeight: 1.4,

          spacingWeight: 1.35,

          chordCoverageWeight: 1.35,
        };
  }

  if (request.kind === 'bass') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 7,

          preferredSemitoneOffset: 12,

          minMidi: request.minMidi ?? 43,

          maxMidi: request.maxMidi ?? 69,

          chordToneWeight: 4.8,

          voiceLeadingWeight: 1.2,

          targetWeight: 0.5,

          peerWeight: 1.8,

          spacingWeight: 1.5,

          chordCoverageWeight: 1.5,
        }
      : {
          diatonicOffset: -7,

          preferredSemitoneOffset: -12,

          minMidi: request.minMidi ?? 32,

          maxMidi: request.maxMidi ?? 60,

          chordToneWeight: 4.8,

          voiceLeadingWeight: 1.2,

          targetWeight: 0.5,

          peerWeight: 1.8,

          spacingWeight: 1.5,

          chordCoverageWeight: 1.5,
        };
  }

  const customDiatonicOffset =
    request.customDiatonicOffset ?? (request.placement === 'above' ? 2 : -2);

  const customSemitoneOffset =
    request.customSemitoneOffset ?? (request.placement === 'above' ? 4 : -4);

  return {
    diatonicOffset: customDiatonicOffset,

    preferredSemitoneOffset: customSemitoneOffset,

    minMidi: request.minMidi ?? 36,

    maxMidi: request.maxMidi ?? 88,

    chordToneWeight: 3.2,

    voiceLeadingWeight: 1,

    targetWeight: 1,

    peerWeight: 1.1,

    spacingWeight: 1.1,

    chordCoverageWeight: 1.1,
  };
}

function generationPeerParts(
  score: ScoreDocument,
  sourcePart: ScorePart,
  request: GeneratedVoiceRequest,
): ScorePart[] {
  return (score.parts ?? []).filter((part) => {
    if (part.id === sourcePart.id) {
      return false;
    }

    if (
      part.source === 'generated' &&
      part.generatedFromPartId === sourcePart.id &&
      part.generatedVoiceConfig?.requestId === request.id
    ) {
      return false;
    }

    return true;
  });
}

function activePeerMidis(parts: ScorePart[], absoluteBeat: number): number[] {
  const result: number[] = [];

  parts.forEach((part) => {
    const midi = activeMidiForPart(part, absoluteBeat);

    if (midi !== null) {
      result.push(midi);
    }
  });

  return result;
}

function activeMidiForPart(part: ScorePart, absoluteBeat: number): number | null {
  let active: ScoreNoteEvent | null = null;

  let exact: ScoreNoteEvent | null = null;

  for (const measure of part.measures) {
    for (const event of measure.events) {
      if (event.type !== 'note') {
        continue;
      }

      if (Math.abs(event.absoluteBeat - absoluteBeat) < EPSILON) {
        exact = event;

        break;
      }

      if (
        event.absoluteBeat <= absoluteBeat + EPSILON &&
        event.absoluteBeat + event.durationBeats > absoluteBeat + EPSILON
      ) {
        active = event;
      }
    }

    if (exact) {
      break;
    }
  }

  return exact?.pitch.midi ?? active?.pitch.midi ?? null;
}

function sourceMidiAtBeat(sourcePart: ScorePart, absoluteBeat: number): number | null {
  return activeMidiForPart(sourcePart, absoluteBeat);
}

function keySignatureAtBeat(
  score: ScoreDocument,
  sourcePart: ScorePart,
  absoluteBeat: number,
): ScoreKeySignature {
  for (const measure of sourcePart.measures) {
    const contains = measure.events.some(
      (event) =>
        absoluteBeat >= event.absoluteBeat - EPSILON &&
        absoluteBeat < event.absoluteBeat + event.durationBeats + EPSILON,
    );

    if (contains && measure.keySignature) {
      return measure.keySignature;
    }
  }

  return score.keySignature;
}

function buildCandidates(
  scalePitchClasses: number[],
  context: HarmonicContext | null,
  minimum: number,
  maximum: number,
): number[] {
  const allowedPitchClasses = new Set<number>(scalePitchClasses);

  context?.chordPitchClasses.forEach((pitchClass) => {
    allowedPitchClasses.add(pitchClass);
  });

  const candidates: number[] = [];

  for (let midi = minimum; midi <= maximum; midi += 1) {
    if (allowedPitchClasses.has(normalizeNote(midi))) {
      candidates.push(midi);
    }
  }

  return candidates;
}

function getScalePitchClasses(rootNote: number, mode: 'major' | 'minor'): number[] {
  const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];

  return intervals.map((interval) => normalizeNote(rootNote + interval));
}

function requestForPart(
  part: ScorePart,
  requests: GeneratedVoiceRequest[],
): GeneratedVoiceRequest | null {
  const requestId = part.generatedVoiceConfig?.requestId;

  if (requestId) {
    const found = requests.find((request) => request.id === requestId);

    if (found) {
      return found;
    }
  }

  return requestFromPart(part);
}

function requestFromPart(part: ScorePart): GeneratedVoiceRequest | null {
  const config = part.generatedVoiceConfig;

  if (config) {
    return {
      id: config.requestId,

      label: config.label,

      kind: config.kind,

      placement: config.placement,

      customDiatonicOffset: config.customDiatonicOffset,

      customSemitoneOffset: config.customSemitoneOffset,

      minMidi: config.minMidi,

      maxMidi: config.maxMidi,
    };
  }

  const raw = part.generatedVoiceType ?? '';

  const [kindRaw, placementRaw] = raw.split(':');

  if (
    kindRaw !== 'second' &&
    kindRaw !== 'tenor' &&
    kindRaw !== 'baritone' &&
    kindRaw !== 'bass' &&
    kindRaw !== 'custom'
  ) {
    return null;
  }

  return {
    id: part.id,

    label: part.name,

    kind: kindRaw,

    placement: placementRaw === 'below' ? 'below' : 'above',
  };
}

function targetRelativePosition(request: GeneratedVoiceRequest): number {
  const profile = resolveProfile(request);

  return profile.preferredSemitoneOffset;
}

function partNoteEvents(part: ScorePart): ScoreNoteEvent[] {
  const notes: ScoreNoteEvent[] = [];

  part.measures.forEach((measure) => {
    measure.events.forEach((event) => {
      if (event.type === 'note') {
        notes.push(event);
      }
    });
  });

  return notes.sort((left, right) => left.absoluteBeat - right.absoluteBeat);
}

function partNoteBefore(part: ScorePart, event: ScoreNoteEvent): ScoreNoteEvent | null {
  const notes = partNoteEvents(part);

  const index = notes.findIndex((candidate) => candidate.id === event.id);

  if (index <= 0) {
    return null;
  }

  return notes[index - 1] ?? null;
}

function cloneGeneratedPart(part: ScorePart): ScorePart {
  return {
    ...part,

    clef: {
      ...part.clef,
    },

    generatedVoiceConfig: part.generatedVoiceConfig
      ? {
          ...part.generatedVoiceConfig,
        }
      : undefined,

    generatedManualOverrides: part.generatedManualOverrides
      ? part.generatedManualOverrides.map((override) => ({
          ...override,
        }))
      : undefined,

    measures: part.measures.map((measure) => ({
      ...measure,

      timeSignature: measure.timeSignature
        ? {
            ...measure.timeSignature,
          }
        : undefined,

      keySignature: measure.keySignature
        ? {
            ...measure.keySignature,
          }
        : undefined,

      events: measure.events.map((event) =>
        event.type === 'note'
          ? {
              ...event,

              pitch: {
                ...event.pitch,
              },
            }
          : {
              ...event,
            },
      ),
    })),
  };
}

function midiToPitch(midi: number): ScorePitch {
  return {
    noteIndex: normalizeNote(midi),

    octave: Math.floor(midi / 12) - 1,

    midi,
  };
}

function buildGeneratedPartId(
  sourcePartId: string,
  request: GeneratedVoiceRequest,
  requestIndex: number,
): string {
  const safeRequestId =
    request.id
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-') || `voice-${requestIndex + 1}`;

  return `generated-${sourcePartId}-${safeRequestId}`;
}

function buildGeneratedVoiceType(request: GeneratedVoiceRequest): string {
  return `${request.kind}:${request.placement}`;
}

function buildAbbreviation(request: GeneratedVoiceRequest): string {
  if (request.kind === 'second') {
    return request.placement === 'above' ? '2ª↑' : '2ª↓';
  }

  if (request.kind === 'tenor') {
    return request.placement === 'above' ? 'T↑' : 'T↓';
  }

  if (request.kind === 'baritone') {
    return request.placement === 'above' ? 'Brt↑' : 'Brt↓';
  }

  if (request.kind === 'bass') {
    return request.placement === 'above' ? 'B↑' : 'B↓';
  }

  return 'V';
}

function isPerfectInterval(intervalClass: number): boolean {
  return intervalClass === 0 || intervalClass === 7;
}

function movesInSameDirection(leftMovement: number, rightMovement: number): boolean {
  if (leftMovement === 0 || rightMovement === 0) {
    return false;
  }

  return Math.sign(leftMovement) === Math.sign(rightMovement);
}

function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

function wrapIndex(value: number, length: number): number {
  return ((value % length) + length) % length;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
