<template>
  <section class="piano-preview">
    <header class="preview-heading">
      <div>
        <span class="kicker"> RESULTADO EN PIANO </span>

        <h3>Melodía detectada desde tu interpretación</h3>

        <p>
          ICP Studio convierte las notas detectadas en tu grabación en una referencia de piano. Se
          conservan el orden, el momento de entrada y la duración aproximada de cada nota.
        </p>
      </div>

      <div class="key-chip">
        <span>Tonalidad estimada</span>
        <strong>{{ keyLabel }}</strong>
      </div>
    </header>

    <section class="piano-status">
      <div class="piano-status-icon">
        <q-icon name="piano" />
      </div>

      <div class="piano-status-copy">
        <span>REFERENCIA MUSICAL</span>

        <strong>La voz se analiza; el resultado se escucha en piano</strong>

        <small>
          La generación experimental de voces humanas está pausada. Esta vista utiliza únicamente
          sonidos de referencia de piano.
        </small>
      </div>
    </section>

    <section class="key-reference">
      <div class="key-reference-copy">
        <q-icon name="music_note" />

        <div>
          <span>TONALIDAD</span>

          <strong>{{ keyLabel }}</strong>

          <small>
            Escucha el acorde principal de la tonalidad estimada antes de reproducir la melodía.
          </small>
        </div>
      </div>

      <q-btn
        unelevated
        no-caps
        icon="play_arrow"
        :label="playbackMode === 'key' ? 'Reproduciendo' : 'Escuchar tonalidad'"
        class="key-play-button"
        :disable="isPlaying"
        @click="playKeyReference"
      />
    </section>

    <section class="melody-player">
      <div class="player-copy">
        <span>MELODÍA DETECTADA</span>

        <strong>
          {{ capturedNotes.length }}
          {{ capturedNotes.length === 1 ? 'nota' : 'notas' }}
        </strong>

        <small>
          La reproducción respeta la línea de tiempo obtenida del análisis de tu grabación.
        </small>
      </div>

      <div class="player-actions">
        <q-btn
          unelevated
          no-caps
          icon="piano"
          :label="playbackMode === 'melody' ? 'Reproduciendo melodía' : 'Escuchar en piano'"
          class="melody-play-button"
          :disable="isPlaying || !capturedNotes.length"
          @click="playDetectedMelody"
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
    </section>

    <div v-if="playbackError" class="playback-error">
      <q-icon name="error_outline" />

      <span>{{ playbackError }}</span>
    </div>

    <section class="sequence-section">
      <header class="sequence-heading">
        <div>
          <span>SECUENCIA EN PIANO</span>

          <small> Puedes tocar una nota individual o reproducir la interpretación completa. </small>
        </div>

        <div v-if="isPlaying && playbackMode === 'melody'" class="following-indicator">
          <span class="following-dot"></span>
          Siguiendo reproducción
        </div>
      </header>

      <div ref="timelineWrapper" class="piano-timeline">
        <button
          v-for="(note, index) in capturedNotes"
          :key="note.id"
          :ref="(element) => setNoteElement(element, index)"
          type="button"
          class="piano-note"
          :class="{ active: activeNoteIndex === index }"
          @click="playSingleNote(note, index)"
        >
          <span class="note-number">
            {{ index + 1 }}
          </span>

          <q-icon v-if="activeNoteIndex === index" name="play_arrow" class="playing-icon" />

          <strong>
            {{ noteLabel(note) }}
          </strong>

          <span class="international-note">
            {{ internationalNoteLabel(note) }}
          </span>

          <small>
            {{ formatTimelineTime(note.startedAt) }}
            –
            {{ formatTimelineTime(note.endedAt) }}
          </small>

          <span class="duration">
            {{ formatDuration(note.durationMs) }}
          </span>

          <span v-if="note.confidence !== undefined" class="confidence">
            {{ Math.round(note.confidence * 100) }}%
          </span>
        </button>
      </div>
    </section>

    <section class="timeline-summary">
      <div>
        <span>Inicio</span>
        <strong>{{ firstNoteTime }}</strong>
      </div>

      <div>
        <span>Final</span>
        <strong>{{ lastNoteTime }}</strong>
      </div>

      <div>
        <span>Duración musical</span>
        <strong>{{ melodyDurationLabel }}</strong>
      </div>

      <div>
        <span>Notas</span>
        <strong>{{ capturedNotes.length }}</strong>
      </div>
    </section>

    <div class="information-note">
      <q-icon name="info" />

      <div>
        <strong>Modo piano activo</strong>

        <p>
          Por ahora ICP Studio utilizará la grabación para reconocer la interpretación y generar una
          referencia musical limpia en piano. El motor experimental de transformación de voces
          permanece guardado para retomarlo más adelante.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue';

