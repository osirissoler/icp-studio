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
          :class="{ active: activeMode === mode.id }"
          @click="selectMode(mode.id)"
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
            <strong>{{ mode.label }}</strong>
            <small>{{ mode.description }}</small>
          </span>

          <q-icon name="chevron_right" class="mode-arrow" />
        </button>
      </div>

      <!-- NOTA DE REFERENCIA -->
      <section v-if="activeMode === 'reference'" class="workspace">
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
              Si van a comenzar una alabanza y necesitan una referencia en Sol, selecciona
              <b>Sol</b>, escucha la nota y el grupo puede tomarla como punto de partida.
            </p>
          </div>
        </div>
      </section>

      <!-- DETECTOR DE NOTA -->
      <section v-else-if="activeMode === 'detect'" class="workspace detector-workspace">
        <div class="workspace-heading">
          <div>
            <span class="section-kicker detector-kicker">DETECCIÓN POR MICRÓFONO</span>
            <h2>Canta una nota y deja que ICP Studio la encuentre</h2>
            <p>
              Mantén una vocal como “aaa” durante un momento. El sistema analizará la frecuencia y
              buscará la nota musical más cercana.
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
            <span>{{ microphoneStatusText }}</span>
          </div>
        </div>

        <div class="detector-layout">
          <div class="detector-main">
            <div class="detected-note-card">
              <div class="listen-rings" :class="{ listening: isListening && hasDetectedPitch }">
                <div class="listen-ring ring-1"></div>
                <div class="listen-ring ring-2"></div>
                <div class="listen-ring ring-3"></div>

                <div class="detected-note-circle">
                  <template v-if="hasDetectedPitch">
                    <span class="detected-note">{{ detectedNoteLabel }}</span>
                    <strong>{{ detectedOctave }}</strong>
                    <small>{{ detectedInternational }}{{ detectedOctave }}</small>
                  </template>

                  <template v-else>
                    <q-icon name="mic" />
                    <span class="waiting-text">
                      {{ isListening ? 'Canta...' : 'Micrófono' }}
                    </span>
                  </template>
                </div>
              </div>

              <div class="detected-frequency">
                <span>Frecuencia detectada</span>

                <strong v-if="hasDetectedPitch">
                  {{ detectedFrequency.toFixed(2) }}
                  <small>Hz</small>
                </strong>

                <strong v-else>
                  --
                  <small>Hz</small>
                </strong>
              </div>

              <div class="detector-actions">
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
                  class="stop-listen-button"
                  @click="stopPitchDetection"
                />
              </div>
            </div>

            <div v-if="microphoneError" class="microphone-error">
              <q-icon name="error_outline" />

              <div>
                <strong>No pudimos utilizar el micrófono</strong>
                <p>{{ microphoneError }}</p>
              </div>
            </div>

            <div v-else class="microphone-help">
              <q-icon name="info_outline" />

              <div>
                <strong>Para obtener una lectura más estable</strong>
                <p>
                  Canta una sola nota, sin palabras, manteniendo una vocal durante aproximadamente
                  uno o dos segundos. Evita hablar mientras se está detectando.
                </p>
              </div>
            </div>
          </div>

          <div class="pitch-panel">
            <div class="pitch-header">
              <div>
                <span>Afinación</span>
                <strong>{{ tuningStateText }}</strong>
              </div>

              <div class="cents-value" :class="tuningClass">
                <template v-if="hasDetectedPitch">
                  {{ formattedCents }}
                </template>

                <template v-else>--</template>

                <small>cents</small>
              </div>
            </div>

            <div class="tuner-scale">
              <div class="scale-labels">
                <span>-50</span>
                <span>-25</span>
                <span>0</span>
                <span>+25</span>
                <span>+50</span>
              </div>

              <div class="scale-track">
                <span class="scale-mark mark-0"></span>
                <span class="scale-mark mark-25-left"></span>
                <span class="scale-mark mark-center"></span>
                <span class="scale-mark mark-25-right"></span>
                <span class="scale-mark mark-50"></span>

                <div class="center-zone"></div>

                <div
                  v-if="hasDetectedPitch"
                  class="pitch-needle"
                  :class="tuningClass"
                  :style="{ left: `${needlePosition}%` }"
                >
                  <span></span>
                </div>
              </div>

              <div class="tuning-description">
                <q-icon :name="tuningIcon" :class="tuningClass" />

                <span>{{ tuningDescription }}</span>
              </div>
            </div>

            <div class="pitch-details">
              <div class="pitch-detail">
                <span>Nota</span>
                <strong>
                  {{ hasDetectedPitch ? `${detectedNoteLabel}${detectedOctave}` : '--' }}
                </strong>
              </div>

              <div class="pitch-detail">
                <span>Sistema internacional</span>
                <strong>
                  {{ hasDetectedPitch ? `${detectedInternational}${detectedOctave}` : '--' }}
                </strong>
              </div>

              <div class="pitch-detail">
                <span>Nota exacta</span>
                <strong>
                  {{ hasDetectedPitch ? `${detectedTargetFrequency.toFixed(2)} Hz` : '--' }}
                </strong>
              </div>

              <div class="pitch-detail">
                <span>Nivel de entrada</span>
                <strong>{{ Math.round(inputLevel * 100) }}%</strong>
              </div>
            </div>

            <q-btn
              unelevated
              no-caps
              icon="graphic_eq"
              label="Usar como nota de referencia"
              class="use-reference-button"
              :disable="!hasDetectedPitch"
              @click="useDetectedAsReference"
            />
          </div>
        </div>
      </section>

      <!-- MODOS PENDIENTES -->
      <section v-else class="workspace upcoming-workspace">
        <div class="upcoming-icon">
          <q-icon :name="activeModeData.icon" />
        </div>

        <span class="section-kicker">SIGUIENTE ETAPA</span>
        <h2>{{ activeModeData.label }}</h2>
        <p>{{ activeModeData.longDescription }}</p>

        <div class="planned-features">
          <div v-for="feature in activeModeData.features" :key="feature" class="planned-feature">
            <q-icon name="check_circle_outline" />
            <span>{{ feature }}</span>
          </div>
        </div>

        <q-chip
          outline
          color="blue-grey-5"
          text-color="blue-grey-3"
          icon="construction"
          class="development-chip"
        >
          Preparado para desarrollar
        </q-chip>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';

