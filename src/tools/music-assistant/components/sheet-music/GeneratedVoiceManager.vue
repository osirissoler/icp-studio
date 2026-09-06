<template>
  <section class="manager-panel">
    <header class="manager-heading">
      <div>
        <span>VOCES GENERADAS</span>

        <strong>
          {{ parts.length }}
          {{ parts.length === 1 ? 'voz adicional' : 'voces adicionales' }}
        </strong>

        <small>
          Cada voz generada tiene ahora su propia pista musical. Las correcciones manuales aparecen
          resaltadas sin modificar las voces originales.
        </small>
      </div>

      <div class="heading-icon">
        <q-icon name="auto_awesome" />
      </div>
    </header>

    <div v-if="generatedHasSolo" class="solo-notice">
      <q-icon name="headphones" />

      <span>
        Hay voces generadas en
        <strong>Solo</strong>.
      </span>
    </div>

    <div class="voice-grid">
      <article
        v-for="part in parts"
        :key="part.id"
        class="voice-card"
        :class="{
          selected: selectedIds.includes(part.id),
          playing: playingPartId === part.id,
          editing: editingPartId === part.id,
          muted: mixerChannel(part.id).muted,
          solo: mixerChannel(part.id).solo,
        }"
      >
        <div class="voice-card-top">
          <button
            type="button"
            class="voice-selector"
            :disabled="disabled"
            @click="toggleSelected(part.id)"
          >
            <q-icon
              :name="selectedIds.includes(part.id) ? 'check_circle' : 'radio_button_unchecked'"
            />

            <div>
              <span>
                {{ part.abbreviation || 'GEN' }}
              </span>

              <strong>
                {{ part.name }}
              </strong>

              <small>
                Basada en
                {{ sourcePartName(part.generatedFromPartId) }}
              </small>
            </div>
          </button>

          <div v-if="playingPartId === part.id" class="playing-indicator">
            <span />

            Reproduciendo
          </div>
        </div>

        <div class="voice-meta">
          <div>
            <span>TIPO</span>

            <strong>
              {{ kindLabel(part) }}
            </strong>
          </div>

          <div>
            <span>POSICIÓN</span>

            <strong>
              {{ placementLabel(part) }}
            </strong>
          </div>

          <div>
            <span>RANGO</span>

            <strong>
              {{ rangeLabel(part) }}
            </strong>
          </div>
        </div>

        <ScorePartLane :part="part" :total-beats="totalBeats" accent="generated" />

        <section class="mixer-channel">
          <div class="volume-heading">
            <span>VOLUMEN</span>

            <strong> {{ mixerChannel(part.id).volume }}% </strong>
          </div>

          <q-slider
            :model-value="mixerChannel(part.id).volume"
            :min="0"
            :max="100"
            :step="1"
            color="deep-purple-3"
            track-color="blue-grey-9"
            :disable="disabled"
            @update:model-value="updateVolume(part.id, $event)"
          />

          <div class="mixer-buttons">
            <q-btn
              unelevated
              dense
              no-caps
              icon="headphones"
              label="Solo"
              class="solo-button"
              :class="{
                active: mixerChannel(part.id).solo,
              }"
              :disable="disabled"
              @click="toggleSolo(part.id)"
            />

            <q-btn
              unelevated
              dense
              no-caps
              :icon="mixerChannel(part.id).muted ? 'volume_off' : 'volume_up'"
              :label="mixerChannel(part.id).muted ? 'Muted' : 'Mute'"
              class="mute-button"
              :class="{
                active: mixerChannel(part.id).muted,
              }"
              :disable="disabled"
              @click="toggleMute(part.id)"
            />

            <q-btn
              flat
              round
              dense
              icon="restart_alt"
              class="reset-mix-button"
              :disable="disabled"
              @click="resetMix(part.id)"
            >
              <q-tooltip> Restablecer canal </q-tooltip>
            </q-btn>
          </div>
        </section>

        <div class="voice-actions">
          <q-btn
            unelevated
            no-caps
            dense
            icon="play_arrow"
            label="Escuchar"
            class="play-button"
            :disable="disabled"
            @click="emit('playPart', part.id)"
          />

          <q-btn
            flat
            no-caps
            dense
            icon="edit"
            label="Editar"
            class="edit-button"
            :disable="disabled"
            @click="openEditor(part)"
          />

          <q-btn
            flat
            no-caps
            dense
            icon="refresh"
            label="Regenerar"
            class="regenerate-button"
            :disable="disabled"
            @click="regeneratePart(part)"
          />

          <q-btn
            flat
            round
            dense
            icon="delete_outline"
            class="delete-button"
            :disable="disabled"
            @click="deletePart(part.id)"
          >
            <q-tooltip> Eliminar voz </q-tooltip>
          </q-btn>
        </div>
      </article>
    </div>

    <section v-if="editingPart && draft" class="voice-editor">
      <header>
        <div>
          <span>EDITAR VOZ</span>

          <strong>
            {{ editingPart.name }}
          </strong>

          <small> Los cambios se aplicarán únicamente a esta voz al regenerarla. </small>
        </div>

        <q-btn
          flat
          round
          dense
          icon="close"
          class="close-button"
          :disable="disabled"
          @click="closeEditor"
        />
      </header>

      <div class="editor-grid">
        <q-input
          v-model="draft.label"
          dense
          outlined
          dark
          color="cyan-4"
          label="Nombre"
          class="manager-field"
          :disable="disabled"
        />

        <q-select
          v-model="draft.kind"
          :options="voiceTypeOptions"
          emit-value
          map-options
          dense
          outlined
          dark
          color="cyan-4"
          options-dense
          label="Tipo"
          popup-content-class="generated-manager-menu"
          class="manager-field"
          :disable="disabled"
          @update:model-value="applyDefaultRange"
        />

        <q-select
          v-model="draft.placement"
          :options="placementOptions"
          emit-value
          map-options
          dense
          outlined
          dark
          color="cyan-4"
          options-dense
          label="Posición"
          popup-content-class="generated-manager-menu"
          class="manager-field"
          :disable="disabled"
          @update:model-value="applyDefaultRange"
        />

        <q-input
          v-model.number="draft.minMidi"
          type="number"
          dense
          outlined
          dark
          color="cyan-4"
          label="MIDI mínimo"
          class="manager-field"
          :disable="disabled"
        />

        <q-input
          v-model.number="draft.maxMidi"
          type="number"
          dense
          outlined
          dark
          color="cyan-4"
          label="MIDI máximo"
          class="manager-field"
          :disable="disabled"
        />
      </div>

      <div v-if="rangeError" class="editor-error">
        <q-icon name="error_outline" />

        MIDI mínimo debe ser menor que MIDI máximo.
      </div>

      <footer>
        <q-btn
          flat
          no-caps
          label="Cancelar"
          class="cancel-button"
          :disable="disabled"
          @click="closeEditor"
        />

        <q-btn
          unelevated
          no-caps
          icon="refresh"
          label="Guardar y regenerar"
          class="save-button"
          :disable="disabled || rangeError || !draft.label.trim()"
          @click="saveAndRegenerate"
        />
      </footer>
    </section>

    <footer class="manager-actions">
      <div>
        <span>
          {{ selectedIds.length }}
          seleccionadas
        </span>

        <small> Puedes combinar cualquier número de pistas. </small>
      </div>

      <q-btn
        flat
        no-caps
        icon="restart_alt"
        label="Restablecer mezcla"
        class="reset-all-button"
        :disable="disabled"
        @click="resetAllMix"
      />

      <q-btn
        v-if="playing"
        outline
        no-caps
        icon="stop"
        label="Detener"
        class="stop-button"
        @click="emit('stop')"
      />

      <q-btn
        unelevated
        no-caps
        icon="play_arrow"
        :label="playing && !playingPartId ? 'Reproduciendo selección' : 'Escuchar seleccionadas'"
        class="selected-play-button"
        :disable="disabled || !selectedIds.length"
        @click="emit('playSelected')"
      />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { scorePartDurationBeats, type ScorePart } from '../../shared/score';

