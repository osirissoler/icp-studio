export type ThemeBackgroundType = 'solid' | 'gradient' | 'image';
export type ThemeHorizontalAlign = 'left' | 'center' | 'right';
export type ThemeVerticalAlign = 'top' | 'center' | 'bottom';
export type AudioVisualizerType = 'bars' | 'wave' | 'circle' | 'spectrum';

export interface ProjectionTheme {
  id: string;
  name: string;
  isBuiltin: boolean;
  backgroundType: ThemeBackgroundType;
  backgroundColor: string;
  gradientColor: string;
  backgroundImageUrl: string;
  overlayOpacity: number;
  textColor: string;
  footerColor: string;
  fontFamily: string;
  fontWeight: number;
  fontScale: number;
  horizontalAlign: ThemeHorizontalAlign;
  verticalAlign: ThemeVerticalAlign;
}

export interface AudioVisualizerSettings {
  type: AudioVisualizerType;
  inheritThemeColors: boolean;
  primaryColor: string;
  secondaryColor: string;
  sensitivity: number;
  showTitle: boolean;
}

export interface StoredProjectionSettings {
  themes: ProjectionTheme[];
  activeThemeId: string;
  audioVisualizer: AudioVisualizerSettings;
}