type MusicalMode = 'reference' | 'detect' | 'harmony' | 'piano' | 'guitar' | 'tuner';

interface ModeDefinition {
  id: MusicalMode;
  label: string;
  icon: string;
  color: string;
  description: string;
  longDescription: string;
  features: string[];
}

interface NoteDefinition {
  value: number;
  label: string;
  international: string;
}

interface PitchInformation {
  frequency: number;
  midi: number;
  noteIndex: number;
  octave: number;
  cents: number;
  targetFrequency: number;
}

const router = useRouter();

const modes: ModeDefinition[] = [
  {
    id: 'reference',
    label: 'Nota de referencia',
    icon: 'graphic_eq',
    color: '#f472b6',
    description: 'Escucha una nota para comenzar.',
    longDescription: '',
    features: [],
  },
  {
    id: 'detect',
    label: 'Detectar mi nota',
    icon: 'mic',
    color: '#60a5fa',
    description: 'Canta y descubre qué nota estás dando.',
    longDescription: '',
    features: [],
  },
  {
    id: 'harmony',
    label: 'Voces y armonía',
    icon: 'groups',
    color: '#a78bfa',
    description: 'Busca referencias para distintas voces.',
    longDescription:
      'Partiendo de una nota o tonalidad podremos preparar referencias para voz principal, segunda voz, tenor, barítono y bajo.',
    features: [
      'Elegir nota principal',
      'Generar referencias de otras voces',
      'Escuchar cada voz por separado',
      'Escuchar varias voces juntas',
      'Guardar configuraciones para reutilizarlas',
    ],
  },
  {
    id: 'piano',
    label: 'Piano',
    icon: 'piano',
    color: '#34d399',
    description: 'Teclado visual de referencia.',
    longDescription:
      'Tendremos un piano virtual para buscar notas, visualizar escalas y comprender dónde se encuentran las referencias musicales.',
    features: [
      'Teclado virtual interactivo',
      'Reproducción de cada tecla',
      'Resaltar notas seleccionadas',
      'Mostrar escalas y acordes',
      'Conectar notas con el asistente de voces',
    ],
  },
  {
    id: 'guitar',
    label: 'Guitarra',
    icon: 'music_note',
    color: '#fbbf24',
    description: 'Encuentra notas sobre el diapasón.',
    longDescription:
      'La guitarra de referencia mostrará visualmente dónde se encuentra cada nota y cómo se relaciona con tonalidades y acordes.',
    features: [
      'Diapasón visual',
      'Mostrar ubicación de una nota',
      'Mostrar varias posiciones de la misma nota',
      'Visualizar acordes',
      'Relacionar guitarra y piano',
    ],
  },
  {
    id: 'tuner',
    label: 'Afinador',
    icon: 'tune',
    color: '#fb7185',
    description: 'Comprueba afinación en tiempo real.',
    longDescription:
      'El afinador utilizará el micrófono para indicar qué tan cerca estás de la nota correcta mientras cantas.',
    features: [
      'Afinación mediante micrófono',
      'Medidor visual de desviación',
      'Nombre de nota en tiempo real',
      'Frecuencia detectada',
      'Referencia sonora de la nota objetivo',
    ],
  },
];

