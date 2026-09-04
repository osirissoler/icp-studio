<template>
  <section class="harmony-workspace">
    <div class="workspace-heading">
      <div>
        <span class="section-kicker">VOCES Y ARMONÍA</span>

        <h2>Prepara referencias para varias voces</h2>

        <p>
          Elige una nota base y un carácter mayor o menor. ICP Studio construirá una referencia
          armónica sencilla para que cada voz pueda encontrar rápidamente su punto de entrada.
        </p>
      </div>

      <div class="chord-chip">
        <span>Referencia actual</span>
        <strong>{{ chordName }}</strong>
      </div>
    </div>

    <div class="configuration-grid">
      <div class="configuration-card">
        <div class="field-heading">
          <span>Nota base</span>
          <small> Elige el centro de la referencia. </small>
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

      <div class="configuration-card">
        <div class="field-heading">
          <span>Carácter armónico</span>
          <small> Mayor suele sentirse más abierto; menor, más oscuro o emotivo. </small>
        </div>

        <div class="quality-options">
          <button
            type="button"
            class="quality-button"
            :class="{ active: chordQuality === 'major' }"
            @click="chordQuality = 'major'"
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
            :class="{ active: chordQuality === 'minor' }"
            @click="chordQuality = 'minor'"
          >
            <q-icon name="dark_mode" />

            <span>
              <strong>Menor</strong>
              <small>{{ minorChordName }}</small>
            </span>
          </button>
        </div>

        <div class="theory-card">
          <q-icon name="school" />

          <div>
            <strong>¿Qué está haciendo ICP Studio?</strong>

            <p>
              Usa la nota base, su tercera y su quinta para formar una referencia armónica sencilla.
              Después distribuye esas notas en registros diferentes para cada voz.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="voices-heading">
      <div>
        <span>Referencias vocales</span>
        <small> Escucha una voz individual o todas juntas. </small>
      </div>

      <div class="global-actions">
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
          class="stop-all-button"
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
        :class="{ playing: playingVoiceId === voice.id }"
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

          <div class="voice-title">
            <span>{{ voice.label }}</span>
            <small>{{ voice.description }}</small>
          </div>
        </div>

        <div class="voice-note">
          <span>{{ voice.noteLabel }}</span>
          <strong>{{ voice.octave }}</strong>

          <small> {{ voice.international }}{{ voice.octave }} </small>
        </div>

        <div class="voice-frequency">{{ voice.frequency.toFixed(2) }} Hz</div>

        <q-btn
          unelevated
          no-caps
          icon="play_arrow"
          label="Escuchar voz"
          class="voice-play-button"
          :disable="isPlaying"
          @click="playVoice(voice)"
        />
      </article>
    </div>

    <div class="harmony-summary">
      <div class="summary-title">
        <q-icon name="graphic_eq" />

        <div>
          <strong>Referencia armónica</strong>

          <span>
            {{ chordName }}
          </span>
        </div>
      </div>

      <div class="chord-notes">
        <span v-for="note in chordNotes" :key="note.value" class="chord-note">
          <strong>{{ note.label }}</strong>
          <small>{{ note.international }}</small>
        </span>
      </div>
    </div>

    <div class="important-note">
      <q-icon name="info" />

      <div>
        <strong>Importante</strong>

        <p>
          Esta herramienta da referencias rápidas para ensayo. La armonización real de una canción
          también depende de la melodía, la tonalidad, los acordes y el movimiento de cada voz. Más
          adelante podremos añadir un modo avanzado para trabajar una canción completa.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import { midiToFrequency, notes, type NoteDefinition } from '../shared/music';

type ChordQuality = 'major' | 'minor';

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

const rootNote = ref(0);
const chordQuality = ref<ChordQuality>('major');

const isPlaying = ref(false);
const playingVoiceId = ref<string | null>(null);

let audioContext: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeGainNodes: GainNode[] = [];
let stopTimer: ReturnType<typeof setTimeout> | null = null;

const selectedRoot = computed<NoteDefinition>(
  () => notes.find((note) => note.value === rootNote.value) ?? notes[0]!,
);