import type { ChordStep, ScaleMode } from '../../../shared/harmony';

import { midiToFrequency, notes } from '../../../shared/music';

interface CapturedNote {
  id: string;
  noteIndex: number;
  octave: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  confidence?: number;
  cents?: number;
}

type PlaybackMode = 'key' | 'melody' | 'single' | null;

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
  capturedNotes: CapturedNote[];
  audioUrl: string;
}>();

const isPlaying = ref(false);

const playbackMode = ref<PlaybackMode>(null);

const playbackError = ref('');

const activeNoteIndex = ref<number | null>(null);

const timelineWrapper = ref<HTMLElement | null>(null);

const noteElements = new Map<number, HTMLElement>();

let audioContext: AudioContext | null = null;

let activeOscillators: OscillatorNode[] = [];

let activeGainNodes: GainNode[] = [];

let timers: ReturnType<typeof setTimeout>[] = [];

const keyLabel = computed(() => {
  const note = notes.find((item) => item.value === props.rootNote) ?? notes[0]!;

  return `${note.label} ${props.scaleMode === 'major' ? 'mayor' : 'menor'}`;
});

const firstNoteTime = computed(() => {
  const first = props.capturedNotes[0];

  return first ? formatTimelineTime(first.startedAt) : '--';
});

const lastNoteTime = computed(() => {
  const last = props.capturedNotes[props.capturedNotes.length - 1];

  return last ? formatTimelineTime(last.endedAt) : '--';
});

const melodyDurationMs = computed(() => {
  if (!props.capturedNotes.length) {
    return 0;
  }

  const first = props.capturedNotes[0];

  const last = props.capturedNotes[props.capturedNotes.length - 1];

  if (!first || !last) {
    return 0;
  }

  return Math.max(0, last.endedAt - first.startedAt);
});

const melodyDurationLabel = computed(() => formatDuration(melodyDurationMs.value));

watch(activeNoteIndex, (index) => {
  if (index === null) {
    return;
  }

  void nextTick(() => {
    scrollToActiveNote(index);
  });
});

function ensureAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }

  return audioContext;
}

async function prepareAudio(): Promise<AudioContext> {
  const context = ensureAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  return context;
}

function createPianoTone(
  context: AudioContext,
  frequency: number,
  absoluteStart: number,
  durationSeconds: number,
  volume: number,
): void {
  const safeDuration = Math.max(durationSeconds, 0.12);

  const end = absoluteStart + safeDuration;

  const partials = [
    {
      multiplier: 1,
      volume: 1,
      type: 'triangle' as OscillatorType,
    },
    {
      multiplier: 2,
      volume: 0.25,
      type: 'sine' as OscillatorType,
    },
    {
      multiplier: 3,
      volume: 0.08,
      type: 'sine' as OscillatorType,
    },
  ];

  partials.forEach((partial) => {
    const oscillator = context.createOscillator();

    const gain = context.createGain();

    const peakVolume = volume * partial.volume;

    oscillator.type = partial.type;

    oscillator.frequency.setValueAtTime(frequency * partial.multiplier, absoluteStart);

    gain.gain.setValueAtTime(0.0001, absoluteStart);

    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peakVolume),
      absoluteStart + Math.min(0.01, safeDuration * 0.12),
    );

    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peakVolume * 0.42),
      absoluteStart + Math.min(0.22, safeDuration * 0.5),
    );

    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);

    gain.connect(context.destination);

    oscillator.start(absoluteStart);

    oscillator.stop(end + 0.04);

    activeOscillators.push(oscillator);

    activeGainNodes.push(gain);
  });
}

