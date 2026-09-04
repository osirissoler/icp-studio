<template>
  <section class="workspace">
    <div class="workspace-heading">
      <div>
        <span class="section-kicker">DETECCIÓN POR MICRÓFONO</span>
        <h2>Canta una nota y deja que ICP Studio la encuentre</h2>
        <p>
          Mantén una vocal como “aaa”. ICP Studio analizará la frecuencia y buscará la nota musical
          más cercana.
        </p>
      </div>

      <div class="microphone-state" :class="{ active: isListening, error: microphoneError }">
        <span class="state-dot"></span>
        {{ microphoneStatusText }}
      </div>
    </div>

    <div class="detector-layout">
      <div class="detected-note-card">
        <div class="note-circle">
          <template v-if="hasDetectedPitch">
            <span>{{ detectedNoteLabel }}</span>
            <strong>{{ detectedOctave }}</strong>
            <small> {{ detectedInternational }}{{ detectedOctave }} </small>
          </template>

          <template v-else>
            <q-icon name="mic" />
            <small>
              {{ isListening ? 'Canta...' : 'Micrófono' }}
            </small>
          </template>
        </div>

        <div class="frequency">
          <span>Frecuencia detectada</span>

          <strong>
            {{ hasDetectedPitch ? detectedFrequency.toFixed(2) : '--' }}
            <small>Hz</small>
          </strong>
        </div>

        <q-btn
          v-if="!isListening"
          unelevated
          no-caps
          icon="mic"
          label="Comenzar a escuchar"
          class="listen-button"
          :loading="isStartingMicrophone"
          @click="startPitchDetection"
        />

        <q-btn
          v-else
          outline
          no-caps
          icon="mic_off"
          label="Detener micrófono"
          class="stop-button"
          @click="stopPitchDetection"
        />

        <div v-if="microphoneError" class="error-box">
          {{ microphoneError }}
        </div>
      </div>

      <div class="pitch-panel">
        <div class="pitch-header">
          <div>
            <span>Afinación</span>
            <strong>{{ tuningStateText }}</strong>
          </div>

          <div class="cents">
            {{ hasDetectedPitch ? formattedCents : '--' }}
            <small>cents</small>
          </div>
        </div>

        <div class="scale-labels">
          <span>-50</span>
          <span>-25</span>
          <span>0</span>
          <span>+25</span>
          <span>+50</span>
        </div>

        <div class="scale-track">
          <div class="center-zone"></div>

          <div v-if="hasDetectedPitch" class="needle" :style="{ left: `${needlePosition}%` }"></div>
        </div>

        <div class="description">
          <q-icon :name="tuningIcon" />
          {{ tuningDescription }}
        </div>

        <div class="details">
          <div>
            <span>Nota</span>
            <strong>
              {{ hasDetectedPitch ? `${detectedNoteLabel}${detectedOctave}` : '--' }}
            </strong>
          </div>

          <div>
            <span>Internacional</span>
            <strong>
              {{ hasDetectedPitch ? `${detectedInternational}${detectedOctave}` : '--' }}
            </strong>
          </div>

          <div>
            <span>Frecuencia exacta</span>
            <strong>
              {{ hasDetectedPitch ? `${targetFrequency.toFixed(2)} Hz` : '--' }}
            </strong>
          </div>

          <div>
            <span>Nivel entrada</span>
            <strong>{{ Math.round(inputLevel * 100) }}%</strong>
          </div>
        </div>

        <q-btn
          unelevated
          no-caps
          icon="graphic_eq"
          label="Usar como nota de referencia"
          class="reference-button"
          :disable="!hasDetectedPitch"
          @click="useAsReference"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import {
  calculateInputLevel,
  detectPitch,
  frequencyToPitchInformation,
  notes,
} from '../shared/music';

const emit = defineEmits<{
  'use-reference': [
    value: {
      note: number;
      octave: number;
    },
  ];
}>();

