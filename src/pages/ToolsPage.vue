<template>
  <q-page>
    <ModuleWorkspace
      title="Herramientas"
      description="Utilidades para organizar actividades y controlar el tiempo."
      icon="construction"
    >
      <template #search>
        <AppLauncherGrid
          heading="Herramientas disponibles"
          description="Selecciona una utilidad para organizar y apoyar cada actividad."
          :items="tools"
        />
      </template>
    </ModuleWorkspace>
  </q-page>
</template>

<script setup lang="ts">
import AppLauncherGrid from '../components/AppLauncherGrid.vue';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';

const tools = [
  {
    id: 'wheel',
    label: 'Ruleta',
    icon: 'donut_large',
    color: '#60a5fa',
    to: '/ruleta',
    status: 'Disponible',
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: 'calendar_month',
    color: '#34d399',
    to: '/calendario',
    status: 'Disponible',
  },
  { id: 'timer', label: 'Cronómetro', icon: 'timer', color: '#fbbf24' },
];
</script>
