<template>
  <q-select
    v-model="selectedOutputId"
    :options="outputOptions"
    emit-value
    map-options
    dense
    outlined
    options-dense
    :loading="loading"
    :disable="loading || outputOptions.length <= 1"
    label="Destino de proyección"
  >
    <template #prepend>
      <q-icon name="screen_share" />
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { DisplayStatus } from '../../shared/display';
import type { ProjectionOutputTarget } from '../../shared/projection';

const props = defineProps<{
  modelValue: ProjectionOutputTarget;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ProjectionOutputTarget];
}>();

const loading = ref(true);
const status = ref<DisplayStatus | null>(null);
let unsubscribeStatus: (() => void) | undefined;

const selectedOutputId = ref<ProjectionOutputTarget>(props.modelValue);

const outputOptions = computed(() => {
  const outputs = status.value?.activeProjectionOutputs ?? [];

  return [
    {
      label: 'Todas las salidas',
      value: null,
    },
    ...outputs.map((output) => ({
      label: output.name,
      value: output.outputId,
    })),
  ];
});

function applyStatus(nextStatus: DisplayStatus): void {
  status.value = nextStatus;

  if (
    selectedOutputId.value !== null &&
    !nextStatus.activeProjectionOutputs.some(
      (output) => output.outputId === selectedOutputId.value,
    )
  ) {
    selectedOutputId.value = null;
  }
}

async function loadStatus(): Promise<void> {
  loading.value = true;
  try {
    const nextStatus = await window.icpStudio?.displays.getStatus();
    if (nextStatus) {
      applyStatus(nextStatus);
    }
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (value) => {
    selectedOutputId.value = value;
  },
);

watch(selectedOutputId, (value) => {
  emit('update:modelValue', value);
});

onMounted(async () => {
  await loadStatus();
  unsubscribeStatus = window.icpStudio?.displays.onStatusChanged(applyStatus);
});

onBeforeUnmount(() => {
  unsubscribeStatus?.();
});
</script>
