<template>
  <section class="harmony-page">
    <header class="harmony-heading">
      <div>
        <span class="eyebrow"> VOCES Y ARMONÍA </span>

        <h2>Asistente de armonización vocal</h2>

        <p>
          Usa la referencia rápida cuando solamente necesites encontrar notas para las voces, o
          continúa hacia la construcción avanzada para preparar la armonía de una canción completa.
        </p>
      </div>

      <div class="key-summary">
        <span> Tonalidad actual </span>

        <strong>
          {{ keyLabel }}
        </strong>
      </div>
    </header>

    <QuickHarmonyReference
      :root-note="rootNote"
      :scale-mode="scaleMode"
      @update:root-note="rootNote = $event"
      @update:scale-mode="scaleMode = $event"
    />

    <div class="advanced-heading">
      <div class="advanced-icon">
        <q-icon name="account_tree" />
      </div>

      <div>
        <span class="advanced-kicker"> ARMONIZACIÓN AVANZADA </span>

        <h3>Construye la canción</h3>

        <p>
          Prepara la tonalidad, la progresión, la melodía principal y después genera una propuesta
          de movimiento para todas las voces.
        </p>
      </div>
    </div>

    <div class="advanced-top-grid">
      <div class="setup-column">
        <div class="card-title">
          <q-icon name="music_note" />

          <div>
            <span> CONSTRUIR LA CANCIÓN </span>

            <strong> Base armónica </strong>

            <small> Define la tonalidad desde la que trabajará todo el arreglo. </small>
          </div>
        </div>

        <HarmonySetup
          :root-note="rootNote"
          :scale-mode="scaleMode"
          @update:root-note="rootNote = $event"
          @update:scale-mode="scaleMode = $event"
        />
      </div>

      <div class="progression-column">
        <ChordProgressionEditor
          :root-note="rootNote"
          :scale-mode="scaleMode"
          :progression="progression"
          @update:progression="progression = $event"
        />
      </div>
    </div>

    <section class="melody-mode-section">
      <header class="melody-mode-heading">
        <div>
          <span> CAPTURA DE MELODÍA </span>

          <h3>¿Cómo quieres construir la voz principal?</h3>

          <p>
            Puedes escribir las notas manualmente o cantar la canción para que ICP Studio detecte
            automáticamente el movimiento de la melodía.
          </p>
        </div>

        <div class="melody-mode-buttons">
          <button
            type="button"
            :class="{
              active: melodyMode === 'manual',
            }"
            @click="melodyMode = 'manual'"
          >
            <q-icon name="edit_note" />

            <span>
              <strong>Manual</strong>
              <small>Escribir las notas</small>
            </span>
          </button>

          <button
            type="button"
            :class="{
              active: melodyMode === 'capture',
            }"
            @click="melodyMode = 'capture'"
          >
            <q-icon name="mic" />

            <span>
              <strong>Cantar y analizar</strong>
              <small>Grabar y detectar</small>
            </span>
          </button>
        </div>
      </header>

      <SongCapturePanel v-if="melodyMode === 'capture'" @use-capture="useCapturedMelody" />

      <MelodyEditor
        v-else
        :root-note="rootNote"
        :scale-mode="scaleMode"
        :progression="progression"
        :phrases="phrases"
        @update:phrases="phrases = $event"
      />
    </section>

    <section v-if="melodyMode === 'capture' && phrases.length" class="captured-editor-section">
      <div class="captured-editor-heading">
        <div>
          <span> MELODÍA IMPORTADA </span>

          <strong> Revisa o corrige las notas detectadas </strong>
        </div>

        <q-btn
          flat
          dense
          no-caps
          icon="edit"
          label="Abrir editor manual"
          class="open-editor-button"
          @click="melodyMode = 'manual'"
        />
      </div>
    </section>

    <MelodyHarmonyArrangement
      :root-note="rootNote"
      :scale-mode="scaleMode"
      :progression="progression"
      :phrases="phrases"
    />

    <VoiceArrangement :root-note="rootNote" :scale-mode="scaleMode" :progression="progression" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import QuickHarmonyReference from './harmony/QuickHarmonyReference.vue';
import HarmonySetup from './harmony/HarmonySetup.vue';
import ChordProgressionEditor from './harmony/ChordProgressionEditor.vue';
import MelodyEditor from './harmony/MelodyEditor.vue';
import MelodyHarmonyArrangement from './harmony/MelodyHarmonyArrangement.vue';
import VoiceArrangement from './harmony/VoiceArrangement.vue';
import SongCapturePanel from './harmony/song-capture/SongCapturePanel.vue';

import { notes } from '../shared/music';

import type { ChordStep, MelodyPhrase, ScaleMode } from '../shared/harmony';

type MelodyMode = 'manual' | 'capture';

const rootNote = ref(0);

const scaleMode = ref<ScaleMode>('major');

const melodyMode = ref<MelodyMode>('manual');

const progression = ref<ChordStep[]>([
  {
    id: 'initial-1',
    degree: 1,
    beats: 4,
  },

  {
    id: 'initial-4',
    degree: 4,
    beats: 4,
  },

  {
    id: 'initial-5',
    degree: 5,
    beats: 4,
  },

  {
    id: 'initial-1b',
    degree: 1,
    beats: 4,
  },
]);

const phrases = ref<MelodyPhrase[]>([]);

const keyLabel = computed(() => {
  const note = notes.find((item) => item.value === rootNote.value) ?? notes[0]!;

  return `${note.label} ${scaleMode.value === 'major' ? 'mayor' : 'menor'}`;
});

