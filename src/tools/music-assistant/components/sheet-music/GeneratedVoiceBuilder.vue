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

      <div class="heading-icon">
        <q-icon name="account_tree" />
      </div>
    </header>

    <div class="source-section">
      <div class="source-copy">
        <span>VOZ DE REFERENCIA</span>

        <strong> La voz que servirá como principal para esta generación </strong>

        <small> Esta voz original no será modificada. </small>
      </div>

      <q-select
        :model-value="sourcePartId"
        :options="sourceOptions"
        emit-value
        map-options
        dense
        outlined
        dark
        color="cyan-4"
        options-dense
        popup-content-class="icp-voice-select-menu"
        class="source-select generator-control"
        :disable="disabled || !parts.length"
        @update:model-value="updateSourcePart"
      >
        <template #prepend>
          <q-icon name="music_note" />
        </template>
      </q-select>
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
        unelevated
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
            dark
            color="cyan-4"
            label="Nombre"
            class="generator-control"
            :disable="disabled"
            @update:model-value="updateRequestLabel(request.id, String($event ?? ''))"
          >
            <template #prepend>
              <q-icon name="badge" />
            </template>
          </q-input>

          <q-select
            :model-value="request.kind"
            :options="voiceTypeOptions"
            emit-value
            map-options
            dense
            outlined
            dark
            color="cyan-4"
            options-dense
            label="Tipo"
            popup-content-class="icp-voice-select-menu"
            class="generator-control"
            :disable="disabled"
            @update:model-value="updateRequestKind(request.id, $event)"
          >
            <template #prepend>
              <q-icon :name="requestIcon(request.kind)" />
            </template>
          </q-select>

          <q-select
            :model-value="request.placement"
            :options="placementOptions"
            emit-value
            map-options
            dense
            outlined
            dark
            color="cyan-4"
            options-dense
            label="Posición"
            popup-content-class="icp-voice-select-menu"
            class="generator-control"
            :disable="disabled"
            @update:model-value="updateRequestPlacement(request.id, $event)"
          >
            <template #prepend>
              <q-icon :name="request.placement === 'above' ? 'arrow_upward' : 'arrow_downward'" />
            </template>
          </q-select>
        </div>

        <div class="request-description">
          <div class="description-icon">
            <q-icon :name="requestIcon(request.kind)" />
          </div>

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
        >
          <q-tooltip>Eliminar esta voz</q-tooltip>
        </q-btn>
      </article>
    </div>

    <div v-else class="empty-requests">
      <div class="empty-icon">
        <q-icon name="add_circle_outline" />
      </div>

      <div>
        <strong> Todavía no has solicitado ninguna voz </strong>

        <span> Puedes agregar una Segunda, Tenor, Barítono, Bajo o una voz personalizada. </span>
      </div>
    </div>

    <div class="quick-add">
      <div class="quick-heading">
        <span>AGREGAR RÁPIDO</span>

        <small> Puedes agregar varias voces del mismo tipo. </small>
      </div>

      <div class="quick-buttons">
        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('second', 'above')"
        >
          <q-icon name="north_east" />
          <span>2ª arriba</span>
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('second', 'below')"
        >
          <q-icon name="south_east" />
          <span>2ª abajo</span>
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('tenor', 'above')"
        >
          <q-icon name="graphic_eq" />
          <span>Tenor arriba</span>
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('tenor', 'below')"
        >
          <q-icon name="graphic_eq" />
          <span>Tenor abajo</span>
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('baritone', 'above')"
        >
          <q-icon name="equalizer" />
          <span>Barítono arriba</span>
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('baritone', 'below')"
        >
          <q-icon name="equalizer" />
          <span>Barítono abajo</span>
        </button>

        <button
          type="button"
          :disabled="disabled || !sourcePartId"
          @click="addPreset('bass', 'below')"
        >
          <q-icon name="volume_down" />
          <span>Bajo</span>
        </button>
      </div>
    </div>

    <footer class="generator-actions">
      <div class="generator-info">
        <q-icon name="verified_user" />

        <div>
          <strong>Original protegido</strong>

          <span> Las voces originales nunca se modifican. </span>
        </div>
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
  padding: 14px;
  background:
    radial-gradient(circle at 100% 0%, rgb(34 211 238 / 7%), transparent 30%),
    radial-gradient(circle at 0% 100%, rgb(167 139 250 / 7%), transparent 34%), #0d1a27;
  border: 1px solid #284359;
  border-radius: 11px;
}