async function playKeyReference(): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  try {
    const context = await prepareAudio();

    isPlaying.value = true;

    playbackMode.value = 'key';

    const rootMidi = 60 + props.rootNote;

    const third = props.scaleMode === 'major' ? 4 : 3;

    const chord = [rootMidi, rootMidi + third, rootMidi + 7, rootMidi + 12];

    const start = context.currentTime + 0.05;

    chord.forEach((midi, index) => {
      createPianoTone(
        context,
        midiToFrequency(midi),
        start + index * 0.025,
        1.6,
        index === 0 ? 0.14 : 0.1,
      );
    });

    timers.push(
      setTimeout(() => {
        stopPlayback();
      }, 1850),
    );
  } catch (error) {
    playbackError.value =
      error instanceof Error
        ? `No fue posible reproducir la tonalidad: ${error.message}`
        : 'No fue posible reproducir la tonalidad.';

    stopPlayback();
  }
}

async function playDetectedMelody(): Promise<void> {
  if (!props.capturedNotes.length) {
    return;
  }

  stopPlayback();

  playbackError.value = '';

  try {
    const context = await prepareAudio();

    const firstNote = props.capturedNotes[0];

    if (!firstNote) {
      return;
    }

    isPlaying.value = true;

    playbackMode.value = 'melody';

    const baseStart = context.currentTime + 0.08;

    const firstTimelinePosition = firstNote.startedAt;

    let totalDurationMs = 0;

    props.capturedNotes.forEach((note, index) => {
      const relativeStartMs = Math.max(0, note.startedAt - firstTimelinePosition);

      const absoluteStart = baseStart + relativeStartMs / 1000;

      const midi = noteToMidi(note);

      createPianoTone(
        context,
        midiToFrequency(midi),
        absoluteStart,
        Math.max(0.08, note.durationMs / 1000),
        0.14,
      );

      timers.push(
        setTimeout(() => {
          activeNoteIndex.value = index;
        }, relativeStartMs),
      );

      totalDurationMs = Math.max(totalDurationMs, relativeStartMs + note.durationMs);
    });

    timers.push(
      setTimeout(() => {
        stopPlayback();
      }, totalDurationMs + 180),
    );
  } catch (error) {
    playbackError.value =
      error instanceof Error
        ? `No fue posible reproducir la melodía: ${error.message}`
        : 'No fue posible reproducir la melodía.';

    stopPlayback();
  }
}

async function playSingleNote(note: CapturedNote, index: number): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  try {
    const context = await prepareAudio();

    isPlaying.value = true;

    playbackMode.value = 'single';

    activeNoteIndex.value = index;

    const start = context.currentTime + 0.03;

    createPianoTone(
      context,
      midiToFrequency(noteToMidi(note)),
      start,
      Math.min(Math.max(note.durationMs / 1000, 0.35), 1.4),
      0.16,
    );

    timers.push(
      setTimeout(
        () => {
          stopPlayback();
        },
        Math.min(Math.max(note.durationMs, 350), 1400) + 120,
      ),
    );
  } catch (error) {
    playbackError.value =
      error instanceof Error
        ? `No fue posible reproducir la nota: ${error.message}`
        : 'No fue posible reproducir la nota.';

    stopPlayback();
  }
}

function stopPlayback(): void {
  timers.forEach((timer) => {
    clearTimeout(timer);
  });

  timers = [];

  activeOscillators.forEach((oscillator) => {
    try {
      oscillator.stop();
    } catch {
      // El oscilador puede haber terminado por sí mismo.
    }

    oscillator.disconnect();
  });

  activeGainNodes.forEach((gain) => {
    gain.disconnect();
  });

  activeOscillators = [];

  activeGainNodes = [];

  isPlaying.value = false;

  playbackMode.value = null;

  activeNoteIndex.value = null;
}

function noteToMidi(note: CapturedNote): number {
  return (note.octave + 1) * 12 + note.noteIndex;
}

