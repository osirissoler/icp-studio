<template>
  <section class="capture-card">
    <header class="capture-heading">
      <div class="heading-copy">
        <span class="kicker"> CANTAR Y ANALIZAR </span>

        <h3>Captura la canción con tu voz</h3>

        <p>
          Canta normalmente. ICP Studio grabará el audio completo y seguirá los cambios de la
          melodía mientras cantas.
        </p>
      </div>

      <div
        class="recording-state"
        :class="{
          active: isRecording,
          error: microphoneError,
        }"
      >
        <span class="state-dot"></span>

        {{ recordingStatus }}
      </div>
    </header>

    <div class="capture-layout">
      <div class="recorder-panel">
        <div
          class="microphone-display"
          :class="{
            active: isRecording,
          }"
        >
          <div class="record-circle">
            <q-icon :name="isRecording ? 'mic' : 'mic_none'" />
          </div>

          <div class="record-time">
            {{ formattedRecordingTime }}
          </div>

          <div class="record-caption">
            {{
              isRecording
                ? 'Grabando interpretación'
                : hasCapture
                  ? 'Grabación terminada'
                  : 'Preparado para grabar'
            }}
          </div>
        </div>

        <div class="level-area">
          <div class="level-heading">
            <span>Nivel del micrófono</span>

            <strong> {{ Math.round(inputLevel * 100) }}% </strong>
          </div>

          <div class="level-track">
            <span
              :style="{
                width: `${Math.round(inputLevel * 100)}%`,
              }"
            ></span>
          </div>
        </div>

        <div class="record-actions">
          <q-btn
            v-if="!isRecording"
            unelevated
            no-caps
            icon="fiber_manual_record"
            :label="hasCapture ? 'Grabar nuevamente' : 'Comenzar a grabar'"
            class="record-button"
            :loading="isStarting"
            @click="startRecording"
          />

          <q-btn
            v-else
            unelevated
            no-caps
            icon="stop"
            label="Detener grabación"
            class="stop-record-button"
            @click="stopRecording"
          />
        </div>

        <div v-if="microphoneError" class="error-box">
          <q-icon name="error_outline" />

          <span>
            {{ microphoneError }}
          </span>
        </div>

        <div v-if="audioUrl" class="audio-review">
          <div class="audio-title">
            <q-icon name="headphones" />

            <div>
              <strong>Audio original</strong>
              <span>Escucha exactamente lo que cantaste.</span>
            </div>
          </div>

          <audio :src="audioUrl" controls></audio>
        </div>
      </div>

      <div class="analysis-panel">
        <div class="current-note-card">
          <span class="analysis-label"> NOTA ACTUAL </span>

          <div v-if="hasCurrentPitch" class="current-note">
            <strong>
              {{ currentNoteLabel }}
            </strong>

            <span>
              {{ currentOctave }}
            </span>

            <small> {{ currentInternational }}{{ currentOctave }} </small>
          </div>

          <div v-else class="current-note waiting">
            <q-icon name="graphic_eq" />

            <span>
              {{ isRecording ? 'Escuchando...' : 'Sin señal' }}
            </span>
          </div>

          <div class="pitch-details">
            <div>
              <span>Frecuencia</span>

              <strong>
                {{ hasCurrentPitch ? `${currentFrequency.toFixed(1)} Hz` : '--' }}
              </strong>
            </div>

            <div>
              <span>Afinación</span>

              <strong>
                {{ hasCurrentPitch ? formattedCents : '--' }}
              </strong>
            </div>
          </div>
        </div>

        <div class="key-card">
          <div>
            <span class="analysis-label"> TONALIDAD ESTIMADA </span>

            <strong>
              {{ estimatedKeyLabel }}
            </strong>

            <small> La estimación mejora a medida que cantas más notas. </small>
          </div>

          <q-icon name="music_note" />
        </div>

        <div class="statistics">
          <div>
            <span>Notas detectadas</span>

            <strong>
              {{ capturedNotes.length }}
            </strong>
          </div>

          <div>
            <span>Duración</span>

            <strong>
              {{ formattedRecordingTime }}
            </strong>
          </div>

          <div>
            <span>Cambios melódicos</span>

            <strong>
              {{ melodicChanges }}
            </strong>
          </div>
        </div>
      </div>
    </div>

    <section class="timeline-section">
      <header class="timeline-heading">
        <div>
          <span>MELODÍA DETECTADA</span>

          <small>
            ICP Studio une pequeñas fluctuaciones para evitar convertir el vibrato natural en notas
            diferentes.
          </small>
        </div>

        <q-btn
          v-if="capturedNotes.length"
          flat
          dense
          no-caps
          icon="delete_outline"
          label="Limpiar"
          class="clear-button"
          :disable="isRecording"
          @click="clearCapture"
        />
      </header>

      <div v-if="capturedNotes.length" class="melody-timeline">
        <article v-for="(note, index) in capturedNotes" :key="note.id" class="timeline-note">
          <span class="note-order">
            {{ index + 1 }}
          </span>

          <strong>
            {{ noteName(note.noteIndex) }}
          </strong>

          <span class="note-octave">
            {{ note.octave }}
          </span>

          <small>
            {{ formatDuration(note.durationMs) }}
          </small>
        </article>
      </div>

      <div v-else class="empty-timeline">
        <q-icon name="multiline_chart" />

        <div>
          <strong> La melodía aparecerá aquí </strong>

          <span> Presiona Grabar y comienza a cantar. </span>
        </div>
      </div>
    </section>

    <section v-if="hasCapture" class="capture-result">
      <div class="result-copy">
        <q-icon name="auto_awesome" />

        <div>
          <strong> Captura lista para utilizar </strong>

          <p>
            Puedes conservar la tonalidad estimada y convertir las notas detectadas en una frase de
            la Melodía principal. Desde ahí el armonizador podrá calcular las demás voces.
          </p>
        </div>
      </div>

      <q-btn
        unelevated
        no-caps
        icon="playlist_add_check"
        label="Usar esta melodía"
        class="use-button"
        :disable="!capturedNotes.length"
        @click="useCapturedMelody"
      />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import {
  calculateInputLevel,
  detectPitch,
  frequencyToPitchInformation,
  notes,
} from '../../../shared/music';

