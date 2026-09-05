import type {
  ScoreDocument,
  ScoreEvent,
  ScoreKeySignature,
  ScoreMeasure,
  ScoreScaleMode,
  ScoreTimeSignature,
} from '../../shared/score';

const stepToNoteIndex: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

interface ParseState {
  divisions: number;
  tempo: number;
  timeSignature: ScoreTimeSignature;
  keySignature: ScoreKeySignature;
}

export function parseMusicXml(xmlText: string, sourceFileName: string): ScoreDocument {
  const parser = new DOMParser();

  const document = parser.parseFromString(xmlText, 'application/xml');

  const parserError = document.querySelector('parsererror');

  if (parserError) {
    throw new Error('El archivo XML no tiene una estructura válida.');
  }

  const scorePartwise = document.querySelector('score-partwise');

  if (!scorePartwise) {
    throw new Error(
      'Este archivo no parece ser una partitura MusicXML compatible con score-partwise.',
    );
  }

  const part = scorePartwise.querySelector('part');

  if (!part) {
    throw new Error('La partitura no contiene ninguna parte musical.');
  }

  const title =
    readText(scorePartwise.querySelector('work > work-title')) ||
    readText(scorePartwise.querySelector('movement-title')) ||
    sourceFileName;

  const state: ParseState = {
    divisions: 1,
    tempo: 120,
    timeSignature: {
      numerator: 4,
      denominator: 4,
    },
    keySignature: {
      fifths: 0,
      rootNote: 0,
      scaleMode: 'major',
    },
  };

  const measures: ScoreMeasure[] = [];

  let absoluteBeatCursor = 0;

  Array.from(part.children)
    .filter((element) => element.tagName === 'measure')
    .forEach((measureElement, measureIndex) => {
      updateAttributes(measureElement, state);

      updateTempo(measureElement, state);

      const measureNumber =
        Number.parseInt(measureElement.getAttribute('number') ?? '', 10) || measureIndex + 1;

      const measureEvents: ScoreEvent[] = [];

      let measureBeatCursor = 0;

      Array.from(measureElement.children).forEach((element) => {
        if (element.tagName === 'backup') {
          const duration = readNumber(element.querySelector('duration'), 0);

          measureBeatCursor = Math.max(
            0,
            measureBeatCursor - duration / Math.max(state.divisions, 1),
          );

          return;
        }

        if (element.tagName === 'forward') {
          const duration = readNumber(element.querySelector('duration'), 0);

          measureBeatCursor += duration / Math.max(state.divisions, 1);

          return;
        }

        if (element.tagName !== 'note') {
          return;
        }

        const isChord = Boolean(element.querySelector(':scope > chord'));

        const durationDivisions = readNumber(element.querySelector(':scope > duration'), 0);

        const durationBeats =
          durationDivisions > 0
            ? durationDivisions / Math.max(state.divisions, 1)
            : durationFromType(element);

        const noteStartBeat = isChord
          ? Math.max(0, measureBeatCursor - durationBeats)
          : measureBeatCursor;

        const id = makeEventId(measureNumber, measureEvents.length);

        if (element.querySelector(':scope > rest')) {
          measureEvents.push({
            id,
            type: 'rest',
            measureNumber,
            startBeat: noteStartBeat,
            absoluteBeat: absoluteBeatCursor + noteStartBeat,
            durationBeats,
          });
        } else {
          const pitch = parsePitch(element);

          if (pitch) {
            measureEvents.push({
              id,
              type: 'note',
              measureNumber,
              startBeat: noteStartBeat,
              absoluteBeat: absoluteBeatCursor + noteStartBeat,
              durationBeats,
              pitch,
              tieStart: hasTie(element, 'start'),
              tieStop: hasTie(element, 'stop'),
            });
          }
        }

        if (!isChord) {
          measureBeatCursor += durationBeats;
        }
      });

      const expectedMeasureBeats =
        state.timeSignature.numerator * (4 / state.timeSignature.denominator);

      const actualEnd = measureEvents.reduce(
        (maximum, event) => Math.max(maximum, event.startBeat + event.durationBeats),
        0,
      );

      const measureBeats = Math.max(expectedMeasureBeats, actualEnd, measureBeatCursor);

      measures.push({
        number: measureNumber,
        beats: measureBeats,
        events: measureEvents,
      });

      absoluteBeatCursor += measureBeats;
    });

  if (!measures.length) {
    throw new Error('La partitura no contiene compases reconocibles.');
  }

  const noteCount = measures.reduce(
    (total, measure) => total + measure.events.filter((event) => event.type === 'note').length,
    0,
  );

  if (!noteCount) {
    throw new Error('No se encontraron notas musicales en la partitura.');
  }

  return {
    id: `score-${Date.now()}`,
    title,
    sourceFileName,
    tempo: state.tempo,
    divisions: state.divisions,
    timeSignature: state.timeSignature,
    keySignature: state.keySignature,
    measures,
  };
}

