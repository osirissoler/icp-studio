<template>
  <section class="harmony-preview">
    <header class="preview-heading">
      <div>
        <span class="kicker"> ARMONIZACIÓN AUTOMÁTICA </span>

        <h3>Referencia musical desde tu interpretación</h3>

        <p>
          Cada nota conserva el momento y la duración detectados mientras cantabas. Puedes escuchar
          la tonalidad por separado o reproducir cada línea de armonía como referencia instrumental.
        </p>
      </div>

      <div class="key-chip">
        <span>Tonalidad usada</span>

        <strong>{{ keyLabel }}</strong>
      </div>
    </header>

    <section class="key-reference">
      <div class="key-reference-copy">
        <q-icon name="piano" />

        <div>
          <span>REFERENCIA DE TONALIDAD</span>

          <strong>{{ keyLabel }}</strong>

          <small> Escucha únicamente la tonalidad. No reproduce tu grabación ni las voces. </small>
        </div>
      </div>

      <q-btn
        unelevated
        no-caps
        icon="play_arrow"
        :label="playbackMode === 'key' ? 'Reproduciendo tonalidad' : 'Escuchar tonalidad'"
        class="key-play-button"
        :disable="isPlaying"
        @click="playKeyReference"
      />
    </section>

    <div class="section-label">
      <span>REFERENCIAS DE ARMONÍA</span>

      <small>
        Principal, Segunda, Tenor, Barítono y Bajo se reproducen como referencia instrumental.
      </small>
    </div>

    <div class="playback-actions">
      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Principal"
        class="voice-button principal"
        :disable="isPlaying"
        @click="playVoice('principal')"
      />

      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Segunda"
        class="voice-button second"
        :disable="isPlaying"
        @click="playVoice('second')"
      />

      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Tenor"
        class="voice-button tenor"
        :disable="isPlaying"
        @click="playVoice('tenor')"
      />

      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Barítono"
        class="voice-button baritone"
        :disable="isPlaying"
        @click="playVoice('baritone')"
      />

      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Bajo"
        class="voice-button bass"
        :disable="isPlaying"
        @click="playVoice('bass')"
      />

      <q-btn
        unelevated
        no-caps
        icon="piano"
        label="Todas"
        class="all-button"
        :disable="isPlaying"
        @click="playAllVoices"
      />

      <q-btn
        unelevated
        no-caps
        icon="library_music"
        label="Grabación + todas"
        class="recording-mix-button"
        :disable="isPlaying || !audioUrl"
        @click="playRecordingWithAllVoices"
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

    <div class="mix-description">
      <q-icon name="headphones" />

      <div>
        <strong>Ensayo con tu grabación</strong>

        <span>
          “Grabación + todas” reproduce tu audio original junto con las referencias Principal,
          Segunda, Tenor, Barítono y Bajo usando la misma línea de tiempo.
        </span>
      </div>
    </div>

    <div v-if="playbackError" class="playback-error">
      <q-icon name="error_outline" />

      <span>
        {{ playbackError }}
      </span>
    </div>

    <div class="table-heading">
      <div>
        <span>SECUENCIA DETECTADA</span>

        <small>
          {{ harmonyRows.length }}
          {{ harmonyRows.length === 1 ? 'nota' : 'notas' }}
        </small>
      </div>

      <div v-if="isPlaying && playbackMode !== 'key'" class="following-indicator">
        <span class="following-dot"></span>

        Siguiendo reproducción
      </div>
    </div>

    <div ref="tableWrapper" class="table-wrapper">
      <table class="harmony-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tiempo</th>
            <th>Duración</th>
            <th>Principal</th>
            <th>Segunda</th>
            <th>Tenor</th>
            <th>Barítono</th>
            <th>Bajo</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in harmonyRows"
            :key="row.id"
            :ref="(element) => setRowElement(element, index)"
            :class="{
              playing: activeNoteIndex === index,
            }"
          >
            <td class="order-cell">
              <span v-if="activeNoteIndex === index" class="playing-marker">
                <q-icon name="play_arrow" />
              </span>

              <span v-else>
                {{ index + 1 }}
              </span>
            </td>

            <td class="time-cell">
              {{ formatTimelineTime(row.startedAt) }}
              –
              {{ formatTimelineTime(row.endedAt) }}
            </td>

            <td class="duration-cell">
              {{ formatDuration(row.durationMs) }}
            </td>

            <td>
              <button
                type="button"
                class="note-cell principal-note"
                @click="playSingleNote(row, 'principal')"
              >
                {{ voiceLabel(row, 'principal') }}
              </button>
            </td>

            <td>
              <button
                type="button"
                class="note-cell second-note"
                @click="playSingleNote(row, 'second')"
              >
                {{ voiceLabel(row, 'second') }}
              </button>
            </td>

            <td>
              <button
                type="button"
                class="note-cell tenor-note"
                @click="playSingleNote(row, 'tenor')"
              >
                {{ voiceLabel(row, 'tenor') }}
              </button>
            </td>

            <td>
              <button
                type="button"
                class="note-cell baritone-note"
                @click="playSingleNote(row, 'baritone')"
              >
                {{ voiceLabel(row, 'baritone') }}
              </button>
            </td>

            <td>
              <button
                type="button"
                class="note-cell bass-note"
                @click="playSingleNote(row, 'bass')"
              >
                {{ voiceLabel(row, 'bass') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="scroll-note">
      <q-icon name="swap_vert" />

      <span>
        Cuando la secuencia sea larga, esta área tendrá su propio scroll. Durante la reproducción
        ICP Studio seguirá automáticamente la nota activa.
      </span>
    </div>

    <div class="preview-note">
      <q-icon name="info" />

      <p>
        Estas son referencias musicales automáticas. La generación de voces humanas usando el timbre
        real de tu grabación será una función separada para no mezclarla con estas referencias
        limpias.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue';

import {
  harmonizeMelodyPhrases,
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
}

interface HarmonyRow extends CapturedNote {
  voices: MelodyHarmonyVoiceNote[];
}

type PlaybackMode = 'key' | 'voice' | 'all' | 'recording' | 'single' | null;

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
  capturedNotes: CapturedNote[];
  audioUrl: string;
}>();

const isPlaying = ref(false);

const activeNoteIndex = ref<number | null>(null);

const playbackError = ref('');

const playbackMode = ref<PlaybackMode>(null);

const tableWrapper = ref<HTMLElement | null>(null);

const rowElements = new Map<number, HTMLElement>();

let audioContext: AudioContext | null = null;

let activeOscillators: OscillatorNode[] = [];

let activeGainNodes: GainNode[] = [];

let activeBufferSources: AudioBufferSourceNode[] = [];

let timers: ReturnType<typeof setTimeout>[] = [];

let decodedAudioBuffer: AudioBuffer | null = null;

let decodedAudioUrl = '';

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
    id: 'captured-preview',

    title: 'Interpretación capturada',

    lyrics: '',

    chordStepId: props.progression[0]?.id ?? null,

    notes: melodyNotes,
  };

  const harmonized = harmonizeMelodyPhrases(props.rootNote, props.scaleMode, props.progression, [
    phrase,
  ])[0];

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

  const headerHeight = 34;

  const visibleTop = wrapperRect.top + headerHeight;

  const visibleBottom = wrapperRect.bottom;

  const isAbove = rowRect.top < visibleTop;

  const isBelow = rowRect.bottom > visibleBottom;

  if (!isAbove && !isBelow) {
    return;
  }

  const target = row.offsetTop - wrapper.clientHeight / 2 + row.clientHeight / 2;

  wrapper.scrollTo({
    top: Math.max(0, target),

    behavior: 'smooth',
  });
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

