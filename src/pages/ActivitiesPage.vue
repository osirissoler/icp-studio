<template>
  <q-page>
    <ModuleWorkspace
      title="Actividades"
      description="Dinámicas bíblicas preparadas para grupos y congregaciones."
      icon="extension"
    >
      <template #search>
        <AppLauncherGrid
          heading="Actividades bíblicas"
          description="Crea actividades independientes o combínalas dentro de un Careo Bíblico."
          :items="activities"
        />
      </template>
    </ModuleWorkspace>
  </q-page>
</template>

<script setup lang="ts">
import AppLauncherGrid from '../components/AppLauncherGrid.vue';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';

const activities = [
  {
    id: 'team-quiz',
    label: 'Careo bíblico',
    icon: 'groups',
    color: '#60a5fa',
    to: '/actividades/careo-biblico',
    status: 'Abrir',
  },
  {
    id: 'crossword',
    label: 'Crucigrama',
    icon: 'grid_on',
    color: '#a78bfa',
    to: '/actividades/crucigrama',
    status: 'Abrir',
  },
  {
    id: 'character',
    label: 'Identifica el personaje',
    icon: 'person_search',
    color: '#f59e0b',
    to: '/actividades/identifica-personaje',
    status: 'Abrir',
  },
  {
    id: 'order-phrase',
    label: 'Organiza la frase',
    icon: 'reorder',
    color: '#34d399',
    to: '/actividades/organiza-frase',
    status: 'Abrir',
  },
  {
    id: 'complete-phrase',
    label: 'Completa la frase',
    icon: 'edit_note',
    color: '#f472b6',
    to: '/actividades/completa-frase',
    status: 'Abrir',
  },
  {
    id: 'true-false',
    label: 'Verdadero o falso',
    icon: 'rule',
    color: '#22d3ee',
    to: '/actividades/verdadero-falso',
    status: 'Abrir',
  },
  {
    id: 'who-said-it',
    label: '¿Quién dijo esto?',
    icon: 'record_voice_over',
    color: '#fb7185',
    to: '/actividades/quien-dijo-esto',
    status: 'Abrir',
  },
  {
    id: 'hidden-image',
    label: 'Imagen escondida',
    icon: 'image_search',
    color: '#c084fc',
    to: '/actividades/imagen-escondida',
    status: 'Abrir',
  },
];
</script>
