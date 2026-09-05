<template>
  <section class="piano-harmony-preview">
    <header class="preview-heading">
      <div>
        <span class="kicker"> ARMONIZACIÓN EN PIANO </span>

        <h3>Armonías generadas desde tu interpretación</h3>

        <p>
          ICP Studio utiliza la melodía detectada, la tonalidad y la armonía para construir seis
          líneas musicales. Por ahora todas se reproducen exclusivamente con referencia de piano.
        </p>
      </div>

      <div class="key-chip">
        <span>Tonalidad detectada</span>

        <strong>{{ keyLabel }}</strong>
      </div>
    </header>

    <div class="piano-mode">
      <q-icon name="piano" />

      <div>
        <span>MODO ACTUAL</span>

        <strong>Armonización completa en piano</strong>

        <small>
          La síntesis de voz humana permanece pausada. El cálculo musical de las armonías continúa
          activo.
        </small>
      </div>
    </div>

    <section class="key-reference">
      <div class="key-reference-copy">
        <q-icon name="music_note" />

        <div>
          <span>REFERENCIA DE TONALIDAD</span>

          <strong>{{ keyLabel }}</strong>

          <small> Escucha primero el acorde principal de la tonalidad calculada. </small>
        </div>
      </div>

      <q-btn
        unelevated
        no-caps
        icon="play_arrow"
        :label="playbackMode === 'key' ? 'Reproduciendo' : 'Escuchar tonalidad'"
        class="key-button"
        :disable="isPlaying"
        @click="playKeyReference"
      />
    </section>

    <section class="voices-section">
      <header>
        <div>
          <span>LÍNEAS DE ARMONÍA</span>

          <strong>Seis referencias independientes</strong>

          <small> Cada botón reproduce la canción completa utilizando solamente esa línea. </small>
        </div>

        <q-icon name="queue_music" />
      </header>

      <div class="voice-grid">
        <button
          v-for="voice in voiceDefinitions"
          :key="voice.id"
          type="button"
          class="voice-card"
          :class="[
            voice.id,
            {
              active: playbackMode === 'voice' && playingVoiceId === voice.id,
            },
          ]"
          :style="{
            '--voice-color': voice.color,
          }"
          :disabled="isPlaying"
          @click="playVoice(voice.id)"
        >
          <div class="voice-icon">
            <q-icon :name="voice.icon" />
          </div>

          <div>
            <span>{{ voice.shortLabel }}</span>

            <strong>{{ voice.label }}</strong>

            <small>{{ voice.description }}</small>
          </div>

          <q-icon name="play_arrow" class="play-icon" />
        </button>
      </div>

      <div class="global-actions">
        <q-btn
          unelevated
          no-caps
          icon="piano"
          :label="playbackMode === 'all' ? 'Reproduciendo todas' : 'Escuchar todas'"
          class="all-button"
          :disable="isPlaying || !harmonyRows.length"
          @click="playAllVoices"
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

    <section class="matrix-section">
      <header class="matrix-heading">
        <div>
          <span>MATRIZ DE NOTAS</span>

          <strong>
            {{ harmonyRows.length }}
            {{ harmonyRows.length === 1 ? 'nota detectada' : 'notas detectadas' }}
          </strong>

          <small>
            Puedes tocar cualquier celda individualmente para escuchar esa nota en piano.
          </small>
        </div>

        <div
          v-if="isPlaying && playbackMode !== 'key' && playbackMode !== 'single'"
          class="following-indicator"
        >
          <span></span>
          Siguiendo reproducción
        </div>
      </header>

      <div ref="tableWrapper" class="table-wrapper">
        <table class="harmony-table">
          <thead>
            <tr>
              <th>#</th>

              <th>Tiempo</th>

              <th>Duración</th>

              <th
                v-for="voice in voiceDefinitions"
                :key="voice.id"
                :style="{
                  '--voice-color': voice.color,
                }"
              >
                {{ voice.tableLabel }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(row, rowIndex) in harmonyRows"
              :key="row.id"
              :ref="(element) => setRowElement(element, rowIndex)"
              :class="{
                playing: activeNoteIndex === rowIndex,
              }"
            >
              <td class="order-cell">
                <q-icon v-if="activeNoteIndex === rowIndex" name="play_arrow" />

                <span v-else>{{ rowIndex + 1 }}</span>
              </td>

              <td class="time-cell">
                {{ formatTimelineTime(row.startedAt) }}
                –
                {{ formatTimelineTime(row.endedAt) }}
              </td>

              <td class="duration-cell">
                {{ formatDuration(row.durationMs) }}
              </td>

              <td v-for="voiceDefinition in voiceDefinitions" :key="voiceDefinition.id">
                <button
                  type="button"
                  class="note-button"
                  :style="{
                    '--voice-color': voiceDefinition.color,
                  }"
                  @click="playSingleVoiceNote(row, voiceDefinition.id, rowIndex)"
                >
                  {{ voiceLabel(row, voiceDefinition.id) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="explanation-grid">
      <article>
        <q-icon name="north" />

        <div>
          <span>SEGUNDA ARRIBA</span>

          <strong>Armonía superior</strong>

          <small>
            Busca una nota armónica por encima de la melodía principal, procurando mantener
            movimiento suave.
          </small>
        </div>
      </article>

      <article>
        <q-icon name="south" />

        <div>
          <span>SEGUNDA ABAJO</span>

          <strong>Armonía inferior cercana</strong>

          <small>
            Busca una alternativa armónica por debajo de la melodía sin confundirse con las líneas
            graves.
          </small>
        </div>
      </article>

      <article>
        <q-icon name="graphic_eq" />

        <div>
          <span>VOCES GRAVES</span>

          <strong>Tenor, Barítono y Bajo</strong>

          <small>
            Las tres líneas reciben rangos independientes para construir una distribución más
            completa.
          </small>
        </div>
      </article>
    </section>

    <div class="experimental-note">
      <q-icon name="science" />

      <div>
        <strong>Motor vocal congelado</strong>

        <p>
          El experimento de voz humana queda guardado fuera de este flujo. A partir de ahora
          priorizamos que ICP Studio calcule correctamente todas las notas y armonías antes de
          volver a trabajar con síntesis vocal.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue';

import {
  harmonizeCapturedMelodyPhrases,
  type ChordStep,
  type MelodyHarmonyVoiceNote,
  type MelodyNote,
  type MelodyNoteDuration,
  type MelodyVoiceId,
  type ScaleMode,
} from '../../../shared/harmony';

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

interface HarmonyRow extends CapturedNote {
  voices: MelodyHarmonyVoiceNote[];
}

interface VoiceDefinition {
  id: MelodyVoiceId;
  label: string;
  shortLabel: string;
  tableLabel: string;
  color: string;
  icon: string;
  description: string;
}

type PlaybackMode = 'key' | 'voice' | 'all' | 'single' | null;

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
  capturedNotes: CapturedNote[];
  audioUrl: string;
}>();

const voiceDefinitions: VoiceDefinition[] = [
  {
    id: 'principal',
    label: 'Principal',
    shortLabel: 'P',
    tableLabel: 'Principal',
    color: '#f472b6',
    icon: 'music_note',
    description: 'La melodía exacta detectada de tu canto.',
  },
  {
    id: 'second',
    label: 'Segunda arriba',
    shortLabel: '2ª ↑',
    tableLabel: '2ª arriba',
    color: '#60a5fa',
    icon: 'north',
    description: 'Armonía cercana por encima de la principal.',
  },
  {
    id: 'second-down',
    label: 'Segunda abajo',
    shortLabel: '2ª ↓',
    tableLabel: '2ª abajo',
    color: '#38bdf8',
    icon: 'south',
    description: 'Armonía cercana por debajo de la principal.',
  },
  {
    id: 'tenor',
    label: 'Tenor',
    shortLabel: 'T',
    tableLabel: 'Tenor',
    color: '#a78bfa',
    icon: 'graphic_eq',
    description: 'Línea intermedia de soporte armónico.',
  },
  {
    id: 'baritone',
    label: 'Barítono',
    shortLabel: 'Brt',
    tableLabel: 'Barítono',
    color: '#34d399',
    icon: 'equalizer',
    description: 'Línea grave intermedia.',
  },
  {
    id: 'bass',
    label: 'Bajo',
    shortLabel: 'B',
    tableLabel: 'Bajo',
    color: '#fbbf24',
    icon: 'volume_down',
    description: 'Fundamento grave de la armonía.',
  },
];

const isPlaying = ref(false);

const playbackMode = ref<PlaybackMode>(null);

const playingVoiceId = ref<MelodyVoiceId | null>(null);

const activeNoteIndex = ref<number | null>(null);

const playbackError = ref('');

const tableWrapper = ref<HTMLElement | null>(null);

const rowElements = new Map<number, HTMLElement>();

let audioContext: AudioContext | null = null;

let activeOscillators: OscillatorNode[] = [];

let activeGainNodes: GainNode[] = [];

let timers: ReturnType<typeof setTimeout>[] = [];

const keyLabel = computed(() => {
  const note = notes.find((item) => item.value === props.rootNote) ?? notes[0]!;

  return `${note.label} ${props.scaleMode === 'major' ? 'mayor' : 'menor'}`;
});

const harmonyRows = computed<HarmonyRow[]>(() => {
  if (!props.capturedNotes.length) {
    return [];
  }

  const melodyNotes: MelodyNote[] = props.capturedNotes.map((note) => ({
    id: note.id,
    noteIndex: note.noteIndex,
    octave: note.octave,
    beats: durationToBeats(note.durationMs),
  }));

  const phrase = {
    id: 'captured-piano-harmony',
    title: 'Interpretación capturada',
    lyrics: '',
    chordStepId: props.progression[0]?.id ?? null,
    notes: melodyNotes,
  };

  const harmonized = harmonizeCapturedMelodyPhrases(
    props.rootNote,
    props.scaleMode,
    props.progression,
    [phrase],
  )[0];

  if (!harmonized) {
    return [];
  }

  return props.capturedNotes.map((captured, index) => ({
    ...captured,
    voices: harmonized.notes[index]?.voices ?? [],
  }));
});

watch(activeNoteIndex, (index) => {
  if (index === null) {
    return;
  }

  void nextTick(() => {
    scrollToActiveRow(index);
  });
});

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

function voiceFor(row: HarmonyRow, voiceId: MelodyVoiceId): MelodyHarmonyVoiceNote | undefined {
  return row.voices.find((voice) => voice.voiceId === voiceId);
}

function voiceLabel(row: HarmonyRow, voiceId: MelodyVoiceId): string {
  const voice = voiceFor(row, voiceId);

  if (!voice) {
    return '—';
  }

  const note = notes.find((item) => item.value === voice.noteIndex);

  return `${note?.label ?? '—'}${voice.octave}`;
}

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
  const duration = Math.max(0.09, durationSeconds);

  const end = absoluteStart + duration;

  const partials = [
    {
      multiplier: 1,
      volume: 1,
      type: 'triangle' as OscillatorType,
    },
    {
      multiplier: 2,
      volume: 0.24,
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

    const partialVolume = Math.max(0.0001, volume * partial.volume);

    oscillator.type = partial.type;

    oscillator.frequency.setValueAtTime(frequency * partial.multiplier, absoluteStart);

    gain.gain.setValueAtTime(0.0001, absoluteStart);

    gain.gain.exponentialRampToValueAtTime(
      partialVolume,
      absoluteStart + Math.min(0.009, duration * 0.12),
    );

    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, partialVolume * 0.42),
      absoluteStart + Math.min(0.24, duration * 0.55),
    );

    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);

    gain.connect(context.destination);

    oscillator.start(absoluteStart);

    oscillator.stop(end + 0.035);

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

    const thirdOffset = props.scaleMode === 'major' ? 4 : 3;

    const chordMidi = [rootMidi, rootMidi + thirdOffset, rootMidi + 7, rootMidi + 12];

    const baseStart = context.currentTime + 0.06;

    chordMidi.forEach((midi, index) => {
      createPianoTone(
        context,
        midiToFrequency(midi),
        baseStart + index * 0.025,
        1.65,
        index === 0 ? 0.14 : 0.1,
      );
    });

    timers.push(
      setTimeout(() => {
        stopPlayback();
      }, 1900),
    );
  } catch (error) {
    playbackError.value =
      error instanceof Error
        ? `No fue posible reproducir la tonalidad: ${error.message}`
        : 'No fue posible reproducir la tonalidad.';

    stopPlayback();
  }
}