import type {
  MelodyNote,
  MelodyNoteDuration,
  MelodyPhrase,
  ScaleMode,
} from '../../../shared/harmony';

interface CapturedPitchNote {
  id: string;
  noteIndex: number;
  octave: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

interface KeyEstimate {
  rootNote: number;
  scaleMode: ScaleMode;
  score: number;
}

const emit = defineEmits<{
  'use-capture': [
    value: {
      phrase: MelodyPhrase;
      rootNote: number;
      scaleMode: ScaleMode;
    },
  ];
}>();

const isStarting = ref(false);

const isRecording = ref(false);

const microphoneError = ref('');

const recordingTimeMs = ref(0);

const inputLevel = ref(0);

const currentFrequency = ref(0);

const currentNoteIndex = ref(0);

const currentOctave = ref(0);

const currentCents = ref(0);

const capturedNotes = ref<CapturedPitchNote[]>([]);

const audioUrl = ref('');

let audioContext: AudioContext | null = null;

let microphoneStream: MediaStream | null = null;

let microphoneSource: MediaStreamAudioSourceNode | null = null;

let analyserNode: AnalyserNode | null = null;

let analyserBuffer: Float32Array | null = null;

let mediaRecorder: MediaRecorder | null = null;

let recordedChunks: Blob[] = [];

let animationFrameId: number | null = null;

let recordingTimer: ReturnType<typeof setInterval> | null = null;

let recordingStartedAt = 0;

let lastAnalysisAt = 0;

let candidateMidi: number | null = null;

let candidateSince = 0;

let confirmedMidi: number | null = null;

let confirmedStartedAt = 0;

const analysisIntervalMs = 85;

const confirmationMs = 170;

const hasCurrentPitch = computed(() => currentFrequency.value > 0);

const hasCapture = computed(() => Boolean(audioUrl.value) || capturedNotes.value.length > 0);

const currentNoteLabel = computed(() => noteName(currentNoteIndex.value));

const currentInternational = computed(
  () => notes.find((note) => note.value === currentNoteIndex.value)?.international ?? '--',
);

const formattedCents = computed(() => {
  const value = Math.round(currentCents.value);

  return value > 0 ? `+${value} cents` : `${value} cents`;
});

const recordingStatus = computed(() => {
  if (microphoneError.value) {
    return 'Error de micrófono';
  }

  if (isStarting.value) {
    return 'Solicitando micrófono';
  }

  if (isRecording.value) {
    return 'Grabando';
  }

  if (hasCapture.value) {
    return 'Captura terminada';
  }

  return 'Preparado';
});

const formattedRecordingTime = computed(() => formatTime(recordingTimeMs.value));

const melodicChanges = computed(() => Math.max(0, capturedNotes.value.length - 1));

const estimatedKey = computed<KeyEstimate | null>(() => estimateKey(capturedNotes.value));

const estimatedKeyLabel = computed(() => {
  const estimate = estimatedKey.value;

  if (!estimate) {
    return 'Esperando más notas';
  }

  return `${noteName(estimate.rootNote)} ${estimate.scaleMode === 'major' ? 'mayor' : 'menor'}`;
});

async function startRecording(): Promise<void> {
  microphoneError.value = '';
  isStarting.value = true;

  try {
    stopResources();

    clearCapture();

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este dispositivo no permite utilizar el micrófono.');
    }

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

    analyserNode.fftSize = 2048;

    analyserNode.smoothingTimeConstant = 0;

    microphoneSource.connect(analyserNode);

    analyserBuffer = new Float32Array(analyserNode.fftSize);

    recordedChunks = [];

    mediaRecorder = new MediaRecorder(microphoneStream);

    mediaRecorder.addEventListener('dataavailable', handleRecordedData);

    mediaRecorder.addEventListener('stop', buildRecordedAudio);

    recordingStartedAt = performance.now();

    recordingTimeMs.value = 0;

    candidateMidi = null;
    confirmedMidi = null;

    mediaRecorder.start(250);

    isRecording.value = true;

    isStarting.value = false;

    recordingTimer = setInterval(updateRecordingTime, 100);

    analyseVoice();
  } catch (error) {
    stopResources();

    isStarting.value = false;

    if (
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
    ) {
      microphoneError.value = 'ICP Studio no tiene permiso para utilizar el micrófono.';

      return;
    }

    microphoneError.value =
      error instanceof Error ? error.message : 'No fue posible iniciar la grabación.';
  }
}

