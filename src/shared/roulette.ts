export interface RouletteOption {
  id: string;
  label: string;
  color: string;
}

export interface RoulettePresentationData {
  id: string;
  title: string;
  options: RouletteOption[];
  rotation: number;
  winnerId: string;
  spinning: boolean;
  spinDuration: number;
}

export interface SavedRoulette {
  id: string;
  title: string;
  options: RouletteOption[];
  allowRepeats: boolean;
  removeWinner: boolean;
  updatedAt: string;
}
