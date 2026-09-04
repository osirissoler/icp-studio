<template>
  <section class="workspace">
    <div class="workspace-heading">
      <div>
        <span class="section-kicker">REFERENCIA RÁPIDA</span>
        <h2>Encuentra la nota para comenzar</h2>
        <p>
          Selecciona una nota y escucha una referencia limpia antes de iniciar el ensayo o la
          canción.
        </p>
      </div>

      <div class="frequency-chip">
        <span>Frecuencia</span>
        <strong>{{ selectedFrequency.toFixed(2) }} Hz</strong>
      </div>
    </div>

    <div class="reference-layout">
      <div class="note-panel">
        <div class="field-heading">
          <span>Nota</span>
          <small>Selecciona la nota musical</small>
        </div>

        <div class="notes-grid">
          <button
            v-for="note in notes"
            :key="note.value"
            type="button"
            class="note-button"
            :class="{ active: selectedNote === note.value }"
            @click="selectNote(note.value)"
          >
            <strong>{{ note.label }}</strong>
            <span>{{ note.international }}</span>
          </button>
        </div>

        <div class="octave-section">
          <div class="field-heading">
            <span>Octava</span>
            <small>Define qué tan grave o aguda será la referencia</small>
          </div>

          <div class="octave-buttons">
            <button
              v-for="octave in octaves"
              :key="octave"
              type="button"
              class="octave-button"
              :class="{ active: selectedOctave === octave }"
              @click="selectOctave(octave)"
            >
              {{ octave }}
            </button>
          </div>
        </div>
      </div>

      <div class="tone-preview">
        <div class="tone-visual" :class="{ playing: isPlaying }">
          <div class="tone-ring tone-ring-one"></div>
          <div class="tone-ring tone-ring-two"></div>

          <div class="tone-core">
            <span class="tone-name">{{ selectedNoteLabel }}</span>
            <strong>{{ selectedOctave }}</strong>
          </div>
        </div>

        <div class="tone-data">
          <span>Nota seleccionada</span>
          <strong>{{ selectedNoteLabel }}{{ selectedOctave }}</strong>
          <small>{{ selectedFrequency.toFixed(2) }} Hz</small>
        </div>

        <div class="play-actions">
          <q-btn
            unelevated
            no-caps
            icon="play_arrow"
            label="Escuchar nota"
            class="play-button"
            :disable="isPlaying"
            @click="playTone"
          />

          <q-btn
            outline
            no-caps
            icon="stop"
            label="Detener"
            class="stop-button"
            :disable="!isPlaying"
            @click="stopTone"
          />
        </div>

        <div class="duration-row">
          <span>Duración automática</span>

          <div class="duration-options">
            <button
              v-for="duration in durations"
              :key="duration.value"
              type="button"
              class="duration-button"
              :class="{ active: toneDuration === duration.value }"
              @click="toneDuration = duration.value"
            >
              {{ duration.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="reference-help">
      <q-icon name="tips_and_updates" />

      <div>
        <strong>Ejemplo de uso</strong>
        <p>
          Si van a comenzar una alabanza y necesitan una referencia en Sol, selecciona <b>Sol</b>,
          escucha la nota y el grupo puede tomarla como punto de partida.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { midiToFrequency, notes, octaves } from '../shared/music';

const props = defineProps<{
  initialNote?: number;
  initialOctave?: number;
}>();

const emit = defineEmits<{
  'selection-change': [
    value: {
      note: number;
      octave: number;
    },
  ];
}>();

const durations = [
  { label: '1 s', value: 1000 },
  { label: '2 s', value: 2000 },
  { label: '3 s', value: 3000 },
  { label: '5 s', value: 5000 },
];

const selectedNote = ref(props.initialNote ?? 0);
const selectedOctave = ref(props.initialOctave ?? 4);
const toneDuration = ref(2000);
const isPlaying = ref(false);

let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

const selectedNoteLabel = computed(
  () => notes.find((note) => note.value === selectedNote.value)?.label ?? 'Do',
);

const selectedFrequency = computed(() => {
  const midi = (selectedOctave.value + 1) * 12 + selectedNote.value;

  return midiToFrequency(midi);
});

watch(
  () => props.initialNote,
  (value) => {
    if (value !== undefined) {
      selectedNote.value = value;
    }
  },
);

watch(
  () => props.initialOctave,
  (value) => {
    if (value !== undefined) {
      selectedOctave.value = value;
    }
  },
);

function selectNote(note: number): void {
  selectedNote.value = note;

  emitSelection();

  if (isPlaying.value) {
    restartTone();
  }
}

function selectOctave(octave: number): void {
  selectedOctave.value = octave;

  emitSelection();

  if (isPlaying.value) {
    restartTone();
  }
}

function emitSelection(): void {
  emit('selection-change', {
    note: selectedNote.value,
    octave: selectedOctave.value,
  });
}

function ensureAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }

  return audioContext;
}

function playTone(): void {
  stopTone();

  const context = ensureAudioContext();

  if (context.state === 'suspended') {
    void context.resume();
  }

  const nextOscillator = context.createOscillator();
  const nextGain = context.createGain();

  nextOscillator.type = 'sine';

  nextOscillator.frequency.setValueAtTime(selectedFrequency.value, context.currentTime);

  nextGain.gain.setValueAtTime(0, context.currentTime);
  nextGain.gain.linearRampToValueAtTime(0.32, context.currentTime + 0.03);

  nextOscillator.connect(nextGain);
  nextGain.connect(context.destination);

  oscillator = nextOscillator;
  gainNode = nextGain;

  nextOscillator.start();
  isPlaying.value = true;

  stopTimer = setTimeout(() => {
    stopTone();
  }, toneDuration.value);
}