function stopRecording(): void {
  if (!isRecording.value) {
    return;
  }

  const now = performance.now();

  finalizeConfirmedNote(now);

  isRecording.value = false;

  if (recordingTimer) {
    clearInterval(recordingTimer);

    recordingTimer = null;
  }

  recordingTimeMs.value = now - recordingStartedAt;

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);

    animationFrameId = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  microphoneSource?.disconnect();

  analyserNode?.disconnect();

  microphoneStream?.getTracks().forEach((track) => track.stop());

  microphoneSource = null;
  analyserNode = null;
  analyserBuffer = null;
  microphoneStream = null;

  inputLevel.value = 0;

  resetCurrentPitch();

  if (audioContext) {
    void audioContext.close();

    audioContext = null;
  }
}

function analyseVoice(): void {
  if (!isRecording.value || !analyserNode || !analyserBuffer || !audioContext) {
    return;
  }

  const now = performance.now();

  analyserNode.getFloatTimeDomainData(analyserBuffer);

  inputLevel.value = calculateInputLevel(analyserBuffer);

  if (now - lastAnalysisAt >= analysisIntervalMs) {
    lastAnalysisAt = now;

    const frequency = detectPitch(analyserBuffer, audioContext.sampleRate);

    if (frequency > 0 && inputLevel.value > 0.04) {
      const pitch = frequencyToPitchInformation(frequency);

      currentFrequency.value = pitch.frequency;

      currentNoteIndex.value = pitch.noteIndex;

      currentOctave.value = pitch.octave;

      currentCents.value = pitch.cents;

      processPitchCandidate(pitch.midi, now);
    } else {
      processSilence(now);
    }
  }

  animationFrameId = requestAnimationFrame(analyseVoice);
}

function processPitchCandidate(midi: number, now: number): void {
  if (candidateMidi !== midi) {
    candidateMidi = midi;

    candidateSince = now;

    return;
  }

  if (now - candidateSince < confirmationMs) {
    return;
  }

  if (confirmedMidi === midi) {
    return;
  }

  finalizeConfirmedNote(candidateSince);

  confirmedMidi = midi;

  confirmedStartedAt = candidateSince;
}

function processSilence(now: number): void {
  resetCurrentPitch();

  if (confirmedMidi !== null && now - confirmedStartedAt > 220) {
    finalizeConfirmedNote(now);
  }

  candidateMidi = null;
}