function createScheduledTone(
  context: AudioContext,
  frequency: number,
  absoluteStart: number,
  durationSeconds: number,
  volume: number,
): void {
  const oscillator = context.createOscillator();

  const harmonic = context.createOscillator();

  const gain = context.createGain();

  const harmonicGain = context.createGain();

  oscillator.type = 'triangle';

  harmonic.type = 'sine';

  oscillator.frequency.setValueAtTime(frequency, absoluteStart);

  harmonic.frequency.setValueAtTime(frequency * 2, absoluteStart);

  const end = absoluteStart + Math.max(durationSeconds, 0.08);

  gain.gain.setValueAtTime(0, absoluteStart);

  gain.gain.linearRampToValueAtTime(volume, absoluteStart + 0.012);

  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, volume * 0.62),
    Math.min(end, absoluteStart + 0.22),
  );

  gain.gain.setValueAtTime(
    Math.max(0.0001, volume * 0.62),
    Math.max(absoluteStart + 0.23, end - 0.05),
  );

  gain.gain.linearRampToValueAtTime(0, end);

  harmonicGain.gain.setValueAtTime(0, absoluteStart);

  harmonicGain.gain.linearRampToValueAtTime(volume * 0.16, absoluteStart + 0.008);

  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, Math.min(end, absoluteStart + 0.18));

  oscillator.connect(gain);

  harmonic.connect(harmonicGain);

  gain.connect(context.destination);

  harmonicGain.connect(context.destination);

  oscillator.start(absoluteStart);

  harmonic.start(absoluteStart);

  oscillator.stop(end + 0.03);

  harmonic.stop(end + 0.03);

  activeOscillators.push(oscillator, harmonic);

  activeGainNodes.push(gain, harmonicGain);
}

function createPianoReferenceTone(
  context: AudioContext,
  frequency: number,
  absoluteStart: number,
  durationSeconds: number,
  volume: number,
): void {
  const partials = [
    {
      multiplier: 1,
      volume: 1,
    },
    {
      multiplier: 2,
      volume: 0.28,
    },
    {
      multiplier: 3,
      volume: 0.1,
    },
  ];

  const end = absoluteStart + Math.max(durationSeconds, 0.25);

  partials.forEach((partial) => {
    const oscillator = context.createOscillator();

    const gain = context.createGain();

    oscillator.type = partial.multiplier === 1 ? 'triangle' : 'sine';

    oscillator.frequency.setValueAtTime(frequency * partial.multiplier, absoluteStart);

    const peak = volume * partial.volume;

    gain.gain.setValueAtTime(0, absoluteStart);

    gain.gain.linearRampToValueAtTime(peak, absoluteStart + 0.008);

    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * 0.35),
      Math.min(end, absoluteStart + 0.32),
    );

    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);

    gain.connect(context.destination);

    oscillator.start(absoluteStart);

    oscillator.stop(end + 0.03);

    activeOscillators.push(oscillator);

    activeGainNodes.push(gain);
  });
}

async function playKeyReference(): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  const context = await prepareAudio();

  isPlaying.value = true;

  playbackMode.value = 'key';

  const rootMidi = 60 + props.rootNote;

  const thirdOffset = props.scaleMode === 'major' ? 4 : 3;

  const chordMidi = [rootMidi, rootMidi + thirdOffset, rootMidi + 7, rootMidi + 12];

  const leadSeconds = 0.05;

  const baseStart = context.currentTime + leadSeconds;

  chordMidi.forEach((midi, index) => {
    createPianoReferenceTone(
      context,
      midiToFrequency(midi),
      baseStart + index * 0.025,
      1.65,
      index === 0 ? 0.15 : 0.11,
    );
  });

  const finishTimer = setTimeout(() => {
    stopPlayback();
  }, 1900);

  timers.push(finishTimer);
}

function scheduleActiveRows(leadMs: number, useAbsoluteTimeline: boolean): number {
  if (!harmonyRows.value.length) {
    return 0;
  }

  const firstStart = harmonyRows.value[0]?.startedAt ?? 0;

  let totalDuration = 0;

  harmonyRows.value.forEach((row, index) => {
    const timelineStart = useAbsoluteTimeline
      ? Math.max(0, row.startedAt)
      : Math.max(0, row.startedAt - firstStart);

    const startTimer = setTimeout(() => {
      activeNoteIndex.value = index;
    }, leadMs + timelineStart);

    timers.push(startTimer);

    totalDuration = Math.max(totalDuration, timelineStart + row.durationMs);
  });

  return totalDuration;
}

async function playVoice(voiceId: MelodyVoiceId): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  if (!harmonyRows.value.length) {
    return;
  }

  const context = await prepareAudio();

  isPlaying.value = true;

  playbackMode.value = 'voice';

  const firstStart = harmonyRows.value[0]?.startedAt ?? 0;

  const leadSeconds = 0.06;

  const leadMs = leadSeconds * 1000;

  const baseStart = context.currentTime + leadSeconds;

  let totalDuration = 0;

  harmonyRows.value.forEach((row) => {
    const voice = voiceFor(row, voiceId);

    if (!voice) {
      return;
    }

    const relativeStart = Math.max(0, row.startedAt - firstStart);

    const absoluteStart = baseStart + relativeStart / 1000;

    const durationSeconds = Math.max(row.durationMs / 1000, 0.08);

    createScheduledTone(context, voice.frequency, absoluteStart, durationSeconds, 0.2);

    totalDuration = Math.max(totalDuration, relativeStart + row.durationMs);
  });

  scheduleActiveRows(leadMs, false);

  const finishTimer = setTimeout(
    () => {
      stopPlayback();
    },
    leadMs + totalDuration + 120,
  );

  timers.push(finishTimer);
}

async function playAllVoices(): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  if (!harmonyRows.value.length) {
    return;
  }

  const context = await prepareAudio();

  isPlaying.value = true;

  playbackMode.value = 'all';

  const leadSeconds = 0.06;

  const leadMs = leadSeconds * 1000;

  const baseStart = context.currentTime + leadSeconds;

  let totalDuration = 0;

  harmonyRows.value.forEach((row) => {
    const timelineStart = Math.max(0, row.startedAt);

    const absoluteStart = baseStart + timelineStart / 1000;

    const durationSeconds = Math.max(row.durationMs / 1000, 0.08);

    row.voices.forEach((voice) => {
      createScheduledTone(
        context,
        voice.frequency,
        absoluteStart,
        durationSeconds,
        voice.voiceId === 'principal' ? 0.1 : 0.065,
      );
    });

    totalDuration = Math.max(totalDuration, timelineStart + row.durationMs);
  });

  scheduleActiveRows(leadMs, true);

  const finishTimer = setTimeout(
    () => {
      stopPlayback();
    },
    leadMs + totalDuration + 120,
  );

  timers.push(finishTimer);
}

async function loadRecordedAudio(context: AudioContext): Promise<AudioBuffer> {
  if (!props.audioUrl) {
    throw new Error('No hay una grabación original disponible.');
  }

  if (decodedAudioBuffer && decodedAudioUrl === props.audioUrl) {
    return decodedAudioBuffer;
  }

  const response = await fetch(props.audioUrl);

  if (!response.ok) {
    throw new Error('No fue posible leer la grabación original.');
  }

  const arrayBuffer = await response.arrayBuffer();

  decodedAudioBuffer = await context.decodeAudioData(arrayBuffer);

  decodedAudioUrl = props.audioUrl;

  return decodedAudioBuffer;
}

function scheduleRecordedAudio(
  context: AudioContext,
  buffer: AudioBuffer,
  absoluteStart: number,
): void {
  const source = context.createBufferSource();

  const gain = context.createGain();

  source.buffer = buffer;

  gain.gain.setValueAtTime(0.78, absoluteStart);

  source.connect(gain);

  gain.connect(context.destination);

  source.start(absoluteStart);

  activeBufferSources.push(source);

  activeGainNodes.push(gain);
}

