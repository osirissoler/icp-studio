<template>
  <section class="quick-reference">
    <header class="quick-header">
      <div>
        <span class="kicker"> REFERENCIA RÁPIDA </span>

        <h3>Encuentra rápidamente las voces</h3>

        <p>
          Elige una nota y un carácter mayor o menor para obtener referencias inmediatas de las
          distintas voces.
        </p>
      </div>

      <div class="current-reference">
        <span>Referencia actual</span>
        <strong>{{ chordName }}</strong>
      </div>
    </header>

    <div class="quick-layout">
      <aside class="quick-controls">
        <div class="control-group">
          <div class="control-heading">
            <strong>Nota base</strong>
            <small>Selecciona el tono</small>
          </div>

          <div class="notes-grid">
            <button
              v-for="note in notes"
              :key="note.value"
              type="button"
              class="note-button"
              :class="{ active: rootNote === note.value }"
              @click="selectRoot(note.value)"
            >
              <strong>{{ note.label }}</strong>
              <span>{{ note.international }}</span>
            </button>
          </div>
        </div>

        <div class="control-group quality-group">
          <div class="control-heading">
            <strong>Modo</strong>
            <small>Carácter armónico</small>
          </div>

          <div class="quality-options">
            <button
              type="button"
              class="quality-button"
              :class="{ active: scaleMode === 'major' }"
              @click="selectMode('major')"
            >
              <q-icon name="wb_sunny" />

              <span>
                <strong>Mayor</strong>
                <small>{{ majorChordName }}</small>
              </span>
            </button>

            <button
              type="button"
              class="quality-button"
              :class="{ active: scaleMode === 'minor' }"
              @click="selectMode('minor')"
            >
              <q-icon name="dark_mode" />

              <span>
                <strong>Menor</strong>
                <small>{{ minorChordName }}</small>
              </span>
            </button>
          </div>
        </div>

        <div class="chord-preview">
          <span>Acorde</span>

          <div class="chord-notes">
            <div v-for="note in chordNotes" :key="note.value" class="chord-note">
              <strong>{{ note.label }}</strong>
              <small>{{ note.international }}</small>
            </div>
          </div>
        </div>
      </aside>

      <div class="voices-area">
        <div class="voices-heading">
          <div>
            <strong>Referencias vocales</strong>
            <small> Escucha una voz individual o todas juntas. </small>
          </div>

          <div class="voice-actions">
            <q-btn
              unelevated
              no-caps
              icon="groups"
              label="Escuchar todas"
              class="play-all-button"
              :disable="isPlaying"
              @click="playAllVoices"
            />

            <q-btn
              outline
              no-caps
              icon="stop"
              label="Detener"
              class="stop-button"
              :disable="!isPlaying"
              @click="stopAllTones"
            />
          </div>
        </div>

        <div class="voices-grid">
          <article
            v-for="voice in voices"
            :key="voice.id"
            class="voice-card"
            :class="{
              playing: playingVoiceId === voice.id || playingVoiceId === 'all',
            }"
          >
            <div class="voice-top">
              <div
                class="voice-icon"
                :style="{
                  '--voice-color': voice.color,
                  '--voice-soft': `${voice.color}18`,
                }"
              >
                <q-icon :name="voice.icon" />
              </div>

              <div class="voice-name">
                <strong>{{ voice.label }}</strong>
                <small>{{ voice.description }}</small>
              </div>
            </div>

            <div class="voice-note">
              <strong>{{ voice.noteLabel }}</strong>

              <span>{{ voice.octave }}</span>

              <small> {{ voice.international }}{{ voice.octave }} </small>
            </div>

            <div class="frequency">{{ voice.frequency.toFixed(2) }} Hz</div>

            <q-btn
              flat
              dense
              no-caps
              icon="play_arrow"
              label="Escuchar"
              class="voice-play"
              :disable="isPlaying"
              @click="playVoice(voice)"
            />
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import { midiToFrequency, notes, type NoteDefinition } from '../../shared/music';

import type { ScaleMode } from '../../shared/harmony';

interface VoiceReference {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  noteIndex: number;
  noteLabel: string;
  international: string;
  octave: number;
  frequency: number;
}

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
}>();

const emit = defineEmits<{
  'update:root-note': [value: number];

  'update:scale-mode': [value: ScaleMode];
}>();

const isPlaying = ref(false);

const playingVoiceId = ref<string | null>(null);

let audioContext: AudioContext | null = null;

let activeOscillators: OscillatorNode[] = [];

let activeGainNodes: GainNode[] = [];

let stopTimer: ReturnType<typeof setTimeout> | null = null;

const selectedRoot = computed<NoteDefinition>(
  () => notes.find((note) => note.value === props.rootNote) ?? notes[0]!,
);

const majorChordName = computed(() => `${selectedRoot.value.label} mayor`);