function finalizeConfirmedNote(endedAt: number): void {
  if (confirmedMidi === null) {
    return;
  }

  const durationMs = Math.max(0, endedAt - confirmedStartedAt);

  if (durationMs >= 140) {
    const noteIndex = normalizeNote(confirmedMidi);

    const octave = Math.floor(confirmedMidi / 12) - 1;

    const previous = capturedNotes.value[capturedNotes.value.length - 1];

    if (
      previous &&
      previous.noteIndex === noteIndex &&
      previous.octave === octave &&
      confirmedStartedAt - previous.endedAt < 240
    ) {
      previous.endedAt = endedAt;

      previous.durationMs += durationMs;
    } else {
      capturedNotes.value.push({
        id: makeId(),
        noteIndex,
        octave,
        startedAt: confirmedStartedAt - recordingStartedAt,
        endedAt: endedAt - recordingStartedAt,
        durationMs,
      });
    }
  }

  confirmedMidi = null;
  confirmedStartedAt = 0;
}

function handleRecordedData(event: BlobEvent): void {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

function buildRecordedAudio(): void {
  if (!recordedChunks.length) {
    return;
  }

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }

  const mimeType = mediaRecorder?.mimeType || 'audio/webm';

  const blob = new Blob(recordedChunks, {
    type: mimeType,
  });

  audioUrl.value = URL.createObjectURL(blob);
}

function updateRecordingTime(): void {
  if (!isRecording.value) {
    return;
  }

  recordingTimeMs.value = performance.now() - recordingStartedAt;
}

function useCapturedMelody(): void {
  const estimate = estimatedKey.value;

  if (!capturedNotes.value.length || !estimate) {
    return;
  }

  const melodyNotes: MelodyNote[] = capturedNotes.value.map((note) => ({
    id: makeId(),

    noteIndex: note.noteIndex,

    octave: note.octave,

    beats: durationToBeats(note.durationMs),
  }));

  const phrase: MelodyPhrase = {
    id: makeId(),

    title: 'Melodía capturada',

    lyrics: '',

    chordStepId: null,

    notes: melodyNotes,
  };

  emit('use-capture', {
    phrase,

    rootNote: estimate.rootNote,

    scaleMode: estimate.scaleMode,
  });
}

function estimateKey(detected: CapturedPitchNote[]): KeyEstimate | null {
  if (detected.length < 3) {
    return null;
  }

  const pitchWeights = Array<number>(12).fill(0);

  detected.forEach((note) => {
    pitchWeights[note.noteIndex] =
      (pitchWeights[note.noteIndex] ?? 0) + Math.max(note.durationMs, 100);
  });

  const majorPattern = [0, 2, 4, 5, 7, 9, 11];

  const minorPattern = [0, 2, 3, 5, 7, 8, 10];

  let best: KeyEstimate | null = null;

  for (let root = 0; root < 12; root += 1) {
    [
      {
        mode: 'major' as const,
        pattern: majorPattern,
      },
      {
        mode: 'minor' as const,
        pattern: minorPattern,
      },
    ].forEach(({ mode, pattern }) => {
      let score = 0;

      pitchWeights.forEach((weight, pitch) => {
        const relative = normalizeNote(pitch - root);

        if (pattern.includes(relative)) {
          score += weight;
        } else {
          score -= weight * 0.55;
        }

        if (relative === 0) {
          score += weight * 0.35;
        }
      });

      if (!best || score > best.score) {
        best = {
          rootNote: root,
          scaleMode: mode,
          score,
        };
      }
    });
  }

  return best;
}

function durationToBeats(durationMs: number): MelodyNoteDuration {
  if (durationMs < 360) {
    return 0.5;
  }

  if (durationMs < 750) {
    return 1;
  }

  if (durationMs < 1500) {
    return 2;
  }

  return 4;
}

function clearCapture(): void {
  if (isRecording.value) {
    return;
  }

  capturedNotes.value = [];

  recordingTimeMs.value = 0;

  inputLevel.value = 0;

  candidateMidi = null;
  confirmedMidi = null;

  recordedChunks = [];

  resetCurrentPitch();

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);

    audioUrl.value = '';
  }
}

function resetCurrentPitch(): void {
  currentFrequency.value = 0;

  currentNoteIndex.value = 0;

  currentOctave.value = 0;

  currentCents.value = 0;
}

function stopResources(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);

    animationFrameId = null;
  }

  if (recordingTimer) {
    clearInterval(recordingTimer);

    recordingTimer = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  microphoneSource?.disconnect();

  analyserNode?.disconnect();

  microphoneStream?.getTracks().forEach((track) => track.stop());

  microphoneSource = null;
  analyserNode = null;
  analyserBuffer = null;
  microphoneStream = null;
  mediaRecorder = null;

  isRecording.value = false;

  if (audioContext) {
    void audioContext.close();

    audioContext = null;
  }
}

