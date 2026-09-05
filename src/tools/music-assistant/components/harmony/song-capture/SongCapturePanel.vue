<template>
  <section class="capture-card">
    <header class="capture-heading">
      <div class="heading-copy">
        <span class="kicker"> CANTAR Y ANALIZAR </span>

        <h3>Captura la canción con tu voz</h3>

        <p>
          Mientras cantas, ICP Studio solo muestra una referencia rápida de lo que está escuchando.
          Las notas definitivas no se construyen en vivo. Al detener la grabación, el sistema
          analiza nuevamente el audio completo desde cero.
        </p>
      </div>

      <div
        class="recording-state"
        :class="{
          active: isRecording || isRefining,
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
            <q-icon :name="isRefining ? 'auto_fix_high' : isRecording ? 'mic' : 'mic_none'" />
          </div>

          <div class="record-time">
            {{ formattedRecordingTime }}
          </div>

          <div class="record-caption">
            {{
              isRefining
                ? 'Evaluando grabación completa'
                : isRecording
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
            :loading="isStarting || isRefining"
            :disable="isRefining"
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

        <div
          v-if="analysisMessage"
          class="analysis-message"
          :class="{
            success: analysisSucceeded,
          }"
        >
          <q-icon :name="analysisSucceeded ? 'verified' : 'auto_fix_high'" />

          <span>
            {{ analysisMessage }}
          </span>
        </div>

        <div v-if="audioUrl" class="audio-review">
          <div class="audio-title">
            <q-icon name="headphones" />

            <div>
              <strong>Audio original</strong>

              <span> Esta grabación completa es ahora la fuente oficial del análisis. </span>
            </div>
          </div>

          <audio :src="audioUrl" controls></audio>
        </div>
      </div>

      <div class="analysis-panel">
        <div class="current-note-card">
          <span class="analysis-label">
            {{ isRecording ? 'REFERENCIA EN VIVO' : 'ANÁLISIS DE LA GRABACIÓN' }}
          </span>

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
            <q-icon :name="isRefining ? 'auto_fix_high' : 'graphic_eq'" />

            <span>
              {{
                isRefining
                  ? 'Evaluando audio completo...'
                  : isRecording
                    ? 'Escuchando como referencia...'
                    : 'Sin señal'
              }}
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

          <div v-if="isRecording" class="live-reference-warning">
            <q-icon name="visibility" />

            <span>
              Esta lectura es solamente visual. No se utiliza para construir la melodía final.
            </span>
          </div>
        </div>

        <div class="key-card">
          <div>
            <span class="analysis-label"> TONALIDAD ESTIMADA </span>

            <strong>
              {{ estimatedKeyLabel }}
            </strong>

            <small> Se calcula únicamente después de analizar la grabación completa. </small>
          </div>

          <q-icon name="music_note" />
        </div>

        <div class="statistics">
          <div>
            <span>Notas finales</span>

            <strong>
              {{ capturedNotes.length }}
            </strong>
          </div>

          <div>
            <span>Frames de pitch</span>

            <strong>
              {{ capturedPitchFrames.length }}
            </strong>
          </div>

          <div>
            <span>Duración</span>

            <strong>
              {{ formattedRecordingTime }}
            </strong>
          </div>

          <div>
            <span>Confianza media</span>

            <strong>
              {{ averageConfidenceLabel }}
            </strong>
          </div>
        </div>
      </div>
    </div>

    <section class="analysis-workflow">
      <header>
        <div>
          <span>ANÁLISIS POST-GRABACIÓN</span>

          <strong> La interpretación se evalúa después de terminar </strong>
        </div>

        <q-icon name="analytics" />
      </header>

      <div class="analysis-workflow-grid">
        <div>
          <q-icon name="audio_file" />
          <span>1</span>
          <strong>Audio completo</strong>
          <small> Se decodifica la grabación original. </small>
        </div>

        <div>
          <q-icon name="graphic_eq" />
          <span>2</span>
          <strong>Trayectoria vocal</strong>
          <small> Se analiza el pitch frame por frame. </small>
        </div>

        <div>
          <q-icon name="record_voice_over" />
          <span>3</span>
          <strong>Estructura vocal</strong>
          <small> Se detectan voz, silencios, ataques y releases. </small>
        </div>

        <div>
          <q-icon name="music_note" />
          <span>4</span>
          <strong>Notas definitivas</strong>
          <small> Se construyen tiempos y duraciones finales. </small>
        </div>
      </div>
    </section>

    <section class="timeline-section">
      <header class="timeline-heading">
        <div>
          <span>MELODÍA DETECTADA</span>

          <small>
            Estas notas provienen exclusivamente del análisis realizado después de detener la
            grabación.
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
          :disable="isRecording || isRefining"
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
            {{ formatTimelineTime(note.startedAt) }}
            –
            {{ formatTimelineTime(note.endedAt) }}
          </small>

          <small class="duration">
            {{ formatDuration(note.durationMs) }}
          </small>

          <small v-if="note.confidence !== undefined" class="confidence">
            {{ Math.round(note.confidence * 100) }}%
          </small>
        </article>
      </div>

      <div v-else class="empty-timeline">
        <q-icon :name="isRefining ? 'auto_fix_high' : 'multiline_chart'" />

        <div>
          <strong>
            {{ isRefining ? 'Analizando la grabación' : 'La melodía aparecerá aquí' }}
          </strong>

          <span>
            {{
              isRefining
                ? 'ICP Studio está procesando el audio completo.'
                : 'Graba primero la interpretación completa.'
            }}
          </span>
        </div>
      </div>
    </section>

    <CapturedHarmonyPreview
      v-if="!isRecording && !isRefining && capturedNotes.length && estimatedKey"
      :root-note="estimatedKey.rootNote"
      :scale-mode="estimatedKey.scaleMode"
      :progression="progression"
      :captured-notes="capturedNotes"
      :audio-url="audioUrl"
    />

    <section v-if="hasCapture" class="capture-result">
      <div class="result-copy">
        <q-icon name="auto_awesome" />

        <div>
          <strong> Interpretación analizada </strong>

          <p>
            La grabación completa ya fue procesada por el análisis vocal maestro. Las notas,
            regiones vocales, silencios, ataques, releases, dinámica y trayectoria de pitch quedan
            disponibles para los próximos motores de armonización y voz.
          </p>
        </div>
      </div>

      <q-btn
        unelevated
        no-caps
        icon="playlist_add_check"
        label="Llevar al editor"
        class="use-button"
        :disable="!capturedNotes.length || !estimatedKey || isRefining"
        @click="useCapturedMelody"
      />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import CapturedHarmonyPreview from './CapturedHarmonyPreview.vue';

import {
  analyzeVocalRecording,
  type VocalAnalyzedNote,
  type VocalRecordingAnalysis,
} from './vocal-analysis-engine';

import {
  calculateInputLevel,
  detectPitch,
  frequencyToPitchInformation,
  notes,
} from '../../../shared/music';

import type {
  ChordStep,
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
  confidence?: number;
  cents?: number;
}

interface KeyEstimate {
  rootNote: number;
  scaleMode: ScaleMode;
  score: number;
}

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
}>();

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
const isRefining = ref(false);

