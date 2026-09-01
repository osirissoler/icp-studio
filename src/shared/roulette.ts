export interface RouletteOption {
  id: string;
  label: string;
  color: string;
}

export type RouletteLabelMode = 'full' | 'first-word' | 'short' | 'colors-text' | 'hidden';

export interface RoulettePresentationData {
  id: string;
  title: string;
  options: RouletteOption[];
  rotation: number;
  winnerId: string;
  spinning: boolean;
  spinDuration: number;
  labelMode: RouletteLabelMode;
}

export interface SavedRoulette {
  id: string;
  title: string;
  options: RouletteOption[];
  allowRepeats: boolean;
  removeWinner: boolean;
  labelMode: RouletteLabelMode;
  updatedAt: string;
}