const notes: NoteDefinition[] = [
  { value: 0, label: 'Do', international: 'C' },
  { value: 1, label: 'Do♯', international: 'C♯' },
  { value: 2, label: 'Re', international: 'D' },
  { value: 3, label: 'Re♯', international: 'D♯' },
  { value: 4, label: 'Mi', international: 'E' },
  { value: 5, label: 'Fa', international: 'F' },
  { value: 6, label: 'Fa♯', international: 'F♯' },
  { value: 7, label: 'Sol', international: 'G' },
  { value: 8, label: 'Sol♯', international: 'G♯' },
  { value: 9, label: 'La', international: 'A' },
  { value: 10, label: 'La♯', international: 'A♯' },
  { value: 11, label: 'Si', international: 'B' },
];

const octaves = [2, 3, 4, 5];

const durations = [
  { label: '1 s', value: 1000 },
  { label: '2 s', value: 2000 },
  { label: '3 s', value: 3000 },
  { label: '5 s', value: 5000 },
];

const activeMode = ref<MusicalMode>('reference');

const selectedNote = ref(0);
const selectedOctave = ref(4);
const toneDuration = ref(2000);
const isPlaying = ref(false);

const isStartingMicrophone = ref(false);
const isListening = ref(false);
const microphoneError = ref('');

const detectedFrequency = ref(0);
const detectedMidi = ref(0);
const detectedNoteIndex = ref(0);
const detectedOctave = ref(0);
const detectedCents = ref(0);
const detectedTargetFrequency = ref(0);
const inputLevel = ref(0);

let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

let microphoneStream: MediaStream | null = null;
let microphoneSource: MediaStreamAudioSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;
let animationFrameId: number | null = null;
let pitchBuffer: Float32Array<ArrayBuffer> | null = null;

const activeModeData = computed(
  () => modes.find((mode) => mode.id === activeMode.value) ?? modes[0]!,
);

const selectedNoteLabel = computed(
  () => notes.find((note) => note.value === selectedNote.value)?.label ?? 'Do',
);

const selectedFrequency = computed(() => {
  const midiNumber = (selectedOctave.value + 1) * 12 + selectedNote.value;
  return midiToFrequency(midiNumber);
});

const hasDetectedPitch = computed(() => detectedFrequency.value > 0);

const detectedNoteLabel = computed(
  () => notes.find((note) => note.value === detectedNoteIndex.value)?.label ?? '--',
);

const detectedInternational = computed(
  () => notes.find((note) => note.value === detectedNoteIndex.value)?.international ?? '--',
);

const formattedCents = computed(() => {
  const rounded = Math.round(detectedCents.value);

  if (rounded > 0) {
    return `+${rounded}`;
  }

  return `${rounded}`;
});

const needlePosition = computed(() => {
  const cents = Math.max(-50, Math.min(50, detectedCents.value));
  return cents + 50;
});

const tuningClass = computed(() => {
  if (!hasDetectedPitch.value) {
    return '';
  }

  const cents = detectedCents.value;

  if (Math.abs(cents) <= 5) {
    return 'in-tune';
  }

  if (cents < 0) {
    return 'flat';
  }

  return 'sharp';
});

const tuningStateText = computed(() => {
  if (!hasDetectedPitch.value) {
    return 'Esperando una nota';
  }

  if (Math.abs(detectedCents.value) <= 5) {
    return 'Afinado';
  }

  if (detectedCents.value < 0) {
    return 'Un poco bajo';
  }

  return 'Un poco alto';
});