const majorChordName = computed(() => `${selectedRoot.value.label} mayor`);

const minorChordName = computed(() => `${selectedRoot.value.label} menor`);

const chordName = computed(() =>
  chordQuality.value === 'major' ? majorChordName.value : minorChordName.value,
);

const thirdInterval = computed(() => (chordQuality.value === 'major' ? 4 : 3));

const chordNoteIndexes = computed(() => [
  rootNote.value,
  normalizeNote(rootNote.value + thirdInterval.value),
  normalizeNote(rootNote.value + 7),
]);

const chordNotes = computed(() =>
  chordNoteIndexes.value.map(
    (noteIndex) => notes.find((note) => note.value === noteIndex) ?? notes[0]!,
  ),
);

const voices = computed<VoiceReference[]>(() => {
  const root = rootNote.value;
  const third = normalizeNote(root + thirdInterval.value);
  const fifth = normalizeNote(root + 7);

  return [
    createVoice(
      'principal',
      'Voz principal',
      'Centro de referencia',
      'record_voice_over',
      '#f472b6',
      root,
      4,
    ),
    createVoice(
      'second',
      'Segunda voz',
      'Tercera del acorde',
      'spatial_audio_off',
      '#60a5fa',
      third,
      4,
    ),
    createVoice('tenor', 'Tenor', 'Quinta superior', 'graphic_eq', '#a78bfa', fifth, 4),
    createVoice(
      'baritone',
      'Barítono',
      'Tercera en registro grave',
      'equalizer',
      '#34d399',
      third,
      3,
    ),
    createVoice('bass', 'Bajo', 'Base grave de la referencia', 'volume_down', '#fbbf24', root, 2),
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
  rootNote.value = note;

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
        // El nodo pudo haber terminado.
      }
    });

    activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop(now + 0.05);
      } catch {
        // El oscilador pudo haber terminado.
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
.harmony-workspace {
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

.section-kicker {
  color: #a78bfa;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.workspace-heading h2 {
  margin: 4px 0 5px;
  color: #edf3fa;
  font-size: 19px;
}

.workspace-heading p {
  max-width: 740px;
  margin: 0;
  color: #8493a8;
  font-size: 12px;
  line-height: 1.55;
}

.chord-chip {
  display: flex;
  min-width: 140px;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px;
  background: rgb(167 139 250 / 8%);
  border: 1px solid rgb(167 139 250 / 28%);
  border-radius: 11px;
  text-align: right;
}

.chord-chip span {
  color: #8477a7;
  font-size: 9px;
  text-transform: uppercase;
}

.chord-chip strong {
  color: #ddd6fe;
  font-size: 14px;
}

.configuration-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.35fr)
    minmax(300px, 0.65fr);
  gap: 16px;
  margin-top: 18px;
}

.configuration-card {
  padding: 17px;
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
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.note-button {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  color: #becbda;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 10px;
  cursor: pointer;
}

.note-button span {
  color: #6f829a;
  font-size: 9px;
}

.note-button.active {
  color: white;
  background: rgb(167 139 250 / 13%);
  border-color: rgb(167 139 250 / 62%);
}

.quality-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.quality-button {
  display: flex;
  min-height: 62px;
  align-items: center;
  gap: 10px;
  padding: 10px;
  color: #adbccc;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 11px;
  cursor: pointer;
  text-align: left;
}

.quality-button > .q-icon {
  font-size: 20px;
}

.quality-button > span {
  display: flex;
  flex-direction: column;
}

.quality-button strong {
  font-size: 11px;
}

.quality-button small {
  color: #70839a;
  font-size: 9px;
}

.quality-button.active {
  color: #e9e4ff;
  background: rgb(167 139 250 / 12%);
  border-color: rgb(167 139 250 / 55%);
}

.theory-card {
  display: flex;
  gap: 9px;
  margin-top: 12px;
  padding: 11px;
  background: rgb(96 165 250 / 5%);
  border-radius: 10px;
}

.theory-card > .q-icon {
  flex: 0 0 auto;
  color: #60a5fa;
  font-size: 18px;
}

.theory-card strong {
  color: #cbd8e6;
  font-size: 10px;
}

.theory-card p {
  margin: 2px 0 0;
  color: #71849a;
  font-size: 9px;
  line-height: 1.45;
}

.voices-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-top: 20px;
}

