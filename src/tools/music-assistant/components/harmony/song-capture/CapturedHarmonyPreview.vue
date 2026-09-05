<template>
  <section class="harmony-preview">
    <header class="preview-heading">
      <div>
        <span class="kicker">ARMONIZACIÓN AUTOMÁTICA</span>

        <h3>Voces calculadas desde tu interpretación</h3>

        <p>
          Cada nota conserva el momento y la duración que tuvo mientras cantabas. ICP Studio genera
          una propuesta para Principal, Segunda voz, Tenor, Barítono y Bajo.
        </p>
      </div>

      <div class="key-chip">
        <span>Tonalidad usada</span>

        <strong>{{ keyLabel }}</strong>
      </div>
    </header>

    <div class="playback-actions">
      <q-btn
        unelevated
        no-caps
        icon="record_voice_over"
        label="Principal"
        class="voice-button principal"
        :disable="isPlaying"
        @click="playVoice('principal')"
      />

      <q-btn
        unelevated
        no-caps
        icon="spatial_audio_off"
        label="Segunda"
        class="voice-button second"
        :disable="isPlaying"
        @click="playVoice('second')"
      />

      <q-btn
        unelevated
        no-caps
        icon="graphic_eq"
        label="Tenor"
        class="voice-button tenor"
        :disable="isPlaying"
        @click="playVoice('tenor')"
      />

      <q-btn
        unelevated
        no-caps
        icon="equalizer"
        label="Barítono"
        class="voice-button baritone"
        :disable="isPlaying"
        @click="playVoice('baritone')"
      />

      <q-btn
        unelevated
        no-caps
        icon="volume_down"
        label="Bajo"
        class="voice-button bass"
        :disable="isPlaying"
        @click="playVoice('bass')"
      />

      <q-btn
        unelevated
        no-caps
        icon="groups"
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
          “Grabación + todas” reproduce tu audio original junto con Principal, Segunda, Tenor,
          Barítono y Bajo usando la misma línea de tiempo.
        </span>
      </div>
    </div>

    <div v-if="playbackError" class="playback-error">
      <q-icon name="error_outline" />

      <span>
        {{ playbackError }}
      </span>
    </div>

    <div class="table-wrapper">
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
            :class="{
              playing: activeNoteIndex === index,
            }"
          >
            <td class="order-cell">
              {{ index + 1 }}
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

    <div class="preview-note">
      <q-icon name="info" />

      <p>
        Esta es una propuesta automática. Por ahora usa la tonalidad detectada y la progresión
        armónica configurada. Más adelante añadiremos también detección automática de los cambios de
        acorde durante la grabación para que la armonización siga todavía mejor la canción real.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import {
  harmonizeMelodyPhrases,
  type ChordStep,
  type MelodyHarmonyVoiceNote,
  type MelodyNote,
  type MelodyNoteDuration,
  type MelodyVoiceId,
  type ScaleMode,
} from '../../../shared/harmony';

import { notes } from '../../../shared/music';

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

  const gain = context.createGain();

  oscillator.type = 'sine';

  oscillator.frequency.setValueAtTime(frequency, absoluteStart);

  const end = absoluteStart + Math.max(durationSeconds, 0.08);

  gain.gain.setValueAtTime(0, absoluteStart);

  gain.gain.linearRampToValueAtTime(volume, absoluteStart + 0.025);

  gain.gain.setValueAtTime(volume, Math.max(absoluteStart + 0.03, end - 0.04));

  gain.gain.linearRampToValueAtTime(0, end);

  oscillator.connect(gain);

  gain.connect(context.destination);

  oscillator.start(absoluteStart);

  oscillator.stop(end + 0.03);

  activeOscillators.push(oscillator);

  activeGainNodes.push(gain);
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

.playback-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
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

.table-wrapper {
  margin-top: 11px;
  overflow-x: auto;
  border: 1px solid #22364b;
  border-radius: 10px;
}

.harmony-table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
  background: #0c1723;
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
}

.harmony-table tr:last-child td {
  border-bottom: 0;
}

.harmony-table tr.playing {
  background: rgb(96 165 250 / 7%);
}

.order-cell {
  color: #52677d !important;
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
  .preview-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .key-chip {
    align-self: flex-start;
    text-align: left;
  }
}
</style>
