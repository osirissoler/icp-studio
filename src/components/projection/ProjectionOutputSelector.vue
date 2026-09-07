<template>
  <div class="projection-destination">
    <template v-if="loading">
      <div class="destination-loading"><q-spinner size="18px" color="light-blue-4" /><span>Leyendo salidas...</span></div>
    </template>

    <template v-else-if="!independentEnabled">
      <div class="mirror-status"><q-icon name="content_copy" /><div><strong>Proyección espejo</strong><small>El contenido se envía a todas las pantallas activas.</small></div></div>
    </template>

    <template v-else-if="activeOutputs.length === 0">
      <div class="no-areas-status"><q-icon name="warning_amber" /><div><strong>Sin áreas activas</strong><small>Configura al menos un área en Configuración → Pantallas.</small></div></div>
    </template>

    <template v-else>
      <div class="destination-heading"><span>Área de trabajo</span><q-icon name="screen_share" /></div>
      <div class="destination-buttons">
        <button v-for="output in activeOutputs" :key="output.outputId" type="button" class="destination-button" :class="{ 'destination-button--active': selectedOutputId === output.outputId }" @click="selectOutput(output.outputId)">
          <q-icon :name="selectedOutputId === output.outputId ? 'radio_button_checked' : 'radio_button_unchecked'" />
          <span><strong>{{ output.name }}</strong><small>{{ outputDisplayLabel(output.displayIds) }}</small></span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { DisplayStatus } from '../../shared/display';
import type { ProjectionOutputTarget } from '../../shared/projection';

const props = defineProps<{ modelValue: ProjectionOutputTarget }>();
const emit = defineEmits<{ 'update:modelValue': [value: ProjectionOutputTarget] }>();
const loading = ref(true);
const status = ref<DisplayStatus | null>(null);
let unsubscribeStatus: (() => void) | undefined;
const selectedOutputId = ref<ProjectionOutputTarget>(props.modelValue);
const independentEnabled = computed(() => status.value?.configuration.independentProjectionEnabled === true);
const activeOutputs = computed(() => status.value?.activeProjectionOutputs ?? []);

function displayLabel(displayId: number): string {
  const display = status.value?.displays.find((item) => item.id === displayId);
  return display?.label ?? `Pantalla ${displayId}`;
}

function outputDisplayLabel(displayIds: number[]): string {
  if (displayIds.length === 1) return displayLabel(displayIds[0]!);
  return `${displayIds.length} pantallas`;
}

function selectOutput(outputId: string): void {
  selectedOutputId.value = outputId;
}

function applyStatus(nextStatus: DisplayStatus): void {
  status.value = nextStatus;
  if (!nextStatus.configuration.independentProjectionEnabled) {
    selectedOutputId.value = null;
    return;
  }
  const currentIsValid = selectedOutputId.value !== null && nextStatus.activeProjectionOutputs.some((output) => output.outputId === selectedOutputId.value);
  if (!currentIsValid) selectedOutputId.value = nextStatus.activeProjectionOutputs[0]?.outputId ?? null;
}

async function loadStatus(): Promise<void> {
  loading.value = true;
  try {
    const nextStatus = await window.icpStudio?.displays.getStatus();
    if (nextStatus) applyStatus(nextStatus);
  } finally {
    loading.value = false;
  }
}

watch(() => props.modelValue, (value) => { selectedOutputId.value = value; });
watch(selectedOutputId, (value) => emit('update:modelValue', value));

onMounted(async () => {
  await loadStatus();
  unsubscribeStatus = window.icpStudio?.displays.onStatusChanged(applyStatus);
});

onBeforeUnmount(() => unsubscribeStatus?.());
</script>

<style scoped>
.projection-destination { width: 100%; }
.destination-loading, .mirror-status, .no-areas-status { display: flex; align-items: center; gap: 9px; padding: 9px 10px; color: #98a9bc; background: #0b1520; border: 1px solid #26384d; border-radius: 9px; }
.mirror-status > .q-icon { color: #69b8ff; }
.no-areas-status > .q-icon { color: #f5b942; }
.mirror-status div, .no-areas-status div { display: flex; min-width: 0; flex-direction: column; }
.mirror-status strong, .no-areas-status strong { color: #d9e5f3; font-size: 11px; }
.mirror-status small, .no-areas-status small { margin-top: 1px; color: #75879c; font-size: 9px; line-height: 1.25; }
.destination-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; color: #91a4b9; font-size: 9px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.destination-buttons { display: flex; gap: 6px; padding-bottom: 2px; overflow-x: auto; }
.destination-button { display: flex; min-width: 116px; max-width: 180px; align-items: center; gap: 7px; padding: 8px 9px; color: #aebed0; background: #0b1520; border: 1px solid #2a3b50; border-radius: 9px; text-align: left; cursor: pointer; }
.destination-button:hover { color: #e8f4ff; border-color: #3f6f9f; background: #102235; }
.destination-button--active { color: #eef9ff; background: #12304a; border-color: #4ba3ff; box-shadow: inset 0 0 0 1px rgba(75, 163, 255, .16); }
.destination-button > .q-icon { flex: 0 0 auto; color: #69b8ff; font-size: 18px; }
.destination-button span { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.destination-button strong, .destination-button small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.destination-button strong { font-size: 10px; }
.destination-button small { margin-top: 1px; color: #71859b; font-size: 8px; }
.destination-button--active small { color: #9fc8e9; }
</style>
