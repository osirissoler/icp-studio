<template>
  <section class="note-editor">
    <header>
      <div class="editor-title">
        <span> EDICIÓN MANUAL </span>

        <strong>
          {{ part.name }}
        </strong>

        <small>
          Compás {{ note.measureNumber }} · Beat
          {{ formatBeat(note.startBeat) }}
        </small>
      </div>

      <div v-if="overridden" class="manual-badge">
        <q-icon name="edit_note" />
        Modificada manualmente
      </div>

      <q-btn
        flat
        round
        dense
        icon="close"
        class="close-button"
        :disable="disabled"
        @click="emit('close')"
      />
    </header>

    <div class="note-content">
      <section class="note-preview">
        <span>NOTA ACTUAL</span>

        <strong>
          {{ noteName(draftMidi) }}
        </strong>

        <small> MIDI {{ draftMidi }} </small>
      </section>

      <section class="pitch-controls">
        <q-btn
          flat
          round
          dense
          icon="keyboard_double_arrow_down"
          :disable="disabled || draftMidi <= 12"
          @click="changeMidi(-12)"
        >
          <q-tooltip> Bajar una octava </q-tooltip>
        </q-btn>

        <q-btn
          flat
          round
          dense
          icon="keyboard_arrow_down"
          :disable="disabled || draftMidi <= 0"
          @click="changeMidi(-1)"
        >
          <q-tooltip> Bajar un semitono </q-tooltip>
        </q-btn>

        <q-input
          :model-value="draftMidi"
          type="number"
          dense
          outlined
          dark
          color="cyan-4"
          label="MIDI"
          class="midi-field"
          :min="0"
          :max="127"
          :disable="disabled"
          @update:model-value="setMidiFromInput"
        />

        <q-btn
          flat
          round
          dense
          icon="keyboard_arrow_up"
          :disable="disabled || draftMidi >= 127"
          @click="changeMidi(1)"
        >
          <q-tooltip> Subir un semitono </q-tooltip>
        </q-btn>

        <q-btn
          flat
          round
          dense
          icon="keyboard_double_arrow_up"
          :disable="disabled || draftMidi >= 115"
          @click="changeMidi(12)"
        >
          <q-tooltip> Subir una octava </q-tooltip>
        </q-btn>
      </section>

      <q-slider
        :model-value="draftMidi"
        :min="0"
        :max="127"
        :step="1"
        color="cyan-4"
        class="pitch-slider"
        :disable="disabled"
        @update:model-value="setMidi"
      />

      <div class="note-info">
        <div>
          <span>ORIGINAL AL ABRIR</span>

          <strong>
            {{ noteName(note.midi) }}
          </strong>
        </div>

        <div>
          <span>DURACIÓN</span>

          <strong> {{ formatBeat(note.durationBeats) }} tiempos </strong>
        </div>

        <div>
          <span>CAMBIO</span>

          <strong
            :class="{
              positive: difference > 0,
              negative: difference < 0,
            }"
          >
            {{ differenceLabel }}
          </strong>
        </div>
      </div>
    </div>

    <footer>
      <q-btn
        v-if="overridden"
        flat
        no-caps
        icon="restart_alt"
        label="Restaurar automática"
        class="restore-button"
        :disable="disabled"
        @click="emit('reset')"
      />

      <div class="footer-spacer"></div>

      <q-btn
        outline
        no-caps
        icon="volume_up"
        label="Escuchar"
        class="preview-button"
        :disable="disabled"
        @click="emit('preview', draftMidi)"
      />

      <q-btn
        unelevated
        no-caps
        icon="save"
        label="Guardar nota"
        class="save-button"
        :disable="disabled || draftMidi === note.midi"
        @click="emit('save', draftMidi)"
      />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { notes } from '../../shared/music';

import type { ScorePart, ScoreTimelineNote } from '../../shared/score';

const props = defineProps<{
  part: ScorePart;

  note: ScoreTimelineNote;

  overridden: boolean;

  disabled: boolean;
}>();

const emit = defineEmits<{
  preview: [midi: number];

  save: [midi: number];

  reset: [];

  close: [];
}>();

const draftMidi = ref(props.note.midi);

watch(
  () => props.note,
  (note) => {
    draftMidi.value = note.midi;
  },
);

const difference = computed(() => draftMidi.value - props.note.midi);