async function playVoice(voiceId: MelodyVoiceId): Promise<void> {
  if (!harmonyRows.value.length) {
    return;
  }

  stopPlayback();

  playbackError.value = '';

  try {
    const context = await prepareAudio();

    isPlaying.value = true;

    playbackMode.value = 'voice';

    playingVoiceId.value = voiceId;

    scheduleVoiceTimeline(context, voiceId, voiceVolume(voiceId));

    schedulePlaybackEnd();
  } catch (error) {
    playbackError.value =
      error instanceof Error
        ? `No fue posible reproducir la armonía: ${error.message}`
        : 'No fue posible reproducir la armonía.';

    stopPlayback();
  }
}

async function playAllVoices(): Promise<void> {
  if (!harmonyRows.value.length) {
    return;
  }

  stopPlayback();

  playbackError.value = '';

  try {
    const context = await prepareAudio();

    isPlaying.value = true;

    playbackMode.value = 'all';

    voiceDefinitions.forEach((voice) => {
      scheduleVoiceTimeline(context, voice.id, allVoicesVolume(voice.id));
    });

    scheduleActiveRows();

    schedulePlaybackEnd();
  } catch (error) {
    playbackError.value =
      error instanceof Error
        ? `No fue posible reproducir todas las líneas: ${error.message}`
        : 'No fue posible reproducir todas las líneas.';

    stopPlayback();
  }
}