import type {
  GeneratedVoiceKind,
  GeneratedVoicePlacement,
  GeneratedVoiceRequest,
} from './generated-voice-engine';

import ScorePartLane from './ScorePartLane.vue';

import {
  removeScoreMixerChannel,
  resetScoreMixerChannel,
  resetScoreMixerParts,
  scoreMixerChannel,
  scoreMixerHasSolo,
  setScoreMixerVolume,
  toggleScoreMixerMute,
  toggleScoreMixerSolo,
} from './score-mixer-store';

interface VoiceDraft {
  id: string;

  label: string;

  kind: GeneratedVoiceKind;

  placement: GeneratedVoicePlacement;

  minMidi: number;

  maxMidi: number;
}

const props = defineProps<{
  parts: ScorePart[];

  originalParts: ScorePart[];

  selectedIds: string[];

  disabled: boolean;

  playing: boolean;

  playingPartId: string | null;
}>();

const emit = defineEmits<{
  'update:selectedIds': [value: string[]];

  playSelected: [];

  playPart: [partId: string];

  stop: [];

  regenerate: [partId: string, request: GeneratedVoiceRequest];

  delete: [partId: string];
}>();

const editingPartId = ref<string | null>(null);

const draft = ref<VoiceDraft | null>(null);

const totalBeats = computed(() => {
  const allParts = [...props.originalParts, ...props.parts];

  if (!allParts.length) {
    return 1;
  }

  return Math.max(1, ...allParts.map((part) => scorePartDurationBeats(part)));
});

