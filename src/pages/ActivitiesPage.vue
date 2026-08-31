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
          description="Este será el punto de entrada para crear y presentar cada actividad."
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
  { id: 'team-quiz', label: 'Careo bíblico', icon: 'groups', color: '#60a5fa' },
  { id: 'crossword', label: 'Crucigrama', icon: 'grid_on', color: '#a78bfa' },
  { id: 'character', label: 'Identifica el personaje', icon: 'person_search', color: '#f59e0b' },
  { id: 'order-phrase', label: 'Organiza la frase', icon: 'reorder', color: '#34d399' },
  { id: 'complete-phrase', label: 'Completa la frase', icon: 'edit_note', color: '#f472b6' },
  { id: 'true-false', label: 'Verdadero o falso', icon: 'rule', color: '#22d3ee' },
  { id: 'who-said-it', label: '¿Quién dijo esto?', icon: 'record_voice_over', color: '#fb7185' },
  { id: 'hidden-image', label: 'Imagen escondida', icon: 'image_search', color: '#c084fc' },
];
</script>
