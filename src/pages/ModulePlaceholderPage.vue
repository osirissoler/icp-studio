<template>
  <q-page>
    <ModuleWorkspace
      :title="moduleData.title"
      :description="moduleData.description"
      :icon="moduleData.icon"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';

const route = useRoute();

function getMetaText(key: string, fallback: string): string {
  const value = route.meta[key];

  return typeof value === 'string' ? value : fallback;
}

const moduleData = computed(() => ({
  title: getMetaText('title', 'Módulo'),
  description: getMetaText('description', ''),
  icon: getMetaText('icon', 'widgets'),
}));
</script>