function noteLabel(note: CapturedNote): string {
  const musicalNote = notes.find((item) => item.value === note.noteIndex);

  return `${musicalNote?.label ?? '—'}${note.octave}`;
}

function internationalNoteLabel(note: CapturedNote): string {
  const musicalNote = notes.find((item) => item.value === note.noteIndex);

  return `${musicalNote?.international ?? '—'}${note.octave}`;
}

function setNoteElement(element: Element | ComponentPublicInstance | null, index: number): void {
  if (element instanceof HTMLElement) {
    noteElements.set(index, element);

    return;
  }

  noteElements.delete(index);
}

function scrollToActiveNote(index: number): void {
  const wrapper = timelineWrapper.value;

  const element = noteElements.get(index);

  if (!wrapper || !element) {
    return;
  }

  const elementLeft = element.offsetLeft;

  const elementRight = elementLeft + element.offsetWidth;

  const visibleLeft = wrapper.scrollLeft;

  const visibleRight = visibleLeft + wrapper.clientWidth;

  if (elementLeft >= visibleLeft && elementRight <= visibleRight) {
    return;
  }

  wrapper.scrollTo({
    left: Math.max(0, elementLeft - wrapper.clientWidth / 2 + element.offsetWidth / 2),
    behavior: 'smooth',
  });
}