function restartTone(): void {
  stopTone();
  playTone();
}

function stopTone(): void {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  if (oscillator && audioContext && gainNode) {
    const now = audioContext.currentTime;

    try {
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.04);
      oscillator.stop(now + 0.05);
    } catch {
      // El oscilador ya pudo haber terminado.
    }
  }

  oscillator = null;
  gainNode = null;
  isPlaying.value = false;
}

onBeforeUnmount(() => {
  stopTone();

  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
});
</script>

<style scoped>
.workspace {
  padding: 20px;
  background: #0b1521;
  border: 1px solid #223348;
  border-radius: 18px;
}

.workspace-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid #1d2c3e;
}

.section-kicker {
  color: #f472b6;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.workspace-heading h2 {
  margin: 4px 0 5px;
  color: #edf3fa;
  font-size: 19px;
}

.workspace-heading p {
  max-width: 720px;
  margin: 0;
  color: #8493a8;
  font-size: 12px;
  line-height: 1.55;
}

.frequency-chip {
  display: flex;
  min-width: 120px;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px;
  background: #101d2b;
  border: 1px solid #263b52;
  border-radius: 11px;
  text-align: right;
}

.frequency-chip span {
  color: #708198;
  font-size: 9px;
  text-transform: uppercase;
}

.frequency-chip strong {
  color: #dce8f5;
  font-size: 14px;
}

.reference-layout {
  display: grid;
  grid-template-columns:
    minmax(0, 1.4fr)
    minmax(280px, 0.6fr);
  gap: 18px;
  padding-top: 18px;
}

.note-panel,
.tone-preview {
  padding: 18px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 15px;
}

.field-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 11px;
}

.field-heading span {
  color: #dce6f2;
  font-size: 12px;
  font-weight: 650;
}

.field-heading small {
  color: #687a90;
  font-size: 10px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.note-button,
.octave-button,
.duration-button {
  color: #becbda;
  background: #101d2b;
  border: 1px solid #293d53;
  cursor: pointer;
}

.note-button {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  border-radius: 11px;
}

.note-button span {
  color: #6f829a;
  font-size: 9px;
}

.note-button.active,
.octave-button.active,
.duration-button.active {
  color: #fff;
  background: rgb(244 114 182 / 13%);
  border-color: rgb(244 114 182 / 58%);
}

.octave-section {
  margin-top: 20px;
}

.octave-buttons {
  display: flex;
  gap: 8px;
}

.octave-button {
  width: 48px;
  height: 38px;
  border-radius: 10px;
}

.tone-preview {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.tone-visual {
  position: relative;
  display: grid;
  width: 150px;
  height: 150px;
  place-items: center;
}

.tone-ring {
  position: absolute;
  border: 1px solid rgb(244 114 182 / 22%);
  border-radius: 50%;
}

.tone-ring-one {
  inset: 10px;
}

.tone-ring-two {
  inset: 0;
}

.tone-core {
  z-index: 1;
  display: flex;
  width: 104px;
  height: 104px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: #162234;
  border: 1px solid rgb(244 114 182 / 40%);
  border-radius: 50%;
}

.tone-name {
  color: #fff;
  font-size: 24px;
  font-weight: 760;
}

.tone-core strong {
  color: #f9a8d4;
}

.tone-visual.playing .tone-ring-one,
.tone-visual.playing .tone-ring-two {
  animation: pulse-ring 1s ease-out infinite;
}

.tone-data {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: 10px;
}

.tone-data span,
.tone-data small {
  color: #71839a;
  font-size: 9px;
}

.tone-data strong {
  color: #edf3f9;
  font-size: 17px;
}

.play-actions {
  display: flex;
  width: 100%;
  gap: 8px;
  margin-top: 15px;
}

.play-button,
.stop-button {
  flex: 1;
  border-radius: 11px;
}

.play-button {
  color: white;
  background: #db4f91;
}

.duration-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 15px;
  padding-top: 13px;
  border-top: 1px solid #203044;
}

.duration-row > span {
  color: #72849a;
  font-size: 9px;
}

.duration-options {
  display: flex;
  gap: 5px;
}

.duration-button {
  min-width: 36px;
  height: 27px;
  border-radius: 8px;
}

.reference-help {
  display: flex;
  gap: 10px;
  margin-top: 17px;
  padding: 13px 15px;
  background: rgb(96 165 250 / 6%);
  border: 1px solid rgb(96 165 250 / 18%);
  border-radius: 12px;
}

.reference-help .q-icon {
  color: #60a5fa;
  font-size: 19px;
}

.reference-help strong {
  color: #c9d7e6;
  font-size: 11px;
}

.reference-help p {
  margin: 2px 0 0;
  color: #73869b;
  font-size: 10px;
}

@keyframes pulse-ring {
  from {
    opacity: 0.8;
    transform: scale(0.9);
  }

  to {
    opacity: 0;
    transform: scale(1.15);
  }
}

@media (max-width: 850px) {
  .workspace-heading {
    flex-direction: column;
  }

  .reference-layout {
    grid-template-columns: 1fr;
  }
}
</style>
