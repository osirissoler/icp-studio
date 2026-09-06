import type {
  ScoreDocument,
  ScoreKeySignature,
  ScoreNoteEvent,
  ScorePart,
  ScoreScaleMode,
} from '../../shared/score';

export interface HarmonicContext {
  absoluteBeat: number;

  measureNumber: number;

  pitchClasses: number[];

  bassPitchClass: number | null;

  chordRoot: number;

  chordPitchClasses: number[];

  scaleDegree: number;

  confidence: number;

  chordSize: 3 | 4;

  harmonicFunction: 'tonic' | 'predominant' | 'dominant' | 'other';
}

interface ActiveNote {
  midi: number;

  pitchClass: number;

  absoluteBeat: number;

  endBeat: number;

  measureNumber: number;
}

interface ChordCandidate {
  root: number;

  pitchClasses: number[];

  scaleDegree: number;

  score: number;

  chordSize: 3 | 4;

  harmonicFunction: 'tonic' | 'predominant' | 'dominant' | 'other';
}

const EPSILON = 0.000001;

export function analyzeHarmonicContexts(score: ScoreDocument): HarmonicContext[] {
  const originalParts = getOriginalParts(score);

  const notes = collectNotes(originalParts);

  const positions = Array.from(new Set(notes.map((note) => normalizeBeat(note.absoluteBeat)))).sort(
    (left, right) => left - right,
  );

  const contexts: HarmonicContext[] = [];

  positions.forEach((absoluteBeat) => {
    const previous = contexts.length ? (contexts[contexts.length - 1] ?? null) : null;

    contexts.push(analyzePosition(score, notes, absoluteBeat, previous));
  });

  return contexts;
}

export function harmonicContextAtBeat(
  contexts: HarmonicContext[],
  absoluteBeat: number,
): HarmonicContext | null {
  if (!contexts.length) {
    return null;
  }

  let previous: HarmonicContext | null = null;

  for (const context of contexts) {
    if (Math.abs(context.absoluteBeat - absoluteBeat) < EPSILON) {
      return context;
    }

    if (context.absoluteBeat > absoluteBeat) {
      break;
    }

    previous = context;
  }

  return previous ?? contexts[0] ?? null;
}

export function isChordTone(midi: number, context: HarmonicContext | null): boolean {
  if (!context) {
    return false;
  }

  return context.chordPitchClasses.includes(normalizePitchClass(midi));
}

export function chordToneDistance(midi: number, context: HarmonicContext | null): number {
  if (!context) {
    return 0;
  }

  const pitchClass = normalizePitchClass(midi);

  if (context.chordPitchClasses.includes(pitchClass)) {
    return 0;
  }

  let minimum = 6;

  context.chordPitchClasses.forEach((candidate) => {
    const distance = pitchClassDistance(pitchClass, candidate);

    minimum = Math.min(minimum, distance);
  });

  return minimum;
}

function analyzePosition(
  score: ScoreDocument,
  notes: ActiveNote[],
  absoluteBeat: number,
  previousContext: HarmonicContext | null,
): HarmonicContext {
  const activeNotes = notes.filter(
    (note) => note.absoluteBeat <= absoluteBeat + EPSILON && note.endBeat > absoluteBeat + EPSILON,
  );

  const startingNotes = notes.filter(
    (note) => Math.abs(note.absoluteBeat - absoluteBeat) < EPSILON,
  );

  const consideredNotes = activeNotes.length ? activeNotes : startingNotes;

  const pitchClasses = Array.from(new Set(consideredNotes.map((note) => note.pitchClass)));

  const bassNote = consideredNotes.length
    ? ([...consideredNotes].sort((left, right) => left.midi - right.midi)[0] ?? null)
    : null;

  const keySignature = keySignatureAtBeat(score, absoluteBeat);

  const candidates = buildChordCandidates(
    pitchClasses,
    bassNote?.pitchClass ?? null,
    keySignature,
    previousContext,
  );

  const candidate = candidates[0] ?? fallbackChordCandidate(keySignature);

  const runnerUp = candidates[1] ?? null;

  const measureNumber =
    consideredNotes[0]?.measureNumber ?? measureNumberAtBeat(score, absoluteBeat);

  return {
    absoluteBeat,

    measureNumber,

    pitchClasses,

    bassPitchClass: bassNote?.pitchClass ?? null,

    chordRoot: candidate.root,

    chordPitchClasses: candidate.pitchClasses,

    scaleDegree: candidate.scaleDegree,

    confidence: calculateConfidence(candidate, runnerUp, pitchClasses),

    chordSize: candidate.chordSize,

    harmonicFunction: candidate.harmonicFunction,
  };
}