const microphoneError = ref('');
const analysisMessage = ref('');
const analysisSucceeded = ref(false);

const recordingTimeMs = ref(0);
const inputLevel = ref(0);

const currentFrequency = ref(0);
const currentNoteIndex = ref(0);
const currentOctave = ref(0);
const currentCents = ref(0);

/*
 * Resultado musical simplificado utilizado por la interfaz
 * y por el editor de melodía.
 */
const capturedNotes = ref<CapturedPitchNote[]>([]);

/*
 * Resultado maestro de la grabación completa.
 *
 * Aquí conservamos la información detallada necesaria
 * para el futuro motor de armonización vocal:
 *
 * - notas enriquecidas,
 * - trayectoria continua de pitch,
 * - regiones voiced,
 * - regiones unvoiced,
 * - silencios,
 * - ataques,
 * - releases,
 * - dinámica,
 * - confianza global.
 */
const vocalAnalysis = ref<VocalRecordingAnalysis | null>(null);

const capturedPitchFrames = computed(() => vocalAnalysis.value?.pitchFrames ?? []);

const audioUrl = ref('');

let audioContext: AudioContext | null = null;
let microphoneStream: MediaStream | null = null;
let microphoneSource: MediaStreamAudioSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;
let analyserBuffer: Float32Array<ArrayBuffer> | null = null;

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

let animationFrameId: number | null = null;
let recordingTimer: ReturnType<typeof setInterval> | null = null;

let recordingStartedAt = 0;
let lastAnalysisAt = 0;

const analysisIntervalMs = 85;

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

  if (isRefining.value) {
    return 'Analizando grabación completa';
  }

  if (hasCapture.value) {
    return 'Análisis terminado';
  }

  return 'Preparado';
});

const formattedRecordingTime = computed(() => formatTime(recordingTimeMs.value));

const averageConfidence = computed(() => {
  if (vocalAnalysis.value) {
    return vocalAnalysis.value.averageConfidence;
  }

  const values = capturedNotes.value
    .map((note) => note.confidence)
    .filter((value): value is number => value !== undefined);

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
});

const averageConfidenceLabel = computed(() => {
  if (averageConfidence.value === null) {
    return '--';
  }

  return `${Math.round(averageConfidence.value * 100)}%`;
});

