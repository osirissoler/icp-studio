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
 * Notas musicales finales.
 *
 * Estas notas proceden exclusivamente del análisis
 * completo posterior a la grabación.
 */
const capturedNotes = ref<CapturedPitchNote[]>([]);

/*
 * Análisis maestro completo de la interpretación.
 *
 * Contiene:
 * - notas enriquecidas,
 * - trayectoria de pitch,
 * - regiones voiced,
 * - regiones unvoiced,
 * - silencios,
 * - ataques,
 * - releases,
 * - dinámica.
 */
const vocalAnalysis = ref<VocalRecordingAnalysis | null>(null);

const capturedPitchFrames = computed(() => {
  return vocalAnalysis.value?.pitchFrames ?? [];
});

const voicedRegionsCount = computed(() => {
  return vocalAnalysis.value?.voicedRegions.length ?? 0;
});

const unvoicedRegionsCount = computed(() => {
  return vocalAnalysis.value?.unvoicedRegions.length ?? 0;
});

const silenceRegionsCount = computed(() => {
  return vocalAnalysis.value?.silenceRegions.length ?? 0;
});

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
   * No se construyen notas al detener.
   *
   * MediaRecorder primero debe entregar el archivo completo.
   * Después comienza el análisis maestro.
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
 * Referencia visual durante la grabación.
 *
 * Este detector NO genera:
 * - notas definitivas,
 * - regiones vocales,
 * - armonías,
 * - datos para síntesis.
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
 * Único punto donde se crea el análisis definitivo.
 *
 * La grabación completa se decodifica y se entrega a
 * vocal-analysis-engine.ts.
 *
 * Ningún resultado del detector en vivo entra aquí.
 */
async function analyzeCompleteRecording(blob: Blob): Promise<void> {
  isRefining.value = true;

  analysisSucceeded.value = false;

  capturedNotes.value = [];

  vocalAnalysis.value = null;

  analysisMessage.value =
    'Evaluando audio completo: pitch, notas, regiones vocales, silencios, ataques, releases y dinámica...';

  let context: AudioContext | null = null;

  try {
    context = new AudioContext();

    const arrayBuffer = await blob.arrayBuffer();

    const decoded = await context.decodeAudioData(arrayBuffer);

    /*
     * La duración oficial procede del AudioBuffer completo.
     */
    recordingTimeMs.value = decoded.duration * 1000;

    /*
     * NUEVA ARQUITECTURA:
     *
     * Todo el análisis definitivo pasa por un único motor.
     */
    const analysis = analyzeVocalRecording(decoded);

    vocalAnalysis.value = analysis;

    capturedNotes.value = analysis.notes.map(mapAnalyzedNote);

    if (!analysis.notes.length) {
      analysisMessage.value =
        `El audio completo fue evaluado, pero no se encontraron notas vocales suficientemente confiables. ` +
        `Se analizaron ${analysis.pitchFrames.length} frames de pitch, ` +
        `${analysis.voicedRegions.length} regiones vocales, ` +
        `${analysis.unvoicedRegions.length} regiones sin pitch y ` +
        `${analysis.silenceRegions.length} silencios.`;

      return;
    }

    analysisSucceeded.value = true;

    analysisMessage.value =
      `Evaluación completa terminada: ${analysis.notes.length} notas, ` +
      `${analysis.pitchFrames.length} frames de pitch, ` +
      `${analysis.voicedRegions.length} regiones vocales, ` +
      `${analysis.unvoicedRegions.length} regiones sin pitch, ` +
      `${analysis.silenceRegions.length} silencios, ` +
      `${analysis.attacks.length} ataques y ` +
      `${analysis.releases.length} releases. ` +
      `Confianza media: ${Math.round(analysis.averageConfidence * 100)}%.`;

    /*
     * Información temporal de diagnóstico.
     *
     * Nos permitirá revisar la calidad real del análisis
     * antes de volver a construir el renderer vocal.
     */
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
        ? `No fue posible completar el análisis vocal: ${error.message}`
        : 'No fue posible completar el análisis vocal.';
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

/*
 * Se mantienen referenciados para que podamos incorporarlos
 * en la interfaz en el próximo bloque sin perder el análisis.
 */
void voicedRegionsCount.value;
void unvoicedRegionsCount.value;
void silenceRegionsCount.value;

onBeforeUnmount(() => {
  stopResources();

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
});
</script>