async function playRecordingWithAllVoices(): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  if (!harmonyRows.value.length || !props.audioUrl) {
    return;
  }

  try {
    const context = await prepareAudio();

    const recordedAudio = await loadRecordedAudio(context);

    const leadSeconds = 0.08;

    const leadMs = leadSeconds * 1000;

    const baseStart = context.currentTime + leadSeconds;

    isPlaying.value = true;

    playbackMode.value = 'recording';

    scheduleRecordedAudio(context, recordedAudio, baseStart);

    let voicesDuration = 0;

    harmonyRows.value.forEach((row) => {
      const timelineStart = Math.max(0, row.startedAt);

      const absoluteStart = baseStart + timelineStart / 1000;

      const durationSeconds = Math.max(row.durationMs / 1000, 0.08);

      row.voices.forEach((voice) => {
        createScheduledTone(
          context,
          voice.frequency,
          absoluteStart,
          durationSeconds,
          voice.voiceId === 'principal' ? 0.075 : 0.05,
        );
      });

      voicesDuration = Math.max(voicesDuration, timelineStart + row.durationMs);
    });

    scheduleActiveRows(leadMs, true);

    const totalDuration = Math.max(recordedAudio.duration * 1000, voicesDuration);

    const finishTimer = setTimeout(
      () => {
        stopPlayback();
      },
      leadMs + totalDuration + 150,
    );

    timers.push(finishTimer);
  } catch (error) {
    stopPlayback();

    playbackError.value =
      error instanceof Error
        ? error.message
        : 'No fue posible reproducir la grabación junto con las voces.';
  }
}

async function playSingleNote(row: HarmonyRow, voiceId: MelodyVoiceId): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  const voice = voiceFor(row, voiceId);

  if (!voice) {
    return;
  }

  const context = await prepareAudio();

  isPlaying.value = true;

  playbackMode.value = 'single';

  const rowIndex = harmonyRows.value.findIndex((item) => item.id === row.id);

  activeNoteIndex.value = rowIndex >= 0 ? rowIndex : null;

  const duration = Math.min(1.5, Math.max(0.3, row.durationMs / 1000));

  const absoluteStart = context.currentTime + 0.03;

  createScheduledTone(context, voice.frequency, absoluteStart, duration, 0.24);

  const timer = setTimeout(
    () => {
      stopPlayback();
    },
    duration * 1000 + 110,
  );

  timers.push(timer);
}

function stopPlayback(): void {
  timers.forEach((timer) => clearTimeout(timer));

  timers = [];

  if (audioContext) {
    const now = audioContext.currentTime;

    activeGainNodes.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);

        gain.gain.setValueAtTime(gain.gain.value, now);

        gain.gain.linearRampToValueAtTime(0, now + 0.025);
      } catch {
        // El nodo pudo terminar.
      }
    });

    activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop(now + 0.03);
      } catch {
        // El oscilador pudo terminar.
      }
    });

    activeBufferSources.forEach((source) => {
      try {
        source.stop(now + 0.03);
      } catch {
        // La grabación pudo terminar.
      }
    });
  }

  activeOscillators = [];

  activeGainNodes = [];

  activeBufferSources = [];

  isPlaying.value = false;

  playbackMode.value = null;

  activeNoteIndex.value = null;
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

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatTimelineTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

onBeforeUnmount(() => {
  stopPlayback();

  rowElements.clear();

  decodedAudioBuffer = null;

  decodedAudioUrl = '';

  if (audioContext) {
    void audioContext.close();

    audioContext = null;
  }
});
</script>

<style scoped>
.harmony-preview {
  margin-top: 14px;
  padding: 15px;
  background: linear-gradient(180deg, rgb(167 139 250 / 5%), transparent 160px), #0a1521;
  border: 1px solid #26394e;
  border-radius: 13px;
}

.preview-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.kicker {
  color: #a78bfa;
  font-size: 7px;
  font-weight: 750;
  letter-spacing: 0.11em;
}

.preview-heading h3 {
  margin: 3px 0;
  color: #e7edf5;
  font-size: 14px;
}

.preview-heading p {
  max-width: 650px;
  margin: 0;
  color: #6f8298;
  font-size: 8px;
  line-height: 1.45;
}

.key-chip {
  display: flex;
  min-width: 120px;
  flex-direction: column;
  padding: 7px 9px;
  background: rgb(167 139 250 / 7%);
  border: 1px solid rgb(167 139 250 / 20%);
  border-radius: 8px;
  text-align: right;
}

.key-chip span {
  color: #756b94;
  font-size: 6px;
}

.key-chip strong {
  color: #ddd6fe;
  font-size: 9px;
}

.key-reference {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
  padding: 11px 12px;
  background: rgb(96 165 250 / 6%);
  border: 1px solid rgb(96 165 250 / 18%);
  border-radius: 10px;
}

.key-reference-copy {
  display: flex;
  align-items: center;
  gap: 9px;
}

.key-reference-copy > .q-icon {
  flex: 0 0 auto;
  color: #93c5fd;
  font-size: 25px;
}

.key-reference-copy > div {
  display: flex;
  flex-direction: column;
}

.key-reference-copy span {
  color: #647f9e;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.09em;
}

.key-reference-copy strong {
  margin-top: 1px;
  color: #dbeafe;
  font-size: 13px;
}

.key-reference-copy small {
  margin-top: 2px;
  color: #6f849c;
  font-size: 7px;
}

.key-play-button {
  flex: 0 0 auto;
  min-height: 32px;
  color: #eff6ff;
  background: #275d8c;
  border-radius: 8px;
  font-size: 8px;
}

.section-label {
  display: flex;
  flex-direction: column;
  margin-top: 13px;
}

.section-label span,
.table-heading span {
  color: #8598ad;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.09em;
}

.section-label small,
.table-heading small {
  margin-top: 1px;
  color: #5e7288;
  font-size: 7px;
}

.playback-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.voice-button,
.all-button,
.recording-mix-button,
.stop-button {
  min-height: 31px;
  border-radius: 8px;
  font-size: 8px;
}

.principal {
  color: #fce7f3;
  background: rgb(244 114 182 / 15%);
}

.second {
  color: #dbeafe;
  background: rgb(96 165 250 / 14%);
}

.tenor {
  color: #ede9fe;
  background: rgb(167 139 250 / 14%);
}

.baritone {
  color: #d1fae5;
  background: rgb(52 211 153 / 14%);
}

.bass {
  color: #fef3c7;
  background: rgb(251 191 36 / 14%);
}

.all-button {
  color: white;
  background: #5e4bbb;
}

.recording-mix-button {
  color: #ecfeff;
  background: #0f766e;
}

.stop-button {
  color: #a9b6c5;
}

.mix-description {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  padding: 8px 10px;
  background: rgb(20 184 166 / 5%);
  border: 1px solid rgb(20 184 166 / 14%);
  border-radius: 8px;
}

.mix-description > .q-icon {
  flex: 0 0 auto;
  color: #2dd4bf;
  font-size: 18px;
}

.mix-description > div {
  display: flex;
  flex-direction: column;
}

.mix-description strong {
  color: #99f6e4;
  font-size: 7px;
}

.mix-description span {
  margin-top: 1px;
  color: #668d89;
  font-size: 7px;
  line-height: 1.4;
}

.playback-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  padding: 8px 9px;
  color: #fecdd3;
  background: rgb(251 113 133 / 7%);
  border: 1px solid rgb(251 113 133 / 16%);
  border-radius: 8px;
  font-size: 7px;
}

.table-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.table-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.following-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #93c5fd;
  font-size: 7px;
}

.following-dot {
  width: 6px;
  height: 6px;
  background: #60a5fa;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(96 165 250 / 8%);
}

.table-wrapper {
  position: relative;
  max-height: 330px;
  margin-top: 7px;
  overflow: auto;
  overscroll-behavior: contain;
  background: #0c1723;
  border: 1px solid #22364b;
  border-radius: 10px;
  scrollbar-gutter: stable;
}