const minorChordName = computed(() => `${selectedRoot.value.label} menor`);

const chordName = computed(() =>
  props.scaleMode === 'major' ? majorChordName.value : minorChordName.value,
);

const thirdInterval = computed(() => (props.scaleMode === 'major' ? 4 : 3));

const chordNoteIndexes = computed(() => [
  props.rootNote,
  normalizeNote(props.rootNote + thirdInterval.value),
  normalizeNote(props.rootNote + 7),
]);

const chordNotes = computed(() =>
  chordNoteIndexes.value.map(
    (noteIndex) => notes.find((note) => note.value === noteIndex) ?? notes[0]!,
  ),
);

const voices = computed<VoiceReference[]>(() => {
  const root = props.rootNote;

  const third = normalizeNote(root + thirdInterval.value);

  const fifth = normalizeNote(root + 7);

  return [
    createVoice('principal', 'Principal', 'Voz guía', 'record_voice_over', '#f472b6', root, 4),

    createVoice('second', 'Segunda voz', 'Tercera', 'spatial_audio_off', '#60a5fa', third, 4),

    createVoice('tenor', 'Tenor', 'Quinta superior', 'graphic_eq', '#a78bfa', fifth, 4),

    createVoice('baritone', 'Barítono', 'Tercera grave', 'equalizer', '#34d399', third, 3),

    createVoice('bass', 'Bajo', 'Fundamental grave', 'volume_down', '#fbbf24', root, 2),
  ];
});

function normalizeNote(value: number): number {
  return ((value % 12) + 12) % 12;
}

function createVoice(
  id: string,
  label: string,
  description: string,
  icon: string,
  color: string,
  noteIndex: number,
  octave: number,
): VoiceReference {
  const note = notes.find((item) => item.value === noteIndex) ?? notes[0]!;

  const midi = (octave + 1) * 12 + noteIndex;

  return {
    id,
    label,
    description,
    icon,
    color,
    noteIndex,
    noteLabel: note.label,
    international: note.international,
    octave,
    frequency: midiToFrequency(midi),
  };
}

function selectRoot(note: number): void {
  emit('update:root-note', note);

  if (isPlaying.value) {
    stopAllTones();
  }
}

function selectMode(mode: ScaleMode): void {
  emit('update:scale-mode', mode);

  if (isPlaying.value) {
    stopAllTones();
  }
}

function ensureAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }

  return audioContext;
}

async function prepareAudioContext(): Promise<AudioContext> {
  const context = ensureAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  return context;
}

function createTone(context: AudioContext, frequency: number, volume: number): void {
  const oscillator = context.createOscillator();

  const gain = context.createGain();

  oscillator.type = 'sine';

  oscillator.frequency.setValueAtTime(frequency, context.currentTime);

  gain.gain.setValueAtTime(0, context.currentTime);

  gain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.04);

  oscillator.connect(gain);

  gain.connect(context.destination);

  activeOscillators.push(oscillator);

  activeGainNodes.push(gain);

  oscillator.start();
}

async function playVoice(voice: VoiceReference): Promise<void> {
  stopAllTones();

  const context = await prepareAudioContext();

  playingVoiceId.value = voice.id;

  isPlaying.value = true;

  createTone(context, voice.frequency, 0.28);

  scheduleStop();
}

async function playAllVoices(): Promise<void> {
  stopAllTones();

  const context = await prepareAudioContext();

  playingVoiceId.value = 'all';

  isPlaying.value = true;

  voices.value.forEach((voice) => {
    createTone(context, voice.frequency, 0.11);
  });

  scheduleStop();
}

function scheduleStop(): void {
  stopTimer = setTimeout(() => {
    stopAllTones();
  }, 3000);
}

function stopAllTones(): void {
  if (stopTimer) {
    clearTimeout(stopTimer);

    stopTimer = null;
  }

  if (audioContext) {
    const now = audioContext.currentTime;

    activeGainNodes.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);

        gain.gain.setValueAtTime(gain.gain.value, now);

        gain.gain.linearRampToValueAtTime(0, now + 0.04);
      } catch {
        // Nodo terminado.
      }
    });

    activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop(now + 0.05);
      } catch {
        // Oscilador terminado.
      }
    });
  }

  activeOscillators = [];
  activeGainNodes = [];

  isPlaying.value = false;

  playingVoiceId.value = null;
}

onBeforeUnmount(() => {
  stopAllTones();

  if (audioContext) {
    void audioContext.close();

    audioContext = null;
  }
});
</script>

<style scoped>
.quick-reference {
  padding: 18px;
  background: #0b1521;
  border: 1px solid #223348;
  border-radius: 16px;
}

.quick-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid #1d2c3e;
}

.kicker {
  color: #a78bfa;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.quick-header h3 {
  margin: 3px 0 4px;
  color: #edf3fa;
  font-size: 16px;
}

