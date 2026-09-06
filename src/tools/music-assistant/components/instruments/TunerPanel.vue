<template>
  <section class="instrument-workspace">
    <header class="workspace-heading">
      <div>
        <span class="section-kicker">AFINADOR CROMÁTICO</span>
        <h2>Afinación en tiempo real</h2>
        <p>
          Usa el micrófono para afinar voz o instrumento. El centro indica que estás dentro del
          margen correcto.
        </p>
      </div>

      <div
        class="microphone-state"
        :class="{
          active: isListening,
          error: microphoneError,
        }"
      >
        <span class="state-dot"></span>
        {{ microphoneStatus }}
      </div>
    </header>

    <div class="tuner-controls">
      <label>
        <span>Referencia La4</span>

        <div class="reference-control">
          <button type="button" @click="referenceA = Math.max(420, referenceA - 1)">−</button>

          <strong>{{ referenceA }} Hz</strong>

          <button type="button" @click="referenceA = Math.min(460, referenceA + 1)">+</button>
        </div>
      </label>

      <q-btn
        v-if="!isListening"
        unelevated
        no-caps
        icon="mic"
        label="Comenzar afinación"
        class="listen-button"
        :loading="isStarting"
        @click="startTuner"
      />

      <q-btn v-else outline no-caps icon="mic_off" label="Detener micrófono" @click="stopTuner" />

      <q-btn
        outline
        no-caps
        icon="volume_up"
        label="Escuchar objetivo"
        :disable="!hasPitch"
        @click="playTarget"
      />
    </div>

    <div v-if="microphoneError" class="error-box">
      {{ microphoneError }}
    </div>

    <div class="tuner-layout">
      <div class="note-card">
        <span class="note-status">
          {{ tuningState }}
        </span>

        <div class="note-circle" :class="tuningClass">
          <template v-if="hasPitch">
            <strong>{{ detectedNote.spanish }}</strong>
            <span> {{ detectedNote.international }}{{ detectedOctave }} </span>
          </template>

          <template v-else>
            <q-icon name="graphic_eq" />
            <small>
              {{ isListening ? 'Escuchando...' : 'Micrófono' }}
            </small>
          </template>
        </div>

        <div class="frequency">
          <strong>
            {{ hasPitch ? `${detectedFrequency.toFixed(2)} Hz` : '—' }}
          </strong>

          <small>
            Objetivo:
            {{ hasPitch ? `${targetFrequency.toFixed(2)} Hz` : '—' }}
          </small>
        </div>
      </div>

      <div class="meter-panel">
        <div class="cents-display">
          <span>DESVIACIÓN</span>

          <strong>
            {{ formattedCents }}
            <small>cents</small>
          </strong>
        </div>

        <div class="meter-labels">
          <span>-50</span>
          <span>-25</span>
          <span>0</span>
          <span>+25</span>
          <span>+50</span>
        </div>

        <div class="meter">
          <div class="good-zone"></div>
          <div class="center-line"></div>

          <div
            v-if="hasPitch"
            class="needle"
            :class="tuningClass"
            :style="{ left: `${needlePosition}%` }"
          ></div>
        </div>

        <div class="directions">
          <span :class="{ active: hasPitch && cents < -5 }">
            <q-icon name="arrow_upward" />
            Sube
          </span>

          <span :class="{ active: hasPitch && Math.abs(cents) <= 5 }">
            <q-icon name="check_circle" />
            Afinado
          </span>

          <span :class="{ active: hasPitch && cents > 5 }">
            <q-icon name="arrow_downward" />
            Baja
          </span>
        </div>

        <div class="input-level">
          <div class="input-heading">
            <span>Nivel de entrada</span>
            <strong>{{ Math.round(inputLevel * 100) }}%</strong>
          </div>

          <div class="level-track">
            <div class="level-fill" :style="{ width: `${inputLevel * 100}%` }"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import { calculateInputLevel, detectPitch } from '../../shared/music';

import { playInstrumentNote, stopAllInstrumentNotes } from './instrument-audio';

import { frequencyToTunedPitch, noteDefinition } from './instrument-theory';

const referenceA = ref(440);

const isStarting = ref(false);
const isListening = ref(false);
const microphoneError = ref('');

const detectedFrequency = ref(0);
const detectedMidi = ref(69);
const detectedPitchClass = ref(9);
const detectedOctave = ref(4);
const cents = ref(0);
const targetFrequency = ref(440);
const inputLevel = ref(0);