.harmony-table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
  background: #0c1723;
}

.harmony-table thead {
  position: sticky;
  z-index: 3;
  top: 0;
}

.harmony-table th {
  padding: 8px 7px;
  color: #62768d;
  background: #101d2a;
  border-bottom: 1px solid #26394e;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-align: left;
  text-transform: uppercase;
}

.harmony-table td {
  padding: 6px 7px;
  color: #93a4b7;
  border-bottom: 1px solid #172638;
  font-size: 7px;
  transition:
    background 120ms ease,
    color 120ms ease;
}

.harmony-table tr:last-child td {
  border-bottom: 0;
}

.harmony-table tr.playing td {
  color: #dbeafe;
  background: rgb(96 165 250 / 13%);
}

.harmony-table tr.playing td:first-child {
  box-shadow: inset 3px 0 0 #60a5fa;
}

.order-cell {
  width: 35px;
  color: #52677d !important;
}

.playing-marker {
  display: inline-grid;
  width: 20px;
  height: 20px;
  place-items: center;
  color: #bfdbfe;
  background: rgb(96 165 250 / 12%);
  border-radius: 50%;
}

.playing-marker .q-icon {
  font-size: 13px;
}

.time-cell,
.duration-cell {
  white-space: nowrap;
}

.note-cell {
  min-width: 54px;
  padding: 5px 7px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 8px;
}

.principal-note {
  color: #f9a8d4;
  background: rgb(244 114 182 / 6%);
}

.second-note {
  color: #93c5fd;
  background: rgb(96 165 250 / 6%);
}

.tenor-note {
  color: #c4b5fd;
  background: rgb(167 139 250 / 6%);
}

.baritone-note {
  color: #6ee7b7;
  background: rgb(52 211 153 / 6%);
}

.bass-note {
  color: #fcd34d;
  background: rgb(251 191 36 / 6%);
}

.note-cell:hover {
  border-color: #41556c;
}

.scroll-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  color: #526a83;
  font-size: 6px;
}

.scroll-note .q-icon {
  color: #6687a8;
  font-size: 13px;
}

.preview-note {
  display: flex;
  gap: 7px;
  margin-top: 9px;
  padding: 8px 9px;
  color: #776f5d;
  background: rgb(251 191 36 / 4%);
  border-radius: 8px;
}

.preview-note .q-icon {
  flex: 0 0 auto;
  color: #fbbf24;
  font-size: 15px;
}

.preview-note p {
  margin: 0;
  font-size: 7px;
  line-height: 1.45;
}

@media (max-width: 700px) {
  .preview-heading,
  .key-reference {
    align-items: stretch;
    flex-direction: column;
  }

  .key-chip {
    align-self: flex-start;
    text-align: left;
  }

  .key-play-button {
    width: 100%;
  }

  .table-wrapper {
    max-height: 280px;
  }
}
</style>
<template>
  <section class="harmony-preview">
    <header class="preview-heading">
      <div>
        <span class="kicker"> ARMONIZACIÓN AUTOMÁTICA </span>

        <h3>Referencia musical desde tu interpretación</h3>

        <p>
          Cada nota conserva el momento y la duración detectados mientras cantabas. Puedes escuchar
          la tonalidad por separado o reproducir cada línea de armonía como referencia instrumental.
        </p>
      </div>

      <div class="key-chip">
        <span>Tonalidad usada</span>

        <strong>{{ keyLabel }}</strong>
      </div>
    </header>

    <section class="key-reference">
      <div class="key-reference-copy">
        <q-icon name="piano" />

        <div>
          <span>REFERENCIA DE TONALIDAD</span>

          <strong>{{ keyLabel }}</strong>

          <small> Escucha únicamente la tonalidad. No reproduce tu grabación ni las voces. </small>
        </div>
      </div>

      <q-btn
        unelevated
        no-caps
        icon="play_arrow"
        :label="playbackMode === 'key' ? 'Reproduciendo tonalidad' : 'Escuchar tonalidad'"
        class="key-play-button"
        :disable="isPlaying"
        @click="playKeyReference"
      />
    </section>

    <div class="section-label">
      <span>REFERENCIAS DE ARMONÍA</span>

      <small>
        Principal, Segunda, Tenor, Barítono y Bajo se reproducen como referencia instrumental.
      </small>
    </div>

    <div class="playback-actions">
      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Principal"
        class="voice-button principal"
        :disable="isPlaying"
        @click="playVoice('principal')"
      />

      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Segunda"
        class="voice-button second"
        :disable="isPlaying"
        @click="playVoice('second')"
      />

      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Tenor"
        class="voice-button tenor"
        :disable="isPlaying"
        @click="playVoice('tenor')"
      />

      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Barítono"
        class="voice-button baritone"
        :disable="isPlaying"
        @click="playVoice('baritone')"
      />

      <q-btn
        unelevated
        no-caps
        icon="music_note"
        label="Bajo"
        class="voice-button bass"
        :disable="isPlaying"
        @click="playVoice('bass')"
      />

      <q-btn
        unelevated
        no-caps
        icon="piano"
        label="Todas"
        class="all-button"
        :disable="isPlaying"
        @click="playAllVoices"
      />

      <q-btn
        unelevated
        no-caps
        icon="library_music"
        label="Grabación + todas"
        class="recording-mix-button"
        :disable="isPlaying || !audioUrl"
        @click="playRecordingWithAllVoices"
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

    <div class="mix-description">
      <q-icon name="headphones" />

      <div>
        <strong>Ensayo con tu grabación</strong>

        <span>
          “Grabación + todas” reproduce tu audio original junto con las referencias Principal,
          Segunda, Tenor, Barítono y Bajo usando la misma línea de tiempo.
        </span>
      </div>
    </div>

    <section class="human-voice-section">
      <header class="human-voice-heading">
        <div>
          <span>VOCES USANDO MI GRABACIÓN</span>

          <strong>Preparación del motor vocal</strong>

          <small>
            ICP Studio ya calcula cómo debe transformarse tu voz original para cada línea de
            armonía. El renderizado PSOLA se conectará en el próximo paso.
          </small>
        </div>

        <div class="engine-status">
          <span class="engine-status-dot"></span>

          Motor preparado
        </div>
      </header>

      <div class="human-voice-plans">
        <article
          v-for="plan in humanVoicePlans"
          :key="plan.voiceId"
          class="human-voice-card"
          :class="plan.voiceId"
        >
          <div class="human-voice-card-top">
            <div>
              <span>{{ humanVoiceLabel(plan.voiceId) }}</span>

              <strong>{{ plan.segments.length }} segmentos</strong>
            </div>

            <q-icon name="record_voice_over" />
          </div>

          <div class="human-voice-stats">
            <div>
              <span>Transformar</span>

              <strong>{{ plan.transformedSegments }}</strong>
            </div>

            <div>
              <span>Sin cambio</span>

              <strong>{{ plan.passthroughSegments }}</strong>
            </div>

            <div>
              <span>Promedio</span>

              <strong>
                {{ formatSemitoneShift(plan.averageAbsoluteShift) }}
              </strong>
            </div>

            <div>
              <span>Máximo</span>

              <strong>
                {{ formatSemitoneShift(plan.maximumAbsoluteShift) }}
              </strong>
            </div>
          </div>

          <div class="human-voice-ready">
            <q-icon name="check_circle" />

            <span> Línea vocal calculada </span>
          </div>
        </article>
      </div>

      <div class="human-voice-explanation">
        <q-icon name="graphic_eq" />

        <div>
          <strong>La voz todavía no se está sintetizando.</strong>

          <span>
            Estos datos son el plan que usará el procesador vocal para conservar la duración de cada
            sílaba y modificar únicamente la afinación necesaria. El siguiente bloque implementará
            el procesamiento de audio real.
          </span>
        </div>
      </div>
    </section>

    <div v-if="playbackError" class="playback-error">
      <q-icon name="error_outline" />

      <span>
        {{ playbackError }}
      </span>
    </div>

    <div class="table-heading">
      <div>
        <span>SECUENCIA DETECTADA</span>

        <small>
          {{ harmonyRows.length }}
          {{ harmonyRows.length === 1 ? 'nota' : 'notas' }}
        </small>
      </div>

      <div v-if="isPlaying && playbackMode !== 'key'" class="following-indicator">
        <span class="following-dot"></span>

        Siguiendo reproducción
      </div>
    </div>

    <div ref="tableWrapper" class="table-wrapper">
      <table class="harmony-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tiempo</th>
            <th>Duración</th>
            <th>Principal</th>
            <th>Segunda</th>
            <th>Tenor</th>
            <th>Barítono</th>
            <th>Bajo</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in harmonyRows"
            :key="row.id"
            :ref="(element) => setRowElement(element, index)"
            :class="{
              playing: activeNoteIndex === index,
            }"
          >
            <td class="order-cell">
              <span v-if="activeNoteIndex === index" class="playing-marker">
                <q-icon name="play_arrow" />
              </span>

              <span v-else>
                {{ index + 1 }}
              </span>
            </td>

            <td class="time-cell">
              {{ formatTimelineTime(row.startedAt) }}
              –
              {{ formatTimelineTime(row.endedAt) }}
            </td>

            <td class="duration-cell">
              {{ formatDuration(row.durationMs) }}
            </td>

            <td>
              <button
                type="button"
                class="note-cell principal-note"
                @click="playSingleNote(row, 'principal')"
              >
                {{ voiceLabel(row, 'principal') }}
              </button>
            </td>

            <td>
              <button
                type="button"
                class="note-cell second-note"
                @click="playSingleNote(row, 'second')"
              >
                {{ voiceLabel(row, 'second') }}
              </button>
            </td>

            <td>
              <button
                type="button"
                class="note-cell tenor-note"
                @click="playSingleNote(row, 'tenor')"
              >
                {{ voiceLabel(row, 'tenor') }}
              </button>
            </td>

            <td>
              <button
                type="button"
                class="note-cell baritone-note"
                @click="playSingleNote(row, 'baritone')"
              >
                {{ voiceLabel(row, 'baritone') }}
              </button>
            </td>

            <td>
              <button
                type="button"
                class="note-cell bass-note"
                @click="playSingleNote(row, 'bass')"
              >
                {{ voiceLabel(row, 'bass') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="scroll-note">
      <q-icon name="swap_vert" />

      <span>
        Cuando la secuencia sea larga, esta área tendrá su propio scroll. Durante la reproducción
        ICP Studio seguirá automáticamente la nota activa.
      </span>
    </div>

    <div class="preview-note">
      <q-icon name="info" />

      <p>
        Las referencias instrumentales y las futuras voces humanas permanecerán separadas. Así
        puedes usar el sonido limpio como guía o escuchar posteriormente la armonía utilizando el
        timbre de tu propia grabación.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue';

import {
  harmonizeMelodyPhrases,
  type ChordStep,
  type MelodyHarmonyVoiceNote,
  type MelodyNote,
  type MelodyNoteDuration,
  type MelodyVoiceId,
  type ScaleMode,
} from '../../../shared/harmony';

import { midiToFrequency, notes } from '../../../shared/music';

import {
  createHumanVoiceRenderPlan,
  type HumanVoiceId,
  type HumanVoiceRenderPlan,
  type HumanVoiceSourceNote,
  type HumanVoiceTargetNote,
} from './human-voice-engine';

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

type PlaybackMode = 'key' | 'voice' | 'all' | 'recording' | 'single' | null;

const humanVoiceIds: HumanVoiceId[] = ['principal', 'second', 'tenor', 'baritone', 'bass'];

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
  capturedNotes: CapturedNote[];
  audioUrl: string;
}>();

const isPlaying = ref(false);

const activeNoteIndex = ref<number | null>(null);

const playbackError = ref('');

const playbackMode = ref<PlaybackMode>(null);

const tableWrapper = ref<HTMLElement | null>(null);

const rowElements = new Map<number, HTMLElement>();

let audioContext: AudioContext | null = null;

let activeOscillators: OscillatorNode[] = [];

let activeGainNodes: GainNode[] = [];

let activeBufferSources: AudioBufferSourceNode[] = [];

let timers: ReturnType<typeof setTimeout>[] = [];

let decodedAudioBuffer: AudioBuffer | null = null;

let decodedAudioUrl = '';

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
    id: 'captured-preview',

    title: 'Interpretación capturada',

    lyrics: '',

    chordStepId: props.progression[0]?.id ?? null,

    notes: melodyNotes,
  };

  const harmonized = harmonizeMelodyPhrases(props.rootNote, props.scaleMode, props.progression, [
    phrase,
  ])[0];

  if (!harmonized) {
    return [];
  }

  return props.capturedNotes.map((captured, index) => ({
    ...captured,

    voices: harmonized.notes[index]?.voices ?? [],
  }));
});