function buildChordCandidates(
  activePitchClasses: number[],
  bassPitchClass: number | null,
  keySignature: ScoreKeySignature,
  previousContext: HarmonicContext | null,
): ChordCandidate[] {
  const scale = getScalePitchClasses(keySignature.rootNote, keySignature.scaleMode);

  const candidates: ChordCandidate[] = [];

  scale.forEach((root, scaleDegree) => {
    candidates.push(
      scoreChordCandidate(
        buildDiatonicTriad(scale, scaleDegree),
        root,
        scaleDegree,
        3,
        harmonicFunctionForDegree(scaleDegree),
        activePitchClasses,
        bassPitchClass,
        scale,
        previousContext,
      ),
    );

    candidates.push(
      scoreChordCandidate(
        buildDiatonicSeventh(scale, scaleDegree),
        root,
        scaleDegree,
        4,
        harmonicFunctionForDegree(scaleDegree),
        activePitchClasses,
        bassPitchClass,
        scale,
        previousContext,
      ),
    );
  });

  if (keySignature.scaleMode === 'minor') {
    const tonic = normalizePitchClass(keySignature.rootNote);

    const dominantRoot = normalizePitchClass(tonic + 7);

    const leadingTone = normalizePitchClass(tonic + 11);

    candidates.push(
      scoreChordCandidate(
        [
          dominantRoot,
          normalizePitchClass(dominantRoot + 4),
          normalizePitchClass(dominantRoot + 7),
        ],
        dominantRoot,
        4,
        3,
        'dominant',
        activePitchClasses,
        bassPitchClass,
        scale,
        previousContext,
      ),
    );

    candidates.push(
      scoreChordCandidate(
        [
          dominantRoot,
          normalizePitchClass(dominantRoot + 4),
          normalizePitchClass(dominantRoot + 7),
          normalizePitchClass(dominantRoot + 10),
        ],
        dominantRoot,
        4,
        4,
        'dominant',
        activePitchClasses,
        bassPitchClass,
        scale,
        previousContext,
      ),
    );

    candidates.push(
      scoreChordCandidate(
        [leadingTone, normalizePitchClass(leadingTone + 3), normalizePitchClass(leadingTone + 6)],
        leadingTone,
        6,
        3,
        'dominant',
        activePitchClasses,
        bassPitchClass,
        scale,
        previousContext,
      ),
    );
  }

  return candidates.sort((left, right) => right.score - left.score);
}

function scoreChordCandidate(
  chordPitchClasses: number[],
  root: number,
  scaleDegree: number,
  chordSize: 3 | 4,
  harmonicFunction: 'tonic' | 'predominant' | 'dominant' | 'other',
  activePitchClasses: number[],
  bassPitchClass: number | null,
  scale: number[],
  previousContext: HarmonicContext | null,
): ChordCandidate {
  let score = 0;

  activePitchClasses.forEach((pitchClass) => {
    if (chordPitchClasses.includes(pitchClass)) {
      score += 4.3;
    } else if (scale.includes(pitchClass)) {
      score -= 0.55;
    } else {
      score -= 1.8;
    }
  });

  const matchingNotes = chordPitchClasses.filter((pitchClass) =>
    activePitchClasses.includes(pitchClass),
  ).length;

  if (activePitchClasses.includes(root)) {
    score += 2;
  }

  if (bassPitchClass !== null) {
    if (bassPitchClass === root) {
      score += 3.5;
    } else if (chordPitchClasses.includes(bassPitchClass)) {
      score += 1.25;
    } else {
      score -= 0.8;
    }
  }

  if (matchingNotes >= 2) {
    score += 1.6;
  }

  if (matchingNotes >= 3) {
    score += 2.6;
  }

  if (chordSize === 4 && matchingNotes < 3) {
    score -= 0.6;
  }

  if (chordSize === 4 && matchingNotes === 4) {
    score += 1.5;
  }

  if (previousContext) {
    if (previousContext.chordRoot === root) {
      score += 0.85;
    }

    const rootMotion = pitchClassDistance(previousContext.chordRoot, root);

    if (rootMotion === 5) {
      score += 0.5;
    }

    if (previousContext.harmonicFunction === 'dominant' && harmonicFunction === 'tonic') {
      score += 1.15;
    }

    if (previousContext.harmonicFunction === 'predominant' && harmonicFunction === 'dominant') {
      score += 0.75;
    }
  }

  return {
    root,

    pitchClasses: Array.from(new Set(chordPitchClasses.map(normalizePitchClass))),

    scaleDegree,

    score,

    chordSize,

    harmonicFunction,
  };
}

function fallbackChordCandidate(keySignature: ScoreKeySignature): ChordCandidate {
  const scale = getScalePitchClasses(keySignature.rootNote, keySignature.scaleMode);

  return {
    root: normalizePitchClass(keySignature.rootNote),

    pitchClasses: buildDiatonicTriad(scale, 0),

    scaleDegree: 0,

    score: 0,

    chordSize: 3,

    harmonicFunction: 'tonic',
  };
}