function updateAttributes(element: Element, state: ParseState): void {
  const attributes = element.querySelector(':scope > attributes');

  if (!attributes) {
    return;
  }

  const divisions = readNumber(attributes.querySelector(':scope > divisions'), state.divisions);

  if (divisions > 0) {
    state.divisions = divisions;
  }

  const beats = readNumber(
    attributes.querySelector(':scope > time > beats'),
    state.timeSignature.numerator,
  );

  const beatType = readNumber(
    attributes.querySelector(':scope > time > beat-type'),
    state.timeSignature.denominator,
  );

  state.timeSignature = {
    numerator: beats,
    denominator: beatType,
  };

  const fifths = readNumber(
    attributes.querySelector(':scope > key > fifths'),
    state.keySignature.fifths,
  );

  const modeText = readText(attributes.querySelector(':scope > key > mode')).toLowerCase();

  const scaleMode: ScoreScaleMode = modeText === 'minor' ? 'minor' : 'major';

  state.keySignature = keyFromFifths(fifths, scaleMode);
}

function updateTempo(element: Element, state: ParseState): void {
  const sound = element.querySelector(':scope > direction sound[tempo]');

  const soundTempo = Number(sound?.getAttribute('tempo'));

  if (Number.isFinite(soundTempo) && soundTempo > 0) {
    state.tempo = soundTempo;

    return;
  }

  const perMinute = readNumber(
    element.querySelector(':scope > direction metronome > per-minute'),
    0,
  );

  if (perMinute > 0) {
    state.tempo = perMinute;
  }
}

function parsePitch(noteElement: Element): {
  noteIndex: number;
  octave: number;
  midi: number;
} | null {
  const step = readText(noteElement.querySelector(':scope > pitch > step')).toUpperCase();

  const octave = readNumber(noteElement.querySelector(':scope > pitch > octave'), Number.NaN);

  if (!(step in stepToNoteIndex) || !Number.isFinite(octave)) {
    return null;
  }

  const alter = readNumber(noteElement.querySelector(':scope > pitch > alter'), 0);

  const base = stepToNoteIndex[step] ?? 0;

  const noteIndex = normalizeNote(base + alter);

  const midi = (octave + 1) * 12 + noteIndex;

  return {
    noteIndex,
    octave,
    midi,
  };
}

function durationFromType(noteElement: Element): number {
  const type = readText(noteElement.querySelector(':scope > type'));

  const durationMap: Record<string, number> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    '16th': 0.25,
    '32nd': 0.125,
    '64th': 0.0625,
  };

  let duration = durationMap[type] ?? 1;

  if (noteElement.querySelector(':scope > dot')) {
    duration *= 1.5;
  }

  return duration;
}

function hasTie(noteElement: Element, type: 'start' | 'stop'): boolean {
  return Array.from(noteElement.querySelectorAll(':scope > tie')).some(
    (tie) => tie.getAttribute('type') === type,
  );
}

function keyFromFifths(fifths: number, scaleMode: ScoreScaleMode): ScoreKeySignature {
  const majorRoots: Record<number, number> = {
    [-7]: 11,
    [-6]: 6,
    [-5]: 1,
    [-4]: 8,
    [-3]: 3,
    [-2]: 10,
    [-1]: 5,
    [0]: 0,
    [1]: 7,
    [2]: 2,
    [3]: 9,
    [4]: 4,
    [5]: 11,
    [6]: 6,
    [7]: 1,
  };

  const minorRoots: Record<number, number> = {
    [-7]: 8,
    [-6]: 3,
    [-5]: 10,
    [-4]: 5,
    [-3]: 0,
    [-2]: 7,
    [-1]: 2,
    [0]: 9,
    [1]: 4,
    [2]: 11,
    [3]: 6,
    [4]: 1,
    [5]: 8,
    [6]: 3,
    [7]: 10,
  };

  return {
    fifths,
    rootNote: scaleMode === 'major' ? (majorRoots[fifths] ?? 0) : (minorRoots[fifths] ?? 9),
    scaleMode,
  };
}

function readText(element: Element | null): string {
  return element?.textContent?.trim() ?? '';
}

function readNumber(element: Element | null, fallback: number): number {
  const value = Number(element?.textContent?.trim());

  return Number.isFinite(value) ? value : fallback;
}

function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

function makeEventId(measureNumber: number, index: number): string {
  return `measure-${measureNumber}-event-${index}-${Math.random().toString(36).slice(2, 7)}`;
}
