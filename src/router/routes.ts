import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('../pages/IndexPage.vue'),
        meta: {
          title: 'Servicios',
          icon: 'event_note',
        },
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
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Imágenes',
          description: 'Administra imágenes y fondos para la proyección.',
          icon: 'image',
        },
      },
      {
        path: 'videos',
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Videos',
          description: 'Organiza y reproduce videos durante el servicio.',
          icon: 'movie',
        },
      },
      {
        path: 'documentos',
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Documentos',
          description: 'Previsualiza y presenta documentos y archivos PDF.',
          icon: 'description',
        },
      },
      {
        path: 'presentaciones',
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Presentaciones',
          description: 'Importa y presenta diapositivas durante el servicio.',
          icon: 'co_present',
        },
      },
      {
        path: 'juegos',
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Juegos',
          description: 'Crea y ejecuta juegos bíblicos interactivos.',
          icon: 'sports_esports',
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
        component: () => import('../pages/ModulePlaceholderPage.vue'),
        meta: {
          title: 'Configuración',
          description: 'Configura pantallas, apariencia y control remoto.',
          icon: 'settings',
        },
      },
    ],
  },
  {
    path: '/song-editor/new',
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
