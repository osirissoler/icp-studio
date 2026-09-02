<template>
  <div class="monitors-panel">
    <div class="monitors-summary">
      <div>
        <strong>{{ displays.length }}</strong>
        <span>{{ displays.length === 1 ? 'pantalla detectada' : 'pantallas detectadas' }}</span>
      </div>
      <q-icon name="monitor" size="24px" color="primary" />
    </div>

    <div v-if="displays.length" class="monitor-list">
      <article
        v-for="display in displays"
        :key="display.id"
        class="monitor-item"
        :class="{ 'monitor-item--output': isProjectionOutput(display) }"
      >
        <q-icon
          :name="display.isPrimary ? 'laptop_mac' : 'connected_tv'"
          size="22px"
          :color="isProjectionOutput(display) ? 'primary' : 'blue-grey-5'"
        />

        <div class="monitor-details">
          <strong>{{ display.label }}</strong>
          <small>
            {{ display.bounds.width }} × {{ display.bounds.height }} · Escala
            {{ display.scaleFactor }}
          </small>
        </div>

        <q-badge
          :color="isProjectionOutput(display) ? 'positive' : 'blue-grey-8'"
          :label="displayStatus(display)"
        />
      </article>
    </div>

    <div v-else class="monitors-empty">
      <q-icon name="desktop_access_disabled" size="36px" />
      <span>No fue posible detectar las pantallas.</span>
    </div>

    <p v-if="usesOperatorDisplay" class="operator-notice">
      <q-icon name="info_outline" />
      La presentación está disponible en una ventana independiente dentro de la pantalla del
      operador.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { DisplayInfo } from '../shared/display';

const displays = ref<DisplayInfo[]>([]);
let unsubscribeDisplays: (() => void) | undefined;

const usesOperatorDisplay = computed(
  () => displays.value.length === 1 && Boolean(displays.value[0]?.isPrimary),
);

function isProjectionOutput(display: DisplayInfo): boolean {
  if (usesOperatorDisplay.value) {
    return display.isPrimary;
  }

  return !display.isPrimary;
}

function displayStatus(display: DisplayInfo): string {
  if (isProjectionOutput(display)) {
    return 'En proyección';
  }

  return display.isPrimary ? 'Operador' : 'Disponible';
}

onMounted(async () => {
  displays.value = (await window.icpStudio?.displays.list()) ?? [];
  unsubscribeDisplays = window.icpStudio?.displays.onChanged((nextDisplays) => {
    displays.value = nextDisplays;
  });
});

onBeforeUnmount(() => {
  unsubscribeDisplays?.();
});
</script>

<style scoped>
.monitors-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.monitors-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  color: #dce6f2;
  background: #0b131d;
  border: 1px solid #26364b;
  border-radius: 8px;
}

.monitors-summary > div {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.monitors-summary strong {
  color: #60a5fa;
  font-size: 22px;
}

.monitors-summary span {
  color: #8998aa;
  font-size: 10px;
}

.monitor-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.monitor-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 9px;
  background: #0d1621;
  border: 1px solid #263448;
  border-radius: 8px;
}

.monitor-item--output {
  background: #102038;
  border-color: #315b8f;
}

.monitor-details {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.monitor-details strong {
  overflow: hidden;
  color: #dbe5f1;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-details small {
  color: #77869a;
  font-size: 9px;
}

.monitors-empty {
  display: flex;
  min-height: 150px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #66758a;
  font-size: 11px;
  text-align: center;
}

.operator-notice {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 8px;
  color: #9db3ce;
  background: rgb(59 130 246 / 8%);
  border-radius: 7px;
  font-size: 9px;
  line-height: 1.45;
}
</style>
