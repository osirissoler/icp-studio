import { reactive } from 'vue';

export interface ScorePlaybackState {
  activeBeat: number | null;

  playing: boolean;
}

export const scorePlaybackState = reactive<ScorePlaybackState>({
  activeBeat: null,

  playing: false,
});

export function startScorePlayback(): void {
  scorePlaybackState.activeBeat = null;

  scorePlaybackState.playing = true;
}

export function setScorePlaybackBeat(absoluteBeat: number): void {
  scorePlaybackState.activeBeat = absoluteBeat;

  scorePlaybackState.playing = true;
}

export function stopScorePlayback(): void {
  scorePlaybackState.activeBeat = null;

  scorePlaybackState.playing = false;
}
