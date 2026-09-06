import {
  scorePartToTimeline,
  type ScoreDocument,
  type ScorePart,
  type ScoreTimelineNote,
} from '../../shared/score';

import {
  analyzeHarmonicContexts,
  harmonicContextAtBeat,
  isChordTone,
} from './harmonic-context-engine';

export interface HarmonyDiagnosticRow {
  id: string;

  measureNumber: number;

  beat: number;

  absoluteBeat: number;

  sourceMidi: number | null;

  generatedMidi: number;

  intervalSemitones: number | null;

  intervalLabel: string;

  chordTone: boolean;

  chordConfidence: number;

  inRange: boolean;

  crossing: boolean;

  collision: boolean;

  largeLeap: boolean;

  manual: boolean;

  issues: string[];
}

export interface HarmonyDiagnosticSummary {
  totalNotes: number;

  issueNotes: number;

  chordToneNotes: number;

  chordTonePercent: number;

  crossings: number;

  collisions: number;

  largeLeaps: number;

  outOfRange: number;

  manualCorrections: number;

  rows: HarmonyDiagnosticRow[];
}

export function analyzeGeneratedVoice(
  score: ScoreDocument,
  part: ScorePart,
): HarmonyDiagnosticSummary {
  const sourcePart = (score.parts ?? []).find(
    (candidate) => candidate.id === part.generatedFromPartId,
  );

  const generatedTimeline = scorePartToTimeline(score, part);

  const sourceTimeline = sourcePart ? scorePartToTimeline(score, sourcePart) : [];

  const peerTimelines = (score.parts ?? [])
    .filter((candidate) => candidate.id !== part.id && candidate.id !== sourcePart?.id)
    .map((candidate) => scorePartToTimeline(score, candidate));

  const contexts = analyzeHarmonicContexts(score);

  const range = resolvePartRange(part);

  let previousMidi: number | null = null;

  const rows = generatedTimeline.map((note) => {
    const source = findSourceAtBeat(sourceTimeline, note.absoluteBeat);

    const context = harmonicContextAtBeat(contexts, note.absoluteBeat);

    const interval = source ? note.midi - source.midi : null;

    const crossing = source ? isCrossing(note.midi, source.midi, part) : false;

    const collision = peerTimelines.some((timeline) => {
      const peer = activeNoteAtBeat(timeline, note.absoluteBeat);

      if (!peer) {
        return false;
      }

      return Math.abs(peer.midi - note.midi) <= 1;
    });

    const largeLeap = previousMidi !== null && Math.abs(note.midi - previousMidi) > 12;

    const inRange = note.midi >= range.minimum && note.midi <= range.maximum;

    const chordTone = context ? isChordTone(note.midi, context) : true;

    const issues: string[] = [];

    if (!inRange) {
      issues.push('Fuera del rango');
    }

    if (crossing) {
      issues.push('Cruce con voz base');
    }

    if (collision) {
      issues.push('Choque con otra voz');
    }

    if (largeLeap) {
      issues.push('Salto mayor de octava');
    }

    if (interval !== null) {
      const intervalClass = Math.abs(interval) % 12;

      if (intervalClass === 1) {
        issues.push('Segunda menor directa');
      }

      if (intervalClass === 6) {
        issues.push('Trítono directo');
      }
    }

    if (context && context.confidence >= 0.65 && !chordTone) {
      issues.push('Fuera del acorde');
    }

    const row: HarmonyDiagnosticRow = {
      id: note.id,

      measureNumber: note.measureNumber,

      beat: note.startBeat,

      absoluteBeat: note.absoluteBeat,

      sourceMidi: source?.midi ?? null,

      generatedMidi: note.midi,

      intervalSemitones: interval,

      intervalLabel: intervalLabel(interval),

      chordTone,

      chordConfidence: context?.confidence ?? 0,

      inRange,

      crossing,

      collision,

      largeLeap,

      manual: Boolean(
        part.generatedManualOverrides?.some((override) => override.noteId === note.id),
      ),

      issues,
    };

    previousMidi = note.midi;

    return row;
  });

  const chordToneNotes = rows.filter((row) => row.chordTone).length;

  return {
    totalNotes: rows.length,

    issueNotes: rows.filter((row) => row.issues.length > 0).length,

    chordToneNotes,

    chordTonePercent: rows.length ? Math.round((chordToneNotes / rows.length) * 100) : 100,

    crossings: rows.filter((row) => row.crossing).length,

    collisions: rows.filter((row) => row.collision).length,

    largeLeaps: rows.filter((row) => row.largeLeap).length,

    outOfRange: rows.filter((row) => !row.inRange).length,

    manualCorrections: rows.filter((row) => row.manual).length,

    rows,
  };
}

