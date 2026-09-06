import type {
  ScoreDocument,
  ScoreKeySignature,
  ScoreMeasure,
  ScoreNoteEvent,
  ScorePart,
  ScorePitch,
} from '../../shared/score';

export type GeneratedVoiceKind = 'second' | 'tenor' | 'baritone' | 'bass' | 'custom';

export type GeneratedVoicePlacement = 'above' | 'below';

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
}

export function generateScoreParts(
  score: ScoreDocument,
  sourcePart: ScorePart,
  requests: GeneratedVoiceRequest[],
): ScorePart[] {
  return requests.map((request, index) => generateScorePart(score, sourcePart, request, index));
}

export function generateScorePart(
  score: ScoreDocument,
  sourcePart: ScorePart,
  request: GeneratedVoiceRequest,
  requestIndex = 0,
): ScorePart {
  const profile = resolveProfile(request);

  let previousMidi: number | undefined;

  const measures = sourcePart.measures.map((measure) => {
    const keySignature = measure.keySignature ?? score.keySignature;

    const generatedMeasure = generateMeasure(measure, keySignature, request, profile, previousMidi);

    previousMidi = generatedMeasure.lastMidi;

    return generatedMeasure.measure;
  });

  return {
    id: buildGeneratedPartId(sourcePart.id, request, requestIndex),

    name: request.label,

    abbreviation: buildAbbreviation(request),

    source: 'generated',

    generatedFromPartId: sourcePart.id,

    generatedVoiceType: buildGeneratedVoiceType(request),

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
  previousMidi: number | undefined,
): {
  measure: ScoreMeasure;
  lastMidi: number | undefined;
} {
  let currentPreviousMidi = previousMidi;

  const events = measure.events.map((event) => {
    if (event.type !== 'note') {
      return {
        ...event,
      };
    }

    const generatedMidi = chooseGeneratedMidi(
      event.pitch.midi,
      keySignature,
      request.placement,
      profile,
      currentPreviousMidi,
    );

    currentPreviousMidi = generatedMidi;

    return generateNoteEvent(event, generatedMidi, request);
  });

  return {
    measure: {
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
    },

    lastMidi: currentPreviousMidi,
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
  placement: GeneratedVoicePlacement,
  profile: GeneratedVoiceProfile,
  previousMidi: number | undefined,
): number {
  const scalePitchClasses = getScalePitchClasses(keySignature.rootNote, keySignature.scaleMode);

  const sourcePitchClass = normalizeNote(sourceMidi);

  const sourceScalePosition = scalePitchClasses.indexOf(sourcePitchClass);

  let targetMidi = sourceMidi + profile.preferredSemitoneOffset;

  if (sourceScalePosition >= 0) {
    const targetScalePosition = sourceScalePosition + profile.diatonicOffset;

    const octaveShift = Math.floor(targetScalePosition / scalePitchClasses.length);

    const wrappedScalePosition =
      ((targetScalePosition % scalePitchClasses.length) + scalePitchClasses.length) %
      scalePitchClasses.length;

    const targetPitchClass = scalePitchClasses[wrappedScalePosition] ?? normalizeNote(targetMidi);

    const sourceOctave = Math.floor(sourceMidi / 12);

    targetMidi = sourceOctave * 12 + targetPitchClass + octaveShift * 12;
  }

  while (placement === 'above' && targetMidi <= sourceMidi) {
    targetMidi += 12;
  }

  while (placement === 'below' && targetMidi >= sourceMidi) {
    targetMidi -= 12;
  }

  const candidates = buildCandidates(scalePitchClasses, profile.minMidi, profile.maxMidi);

  if (!candidates.length) {
    return clamp(targetMidi, profile.minMidi, profile.maxMidi);
  }

  let bestMidi = candidates[0] ?? clamp(targetMidi, profile.minMidi, profile.maxMidi);

  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    let candidateScore = Math.abs(candidate - targetMidi);

    if (previousMidi !== undefined) {
      candidateScore += Math.abs(candidate - previousMidi) * 0.65;
    }

    if (placement === 'above' && candidate <= sourceMidi) {
      candidateScore += 24;
    }

    if (placement === 'below' && candidate >= sourceMidi) {
      candidateScore += 24;
    }

    if (candidate === sourceMidi) {
      candidateScore += 18;
    }

    if (candidateScore < bestScore) {
      bestScore = candidateScore;

      bestMidi = candidate;
    }
  });

  return bestMidi;
}

function resolveProfile(request: GeneratedVoiceRequest): GeneratedVoiceProfile {
  if (request.kind === 'second') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 2,
          preferredSemitoneOffset: 4,
          minMidi: request.minMidi ?? 55,
          maxMidi: request.maxMidi ?? 88,
        }
      : {
          diatonicOffset: -2,
          preferredSemitoneOffset: -4,
          minMidi: request.minMidi ?? 48,
          maxMidi: request.maxMidi ?? 79,
        };
  }

  if (request.kind === 'tenor') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 3,
          preferredSemitoneOffset: 5,
          minMidi: request.minMidi ?? 52,
          maxMidi: request.maxMidi ?? 79,
        }
      : {
          diatonicOffset: -3,
          preferredSemitoneOffset: -5,
          minMidi: request.minMidi ?? 45,
          maxMidi: request.maxMidi ?? 74,
        };
  }

  if (request.kind === 'baritone') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 5,
          preferredSemitoneOffset: 9,
          minMidi: request.minMidi ?? 48,
          maxMidi: request.maxMidi ?? 74,
        }
      : {
          diatonicOffset: -5,
          preferredSemitoneOffset: -9,
          minMidi: request.minMidi ?? 40,
          maxMidi: request.maxMidi ?? 69,
        };
  }

  if (request.kind === 'bass') {
    return request.placement === 'above'
      ? {
          diatonicOffset: 7,
          preferredSemitoneOffset: 12,
          minMidi: request.minMidi ?? 43,
          maxMidi: request.maxMidi ?? 69,
        }
      : {
          diatonicOffset: -7,
          preferredSemitoneOffset: -12,
          minMidi: request.minMidi ?? 32,
          maxMidi: request.maxMidi ?? 60,
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
  };
}

function buildCandidates(scalePitchClasses: number[], minimum: number, maximum: number): number[] {
  const candidates: number[] = [];

  for (let midi = minimum; midi <= maximum; midi += 1) {
    if (scalePitchClasses.includes(normalizeNote(midi))) {
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

function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
