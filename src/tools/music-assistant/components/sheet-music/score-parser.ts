import type {
  ScoreClef,
  ScoreClefSign,
  ScoreDocument,
  ScoreEvent,
  ScoreKeySignature,
  ScoreMeasure,
  ScorePart,
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

  clef: ScoreClef;
}

interface ParsedPartResult {
  part: ScorePart;

  tempo: number;

  divisions: number;

  timeSignature: ScoreTimeSignature;

  keySignature: ScoreKeySignature;
}

interface PartMetadata {
  name: string;

  abbreviation: string;
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

  const partElements = Array.from(scorePartwise.children).filter(
    (element) => element.tagName === 'part',
  );

  if (!partElements.length) {
    throw new Error('La partitura no contiene ninguna parte musical.');
  }

  const title =
    readText(scorePartwise.querySelector('work > work-title')) ||
    readText(scorePartwise.querySelector('movement-title')) ||
    sourceFileName;

  const metadata = readPartMetadata(scorePartwise);

  const parsedParts = partElements.map((partElement, partIndex) =>
    parsePart(partElement, partIndex, metadata),
  );

  const parts = parsedParts.map((result) => result.part);

  const primary = parsedParts[0];

  if (!primary) {
    throw new Error('No fue posible interpretar las partes de la partitura.');
  }

  const totalNotes = parts.reduce((total, part) => total + countNotes(part.measures), 0);

  if (!totalNotes) {
    throw new Error('No se encontraron notas musicales en la partitura.');
  }

  return {
    id: `score-${Date.now()}`,

    title,

    sourceFileName,

    tempo: primary.tempo,

    divisions: primary.divisions,

    timeSignature: primary.timeSignature,

    keySignature: primary.keySignature,

    /**
     * Compatibilidad temporal:
     * el motor anterior seguirá usando
     * la primera parte como melodía principal.
     */
    measures: primary.part.measures,

    parts,
  };
}

function parsePart(
  partElement: Element,
  partIndex: number,
  metadata: Map<string, PartMetadata>,
): ParsedPartResult {
  const partId = partElement.getAttribute('id') || `part-${partIndex + 1}`;

  const partMetadata = metadata.get(partId);

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

    clef: {
      sign: 'unknown',
      line: null,
      octaveChange: 0,
    },
  };

  const measures: ScoreMeasure[] = [];

  let absoluteBeatCursor = 0;

  const measureElements = Array.from(partElement.children).filter(
    (element) => element.tagName === 'measure',
  );

  measureElements.forEach((measureElement, measureIndex) => {
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

      const voice = readText(element.querySelector(':scope > voice')) || undefined;

      const staffNumber = readOptionalNumber(element.querySelector(':scope > staff'));

      const id = makeEventId(partId, measureNumber, measureEvents.length);

      if (element.querySelector(':scope > rest')) {
        measureEvents.push({
          id,

          type: 'rest',

          measureNumber,

          startBeat: noteStartBeat,

          absoluteBeat: absoluteBeatCursor + noteStartBeat,

          durationBeats,

          voice,

          staff: staffNumber,
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

            voice,

            staff: staffNumber,
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

      timeSignature: {
        ...state.timeSignature,
      },

      keySignature: {
        ...state.keySignature,
      },
    });

    absoluteBeatCursor += measureBeats;
  });

  if (!measures.length) {
    throw new Error(
      `La parte "${partMetadata?.name || partId}" no contiene compases reconocibles.`,
    );
  }

  return {
    part: {
      id: partId,

      name: partMetadata?.name || `Parte ${partIndex + 1}`,

      abbreviation: partMetadata?.abbreviation || '',

      source: 'original',

      clef: {
        ...state.clef,
      },

      measures,
    },

    tempo: state.tempo,

    divisions: state.divisions,

    timeSignature: {
      ...state.timeSignature,
    },

    keySignature: {
      ...state.keySignature,
    },
  };
}

