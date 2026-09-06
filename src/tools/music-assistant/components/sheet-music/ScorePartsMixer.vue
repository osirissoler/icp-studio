<template>
  <section v-if="parts.length" class="parts-mixer">
    <header class="mixer-header">
      <div>
        <span> VOCES ORIGINALES </span>

        <strong> Mezclador de partes de la partitura </strong>

        <small>
          Selecciona una o varias voces escritas en el MusicXML y escúchalas juntas exactamente como
          fueron importadas.
        </small>
      </div>

      <div class="part-count">
        <q-icon name="groups" />

        <strong>{{ parts.length }}</strong>

        <span>
          {{ parts.length === 1 ? 'parte' : 'partes' }}
        </span>
      </div>
    </header>

    <div class="mixer-toolbar">
      <div class="selection-info">
        <q-icon name="checklist" />

        <span>
          {{ selectedIds.length }}
          de
          {{ parts.length }}
          seleccionadas
        </span>
      </div>

      <div class="selection-actions">
        <q-btn
          flat
          dense
          no-caps
          icon="done_all"
          label="Seleccionar todas"
          :disable="disabled || allSelected"
          @click="selectAll"
        />

        <q-btn
          flat
          dense
          no-caps
          icon="remove_done"
          label="Quitar todas"
          :disable="disabled || !selectedIds.length"
          @click="clearAll"
        />
      </div>
    </div>

    <div class="parts-grid">
      <button
        v-for="part in parts"
        :key="part.id"
        type="button"
        class="part-card"
        :class="{
          selected: isSelected(part.id),
        }"
        :disabled="disabled"
        @click="togglePart(part.id)"
      >
        <div class="part-check">
          <q-icon :name="isSelected(part.id) ? 'check_circle' : 'radio_button_unchecked'" />
        </div>

        <div class="part-content">
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

        <q-icon name="piano" class="piano-icon" />
      </button>
    </div>

    <div class="mixer-footer">
      <div class="selected-description">
        <span>SE ESCUCHARÁ</span>

        <strong>
          {{ selectedDescription }}
        </strong>
      </div>

      <div class="playback-actions">
        <q-btn
          unelevated
          no-caps
          icon="play_arrow"
          :label="playing ? 'Reproduciendo selección' : 'Reproducir seleccionadas'"
          class="play-button"
          :disable="disabled || playing || !selectedIds.length"
          @click="$emit('play')"
        />

        <q-btn
          outline
          no-caps
          icon="stop"
          label="Detener"
          class="stop-button"
          :disable="!playing"
          @click="$emit('stop')"
        />
      </div>
    </div>

    <div v-if="playing" class="playing-indicator">
      <span class="playing-dot"></span>

      <strong>Reproduciendo partes originales</strong>

      <small v-if="activeBeat !== null"> Beat {{ formatBeat(activeBeat) }} </small>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { ScorePart } from '../../shared/score';

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

const selectedDescription = computed(() => {
  if (!props.selectedIds.length) {
    return 'Ninguna voz seleccionada';
  }

  const names = props.parts
    .filter((part) => props.selectedIds.includes(part.id))
    .map((part) => part.name);

  return names.join(' + ');
});

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
  min-width: 80px;
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
  min-height: 34px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 5px 7px;
  background: #0a1723;
  border: 1px solid #1f3548;
  border-radius: 8px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8ba0b4;
  font-size: 8px;
}

.selection-info .q-icon {
  color: #22d3ee;
  font-size: 16px;
}

.selection-actions {
  display: flex;
  gap: 3px;
}

.selection-actions :deep(.q-btn) {
  color: #8298ad;
  font-size: 8px;
}

.parts-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin-top: 9px;
}

.part-card {
  display: grid;
  min-height: 68px;
  grid-template-columns: 24px 1fr 20px;
  align-items: center;
  gap: 7px;
  padding: 8px;
  color: #8296aa;
  text-align: left;
  background: #102030;
  border: 1px solid #294055;
  border-radius: 9px;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background 120ms ease,
    transform 120ms ease;
}

.part-card:hover {
  border-color: rgb(34 211 238 / 40%);
  transform: translateY(-1px);
}

.part-card.selected {
  background: rgb(34 211 238 / 7%);
  border-color: rgb(34 211 238 / 55%);
}

.part-card:disabled {
  cursor: default;
  opacity: 0.55;
  transform: none;
}

.part-check {
  color: #526b80;
  font-size: 19px;
}

.part-card.selected .part-check {
  color: #22d3ee;
}

.part-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.part-content span {
  overflow: hidden;
  color: #22d3ee;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.part-content strong {
  overflow: hidden;
  color: #d9e5f0;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.part-content small {
  overflow: hidden;
  margin-top: 2px;
  color: #61778c;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.piano-icon {
  color: #526d82;
  font-size: 18px;
}

.part-card.selected .piano-icon {
  color: #67e8f9;
}

.mixer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 9px;
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

@media (max-width: 1100px) {
  .parts-grid {
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
  .parts-grid {
    grid-template-columns: 1fr;
  }

  .selection-actions,
  .playback-actions {
    flex-direction: column;
  }
}
</style>
