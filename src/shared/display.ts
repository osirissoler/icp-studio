export const DISPLAY_CHANNELS = {
  list: 'display:list',
  changed: 'display:changed',
} as const;

export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayInfo {
  id: number;
  label: string;
  isPrimary: boolean;
  bounds: DisplayBounds;
  scaleFactor: number;
}
