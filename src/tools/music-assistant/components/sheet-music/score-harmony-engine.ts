import { midiToFrequency } from '../../shared/music';

import type { ScoreDocument, ScoreTimelineNote } from '../../shared/score';

export type ScoreVoiceId =
  'principal' | 'second-up' | 'second-down' | 'tenor' | 'baritone' | 'bass';

export interface ScoreHarmonyVoiceNote {
  voiceId: ScoreVoiceId;
  midi: number;
  noteIndex: number;
  octave: number;
  frequency: number;
}

export interface ScoreHarmonyRow {
  source: ScoreTimelineNote;
  voices: ScoreHarmonyVoiceNote[];
}

interface VoiceProfile {
  id: Exclude<ScoreVoiceId, 'principal'>;
  minMidi: number;
  maxMidi: number;
  diatonicOffset: number;
  preferredSemitoneOffset: number;
  placement: 'above' | 'below';
}

const profiles: VoiceProfile[] = [
  {
    id: 'second-up',
    minMidi: 55,
    maxMidi: 84,
    diatonicOffset: 2,
    preferredSemitoneOffset: 4,
    placement: 'above',
  },
  {
    id: 'second-down',
    minMidi: 48,
    maxMidi: 76,
    diatonicOffset: -2,
    preferredSemitoneOffset: -4,
    placement: 'below',
  },
  {
    id: 'tenor',
    minMidi: 48,
    maxMidi: 74,
    diatonicOffset: -3,
    preferredSemitoneOffset: -5,
    placement: 'below',
  },
  {
    id: 'baritone',
    minMidi: 43,
    maxMidi: 67,
    diatonicOffset: -5,
    preferredSemitoneOffset: -10,
    placement: 'below',
  },
  {
    id: 'bass',
    minMidi: 35,
    maxMidi: 57,
    diatonicOffset: -7,
    preferredSemitoneOffset: -17,
    placement: 'below',
  },
];

export function buildScoreHarmony(
  score: ScoreDocument,
  timeline: ScoreTimelineNote[],
): ScoreHarmonyRow[] {
  const scalePitchClasses = getScalePitchClasses(
    score.keySignature.rootNote,
    score.keySignature.scaleMode,
  );

  const previousMidi: Partial<Record<ScoreVoiceId, number>> = {};

  return timeline.map((source) => {
    const principal = makeVoice('principal', source.midi);

    const generated = profiles.map((profile) => {
      const midi = chooseHarmonyMidi(
        source.midi,
        scalePitchClasses,
        profile,
        previousMidi[profile.id],
      );

      previousMidi[profile.id] = midi;

      return makeVoice(profile.id, midi);
    });

    previousMidi.principal = source.midi;

    return {
      source,
      voices: [principal, ...generated],
    };
  });
}

function chooseHarmonyMidi(
  principalMidi: number,
  scalePitchClasses: number[],
  profile: VoiceProfile,
  previousMidi: number | undefined,
): number {
  const scalePosition = scalePitchClasses.indexOf(normalizeNote(principalMidi));

  let targetMidi = principalMidi + profile.preferredSemitoneOffset;

  if (scalePosition >= 0) {
    const targetPosition = scalePosition + profile.diatonicOffset;

    const octaveShift = Math.floor(targetPosition / scalePitchClasses.length);

    const wrappedPosition =
      ((targetPosition % scalePitchClasses.length) + scalePitchClasses.length) %
      scalePitchClasses.length;

    const targetPitchClass = scalePitchClasses[wrappedPosition] ?? normalizeNote(targetMidi);

    const principalOctave = Math.floor(principalMidi / 12);

    targetMidi = principalOctave * 12 + targetPitchClass + octaveShift * 12;

    while (profile.placement === 'above' && targetMidi <= principalMidi) {
      targetMidi += 12;
    }

    while (profile.placement === 'below' && targetMidi >= principalMidi) {
      targetMidi -= 12;
    }
  }

  const candidates: number[] = [];

  for (let midi = profile.minMidi; midi <= profile.maxMidi; midi += 1) {
    if (scalePitchClasses.includes(normalizeNote(midi))) {
      candidates.push(midi);
    }
  }

  if (!candidates.length) {
    return clamp(targetMidi, profile.minMidi, profile.maxMidi);
  }

  let best = candidates[0] ?? targetMidi;

  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    let score = Math.abs(candidate - targetMidi);

    if (previousMidi !== undefined) {
      score += Math.abs(candidate - previousMidi) * 0.8;
    }

    if (profile.placement === 'above' && candidate <= principalMidi) {
      score += 16;
    }

    if (profile.placement === 'below' && candidate >= principalMidi) {
      score += 16;
    }

    if (candidate === principalMidi) {
      score += 12;
    }

    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  });

  return best;
}

function makeVoice(voiceId: ScoreVoiceId, midi: number): ScoreHarmonyVoiceNote {
  return {
    voiceId,
    midi,
    noteIndex: normalizeNote(midi),
    octave: Math.floor(midi / 12) - 1,
    frequency: midiToFrequency(midi),
  };
}

function getScalePitchClasses(rootNote: number, mode: 'major' | 'minor'): number[] {
  const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];

  return intervals.map((interval) => normalizeNote(rootNote + interval));
}

function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