const editingPart = computed(
  () => props.parts.find((part) => part.id === editingPartId.value) ?? null,
);

const rangeError = computed(() => {
  if (!draft.value) {
    return false;
  }

  return (
    !Number.isFinite(draft.value.minMidi) ||
    !Number.isFinite(draft.value.maxMidi) ||
    draft.value.minMidi >= draft.value.maxMidi
  );
});

const generatedHasSolo = computed(() => scoreMixerHasSolo(props.parts));

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

function mixerChannel(partId: string) {
  return scoreMixerChannel(partId);
}

function updateVolume(partId: string, value: number | null): void {
  if (value === null) {
    return;
  }

  setScoreMixerVolume(partId, value);
}

function toggleMute(partId: string): void {
  toggleScoreMixerMute(partId);
}

function toggleSolo(partId: string): void {
  toggleScoreMixerSolo(partId);
}

function resetMix(partId: string): void {
  resetScoreMixerChannel(partId);
}

function resetAllMix(): void {
  resetScoreMixerParts(props.parts);
}

function toggleSelected(partId: string): void {
  if (props.selectedIds.includes(partId)) {
    emit(
      'update:selectedIds',
      props.selectedIds.filter((id) => id !== partId),
    );

    return;
  }

  emit('update:selectedIds', [...props.selectedIds, partId]);
}

function openEditor(part: ScorePart): void {
  const request = requestFromPart(part);

  const range = defaultRange(request.kind, request.placement);

  editingPartId.value = part.id;

  draft.value = {
    id: request.id,

    label: request.label,

    kind: request.kind,

    placement: request.placement,

    minMidi: request.minMidi ?? range.minimum,

    maxMidi: request.maxMidi ?? range.maximum,
  };
}

function closeEditor(): void {
  editingPartId.value = null;

  draft.value = null;
}

function applyDefaultRange(): void {
  if (!draft.value) {
    return;
  }

  const range = defaultRange(draft.value.kind, draft.value.placement);

  draft.value.minMidi = range.minimum;

  draft.value.maxMidi = range.maximum;
}

function saveAndRegenerate(): void {
  if (!editingPart.value || !draft.value || rangeError.value) {
    return;
  }

  emit('regenerate', editingPart.value.id, {
    id: draft.value.id,

    label: draft.value.label.trim() || editingPart.value.name,

    kind: draft.value.kind,

    placement: draft.value.placement,

    minMidi: Number(draft.value.minMidi),

    maxMidi: Number(draft.value.maxMidi),
  });

  closeEditor();
}

function regeneratePart(part: ScorePart): void {
  emit('regenerate', part.id, requestFromPart(part));
}

function deletePart(partId: string): void {
  removeScoreMixerChannel(partId);

  emit('delete', partId);
}