function findSourceAtBeat(timeline: ScoreTimelineNote[], beat: number): ScoreTimelineNote | null {
  const exact = timeline.find((note) => Math.abs(note.absoluteBeat - beat) < 0.0001);

  if (exact) {
    return exact;
  }

  return activeNoteAtBeat(timeline, beat);
}

function activeNoteAtBeat(timeline: ScoreTimelineNote[], beat: number): ScoreTimelineNote | null {
  return (
    timeline.find(
      (note) =>
        note.absoluteBeat <= beat + 0.0001 &&
        note.absoluteBeat + note.durationBeats > beat + 0.0001,
    ) ?? null
  );
}

function isCrossing(generatedMidi: number, sourceMidi: number, part: ScorePart): boolean {
  const placement = part.generatedVoiceConfig?.placement ?? parsePlacement(part.generatedVoiceType);

  if (placement === 'above') {
    return generatedMidi <= sourceMidi;
  }

  return generatedMidi >= sourceMidi;
}

function resolvePartRange(part: ScorePart): {
  minimum: number;

  maximum: number;
} {
  const config = part.generatedVoiceConfig;

  if (config?.minMidi !== undefined && config.maxMidi !== undefined) {
    return {
      minimum: config.minMidi,

      maximum: config.maxMidi,
    };
  }

  const kind = config?.kind ?? parseKind(part.generatedVoiceType);

  const placement = config?.placement ?? parsePlacement(part.generatedVoiceType);

  if (kind === 'second') {
    return placement === 'above'
      ? {
          minimum: 55,
          maximum: 88,
        }
      : {
          minimum: 48,
          maximum: 79,
        };
  }

  if (kind === 'tenor') {
    return placement === 'above'
      ? {
          minimum: 52,
          maximum: 79,
        }
      : {
          minimum: 45,
          maximum: 74,
        };
  }

  if (kind === 'baritone') {
    return placement === 'above'
      ? {
          minimum: 48,
          maximum: 74,
        }
      : {
          minimum: 40,
          maximum: 69,
        };
  }

  if (kind === 'bass') {
    return placement === 'above'
      ? {
          minimum: 43,
          maximum: 69,
        }
      : {
          minimum: 32,
          maximum: 60,
        };
  }

  return {
    minimum: 36,

    maximum: 88,
  };
}

function parseKind(value: string | undefined): 'second' | 'tenor' | 'baritone' | 'bass' | 'custom' {
  const raw = (value ?? '').split(':')[0];

  if (raw === 'tenor' || raw === 'baritone' || raw === 'bass' || raw === 'custom') {
    return raw;
  }

  return 'second';
}

function parsePlacement(value: string | undefined): 'above' | 'below' {
  return (value ?? '').split(':')[1] === 'below' ? 'below' : 'above';
}

function intervalLabel(semitones: number | null): string {
  if (semitones === null) {
    return '--';
  }

  const direction = semitones > 0 ? '↑' : semitones < 0 ? '↓' : '=';

  const absolute = Math.abs(semitones);

  const intervalClass = absolute % 12;

  const names: Record<number, string> = {
    0: 'Unísono',
    1: '2ª m',
    2: '2ª M',
    3: '3ª m',
    4: '3ª M',
    5: '4ª',
    6: 'Tritono',
    7: '5ª',
    8: '6ª m',
    9: '6ª M',
    10: '7ª m',
    11: '7ª M',
  };

  const octaveCount = Math.floor(absolute / 12);

  if (octaveCount > 0 && intervalClass === 0) {
    return `${direction} ${octaveCount === 1 ? '8ª' : `${octaveCount} octavas`}`;
  }

  return `${direction} ${names[intervalClass] ?? `${absolute} st`}`;
}