const isStartingMicrophone = ref(false);
const isListening = ref(false);
const microphoneError = ref('');

const detectedFrequency = ref(0);
const detectedNoteIndex = ref(0);
const detectedOctave = ref(0);
const detectedCents = ref(0);
const targetFrequency = ref(0);
const inputLevel = ref(0);

let audioContext: AudioContext | null = null;
let microphoneStream: MediaStream | null = null;
let microphoneSource: MediaStreamAudioSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;
let animationFrameId: number | null = null;
let buffer: Float32Array<ArrayBuffer> | null = null;

const hasDetectedPitch = computed(() => detectedFrequency.value > 0);

const detectedNoteLabel = computed(
  () => notes.find((note) => note.value === detectedNoteIndex.value)?.label ?? '--',
);

const detectedInternational = computed(
  () => notes.find((note) => note.value === detectedNoteIndex.value)?.international ?? '--',
);

const formattedCents = computed(() => {
  const cents = Math.round(detectedCents.value);

  return cents > 0 ? `+${cents}` : `${cents}`;
});

const needlePosition = computed(() => {
  const cents = Math.max(-50, Math.min(50, detectedCents.value));

  return cents + 50;
});

const tuningStateText = computed(() => {
  if (!hasDetectedPitch.value) {
    return 'Esperando una nota';
  }

  if (Math.abs(detectedCents.value) <= 5) {
    return 'Afinado';
  }

  return detectedCents.value < 0 ? 'Un poco bajo' : 'Un poco alto';
});

const tuningDescription = computed(() => {
  if (!hasDetectedPitch.value) {
    return 'Canta una nota para comenzar.';
  }

  if (Math.abs(detectedCents.value) <= 5) {
    return 'Estás muy cerca del centro de la nota.';
  }

  if (detectedCents.value < 0) {
    return 'Sube ligeramente la voz.';
  }

  return 'Baja ligeramente la voz.';
});

const tuningIcon = computed(() => {
  if (!hasDetectedPitch.value) {
    return 'graphic_eq';
  }

  if (Math.abs(detectedCents.value) <= 5) {
    return 'check_circle';
  }

  return detectedCents.value < 0 ? 'arrow_upward' : 'arrow_downward';
});

const microphoneStatusText = computed(() => {
  if (microphoneError.value) {
    return 'Micrófono no disponible';
  }

  if (isStartingMicrophone.value) {
    return 'Solicitando micrófono';
  }

  return isListening.value ? 'Escuchando' : 'Micrófono detenido';
});

