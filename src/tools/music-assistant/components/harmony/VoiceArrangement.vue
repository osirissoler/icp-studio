<template>
  <section class="arrangement-card">
    <div class="section-heading">
      <div>
        <span class="kicker"> 3 · VOCES </span>

        <h3>Distribución armónica</h3>

        <p>
          Cada acorde de la progresión recibe una referencia para principal, segunda voz, tenor,
          barítono y bajo.
        </p>
      </div>

      <div class="player-actions">
        <q-btn
          unelevated
          no-caps
          icon="play_arrow"
          label="Reproducir progresión"
          class="play-button"
          :disable="!arrangement.length || isPlaying"
          @click="playProgression()"
        />

        <q-btn
          outline
          no-caps
          icon="stop"
          label="Detener"
          class="stop-button"
          :disable="!isPlaying"
          @click="stopPlayback"
        />
      </div>
    </div>

    <div v-if="arrangement.length" class="arrangement-table">
      <div class="table-header">
        <div>Acorde</div>

        <div v-for="voice in voiceHeaders" :key="voice.id">
          {{ voice.label }}
        </div>
      </div>

      <div
        v-for="(item, chordIndex) in arrangement"
        :key="item.step.id"
        class="table-row"
        :class="{
          active: activeChordIndex === chordIndex,
        }"
      >
        <div class="chord-cell">
          <span>
            {{ romanDegree(item.step.degree) }}
          </span>

          <strong>
            {{ item.chordLabel }}
          </strong>

          <small>
            {{ item.step.beats }}
            tiempos
          </small>
        </div>

        <button
          v-for="voice in item.voices"
          :key="voice.id"
          type="button"
          class="voice-cell"
          :style="{
            '--voice-color': voice.color,
          }"
          @click="playSingleVoice(voice)"
        >
          <span class="voice-note">
            {{ noteLabel(voice.noteIndex) }}
            <small>
              {{ voice.octave }}
            </small>
          </span>

          <span class="voice-frequency">
            {{ voice.frequency.toFixed(1) }}
            Hz
          </span>

          <q-icon name="volume_up" />
        </button>
      </div>
    </div>

    <div v-else class="empty-state">
      <q-icon name="groups" />

      <strong> Todavía no hay voces </strong>

      <span> Añade acordes a la progresión para construir la armonía. </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import { notes } from '../../shared/music';

import {
  arrangeProgression,
  romanDegree,
  type ChordStep,
  type HarmonyVoice,
  type ScaleMode,
} from '../../shared/harmony';

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
}>();

const arrangement = computed(() =>
  arrangeProgression(props.rootNote, props.scaleMode, props.progression),
);

const voiceHeaders = computed(() => arrangement.value[0]?.voices ?? []);

const isPlaying = ref(false);

const activeChordIndex = ref<number | null>(null);

let audioContext: AudioContext | null = null;

let activeOscillators: OscillatorNode[] = [];

let activeGains: GainNode[] = [];

let timers: ReturnType<typeof setTimeout>[] = [];

function noteLabel(noteIndex: number): string {
  return notes.find((note) => note.value === noteIndex)?.label ?? '—';
}

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }

  return audioContext;
}

async function prepareAudio(): Promise<AudioContext> {
  const context = getAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  return context;
}

function createTone(
  context: AudioContext,
  frequency: number,
  volume: number,
  duration: number,
): void {
  const oscillator = context.createOscillator();

  const gain = context.createGain();

  oscillator.type = 'sine';

  oscillator.frequency.setValueAtTime(frequency, context.currentTime);

  gain.gain.setValueAtTime(0, context.currentTime);

  gain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.03);

  gain.gain.setValueAtTime(volume, context.currentTime + Math.max(duration - 0.08, 0.05));

  gain.gain.linearRampToValueAtTime(0, context.currentTime + duration);

  oscillator.connect(gain);

  gain.connect(context.destination);

  oscillator.start();

  oscillator.stop(context.currentTime + duration + 0.02);

  activeOscillators.push(oscillator);

  activeGains.push(gain);
}

async function playSingleVoice(voice: HarmonyVoice): Promise<void> {
  stopPlayback();

  const context = await prepareAudio();

  isPlaying.value = true;

  createTone(context, voice.frequency, 0.28, 1.5);

  const timer = setTimeout(() => {
    stopPlayback();
  }, 1600);

  timers.push(timer);
}

