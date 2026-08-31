export type MenuSide = 'left' | 'right';
export type ToolbarPosition = 'top' | 'bottom';

export const MAIN_NAVIGATION_ITEMS = [
  { id: 'songs', label: 'Alabanzas', icon: 'music_note', to: '/alabanzas' },
  { id: 'audio', label: 'Canciones MP3', icon: 'audio_file', to: '/audio' },
  { id: 'bible', label: 'Biblia', icon: 'menu_book', to: '/biblia' },
  { id: 'images', label: 'Imágenes', icon: 'image', to: '/imagenes' },
  { id: 'videos', label: 'Videos', icon: 'movie', to: '/videos' },
  { id: 'documents', label: 'Documentos', icon: 'description', to: '/documentos' },
  { id: 'activities', label: 'Actividades', icon: 'extension', to: '/actividades' },
  { id: 'tools', label: 'Herramientas', icon: 'construction', to: '/herramientas' },
  { id: 'library', label: 'Biblioteca', icon: 'local_library', to: '/biblioteca' },
] as const;

export type NavigationItemId = (typeof MAIN_NAVIGATION_ITEMS)[number]['id'];
export type MainNavigationItem = (typeof MAIN_NAVIGATION_ITEMS)[number];