const estimatedKey = computed<KeyEstimate | null>(() => estimateKey(capturedNotes.value));

const estimatedKeyLabel = computed(() => {
  const estimate = estimatedKey.value;

  if (!estimate) {
    return isRefining.value ? 'Analizando...' : 'Esperando análisis';
  }

  return `${noteName(estimate.rootNote)} ${estimate.scaleMode === 'major' ? 'mayor' : 'menor'}`;
});

async function startRecording(): Promise<void> {
  microphoneError.value = '';
  analysisMessage.value = '';
  analysisSucceeded.value = false;
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

    mediaRecorder.addEventListener(
      'stop',
      () => {
        void buildRecordedAudio();
      },
      {
        once: true,
      },
    );

    recordingStartedAt = performance.now();
    recordingTimeMs.value = 0;
    lastAnalysisAt = 0;

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

  /*
   * No construimos notas al detener.
   *
   * Primero MediaRecorder debe completar el archivo.
   * El análisis definitivo comienza después.
   */
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

/**
 * Detector visual durante la grabación.
 *
 * Esta información NO forma parte de la melodía final.
 * Tampoco alimenta el renderer vocal.
 */
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
    } else {
      resetCurrentPitch();
    }
  }

  animationFrameId = requestAnimationFrame(analyseVoice);
}

