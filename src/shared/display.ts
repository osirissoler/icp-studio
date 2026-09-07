export const DISPLAY_CHANNELS = {
  list: 'display:list',
  changed: 'display:changed',
  getStatus: 'display:get-status',
  applyConfiguration: 'display:apply-configuration',
  identify: 'display:identify',
  statusChanged: 'display:status-changed',
} as const;

export interface DisplayBounds { x: number; y: number; width: number; height: number; }
export interface DisplayInfo { id: number; label: string; isPrimary: boolean; bounds: DisplayBounds; scaleFactor: number; }
export type DisplayConfigurationMode = 'automatic' | 'custom';
export interface DisplayReference { id: number | null; label: string; bounds: DisplayBounds; scaleFactor: number; }

export interface ProjectionOutputConfiguration {
  outputId: string;
  name: string;
  enabled: boolean;
  displays: DisplayReference[];
  /** Primera pantalla del grupo, solo para compatibilidad temporal. */
  display: DisplayReference | null;
}

export interface ActiveProjectionOutput {
  outputId: string;
  name: string;
  displayIds: number[];
  /** Primera pantalla del grupo, solo para compatibilidad temporal. */
  displayId: number;
}

export interface ProjectionOutputAssignmentRequest {
  outputId?: string | undefined;
  name: string;
  enabled: boolean;
  displayIds: number[];
  /** Compatibilidad con formularios anteriores. */
  displayId?: number | null | undefined;
}

export interface DisplayConfiguration {
  mode: DisplayConfigurationMode;
  independentProjectionEnabled: boolean;
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
  independentProjectionEnabled?: boolean;
  projectionDisplayIds: number[];
  audioDisplayId: number | null;
  projectionOutputs?: ProjectionOutputAssignmentRequest[];
  outputNames?: Record<number, string>;
}