.voices-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.voices-heading span {
  color: #e1e9f2;
  font-size: 13px;
  font-weight: 650;
}

.voices-heading small {
  color: #70839a;
  font-size: 9px;
}

.global-actions {
  display: flex;
  gap: 8px;
}

.play-all-button {
  color: white;
  background: #7657d9;
  border-radius: 10px;
}

.stop-all-button {
  color: #9facbc;
  border-radius: 10px;
}

.voices-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 11px;
}

.voice-card {
  padding: 14px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 14px;
  transition:
    border-color 150ms ease,
    transform 150ms ease;
}

.voice-card.playing {
  border-color: #a78bfa;
  transform: translateY(-2px);
}

.voice-top {
  display: flex;
  align-items: center;
  gap: 9px;
}

.voice-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--voice-color);
  background: var(--voice-soft);
  border-radius: 10px;
}

.voice-title {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.voice-title span {
  color: #dce6f2;
  font-size: 10px;
  font-weight: 650;
}

.voice-title small {
  color: #687b91;
  font-size: 8px;
}

.voice-note {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-top: 17px;
}

.voice-note > span {
  color: white;
  font-size: 25px;
  font-weight: 750;
}

.voice-note > strong {
  margin-left: 2px;
  color: #a78bfa;
  font-size: 13px;
}

.voice-note > small {
  margin-left: 6px;
  color: #6f8299;
  font-size: 9px;
}

.voice-frequency {
  margin: 2px 0 13px;
  color: #667b92;
  font-size: 9px;
  text-align: center;
}

.voice-play-button {
  width: 100%;
  color: #d8d1ff;
  background: rgb(167 139 250 / 13%);
  border-radius: 9px;
  font-size: 10px;
}

.harmony-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 17px;
  padding: 14px;
  background: #0e1a28;
  border: 1px solid #213247;
  border-radius: 13px;
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 9px;
}

.summary-title > .q-icon {
  color: #a78bfa;
  font-size: 23px;
}

.summary-title div {
  display: flex;
  flex-direction: column;
}

.summary-title strong {
  color: #dce6f2;
  font-size: 11px;
}

.summary-title span {
  color: #7c8ca0;
  font-size: 9px;
}

.chord-notes {
  display: flex;
  gap: 7px;
}

.chord-note {
  display: flex;
  min-width: 52px;
  align-items: center;
  flex-direction: column;
  padding: 7px 10px;
  background: rgb(167 139 250 / 8%);
  border: 1px solid rgb(167 139 250 / 24%);
  border-radius: 9px;
}

.chord-note strong {
  color: #ddd6fe;
  font-size: 11px;
}

.chord-note small {
  color: #8277a3;
  font-size: 8px;
}

.important-note {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  background: rgb(251 191 36 / 5%);
  border: 1px solid rgb(251 191 36 / 15%);
  border-radius: 11px;
}

.important-note > .q-icon {
  flex: 0 0 auto;
  color: #fbbf24;
  font-size: 18px;
}

.important-note strong {
  color: #d6caa6;
  font-size: 10px;
}

.important-note p {
  margin: 2px 0 0;
  color: #817b6b;
  font-size: 9px;
  line-height: 1.5;
}

@media (max-width: 1150px) {
  .voices-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 850px) {
  .configuration-grid {
    grid-template-columns: 1fr;
  }

  .voices-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .workspace-heading,
  .voices-heading,
  .harmony-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .chord-chip {
    align-self: flex-start;
    text-align: left;
  }

  .global-actions {
    align-self: flex-start;
  }
}

@media (max-width: 560px) {
  .notes-grid,
  .quality-options,
  .voices-grid {
    grid-template-columns: 1fr 1fr;
  }

  .global-actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