const tuningDescription = computed(() => {
  if (!hasDetectedPitch.value) {
    return 'Canta una nota para comenzar a medir.';
  }

  const cents = Math.round(Math.abs(detectedCents.value));

  if (cents <= 5) {
    return 'Estás muy cerca del centro de la nota.';
  }

  if (detectedCents.value < 0) {
    return `Sube ligeramente la voz. Estás aproximadamente ${cents} cents por debajo.`;
  }

  return `Baja ligeramente la voz. Estás aproximadamente ${cents} cents por encima.`;
});

const tuningIcon = computed(() => {
  if (!hasDetectedPitch.value) {
    return 'graphic_eq';
  }

  if (Math.abs(detectedCents.value) <= 5) {
    return 'check_circle';
  }

  if (detectedCents.value < 0) {
    return 'arrow_upward';
  }

  return 'arrow_downward';
});

const microphoneStatusText = computed(() => {
  if (microphoneError.value) {
    return 'Micrófono no disponible';
  }

  if (isStartingMicrophone.value) {
    return 'Solicitando micrófono';
  }

  if (isListening.value) {
    return 'Escuchando';
  }

  return 'Micrófono detenido';
});

function goBack(): void {
  stopPitchDetection();
  stopTone();
  void router.push('/herramientas');
}

function selectMode(mode: MusicalMode): void {
  if (activeMode.value === 'detect' && mode !== 'detect') {
    stopPitchDetection();
  }

  if (activeMode.value === 'reference' && mode !== 'reference') {
    stopTone();
  }

  activeMode.value = mode;
}

function selectNote(note: number): void {
  selectedNote.value = note;

  if (isPlaying.value) {
    restartTone();
  }
}

function selectOctave(octave: number): void {
  selectedOctave.value = octave;

  if (isPlaying.value) {
    restartTone();
  }
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
  nextGain.gain.setValueAtTime(0.32, context.currentTime + 0.05);

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
      // El oscilador puede haber terminado previamente.
    }
  }

  oscillator = null;
  gainNode = null;
  isPlaying.value = false;
}

async function startPitchDetection(): Promise<void> {
  microphoneError.value = '';
  isStartingMicrophone.value = true;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este dispositivo no permite acceder al micrófono desde ICP Studio.');
    }

    stopTone();
    stopPitchDetection();

    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
      },
      video: false,
    });

    const context = ensureAudioContext();

    if (context.state === 'suspended') {
      await context.resume();
    }

    microphoneSource = context.createMediaStreamSource(microphoneStream);

    analyserNode = context.createAnalyser();
    analyserNode.fftSize = 4096;
    analyserNode.smoothingTimeConstant = 0;

    microphoneSource.connect(analyserNode);

    pitchBuffer = new Float32Array(analyserNode.fftSize);

    isListening.value = true;
    isStartingMicrophone.value = false;

    analysePitch();
  } catch (error) {
    stopPitchDetection();

    isStartingMicrophone.value = false;

    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        microphoneError.value =
          'ICP Studio no tiene permiso para utilizar el micrófono. Autoriza el acceso al micrófono en el sistema y vuelve a intentarlo.';
        return;
      }

      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        microphoneError.value = 'No encontramos ningún micrófono disponible en esta computadora.';
        return;
      }
    }

    microphoneError.value =
      error instanceof Error
        ? error.message
        : 'Ocurrió un problema al intentar utilizar el micrófono.';
  }
}

function stopPitchDetection(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (microphoneSource) {
    try {
      microphoneSource.disconnect();
    } catch {
      // Puede estar desconectado.
    }

    microphoneSource = null;
  }

  if (analyserNode) {
    try {
      analyserNode.disconnect();
    } catch {
      // Puede estar desconectado.
    }

    analyserNode = null;
  }

  if (microphoneStream) {
    microphoneStream.getTracks().forEach((track) => {
      track.stop();
    });

    microphoneStream = null;
  }

  pitchBuffer = null;

  isListening.value = false;
  isStartingMicrophone.value = false;

  resetDetectedPitch();
}

