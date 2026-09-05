export type ScoreScaleMode = 'major' | 'minor';

export type ScorePartSource = 'original' | 'generated';

export type ScoreClefSign = 'G' | 'F' | 'C' | 'percussion' | 'TAB' | 'none' | 'unknown';

export interface ScoreTimeSignature {
  numerator: number;
  denominator: number;
}

export interface ScoreKeySignature {
  fifths: number;
  rootNote: number;
  scaleMode: ScoreScaleMode;
}

export interface ScoreClef {
  sign: ScoreClefSign;
  line: number | null;
  octaveChange: number;
}

export interface ScorePitch {
  noteIndex: number;
  octave: number;
  midi: number;
}

export interface ScoreNoteEvent {
  id: string;

  type: 'note';

  measureNumber: number;

  startBeat: number;

  absoluteBeat: number;

  durationBeats: number;

  pitch: ScorePitch;

  tieStart: boolean;

  tieStop: boolean;

  voice?: string | undefined;

  staff?: number | undefined;
}

export interface ScoreRestEvent {
  id: string;

  type: 'rest';

  measureNumber: number;

  startBeat: number;

  absoluteBeat: number;

  durationBeats: number;

  voice?: string | undefined;

  staff?: number | undefined;
}

export type ScoreEvent = ScoreNoteEvent | ScoreRestEvent;

export interface ScoreMeasure {
  number: number;

  beats: number;

  events: ScoreEvent[];

  timeSignature?: ScoreTimeSignature | undefined;

  keySignature?: ScoreKeySignature | undefined;
}

export interface ScorePart {
  id: string;

  name: string;

  abbreviation: string;

  source: ScorePartSource;

  generatedFromPartId?: string | undefined;

  generatedVoiceType?: string | undefined;

  clef: ScoreClef;

  measures: ScoreMeasure[];
}

export interface ScoreDocument {
  id: string;

  title: string;

  sourceFileName: string;

  tempo: number;

  divisions: number;

  timeSignature: ScoreTimeSignature;

  keySignature: ScoreKeySignature;

  /**
   * Compatibilidad temporal con el motor anterior.
   *
   * Mientras migramos el reproductor y armonizador
   * al modelo multiparte, aquí mantenemos los compases
   * de la primera parte principal.
   */
  measures: ScoreMeasure[];

  /**
   * Nuevo modelo multiparte.
   *
   * MusicXML puede contener Soprano, Alto, Tenor,
   * Bajo, instrumentos u otras partes independientes.
   */
  parts?: ScorePart[] | undefined;
}

export interface ScoreTimelineNote {
  id: string;

  measureNumber: number;

  startBeat: number;

  absoluteBeat: number;

  durationBeats: number;

  startMs: number;

  durationMs: number;

  endMs: number;

  noteIndex: number;

  octave: number;

  midi: number;

  voice?: string | undefined;

  staff?: number | undefined;
}

export function beatsToMilliseconds(beats: number, tempo: number): number {
  const safeTempo = Math.max(20, tempo);

  return beats * (60000 / safeTempo);
}

export function scoreToTimeline(score: ScoreDocument): ScoreTimelineNote[] {
  return measuresToTimeline(score.measures, score.tempo);
}

export function scorePartToTimeline(score: ScoreDocument, part: ScorePart): ScoreTimelineNote[] {
  return measuresToTimeline(part.measures, score.tempo);
}

export function scorePartById(score: ScoreDocument, partId: string): ScorePart | null {
  return score.parts?.find((part) => part.id === partId) ?? null;
}

export function originalScoreParts(score: ScoreDocument): ScorePart[] {
  return score.parts?.filter((part) => part.source === 'original') ?? [];
}

export function generatedScoreParts(score: ScoreDocument): ScorePart[] {
  return score.parts?.filter((part) => part.source === 'generated') ?? [];
}

export function scoreDurationBeats(score: ScoreDocument): number {
  if (score.parts && score.parts.length > 0) {
    return Math.max(...score.parts.map((part) => measuresDurationBeats(part.measures)));
  }

  return measuresDurationBeats(score.measures);
}

export function scorePartDurationBeats(part: ScorePart): number {
  return measuresDurationBeats(part.measures);
}

export function scoreDurationMs(score: ScoreDocument): number {
  return beatsToMilliseconds(scoreDurationBeats(score), score.tempo);
}

export function scorePartDurationMs(score: ScoreDocument, part: ScorePart): number {
  return beatsToMilliseconds(scorePartDurationBeats(part), score.tempo);
}

function measuresToTimeline(measures: ScoreMeasure[], tempo: number): ScoreTimelineNote[] {
  const result: ScoreTimelineNote[] = [];

  measures.forEach((measure) => {
    measure.events.forEach((event) => {
      if (event.type !== 'note') {
        return;
      }

      const startMs = beatsToMilliseconds(event.absoluteBeat, tempo);

      const durationMs = beatsToMilliseconds(event.durationBeats, tempo);

      result.push({
        id: event.id,

        measureNumber: event.measureNumber,

        startBeat: event.startBeat,

        absoluteBeat: event.absoluteBeat,

        durationBeats: event.durationBeats,

        startMs,

        durationMs,

        endMs: startMs + durationMs,

        noteIndex: event.pitch.noteIndex,

        octave: event.pitch.octave,

        midi: event.pitch.midi,

        voice: event.voice,

        staff: event.staff,
      });
    });
  });

  return result.sort((left, right) => {
    if (left.absoluteBeat !== right.absoluteBeat) {
      return left.absoluteBeat - right.absoluteBeat;
    }

    return left.midi - right.midi;
  });
}

function measuresDurationBeats(measures: ScoreMeasure[]): number {
  return measures.reduce((total, measure) => total + measure.beats, 0);
}
