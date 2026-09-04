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
            <strong>{{ mode.label }}</strong>
            <small>{{ mode.description }}</small>
          </span>

          <q-icon name="chevron_right" class="mode-arrow" />
        </button>
      </div>

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
    longDescription:
      'Utilizaremos el micrófono para escuchar tu voz, calcular su frecuencia y mostrar automáticamente la nota musical más cercana.',
    features: [
      'Escuchar la voz desde el micrófono',
      'Mostrar nota detectada en tiempo real',
      'Mostrar frecuencia en Hz',
      'Indicar si estás por encima o por debajo de la nota',
    ],
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

let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

const activeModeData = computed(
  () => modes.find((mode) => mode.id === activeMode.value) ?? modes[0]!,
);

const selectedNoteLabel = computed(
  () => notes.find((note) => note.value === selectedNote.value)?.label ?? 'Do',
);

const selectedFrequency = computed(() => {
  const midiNumber = (selectedOctave.value + 1) * 12 + selectedNote.value;
  return 440 * Math.pow(2, (midiNumber - 69) / 12);
});

function goBack(): void {
  void router.push('/herramientas');
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
  if (!audioContext) {
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
      // El oscilador puede haberse detenido previamente.
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

.reference-help {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 17px;
  padding: 13px 15px;
  color: #9db0c4;
  background: rgb(96 165 250 / 6%);
  border: 1px solid rgb(96 165 250 / 18%);
  border-radius: 12px;
}

.reference-help > .q-icon {
  margin-top: 1px;
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
  line-height: 1.5;
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

@media (max-width: 1250px) {
  .mode-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .notes-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
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

  .planned-features {
    grid-template-columns: 1fr;
  }
}
</style>