.generator-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.generator-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.generator-heading span {
  color: #22d3ee;
  font-size: 7px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.generator-heading strong {
  color: #e3edf7;
  font-size: 11px;
}

.generator-heading small {
  max-width: 720px;
  margin-top: 2px;
  color: #7c91a5;
  font-size: 7px;
  line-height: 1.5;
}

.heading-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  color: #67e8f9;
  background: rgb(34 211 238 / 8%);
  border: 1px solid rgb(34 211 238 / 20%);
  border-radius: 9px;
}

.heading-icon .q-icon {
  font-size: 20px;
}

.source-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 12px;
  padding: 11px;
  background: #101f2e;
  border: 1px solid #2b465d;
  border-radius: 9px;
}

.source-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.source-copy span {
  color: #22d3ee;
  font-size: 6px;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.source-copy strong {
  color: #d2deea;
  font-size: 8px;
}

.source-copy small {
  margin-top: 2px;
  color: #70869b;
  font-size: 7px;
}

.source-select {
  width: 285px;
  max-width: 100%;
}

.request-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 13px;
}

.request-heading > div {
  display: flex;
  flex-direction: column;
}

.request-heading span {
  color: #6d8398;
  font-size: 6px;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.request-heading strong {
  color: #c9d6e2;
  font-size: 8px;
}

.add-button {
  min-height: 30px;
  padding: 0 11px;
  color: #d9fbff;
  background: #155e75;
  border: 1px solid #1d7d94;
  border-radius: 7px;
}

.add-button:hover {
  background: #176d85;
  border-color: #22d3ee;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 8px;
}

.request-card {
  display: grid;
  grid-template-columns:
    30px
    minmax(0, 1fr)
    minmax(160px, 0.52fr)
    34px;
  align-items: center;
  gap: 9px;
  padding: 9px;
  background: #101f2e;
  border: 1px solid #29445a;
  border-radius: 9px;
  transition:
    border-color 0.18s ease,
    background 0.18s ease;
}

.request-card:hover {
  background: #112335;
  border-color: #365d78;
}

.request-number {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  color: #cffafe;
  background: rgb(34 211 238 / 9%);
  border: 1px solid rgb(34 211 238 / 18%);
  border-radius: 7px;
  font-size: 8px;
  font-weight: 750;
}

.request-fields {
  display: grid;
  min-width: 0;
  grid-template-columns:
    minmax(170px, 1.2fr)
    minmax(130px, 0.8fr)
    minmax(120px, 0.65fr);
  gap: 7px;
}

.request-description {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #7e93a7;
  font-size: 7px;
  line-height: 1.4;
}

.description-icon {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  color: #a5f3fc;
  background: #12283a;
  border: 1px solid #28475e;
  border-radius: 7px;
}

.description-icon .q-icon {
  font-size: 14px;
}

.delete-button {
  color: #cc8997;
  background: rgb(244 63 94 / 5%);
}

.delete-button:hover {
  color: #fda4af;
  background: rgb(244 63 94 / 10%);
}

.empty-requests {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 82px;
  margin-top: 8px;
  padding: 12px;
  background: #0f1e2c;
  border: 1px dashed #355168;
  border-radius: 9px;
}

.empty-icon {
  display: grid;
  width: 35px;
  height: 35px;
  flex: 0 0 auto;
  place-items: center;
  color: #67e8f9;
  background: rgb(34 211 238 / 6%);
  border-radius: 50%;
}

.empty-icon .q-icon {
  font-size: 21px;
}

.empty-requests > div:last-child {
  display: flex;
  flex-direction: column;
}

.empty-requests strong {
  color: #a9bbca;
  font-size: 8px;
}

.empty-requests span {
  margin-top: 2px;
  color: #6d8296;
  font-size: 7px;
}

.quick-add {
  margin-top: 11px;
  padding: 10px;
  background: #0c1926;
  border: 1px solid #223c51;
  border-radius: 9px;
}

.quick-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.quick-heading > span {
  color: #6d8297;
  font-size: 6px;
  font-weight: 750;
  letter-spacing: 0.07em;
}

.quick-heading small {
  color: #526b81;
  font-size: 6px;
}

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.quick-buttons button {
  display: inline-flex;
  min-height: 29px;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  color: #a9c9d4;
  background: #112333;
  border: 1px solid #315069;
  border-radius: 7px;
  cursor: pointer;
  font: inherit;
  font-size: 7px;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}

.quick-buttons button .q-icon {
  color: #5ee3f2;
  font-size: 13px;
}

.quick-buttons button:hover:not(:disabled) {
  color: #ecfeff;
  background: #143044;
  border-color: #22d3ee;
}

.quick-buttons button:disabled {
  cursor: default;
  opacity: 0.38;
}

.generator-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid #284054;
}

