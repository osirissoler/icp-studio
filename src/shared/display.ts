export const DISPLAY_CHANNELS = {
  list: 'display:list',
  changed: 'display:changed',
  getStatus: 'display:get-status',
  applyConfiguration: 'display:apply-configuration',
  identify: 'display:identify',
  statusChanged: 'display:status-changed',
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

export type DisplayConfigurationMode = 'automatic' | 'custom';

export interface DisplayReference {
  id: number | null;
  label: string;
  bounds: DisplayBounds;
  scaleFactor: number;
}

export interface ProjectionOutputConfiguration {
  outputId: string;
  name: string;
  display: DisplayReference;
}

export interface ActiveProjectionOutput {
  outputId: string;
  name: string;
  displayId: number;
}

export interface DisplayConfiguration {
  mode: DisplayConfigurationMode;
  projectionDisplays: DisplayReference[];
  projectionOutputs: ProjectionOutputConfiguration[];
  audioDisplay: DisplayReference | null;
}

export interface DisplayStatus {
  displays: DisplayInfo[];
  configuration: DisplayConfiguration;
  activeProjectionDisplayIds: number[];
  activeProjectionOutputs: ActiveProjectionOutput[];
  audioDisplayId: number | null;
  usesOperatorDisplay: boolean;
}

export interface ApplyDisplayConfigurationRequest {
  mode: DisplayConfigurationMode;
  projectionDisplayIds: number[];
  audioDisplayId: number | null;
  outputNames?: Record<number, string>;
}
