export type WorkspacePanelId =
  | 'search'
  | 'preview'
  | 'service'
  | 'live';

export const WORKSPACE_PANEL_LABELS: Record<WorkspacePanelId, string> = {
  search: 'Búsqueda y contenido',
  preview: 'Previsualización',
  service: 'Servicio',
  live: 'En vivo',
};