function noteName(noteIndex: number): string {
  return notes.find((note) => note.value === noteIndex)?.label ?? '—';
}

function normalizeNote(value: number): number {
  return ((value % 12) + 12) % 12;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

onBeforeUnmount(() => {
  stopResources();

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
});
</script>

<style scoped>
.capture-card {
  padding: 18px;
  background: linear-gradient(180deg, rgb(244 114 182 / 4%), transparent 180px), #0d1825;
  border: 1px solid #213247;
  border-radius: 15px;
}

.capture-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.kicker {
  color: #f472b6;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.capture-heading h3 {
  margin: 3px 0 4px;
  color: #edf3fa;
  font-size: 16px;
}

.capture-heading p {
  max-width: 620px;
  margin: 0;
  color: #718399;
  font-size: 10px;
  line-height: 1.45;
}

.recording-state {
  display: flex;
  height: 32px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  color: #778ba1;
  border: 1px solid #2a3e53;
  border-radius: 9px;
  font-size: 8px;
}

.state-dot {
  width: 7px;
  height: 7px;
  background: #64758a;
  border-radius: 50%;
}

.recording-state.active {
  color: #f9a8d4;
  border-color: rgb(244 114 182 / 35%);
}

.recording-state.active .state-dot {
  background: #f472b6;
  box-shadow: 0 0 0 5px rgb(244 114 182 / 8%);
}

.recording-state.error .state-dot {
  background: #fb7185;
}

.capture-layout {
  display: grid;
  grid-template-columns:
    minmax(300px, 0.8fr)
    minmax(420px, 1.2fr);
  gap: 12px;
  margin-top: 14px;
}

.recorder-panel,
.analysis-panel {
  padding: 14px;
  background: #0a1521;
  border: 1px solid #22364b;
  border-radius: 12px;
}

.microphone-display {
  display: flex;
  min-height: 155px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: radial-gradient(circle, rgb(244 114 182 / 8%), transparent 65%);
  border-radius: 10px;
}

.record-circle {
  display: grid;
  width: 66px;
  height: 66px;
  place-items: center;
  color: #f472b6;
  background: rgb(244 114 182 / 9%);
  border: 1px solid rgb(244 114 182 / 24%);
  border-radius: 50%;
}

.microphone-display.active .record-circle {
  animation: pulse-record 1.5s infinite;
}

.record-circle .q-icon {
  font-size: 28px;
}

.record-time {
  margin-top: 9px;
  color: #edf3fa;
  font-size: 20px;
  font-weight: 700;
}

.record-caption {
  color: #697e95;
  font-size: 8px;
}

.level-area {
  margin-top: 9px;
}

.level-heading {
  display: flex;
  justify-content: space-between;
  color: #647990;
  font-size: 7px;
}

.level-heading strong {
  color: #91a4b8;
}

.level-track {
  height: 5px;
  margin-top: 4px;
  overflow: hidden;
  background: #172636;
  border-radius: 999px;
}

.level-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #f472b6);
  border-radius: inherit;
  transition: width 80ms linear;
}

.record-actions {
  margin-top: 11px;
}

.record-button,
.stop-record-button {
  width: 100%;
  border-radius: 9px;
}

.record-button {
  color: white;
  background: #b83f78;
}

.stop-record-button {
  color: white;
  background: #9f3346;
}

.error-box {
  display: flex;
  gap: 7px;
  margin-top: 10px;
  padding: 9px;
  color: #fecdd3;
  background: rgb(251 113 133 / 7%);
  border: 1px solid rgb(251 113 133 / 16%);
  border-radius: 8px;
  font-size: 8px;
}

.audio-review {
  margin-top: 11px;
  padding: 10px;
  background: #101e2d;
  border: 1px solid #293d53;
  border-radius: 9px;
}

.audio-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.audio-title > .q-icon {
  color: #60a5fa;
  font-size: 18px;
}

.audio-title div {
  display: flex;
  flex-direction: column;
}

.audio-title strong {
  color: #dbe6f1;
  font-size: 9px;
}

.audio-title span {
  color: #667b92;
  font-size: 7px;
}

.audio-review audio {
  width: 100%;
  height: 34px;
  margin-top: 7px;
}