.quick-header p {
  max-width: 650px;
  margin: 0;
  color: #74869b;
  font-size: 10px;
  line-height: 1.45;
}

.current-reference {
  display: flex;
  min-width: 125px;
  flex-direction: column;
  padding: 8px 10px;
  background: rgb(167 139 250 / 8%);
  border: 1px solid rgb(167 139 250 / 24%);
  border-radius: 9px;
  text-align: right;
}

.current-reference span {
  color: #756b94;
  font-size: 8px;
}

.current-reference strong {
  color: #ddd6fe;
  font-size: 12px;
}

.quick-layout {
  display: grid;
  grid-template-columns:
    255px
    minmax(0, 1fr);
  gap: 14px;
  margin-top: 14px;
}

.quick-controls {
  padding: 12px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 12px;
}

.control-group + .control-group {
  margin-top: 13px;
}

.control-heading {
  display: flex;
  flex-direction: column;
  margin-bottom: 7px;
}

.control-heading strong {
  color: #cfd9e5;
  font-size: 10px;
}

.control-heading small {
  color: #66798f;
  font-size: 8px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}

.note-button {
  min-height: 42px;
  color: #aebdce;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 8px;
  cursor: pointer;
}

.note-button strong,
.note-button span {
  display: block;
}

.note-button strong {
  font-size: 9px;
}

.note-button span {
  color: #667b92;
  font-size: 7px;
}

.note-button.active {
  color: white;
  background: rgb(167 139 250 / 14%);
  border-color: rgb(167 139 250 / 60%);
}

.quality-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.quality-button {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 7px;
  color: #aab8c9;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}

.quality-button .q-icon {
  font-size: 16px;
}

.quality-button > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.quality-button strong {
  font-size: 9px;
}

.quality-button small {
  overflow: hidden;
  color: #66798f;
  font-size: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quality-button.active {
  color: #e9e4ff;
  background: rgb(167 139 250 / 12%);
  border-color: rgb(167 139 250 / 52%);
}

.chord-preview {
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px solid #213247;
}

.chord-preview > span {
  color: #697d94;
  font-size: 8px;
  text-transform: uppercase;
}

.chord-notes {
  display: flex;
  gap: 5px;
  margin-top: 6px;
}

.chord-note {
  display: flex;
  flex: 1;
  align-items: center;
  flex-direction: column;
  padding: 6px;
  background: rgb(167 139 250 / 7%);
  border-radius: 7px;
}

.chord-note strong {
  color: #ddd6fe;
  font-size: 9px;
}

.chord-note small {
  color: #73688f;
  font-size: 7px;
}

.voices-area {
  min-width: 0;
  padding: 12px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 12px;
}

.voices-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.voices-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.voices-heading strong {
  color: #dce6f2;
  font-size: 11px;
}

.voices-heading small {
  color: #687b91;
  font-size: 8px;
}

.voice-actions {
  display: flex;
  gap: 6px;
}

.play-all-button {
  color: white;
  background: #7657d9;
  border-radius: 8px;
  font-size: 9px;
}

.stop-button {
  color: #91a0b2;
  border-radius: 8px;
  font-size: 9px;
}

.voices-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 7px;
  margin-top: 10px;
}

.voice-card {
  padding: 10px;
  background: #101d2b;
  border: 1px solid #263a50;
  border-radius: 10px;
}

.voice-card.playing {
  border-color: rgb(167 139 250 / 70%);
}

.voice-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.voice-icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--voice-color);
  background: var(--voice-soft);
  border-radius: 8px;
}

.voice-icon .q-icon {
  font-size: 16px;
}

.voice-name {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.voice-name strong {
  color: #dce6f2;
  font-size: 9px;
}

.voice-name small {
  color: #64778e;
  font-size: 7px;
}

.voice-note {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-top: 12px;
}

.voice-note > strong {
  color: white;
  font-size: 21px;
}

.voice-note > span {
  margin-left: 2px;
  color: #a78bfa;
  font-size: 11px;
}

.voice-note > small {
  margin-left: 4px;
  color: #66798f;
  font-size: 7px;
}

.frequency {
  margin-top: 1px;
  color: #60748a;
  font-size: 7px;
  text-align: center;
}

.voice-play {
  width: 100%;
  margin-top: 7px;
  color: #c9c0f4;
  background: rgb(167 139 250 / 8%);
  border-radius: 7px;
  font-size: 8px;
}

@media (max-width: 1100px) {
  .quick-layout {
    grid-template-columns: 1fr;
  }

  .voices-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 650px) {
  .quick-header,
  .voices-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .current-reference {
    align-self: flex-start;
    text-align: left;
  }

  .voices-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .voice-actions {
    flex-direction: column;
  }
}
</style>
