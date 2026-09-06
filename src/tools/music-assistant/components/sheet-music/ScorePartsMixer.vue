<template>
  <section v-if="parts.length" class="parts-mixer">
    <header class="mixer-header">
      <div>
        <span> VOCES ORIGINALES </span>

        <strong> Mezclador de la partitura </strong>

        <small>
          Selecciona las voces originales, controla el volumen de cada una y utiliza Solo o Mute
          para estudiar cualquier combinación.
        </small>
      </div>

      <div class="part-count">
        <q-icon name="tune" />

        <strong>
          {{ parts.length }}
        </strong>

        <span>
          {{ parts.length === 1 ? 'canal' : 'canales' }}
        </span>
      </div>
    </header>

    <div class="mixer-toolbar">
      <div class="selection-info">
        <q-icon name="graphic_eq" />

        <div>
          <span>
            {{ audibleCount }}
            audibles
          </span>

          <small>
            {{ selectedIds.length }}
            seleccionadas
          </small>
        </div>
      </div>

      <div class="selection-actions">
        <q-btn
          flat
          dense
          no-caps
          icon="done_all"
          label="Todas"
          :disable="disabled || allSelected"
          @click="selectAll"
        />

        <q-btn
          flat
          dense
          no-caps
          icon="remove_done"
          label="Ninguna"
          :disable="disabled || !selectedIds.length"
          @click="clearAll"
        />

        <q-btn
          flat
          dense
          no-caps
          icon="restart_alt"
          label="Restablecer mezcla"
          :disable="disabled"
          @click="resetMixer"
        />
      </div>
    </div>

    <div v-if="hasSolo" class="solo-notice">
      <q-icon name="headphones" />

      <span>
        Hay uno o más canales en
        <strong>Solo</strong>. Durante la reproducción solo se escucharán esos canales.
      </span>
    </div>

    <div class="channels-grid">
      <article
        v-for="part in parts"
        :key="part.id"
        class="channel-card"
        :class="{
          selected: isSelected(part.id),
          muted: channel(part.id).muted,
          solo: channel(part.id).solo,
        }"
      >
        <header class="channel-header">
          <button
            type="button"
            class="channel-selector"
            :disabled="disabled"
            @click="togglePart(part.id)"
          >
            <q-icon :name="isSelected(part.id) ? 'check_circle' : 'radio_button_unchecked'" />

            <div>
              <span>
                {{ part.abbreviation || 'VOZ' }}
              </span>

              <strong>
                {{ part.name }}
              </strong>

              <small>
                {{ clefLabel(part) }}
                ·
                {{ noteCount(part) }}
                notas
              </small>
            </div>
          </button>

          <q-icon name="piano" class="piano-icon" />
        </header>

        <section class="channel-volume">
          <div class="volume-heading">
            <span> VOLUMEN </span>

            <strong> {{ channel(part.id).volume }}% </strong>
          </div>

          <q-slider
            :model-value="channel(part.id).volume"
            :min="0"
            :max="100"
            :step="1"
            color="cyan-4"
            track-color="blue-grey-9"
            :disable="disabled"
            @update:model-value="setVolume(part.id, $event)"
          />
        </section>

        <div class="channel-controls">
          <q-btn
            unelevated
            no-caps
            dense
            icon="headphones"
            label="Solo"
            class="solo-button"
            :class="{
              active: channel(part.id).solo,
            }"
            :disable="disabled"
            @click="toggleSolo(part.id)"
          />

          <q-btn
            unelevated
            no-caps
            dense
            :icon="channel(part.id).muted ? 'volume_off' : 'volume_up'"
            :label="channel(part.id).muted ? 'Muted' : 'Mute'"
            class="mute-button"
            :class="{
              active: channel(part.id).muted,
            }"
            :disable="disabled"
            @click="toggleMute(part.id)"
          />

          <q-btn
            flat
            round
            dense
            icon="restart_alt"
            class="channel-reset"
            :disable="disabled"
            @click="resetChannel(part.id)"
          >
            <q-tooltip> Restablecer este canal </q-tooltip>
          </q-btn>
        </div>

        <div class="channel-state">
          <span v-if="channel(part.id).solo" class="solo-state"> SOLO </span>

          <span v-if="channel(part.id).muted" class="mute-state"> MUTE </span>

          <span v-if="!channel(part.id).solo && !channel(part.id).muted" class="normal-state">
            ACTIVO
          </span>
        </div>
      </article>
    </div>

    <div class="mixer-footer">
      <div class="selected-description">
        <span> SE REPRODUCIRÁ </span>

        <strong>
          {{ selectedDescription }}
        </strong>

        <small> Los faders, Solo y Mute se aplican automáticamente al motor de piano. </small>
      </div>

      <div class="playback-actions">
        <q-btn
          unelevated
          no-caps
          icon="play_arrow"
          :label="playing ? 'Reproduciendo mezcla' : 'Reproducir mezcla'"
          class="play-button"
          :disable="disabled || playing || !selectedIds.length || !audibleCount"
          @click="emit('play')"
        />

        <q-btn
          outline
          no-caps
          icon="stop"
          label="Detener"
          class="stop-button"
          :disable="!playing"
          @click="emit('stop')"
        />
      </div>
    </div>

    <div v-if="playing" class="playing-indicator">
      <span class="playing-dot"></span>

      <strong> Reproduciendo mezcla de voces originales </strong>

      <small v-if="activeBeat !== null">
        Beat
        {{ formatBeat(activeBeat) }}
      </small>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { ScorePart } from '../../shared/score';