function useCapturedMelody(value: {
  phrase: MelodyPhrase;
  rootNote: number;
  scaleMode: ScaleMode;
}): void {
  rootNote.value = value.rootNote;

  scaleMode.value = value.scaleMode;

  const firstProgressionId = progression.value[0]?.id ?? null;

  const importedPhrase: MelodyPhrase = {
    ...value.phrase,

    chordStepId: firstProgressionId,
  };

  phrases.value = [...phrases.value, importedPhrase];
}
</script>

<style scoped>
.harmony-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.harmony-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 2px 2px 3px;
}

.eyebrow {
  color: #a78bfa;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.harmony-heading h2 {
  margin: 4px 0;
  color: #f0f4f9;
  font-size: 19px;
}

.harmony-heading p {
  max-width: 720px;
  margin: 0;
  color: #74869b;
  font-size: 10px;
  line-height: 1.5;
}

.key-summary {
  display: flex;
  min-width: 130px;
  flex-direction: column;
  padding: 8px 10px;
  background: rgb(167 139 250 / 7%);
  border: 1px solid rgb(167 139 250 / 20%);
  border-radius: 9px;
  text-align: right;
}

.key-summary span {
  color: #756b94;
  font-size: 8px;
}

.key-summary strong {
  color: #ddd6fe;
  font-size: 11px;
}

.advanced-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 2px;
}

.advanced-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  color: #60a5fa;
  background: rgb(96 165 250 / 9%);
  border-radius: 10px;
}

.advanced-icon .q-icon {
  font-size: 20px;
}

.advanced-kicker {
  color: #60a5fa;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.advanced-heading h3 {
  margin: 2px 0;
  color: #e8eff7;
  font-size: 15px;
}

.advanced-heading p {
  max-width: 720px;
  margin: 0;
  color: #6f8298;
  font-size: 9px;
  line-height: 1.45;
}

.advanced-top-grid {
  display: grid;
  grid-template-columns:
    minmax(320px, 0.85fr)
    minmax(480px, 1.15fr);
  gap: 12px;
  align-items: stretch;
}

.setup-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px;
  background: linear-gradient(180deg, rgb(96 165 250 / 4%), transparent 140px), #0a141f;
  border: 1px solid #223348;
  border-radius: 15px;
}

.progression-column {
  min-width: 0;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 3px 4px;
}

.card-title > .q-icon {
  color: #60a5fa;
  font-size: 19px;
}

.card-title div {
  display: flex;
  flex-direction: column;
}

.card-title span {
  color: #60a5fa;
  font-size: 7px;
  font-weight: 750;
  letter-spacing: 0.11em;
}

.card-title strong {
  color: #dbe6f1;
  font-size: 10px;
}

.card-title small {
  color: #63788f;
  font-size: 7px;
}

.setup-column :deep(.setup-card) {
  flex: 1;
  padding: 14px;
  border-color: #25384d;
}

.progression-column :deep(.progression-card) {
  height: 100%;
}

.melody-mode-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.melody-mode-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  background: #0a141f;
  border: 1px solid #223348;
  border-radius: 12px;
}

.melody-mode-heading > div:first-child {
  min-width: 0;
}

.melody-mode-heading > div:first-child > span {
  color: #34d399;
  font-size: 7px;
  font-weight: 750;
  letter-spacing: 0.11em;
}

.melody-mode-heading h3 {
  margin: 2px 0;
  color: #e3ebf4;
  font-size: 13px;
}

.melody-mode-heading p {
  max-width: 640px;
  margin: 0;
  color: #6a7e94;
  font-size: 8px;
  line-height: 1.4;
}

.melody-mode-buttons {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
}

.melody-mode-buttons button {
  display: flex;
  min-width: 142px;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  color: #8092a7;
  background: #101e2d;
  border: 1px solid #293d53;
  border-radius: 9px;
  cursor: pointer;
  text-align: left;
}

.melody-mode-buttons button > .q-icon {
  font-size: 18px;
}

.melody-mode-buttons button > span {
  display: flex;
  flex-direction: column;
}

.melody-mode-buttons strong {
  font-size: 8px;
}

.melody-mode-buttons small {
  color: #60748a;
  font-size: 6px;
}

.melody-mode-buttons button.active {
  color: #d6f4e8;
  background: rgb(52 211 153 / 8%);
  border-color: rgb(52 211 153 / 32%);
}

.melody-mode-buttons button.active small {
  color: #6d9f8d;
}

.captured-editor-section {
  padding: 10px 12px;
  background: rgb(52 211 153 / 4%);
  border: 1px solid rgb(52 211 153 / 13%);
  border-radius: 10px;
}

.captured-editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.captured-editor-heading > div {
  display: flex;
  flex-direction: column;
}

.captured-editor-heading span {
  color: #699b89;
  font-size: 6px;
  letter-spacing: 0.1em;
}

.captured-editor-heading strong {
  color: #a8cfc0;
  font-size: 8px;
}

.open-editor-button {
  color: #80b9a5;
  font-size: 8px;
}

@media (max-width: 1100px) {
  .advanced-top-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 800px) {
  .melody-mode-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .melody-mode-buttons {
    width: 100%;
  }

  .melody-mode-buttons button {
    flex: 1;
  }
}

@media (max-width: 700px) {
  .harmony-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .key-summary {
    align-self: flex-start;
    text-align: left;
  }

  .melody-mode-buttons {
    flex-direction: column;
  }
}
</style>
