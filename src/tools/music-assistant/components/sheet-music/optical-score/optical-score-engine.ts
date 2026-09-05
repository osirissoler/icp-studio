import type { ScoreDocument, ScoreEvent, ScoreMeasure } from '../../../shared/score';

import { preprocessScorePage } from './image-preprocessor';

import { detectNotesForStaff } from './note-detector';

import { detectStaves } from './staff-detector';

import type {
  OpticalDetectedNote,
  OpticalScoreAnalysis,
  OpticalScoreDocument,
  OpticalPageAnalysis,
} from './optical-score-types';

const DEFAULT_TEMPO = 90;

const DEFAULT_BEATS_PER_MEASURE = 4;

export async function analyzeOpticalScore(
  document: OpticalScoreDocument,
  onProgress?: (pageNumber: number, totalPages: number) => void,
): Promise<{
  analysis: OpticalScoreAnalysis;
  score: ScoreDocument;
}> {
  const pageAnalyses: OpticalPageAnalysis[] = [];

  for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex += 1) {
    const page = document.pages[pageIndex]!;

    onProgress?.(pageIndex + 1, document.pages.length);

    const image = await preprocessScorePage(page);

    const staves = detectStaves(image, page.pageNumber);

    const notes = staves.flatMap((staff) => detectNotesForStaff(image, staff));

    pageAnalyses.push({
      pageNumber: page.pageNumber,
      staffCount: staves.length,
      noteCount: notes.length,
      staves,
      notes,
    });
  }

  const allNotes = pageAnalyses.flatMap((page) => page.notes).sort(compareDetectedNotes);

  const averageConfidence =
    allNotes.length > 0
      ? allNotes.reduce((total, note) => total + note.confidence, 0) / allNotes.length
      : 0;

  const analysis: OpticalScoreAnalysis = {
    pages: pageAnalyses,
    notes: allNotes,
    staffCount: pageAnalyses.reduce((total, page) => total + page.staffCount, 0),
    noteCount: allNotes.length,
    averageConfidence,
  };

  if (!analysis.staffCount) {
    throw new Error(
      'No se detectaron pentagramas. Utiliza una partitura impresa con buena resolución y contraste.',
    );
  }

  if (!analysis.noteCount) {
    throw new Error(
      'Se detectaron pentagramas, pero todavía no fue posible identificar notas con suficiente confianza.',
    );
  }

  return {
    analysis,
    score: createScoreDocument(document, allNotes),
  };
}

function createScoreDocument(
  document: OpticalScoreDocument,
  notes: OpticalDetectedNote[],
): ScoreDocument {
  const measures: ScoreMeasure[] = [];

  let currentMeasureNumber = 1;

  let measureBeat = 0;

  let absoluteBeat = 0;

  let currentEvents: ScoreEvent[] = [];

  function closeMeasure(): void {
    measures.push({
      number: currentMeasureNumber,
      beats: DEFAULT_BEATS_PER_MEASURE,
      events: currentEvents,
    });

    currentMeasureNumber += 1;

    currentEvents = [];

    measureBeat = 0;
  }

  notes.forEach((note) => {
    let duration = normalizeDuration(note.durationBeats);

    if (measureBeat > 0 && measureBeat + duration > DEFAULT_BEATS_PER_MEASURE) {
      closeMeasure();
    }

    if (duration > DEFAULT_BEATS_PER_MEASURE) {
      duration = DEFAULT_BEATS_PER_MEASURE;
    }

    currentEvents.push({
      id: note.id,
      type: 'note',
      measureNumber: currentMeasureNumber,
      startBeat: measureBeat,
      absoluteBeat,
      durationBeats: duration,
      pitch: {
        noteIndex: note.noteIndex,
        octave: note.octave,
        midi: note.midi,
      },
      tieStart: false,
      tieStop: false,
    });

    measureBeat += duration;

    absoluteBeat += duration;

    if (measureBeat >= DEFAULT_BEATS_PER_MEASURE) {
      closeMeasure();
    }
  });

  if (currentEvents.length) {
    measures.push({
      number: currentMeasureNumber,
      beats: Math.max(DEFAULT_BEATS_PER_MEASURE, measureBeat),
      events: currentEvents,
    });
  }

  return {
    id: createId('optical-score'),
    title: removeExtension(document.sourceFileName),
    sourceFileName: document.sourceFileName,
    tempo: DEFAULT_TEMPO,
    divisions: 1,
    timeSignature: {
      numerator: DEFAULT_BEATS_PER_MEASURE,
      denominator: 4,
    },
    keySignature: {
      fifths: 0,
      rootNote: 0,
      scaleMode: 'major',
    },
    measures,
  };
}

function compareDetectedNotes(left: OpticalDetectedNote, right: OpticalDetectedNote): number {
  if (left.pageNumber !== right.pageNumber) {
    return left.pageNumber - right.pageNumber;
  }

  const leftStaff = extractStaffNumber(left.staffId);

  const rightStaff = extractStaffNumber(right.staffId);

  if (leftStaff !== rightStaff) {
    return leftStaff - rightStaff;
  }

  return left.x - right.x;
}

function extractStaffNumber(staffId: string): number {
  const match = /-(\d+)$/.exec(staffId);

  return match ? Number(match[1]) : 0;
}

function normalizeDuration(duration: number): number {
  if (duration >= 3) {
    return 4;
  }

  if (duration >= 1.5) {
    return 2;
  }

  return 1;
}

function removeExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
