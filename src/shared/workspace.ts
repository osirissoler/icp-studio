export type WorkspacePanelId =
  'search' | 'upcomingActivities' | 'preview' | 'service' | 'live' | 'monitors';

export type WorkspaceLayoutPreset = 'split-left-center' | 'split-left-right' | 'split-center-right';

export const WORKSPACE_PANEL_LABELS: Record<WorkspacePanelId, string> = {
  search: 'Búsqueda y contenido',
  upcomingActivities: 'Próximas actividades',
  preview: 'Previsualización',
  service: 'Servicio',
  live: 'En vivo',
  monitors: 'Monitores',
};