import {
  resetScoreMixerChannel,
  resetScoreMixerParts,
  resolveScoreMixerChannels,
  scoreMixerChannel,
  scoreMixerHasSolo,
  setScoreMixerVolume,
  toggleScoreMixerMute,
  toggleScoreMixerSolo,
} from './score-mixer-store';

const props = defineProps<{
  parts: ScorePart[];

  selectedIds: string[];

  disabled: boolean;

  playing: boolean;

  activeBeat: number | null;
}>();

const emit = defineEmits<{
  'update:selectedIds': [value: string[]];

  play: [];

  stop: [];
}>();

const allSelected = computed(
  () => props.parts.length > 0 && props.selectedIds.length === props.parts.length,
);

const selectedParts = computed(() =>
  props.parts.filter((part) => props.selectedIds.includes(part.id)),
);

const audibleCount = computed(() => resolveScoreMixerChannels(selectedParts.value).length);

const hasSolo = computed(() => scoreMixerHasSolo(selectedParts.value));

const selectedDescription = computed(() => {
  if (!props.selectedIds.length) {
    return 'Ninguna voz seleccionada';
  }

  const names = props.parts
    .filter((part) => props.selectedIds.includes(part.id))
    .map((part) => part.name);

  return names.join(' + ');
});

function channel(partId: string) {
  return scoreMixerChannel(partId);
}

function isSelected(partId: string): boolean {
  return props.selectedIds.includes(partId);
}

function togglePart(partId: string): void {
  if (props.disabled) {
    return;
  }

  if (isSelected(partId)) {
    emit(
      'update:selectedIds',
      props.selectedIds.filter((id) => id !== partId),
    );

    return;
  }

  emit('update:selectedIds', [...props.selectedIds, partId]);
}

function selectAll(): void {
  emit(
    'update:selectedIds',
    props.parts.map((part) => part.id),
  );
}

function clearAll(): void {
  emit('update:selectedIds', []);
}

