<template>
  <section class="generator-panel">
    <header class="generator-heading">
      <div>
        <span> VOCES ADICIONALES </span>

        <strong> Generador de voces </strong>

        <small>
          Elige una voz original como referencia y agrega todas las voces adicionales que quieras
          crear.
        </small>
      </div>

      <q-icon name="account_tree" />
    </header>

    <div class="source-section">
      <div class="source-copy">
        <span>VOZ DE REFERENCIA</span>

        <strong> La voz que servirá como principal para esta generación </strong>
      </div>

      <q-select
        :model-value="sourcePartId"
        :options="sourceOptions"
        emit-value
        map-options
        dense
        outlined
        options-dense
        class="source-select"
        :disable="disabled || !parts.length"
        @update:model-value="updateSourcePart"
      />
    </div>

    <div class="request-heading">
      <div>
        <span>VOCES A CREAR</span>

        <strong>
          {{ requests.length }}
          {{ requests.length === 1 ? 'voz solicitada' : 'voces solicitadas' }}
        </strong>
      </div>

      <q-btn
        outline
        no-caps
        dense
        icon="add"
        label="Agregar voz"
        class="add-button"
        :disable="disabled || !sourcePartId"
        @click="addRequest"
      />
    </div>

    <div v-if="requests.length" class="request-list">
      <article v-for="(request, index) in requests" :key="request.id" class="request-card">
        <div class="request-number">
          {{ index + 1 }}
        </div>

        <div class="request-fields">
          <q-input
            :model-value="request.label"
            dense
            outlined
            label="Nombre"
            :disable="disabled"
            @update:model-value="updateRequestLabel(request.id, String($event ?? ''))"
          />

          <q-select
            :model-value="request.kind"
            :options="voiceTypeOptions"
            emit-value
            map-options
            dense
            outlined
            options-dense
            label="Tipo"
            :disable="disabled"
            @update:model-value="updateRequestKind(request.id, $event)"
          />

          <q-select
            :model-value="request.placement"
            :options="placementOptions"
            emit-value
            map-options
            dense
            outlined
            options-dense
            label="Posición"
            :disable="disabled"
            @update:model-value="updateRequestPlacement(request.id, $event)"
          />
        </div>

        <div class="request-description">
          <q-icon :name="requestIcon(request.kind)" />

          <span>
            {{ requestDescription(request) }}
          </span>
        </div>

        <q-btn
          flat
          round
          dense
          icon="delete_outline"
          class="delete-button"
          :disable="disabled"
          @click="removeRequest(request.id)"
        />
      </article>
    </div>

    <div v-else class="empty-requests">
      <q-icon name="add_circle_outline" />

      <div>
        <strong> Todavía no has solicitado ninguna voz </strong>

        <span> Puedes agregar una Segunda, Tenor, Barítono, Bajo o una voz personalizada. </span>
      </div>
    </div>

    <div class="quick-add">
      <span>AGREGAR RÁPIDO</span>

      <div>
        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('second', 'above')"
        >
          2ª arriba
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('second', 'below')"
        >
          2ª abajo
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('tenor', 'above')"
        >
          Tenor arriba
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('tenor', 'below')"
        >
          Tenor abajo
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('baritone', 'above')"
        >
          Barítono arriba
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('baritone', 'below')"
        >
          Barítono abajo
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('bass', 'below')"
        >
          Bajo
        </button>
      </div>
    </div>

    <footer class="generator-actions">
      <div>
        <q-icon name="info_outline" />

        <span> Las voces originales nunca se modifican. </span>
      </div>

      <q-btn
        unelevated
        no-caps
        icon="auto_awesome"
        :label="generateButtonLabel"
        class="generate-button"
        :disable="disabled || !sourcePartId || !requests.length"
        @click="emitGenerate"
      />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { ScorePart } from '../../shared/score';

import type {
  GeneratedVoiceKind,
  GeneratedVoicePlacement,
  GeneratedVoiceRequest,
} from './generated-voice-engine';

const props = defineProps<{
  parts: ScorePart[];

  sourcePartId: string | null;

  disabled: boolean;
}>();

const emit = defineEmits<{
  'update:sourcePartId': [value: string | null];

  generate: [sourcePartId: string, requests: GeneratedVoiceRequest[]];
}>();

const requests = ref<GeneratedVoiceRequest[]>([]);

let requestSequence = 0;

