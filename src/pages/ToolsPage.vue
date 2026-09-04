<template>
  <q-page>
    <ModuleWorkspace
      title="Herramientas"
      description="Utilidades para apoyar la adoración, los ensayos, las reuniones y el trabajo del operador."
      icon="construction"
    >
      <template #search>
        <AppLauncherGrid
          heading="Herramientas disponibles"
          description="Selecciona una herramienta. Las que todavía no están desarrolladas permanecerán visibles como próximas funciones de ICP Studio."
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
  {
    id: 'time',
    label: 'Reloj y tiempo',
    icon: 'schedule',
    color: '#fbbf24',
    to: '/reloj-tiempo',
    status: 'Disponible',
  },
  {
    id: 'metronome',
    label: 'Metrónomo',
    icon: 'speed',
    color: '#a78bfa',
    status: 'Próximamente',
  },
  {
    id: 'music-assistant',
    label: 'Asistente musical',
    icon: 'library_music',
    color: '#f472b6',
    to: '/asistente-musical',
    status: 'En desarrollo',
  },
  {
    id: 'audio-recorder',
    label: 'Audio y grabación',
    icon: 'mic',
    color: '#fb7185',
    status: 'Próximamente',
  },
  {
    id: 'service-planner',
    label: 'Planificador de servicio',
    icon: 'assignment',
    color: '#38bdf8',
    status: 'Próximamente',
  },
  {
    id: 'voting',
    label: 'Votaciones',
    icon: 'how_to_vote',
    color: '#22c55e',
    status: 'Próximamente',
  },
  {
    id: 'operator-notes',
    label: 'Apuntes del operador',
    icon: 'edit_note',
    color: '#f59e0b',
    status: 'Próximamente',
  },
  {
    id: 'technical-incidents',
    label: 'Incidencias técnicas',
    icon: 'report_problem',
    color: '#ef4444',
    status: 'Próximamente',
  },
  {
    id: 'kids-creative',
    label: 'Taller creativo infantil',
    icon: 'palette',
    color: '#2dd4bf',
    status: 'Próximamente',
  },
];
</script>