function handleRecordedData(event: BlobEvent): void {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

async function buildRecordedAudio(): Promise<void> {
  if (!recordedChunks.length) {
    analysisMessage.value = 'La grabación no produjo audio suficiente para analizar.';

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

  await analyzeCompleteRecording(blob);
}

/**
 * Único punto donde se crea el resultado definitivo.
 *
 * Aquí el archivo completo se entrega al motor maestro.
 */
async function analyzeCompleteRecording(blob: Blob): Promise<void> {
  isRefining.value = true;
  analysisSucceeded.value = false;

  capturedNotes.value = [];
  vocalAnalysis.value = null;

  analysisMessage.value =
    'Evaluando grabación completa: pitch, notas, regiones vocales, silencios, ataques, releases y dinámica...';

  let context: AudioContext | null = null;

  try {
    context = new AudioContext();

    const arrayBuffer = await blob.arrayBuffer();

    const decoded = await context.decodeAudioData(arrayBuffer);

    /*
     * La duración oficial procede del audio real
     * y no del cronómetro visual.
     */
    recordingTimeMs.value = decoded.duration * 1000;

    /*
     * ANÁLISIS MAESTRO.
     *
     * A partir de este punto todo el procesamiento definitivo
     * se origina en vocal-analysis-engine.ts.
     */
    const analysis = analyzeVocalRecording(decoded);

    vocalAnalysis.value = analysis;

    capturedNotes.value = analysis.notes.map(mapAnalyzedNote);

    if (!analysis.notes.length) {
      analysisMessage.value =
        `El audio completo fue evaluado, pero no se encontraron notas vocales suficientemente confiables. ` +
        `Frames de pitch: ${analysis.pitchFrames.length}. ` +
        `Regiones vocales: ${analysis.voicedRegions.length}. ` +
        `Regiones sin pitch: ${analysis.unvoicedRegions.length}. ` +
        `Silencios: ${analysis.silenceRegions.length}.`;

      return;
    }

    analysisSucceeded.value = true;

    analysisMessage.value =
      `Evaluación terminada: ${analysis.notes.length} notas definitivas, ` +
      `${analysis.pitchFrames.length} frames de pitch, ` +
      `${analysis.voicedRegions.length} regiones vocales, ` +
      `${analysis.unvoicedRegions.length} regiones sin pitch, ` +
      `${analysis.silenceRegions.length} silencios, ` +
      `${analysis.attacks.length} ataques, ` +
      `${analysis.releases.length} releases y ` +
      `${Math.round(analysis.averageConfidence * 100)}% de confianza media.`;

    console.info('[ICP Studio][VocalAnalysis]', {
      durationMs: analysis.durationMs,
      sampleRate: analysis.sampleRate,
      notes: analysis.notes.length,
      pitchFrames: analysis.pitchFrames.length,
      voicedRegions: analysis.voicedRegions.length,
      unvoicedRegions: analysis.unvoicedRegions.length,
      silenceRegions: analysis.silenceRegions.length,
      attacks: analysis.attacks.length,
      releases: analysis.releases.length,
      dynamicPoints: analysis.dynamics.length,
      averageConfidence: analysis.averageConfidence,
    });
  } catch (error) {
    capturedNotes.value = [];
    vocalAnalysis.value = null;

    analysisMessage.value =
      error instanceof Error
        ? `No fue posible completar el análisis de la grabación: ${error.message}`
        : 'No fue posible completar el análisis de la grabación.';
  } finally {
    isRefining.value = false;

    if (context) {
      void context.close();
    }
  }
}

function mapAnalyzedNote(note: VocalAnalyzedNote): CapturedPitchNote {
  return {
    id: note.id,
    noteIndex: note.noteIndex,
    octave: note.octave,
    startedAt: note.startedAt,
    endedAt: note.endedAt,
    durationMs: note.durationMs,
    confidence: note.confidence,
    cents: note.cents,
  };
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
    id: note.id,
    noteIndex: note.noteIndex,
    octave: note.octave,
    beats: durationToBeats(note.durationMs),
  }));

  const phrase: MelodyPhrase = {
    id: makeId(),
    title: 'Melodía capturada',
    lyrics: '',
    chordStepId: props.progression[0]?.id ?? null,
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
    const confidence = note.confidence ?? 1;

    pitchWeights[note.noteIndex] =
      (pitchWeights[note.noteIndex] ?? 0) + Math.max(note.durationMs, 100) * confidence;
  });

  const majorPattern = [0, 2, 4, 5, 7, 9, 11];
  const minorPattern = [0, 2, 3, 5, 7, 8, 10];

  let best: KeyEstimate | null = null;

  for (let root = 0; root < 12; root += 1) {
    const modes = [
      {
        mode: 'major' as const,
        pattern: majorPattern,
      },
      {
        mode: 'minor' as const,
        pattern: minorPattern,
      },
    ];

    modes.forEach(({ mode, pattern }) => {
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
  if (isRecording.value || isRefining.value) {
    return;
  }

  capturedNotes.value = [];
  vocalAnalysis.value = null;

  recordingTimeMs.value = 0;
  inputLevel.value = 0;

  recordedChunks = [];

  analysisMessage.value = '';
  analysisSucceeded.value = false;

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
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatTimelineTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)} s`;
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
  max-width: 680px;
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

.microphone-display.active .record-circle {
  animation: pulse-record 1.5s infinite;
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

.error-box,
.analysis-message {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 9px;
  border-radius: 8px;
  font-size: 8px;
}

.error-box {
  color: #fecdd3;
  background: rgb(251 113 133 / 7%);
  border: 1px solid rgb(251 113 133 / 16%);
}

.analysis-message {
  color: #c4b5fd;
  background: rgb(167 139 250 / 6%);
  border: 1px solid rgb(167 139 250 / 17%);
}

.analysis-message.success {
  color: #a7f3d0;
  background: rgb(52 211 153 / 5%);
  border-color: rgb(52 211 153 / 17%);
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

.live-reference-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 8px;
  color: #7c8fa4;
  background: rgb(96 165 250 / 5%);
  border-radius: 7px;
  font-size: 7px;
}

.live-reference-warning .q-icon {
  color: #60a5fa;
  font-size: 14px;
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
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.analysis-workflow {
  margin-top: 13px;
  padding: 12px;
  background: rgb(96 165 250 / 4%);
  border: 1px solid rgb(96 165 250 / 14%);
  border-radius: 11px;
}

.analysis-workflow > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.analysis-workflow > header > div {
  display: flex;
  flex-direction: column;
}

.analysis-workflow > header span {
  color: #60a5fa;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.analysis-workflow > header strong {
  margin-top: 2px;
  color: #c8d8e8;
  font-size: 10px;
}

.analysis-workflow > header > .q-icon {
  color: #60a5fa;
  font-size: 22px;
}

.analysis-workflow-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
  margin-top: 9px;
}

.analysis-workflow-grid > div {
  position: relative;
  display: flex;
  min-height: 83px;
  flex-direction: column;
  padding: 9px;
  background: #0b1724;
  border: 1px solid #20364a;
  border-radius: 8px;
}

.analysis-workflow-grid .q-icon {
  color: #7ca8d7;
  font-size: 17px;
}

.analysis-workflow-grid > div > span {
  position: absolute;
  top: 7px;
  right: 8px;
  color: #405b75;
  font-size: 7px;
  font-weight: 700;
}

.analysis-workflow-grid strong {
  margin-top: 7px;
  color: #a9bdcf;
  font-size: 8px;
}

.analysis-workflow-grid small {
  margin-top: 2px;
  color: #5f758a;
  font-size: 6px;
  line-height: 1.4;
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
  min-width: 92px;
  min-height: 82px;
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

.timeline-note .duration {
  color: #8b9caf;
}

.timeline-note .confidence {
  color: #6ee7b7;
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
  max-width: 620px;
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

  .analysis-workflow-grid {
    grid-template-columns: repeat(2, 1fr);
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

  .statistics,
  .analysis-workflow-grid {
    grid-template-columns: 1fr;
  }

  .use-button {
    width: 100%;
  }
}
</style>
