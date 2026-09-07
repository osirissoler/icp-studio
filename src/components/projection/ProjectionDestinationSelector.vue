<template>
  <div v-if="outputs.length" class="projection-destination">
    <span class="projection-destination__label">
      <q-icon name="desktop_windows" />
      Destino
    </span>

    <q-select
      :model-value="modelValue"
      dense
      borderless
      emit-value
      map-options
      options-dense
      :options="outputOptions"
      class="projection-destination__select"
      popup-content-class="projection-destination-menu"
      @update:model-value="updateValue"
    >
      <template #selected-item="scope">
        <span class="projection-destination__selected">
          <span class="projection-destination__dot"></span>
          {{ scope.opt.label }}
        </span>
      </template>
      <template #append>
        <q-icon name="unfold_more" class="projection-destination__chevron" />
      </template>
    </q-select>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useProjectionWorkspaceStore } from '../../stores/projection-workspace-store';

const props = defineProps<{ modelValue: string | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const workspaceStore = useProjectionWorkspaceStore();
const { activeOutputId, outputs, independentProjectionEnabled } = storeToRefs(workspaceStore);

const outputOptions = computed(() =>
  outputs.value.map((output) => ({
    label: output.name,
    value: output.outputId,
  })),
);

function resolvedValue(): string | null {
  if (!independentProjectionEnabled.value || outputs.value.length === 0) return null;
  if (props.modelValue && outputs.value.some((output) => output.outputId === props.modelValue)) {
    return props.modelValue;
  }
  if (
    activeOutputId.value &&
    outputs.value.some((output) => output.outputId === activeOutputId.value)
  ) {
    return activeOutputId.value;
  }
  return outputs.value[0]?.outputId ?? null;
}

function updateValue(value: unknown): void {
  emit('update:modelValue', typeof value === 'string' ? value : null);
}

watch(
  [activeOutputId, outputs, independentProjectionEnabled],
  () => {
    const next = resolvedValue();
    if (next !== props.modelValue) emit('update:modelValue', next);
  },
  { immediate: true, deep: true },
);
</script>

<style scoped>
.projection-destination {
  display: flex;
  min-width: 190px;
  height: 42px;
  align-items: center;
  gap: 8px;
  padding: 4px 7px 4px 10px;
  background: linear-gradient(180deg, #122233, #0d1926);
  border: 1px solid #304a63;
  border-radius: 10px;
  box-shadow: inset 0 1px rgb(255 255 255 / 3%);
}

.projection-destination__label {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  color: #7290aa;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.projection-destination__label .q-icon {
  color: #6bbbf2;
  font-size: 15px;
}

.projection-destination__select {
  min-width: 112px;
  flex: 1;
}

.projection-destination__select :deep(.q-field__control),
.projection-destination__select :deep(.q-field__native) {
  min-height: 32px;
  height: 32px;
}

.projection-destination__select :deep(.q-field__control) {
  padding: 0 7px 0 9px;
  background: rgb(6 16 25 / 62%);
  border-radius: 8px;
}

.projection-destination__select :deep(.q-field__control::before),
.projection-destination__select :deep(.q-field__control::after) {
  border: 0 !important;
}

.projection-destination__select :deep(.q-field__append) {
  height: 32px;
  padding-left: 3px;
}

.projection-destination__selected {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: #e2edf8;
  font-size: 10px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.projection-destination__dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  background: #4ade80;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgb(74 222 128 / 10%);
}

.projection-destination__chevron {
  color: #668098;
  font-size: 16px;
}

@media (max-width: 620px) {
  .projection-destination {
    min-width: 0;
    width: 100%;
  }
}
</style>

<style>
.projection-destination-menu {
  color: #dce9f5;
  background: #101d2a;
  border: 1px solid #30475e;
  border-radius: 9px;
  box-shadow: 0 18px 40px rgb(0 0 0 / 34%);
}

.projection-destination-menu .q-item {
  min-height: 36px;
  margin: 3px 5px;
  border-radius: 6px;
  font-size: 11px;
}

.projection-destination-menu .q-item--active,
.projection-destination-menu .q-item:hover {
  color: #e7f5ff;
  background: #19344b;
}
</style>
