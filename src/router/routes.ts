import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/alabanzas' },
      {
        path: 'alabanzas',
        component: () => import('../pages/SongPage.vue'),
        meta: { title: 'Alabanzas', description: 'Organiza canciones, letras, estrofas y coros.', icon: 'music_note' },
      },
      {
        path: 'audio',
        component: () => import('../pages/AudioPage.vue'),
        meta: { title: 'Canciones MP3', description: 'Importa, organiza y reproduce archivos de audio.', icon: 'audio_file' },
      },
      {
        path: 'biblia',
        component: () => import('../pages/BiblePage.vue'),
        meta: { title: 'Biblia', description: 'Busca, previsualiza y agrega pasajes bíblicos al servicio.', icon: 'menu_book' },
      },
      {
        path: 'imagenes',
        component: () => import('../pages/ImagePage.vue'),
        meta: { title: 'Imágenes', description: 'Administra imágenes y fondos para la proyección.', icon: 'image' },
      },
      {
        path: 'videos',
        component: () => import('../pages/VideoPage.vue'),
        meta: { title: 'Videos', description: 'Organiza y reproduce videos durante el servicio.', icon: 'movie' },
      },
      {
        path: 'documentos',
        component: () => import('../pages/DocumentPage.vue'),
        meta: { title: 'Documentos', description: 'Previsualiza y presenta documentos y archivos PDF.', icon: 'description' },
      },
      {
        path: 'actividades',
        component: () => import('../pages/ActivitiesPage.vue'),
        meta: { title: 'Actividades', description: 'Organiza dinámicas y actividades interactivas para la congregación.', icon: 'extension' },
      },
      {
        path: 'actividades/careo-biblico',
        component: () => import('../pages/BibleCareoPage.vue'),
        meta: { title: 'Careo bíblico', description: 'Combina actividades, equipos y puntuación en una competencia bíblica.', icon: 'groups' },
      },
      {
        path: 'actividades/crucigrama',
        component: () => import('../pages/BibleActivityPage.vue'),
        meta: { title: 'Crucigrama', description: 'Crea palabras y pistas bíblicas.', icon: 'grid_on', activityType: 'crossword' },
      },
      {
        path: 'actividades/identifica-personaje',
        component: () => import('../pages/BibleActivityPage.vue'),
        meta: { title: 'Identifica el personaje', description: 'Crea rondas de pistas para identificar personajes bíblicos.', icon: 'person_search', activityType: 'character' },
      },
      {
        path: 'actividades/organiza-frase',
        component: () => import('../pages/BibleActivityPage.vue'),
        meta: { title: 'Organiza la frase', description: 'Desordena palabras para reconstruir frases bíblicas.', icon: 'reorder', activityType: 'order-phrase' },
      },
      {
        path: 'actividades/completa-frase',
        component: () => import('../pages/BibleActivityPage.vue'),
        meta: { title: 'Completa la frase', description: 'Crea frases bíblicas con palabras faltantes.', icon: 'edit_note', activityType: 'complete-phrase' },
      },
      {
        path: 'actividades/verdadero-falso',
        component: () => import('../pages/BibleActivityPage.vue'),
        meta: { title: 'Verdadero o falso', description: 'Crea afirmaciones bíblicas para responder verdadero o falso.', icon: 'rule', activityType: 'true-false' },
      },
      {
        path: 'actividades/quien-dijo-esto',
        component: () => import('../pages/BibleActivityPage.vue'),
        meta: { title: '¿Quién dijo esto?', description: 'Crea citas bíblicas para identificar quién las dijo.', icon: 'record_voice_over', activityType: 'who-said-it' },
      },
      {
        path: 'actividades/imagen-escondida',
        component: () => import('../pages/HiddenImagePage.vue'),
        meta: { title: 'Imagen escondida', description: 'Crea y presenta juegos de imagen oculta por casillas.', icon: 'image_search' },
      },
      {
        path: 'herramientas',
        component: () => import('../pages/ToolsPage.vue'),
        meta: { title: 'Herramientas', description: 'Accede a utilidades adicionales para preparar y presentar contenido.', icon: 'construction' },
      },
      {
        path: 'calendario',
        component: () => import('../pages/CalendarPage.vue'),
        meta: { title: 'Calendario', description: 'Planifica y presenta las actividades de todo el año.', icon: 'calendar_month' },
      },
      {
        path: 'ruleta',
        component: () => import('../pages/RoulettePage.vue'),
        meta: { title: 'Ruleta', description: 'Crea y presenta selecciones aleatorias para dinámicas y actividades.', icon: 'donut_large' },
      },
      {
        path: 'reloj-tiempo',
        component: () => import('../pages/TimeToolPage.vue'),
        meta: { title: 'Reloj y tiempo', description: 'Presenta relojes, temporizadores y cronómetros en vivo.', icon: 'schedule' },
      },
      {
        path: 'metronomo',
        component: () => import('../tools/metronome/MetronomePage.vue'),
        meta: { title: 'Metrónomo', description: 'Marca y presenta el tempo para ensayos y práctica musical.', icon: 'speed' },
      },
      {
        path: 'asistente-musical',
        component: () => import('../tools/music-assistant/MusicAssistantPage.vue'),
        meta: { title: 'Asistente musical', description: 'Encuentra notas, tonos y referencias para ensayos de canto.', icon: 'library_music' },
      },
      {
        path: 'biblioteca',
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: { title: 'Biblioteca', description: 'Encuentra todo el contenido guardado en la computadora.', icon: 'local_library' },
      },
    ],
  },
  { path: '/song-editor/:songId', component: () => import('../pages/SongEditorPage.vue') },
  { path: '/projector', component: () => import('../pages/ProjectorPage.vue') },
  { path: '/:catchAll(.*)*', component: () => import('../pages/ErrorNotFound.vue') },
];

export default routes;