async function playProgression(): Promise<void> {
  stopPlayback();

  if (!arrangement.value.length) {
    return;
  }

  const context = await prepareAudio();

  isPlaying.value = true;

  let elapsed = 0;

  arrangement.value.forEach((item, index) => {
    const duration = Math.max(item.step.beats, 1) * 350;

    const timer = setTimeout(() => {
      activeChordIndex.value = index;

      item.voices.forEach((voice) => {
        createTone(context, voice.frequency, 0.07, duration / 1000);
      });
    }, elapsed);

    timers.push(timer);

    elapsed += duration;
  });

  const finishTimer = setTimeout(() => {
    stopPlayback();
  }, elapsed + 100);

  timers.push(finishTimer);
}

function stopPlayback(): void {
  timers.forEach((timer) => clearTimeout(timer));

  timers = [];

  if (audioContext) {
    const now = audioContext.currentTime;

    activeGains.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);

        gain.gain.setValueAtTime(gain.gain.value, now);

        gain.gain.linearRampToValueAtTime(0, now + 0.03);
      } catch {
        // Nodo terminado.
      }
    });

    activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop(now + 0.04);
      } catch {
        // Oscilador terminado.
      }
    });
  }

  activeOscillators = [];
  activeGains = [];

  activeChordIndex.value = null;
  isPlaying.value = false;
}

onBeforeUnmount(() => {
  stopPlayback();

  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
});
</script>

<style scoped>
.arrangement-card {
  padding: 18px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 15px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}

.kicker {
  color: #34d399;
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
  max-width: 540px;
  margin: 0;
  color: #718399;
  font-size: 10px;
  line-height: 1.45;
}

.player-actions {
  display: flex;
  gap: 7px;
}

.play-button {
  color: white;
  background: #6d55c7;
  border-radius: 9px;
}

.stop-button {
  color: #91a1b4;
  border-radius: 9px;
}

.arrangement-table {
  margin-top: 16px;
  overflow-x: auto;
}

.table-header,
.table-row {
  display: grid;
  min-width: 720px;
  grid-template-columns:
    120px
    repeat(5, minmax(105px, 1fr));
}

.table-header {
  color: #63778f;
  font-size: 8px;
  text-transform: uppercase;
}

.table-header > div {
  padding: 6px 8px;
}

.table-row {
  margin-top: 5px;
  background: #101d2b;
  border: 1px solid #26394e;
  border-radius: 9px;
}

.table-row.active {
  border-color: #a78bfa;
  background: rgb(167 139 250 / 6%);
}

.chord-cell {
  display: flex;
  justify-content: center;
  flex-direction: column;
  padding: 8px;
  border-right: 1px solid #25374b;
}

.chord-cell span {
  color: #657991;
  font-size: 8px;
}

.chord-cell strong {
  color: #e0e9f3;
  font-size: 12px;
}

.chord-cell small {
  margin-top: 1px;
  color: #5c7088;
  font-size: 7px;
}

.voice-cell {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  padding: 8px;
  color: #acbacb;
  background: transparent;
  border: 0;
  border-right: 1px solid #25374b;
  cursor: pointer;
}

.voice-cell:last-child {
  border-right: 0;
}

.voice-cell:hover {
  background: rgb(255 255 255 / 3%);
}

.voice-note {
  color: var(--voice-color);
  font-size: 11px;
  font-weight: 700;
}

.voice-note small {
  font-size: 8px;
}

.voice-frequency {
  color: #5e7289;
  font-size: 7px;
}

.voice-cell .q-icon {
  color: #657991;
  font-size: 14px;
}

.empty-state {
  display: flex;
  min-height: 130px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: 15px;
  color: #52667d;
  border: 1px dashed #293c51;
  border-radius: 11px;
}

.empty-state .q-icon {
  font-size: 28px;
}

.empty-state strong {
  margin-top: 5px;
  color: #71859b;
  font-size: 10px;
}

.empty-state span {
  margin-top: 2px;
  font-size: 8px;
}

@media (max-width: 780px) {
  .section-heading {
    flex-direction: column;
  }

  .player-actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
