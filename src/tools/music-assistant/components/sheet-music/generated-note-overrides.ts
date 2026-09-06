import type { ScoreGeneratedNoteOverride, ScorePart, ScorePitch } from '../../shared/score';

export function setGeneratedNoteOverride(part: ScorePart, noteId: string, midi: number): ScorePart {
  const safeMidi = clampMidi(midi);

  const previousOverride = part.generatedManualOverrides?.find(
    (override) => override.noteId === noteId,
  );

  const currentMidi = findNoteMidi(part, noteId);

  if (currentMidi === null) {
    return part;
  }

  const override: ScoreGeneratedNoteOverride = {
    noteId,

    originalMidi: previousOverride?.originalMidi ?? currentMidi,

    midi: safeMidi,
  };

  const preserved = (part.generatedManualOverrides ?? []).filter((item) => item.noteId !== noteId);

  return {
    ...applyMidiToNote(part, noteId, safeMidi),

    generatedManualOverrides: [...preserved, override],
  };
}

export function applyGeneratedNoteOverrides(
  part: ScorePart,
  overrides: ScoreGeneratedNoteOverride[] | undefined,
): ScorePart {
  if (!overrides?.length) {
    return {
      ...part,

      generatedManualOverrides: [],
    };
  }

  let nextPart: ScorePart = {
    ...part,

    generatedManualOverrides: [...overrides],
  };

  overrides.forEach((override) => {
    nextPart = applyMidiToNote(nextPart, override.noteId, override.midi);
  });

  return nextPart;
}

export function generatedNoteIsOverridden(part: ScorePart, noteId: string): boolean {
  return Boolean(part.generatedManualOverrides?.some((override) => override.noteId === noteId));
}

export function generatedNoteOverrideCount(part: ScorePart): number {
  return part.generatedManualOverrides?.length ?? 0;
}

export function withoutGeneratedNoteOverride(
  overrides: ScoreGeneratedNoteOverride[] | undefined,
  noteId: string,
): ScoreGeneratedNoteOverride[] {
  return (overrides ?? []).filter((override) => override.noteId !== noteId);
}

function findNoteMidi(part: ScorePart, noteId: string): number | null {
  for (const measure of part.measures) {
    const event = measure.events.find(
      (candidate) => candidate.type === 'note' && candidate.id === noteId,
    );

    if (event && event.type === 'note') {
      return event.pitch.midi;
    }
  }

  return null;
}

function applyMidiToNote(part: ScorePart, noteId: string, midi: number): ScorePart {
  return {
    ...part,

    measures: part.measures.map((measure) => ({
      ...measure,

      events: measure.events.map((event) => {
        if (event.type !== 'note' || event.id !== noteId) {
          return event;
        }

        return {
          ...event,

          pitch: midiToPitch(midi),
        };
      }),
    })),
  };
}

function midiToPitch(midi: number): ScorePitch {
  const safeMidi = clampMidi(midi);

  return {
    midi: safeMidi,

    noteIndex: normalizeNote(safeMidi),

    octave: Math.floor(safeMidi / 12) - 1,
  };
}

function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

function clampMidi(midi: number): number {
  return Math.min(127, Math.max(0, Math.round(midi)));
}