let audioContext: AudioContext | null = null;
let microphoneStream: MediaStream | null = null;
let microphoneSource: MediaStreamAudioSourceNode | null = null;
let analyser: AnalyserNode | null = null;
let animationFrame: number | null = null;
let buffer: Float32Array<ArrayBuffer> | null = null;

const hasPitch = computed(() => detectedFrequency.value > 0);

const detectedNote = computed(() => noteDefinition(detectedPitchClass.value));

const needlePosition = computed(() => Math.max(0, Math.min(100, cents.value + 50)));

const formattedCents = computed(() => {
  if (!hasPitch.value) {
    return '—';
  }

  const rounded = Math.round(cents.value);

  return rounded > 0 ? `+${rounded}` : `${rounded}`;
});

const tuningState = computed(() => {
  if (!hasPitch.value) {
    return 'Esperando nota';
  }

  if (Math.abs(cents.value) <= 5) {
    return 'AFINADO';
  }

  return cents.value < 0 ? 'BAJO' : 'ALTO';
});

const tuningClass = computed(() => {
  if (!hasPitch.value) {
    return 'waiting';
  }

  if (Math.abs(cents.value) <= 5) {
    return 'tuned';
  }

  return cents.value < 0 ? 'low' : 'high';
});

const microphoneStatus = computed(() => {
  if (microphoneError.value) {
    return 'Micrófono no disponible';
  }

  if (isStarting.value) {
    return 'Solicitando permiso';
  }

  return isListening.value ? 'Escuchando' : 'Micrófono detenido';
});

async function startTuner(): Promise<void> {
  microphoneError.value = '';
  isStarting.value = true;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este dispositivo no permite utilizar el micrófono.');
    }

    stopTuner();

    isStarting.value = true;

    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
      },
      video: false,
    });

    audioContext = new AudioContext();

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    microphoneSource = audioContext.createMediaStreamSource(microphoneStream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;

    microphoneSource.connect(analyser);

    buffer = new Float32Array(analyser.fftSize);

    isStarting.value = false;
    isListening.value = true;

    analyse();
  } catch (error) {
    stopTuner();
    isStarting.value = false;

    if (
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
    ) {
      microphoneError.value = 'ICP Studio no tiene permiso para utilizar el micrófono.';
      return;
    }

    microphoneError.value =
      error instanceof Error ? error.message : 'No fue posible utilizar el micrófono.';
  }
}

function analyse(): void {
  if (!isListening.value || !analyser || !audioContext || !buffer) {
    return;
  }

  analyser.getFloatTimeDomainData(buffer);

  inputLevel.value = calculateInputLevel(buffer);

  const frequency = detectPitch(buffer, audioContext.sampleRate);

  if (frequency > 0) {
    const pitch = frequencyToTunedPitch(frequency, referenceA.value);

    detectedFrequency.value = frequency;
    detectedMidi.value = pitch.midi;
    detectedPitchClass.value = pitch.pitchClass;
    detectedOctave.value = pitch.octave;
    cents.value = pitch.cents;
    targetFrequency.value = pitch.targetFrequency;
  } else {
    clearPitch();
  }

  animationFrame = requestAnimationFrame(analyse);
}

function clearPitch(): void {
  detectedFrequency.value = 0;
  cents.value = 0;
  targetFrequency.value = 0;

  if (!isListening.value) {
    inputLevel.value = 0;
  }
}

function stopTuner(): void {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  microphoneSource?.disconnect();
  analyser?.disconnect();

  microphoneStream?.getTracks().forEach((track) => track.stop());

  microphoneSource = null;
  microphoneStream = null;
  analyser = null;
  buffer = null;

  isListening.value = false;

  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }

  clearPitch();
}

function playTarget(): void {
  if (!hasPitch.value) {
    return;
  }

  playInstrumentNote(detectedMidi.value, 2, 0.24);
}

onBeforeUnmount(() => {
  stopTuner();
  stopAllInstrumentNotes();
});
</script>

<style scoped>
.instrument-workspace {
  padding: 20px;
  color: #dce8f5;
  background: #0b1521;
  border: 1px solid #223348;
  border-radius: 18px;
}

.workspace-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid #1d2c3e;
}