async function startPitchDetection(): Promise<void> {
  microphoneError.value = '';
  isStartingMicrophone.value = true;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este dispositivo no permite utilizar el micrófono.');
    }

    stopPitchDetection();

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

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 4096;
    analyserNode.smoothingTimeConstant = 0;

    microphoneSource.connect(analyserNode);

    buffer = new Float32Array(analyserNode.fftSize);

    isListening.value = true;
    isStartingMicrophone.value = false;

    analysePitch();
  } catch (error) {
    stopPitchDetection();
    isStartingMicrophone.value = false;

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

function analysePitch(): void {
  if (!isListening.value || !analyserNode || !audioContext || !buffer) {
    return;
  }

  analyserNode.getFloatTimeDomainData(buffer);

  inputLevel.value = calculateInputLevel(buffer);

  const frequency = detectPitch(buffer, audioContext.sampleRate);

  if (frequency > 0) {
    const pitch = frequencyToPitchInformation(frequency);

    detectedFrequency.value = pitch.frequency;
    detectedNoteIndex.value = pitch.noteIndex;
    detectedOctave.value = pitch.octave;
    detectedCents.value = pitch.cents;
    targetFrequency.value = pitch.targetFrequency;
  } else {
    resetPitch();
  }

  animationFrameId = requestAnimationFrame(analysePitch);
}

function stopPitchDetection(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  microphoneSource?.disconnect();
  analyserNode?.disconnect();

  microphoneStream?.getTracks().forEach((track) => track.stop());

  microphoneSource = null;
  analyserNode = null;
  microphoneStream = null;
  buffer = null;

  isListening.value = false;
  isStartingMicrophone.value = false;

  resetPitch();

  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
}

function resetPitch(): void {
  detectedFrequency.value = 0;
  detectedNoteIndex.value = 0;
  detectedOctave.value = 0;
  detectedCents.value = 0;
  targetFrequency.value = 0;

  if (!isListening.value) {
    inputLevel.value = 0;
  }
}

function useAsReference(): void {
  if (!hasDetectedPitch.value) {
    return;
  }

  emit('use-reference', {
    note: detectedNoteIndex.value,
    octave: Math.max(2, Math.min(5, detectedOctave.value)),
  });

  stopPitchDetection();
}

onBeforeUnmount(() => {
  stopPitchDetection();
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
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid #1d2c3e;
}

.section-kicker {
  color: #60a5fa;
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
  max-width: 700px;
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
  background: #60a5fa;
}

.microphone-state.error .state-dot {
  background: #fb7185;
}

.detector-layout {
  display: grid;
  grid-template-columns:
    minmax(300px, 0.8fr)
    minmax(400px, 1.2fr);
  gap: 18px;
  padding-top: 18px;
}

.detected-note-card,
.pitch-panel {
  padding: 20px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 16px;
}

.detected-note-card {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.note-circle {
  display: flex;
  width: 150px;
  height: 150px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: #152235;
  border: 1px solid rgb(96 165 250 / 38%);
  border-radius: 50%;
}

.note-circle > span {
  color: white;
  font-size: 30px;
  font-weight: 750;
}

.note-circle > strong {
  color: #93c5fd;
  font-size: 16px;
}

.note-circle > small {
  color: #8294aa;
}

.note-circle .q-icon {
  color: #60a5fa;
  font-size: 36px;
}

.frequency {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin: 16px 0;
}

.frequency span {
  color: #71839a;
  font-size: 9px;
  text-transform: uppercase;
}

.frequency strong {
  color: #e8f1fb;
  font-size: 23px;
}

.frequency small {
  color: #6f849d;
  font-size: 10px;
}

.listen-button,
.stop-button,
.reference-button {
  width: 100%;
  border-radius: 11px;
}

.listen-button {
  color: white;
  background: #367fd3;
}

.error-box {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  color: #fecdd3;
  background: rgb(251 113 133 / 8%);
  border-radius: 9px;
  font-size: 10px;
}

.pitch-header {
  display: flex;
  justify-content: space-between;
}

.pitch-header span,
.details span {
  color: #73859a;
  font-size: 9px;
  text-transform: uppercase;
}

.pitch-header strong {
  display: block;
  color: #e4edf7;
  font-size: 16px;
}

.cents {
  color: #fbbf24;
  font-size: 21px;
  font-weight: 700;
}

.cents small {
  font-size: 9px;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 28px;
  color: #53657a;
  font-size: 8px;
}

.scale-track {
  position: relative;
  height: 56px;
  margin-top: 7px;
  background: #101d2b;
  border: 1px solid #273b51;
  border-radius: 12px;
}

.center-zone {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 45%;
  width: 10%;
  background: rgb(52 211 153 / 8%);
  border-radius: 8px;
}

.needle {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: #fbbf24;
  transform: translateX(-50%);
}

.description {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin: 12px 0;
  color: #8496aa;
  font-size: 10px;
}

.details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.details > div {
  padding: 10px;
  background: #101d2b;
  border: 1px solid #263a50;
  border-radius: 10px;
}

.details strong {
  display: block;
  color: #c9d6e4;
  font-size: 11px;
}

.reference-button {
  margin-top: 15px;
  color: white;
  background: #875ad1;
}

@media (max-width: 900px) {
  .detector-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .workspace-heading {
    flex-direction: column;
  }

  .details {
    grid-template-columns: 1fr;
  }
}
</style>
