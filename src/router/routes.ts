import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/alabanzas',
      },
      {
        path: 'alabanzas',
        component: () => import('../pages/SongPage.vue'),
        meta: {
          title: 'Alabanzas',
          description: 'Organiza canciones, letras, estrofas y coros.',
          icon: 'music_note',
        },
      },
      {
        path: 'audio',
        component: () => import('../pages/AudioPage.vue'),
        meta: {
          title: 'Canciones MP3',
          description: 'Importa, organiza y reproduce archivos de audio.',
          icon: 'audio_file',
        },
      },
      {
        path: 'biblia',
        component: () => import('../pages/BiblePage.vue'),
        meta: {
          title: 'Biblia',
          description: 'Busca, previsualiza y agrega pasajes bíblicos al servicio.',
          icon: 'menu_book',
        },
      },
      {
        path: 'imagenes',
        component: () => import('../pages/ImagePage.vue'),
        meta: {
          title: 'Imágenes',
          description: 'Administra imágenes y fondos para la proyección.',
          icon: 'image',
        },
      },
      {
        path: 'videos',
        component: () => import('../pages/VideoPage.vue'),
        meta: {
          title: 'Videos',
          description: 'Organiza y reproduce videos durante el servicio.',
          icon: 'movie',
        },
      },
      {
        path: 'documentos',
        component: () => import('../pages/DocumentPage.vue'),
        meta: {
          title: 'Documentos',
          description: 'Previsualiza y presenta documentos y archivos PDF.',
          icon: 'description',
        },
      },
      {
        path: 'actividades',
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Actividades',
          description: 'Organiza dinámicas y actividades interactivas para la congregación.',
          icon: 'extension',
        },
      },
      {
        path: 'herramientas',
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Herramientas',
          description: 'Accede a utilidades adicionales para preparar y presentar contenido.',
          icon: 'construction',
        },
      },
      {
        path: 'biblioteca',
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Biblioteca',
          description: 'Encuentra todo el contenido guardado en la computadora.',
          icon: 'local_library',
        },
      },
      {
        path: 'configuracion',
        component: () => import('../pages/SettingsPage.vue'),
        meta: {
          title: 'Configuración',
          description: 'Configura pantallas, apariencia y control remoto.',
          icon: 'settings',
        },
      },
    ],
  },
  {
    path: '/song-editor/:songId',
    component: () => import('../pages/SongEditorPage.vue'),
  },
  {
    path: '/projector',
    component: () => import('../pages/ProjectorPage.vue'),
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue'),
  },
];

export default routes;