const capturedTimelineDuration = computed(() => {
  return harmonyRows.value.reduce((maximum, row) => Math.max(maximum, row.endedAt), 0);
});

const humanVoiceSourceNotes = computed<HumanVoiceSourceNote[]>(() => {
  return harmonyRows.value.map((row) => ({
    id: row.id,

    noteIndex: row.noteIndex,

    octave: row.octave,

    startedAt: row.startedAt,

    endedAt: row.endedAt,

    durationMs: row.durationMs,

    confidence: row.confidence,

    cents: row.cents,
  }));
});

const humanVoiceTargetNotes = computed<HumanVoiceTargetNote[]>(() => {
  const targets: HumanVoiceTargetNote[] = [];

  harmonyRows.value.forEach((row) => {
    row.voices.forEach((voice) => {
      if (!isHumanVoiceId(voice.voiceId)) {
        return;
      }

      targets.push({
        sourceNoteId: row.id,

        voiceId: voice.voiceId,

        noteIndex: voice.noteIndex,

        octave: voice.octave,
      });
    });
  });

  return targets;
});

const humanVoicePlans = computed<HumanVoiceRenderPlan[]>(() => {
  return humanVoiceIds.map((voiceId) =>
    createHumanVoiceRenderPlan(
      voiceId,
      humanVoiceSourceNotes.value,
      humanVoiceTargetNotes.value,
      capturedTimelineDuration.value,
    ),
  );
});

watch(activeNoteIndex, (index) => {
  if (index === null) {
    return;
  }

  void nextTick(() => {
    scrollToActiveRow(index);
  });
});

function isHumanVoiceId(value: MelodyVoiceId): value is HumanVoiceId {
  return humanVoiceIds.includes(value);
}

function humanVoiceLabel(voiceId: HumanVoiceId): string {
  switch (voiceId) {
    case 'principal':
      return 'Mi voz: Principal';

    case 'second':
      return 'Mi voz: Segunda';

    case 'tenor':
      return 'Mi voz: Tenor';

    case 'baritone':
      return 'Mi voz: Barítono';

    case 'bass':
      return 'Mi voz: Bajo';
  }
}

