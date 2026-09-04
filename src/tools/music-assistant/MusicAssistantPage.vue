<template>
  <q-page class="music-page">
    <div class="music-shell">
      <header class="music-header">
        <div class="header-copy">
          <div class="header-icon">
            <q-icon name="library_music" />
          </div>

          <div>
            <div class="eyebrow">HERRAMIENTAS MUSICALES</div>

            <h1>Asistente musical</h1>

            <p>
              Referencias de notas, detección de voz, armonías e instrumentos guía para ensayos de
              canto a capela.
            </p>
          </div>
        </div>

        <q-btn
          flat
          no-caps
          icon="arrow_back"
          label="Herramientas"
          class="back-button"
          @click="goBack"
        />
      </header>

      <div class="mode-grid">
        <button
          v-for="mode in modes"
          :key="mode.id"
          type="button"
          class="mode-card"
          :class="{
            active: activeMode === mode.id,
          }"
          @click="activeMode = mode.id"
        >
          <span
            class="mode-icon"
            :style="{
              '--mode-color': mode.color,
              '--mode-soft': `${mode.color}22`,
            }"
          >
            <q-icon :name="mode.icon" />
          </span>

          <span class="mode-info">
            <strong>
              {{ mode.label }}
            </strong>

            <small>
              {{ mode.description }}
            </small>
          </span>
        </button>
      </div>

      <NoteReferencePanel
        v-if="activeMode === 'reference'"
        :initial-note="referenceNote"
        :initial-octave="referenceOctave"
        @selection-change="updateReference"
      />

      <PitchDetectorPanel
        v-else-if="activeMode === 'detect'"
        @use-reference="useDetectedReference"
      />

      <HarmonyPanel v-else-if="activeMode === 'harmony'" />

      <UpcomingModePanel v-else :mode="activeModeData" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useRouter } from 'vue-router';

import HarmonyPanel from './components/HarmonyPanel.vue';
import NoteReferencePanel from './components/NoteReferencePanel.vue';
import PitchDetectorPanel from './components/PitchDetectorPanel.vue';
import UpcomingModePanel from './components/UpcomingModePanel.vue';

import { modes, type MusicalMode } from './shared/music';

const router = useRouter();

const activeMode = ref<MusicalMode>('reference');

const referenceNote = ref(0);

const referenceOctave = ref(4);

const activeModeData = computed(
  () => modes.find((mode) => mode.id === activeMode.value) ?? modes[0]!,
);

function goBack(): void {
  void router.push('/herramientas');
}

function updateReference(value: { note: number; octave: number }): void {
  referenceNote.value = value.note;

  referenceOctave.value = value.octave;
}

function useDetectedReference(value: { note: number; octave: number }): void {
  referenceNote.value = value.note;

  referenceOctave.value = value.octave;

  activeMode.value = 'reference';
}
</script>

<style scoped>
.music-page {
  min-height: 100%;
  background: radial-gradient(circle at 80% 5%, rgb(244 114 182 / 8%), transparent 34%), #08111c;
  color: #e5edf7;
}

.music-shell {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 22px;
}

.music-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.header-copy {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  place-items: center;
  color: #f472b6;
  background: rgb(244 114 182 / 10%);
  border: 1px solid rgb(244 114 182 / 25%);
  border-radius: 18px;
}

.header-icon .q-icon {
  font-size: 29px;
}

.eyebrow {
  color: #f472b6;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.music-header h1 {
  margin: 3px 0 4px;
  color: #f4f7fb;
  font-size: 23px;
}

.music-header p {
  max-width: 720px;
  margin: 0;
  color: #8493a8;
  font-size: 12px;
}

.back-button {
  color: #9baabd;
  border: 1px solid #29394c;
  border-radius: 11px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.mode-card {
  display: flex;
  min-width: 0;
  min-height: 82px;
  align-items: center;
  gap: 10px;
  padding: 10px;
  color: #dce7f4;
  background: #0d1723;
  border: 1px solid #223348;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
}

.mode-card:hover {
  background: #112033;
  border-color: #38506b;
}

.mode-card.active {
  background: #151b2b;
  border-color: rgb(244 114 182 / 55%);
}

.mode-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--mode-color);
  background: var(--mode-soft);
  border-radius: 11px;
}

.mode-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.mode-info strong {
  font-size: 11px;
}

.mode-info small {
  color: #6f8095;
  font-size: 9px;
}

@media (max-width: 1250px) {
  .mode-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 700px) {
  .music-header {
    align-items: stretch;
    flex-direction: column;
  }

  .back-button {
    align-self: flex-start;
  }

  .mode-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