function requestFromPart(part: ScorePart): GeneratedVoiceRequest {
  const config = part.generatedVoiceConfig;

  if (config) {
    return {
      id: config.requestId,

      label: config.label,

      kind: config.kind,

      placement: config.placement,

      customDiatonicOffset: config.customDiatonicOffset,

      customSemitoneOffset: config.customSemitoneOffset,

      minMidi: config.minMidi,

      maxMidi: config.maxMidi,
    };
  }

  const parsed = parseLegacyVoiceType(part.generatedVoiceType);

  const range = defaultRange(parsed.kind, parsed.placement);

  return {
    id: legacyRequestId(part.id),

    label: part.name,

    kind: parsed.kind,

    placement: parsed.placement,

    minMidi: range.minimum,

    maxMidi: range.maximum,
  };
}

function parseLegacyVoiceType(value: string | undefined): {
  kind: GeneratedVoiceKind;

  placement: GeneratedVoicePlacement;
} {
  const [rawKind, rawPlacement] = (value ?? '').split(':');

  const kind: GeneratedVoiceKind =
    rawKind === 'second' ||
    rawKind === 'tenor' ||
    rawKind === 'baritone' ||
    rawKind === 'bass' ||
    rawKind === 'custom'
      ? rawKind
      : 'second';

  return {
    kind,

    placement: rawPlacement === 'below' ? 'below' : 'above',
  };
}

function legacyRequestId(partId: string): string {
  return partId.replace(/^generated-/, '').replace(/[^a-zA-Z0-9-_]/g, '-');
}

function kindLabel(part: ScorePart): string {
  const kind = requestFromPart(part).kind;

  if (kind === 'second') {
    return 'Segunda';
  }

  if (kind === 'tenor') {
    return 'Tenor';
  }

  if (kind === 'baritone') {
    return 'Barítono';
  }

  if (kind === 'bass') {
    return 'Bajo';
  }

  return 'Personalizada';
}

function placementLabel(part: ScorePart): string {
  return requestFromPart(part).placement === 'above' ? 'Arriba' : 'Abajo';
}

function rangeLabel(part: ScorePart): string {
  const request = requestFromPart(part);

  const range = defaultRange(request.kind, request.placement);

  return `${request.minMidi ?? range.minimum} – ${request.maxMidi ?? range.maximum}`;
}

function sourcePartName(sourcePartId: string | undefined): string {
  if (!sourcePartId) {
    return 'voz original';
  }

  return props.originalParts.find((part) => part.id === sourcePartId)?.name ?? 'voz original';
}

function defaultRange(
  kind: GeneratedVoiceKind,
  placement: GeneratedVoicePlacement,
): {
  minimum: number;

  maximum: number;
} {
  if (kind === 'second') {
    return placement === 'above'
      ? {
          minimum: 55,
          maximum: 88,
        }
      : {
          minimum: 48,
          maximum: 79,
        };
  }

  if (kind === 'tenor') {
    return placement === 'above'
      ? {
          minimum: 52,
          maximum: 79,
        }
      : {
          minimum: 45,
          maximum: 74,
        };
  }

  if (kind === 'baritone') {
    return placement === 'above'
      ? {
          minimum: 48,
          maximum: 74,
        }
      : {
          minimum: 40,
          maximum: 69,
        };
  }

  if (kind === 'bass') {
    return placement === 'above'
      ? {
          minimum: 43,
          maximum: 69,
        }
      : {
          minimum: 32,
          maximum: 60,
        };
  }

  return {
    minimum: 36,

    maximum: 88,
  };
}
</script>

<style scoped>
.manager-panel {
  margin-top: 11px;
  padding: 12px;
  background: radial-gradient(circle at 100% 0%, rgb(167 139 250 / 8%), transparent 32%), #0d1a27;
  border: 1px solid rgb(167 139 250 / 20%);
  border-radius: 10px;
}

.manager-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.manager-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.manager-heading span {
  color: #a78bfa;
  font-size: 7px;
  font-weight: 750;
}

.manager-heading strong {
  color: #ddd6fe;
  font-size: 11px;
}

.manager-heading small {
  max-width: 720px;
  color: #77748d;
  font-size: 7px;
}

.heading-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #c4b5fd;
  background: rgb(167 139 250 / 8%);
  border-radius: 8px;
}

.solo-notice {
  margin-top: 8px;
  padding: 7px;
  color: #fde68a;
  background: rgb(245 158 11 / 6%);
  border: 1px solid rgb(245 158 11 / 18%);
  border-radius: 7px;
  font-size: 7px;
}