const voiceTypeOptions = [
  {
    label: 'Segunda',
    value: 'second' satisfies GeneratedVoiceKind,
  },
  {
    label: 'Tenor',
    value: 'tenor' satisfies GeneratedVoiceKind,
  },
  {
    label: 'Barítono',
    value: 'baritone' satisfies GeneratedVoiceKind,
  },
  {
    label: 'Bajo',
    value: 'bass' satisfies GeneratedVoiceKind,
  },
  {
    label: 'Personalizada',
    value: 'custom' satisfies GeneratedVoiceKind,
  },
];

const placementOptions = [
  {
    label: 'Arriba',
    value: 'above' satisfies GeneratedVoicePlacement,
  },
  {
    label: 'Abajo',
    value: 'below' satisfies GeneratedVoicePlacement,
  },
];

const sourceOptions = computed(() =>
  props.parts.map((part) => ({
    label: part.name,
    value: part.id,
  })),
);

const generateButtonLabel = computed(() => {
  if (!requests.value.length) {
    return 'Generar voces';
  }

  if (requests.value.length === 1) {
    return 'Generar 1 voz';
  }

  return `Generar ${requests.value.length} voces`;
});

watch(
  () => props.parts,
  (parts) => {
    if (!parts.length) {
      requests.value = [];

      emit('update:sourcePartId', null);

      return;
    }

    const sourceStillExists = parts.some((part) => part.id === props.sourcePartId);

    if (!sourceStillExists) {
      emit('update:sourcePartId', parts[0]?.id ?? null);
    }
  },
  {
    immediate: true,
  },
);

function updateSourcePart(value: string | null): void {
  emit('update:sourcePartId', value);
}

function addRequest(): void {
  addPreset('second', 'above');
}

function addPreset(kind: GeneratedVoiceKind, placement: GeneratedVoicePlacement): void {
  requestSequence += 1;

  requests.value.push({
    id: `generated-request-${requestSequence}`,

    label: defaultLabel(kind, placement),

    kind,

    placement,
  });
}

function removeRequest(requestId: string): void {
  requests.value = requests.value.filter((request) => request.id !== requestId);
}

function updateRequestLabel(requestId: string, label: string): void {
  const request = requests.value.find((candidate) => candidate.id === requestId);

  if (!request) {
    return;
  }

  request.label = label;
}

function updateRequestKind(requestId: string, kind: GeneratedVoiceKind | null): void {
  if (!kind) {
    return;
  }

  const request = requests.value.find((candidate) => candidate.id === requestId);

  if (!request) {
    return;
  }

  request.kind = kind;

  request.label = defaultLabel(kind, request.placement);
}

function updateRequestPlacement(
  requestId: string,
  placement: GeneratedVoicePlacement | null,
): void {
  if (!placement) {
    return;
  }

  const request = requests.value.find((candidate) => candidate.id === requestId);

  if (!request) {
    return;
  }

  request.placement = placement;

  request.label = defaultLabel(request.kind, placement);
}

function emitGenerate(): void {
  if (!props.sourcePartId || !requests.value.length) {
    return;
  }

  const normalizedRequests = requests.value.map((request, index) => ({
    ...request,

    label: request.label.trim() || `Voz generada ${index + 1}`,
  }));

  emit('generate', props.sourcePartId, normalizedRequests);
}

function defaultLabel(kind: GeneratedVoiceKind, placement: GeneratedVoicePlacement): string {
  const position = placement === 'above' ? 'arriba' : 'abajo';

  if (kind === 'second') {
    return `Segunda ${position}`;
  }

  if (kind === 'tenor') {
    return `Tenor ${position}`;
  }

  if (kind === 'baritone') {
    return `Barítono ${position}`;
  }

  if (kind === 'bass') {
    return `Bajo ${position}`;
  }

  return `Voz personalizada ${position}`;
}

function requestIcon(kind: GeneratedVoiceKind): string {
  if (kind === 'second') {
    return 'alt_route';
  }

  if (kind === 'tenor') {
    return 'graphic_eq';
  }

  if (kind === 'baritone') {
    return 'equalizer';
  }

  if (kind === 'bass') {
    return 'volume_down';
  }

  return 'music_note';
}

function requestDescription(request: GeneratedVoiceRequest): string {
  const position = request.placement === 'above' ? 'por encima' : 'por debajo';

  if (request.kind === 'second') {
    return `Armonía cercana ${position} de la voz principal.`;
  }

  if (request.kind === 'tenor') {
    return `Línea de tenor colocada ${position} de la referencia.`;
  }

  if (request.kind === 'baritone') {
    return `Línea de barítono colocada ${position} de la referencia.`;
  }

  if (request.kind === 'bass') {
    return `Línea grave colocada ${position} de la referencia.`;
  }

  return `Voz personalizada colocada ${position} de la referencia.`;
}
</script>