function analysePitch(): void {
  if (!isListening.value || !analyserNode || !audioContext || !pitchBuffer) {
    return;
  }

  analyserNode.getFloatTimeDomainData(pitchBuffer);

  inputLevel.value = calculateInputLevel(pitchBuffer);

  const frequency = detectPitch(pitchBuffer, audioContext.sampleRate);

  if (frequency > 0) {
    const pitch = frequencyToPitchInformation(frequency);

    detectedFrequency.value = pitch.frequency;
    detectedMidi.value = pitch.midi;
    detectedNoteIndex.value = pitch.noteIndex;
    detectedOctave.value = pitch.octave;
    detectedCents.value = pitch.cents;
    detectedTargetFrequency.value = pitch.targetFrequency;
  } else {
    resetDetectedPitch();
  }

  animationFrameId = requestAnimationFrame(analysePitch);
}

function calculateInputLevel(buffer: Float32Array<ArrayBuffer>): number {
  let sum = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    const sample = buffer[index] ?? 0;
    sum += sample * sample;
  }

  const rms = Math.sqrt(sum / buffer.length);

  return Math.min(1, rms * 8);
}

function detectPitch(buffer: Float32Array<ArrayBuffer>, sampleRate: number): number {
  const size = buffer.length;

  let rms = 0;

  for (let index = 0; index < size; index += 1) {
    const sample = buffer[index] ?? 0;
    rms += sample * sample;
  }

  rms = Math.sqrt(rms / size);

  if (rms < 0.01) {
    return -1;
  }

  let start = 0;
  let end = size - 1;

  const threshold = 0.2;

  for (let index = 0; index < size / 2; index += 1) {
    if (Math.abs(buffer[index] ?? 0) < threshold) {
      start = index;
      break;
    }
  }

  for (let index = 1; index < size / 2; index += 1) {
    const candidate = size - index;

    if (Math.abs(buffer[candidate] ?? 0) < threshold) {
      end = candidate;
      break;
    }
  }

  const trimmed = buffer.slice(start, end);
  const trimmedSize = trimmed.length;

  if (trimmedSize < 2) {
    return -1;
  }

  const correlations = new Float32Array(trimmedSize);

  for (let lag = 0; lag < trimmedSize; lag += 1) {
    let correlation = 0;

    for (let index = 0; index < trimmedSize - lag; index += 1) {
      correlation += (trimmed[index] ?? 0) * (trimmed[index + lag] ?? 0);
    }

    correlations[lag] = correlation;
  }

  let dip = 0;

  while (dip + 1 < correlations.length && (correlations[dip] ?? 0) > (correlations[dip + 1] ?? 0)) {
    dip += 1;
  }

  let maxValue = -1;
  let maxIndex = -1;

  for (let index = dip; index < correlations.length; index += 1) {
    const value = correlations[index] ?? 0;

    if (value > maxValue) {
      maxValue = value;
      maxIndex = index;
    }
  }

  if (maxIndex <= 0) {
    return -1;
  }

  let period = maxIndex;

  const left = correlations[maxIndex - 1] ?? 0;
  const center = correlations[maxIndex] ?? 0;
  const right = correlations[maxIndex + 1] ?? 0;

  const denominator = 2 * (2 * center - left - right);

  if (denominator !== 0) {
    period += (right - left) / denominator;
  }

  const frequency = sampleRate / period;

  if (!Number.isFinite(frequency)) {
    return -1;
  }

  if (frequency < 60 || frequency > 1200) {
    return -1;
  }

  return frequency;
}