.voice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 11px;
}

.voice-card {
  min-width: 0;
  padding: 9px;
  background: #101e2c;
  border: 1px solid #293e53;
  border-radius: 9px;
}

.voice-card.selected {
  border-color: rgb(167 139 250 / 45%);
}

.voice-card.playing {
  background: rgb(167 139 250 / 7%);
}

.voice-card.editing {
  border-color: #22d3ee;
}

.voice-card.solo {
  border-color: rgb(245 158 11 / 40%);
}

.voice-card.muted {
  opacity: 0.68;
}

.voice-card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.voice-selector {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: 24px 1fr;
  gap: 7px;
  align-items: center;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.voice-selector > .q-icon {
  color: #a78bfa;
  font-size: 18px;
}

.voice-selector > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.voice-selector span {
  color: #a78bfa;
  font-size: 6px;
}

.voice-selector strong {
  overflow: hidden;
  color: #d8d1e8;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.voice-selector small {
  color: #717b8a;
  font-size: 6px;
}

.playing-indicator {
  color: #c4b5fd;
  font-size: 6px;
}

.voice-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  margin-top: 8px;
}

.voice-meta > div {
  display: flex;
  flex-direction: column;
  padding: 6px;
  background: #0d1926;
  border-radius: 6px;
}

.voice-meta span {
  color: #5f7185;
  font-size: 5px;
}

.voice-meta strong {
  color: #aebdca;
  font-size: 7px;
}

.mixer-channel {
  margin-top: 8px;
  padding: 7px;
  background: #0b1824;
  border-radius: 7px;
}

.volume-heading {
  display: flex;
  justify-content: space-between;
}

.volume-heading span {
  color: #69617e;
  font-size: 5px;
}

.volume-heading strong {
  color: #c4b5fd;
  font-size: 7px;
}

.mixer-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr 30px;
  gap: 5px;
}

.solo-button,
.mute-button {
  color: #817c91;
  background: #12202e;
  border-radius: 6px;
}

.solo-button.active {
  color: #fde68a;
}

.mute-button.active {
  color: #fda4af;
}

.voice-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.play-button,
.save-button,
.selected-play-button {
  color: white;
  background: #16738a;
}

.edit-button {
  color: #8fd9e6;
}

.regenerate-button {
  color: #b8a7e6;
}

.delete-button {
  margin-left: auto;
  color: #be7f8f;
}

.voice-editor {
  margin-top: 10px;
  padding: 11px;
  background: #0c1926;
  border: 1px solid #315168;
  border-radius: 9px;
}

.voice-editor > header {
  display: flex;
  justify-content: space-between;
}

.voice-editor > header > div {
  display: flex;
  flex-direction: column;
}

.voice-editor > header span {
  color: #22d3ee;
  font-size: 6px;
}

.voice-editor > header strong {
  color: #d6e6ef;
  font-size: 10px;
}

.voice-editor > header small {
  color: #6e8295;
  font-size: 7px;
}

.editor-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.8fr 0.6fr 0.6fr;
  gap: 7px;
  margin-top: 9px;
}

.manager-field :deep(.q-field__control) {
  background: #091722;
}

.manager-field :deep(.q-field__native),
.manager-field :deep(.q-field__input) {
  color: #dcecf3 !important;
  font-size: 8px;
}

.editor-error {
  margin-top: 8px;
  padding: 7px;
  color: #fda4af;
}

.voice-editor > footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 9px;
}

.manager-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #253b4f;
}

.manager-actions > div {
  display: flex;
  margin-right: auto;
  flex-direction: column;
}

.manager-actions span {
  color: #aaa0c3;
  font-size: 7px;
}

.manager-actions small {
  color: #6d7180;
  font-size: 6px;
}

.reset-all-button {
  color: #958aad;
}

.stop-button {
  color: #aab9c7;
}

:global(.generated-manager-menu) {
  color: #dcebf3 !important;
  background: #0c1b28 !important;
}

@media (max-width: 1000px) {
  .voice-grid {
    grid-template-columns: 1fr;
  }

  .editor-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 700px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .manager-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .manager-actions > div {
    margin-right: 0;
  }
}
</style>