function formatSemitoneShift(value: number): string {
  return `${value.toFixed(1)} st`;
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

  const headerHeight = 34;

  const visibleTop = wrapperRect.top + headerHeight;

  const visibleBottom = wrapperRect.bottom;

  const isAbove = rowRect.top < visibleTop;

  const isBelow = rowRect.bottom > visibleBottom;

  if (!isAbove && !isBelow) {
    return;
  }

  const target = row.offsetTop - wrapper.clientHeight / 2 + row.clientHeight / 2;

  wrapper.scrollTo({
    top: Math.max(0, target),

    behavior: 'smooth',
  });
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

function createScheduledTone(
  context: AudioContext,
  frequency: number,
  absoluteStart: number,
  durationSeconds: number,
  volume: number,
): void {
  const oscillator = context.createOscillator();

  const harmonic = context.createOscillator();

  const gain = context.createGain();

  const harmonicGain = context.createGain();

  oscillator.type = 'triangle';

  harmonic.type = 'sine';

  oscillator.frequency.setValueAtTime(frequency, absoluteStart);

  harmonic.frequency.setValueAtTime(frequency * 2, absoluteStart);

  const duration = Math.max(durationSeconds, 0.06);

  const end = absoluteStart + duration;

  /*
   * Todos los puntos de la envolvente se calculan como
   * porcentaje de la duración. De esta manera funcionan
   * también con notas cortas sin programar eventos después
   * del final del sonido.
   */
  const attackEnd = absoluteStart + Math.min(0.012, duration * 0.18);

  const decayEnd = absoluteStart + Math.min(duration * 0.55, 0.22);

  const releaseStart =
    absoluteStart + Math.max(duration * 0.68, duration - Math.min(0.05, duration * 0.25));

  const safeDecayEnd = Math.max(attackEnd + 0.001, Math.min(decayEnd, end - 0.002));

  const safeReleaseStart = Math.max(safeDecayEnd + 0.001, Math.min(releaseStart, end - 0.001));

  gain.gain.setValueAtTime(0, absoluteStart);

  gain.gain.linearRampToValueAtTime(volume, attackEnd);

  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.62), safeDecayEnd);

  gain.gain.setValueAtTime(Math.max(0.0001, volume * 0.62), safeReleaseStart);

  gain.gain.linearRampToValueAtTime(0, end);

  const harmonicAttackEnd = absoluteStart + Math.min(0.008, duration * 0.14);

  const harmonicDecayEnd = Math.max(
    harmonicAttackEnd + 0.001,
    Math.min(absoluteStart + Math.min(0.18, duration * 0.72), end),
  );

  harmonicGain.gain.setValueAtTime(0, absoluteStart);

  harmonicGain.gain.linearRampToValueAtTime(volume * 0.16, harmonicAttackEnd);

  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, harmonicDecayEnd);

  oscillator.connect(gain);

  harmonic.connect(harmonicGain);

  gain.connect(context.destination);

  harmonicGain.connect(context.destination);

  oscillator.start(absoluteStart);

  harmonic.start(absoluteStart);

  oscillator.stop(end + 0.03);

  harmonic.stop(end + 0.03);

  activeOscillators.push(oscillator, harmonic);

  activeGainNodes.push(gain, harmonicGain);
}

function createPianoReferenceTone(
  context: AudioContext,
  frequency: number,
  absoluteStart: number,
  durationSeconds: number,
  volume: number,
): void {
  const partials = [
    {
      multiplier: 1,
      volume: 1,
    },
    {
      multiplier: 2,
      volume: 0.28,
    },
    {
      multiplier: 3,
      volume: 0.1,
    },
  ];

  const end = absoluteStart + Math.max(durationSeconds, 0.25);

  partials.forEach((partial) => {
    const oscillator = context.createOscillator();

    const gain = context.createGain();

    oscillator.type = partial.multiplier === 1 ? 'triangle' : 'sine';

    oscillator.frequency.setValueAtTime(frequency * partial.multiplier, absoluteStart);

    const peak = volume * partial.volume;

    gain.gain.setValueAtTime(0, absoluteStart);

    gain.gain.linearRampToValueAtTime(peak, absoluteStart + 0.008);

    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * 0.35),
      Math.min(end, absoluteStart + 0.32),
    );

    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);

    gain.connect(context.destination);

    oscillator.start(absoluteStart);

    oscillator.stop(end + 0.03);

    activeOscillators.push(oscillator);

    activeGainNodes.push(gain);
  });
}

async function playKeyReference(): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  const context = await prepareAudio();

  isPlaying.value = true;

  playbackMode.value = 'key';

  const rootMidi = 60 + props.rootNote;

  const thirdOffset = props.scaleMode === 'major' ? 4 : 3;

  const chordMidi = [rootMidi, rootMidi + thirdOffset, rootMidi + 7, rootMidi + 12];

  const leadSeconds = 0.05;

  const baseStart = context.currentTime + leadSeconds;

  chordMidi.forEach((midi, index) => {
    createPianoReferenceTone(
      context,
      midiToFrequency(midi),
      baseStart + index * 0.025,
      1.65,
      index === 0 ? 0.15 : 0.11,
    );
  });

  const finishTimer = setTimeout(() => {
    stopPlayback();
  }, 1900);

  timers.push(finishTimer);
}

function scheduleActiveRows(leadMs: number, useAbsoluteTimeline: boolean): number {
  if (!harmonyRows.value.length) {
    return 0;
  }

  const firstStart = harmonyRows.value[0]?.startedAt ?? 0;

  let totalDuration = 0;

  harmonyRows.value.forEach((row, index) => {
    const timelineStart = useAbsoluteTimeline
      ? Math.max(0, row.startedAt)
      : Math.max(0, row.startedAt - firstStart);

    const startTimer = setTimeout(() => {
      activeNoteIndex.value = index;
    }, leadMs + timelineStart);

    timers.push(startTimer);

    totalDuration = Math.max(totalDuration, timelineStart + row.durationMs);
  });

  return totalDuration;
}

async function playVoice(voiceId: MelodyVoiceId): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  if (!harmonyRows.value.length) {
    return;
  }

  const context = await prepareAudio();

  isPlaying.value = true;

  playbackMode.value = 'voice';

  const firstStart = harmonyRows.value[0]?.startedAt ?? 0;

  const leadSeconds = 0.06;

  const leadMs = leadSeconds * 1000;

  const baseStart = context.currentTime + leadSeconds;

  let totalDuration = 0;

  harmonyRows.value.forEach((row) => {
    const voice = voiceFor(row, voiceId);

    if (!voice) {
      return;
    }

    const relativeStart = Math.max(0, row.startedAt - firstStart);

    const absoluteStart = baseStart + relativeStart / 1000;

    const durationSeconds = Math.max(row.durationMs / 1000, 0.06);

    createScheduledTone(context, voice.frequency, absoluteStart, durationSeconds, 0.2);

    totalDuration = Math.max(totalDuration, relativeStart + row.durationMs);
  });

  scheduleActiveRows(leadMs, false);

  const finishTimer = setTimeout(
    () => {
      stopPlayback();
    },
    leadMs + totalDuration + 120,
  );

  timers.push(finishTimer);
}

async function playAllVoices(): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  if (!harmonyRows.value.length) {
    return;
  }

  const context = await prepareAudio();

  isPlaying.value = true;

  playbackMode.value = 'all';

  const leadSeconds = 0.06;

  const leadMs = leadSeconds * 1000;

  const baseStart = context.currentTime + leadSeconds;

  let totalDuration = 0;

  harmonyRows.value.forEach((row) => {
    const timelineStart = Math.max(0, row.startedAt);

    const absoluteStart = baseStart + timelineStart / 1000;

    const durationSeconds = Math.max(row.durationMs / 1000, 0.06);

    row.voices.forEach((voice) => {
      createScheduledTone(
        context,
        voice.frequency,
        absoluteStart,
        durationSeconds,
        voice.voiceId === 'principal' ? 0.1 : 0.065,
      );
    });

    totalDuration = Math.max(totalDuration, timelineStart + row.durationMs);
  });

  scheduleActiveRows(leadMs, true);

  const finishTimer = setTimeout(
    () => {
      stopPlayback();
    },
    leadMs + totalDuration + 120,
  );

  timers.push(finishTimer);
}