function formatDuration(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function formatTimelineTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)} s`;
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
.piano-preview {
  margin-top: 14px;
  padding: 16px;
  background: linear-gradient(180deg, rgb(96 165 250 / 5%), transparent 220px), #0b1622;
  border: 1px solid #22374c;
  border-radius: 14px;
}

.preview-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.kicker {
  color: #60a5fa;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.preview-heading h3 {
  margin: 3px 0 4px;
  color: #edf4fb;
  font-size: 16px;
}

.preview-heading p {
  max-width: 680px;
  margin: 0;
  color: #71859a;
  font-size: 9px;
  line-height: 1.5;
}

.key-chip {
  display: flex;
  min-width: 125px;
  flex: 0 0 auto;
  flex-direction: column;
  padding: 9px 11px;
  background: rgb(96 165 250 / 7%);
  border: 1px solid rgb(96 165 250 / 18%);
  border-radius: 9px;
}

.key-chip span {
  color: #66809a;
  font-size: 6px;
  text-transform: uppercase;
}

.key-chip strong {
  margin-top: 2px;
  color: #bfdbfe;
  font-size: 11px;
}

.piano-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 13px;
  padding: 11px 12px;
  background: rgb(52 211 153 / 4%);
  border: 1px solid rgb(52 211 153 / 14%);
  border-radius: 10px;
}

.piano-status-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  color: #6ee7b7;
  background: rgb(52 211 153 / 7%);
  border-radius: 9px;
}

.piano-status-icon .q-icon {
  font-size: 22px;
}

.piano-status-copy {
  display: flex;
  flex-direction: column;
}

.piano-status-copy > span {
  color: #34d399;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.piano-status-copy strong {
  margin-top: 2px;
  color: #b9d8cd;
  font-size: 9px;
}

.piano-status-copy small {
  margin-top: 2px;
  color: #68857b;
  font-size: 7px;
}

.key-reference,
.melody-player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 11px;
  padding: 12px;
  background: #101e2c;
  border: 1px solid #293e53;
  border-radius: 10px;
}

.key-reference-copy {
  display: flex;
  align-items: center;
  gap: 10px;
}

.key-reference-copy > .q-icon {
  color: #a78bfa;
  font-size: 25px;
}

.key-reference-copy > div,
.player-copy {
  display: flex;
  flex-direction: column;
}

.key-reference-copy span,
.player-copy span {
  color: #687d94;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.09em;
}

.key-reference-copy strong,
.player-copy strong {
  margin-top: 2px;
  color: #d9e4ef;
  font-size: 11px;
}

.key-reference-copy small,
.player-copy small {
  margin-top: 2px;
  color: #65798f;
  font-size: 7px;
}

.key-play-button {
  flex: 0 0 auto;
  color: white;
  background: #6250a5;
  border-radius: 8px;
}

.player-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 7px;
}

.melody-play-button {
  color: white;
  background: #2563a5;
  border-radius: 8px;
}

.stop-button {
  color: #94a8bc;
  border-color: #40566d;
  border-radius: 8px;
}

.playback-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 9px 10px;
  color: #fecdd3;
  background: rgb(251 113 133 / 6%);
  border: 1px solid rgb(251 113 133 / 16%);
  border-radius: 8px;
  font-size: 8px;
}

.sequence-section {
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid #21364a;
}

.sequence-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sequence-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.sequence-heading span {
  color: #cbd8e5;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.sequence-heading small {
  margin-top: 2px;
  color: #61768c;
  font-size: 7px;
}

.following-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #7dd3fc;
  font-size: 7px;
}

.following-dot {
  width: 6px;
  height: 6px;
  background: #38bdf8;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(56 189 248 / 8%);
}

.piano-timeline {
  display: flex;
  gap: 6px;
  margin-top: 9px;
  padding: 10px;
  overflow-x: auto;
  background: #08131e;
  border: 1px solid #21364a;
  border-radius: 10px;
}

.piano-note {
  position: relative;
  display: flex;
  min-width: 112px;
  min-height: 122px;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  flex-direction: column;
  padding: 9px;
  color: inherit;
  background: #122131;
  border: 1px solid #2b4056;
  border-radius: 9px;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background 120ms ease,
    transform 120ms ease;
}

.piano-note:hover {
  background: #15283a;
  border-color: #3a5874;
  transform: translateY(-1px);
}

.piano-note.active {
  background: rgb(37 99 165 / 16%);
  border-color: #3b82c4;
  box-shadow: 0 0 0 1px rgb(59 130 196 / 12%);
}

.note-number {
  position: absolute;
  top: 7px;
  left: 8px;
  color: #52677e;
  font-size: 6px;
}

.playing-icon {
  position: absolute;
  top: 6px;
  right: 7px;
  color: #60a5fa;
  font-size: 14px;
}

.piano-note strong {
  color: #f1f6fb;
  font-size: 17px;
}

.international-note {
  margin-top: 1px;
  color: #60a5fa;
  font-size: 8px;
}

.piano-note small {
  margin-top: 6px;
  color: #60758b;
  font-size: 6px;
}

.duration {
  margin-top: 2px;
  color: #91a4b7;
  font-size: 7px;
}

.confidence {
  margin-top: 2px;
  color: #6ee7b7;
  font-size: 6px;
}

.timeline-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
  margin-top: 9px;
}

.timeline-summary > div {
  display: flex;
  flex-direction: column;
  padding: 8px 9px;
  background: #0d1a27;
  border-radius: 8px;
}

.timeline-summary span {
  color: #5f748a;
  font-size: 6px;
  text-transform: uppercase;
}

.timeline-summary strong {
  margin-top: 2px;
  color: #b9c9d8;
  font-size: 9px;
}

.information-note {
  display: flex;
  gap: 8px;
  margin-top: 11px;
  padding: 10px;
  color: #70859a;
  background: rgb(96 165 250 / 4%);
  border: 1px solid rgb(96 165 250 / 11%);
  border-radius: 9px;
}

.information-note > .q-icon {
  flex: 0 0 auto;
  color: #60a5fa;
  font-size: 17px;
}

.information-note strong {
  color: #9db3c8;
  font-size: 8px;
}

.information-note p {
  margin: 2px 0 0;
  font-size: 7px;
  line-height: 1.45;
}

@media (max-width: 800px) {
  .preview-heading,
  .key-reference,
  .melody-player {
    align-items: stretch;
    flex-direction: column;
  }

  .key-chip {
    width: 100%;
  }

  .player-actions {
    width: 100%;
  }

  .key-play-button,
  .melody-play-button,
  .stop-button {
    flex: 1;
  }

  .timeline-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .player-actions {
    flex-direction: column;
  }

  .timeline-summary {
    grid-template-columns: 1fr;
  }
}
</style>
