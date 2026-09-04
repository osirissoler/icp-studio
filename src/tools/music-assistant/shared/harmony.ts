import { midiToFrequency, notes } from './music';

export type ScaleMode = 'major' | 'minor';

export type MelodyNoteDuration = 0.5 | 1 | 2 | 4;

export type MelodyVoiceId = 'principal' | 'second' | 'tenor' | 'baritone' | 'bass';

export interface HarmonySetupState {
  rootNote: number;
  scaleMode: ScaleMode;
}

export interface ChordStep {
  id: string;
  degree: number;
  beats: number;
}

export interface MelodyNote {
  id: string;
  noteIndex: number;
  octave: number;
  beats: MelodyNoteDuration;
}

export interface MelodyPhrase {
  id: string;
  title: string;
  lyrics: string;
  chordStepId: string | null;
  notes: MelodyNote[];
}

export interface HarmonyVoice {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  noteIndex: number;
  octave: number;
  midi: number;
  frequency: number;
}

export interface ArrangedChord {
  step: ChordStep;
  chordLabel: string;
  chordNotes: number[];
  voices: HarmonyVoice[];
}

export interface MelodyHarmonyVoiceNote {
  voiceId: MelodyVoiceId;
  label: string;
  shortLabel: string;
  color: string;
  noteIndex: number;
  octave: number;
  midi: number;
  frequency: number;
}

export interface HarmonizedMelodyNote {
  sourceNote: MelodyNote;
  chordLabel: string;
  voices: MelodyHarmonyVoiceNote[];
}

export interface HarmonizedMelodyPhrase {
  phraseId: string;
  title: string;
  lyrics: string;
  chordLabel: string;
  notes: HarmonizedMelodyNote[];
}

const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];

const majorDegreeQualities = ['', 'm', 'm', '', '', 'm', '°'];

const minorDegreeQualities = ['m', '°', '', 'm', 'm', '', ''];

export function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

export function melodyNoteFrequency(noteIndex: number, octave: number): number {
  const midi = (octave + 1) * 12 + normalizeNote(noteIndex);

  return midiToFrequency(midi);
}

export function getScaleIntervals(scaleMode: ScaleMode): number[] {
  return scaleMode === 'major' ? majorScaleIntervals : minorScaleIntervals;
}

export function getScaleNote(rootNote: number, scaleMode: ScaleMode, degree: number): number {
  const intervals = getScaleIntervals(scaleMode);

  const safeDegree = Math.min(Math.max(degree, 1), 7) - 1;

  return normalizeNote(rootNote + (intervals[safeDegree] ?? 0));
}

export function getScaleNotes(rootNote: number, scaleMode: ScaleMode): number[] {
  return getScaleIntervals(scaleMode).map((interval) => normalizeNote(rootNote + interval));
}

export function getDegreeQuality(scaleMode: ScaleMode, degree: number): string {
  const qualities = scaleMode === 'major' ? majorDegreeQualities : minorDegreeQualities;

  return qualities[degree - 1] ?? '';
}

export function getChordLabel(rootNote: number, scaleMode: ScaleMode, degree: number): string {
  const noteIndex = getScaleNote(rootNote, scaleMode, degree);

  const note = notes.find((item) => item.value === noteIndex) ?? notes[0]!;

  return `${note.label}${getDegreeQuality(scaleMode, degree)}`;
}

export function getChordTones(rootNote: number, scaleMode: ScaleMode, degree: number): number[] {
  const scale = getScaleIntervals(scaleMode);

  const rootPosition = Math.min(Math.max(degree, 1), 7) - 1;

  const degreeIndexes = [rootPosition, rootPosition + 2, rootPosition + 4];

  return degreeIndexes.map((position) => {
    const wrapped = position % scale.length;

    return normalizeNote(rootNote + (scale[wrapped] ?? 0));
  });
}

function makeVoice(
  id: string,
  label: string,
  shortLabel: string,
  icon: string,
  color: string,
  noteIndex: number,
  octave: number,
): HarmonyVoice {
  const midi = (octave + 1) * 12 + noteIndex;

  return {
    id,
    label,
    shortLabel,
    icon,
    color,
    noteIndex,
    octave,
    midi,
    frequency: midiToFrequency(midi),
  };
}

export function createVoicesForChord(chordNotes: number[]): HarmonyVoice[] {
  const root = chordNotes[0] ?? 0;

  const third = chordNotes[1] ?? root;

  const fifth = chordNotes[2] ?? root;

  return [
    makeVoice('principal', 'Principal', 'P', 'record_voice_over', '#f472b6', root, 4),

    makeVoice('second', 'Segunda voz', '2ª', 'spatial_audio_off', '#60a5fa', third, 4),

    makeVoice('tenor', 'Tenor', 'T', 'graphic_eq', '#a78bfa', fifth, 4),

    makeVoice('baritone', 'Barítono', 'Brt', 'equalizer', '#34d399', third, 3),

    makeVoice('bass', 'Bajo', 'B', 'volume_down', '#fbbf24', root, 2),
  ];
}