async function loadRecordedAudio(context: AudioContext): Promise<AudioBuffer> {
  if (!props.audioUrl) {
    throw new Error('No hay una grabación original disponible.');
  }

  if (decodedAudioBuffer && decodedAudioUrl === props.audioUrl) {
    return decodedAudioBuffer;
  }

  const response = await fetch(props.audioUrl);

  if (!response.ok) {
    throw new Error('No fue posible leer la grabación original.');
  }

  const arrayBuffer = await response.arrayBuffer();

  decodedAudioBuffer = await context.decodeAudioData(arrayBuffer);

  decodedAudioUrl = props.audioUrl;

  return decodedAudioBuffer;
}

function scheduleRecordedAudio(
  context: AudioContext,
  buffer: AudioBuffer,
  absoluteStart: number,
): void {
  const source = context.createBufferSource();

  const gain = context.createGain();

  source.buffer = buffer;

  gain.gain.setValueAtTime(0.78, absoluteStart);

  source.connect(gain);

  gain.connect(context.destination);

  source.start(absoluteStart);

  activeBufferSources.push(source);

  activeGainNodes.push(gain);
}

async function playRecordingWithAllVoices(): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  if (!harmonyRows.value.length || !props.audioUrl) {
    return;
  }

  try {
    const context = await prepareAudio();

    const recordedAudio = await loadRecordedAudio(context);

    const leadSeconds = 0.08;

    const leadMs = leadSeconds * 1000;

    const baseStart = context.currentTime + leadSeconds;

    isPlaying.value = true;

    playbackMode.value = 'recording';

    scheduleRecordedAudio(context, recordedAudio, baseStart);

    let voicesDuration = 0;

    harmonyRows.value.forEach((row) => {
      const timelineStart = Math.max(0, row.startedAt);

      const absoluteStart = baseStart + timelineStart / 1000;

      const durationSeconds = Math.max(row.durationMs / 1000, 0.06);

      row.voices.forEach((voice) => {
        createScheduledTone(
          context,
          voice.frequency,
          absoluteStart,
          durationSeconds,
          voice.voiceId === 'principal' ? 0.075 : 0.05,
        );
      });

      voicesDuration = Math.max(voicesDuration, timelineStart + row.durationMs);
    });

    scheduleActiveRows(leadMs, true);

    const totalDuration = Math.max(recordedAudio.duration * 1000, voicesDuration);

    const finishTimer = setTimeout(
      () => {
        stopPlayback();
      },
      leadMs + totalDuration + 150,
    );

    timers.push(finishTimer);
  } catch (error) {
    stopPlayback();

    playbackError.value =
      error instanceof Error
        ? error.message
        : 'No fue posible reproducir la grabación junto con las voces.';
  }
}

async function playSingleNote(row: HarmonyRow, voiceId: MelodyVoiceId): Promise<void> {
  stopPlayback();

  playbackError.value = '';

  const voice = voiceFor(row, voiceId);

  if (!voice) {
    return;
  }

  const context = await prepareAudio();

  isPlaying.value = true;

  playbackMode.value = 'single';

  const rowIndex = harmonyRows.value.findIndex((item) => item.id === row.id);

  activeNoteIndex.value = rowIndex >= 0 ? rowIndex : null;

  const duration = Math.min(1.5, Math.max(0.08, row.durationMs / 1000));

  const absoluteStart = context.currentTime + 0.03;

  createScheduledTone(context, voice.frequency, absoluteStart, duration, 0.24);

  const timer = setTimeout(
    () => {
      stopPlayback();
    },
    duration * 1000 + 110,
  );

  timers.push(timer);
}

function stopPlayback(): void {
  timers.forEach((timer) => clearTimeout(timer));

  timers = [];

  if (audioContext) {
    const now = audioContext.currentTime;

    activeGainNodes.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);

        gain.gain.setValueAtTime(gain.gain.value, now);

        gain.gain.linearRampToValueAtTime(0, now + 0.025);
      } catch {
        // El nodo pudo terminar.
      }
    });

    activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop(now + 0.03);
      } catch {
        // El oscilador pudo terminar.
      }
    });

    activeBufferSources.forEach((source) => {
      try {
        source.stop(now + 0.03);
      } catch {
        // La grabación pudo terminar.
      }
    });
  }

  activeOscillators = [];

  activeGainNodes = [];

  activeBufferSources = [];

  isPlaying.value = false;

  playbackMode.value = null;

  activeNoteIndex.value = null;
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

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatTimelineTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

onBeforeUnmount(() => {
  stopPlayback();

  rowElements.clear();

  decodedAudioBuffer = null;

  decodedAudioUrl = '';

  if (audioContext) {
    void audioContext.close();

    audioContext = null;
  }
});
</script>

<style scoped>
.harmony-preview {
  margin-top: 14px;
  padding: 15px;
  background: linear-gradient(180deg, rgb(167 139 250 / 5%), transparent 160px), #0a1521;
  border: 1px solid #26394e;
  border-radius: 13px;
}

.preview-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.kicker {
  color: #a78bfa;
  font-size: 7px;
  font-weight: 750;
  letter-spacing: 0.11em;
}

.preview-heading h3 {
  margin: 3px 0;
  color: #e7edf5;
  font-size: 14px;
}

.preview-heading p {
  max-width: 650px;
  margin: 0;
  color: #6f8298;
  font-size: 8px;
  line-height: 1.45;
}

.key-chip {
  display: flex;
  min-width: 120px;
  flex-direction: column;
  padding: 7px 9px;
  background: rgb(167 139 250 / 7%);
  border: 1px solid rgb(167 139 250 / 20%);
  border-radius: 8px;
  text-align: right;
}

.key-chip span {
  color: #756b94;
  font-size: 6px;
}

.key-chip strong {
  color: #ddd6fe;
  font-size: 9px;
}

.key-reference {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
  padding: 11px 12px;
  background: rgb(96 165 250 / 6%);
  border: 1px solid rgb(96 165 250 / 18%);
  border-radius: 10px;
}

.key-reference-copy {
  display: flex;
  align-items: center;
  gap: 9px;
}

.key-reference-copy > .q-icon {
  flex: 0 0 auto;
  color: #93c5fd;
  font-size: 25px;
}

.key-reference-copy > div {
  display: flex;
  flex-direction: column;
}

.key-reference-copy span {
  color: #647f9e;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.09em;
}

.key-reference-copy strong {
  margin-top: 1px;
  color: #dbeafe;
  font-size: 13px;
}

.key-reference-copy small {
  margin-top: 2px;
  color: #6f849c;
  font-size: 7px;
}

.key-play-button {
  flex: 0 0 auto;
  min-height: 32px;
  color: #eff6ff;
  background: #275d8c;
  border-radius: 8px;
  font-size: 8px;
}

.section-label {
  display: flex;
  flex-direction: column;
  margin-top: 13px;
}

.section-label span,
.table-heading span {
  color: #8598ad;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.09em;
}

.section-label small,
.table-heading small {
  margin-top: 1px;
  color: #5e7288;
  font-size: 7px;
}

.playback-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.voice-button,
.all-button,
.recording-mix-button,
.stop-button {
  min-height: 31px;
  border-radius: 8px;
  font-size: 8px;
}

.principal {
  color: #fce7f3;
  background: rgb(244 114 182 / 15%);
}

.second {
  color: #dbeafe;
  background: rgb(96 165 250 / 14%);
}

.tenor {
  color: #ede9fe;
  background: rgb(167 139 250 / 14%);
}

.baritone {
  color: #d1fae5;
  background: rgb(52 211 153 / 14%);
}

.bass {
  color: #fef3c7;
  background: rgb(251 191 36 / 14%);
}

.all-button {
  color: white;
  background: #5e4bbb;
}

.recording-mix-button {
  color: #ecfeff;
  background: #0f766e;
}

.stop-button {
  color: #a9b6c5;
}

