<template>
  <Teleport v-if="targetElement" :to="targetElement">
    <ProjectionDestinationSelector
      v-model="selectedOutputId"
      class="projection-destination-portal"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import ProjectionDestinationSelector from './ProjectionDestinationSelector.vue';
import { useProjectionWorkspaceStore } from '../../stores/projection-workspace-store';

const route = useRoute();
const workspaceStore = useProjectionWorkspaceStore();
const { activeOutputId, outputs } = storeToRefs(workspaceStore);
const targetElement = ref<HTMLElement | null>(null);
const selectedOutputId = ref<string | null>(null);
let observer: MutationObserver | null = null;

const supportedRoutes = new Set([
  '/ruleta',
  '/reloj-tiempo',
  '/metronomo',
  '/actividades/imagen-escondida',
]);

function findTarget(): HTMLElement | null {
  if (!supportedRoutes.has(route.path)) return null;
  if (route.path === '/metronomo') {
    return document.querySelector<HTMLElement>('.metronome-header-actions');
  }
  if (route.path === '/actividades/imagen-escondida') {
    return document.querySelector<HTMLElement>('.page-header');
  }
  return document.querySelector<HTMLElement>('.header-actions');
}

function syncTarget(): void {
  targetElement.value = findTarget();
  const activeId = activeOutputId.value;
  selectedOutputId.value =
    activeId && outputs.value.some((output) => output.outputId === activeId)
      ? activeId
      : outputs.value[0]?.outputId ?? null;
}

watch(
  () => route.fullPath,
  () => {
    targetElement.value = null;
    void nextTick(syncTarget);
  },
);

watch(
  selectedOutputId,
  (outputId) => {
    if (!outputId || outputId === activeOutputId.value) return;
    if (!outputs.value.some((output) => output.outputId === outputId)) return;
    workspaceStore.switchWorkspace(outputId);
  },
);

watch([activeOutputId, outputs], () => {
  if (
    selectedOutputId.value &&
    outputs.value.some((output) => output.outputId === selectedOutputId.value)
  ) {
    return;
  }
  selectedOutputId.value = activeOutputId.value ?? outputs.value[0]?.outputId ?? null;
}, { deep: true });

onMounted(() => {
  syncTarget();
  observer = new MutationObserver(() => {
    if (!targetElement.value || !document.contains(targetElement.value)) syncTarget();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.projection-destination-portal {
  order: -1;
}

:global(.page-header > .projection-destination-portal) {
  margin-left: auto;
}
</style>