export function arrangeProgression(
  rootNote: number,
  scaleMode: ScaleMode,
  progression: ChordStep[],
): ArrangedChord[] {
  return progression.map((step) => {
    const chordNotes = getChordTones(rootNote, scaleMode, step.degree);

    return {
      step,

      chordLabel: getChordLabel(rootNote, scaleMode, step.degree),

      chordNotes,

      voices: createVoicesForChord(chordNotes),
    };
  });
}

interface VoiceProfile {
  id: Exclude<MelodyVoiceId, 'principal'>;
  label: string;
  shortLabel: string;
  color: string;
  minMidi: number;
  maxMidi: number;
  offsetFromPrincipal: number;
}

const voiceProfiles: VoiceProfile[] = [
  {
    id: 'second',
    label: 'Segunda voz',
    shortLabel: '2ª',
    color: '#60a5fa',
    minMidi: 55,
    maxMidi: 81,
    offsetFromPrincipal: 4,
  },
  {
    id: 'tenor',
    label: 'Tenor',
    shortLabel: 'T',
    color: '#a78bfa',
    minMidi: 48,
    maxMidi: 74,
    offsetFromPrincipal: -5,
  },
  {
    id: 'baritone',
    label: 'Barítono',
    shortLabel: 'Brt',
    color: '#34d399',
    minMidi: 43,
    maxMidi: 67,
    offsetFromPrincipal: -10,
  },
  {
    id: 'bass',
    label: 'Bajo',
    shortLabel: 'B',
    color: '#fbbf24',
    minMidi: 35,
    maxMidi: 57,
    offsetFromPrincipal: -18,
  },
];

function midiToVoiceNote(
  voiceId: MelodyVoiceId,
  label: string,
  shortLabel: string,
  color: string,
  midi: number,
): MelodyHarmonyVoiceNote {
  const noteIndex = normalizeNote(midi);

  const octave = Math.floor(midi / 12) - 1;

  return {
    voiceId,
    label,
    shortLabel,
    color,
    noteIndex,
    octave,
    midi,
    frequency: midiToFrequency(midi),
  };
}

function chordMidiCandidates(chordNotes: number[], minMidi: number, maxMidi: number): number[] {
  const candidates: number[] = [];

  for (let midi = minMidi; midi <= maxMidi; midi += 1) {
    if (chordNotes.includes(normalizeNote(midi))) {
      candidates.push(midi);
    }
  }

  return candidates;
}

function chooseVoiceMidi(
  chordNotes: number[],
  profile: VoiceProfile,
  principalMidi: number,
  previousMidi: number | undefined,
): number {
  const candidates = chordMidiCandidates(chordNotes, profile.minMidi, profile.maxMidi);

  if (!candidates.length) {
    return Math.min(
      profile.maxMidi,
      Math.max(profile.minMidi, principalMidi + profile.offsetFromPrincipal),
    );
  }

  const target = principalMidi + profile.offsetFromPrincipal;

  let best = candidates[0] ?? target;

  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    let score = Math.abs(candidate - target);

    if (previousMidi !== undefined) {
      score += Math.abs(candidate - previousMidi) * 0.75;
    }

    if (profile.id !== 'second' && candidate > principalMidi) {
      score += 8;
    }

    if (profile.id === 'second' && candidate < principalMidi - 5) {
      score += 5;
    }

    if (candidate === principalMidi) {
      score += 6;
    }

    if (score < bestScore) {
      bestScore = score;

      best = candidate;
    }
  });

  return best;
}

export function harmonizeMelodyPhrases(
  rootNote: number,
  scaleMode: ScaleMode,
  progression: ChordStep[],
  phrases: MelodyPhrase[],
): HarmonizedMelodyPhrase[] {
  const previousVoiceMidi: Partial<Record<MelodyVoiceId, number>> = {};

  return phrases.map((phrase) => {
    const chordStep = progression.find((step) => step.id === phrase.chordStepId) ?? progression[0];

    const degree = chordStep?.degree ?? 1;

    const chordNotes = getChordTones(rootNote, scaleMode, degree);

    const chordLabel = getChordLabel(rootNote, scaleMode, degree);

    const arrangedNotes = phrase.notes.map((melodyNote): HarmonizedMelodyNote => {
      const principalMidi = (melodyNote.octave + 1) * 12 + normalizeNote(melodyNote.noteIndex);

      const principal = midiToVoiceNote('principal', 'Principal', 'P', '#f472b6', principalMidi);

      const otherVoices = voiceProfiles.map((profile) => {
        const midi = chooseVoiceMidi(
          chordNotes,
          profile,
          principalMidi,
          previousVoiceMidi[profile.id],
        );

        previousVoiceMidi[profile.id] = midi;

        return midiToVoiceNote(profile.id, profile.label, profile.shortLabel, profile.color, midi);
      });

      previousVoiceMidi.principal = principalMidi;

      return {
        sourceNote: melodyNote,
        chordLabel,
        voices: [principal, ...otherVoices],
      };
    });

    return {
      phraseId: phrase.id,
      title: phrase.title,
      lyrics: phrase.lyrics,
      chordLabel,
      notes: arrangedNotes,
    };
  });
}

export function romanDegree(degree: number): string {
  const values = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  return values[degree - 1] ?? String(degree);
}
