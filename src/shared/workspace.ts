export type WorkspacePanelId =
  'search' | 'upcomingActivities' | 'preview' | 'service' | 'live' | 'monitors';

export type WorkspaceLayoutPreset =
  | 'single-single-single'
  | 'split-single-single'
  | 'single-split-single'
  | 'single-single-split'
  | 'split-split-single'
  | 'split-single-split'
  | 'single-split-split'
  | 'split-split-split';

export const WORKSPACE_PANEL_LABELS: Record<WorkspacePanelId, string> = {
  search: 'Búsqueda y contenido',
  upcomingActivities: 'Próximas actividades',
  preview: 'Previsualización',
  service: 'Servicio',
  live: 'En vivo',
  monitors: 'Monitores',
};