function scheduleVoiceTimeline(
  context: AudioContext,
  voiceId: MelodyVoiceId,
  volume: number,
): void {
  const firstStart = harmonyRows.value[0]?.startedAt ?? 0;

  const baseStart = context.currentTime + 0.08;

  harmonyRows.value.forEach((row) => {
    const voice = voiceFor(row, voiceId);

    if (!voice) {
      return;
    }

    const relativeStart = Math.max(0, row.startedAt - firstStart);

    createPianoTone(
      context,
      voice.frequency,
      baseStart + relativeStart / 1000,
      Math.max(0.08, row.durationMs / 1000),
      volume,
    );
  });

  if (playbackMode.value === 'voice') {
    scheduleActiveRows();
  }
}

function scheduleActiveRows(): void {
  const firstStart = harmonyRows.value[0]?.startedAt ?? 0;

  harmonyRows.value.forEach((row, index) => {
    const delay = Math.max(0, row.startedAt - firstStart);

    timers.push(
      setTimeout(() => {
        activeNoteIndex.value = index;
      }, delay),
    );
  });
}

function schedulePlaybackEnd(): void {
  const first = harmonyRows.value[0];

  const last = harmonyRows.value[harmonyRows.value.length - 1];

  if (!first || !last) {
    stopPlayback();

    return;
  }

  const duration = Math.max(0, last.endedAt - first.startedAt);

  timers.push(
    setTimeout(() => {
      stopPlayback();
    }, duration + 220),
  );
}

