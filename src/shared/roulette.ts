export interface RouletteOption {
  id: string;
  label: string;
  color: string;
}

export type RouletteLabelMode = 'full' | 'first-word' | 'short' | 'colors-text' | 'hidden';
export type RouletteWinnerTextSize = 'small' | 'medium' | 'large';
export type RouletteConfettiIntensity = 'low' | 'medium' | 'high';
export type RouletteWinnerSoundPreset = 'chime' | 'crowd' | 'custom';

export interface RoulettePresentationData {
  id: string;
  title: string;
  options: RouletteOption[];
  rotation: number;
  winnerId: string;
  pendingWinnerId: string;
  spinning: boolean;
  spinDuration: number;
  spinStartedAt: number;
  timedSpin: boolean;
  allowRepeats: boolean;
  removeWinner: boolean;
  usedWinnerIds: string[];
  labelMode: RouletteLabelMode;
  backgroundColor: string;
  showTitle: boolean;
  winnerTextSize: RouletteWinnerTextSize;
  confettiEnabled: boolean;
  confettiIntensity: RouletteConfettiIntensity;
  confettiDuration: number;
  soundEnabled: boolean;
  soundVolume: number;
  spinSoundEnabled: boolean;
  brakeSoundEnabled: boolean;
  winnerSoundEnabled: boolean;
  winnerSoundPreset: RouletteWinnerSoundPreset;
  customWinnerSoundUrl: string;
  customWinnerSoundName: string;
}

export interface SavedRoulette {
  id: string;
  title: string;
  options: RouletteOption[];
  allowRepeats: boolean;
  removeWinner: boolean;
  labelMode: RouletteLabelMode;
  durationValue: number;
  durationUnit: 'seconds' | 'minutes';
  useTimer: boolean;
  backgroundColor: string;
  showTitle: boolean;
  winnerTextSize: RouletteWinnerTextSize;
  confettiEnabled: boolean;
  confettiIntensity: RouletteConfettiIntensity;
  confettiDuration: number;
  soundEnabled: boolean;
  soundVolume: number;
  spinSoundEnabled: boolean;
  brakeSoundEnabled: boolean;
  winnerSoundEnabled: boolean;
  winnerSoundPreset: RouletteWinnerSoundPreset;
  customWinnerSoundUrl: string;
  customWinnerSoundName: string;
  updatedAt: string;
}

export interface RouletteLiveResult {
  id: string;
  rouletteId: string;
  rouletteTitle: string;
  optionId: string;
  label: string;
  color: string;
  createdAt: string;
}