.analysis-panel {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.current-note-card {
  padding: 13px;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 10px;
}

.analysis-label {
  color: #61768e;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.11em;
}

.current-note {
  display: flex;
  min-height: 78px;
  align-items: baseline;
  justify-content: center;
  margin-top: 5px;
}

.current-note > strong {
  color: #f472b6;
  font-size: 31px;
}

.current-note > span {
  margin-left: 3px;
  color: #f9a8d4;
  font-size: 15px;
}

.current-note > small {
  margin-left: 8px;
  color: #71859c;
  font-size: 9px;
}

.current-note.waiting {
  align-items: center;
  flex-direction: column;
  gap: 4px;
  color: #61758d;
}

.current-note.waiting .q-icon {
  font-size: 26px;
}

.current-note.waiting span {
  margin: 0;
  color: #61758d;
  font-size: 8px;
}

.pitch-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.pitch-details > div,
.statistics > div {
  display: flex;
  flex-direction: column;
  padding: 7px 8px;
  background: #0c1723;
  border-radius: 7px;
}

.pitch-details span,
.statistics span {
  color: #5d7289;
  font-size: 6px;
  text-transform: uppercase;
}

.pitch-details strong,
.statistics strong {
  color: #bcc9d7;
  font-size: 9px;
}

.key-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  background: rgb(167 139 250 / 6%);
  border: 1px solid rgb(167 139 250 / 15%);
  border-radius: 9px;
}

.key-card > div {
  display: flex;
  flex-direction: column;
}

.key-card strong {
  margin-top: 2px;
  color: #ddd6fe;
  font-size: 13px;
}

.key-card small {
  margin-top: 1px;
  color: #746c8d;
  font-size: 7px;
}

.key-card > .q-icon {
  color: #a78bfa;
  font-size: 23px;
}

.statistics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.timeline-section {
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid #213247;
}

.timeline-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timeline-heading > div {
  display: flex;
  flex-direction: column;
}

.timeline-heading span {
  color: #cdd8e4;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.timeline-heading small {
  color: #62768d;
  font-size: 7px;
}

.clear-button {
  color: #a77883;
  font-size: 8px;
}

.melody-timeline {
  display: flex;
  gap: 5px;
  margin-top: 9px;
  padding: 9px;
  overflow-x: auto;
  background: #0a1521;
  border: 1px solid #213449;
  border-radius: 9px;
}

.timeline-note {
  display: flex;
  min-width: 66px;
  min-height: 64px;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  flex-direction: column;
  background: #122131;
  border: 1px solid #2b4056;
  border-radius: 8px;
}

.note-order {
  color: #52677e;
  font-size: 6px;
}

.timeline-note strong {
  color: #f0f4f9;
  font-size: 12px;
}

.note-octave {
  color: #f472b6;
  font-size: 8px;
}

.timeline-note small {
  margin-top: 2px;
  color: #5d7289;
  font-size: 6px;
}

.empty-timeline {
  display: flex;
  min-height: 86px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 9px;
  color: #53687f;
  border: 1px dashed #293d53;
  border-radius: 9px;
}

.empty-timeline > .q-icon {
  font-size: 24px;
}

.empty-timeline div {
  display: flex;
  flex-direction: column;
}

.empty-timeline strong {
  color: #73879c;
  font-size: 8px;
}

.empty-timeline span {
  font-size: 7px;
}

.capture-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 11px;
  padding: 11px 12px;
  background: rgb(52 211 153 / 5%);
  border: 1px solid rgb(52 211 153 / 15%);
  border-radius: 9px;
}

.result-copy {
  display: flex;
  gap: 8px;
}

.result-copy > .q-icon {
  flex: 0 0 auto;
  color: #34d399;
  font-size: 19px;
}

.result-copy strong {
  color: #a8d5c4;
  font-size: 8px;
}

.result-copy p {
  max-width: 600px;
  margin: 2px 0 0;
  color: #658579;
  font-size: 7px;
  line-height: 1.4;
}

.use-button {
  flex: 0 0 auto;
  color: white;
  background: #187c63;
  border-radius: 8px;
}

@keyframes pulse-record {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(244 114 182 / 16%);
  }

  50% {
    box-shadow: 0 0 0 10px rgb(244 114 182 / 0%);
  }
}

@media (max-width: 950px) {
  .capture-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .capture-heading,
  .capture-result {
    align-items: stretch;
    flex-direction: column;
  }

  .recording-state {
    align-self: flex-start;
  }

  .statistics {
    grid-template-columns: 1fr;
  }

  .use-button {
    width: 100%;
  }
}
</style>