function frequencyToPitchInformation(frequency: number): PitchInformation {
  const exactMidi = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(exactMidi);

  const targetFrequency = midiToFrequency(midi);
  const cents = 1200 * Math.log2(frequency / targetFrequency);

  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;

  return {
    frequency,
    midi,
    noteIndex,
    octave,
    cents,
    targetFrequency,
  };
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function resetDetectedPitch(): void {
  detectedFrequency.value = 0;
  detectedMidi.value = 0;
  detectedNoteIndex.value = 0;
  detectedOctave.value = 0;
  detectedCents.value = 0;
  detectedTargetFrequency.value = 0;

  if (!isListening.value) {
    inputLevel.value = 0;
  }
}

function useDetectedAsReference(): void {
  if (!hasDetectedPitch.value) {
    return;
  }

  selectedNote.value = detectedNoteIndex.value;

  const octave = Math.max(2, Math.min(5, detectedOctave.value));
  selectedOctave.value = octave;

  stopPitchDetection();
  activeMode.value = 'reference';
}

onBeforeUnmount(() => {
  stopPitchDetection();
  stopTone();

  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
});
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
  min-width: 0;
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

.eyebrow,
.section-kicker {
  color: #f472b6;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.detector-kicker {
  color: #60a5fa;
}

.music-header h1 {
  margin: 3px 0 4px;
  color: #f4f7fb;
  font-size: 23px;
  font-weight: 720;
  line-height: 1.15;
}

.music-header p,
.workspace-heading p,
.upcoming-workspace > p {
  max-width: 720px;
  margin: 0;
  color: #8493a8;
  font-size: 12px;
  line-height: 1.55;
}

.back-button {
  flex: 0 0 auto;
  color: #9baabd;
  border: 1px solid #29394c;
  border-radius: 11px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
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
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    transform 150ms ease;
}

.mode-card:hover {
  background: #112033;
  border-color: #38506b;
  transform: translateY(-2px);
}

.mode-card.active {
  background: #151b2b;
  border-color: rgb(244 114 182 / 55%);
  box-shadow: inset 0 0 0 1px rgb(244 114 182 / 8%);
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

.mode-icon .q-icon {
  font-size: 21px;
}

.mode-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.mode-info strong {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mode-info small {
  display: -webkit-box;
  overflow: hidden;
  color: #6f8095;
  font-size: 9px;
  line-height: 1.3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.mode-arrow {
  flex: 0 0 auto;
  color: #4b5c71;
  font-size: 17px;
}

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

.workspace-heading h2,
.upcoming-workspace h2 {
  margin: 4px 0 5px;
  color: #edf3fa;
  font-size: 19px;
  font-weight: 700;
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
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.note-button,
.octave-button,
.duration-button {
  color: #becbda;
  background: #101d2b;
  border: 1px solid #293d53;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease,
    transform 120ms ease;
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

.note-button strong {
  font-size: 12px;
}

.note-button span {
  color: #6f829a;
  font-size: 9px;
}

.note-button:hover,
.octave-button:hover,
.duration-button:hover {
  border-color: #54718f;
  transform: translateY(-1px);
}

.note-button.active,
.octave-button.active,
.duration-button.active {
  color: #fff;
  background: rgb(244 114 182 / 13%);
  border-color: rgb(244 114 182 / 58%);
}

.note-button.active span {
  color: #f9a8d4;
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
  font-size: 12px;
  font-weight: 700;
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
  margin: 2px 0 12px;
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
  opacity: 0.45;
}

.tone-core {
  z-index: 1;
  display: flex;
  width: 104px;
  height: 104px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #fff;
  background: radial-gradient(circle at 35% 30%, rgb(244 114 182 / 32%), transparent 50%), #162234;
  border: 1px solid rgb(244 114 182 / 40%);
  border-radius: 50%;
  box-shadow: 0 12px 32px rgb(0 0 0 / 28%);
}

.tone-name {
  font-size: 24px;
  font-weight: 760;
}

.tone-core strong {
  color: #f9a8d4;
  font-size: 12px;
}

.tone-visual.playing .tone-ring-one {
  animation: pulse-ring 1s ease-out infinite;
}

.tone-visual.playing .tone-ring-two {
  animation: pulse-ring 1s 0.25s ease-out infinite;
}

.tone-data {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 2px;
}

.tone-data span {
  color: #71839a;
  font-size: 9px;
  text-transform: uppercase;
}

.tone-data strong {
  color: #edf3f9;
  font-size: 17px;
}

.tone-data small {
  color: #f472b6;
  font-size: 10px;
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
  color: #fff;
  background: #db4f91;
}

.stop-button {
  color: #a9b8c9;
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
  padding: 0 7px;
  border-radius: 8px;
  font-size: 9px;
}

.reference-help,
.microphone-help,
.microphone-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 17px;
  padding: 13px 15px;
  border-radius: 12px;
}

.reference-help {
  color: #9db0c4;
  background: rgb(96 165 250 / 6%);
  border: 1px solid rgb(96 165 250 / 18%);
}

.reference-help > .q-icon {
  margin-top: 1px;
  color: #60a5fa;
  font-size: 19px;
}

.reference-help strong,
.microphone-help strong,
.microphone-error strong {
  color: #c9d7e6;
  font-size: 11px;
}

.reference-help p,
.microphone-help p,
.microphone-error p {
  margin: 2px 0 0;
  color: #73869b;
  font-size: 10px;
  line-height: 1.5;
}

.microphone-state {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: #8292a7;
  background: #101b29;
  border: 1px solid #27394e;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 650;
}

.state-dot {
  width: 7px;
  height: 7px;
  background: #66768a;
  border-radius: 50%;
}

.microphone-state.active {
  color: #93c5fd;
  border-color: rgb(96 165 250 / 40%);
}

.microphone-state.active .state-dot {
  background: #60a5fa;
  box-shadow: 0 0 0 4px rgb(96 165 250 / 12%);
  animation: status-pulse 1.4s ease-in-out infinite;
}

.microphone-state.error {
  color: #fda4af;
  border-color: rgb(251 113 133 / 40%);
}

.microphone-state.error .state-dot {
  background: #fb7185;
}

.detector-layout {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
  gap: 18px;
  padding-top: 18px;
}

.detector-main,
.pitch-panel {
  min-width: 0;
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

.listen-rings {
  position: relative;
  display: grid;
  width: 210px;
  height: 210px;
  place-items: center;
}

.listen-ring {
  position: absolute;
  border: 1px solid rgb(96 165 250 / 16%);
  border-radius: 50%;
}

.ring-1 {
  inset: 36px;
}

.ring-2 {
  inset: 18px;
}

.ring-3 {
  inset: 0;
}

.listen-rings.listening .ring-1 {
  animation: listen-pulse 1.5s ease-out infinite;
}

.listen-rings.listening .ring-2 {
  animation: listen-pulse 1.5s 0.3s ease-out infinite;
}

.listen-rings.listening .ring-3 {
  animation: listen-pulse 1.5s 0.6s ease-out infinite;
}

.detected-note-circle {
  z-index: 1;
  display: flex;
  width: 132px;
  height: 132px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: radial-gradient(circle at 35% 25%, rgb(96 165 250 / 25%), transparent 50%), #152235;
  border: 1px solid rgb(96 165 250 / 38%);
  border-radius: 50%;
  box-shadow: 0 18px 38px rgb(0 0 0 / 30%);
}

.detected-note {
  color: #fff;
  font-size: 31px;
  font-weight: 780;
  line-height: 1;
}

.detected-note-circle > strong {
  margin-top: 2px;
  color: #93c5fd;
  font-size: 16px;
}

.detected-note-circle > small {
  margin-top: 4px;
  color: #637d9c;
  font-size: 10px;
}

.detected-note-circle > .q-icon {
  color: #60a5fa;
  font-size: 34px;
}

.waiting-text {
  margin-top: 8px;
  color: #8294aa;
  font-size: 10px;
  font-weight: 650;
}

.detected-frequency {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 4px;
  margin-top: 3px;
}

.detected-frequency > span {
  color: #71839a;
  font-size: 9px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.detected-frequency > strong {
  color: #e8f1fb;
  font-size: 23px;
  font-weight: 700;
}

.detected-frequency > strong small {
  color: #6f849d;
  font-size: 11px;
  font-weight: 500;
}

.detector-actions {
  width: 100%;
  margin-top: 20px;
}

.listen-button,
.stop-listen-button {
  width: 100%;
  min-height: 42px;
  border-radius: 11px;
}

.listen-button {
  color: #fff;
  background: #367fd3;
}

.stop-listen-button {
  color: #9fc9f6;
}

.microphone-help {
  color: #9db0c4;
  background: rgb(96 165 250 / 5%);
  border: 1px solid rgb(96 165 250 / 15%);
}

.microphone-help > .q-icon {
  margin-top: 1px;
  color: #60a5fa;
  font-size: 19px;
}

.microphone-error {
  background: rgb(251 113 133 / 7%);
  border: 1px solid rgb(251 113 133 / 22%);
}

.microphone-error > .q-icon {
  margin-top: 1px;
  color: #fb7185;
  font-size: 19px;
}

.microphone-error strong {
  color: #fecdd3;
}

.microphone-error p {
  color: #d9959f;
}

.pitch-panel {
  display: flex;
  flex-direction: column;
}

.pitch-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.pitch-header > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pitch-header span {
  color: #73859a;
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pitch-header strong {
  color: #e4edf7;
  font-size: 16px;
}

.cents-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #8495a9;
  font-size: 21px;
  font-weight: 720;
}

.cents-value small {
  font-size: 9px;
  font-weight: 500;
}

.cents-value.in-tune {
  color: #34d399;
}

.cents-value.flat,
.cents-value.sharp {
  color: #fbbf24;
}

.tuner-scale {
  margin-top: 30px;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
  color: #53657a;
  font-size: 8px;
}

.scale-track {
  position: relative;
  height: 56px;
  background:
    linear-gradient(
      90deg,
      rgb(251 191 36 / 5%),
      rgb(52 211 153 / 8%) 45%,
      rgb(52 211 153 / 8%) 55%,
      rgb(251 191 36 / 5%)
    ),
    #101d2b;
  border: 1px solid #273b51;
  border-radius: 12px;
}

.scale-mark {
  position: absolute;
  top: 16px;
  width: 1px;
  height: 23px;
  background: #32475d;
}

.mark-0 {
  left: 0;
}

.mark-25-left {
  left: 25%;
}

.mark-center {
  left: 50%;
  width: 2px;
  background: #48647f;
}

.mark-25-right {
  left: 75%;
}

.mark-50 {
  right: 0;
}

.center-zone {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 45%;
  width: 10%;
  background: rgb(52 211 153 / 8%);
  border: 1px solid rgb(52 211 153 / 10%);
  border-radius: 8px;
}

.pitch-needle {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: #fbbf24;
  box-shadow: 0 0 9px rgb(251 191 36 / 55%);
  transform: translateX(-50%);
  transition:
    left 80ms linear,
    background-color 120ms ease;
}

.pitch-needle.in-tune {
  background: #34d399;
  box-shadow: 0 0 11px rgb(52 211 153 / 60%);
}

.pitch-needle > span {
  position: absolute;
  top: -1px;
  left: 50%;
  width: 8px;
  height: 8px;
  background: inherit;
  border-radius: 50%;
  transform: translateX(-50%);
}

.tuning-description {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 10px;
  color: #8496aa;
  font-size: 10px;
  text-align: center;
}

.tuning-description .q-icon {
  font-size: 17px;
}

.tuning-description .q-icon.in-tune {
  color: #34d399;
}

.tuning-description .q-icon.flat,
.tuning-description .q-icon.sharp {
  color: #fbbf24;
}

.pitch-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 13px;
}

.pitch-detail {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  padding: 10px 11px;
  background: #101d2b;
  border: 1px solid #263a50;
  border-radius: 10px;
}

.pitch-detail span {
  color: #65788e;
  font-size: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pitch-detail strong {
  overflow: hidden;
  color: #c9d6e4;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.use-reference-button {
  width: 100%;
  min-height: 42px;
  margin-top: 15px;
  color: #fff;
  background: #875ad1;
  border-radius: 11px;
}

.upcoming-workspace {
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.upcoming-icon {
  display: grid;
  width: 68px;
  height: 68px;
  place-items: center;
  margin-bottom: 15px;
  color: #f472b6;
  background: rgb(244 114 182 / 9%);
  border: 1px solid rgb(244 114 182 / 20%);
  border-radius: 20px;
}

.upcoming-icon .q-icon {
  font-size: 31px;
}

.planned-features {
  display: grid;
  width: min(600px, 100%);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 22px;
}

.planned-feature {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  color: #9baec2;
  background: #0f1b29;
  border: 1px solid #213247;
  border-radius: 10px;
  font-size: 10px;
  text-align: left;
}

.planned-feature .q-icon {
  color: #34d399;
  font-size: 16px;
}

.development-chip {
  margin-top: 20px;
}

@keyframes pulse-ring {
  0% {
    opacity: 0.8;
    transform: scale(0.9);
  }

  100% {
    opacity: 0;
    transform: scale(1.15);
  }
}

@keyframes listen-pulse {
  0% {
    opacity: 0.8;
    transform: scale(0.82);
  }

  100% {
    opacity: 0;
    transform: scale(1.08);
  }
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.45;
  }
}

@media (max-width: 1250px) {
  .mode-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .notes-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .detector-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 850px) {
  .music-header,
  .workspace-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .back-button {
    align-self: flex-start;
  }

  .mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reference-layout {
    grid-template-columns: 1fr;
  }

  .frequency-chip {
    align-self: flex-start;
    text-align: left;
  }

  .microphone-state {
    align-self: flex-start;
  }
}

@media (max-width: 560px) {
  .music-shell {
    padding: 14px;
  }

  .mode-grid {
    grid-template-columns: 1fr;
  }

  .notes-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .planned-features,
  .pitch-details {
    grid-template-columns: 1fr;
  }

  .listen-rings {
    width: 180px;
    height: 180px;
  }
}
</style>
