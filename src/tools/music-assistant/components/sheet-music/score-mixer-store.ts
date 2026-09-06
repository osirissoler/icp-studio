import { reactive } from 'vue';

import type { ScorePart } from '../../shared/score';

export interface ScoreMixerChannelSettings {
  volume: number;

  muted: boolean;

  solo: boolean;
}

export type ScoreMixerSnapshot = Record<string, ScoreMixerChannelSettings>;

export interface ScoreMixerResolvedChannel {
  part: ScorePart;

  settings: ScoreMixerChannelSettings;
}

const DEFAULT_VOLUME = 80;

export const scoreMixerState = reactive<ScoreMixerSnapshot>({});

export function ensureScoreMixerChannel(partId: string): ScoreMixerChannelSettings {
  const existing = scoreMixerState[partId];

  if (existing) {
    return existing;
  }

  const created: ScoreMixerChannelSettings = {
    volume: DEFAULT_VOLUME,

    muted: false,

    solo: false,
  };

  scoreMixerState[partId] = created;

  return created;
}

export function scoreMixerChannel(partId: string): ScoreMixerChannelSettings {
  return ensureScoreMixerChannel(partId);
}

export function setScoreMixerVolume(partId: string, volume: number): void {
  const channel = ensureScoreMixerChannel(partId);

  channel.volume = normalizeVolume(volume);
}

export function toggleScoreMixerMute(partId: string): void {
  const channel = ensureScoreMixerChannel(partId);

  channel.muted = !channel.muted;
}

export function toggleScoreMixerSolo(partId: string): void {
  const channel = ensureScoreMixerChannel(partId);

  channel.solo = !channel.solo;
}

export function resetScoreMixerChannel(partId: string): void {
  const channel = ensureScoreMixerChannel(partId);

  channel.volume = DEFAULT_VOLUME;

  channel.muted = false;

  channel.solo = false;
}

export function resetScoreMixerParts(parts: ScorePart[]): void {
  parts.forEach((part) => {
    resetScoreMixerChannel(part.id);
  });
}

export function removeScoreMixerChannel(partId: string): void {
  delete scoreMixerState[partId];
}

export function clearScoreMixer(): void {
  Object.keys(scoreMixerState).forEach((partId) => {
    delete scoreMixerState[partId];
  });
}

export function scoreMixerSnapshot(parts?: ScorePart[]): ScoreMixerSnapshot {
  const partIds = parts ? new Set(parts.map((part) => part.id)) : null;

  const result: ScoreMixerSnapshot = {};

  Object.entries(scoreMixerState).forEach(([partId, settings]) => {
    if (partIds && !partIds.has(partId)) {
      return;
    }

    result[partId] = {
      volume: settings.volume,

      muted: settings.muted,

      solo: settings.solo,
    };
  });

  if (parts) {
    parts.forEach((part) => {
      if (!result[part.id]) {
        const channel = ensureScoreMixerChannel(part.id);

        result[part.id] = {
          volume: channel.volume,

          muted: channel.muted,

          solo: channel.solo,
        };
      }
    });
  }

  return result;
}

export function restoreScoreMixerSnapshot(snapshot: ScoreMixerSnapshot): void {
  clearScoreMixer();

  Object.entries(snapshot).forEach(([partId, settings]) => {
    scoreMixerState[partId] = {
      volume: normalizeVolume(settings.volume),

      muted: Boolean(settings.muted),

      solo: Boolean(settings.solo),
    };
  });
}

export function resolveScoreMixerChannels(parts: ScorePart[]): ScoreMixerResolvedChannel[] {
  if (!parts.length) {
    return [];
  }

  const channels = parts.map((part) => ({
    part,

    settings: ensureScoreMixerChannel(part.id),
  }));

  /*
   * "Escuchar" una sola voz es una audición
   * directa. Debe escucharse incluso si el
   * canal está silenciado en la mezcla general.
   */
  if (channels.length === 1) {
    return channels;
  }

  const soloChannels = channels.filter(
    ({ settings }) => settings.solo && !settings.muted && settings.volume > 0,
  );

  if (soloChannels.length) {
    return soloChannels;
  }

  return channels.filter(({ settings }) => !settings.muted && settings.volume > 0);
}

export function scoreMixerHasSolo(parts: ScorePart[]): boolean {
  return parts.some((part) => ensureScoreMixerChannel(part.id).solo);
}

export function scoreMixerActiveCount(parts: ScorePart[]): number {
  return resolveScoreMixerChannels(parts).length;
}

export function mixerVolumeFactor(volume: number): number {
  return normalizeVolume(volume) / 100;
}

function normalizeVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return DEFAULT_VOLUME;
  }

  return Math.min(100, Math.max(0, Math.round(volume)));
}
