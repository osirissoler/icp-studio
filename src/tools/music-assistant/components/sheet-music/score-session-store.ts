import {
  generatedScoreParts,
  originalScoreParts,
  type ScoreDocument,
  type ScorePart,
} from '../../shared/score';

import type { ScoreMixerChannelSettings, ScoreMixerSnapshot } from './score-mixer-store';

const SESSION_VERSION = 1;

const STORAGE_PREFIX = 'icp-studio:sheet-music:session:';

export interface ScoreSessionState {
  version: number;

  tempo: number;

  generatedParts: ScorePart[];

  selectedOriginalPartIds: string[];

  selectedGeneratedPartIds: string[];

  generationSourcePartId: string | null;

  mixer: ScoreMixerSnapshot;

  updatedAt: number;
}

export interface SaveScoreSessionInput {
  selectedOriginalPartIds: string[];

  selectedGeneratedPartIds: string[];

  generationSourcePartId: string | null;

  mixer: ScoreMixerSnapshot;
}

export function loadScoreSession(score: ScoreDocument): ScoreSessionState | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(scoreSessionStorageKey(score));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ScoreSessionState>;

    if (
      parsed.version !== SESSION_VERSION ||
      !Array.isArray(parsed.generatedParts) ||
      !Array.isArray(parsed.selectedOriginalPartIds) ||
      !Array.isArray(parsed.selectedGeneratedPartIds) ||
      !isMixerSnapshot(parsed.mixer)
    ) {
      return null;
    }

    return {
      version: SESSION_VERSION,

      tempo: normalizeTempo(parsed.tempo ?? score.tempo),

      generatedParts: parsed.generatedParts,

      selectedOriginalPartIds: parsed.selectedOriginalPartIds.filter(isString),

      selectedGeneratedPartIds: parsed.selectedGeneratedPartIds.filter(isString),

      generationSourcePartId:
        typeof parsed.generationSourcePartId === 'string' ? parsed.generationSourcePartId : null,

      mixer: parsed.mixer,

      updatedAt: Number.isFinite(parsed.updatedAt) ? Number(parsed.updatedAt) : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveScoreSession(score: ScoreDocument, input: SaveScoreSessionInput): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const state: ScoreSessionState = {
    version: SESSION_VERSION,

    tempo: normalizeTempo(score.tempo),

    generatedParts: generatedScoreParts(score),

    selectedOriginalPartIds: [...input.selectedOriginalPartIds],

    selectedGeneratedPartIds: [...input.selectedGeneratedPartIds],

    generationSourcePartId: input.generationSourcePartId,

    mixer: input.mixer,

    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(scoreSessionStorageKey(score), JSON.stringify(state));
  } catch {
    // Si el almacenamiento local no está disponible,
    // la partitura continúa funcionando normalmente.
  }
}

export function applySavedSessionToScore(
  score: ScoreDocument,
  session: ScoreSessionState,
): ScoreDocument {
  const originals = originalScoreParts(score);

  return {
    ...score,

    tempo: normalizeTempo(session.tempo),

    parts: [...originals, ...session.generatedParts],
  };
}

export function scoreSessionStorageKey(score: ScoreDocument): string {
  const originals = originalScoreParts(score);

  const fingerprint = [
    score.sourceFileName ?? '',
    score.title ?? '',
    originals.map((part) => part.id).join('|'),
  ].join('::');

  return `${STORAGE_PREFIX}${simpleHash(fingerprint)}`;
}

function isMixerSnapshot(value: unknown): value is ScoreMixerSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(isMixerChannel);
}

function isMixerChannel(value: unknown): value is ScoreMixerChannelSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const channel = value as Partial<ScoreMixerChannelSettings>;

  return (
    Number.isFinite(channel.volume) &&
    typeof channel.muted === 'boolean' &&
    typeof channel.solo === 'boolean'
  );
}

function normalizeTempo(value: number): number {
  if (!Number.isFinite(value)) {
    return 85;
  }

  return Math.min(220, Math.max(30, Math.round(value)));
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function simpleHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);

    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}
