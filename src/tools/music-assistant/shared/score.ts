export type ScoreScaleMode = 'major' | 'minor';

export interface ScoreTimeSignature {
  numerator: number;
  denominator: number;
}

export interface ScoreKeySignature {
  fifths: number;
  rootNote: number;
  scaleMode: ScoreScaleMode;
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
}

export interface ScoreRestEvent {
  id: string;
  type: 'rest';
  measureNumber: number;
  startBeat: number;
  absoluteBeat: number;
  durationBeats: number;
}

export type ScoreEvent = ScoreNoteEvent | ScoreRestEvent;

export interface ScoreMeasure {
  number: number;
  beats: number;
  events: ScoreEvent[];
}

export interface ScoreDocument {
  id: string;
  title: string;
  sourceFileName: string;
  tempo: number;
  divisions: number;
  timeSignature: ScoreTimeSignature;
  keySignature: ScoreKeySignature;
  measures: ScoreMeasure[];
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
}

export function beatsToMilliseconds(beats: number, tempo: number): number {
  const safeTempo = Math.max(20, tempo);

  return beats * (60000 / safeTempo);
}

export function scoreToTimeline(score: ScoreDocument): ScoreTimelineNote[] {
  const result: ScoreTimelineNote[] = [];

  score.measures.forEach((measure) => {
    measure.events.forEach((event) => {
      if (event.type !== 'note') {
        return;
      }

      const startMs = beatsToMilliseconds(event.absoluteBeat, score.tempo);

      const durationMs = beatsToMilliseconds(event.durationBeats, score.tempo);

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
      });
    });
  });

  return result.sort((left, right) => left.absoluteBeat - right.absoluteBeat);
}

export function scoreDurationBeats(score: ScoreDocument): number {
  return score.measures.reduce((total, measure) => total + measure.beats, 0);
}

export function scoreDurationMs(score: ScoreDocument): number {
  return beatsToMilliseconds(scoreDurationBeats(score), score.tempo);
}