function readPartMetadata(scorePartwise: Element): Map<string, PartMetadata> {
  const result = new Map<string, PartMetadata>();

  const partList = scorePartwise.querySelector(':scope > part-list');

  if (!partList) {
    return result;
  }

  Array.from(partList.children)
    .filter((element) => element.tagName === 'score-part')
    .forEach((element) => {
      const id = element.getAttribute('id');

      if (!id) {
        return;
      }

      result.set(id, {
        name: readText(element.querySelector(':scope > part-name')) || id,

        abbreviation: readText(element.querySelector(':scope > part-abbreviation')),
      });
    });

  return result;
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

  if (beats > 0 && beatType > 0) {
    state.timeSignature = {
      numerator: beats,

      denominator: beatType,
    };
  }

  const fifths = readNumber(
    attributes.querySelector(':scope > key > fifths'),
    state.keySignature.fifths,
  );

  const modeText = readText(attributes.querySelector(':scope > key > mode')).toLowerCase();

  const scaleMode: ScoreScaleMode =
    modeText === 'minor'
      ? 'minor'
      : state.keySignature.scaleMode === 'minor' && !modeText
        ? 'minor'
        : 'major';

  state.keySignature = keyFromFifths(fifths, scaleMode);

  const clefElement = attributes.querySelector(':scope > clef');

  if (clefElement) {
    state.clef = parseClef(clefElement);
  }
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

function parseClef(clefElement: Element): ScoreClef {
  const rawSign = readText(clefElement.querySelector(':scope > sign'));

  const allowedSigns: ScoreClefSign[] = ['G', 'F', 'C', 'percussion', 'TAB', 'none'];

  const sign: ScoreClefSign = allowedSigns.includes(rawSign as ScoreClefSign)
    ? (rawSign as ScoreClefSign)
    : 'unknown';

  const line = readOptionalNumber(clefElement.querySelector(':scope > line')) ?? null;

  const octaveChange = readNumber(clefElement.querySelector(':scope > clef-octave-change'), 0);

  return {
    sign,

    line,

    octaveChange,
  };
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

  const absoluteSemitone = base + alter;

  const octaveOffset = Math.floor(absoluteSemitone / 12);

  const noteIndex = normalizeNote(absoluteSemitone);

  const correctedOctave = octave + octaveOffset;

  const midi = (correctedOctave + 1) * 12 + noteIndex;

  return {
    noteIndex,

    octave: correctedOctave,

    midi,
  };
}

function durationFromType(noteElement: Element): number {
  const type = readText(noteElement.querySelector(':scope > type'));

  const durationMap: Record<string, number> = {
    maxima: 32,

    long: 16,

    breve: 8,

    whole: 4,

    half: 2,

    quarter: 1,

    eighth: 0.5,

    '16th': 0.25,

    '32nd': 0.125,

    '64th': 0.0625,

    '128th': 0.03125,

    '256th': 0.015625,
  };

  let duration = durationMap[type] ?? 1;

  const dotCount = noteElement.querySelectorAll(':scope > dot').length;

  let additional = duration / 2;

  for (let index = 0; index < dotCount; index += 1) {
    duration += additional;

    additional /= 2;
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

function countNotes(measures: ScoreMeasure[]): number {
  return measures.reduce(
    (total, measure) => total + measure.events.filter((event) => event.type === 'note').length,
    0,
  );
}

function readText(element: Element | null): string {
  return element?.textContent?.trim() ?? '';
}

function readNumber(element: Element | null, fallback: number): number {
  const value = Number(element?.textContent?.trim());

  return Number.isFinite(value) ? value : fallback;
}

function readOptionalNumber(element: Element | null): number | undefined {
  if (!element) {
    return undefined;
  }

  const value = Number(element.textContent?.trim());

  return Number.isFinite(value) ? value : undefined;
}

function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

function makeEventId(partId: string, measureNumber: number, index: number): string {
  return `${partId}-measure-${measureNumber}-event-${index}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