.generator-info {
  display: flex;
  align-items: center;
  gap: 7px;
}

.generator-info > .q-icon {
  color: #67e8f9;
  font-size: 16px;
}

.generator-info > div {
  display: flex;
  flex-direction: column;
}

.generator-info strong {
  color: #a9c7d3;
  font-size: 7px;
}

.generator-info span {
  color: #647b90;
  font-size: 6px;
}

.generate-button {
  min-height: 33px;
  padding: 0 14px;
  color: #ecfeff;
  background: linear-gradient(135deg, #0e7490, #256b82);
  border: 1px solid #2492aa;
  border-radius: 8px;
  box-shadow: 0 5px 18px rgb(8 145 178 / 10%);
}

.generate-button:hover {
  background: linear-gradient(135deg, #0f829e, #2b7790);
}

.generator-control {
  --field-border: #365a72;
  --field-border-focus: #22d3ee;
}

.generator-control :deep(.q-field__control) {
  min-height: 40px;
  color: #d9edf4;
  background: #0a1723;
  border-radius: 7px;
}

.generator-control :deep(.q-field__control::before) {
  border-color: var(--field-border) !important;
}

.generator-control:hover :deep(.q-field__control::before) {
  border-color: #4b7189 !important;
}

.generator-control.q-field--focused :deep(.q-field__control::before),
.generator-control.q-field--focused :deep(.q-field__control::after) {
  border-color: var(--field-border-focus) !important;
}

.generator-control :deep(.q-field__native),
.generator-control :deep(.q-field__input) {
  color: #e4f4fa !important;
  font-size: 8px;
  font-weight: 600;
}

.generator-control :deep(.q-field__label) {
  color: #7891a5 !important;
  font-size: 8px;
}

.generator-control.q-field--focused :deep(.q-field__label) {
  color: #67e8f9 !important;
}

.generator-control :deep(.q-field__marginal) {
  color: #68aebe !important;
}

.generator-control :deep(.q-field__prepend) {
  padding-right: 7px;
}

.generator-control :deep(.q-field__prepend .q-icon) {
  color: #5cc7d7;
  font-size: 15px;
}

.generator-control.q-field--disabled {
  opacity: 0.45;
}

:global(.icp-voice-select-menu) {
  color: #dcebf3 !important;
  background: #0c1b28 !important;
  border: 1px solid #35566d !important;
  border-radius: 8px !important;
  box-shadow: 0 14px 32px rgb(0 0 0 / 38%) !important;
}

:global(.icp-voice-select-menu .q-item) {
  min-height: 34px !important;
  color: #c7dce7 !important;
  font-size: 9px !important;
}

:global(.icp-voice-select-menu .q-item:hover) {
  color: #ecfeff !important;
  background: rgb(34 211 238 / 9%) !important;
}

:global(.icp-voice-select-menu .q-item.q-manual-focusable--focused) {
  color: #ecfeff !important;
  background: rgb(34 211 238 / 11%) !important;
}

:global(.icp-voice-select-menu .q-item--active) {
  color: #67e8f9 !important;
  background: rgb(34 211 238 / 8%) !important;
}

@media (max-width: 1000px) {
  .request-card {
    grid-template-columns:
      30px
      minmax(0, 1fr)
      34px;
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

  .quick-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 520px) {
  .request-card {
    grid-template-columns: 30px 1fr 34px;
  }

  .request-description {
    grid-column: 1 / -1;
  }

  .generator-actions .q-btn {
    width: 100%;
  }
}
</style>