const differenceLabel = computed(() => {
  if (difference.value === 0) {
    return 'Sin cambio';
  }

  const prefix = difference.value > 0 ? '+' : '';

  return `${prefix}${difference.value} semitonos`;
});

function changeMidi(amount: number): void {
  setMidi(draftMidi.value + amount);
}

function setMidiFromInput(value: string | number | null): void {
  if (value === null || value === '') {
    return;
  }

  setMidi(Number(value));
}

function setMidi(value: number | null): void {
  if (value === null || !Number.isFinite(value)) {
    return;
  }

  draftMidi.value = Math.min(127, Math.max(0, Math.round(value)));
}

function noteName(midi: number): string {
  const noteIndex = normalizeNote(midi);

  const definition = notes.find((candidate) => candidate.value === noteIndex) ?? notes[0]!;

  const octave = Math.floor(midi / 12) - 1;

  return `${definition.label}${octave}`;
}

function normalizeNote(note: number): number {
  return ((note % 12) + 12) % 12;
}

function formatBeat(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
</script>

<style scoped>
.note-editor {
  margin-top: 10px;
  padding: 12px;
  background: radial-gradient(circle at 100% 0%, rgb(34 211 238 / 7%), transparent 35%), #0c1926;
  border: 1px solid #31566d;
  border-radius: 10px;
}

.note-editor > header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.editor-title {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.editor-title span {
  color: #22d3ee;
  font-size: 6px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.editor-title strong {
  color: #dceaf1;
  font-size: 11px;
}

.editor-title small {
  color: #6d8295;
  font-size: 7px;
}

.manual-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 7px;
  color: #c4b5fd;
  background: rgb(167 139 250 / 8%);
  border: 1px solid rgb(167 139 250 / 18%);
  border-radius: 7px;
  font-size: 6px;
}

.close-button {
  color: #7d93a5;
}

.note-content {
  margin-top: 10px;
}

.note-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 92px;
  background: #091722;
  border: 1px solid #263e51;
  border-radius: 9px;
}

.note-preview span {
  color: #607a8e;
  font-size: 6px;
}

.note-preview strong {
  margin-top: 2px;
  color: #67e8f9;
  font-size: 26px;
  line-height: 1;
}

.note-preview small {
  margin-top: 4px;
  color: #758c9e;
  font-size: 7px;
}

.pitch-controls {
  display: grid;
  grid-template-columns:
    34px
    34px
    minmax(110px, 160px)
    34px
    34px;
  justify-content: center;
  align-items: center;
  gap: 5px;
  margin-top: 9px;
}

.pitch-controls > .q-btn {
  color: #8cd7e3;
  background: #102230;
}

.midi-field :deep(.q-field__control) {
  color: #e5f4f8;
  background: #091722;
}

.midi-field :deep(.q-field__control::before) {
  border-color: #385b70 !important;
}

.midi-field :deep(.q-field__native),
.midi-field :deep(.q-field__input) {
  color: #dff2f7 !important;
  font-size: 10px;
  text-align: center;
}

.midi-field :deep(.q-field__label) {
  color: #718c9f !important;
  font-size: 7px;
}

.pitch-slider {
  max-width: 620px;
  margin: 8px auto 0;
}

.note-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 8px;
}

.note-info > div {
  display: flex;
  flex-direction: column;
  padding: 7px 8px;
  background: #101f2d;
  border-radius: 7px;
}

.note-info span {
  color: #5f7588;
  font-size: 5px;
}

.note-info strong {
  color: #bacbd7;
  font-size: 8px;
}

.note-info strong.positive {
  color: #67e8f9;
}

.note-info strong.negative {
  color: #c4b5fd;
}

.note-editor > footer {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid #22394c;
}

.footer-spacer {
  flex: 1;
}

.restore-button {
  color: #c4b5fd;
}

.preview-button {
  color: #91d7e4;
  border-radius: 8px;
}

.save-button {
  color: white;
  background: #16738a;
  border-radius: 8px;
}

@media (max-width: 620px) {
  .note-editor > header {
    flex-wrap: wrap;
  }

  .manual-badge {
    order: 3;
    width: 100%;
  }

  .pitch-controls {
    grid-template-columns:
      34px
      34px
      1fr
      34px
      34px;
  }

  .note-info {
    grid-template-columns: 1fr;
  }

  .note-editor > footer {
    align-items: stretch;
    flex-direction: column;
  }

  .footer-spacer {
    display: none;
  }

  .note-editor > footer .q-btn {
    width: 100%;
  }
}
</style>
