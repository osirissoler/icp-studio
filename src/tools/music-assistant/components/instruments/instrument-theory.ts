export type ScaleMode = 'major' | 'minor';

export type ChordQuality = 'major' | 'minor' | 'dominant7' | 'major7' | 'minor7';

export interface InstrumentNote {
  pitchClass: number;
  spanish: string;
  international: string;
}

export interface PianoKey {
  midi: number;
  pitchClass: number;
  octave: number;
  black: boolean;
  spanish: string;
  international: string;
}

export interface GuitarString {
  number: number;
  name: string;
  midi: number;
}

export interface GuitarPosition {
  stringNumber: number;
  fret: number;
  midi: number;
  pitchClass: number;
  octave: number;
}

export const instrumentNotes: InstrumentNote[] = [
  { pitchClass: 0, spanish: 'Do', international: 'C' },
  { pitchClass: 1, spanish: 'Do♯', international: 'C♯' },
  { pitchClass: 2, spanish: 'Re', international: 'D' },
  { pitchClass: 3, spanish: 'Re♯', international: 'D♯' },
  { pitchClass: 4, spanish: 'Mi', international: 'E' },
  { pitchClass: 5, spanish: 'Fa', international: 'F' },
  { pitchClass: 6, spanish: 'Fa♯', international: 'F♯' },
  { pitchClass: 7, spanish: 'Sol', international: 'G' },
  { pitchClass: 8, spanish: 'Sol♯', international: 'G♯' },
  { pitchClass: 9, spanish: 'La', international: 'A' },
  { pitchClass: 10, spanish: 'La♯', international: 'A♯' },
  { pitchClass: 11, spanish: 'Si', international: 'B' },
];

export const guitarStrings: GuitarString[] = [
  { number: 1, name: 'Mi', midi: 64 },
  { number: 2, name: 'Si', midi: 59 },
  { number: 3, name: 'Sol', midi: 55 },
  { number: 4, name: 'Re', midi: 50 },
  { number: 5, name: 'La', midi: 45 },
  { number: 6, name: 'Mi', midi: 40 },
];

const majorScale = [0, 2, 4, 5, 7, 9, 11];

const minorScale = [0, 2, 3, 5, 7, 8, 10];

const chordIntervals: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
};

export function normalizePitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function noteDefinition(pitchClass: number): InstrumentNote {
  return instrumentNotes[normalizePitchClass(pitchClass)]!;
}

export function midiOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function midiLabel(midi: number): string {
  const note = noteDefinition(midi);

  return `${note.international}${midiOctave(midi)}`;
}

export function midiSpanishLabel(midi: number): string {
  const note = noteDefinition(midi);

  return `${note.spanish}${midiOctave(midi)}`;
}

export function scalePitchClasses(root: number, mode: ScaleMode): number[] {
  const intervals = mode === 'major' ? majorScale : minorScale;

  return intervals.map((interval) => normalizePitchClass(root + interval));
}

export function chordPitchClasses(root: number, quality: ChordQuality): number[] {
  return chordIntervals[quality].map((interval) => normalizePitchClass(root + interval));
}

export function chordMidis(rootPitchClass: number, quality: ChordQuality, octave = 4): number[] {
  const baseMidi = (octave + 1) * 12 + normalizePitchClass(rootPitchClass);

  return chordIntervals[quality].map((interval) => baseMidi + interval);
}

export function buildPianoKeys(startMidi = 36, endMidi = 84): PianoKey[] {
  const result: PianoKey[] = [];

  for (let midi = startMidi; midi <= endMidi; midi += 1) {
    const pitchClass = normalizePitchClass(midi);

    const note = noteDefinition(pitchClass);

    result.push({
      midi,
      pitchClass,
      octave: midiOctave(midi),
      black: [1, 3, 6, 8, 10].includes(pitchClass),
      spanish: note.spanish,
      international: note.international,
    });
  }

  return result;
}

export function guitarPosition(
  stringMidi: number,
  stringNumber: number,
  fret: number,
): GuitarPosition {
  const midi = stringMidi + fret;

  return {
    stringNumber,
    fret,
    midi,
    pitchClass: normalizePitchClass(midi),
    octave: midiOctave(midi),
  };
}

export function frequencyToTunedPitch(
  frequency: number,
  referenceA: number,
): {
  midi: number;
  pitchClass: number;
  octave: number;
  cents: number;
  targetFrequency: number;
} {
  const exactMidi = 69 + 12 * Math.log2(frequency / referenceA);

  const midi = Math.round(exactMidi);

  const targetFrequency = referenceA * Math.pow(2, (midi - 69) / 12);

  const cents = 1200 * Math.log2(frequency / targetFrequency);

  return {
    midi,
    pitchClass: normalizePitchClass(midi),
    octave: midiOctave(midi),
    cents,
    targetFrequency,
  };
}