async function playSingleVoiceNote(
  row: HarmonyRow,
  voiceId: MelodyVoiceId,
  rowIndex: number,
): Promise<void> {
  const voice = voiceFor(row, voiceId);

  if (!voice) {
    return;
  }

  stopPlayback();

  playbackError.value = '';

  try {
    const context = await prepareAudio();

    isPlaying.value = true;

    playbackMode.value = 'single';

    playingVoiceId.value = voiceId;

    activeNoteIndex.value = rowIndex;

    const duration = Math.min(1.5, Math.max(0.35, row.durationMs / 1000));

    createPianoTone(context, voice.frequency, context.currentTime + 0.04, duration, 0.17);

    timers.push(
      setTimeout(
        () => {
          stopPlayback();
        },
        duration * 1000 + 100,
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

function voiceVolume(voiceId: MelodyVoiceId): number {
  switch (voiceId) {
    case 'principal':
      return 0.15;

    case 'second':
    case 'second-down':
      return 0.13;

    case 'tenor':
      return 0.12;

    case 'baritone':
      return 0.11;

    case 'bass':
      return 0.115;
  }
}

function allVoicesVolume(voiceId: MelodyVoiceId): number {
  switch (voiceId) {
    case 'principal':
      return 0.105;

    case 'second':
    case 'second-down':
      return 0.055;

    case 'tenor':
      return 0.05;

    case 'baritone':
      return 0.047;

    case 'bass':
      return 0.052;
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
      // El oscilador puede haber terminado.
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

  playingVoiceId.value = null;

  activeNoteIndex.value = null;
}

function setRowElement(element: Element | ComponentPublicInstance | null, index: number): void {
  if (element instanceof HTMLElement) {
    rowElements.set(index, element);

    return;
  }

  rowElements.delete(index);
}

function scrollToActiveRow(index: number): void {
  const wrapper = tableWrapper.value;

  const row = rowElements.get(index);

  if (!wrapper || !row) {
    return;
  }

  const wrapperRect = wrapper.getBoundingClientRect();

  const rowRect = row.getBoundingClientRect();

  if (rowRect.left >= wrapperRect.left && rowRect.right <= wrapperRect.right) {
    return;
  }

  wrapper.scrollTo({
    left: Math.max(0, row.offsetLeft - wrapper.clientWidth / 2 + row.clientWidth / 2),
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
.piano-harmony-preview {
  margin-top: 14px;
  padding: 17px;
  background: linear-gradient(180deg, rgb(96 165 250 / 5%), transparent 230px), #0b1622;
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
  max-width: 700px;
  margin: 0;
  color: #71859a;
  font-size: 9px;
  line-height: 1.5;
}

.key-chip {
  display: flex;
  min-width: 145px;
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

.piano-mode {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 13px;
  padding: 10px 11px;
  background: rgb(52 211 153 / 4%);
  border: 1px solid rgb(52 211 153 / 14%);
  border-radius: 9px;
}

.piano-mode > .q-icon {
  color: #6ee7b7;
  font-size: 23px;
}

.piano-mode > div {
  display: flex;
  flex-direction: column;
}

.piano-mode span {
  color: #34d399;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.09em;
}

.piano-mode strong {
  color: #b9d8cd;
  font-size: 9px;
}

.piano-mode small {
  color: #68857b;
  font-size: 7px;
}

.key-reference {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 11px;
  padding: 11px 12px;
  background: #101e2c;
  border: 1px solid #293e53;
  border-radius: 10px;
}

.key-reference-copy {
  display: flex;
  align-items: center;
  gap: 9px;
}

.key-reference-copy > .q-icon {
  color: #a78bfa;
  font-size: 24px;
}

.key-reference-copy > div {
  display: flex;
  flex-direction: column;
}

.key-reference-copy span {
  color: #687d94;
  font-size: 6px;
  font-weight: 700;
}

.key-reference-copy strong {
  color: #d9e4ef;
  font-size: 11px;
}

.key-reference-copy small {
  color: #65798f;
  font-size: 7px;
}

.key-button {
  color: white;
  background: #6250a5;
  border-radius: 8px;
}

.voices-section {
  margin-top: 12px;
  padding: 12px;
  background: #0d1a27;
  border: 1px solid #24394d;
  border-radius: 11px;
}

.voices-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.voices-section > header > div {
  display: flex;
  flex-direction: column;
}

.voices-section > header span {
  color: #60a5fa;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.09em;
}

.voices-section > header strong {
  color: #c7d6e5;
  font-size: 10px;
}

.voices-section > header small {
  color: #65798f;
  font-size: 7px;
}

.voices-section > header > .q-icon {
  color: #60a5fa;
  font-size: 22px;
}

.voice-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-top: 10px;
}

.voice-card {
  display: grid;
  min-height: 72px;
  grid-template-columns: 34px 1fr 20px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  color: inherit;
  text-align: left;
  background: #122131;
  border: 1px solid #2a4056;
  border-radius: 9px;
  cursor: pointer;
}

.voice-card:hover {
  background: #15283a;
  border-color: var(--voice-color);
}

.voice-card:disabled {
  cursor: default;
  opacity: 0.45;
}

.voice-card.active {
  background: color-mix(in srgb, var(--voice-color) 10%, #122131);
  border-color: var(--voice-color);
}

.voice-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--voice-color);
  background: rgb(255 255 255 / 3%);
  border-radius: 8px;
}

.voice-card > div:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.voice-card span {
  color: var(--voice-color);
  font-size: 6px;
  font-weight: 700;
}

.voice-card strong {
  color: #dbe6f1;
  font-size: 9px;
}

.voice-card small {
  overflow: hidden;
  color: #62778d;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.play-icon {
  color: var(--voice-color);
  font-size: 18px;
}

.global-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 9px;
}

.all-button {
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

.matrix-section {
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid #21364a;
}

.matrix-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.matrix-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.matrix-heading span {
  color: #cbd8e5;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.matrix-heading strong {
  margin-top: 2px;
  color: #aabdcf;
  font-size: 9px;
}

.matrix-heading small {
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

.following-indicator > span {
  width: 6px;
  height: 6px;
  background: #38bdf8;
  border-radius: 50%;
}

.table-wrapper {
  margin-top: 9px;
  overflow-x: auto;
  background: #08131e;
  border: 1px solid #21364a;
  border-radius: 9px;
}

.harmony-table {
  width: 100%;
  min-width: 1050px;
  border-collapse: collapse;
}

.harmony-table th {
  padding: 7px 6px;
  color: #667b91;
  font-size: 7px;
  font-weight: 700;
  text-align: center;
  border-bottom: 1px solid #21364a;
}

.harmony-table th:nth-child(n + 4) {
  color: var(--voice-color);
}

.harmony-table td {
  padding: 5px;
  color: #70859a;
  font-size: 7px;
  text-align: center;
  border-bottom: 1px solid #172a3c;
}

.harmony-table tbody tr:last-child td {
  border-bottom: 0;
}

.harmony-table tr.playing {
  background: rgb(59 130 246 / 7%);
}

.order-cell .q-icon {
  color: #60a5fa;
  font-size: 14px;
}

.time-cell,
.duration-cell {
  white-space: nowrap;
}

.note-button {
  min-width: 72px;
  padding: 5px 7px;
  color: var(--voice-color);
  background: rgb(255 255 255 / 2%);
  border: 1px solid #25394d;
  border-radius: 6px;
  cursor: pointer;
  font-size: 8px;
  font-weight: 700;
}

.note-button:hover {
  border-color: var(--voice-color);
}

.explanation-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-top: 10px;
}

.explanation-grid article {
  display: flex;
  gap: 8px;
  padding: 9px;
  background: #0e1b28;
  border: 1px solid #21364a;
  border-radius: 8px;
}

.explanation-grid .q-icon {
  flex: 0 0 auto;
  color: #60a5fa;
  font-size: 17px;
}

.explanation-grid article > div {
  display: flex;
  flex-direction: column;
}

.explanation-grid span {
  color: #60a5fa;
  font-size: 6px;
  font-weight: 700;
}

.explanation-grid strong {
  color: #aebfd0;
  font-size: 8px;
}

.explanation-grid small {
  margin-top: 2px;
  color: #61758a;
  font-size: 6px;
  line-height: 1.4;
}

.experimental-note {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding: 9px;
  color: #73879c;
  background: rgb(167 139 250 / 4%);
  border: 1px solid rgb(167 139 250 / 12%);
  border-radius: 8px;
}

.experimental-note > .q-icon {
  flex: 0 0 auto;
  color: #a78bfa;
  font-size: 17px;
}

.experimental-note strong {
  color: #a99ec7;
  font-size: 8px;
}

.experimental-note p {
  margin: 2px 0 0;
  font-size: 7px;
  line-height: 1.45;
}

@media (max-width: 900px) {
  .voice-grid,
  .explanation-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 650px) {
  .preview-heading,
  .key-reference {
    align-items: stretch;
    flex-direction: column;
  }

  .key-chip {
    width: 100%;
  }

  .voice-grid,
  .explanation-grid {
    grid-template-columns: 1fr;
  }

  .global-actions {
    flex-direction: column;
  }

  .all-button,
  .stop-button,
  .key-button {
    width: 100%;
  }
}
</style>