<style scoped>
.generator-panel {
  margin-top: 11px;
  padding: 12px;
  background: radial-gradient(circle at 100% 0%, rgb(167 139 250 / 8%), transparent 34%), #0d1a27;
  border: 1px solid rgb(167 139 250 / 19%);
  border-radius: 10px;
}

.generator-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.generator-heading > div {
  display: flex;
  flex-direction: column;
}

.generator-heading span {
  color: #a78bfa;
  font-size: 7px;
  font-weight: 700;
}

.generator-heading strong {
  color: #ddd6fe;
  font-size: 10px;
}

.generator-heading small {
  color: #756f8f;
  font-size: 7px;
}

.generator-heading > .q-icon {
  color: #a78bfa;
  font-size: 23px;
}

.source-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 10px;
  padding: 9px 10px;
  background: #101c2a;
  border: 1px solid #26394d;
  border-radius: 8px;
}

.source-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.source-copy span {
  color: #22d3ee;
  font-size: 6px;
  font-weight: 700;
}

.source-copy strong {
  color: #b8c9da;
  font-size: 8px;
}

.source-select {
  width: 260px;
  max-width: 100%;
}

.request-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 11px;
}

.request-heading > div {
  display: flex;
  flex-direction: column;
}

.request-heading span {
  color: #7c718e;
  font-size: 6px;
  font-weight: 700;
}

.request-heading strong {
  color: #bdb3d1;
  font-size: 8px;
}

.add-button {
  color: #b7a6e5;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.request-card {
  display: grid;
  grid-template-columns:
    28px
    minmax(0, 1fr)
    minmax(150px, 0.55fr)
    32px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #101e2c;
  border: 1px solid #293e53;
  border-radius: 8px;
}

.request-number {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  color: #c4b5fd;
  background: rgb(167 139 250 / 9%);
  border-radius: 6px;
  font-size: 8px;
  font-weight: 700;
}

.request-fields {
  display: grid;
  min-width: 0;
  grid-template-columns:
    minmax(150px, 1.2fr)
    minmax(120px, 0.8fr)
    minmax(110px, 0.65fr);
  gap: 6px;
}

.request-description {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #647a8e;
  font-size: 7px;
}

.request-description .q-icon {
  flex: 0 0 auto;
  color: #8b7ab8;
  font-size: 15px;
}

.delete-button {
  color: #8c7486;
}

.empty-requests {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 72px;
  margin-top: 8px;
  padding: 10px;
  background: #101c29;
  border: 1px dashed #304154;
  border-radius: 8px;
}

.empty-requests > .q-icon {
  color: #6f6583;
  font-size: 21px;
}

.empty-requests > div {
  display: flex;
  flex-direction: column;
}

.empty-requests strong {
  color: #8f879f;
  font-size: 8px;
}

.empty-requests span {
  color: #655f70;
  font-size: 7px;
}

.quick-add {
  margin-top: 10px;
}

.quick-add > span {
  color: #6e657d;
  font-size: 6px;
  font-weight: 700;
}

.quick-add > div {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
}

.quick-add button {
  padding: 5px 8px;
  color: #9f93bb;
  background: #121e2c;
  border: 1px solid #314054;
  border-radius: 6px;
  cursor: pointer;
  font-size: 7px;
}

.quick-add button:hover:not(:disabled) {
  color: #ddd6fe;
  border-color: rgb(167 139 250 / 45%);
}

.quick-add button:disabled {
  cursor: default;
  opacity: 0.4;
}

.generator-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 11px;
  padding-top: 10px;
  border-top: 1px solid #243449;
}

.generator-actions > div {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #667789;
  font-size: 7px;
}

.generator-actions > div .q-icon {
  color: #7f73a0;
  font-size: 14px;
}

.generate-button {
  color: white;
  background: #7159a6;
  border-radius: 8px;
}

@media (max-width: 1000px) {
  .request-card {
    grid-template-columns:
      28px
      minmax(0, 1fr)
      32px;
  }

  .request-description {
    grid-column: 2 / 3;
  }
}

@media (max-width: 750px) {
  .source-section,
  .generator-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .source-select {
    width: 100%;
  }

  .request-fields {
    grid-template-columns: 1fr;
  }

  .request-card {
    align-items: start;
  }
}

@media (max-width: 520px) {
  .request-card {
    grid-template-columns: 28px 1fr 32px;
  }

  .request-description {
    grid-column: 1 / -1;
  }

  .generator-actions .q-btn {
    width: 100%;
  }
}
</style>