.section-kicker {
  color: #fb7185;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

h2 {
  margin: 4px 0 5px;
  color: #edf3fa;
  font-size: 20px;
}

p {
  max-width: 720px;
  margin: 0;
  color: #8493a8;
  font-size: 12px;
}

.microphone-state {
  display: flex;
  height: 36px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: #8292a7;
  border: 1px solid #27394e;
  border-radius: 10px;
  font-size: 10px;
}

.state-dot {
  width: 7px;
  height: 7px;
  background: #66768a;
  border-radius: 50%;
}

.microphone-state.active .state-dot {
  background: #34d399;
}

.microphone-state.error .state-dot {
  background: #fb7185;
}

.tuner-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  padding: 18px 0;
}

.tuner-controls label > span {
  display: block;
  margin-bottom: 5px;
  color: #71839a;
  font-size: 9px;
  text-transform: uppercase;
}

.reference-control {
  display: flex;
  height: 38px;
  align-items: center;
  background: #101d2b;
  border: 1px solid #2a3e55;
  border-radius: 9px;
}

.reference-control button {
  width: 36px;
  height: 100%;
  color: #dce8f5;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.reference-control strong {
  min-width: 72px;
  color: #fff;
  font-size: 11px;
  text-align: center;
}

.listen-button {
  color: white;
  background: #e05770;
}

.error-box {
  margin-bottom: 15px;
  padding: 11px 13px;
  color: #fecdd3;
  background: rgb(251 113 133 / 8%);
  border: 1px solid rgb(251 113 133 / 18%);
  border-radius: 10px;
  font-size: 10px;
}

.tuner-layout {
  display: grid;
  grid-template-columns:
    minmax(260px, 0.65fr)
    minmax(420px, 1.35fr);
  gap: 18px;
}

.note-card,
.meter-panel {
  padding: 20px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 16px;
}

.note-card {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.note-status {
  color: #8495aa;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.note-circle {
  display: flex;
  width: 165px;
  height: 165px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin: 15px 0;
  background: #152235;
  border: 2px solid #405268;
  border-radius: 50%;
}

.note-circle strong {
  color: white;
  font-size: 37px;
}

.note-circle span {
  color: #9aabbd;
  font-size: 14px;
}

.note-circle .q-icon {
  color: #708399;
  font-size: 38px;
}

.note-circle.tuned {
  border-color: #34d399;
  box-shadow: 0 0 35px rgb(52 211 153 / 12%);
}

.note-circle.low {
  border-color: #60a5fa;
}

.note-circle.high {
  border-color: #fb7185;
}

.frequency {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.frequency strong {
  color: #e7eef7;
  font-size: 18px;
}

.frequency small {
  color: #71839a;
}

.cents-display {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.cents-display > span {
  color: #71839a;
  font-size: 9px;
}

.cents-display strong {
  color: #fbbf24;
  font-size: 25px;
}

.cents-display small {
  font-size: 9px;
}

.meter-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 35px;
  color: #62758c;
  font-size: 9px;
}

.meter {
  position: relative;
  height: 22px;
  margin-top: 7px;
  background: #08111b;
  border: 1px solid #26384d;
  border-radius: 11px;
}

.good-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 45%;
  width: 10%;
  background: rgb(52 211 153 / 13%);
}

.center-line {
  position: absolute;
  top: -8px;
  bottom: -8px;
  left: 50%;
  width: 1px;
  background: #34d399;
}

.needle {
  position: absolute;
  top: -10px;
  width: 3px;
  height: 40px;
  background: #fbbf24;
  border-radius: 2px;
  transform: translateX(-50%);
  transition: left 70ms linear;
}

.needle.tuned {
  background: #34d399;
}

.needle.low {
  background: #60a5fa;
}

.needle.high {
  background: #fb7185;
}

.directions {
  display: flex;
  justify-content: space-between;
  margin-top: 25px;
}

.directions span {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  color: #60738a;
  border-radius: 8px;
  font-size: 10px;
}

.directions span.active {
  color: #fff;
  background: #162537;
}

.input-level {
  margin-top: 35px;
}

.input-heading {
  display: flex;
  justify-content: space-between;
  color: #71839a;
  font-size: 9px;
}

.level-track {
  height: 7px;
  margin-top: 6px;
  overflow: hidden;
  background: #07101a;
  border-radius: 5px;
}

.level-fill {
  height: 100%;
  background: #60a5fa;
  border-radius: inherit;
  transition: width 80ms linear;
}

@media (max-width: 850px) {
  .workspace-heading {
    flex-direction: column;
  }

  .tuner-layout {
    grid-template-columns: 1fr;
  }
}
</style>