function setVolume(partId: string, value: number | null): void {
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

function resetChannel(partId: string): void {
  resetScoreMixerChannel(partId);
}

function resetMixer(): void {
  resetScoreMixerParts(props.parts);
}

function noteCount(part: ScorePart): number {
  return part.measures.reduce(
    (total, measure) => total + measure.events.filter((event) => event.type === 'note').length,
    0,
  );
}

function clefLabel(part: ScorePart): string {
  const { sign, line, octaveChange } = part.clef;

  let label = 'Clave no identificada';

  if (sign === 'G') {
    label = 'Clave de Sol';
  } else if (sign === 'F') {
    label = 'Clave de Fa';
  } else if (sign === 'C') {
    label = 'Clave de Do';
  } else if (sign === 'percussion') {
    label = 'Percusión';
  } else if (sign === 'TAB') {
    label = 'Tablatura';
  }

  if (line !== null && sign !== 'unknown' && sign !== 'none') {
    label += ` línea ${line}`;
  }

  if (octaveChange === -1) {
    label += ' · 8va abajo';
  } else if (octaveChange === 1) {
    label += ' · 8va arriba';
  }

  return label;
}

function formatBeat(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
</script>

<style scoped>
.parts-mixer {
  margin-top: 11px;
  padding: 12px;
  background: radial-gradient(circle at 100% 0%, rgb(34 211 238 / 7%), transparent 32%), #0d1a27;
  border: 1px solid #284156;
  border-radius: 10px;
}

.mixer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.mixer-header > div:first-child {
  display: flex;
  flex-direction: column;
}

.mixer-header span {
  color: #22d3ee;
  font-size: 7px;
  font-weight: 700;
}

.mixer-header strong {
  color: #d4e2ef;
  font-size: 11px;
}

.mixer-header small {
  max-width: 680px;
  margin-top: 2px;
  color: #65798f;
  font-size: 7px;
  line-height: 1.5;
}

.part-count {
  display: flex;
  min-width: 86px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 9px;
  color: #67e8f9;
  background: rgb(34 211 238 / 7%);
  border: 1px solid rgb(34 211 238 / 15%);
  border-radius: 8px;
}

.part-count .q-icon {
  font-size: 17px;
}

.part-count strong {
  color: #cffafe;
  font-size: 10px;
}

.part-count span {
  color: #7aa6af;
  font-size: 7px;
}

.mixer-toolbar {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 6px 8px;
  background: #0a1723;
  border: 1px solid #1f3548;
  border-radius: 8px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 7px;
}

.selection-info > .q-icon {
  color: #22d3ee;
  font-size: 18px;
}

.selection-info > div {
  display: flex;
  flex-direction: column;
}

.selection-info span {
  color: #a6bbc9;
  font-size: 8px;
}

.selection-info small {
  color: #60788c;
  font-size: 6px;
}

.selection-actions {
  display: flex;
  gap: 3px;
}

.selection-actions :deep(.q-btn) {
  color: #8298ad;
  font-size: 8px;
}

.solo-notice {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  padding: 7px 9px;
  color: #fde68a;
  background: rgb(245 158 11 / 6%);
  border: 1px solid rgb(245 158 11 / 18%);
  border-radius: 7px;
  font-size: 7px;
}

.solo-notice > .q-icon {
  font-size: 15px;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin-top: 9px;
}

.channel-card {
  position: relative;
  min-width: 0;
  padding: 9px;
  background: #102030;
  border: 1px solid #294055;
  border-radius: 9px;
  transition:
    border-color 120ms ease,
    background 120ms ease,
    opacity 120ms ease;
}

.channel-card.selected {
  border-color: rgb(34 211 238 / 45%);
}

.channel-card.solo {
  background: rgb(245 158 11 / 5%);
  border-color: rgb(245 158 11 / 48%);
}

.channel-card.muted {
  opacity: 0.68;
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.channel-selector {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: 23px 1fr;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.channel-selector:disabled {
  cursor: default;
}

.channel-selector > .q-icon {
  color: #526b80;
  font-size: 18px;
}

.channel-card.selected .channel-selector > .q-icon {
  color: #22d3ee;
}

.channel-selector > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.channel-selector span {
  color: #22d3ee;
  font-size: 6px;
}

.channel-selector strong {
  overflow: hidden;
  color: #d9e5f0;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-selector small {
  overflow: hidden;
  margin-top: 1px;
  color: #61778c;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.piano-icon {
  color: #526d82;
  font-size: 18px;
}

.channel-volume {
  margin-top: 9px;
  padding: 6px 7px 2px;
  background: #0b1824;
  border-radius: 7px;
}

.volume-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.volume-heading span {
  color: #60798d;
  font-size: 5px;
}

.volume-heading strong {
  color: #9bdde6;
  font-size: 7px;
}

.channel-volume :deep(.q-slider) {
  margin-top: -1px;
}

.channel-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 30px;
  gap: 5px;
  margin-top: 7px;
}

.solo-button,
.mute-button {
  color: #8095a8;
  background: #122333;
  border-radius: 6px;
}

.solo-button.active {
  color: #fde68a;
  background: rgb(245 158 11 / 14%);
}

.mute-button.active {
  color: #fda4af;
  background: rgb(244 63 94 / 11%);
}

.channel-reset {
  color: #6f8497;
}

.channel-state {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.channel-state span {
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 5px;
  font-weight: 700;
}

.solo-state {
  color: #fde68a;
  background: rgb(245 158 11 / 10%);
}

.mute-state {
  color: #fda4af;
  background: rgb(244 63 94 / 9%);
}

.normal-state {
  color: #67e8f9;
  background: rgb(34 211 238 / 7%);
}

.mixer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid #1f3548;
}

.selected-description {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.selected-description span {
  color: #5d758a;
  font-size: 6px;
}

.selected-description strong {
  overflow: hidden;
  max-width: 520px;
  color: #b9cad9;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-description small {
  margin-top: 2px;
  color: #60758a;
  font-size: 6px;
}

.playback-actions {
  display: flex;
  gap: 7px;
}

.play-button {
  color: white;
  background: #16738a;
  border-radius: 8px;
}

.stop-button {
  color: #94a8bc;
  border-radius: 8px;
}

.playing-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 9px;
  color: #67e8f9;
  background: rgb(34 211 238 / 5%);
  border: 1px solid rgb(34 211 238 / 12%);
  border-radius: 7px;
}

.playing-indicator strong {
  font-size: 7px;
}

.playing-indicator small {
  margin-left: auto;
  color: #7c98aa;
  font-size: 7px;
}

.playing-dot {
  width: 6px;
  height: 6px;
  background: #22d3ee;
  border-radius: 50%;
  box-shadow: 0 0 8px rgb(34 211 238 / 55%);
}

@media (max-width: 1200px) {
  .channels-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 750px) {
  .mixer-header,
  .mixer-toolbar,
  .mixer-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .selection-actions,
  .playback-actions {
    flex-wrap: wrap;
  }

  .selected-description strong {
    max-width: 100%;
  }
}

@media (max-width: 520px) {
  .channels-grid {
    grid-template-columns: 1fr;
  }

  .selection-actions,
  .playback-actions {
    flex-direction: column;
  }
}
</style>