.mix-description {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  padding: 8px 10px;
  background: rgb(20 184 166 / 5%);
  border: 1px solid rgb(20 184 166 / 14%);
  border-radius: 8px;
}

.mix-description > .q-icon {
  flex: 0 0 auto;
  color: #2dd4bf;
  font-size: 18px;
}

.mix-description > div {
  display: flex;
  flex-direction: column;
}

.mix-description strong {
  color: #99f6e4;
  font-size: 7px;
}

.mix-description span {
  margin-top: 1px;
  color: #668d89;
  font-size: 7px;
  line-height: 1.4;
}

.human-voice-section {
  margin-top: 14px;
  padding: 12px;
  background: linear-gradient(135deg, rgb(34 211 238 / 5%), transparent 55%), #0c1824;
  border: 1px solid rgb(34 211 238 / 17%);
  border-radius: 11px;
}

.human-voice-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.human-voice-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.human-voice-heading > div:first-child > span {
  color: #67e8f9;
  font-size: 7px;
  font-weight: 750;
  letter-spacing: 0.1em;
}

.human-voice-heading strong {
  margin-top: 2px;
  color: #cffafe;
  font-size: 11px;
}

.human-voice-heading small {
  max-width: 650px;
  margin-top: 2px;
  color: #688793;
  font-size: 7px;
  line-height: 1.45;
}

.engine-status {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  color: #99f6e4;
  background: rgb(45 212 191 / 7%);
  border: 1px solid rgb(45 212 191 / 16%);
  border-radius: 7px;
  font-size: 7px;
}

.engine-status-dot {
  width: 6px;
  height: 6px;
  background: #2dd4bf;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(45 212 191 / 8%);
}

.human-voice-plans {
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr));
  gap: 7px;
  margin-top: 10px;
}

.human-voice-card {
  min-width: 0;
  padding: 9px;
  border: 1px solid #20384a;
  border-radius: 9px;
}

.human-voice-card.principal {
  background: rgb(244 114 182 / 5%);
  border-color: rgb(244 114 182 / 15%);
}

.human-voice-card.second {
  background: rgb(96 165 250 / 5%);
  border-color: rgb(96 165 250 / 15%);
}

.human-voice-card.tenor {
  background: rgb(167 139 250 / 5%);
  border-color: rgb(167 139 250 / 15%);
}

.human-voice-card.baritone {
  background: rgb(52 211 153 / 5%);
  border-color: rgb(52 211 153 / 15%);
}

.human-voice-card.bass {
  background: rgb(251 191 36 / 5%);
  border-color: rgb(251 191 36 / 15%);
}

.human-voice-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.human-voice-card-top > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.human-voice-card-top span {
  overflow: hidden;
  color: #9aabba;
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.human-voice-card-top strong {
  margin-top: 1px;
  color: #dce6ee;
  font-size: 8px;
}

.human-voice-card-top .q-icon {
  flex: 0 0 auto;
  color: #71899a;
  font-size: 18px;
}

.human-voice-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-top: 8px;
}

.human-voice-stats > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 5px 6px;
  background: rgb(3 10 18 / 25%);
  border-radius: 6px;
}

.human-voice-stats span {
  color: #5f7484;
  font-size: 5px;
}

.human-voice-stats strong {
  margin-top: 1px;
  overflow: hidden;
  color: #aab9c5;
  font-size: 7px;
  text-overflow: ellipsis;
}

.human-voice-ready {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 7px;
  color: #6ee7b7;
  font-size: 6px;
}

.human-voice-ready .q-icon {
  font-size: 11px;
}

.human-voice-explanation {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  padding: 8px 9px;
  background: rgb(34 211 238 / 4%);
  border-radius: 7px;
}

.human-voice-explanation > .q-icon {
  flex: 0 0 auto;
  color: #67e8f9;
  font-size: 18px;
}

.human-voice-explanation > div {
  display: flex;
  flex-direction: column;
}

.human-voice-explanation strong {
  color: #a5f3fc;
  font-size: 7px;
}

.human-voice-explanation span {
  margin-top: 1px;
  color: #64818c;
  font-size: 7px;
  line-height: 1.4;
}

.playback-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  padding: 8px 9px;
  color: #fecdd3;
  background: rgb(251 113 133 / 7%);
  border: 1px solid rgb(251 113 133 / 16%);
  border-radius: 8px;
  font-size: 7px;
}

.table-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.table-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.following-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #93c5fd;
  font-size: 7px;
}

.following-dot {
  width: 6px;
  height: 6px;
  background: #60a5fa;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(96 165 250 / 8%);
}

.table-wrapper {
  position: relative;
  max-height: 330px;
  margin-top: 7px;
  overflow: auto;
  overscroll-behavior: contain;
  background: #0c1723;
  border: 1px solid #22364b;
  border-radius: 10px;
  scrollbar-gutter: stable;
}

.harmony-table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
  background: #0c1723;
}

.harmony-table thead {
  position: sticky;
  z-index: 3;
  top: 0;
}

.harmony-table th {
  padding: 8px 7px;
  color: #62768d;
  background: #101d2a;
  border-bottom: 1px solid #26394e;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-align: left;
  text-transform: uppercase;
}

.harmony-table td {
  padding: 6px 7px;
  color: #93a4b7;
  border-bottom: 1px solid #172638;
  font-size: 7px;
  transition:
    background 120ms ease,
    color 120ms ease;
}

.harmony-table tr:last-child td {
  border-bottom: 0;
}

.harmony-table tr.playing td {
  color: #dbeafe;
  background: rgb(96 165 250 / 13%);
}

.harmony-table tr.playing td:first-child {
  box-shadow: inset 3px 0 0 #60a5fa;
}

.order-cell {
  width: 35px;
  color: #52677d !important;
}

.playing-marker {
  display: inline-grid;
  width: 20px;
  height: 20px;
  place-items: center;
  color: #bfdbfe;
  background: rgb(96 165 250 / 12%);
  border-radius: 50%;
}

.playing-marker .q-icon {
  font-size: 13px;
}

.time-cell,
.duration-cell {
  white-space: nowrap;
}

.note-cell {
  min-width: 54px;
  padding: 5px 7px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 8px;
}

.principal-note {
  color: #f9a8d4;
  background: rgb(244 114 182 / 6%);
}

.second-note {
  color: #93c5fd;
  background: rgb(96 165 250 / 6%);
}

.tenor-note {
  color: #c4b5fd;
  background: rgb(167 139 250 / 6%);
}

.baritone-note {
  color: #6ee7b7;
  background: rgb(52 211 153 / 6%);
}

.bass-note {
  color: #fcd34d;
  background: rgb(251 191 36 / 6%);
}

.note-cell:hover {
  border-color: #41556c;
}

.scroll-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  color: #526a83;
  font-size: 6px;
}

.scroll-note .q-icon {
  color: #6687a8;
  font-size: 13px;
}

.preview-note {
  display: flex;
  gap: 7px;
  margin-top: 9px;
  padding: 8px 9px;
  color: #776f5d;
  background: rgb(251 191 36 / 4%);
  border-radius: 8px;
}

.preview-note .q-icon {
  flex: 0 0 auto;
  color: #fbbf24;
  font-size: 15px;
}

.preview-note p {
  margin: 0;
  font-size: 7px;
  line-height: 1.45;
}

@media (max-width: 1050px) {
  .human-voice-plans {
    grid-template-columns: repeat(3, minmax(140px, 1fr));
  }
}

@media (max-width: 700px) {
  .preview-heading,
  .key-reference,
  .human-voice-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .key-chip {
    align-self: flex-start;
    text-align: left;
  }

  .key-play-button {
    width: 100%;
  }

  .human-voice-plans {
    grid-template-columns: 1fr;
  }

  .engine-status {
    align-self: flex-start;
  }

  .table-wrapper {
    max-height: 280px;
  }
}
</style>