function buildDiatonicTriad(scale: number[], rootIndex: number): number[] {
  return [
    scale[wrapIndex(rootIndex, scale.length)]!,

    scale[wrapIndex(rootIndex + 2, scale.length)]!,

    scale[wrapIndex(rootIndex + 4, scale.length)]!,
  ];
}

function buildDiatonicSeventh(scale: number[], rootIndex: number): number[] {
  return [...buildDiatonicTriad(scale, rootIndex), scale[wrapIndex(rootIndex + 6, scale.length)]!];
}

function calculateConfidence(
  candidate: ChordCandidate,
  runnerUp: ChordCandidate | null,
  activePitchClasses: number[],
): number {
  if (!activePitchClasses.length) {
    return 0;
  }

  const matches = activePitchClasses.filter((pitchClass) =>
    candidate.pitchClasses.includes(pitchClass),
  ).length;

  const coverage = matches / activePitchClasses.length;

  const margin = runnerUp ? Math.max(0, candidate.score - runnerUp.score) : 2;

  const marginConfidence = clamp(margin / 5, 0, 1);

  return clamp(coverage * 0.78 + marginConfidence * 0.22, 0, 1);
}

function collectNotes(parts: ScorePart[]): ActiveNote[] {
  const notes: ActiveNote[] = [];

  parts.forEach((part) => {
    part.measures.forEach((measure) => {
      measure.events.forEach((event) => {
        if (event.type !== 'note') {
          return;
        }

        notes.push(eventToActiveNote(event));
      });
    });
  });

  return notes.sort((left, right) => {
    if (left.absoluteBeat !== right.absoluteBeat) {
      return left.absoluteBeat - right.absoluteBeat;
    }

    return left.midi - right.midi;
  });
}

function eventToActiveNote(event: ScoreNoteEvent): ActiveNote {
  return {
    midi: event.pitch.midi,

    pitchClass: normalizePitchClass(event.pitch.midi),

    absoluteBeat: event.absoluteBeat,

    endBeat: event.absoluteBeat + Math.max(0.0001, event.durationBeats),

    measureNumber: event.measureNumber,
  };
}

function getOriginalParts(score: ScoreDocument): ScorePart[] {
  const originals = score.parts?.filter((part) => part.source === 'original') ?? [];

  if (originals.length) {
    return originals;
  }

  return [
    {
      id: 'legacy-primary',

      name: 'Principal',

      abbreviation: 'P',

      source: 'original',

      clef: {
        sign: 'G',

        line: 2,

        octaveChange: 0,
      },

      measures: score.measures,
    },
  ];
}

function keySignatureAtBeat(score: ScoreDocument, absoluteBeat: number): ScoreKeySignature {
  const originalParts = getOriginalParts(score);

  for (const part of originalParts) {
    for (const measure of part.measures) {
      const containsBeat = measure.events.some(
        (event) =>
          absoluteBeat >= event.absoluteBeat - EPSILON &&
          absoluteBeat < event.absoluteBeat + event.durationBeats + EPSILON,
      );

      if (containsBeat && measure.keySignature) {
        return measure.keySignature;
      }
    }
  }

  return score.keySignature;
}

function measureNumberAtBeat(score: ScoreDocument, absoluteBeat: number): number {
  const originalParts = getOriginalParts(score);

  for (const part of originalParts) {
    for (const measure of part.measures) {
      const event = measure.events.find(
        (candidate) =>
          absoluteBeat >= candidate.absoluteBeat - EPSILON &&
          absoluteBeat < candidate.absoluteBeat + candidate.durationBeats + EPSILON,
      );

      if (event) {
        return measure.number;
      }
    }
  }

  return 1;
}

function getScalePitchClasses(rootNote: number, mode: ScoreScaleMode): number[] {
  const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];

  return intervals.map((interval) => normalizePitchClass(rootNote + interval));
}

function harmonicFunctionForDegree(
  scaleDegree: number,
): 'tonic' | 'predominant' | 'dominant' | 'other' {
  if (scaleDegree === 0 || scaleDegree === 2 || scaleDegree === 5) {
    return 'tonic';
  }

  if (scaleDegree === 1 || scaleDegree === 3) {
    return 'predominant';
  }

  if (scaleDegree === 4 || scaleDegree === 6) {
    return 'dominant';
  }

  return 'other';
}

function pitchClassDistance(left: number, right: number): number {
  const distance = Math.abs(normalizePitchClass(left) - normalizePitchClass(right));

  return Math.min(distance, 12 - distance);
}

function normalizePitchClass(note: number): number {
  return ((note % 12) + 12) % 12;
}

function normalizeBeat(beat: number): number {
  return Number(beat.toFixed(6));
}

function wrapIndex(value: number, length: number): number {
  return ((value % length) + length) % length;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
