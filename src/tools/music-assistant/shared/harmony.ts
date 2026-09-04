import { midiToFrequency, notes } from './music';

export type ScaleMode = 'major' | 'minor';

export interface HarmonySetupState {
  rootNote: number;
  scaleMode: ScaleMode;
}

export interface ChordStep {
  id: string;
  degree: number;
  beats: number;
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

const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];

const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];

const majorDegreeQualities = ['', 'm', 'm', '', '', 'm', '°'];

const minorDegreeQualities = ['m', '°', '', 'm', 'm', '', ''];

export function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

export function getScaleIntervals(scaleMode: ScaleMode): number[] {
  return scaleMode === 'major' ? majorScaleIntervals : minorScaleIntervals;
}

export function getScaleNote(rootNote: number, scaleMode: ScaleMode, degree: number): number {
  const intervals = getScaleIntervals(scaleMode);

  const safeDegree = Math.min(Math.max(degree, 1), 7) - 1;

  return normalizeNote(rootNote + (intervals[safeDegree] ?? 0));
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

export function romanDegree(degree: number): string {
  const values = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  return values[degree - 1] ?? String(degree);
}
