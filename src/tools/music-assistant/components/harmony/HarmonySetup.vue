<template>
  <section class="setup-card">
    <div class="section-heading">
      <div>
        <span class="kicker"> 1 · TONALIDAD </span>

        <h3>Define la tonalidad</h3>

        <p>Esta será la base musical para construir los acordes y las voces.</p>
      </div>

      <div class="key-preview">
        <span>Tonalidad</span>

        <strong>
          {{ selectedNote.label }}
          {{ scaleModeLabel }}
        </strong>
      </div>
    </div>

    <div class="field-label">Nota principal</div>

    <div class="notes-grid">
      <button
        v-for="note in notes"
        :key="note.value"
        type="button"
        class="note-button"
        :class="{
          active: rootNote === note.value,
        }"
        @click="emit('update:root-note', note.value)"
      >
        <strong>
          {{ note.label }}
        </strong>

        <span>
          {{ note.international }}
        </span>
      </button>
    </div>

    <div class="field-label mode-label">Modo</div>

    <div class="mode-grid">
      <button
        type="button"
        class="mode-button"
        :class="{
          active: scaleMode === 'major',
        }"
        @click="emit('update:scale-mode', 'major')"
      >
        <q-icon name="wb_sunny" />

        <span>
          <strong>Mayor</strong>

          <small> Sonoridad abierta y estable </small>
        </span>
      </button>

      <button
        type="button"
        class="mode-button"
        :class="{
          active: scaleMode === 'minor',
        }"
        @click="emit('update:scale-mode', 'minor')"
      >
        <q-icon name="dark_mode" />

        <span>
          <strong>Menor</strong>

          <small> Sonoridad más oscura o emotiva </small>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { notes } from '../../shared/music';

import type { ScaleMode } from '../../shared/harmony';

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
}>();

const emit = defineEmits<{
  'update:root-note': [value: number];
  'update:scale-mode': [value: ScaleMode];
}>();

const selectedNote = computed(
  () => notes.find((note) => note.value === props.rootNote) ?? notes[0]!,
);

const scaleModeLabel = computed(() => (props.scaleMode === 'major' ? 'mayor' : 'menor'));
</script>

<style scoped>
.setup-card {
  padding: 18px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 15px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.kicker {
  color: #a78bfa;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

h3 {
  margin: 3px 0 4px;
  color: #edf3fa;
  font-size: 16px;
}

p {
  max-width: 440px;
  margin: 0;
  color: #718399;
  font-size: 10px;
  line-height: 1.45;
}

.key-preview {
  display: flex;
  min-width: 115px;
  flex-direction: column;
  padding: 8px 10px;
  background: rgb(167 139 250 / 8%);
  border: 1px solid rgb(167 139 250 / 24%);
  border-radius: 10px;
  text-align: right;
}

.key-preview span {
  color: #756b94;
  font-size: 8px;
}

.key-preview strong {
  color: #ddd6fe;
  font-size: 12px;
}

.field-label {
  margin-top: 17px;
  margin-bottom: 7px;
  color: #aebdce;
  font-size: 9px;
  font-weight: 650;
  text-transform: uppercase;
}

.mode-label {
  margin-top: 13px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.note-button {
  min-height: 48px;
  color: #b9c6d5;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 9px;
  cursor: pointer;
}

.note-button strong,
.note-button span {
  display: block;
}

.note-button strong {
  font-size: 10px;
}

.note-button span {
  margin-top: 1px;
  color: #6d8097;
  font-size: 8px;
}

.note-button.active {
  color: white;
  background: rgb(167 139 250 / 13%);
  border-color: rgb(167 139 250 / 65%);
}

.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.mode-button {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 57px;
  padding: 10px;
  color: #aebdce;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
}

.mode-button > .q-icon {
  font-size: 20px;
}

.mode-button span {
  display: flex;
  flex-direction: column;
}

.mode-button strong {
  font-size: 10px;
}

.mode-button small {
  color: #6d8097;
  font-size: 8px;
}

.mode-button.active {
  color: #e9e4ff;
  background: rgb(167 139 250 / 12%);
  border-color: rgb(167 139 250 / 55%);
}

@media (max-width: 650px) {
  .notes-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .section-heading {
    flex-direction: column;
  }

  .key-preview {
    text-align: left;
  }
}
</style>
