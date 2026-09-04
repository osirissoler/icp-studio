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
        <span>Tonalidad actual</span>
        <strong>{{ keyLabel }}</strong>
      </div>
    </header>

    <QuickHarmonyReference
      :root-note="rootNote"
      :scale-mode="scaleMode"
      @update:root-note="rootNote = $event"
      @update:scale-mode="scaleMode = $event"
    />

    <section class="advanced-section">
      <header class="advanced-heading">
        <div class="advanced-icon">
          <q-icon name="account_tree" />
        </div>

        <div>
          <span class="advanced-kicker"> ARMONIZACIÓN AVANZADA </span>

          <h3>Construye la canción</h3>

          <p>
            La misma tonalidad elegida arriba se utiliza para construir la progresión de acordes y
            preparar el movimiento de las voces.
          </p>
        </div>
      </header>

      <div class="advanced-workflow">
        <HarmonySetup
          :root-note="rootNote"
          :scale-mode="scaleMode"
          @update:root-note="rootNote = $event"
          @update:scale-mode="scaleMode = $event"
        />

        <ChordProgressionEditor
          :root-note="rootNote"
          :scale-mode="scaleMode"
          :progression="progression"
          @update:progression="progression = $event"
        />

        <VoiceArrangement
          :root-note="rootNote"
          :scale-mode="scaleMode"
          :progression="progression"
        />
      </div>
    </section>

    <section class="melody-stage">
      <div class="melody-icon">
        <q-icon name="timeline" />
      </div>

      <div>
        <strong> Próxima etapa: melodía principal </strong>

        <p>
          Después añadiremos las frases y notas de la melodía principal. Así las referencias de
          Principal, Segunda voz, Tenor, Barítono y Bajo podrán cambiar siguiendo realmente la
          canción y no solamente permanecer fijas dentro de cada acorde.
        </p>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import QuickHarmonyReference from './harmony/QuickHarmonyReference.vue';
import HarmonySetup from './harmony/HarmonySetup.vue';
import ChordProgressionEditor from './harmony/ChordProgressionEditor.vue';
import VoiceArrangement from './harmony/VoiceArrangement.vue';

import { notes } from '../shared/music';

import type { ChordStep, ScaleMode } from '../shared/harmony';

const rootNote = ref(0);

const scaleMode = ref<ScaleMode>('major');

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

const keyLabel = computed(() => {
  const note = notes.find((item) => item.value === rootNote.value) ?? notes[0]!;

  return `${note.label} ${scaleMode.value === 'major' ? 'mayor' : 'menor'}`;
});
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
  margin: 4px 0 4px;
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

.advanced-section {
  padding: 18px;
  background: linear-gradient(180deg, rgb(96 165 250 / 4%), transparent 170px), #0a141f;
  border: 1px solid #223348;
  border-radius: 16px;
}

.advanced-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-bottom: 14px;
  border-bottom: 1px solid #1c2b3d;
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
  margin: 2px 0 2px;
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

.advanced-workflow {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.melody-stage {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  background: rgb(52 211 153 / 4%);
  border: 1px solid rgb(52 211 153 / 13%);
  border-radius: 11px;
}

.melody-icon {
  display: grid;
  width: 31px;
  height: 31px;
  flex: 0 0 auto;
  place-items: center;
  color: #34d399;
  background: rgb(52 211 153 / 8%);
  border-radius: 8px;
}

.melody-stage strong {
  color: #a8cfc0;
  font-size: 9px;
}

.melody-stage p {
  margin: 2px 0 0;
  color: #68867c;
  font-size: 8px;
  line-height: 1.45;
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
}
</style>
