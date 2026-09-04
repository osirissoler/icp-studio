<template>
  <section class="melody-editor">
    <header class="section-heading">
      <div class="heading-copy">
        <span class="kicker"> 3 · MELODÍA PRINCIPAL </span>

        <h3>Construye la melodía de la canción</h3>

        <p>
          Divide la canción en frases y agrega las notas que canta la voz principal. Luego
          utilizaremos esta melodía para calcular el movimiento de las demás voces.
        </p>
      </div>

      <div class="heading-actions">
        <q-btn
          unelevated
          no-caps
          icon="add"
          label="Nueva frase"
          class="add-phrase-button"
          @click="addPhrase"
        />
      </div>
    </header>

    <div class="scale-reference">
      <div class="scale-info">
        <q-icon name="music_note" />

        <div>
          <span>Escala disponible</span>

          <strong>{{ keyLabel }}</strong>
        </div>
      </div>

      <div class="scale-notes">
        <span v-for="noteIndex in scaleNotes" :key="noteIndex">
          {{ noteName(noteIndex) }}
        </span>
      </div>
    </div>

    <div v-if="phrases.length" class="phrases">
      <article
        v-for="(phrase, phraseIndex) in phrases"
        :key="phrase.id"
        class="phrase-card"
        :class="{
          active: activePhraseId === phrase.id,
        }"
      >
        <header class="phrase-header">
          <div class="phrase-number">
            {{ phraseIndex + 1 }}
          </div>

          <div class="phrase-title-area">
            <input
              :value="phrase.title"
              class="phrase-title-input"
              type="text"
              placeholder="Nombre de la frase"
              @input="updatePhraseTitle(phrase.id, $event)"
            />

            <span>
              {{ phrase.notes.length }}
              notas
            </span>
          </div>

          <div class="phrase-actions">
            <q-btn
              flat
              round
              dense
              icon="play_arrow"
              :disable="!phrase.notes.length || isPlaying"
              @click="playPhrase(phrase)"
            />

            <q-btn flat round dense icon="stop" :disable="!isPlaying" @click="stopPlayback" />

            <q-btn
              flat
              round
              dense
              icon="delete_outline"
              class="delete-button"
              @click="removePhrase(phrase.id)"
            />
          </div>
        </header>

        <div class="phrase-content">
          <div class="lyrics-area">
            <label> Letra o texto de la frase </label>

            <textarea
              :value="phrase.lyrics"
              rows="2"
              placeholder="Ejemplo: Santo, santo, santo..."
              @input="updatePhraseLyrics(phrase.id, $event)"
            />
          </div>

          <div class="chord-area">
            <label> Acorde de referencia </label>

            <select
              :value="phrase.chordStepId ?? ''"
              @change="updatePhraseChord(phrase.id, $event)"
            >
              <option value="">Sin asignar</option>

              <option v-for="(chord, chordIndex) in chordOptions" :key="chord.id" :value="chord.id">
                {{ chordIndex + 1 }} ·
                {{ chord.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="note-builder">
          <div class="builder-heading">
            <div>
              <strong> Añadir nota </strong>

              <span> Selecciona una nota de la escala o una nota cromática. </span>
            </div>

            <div class="octave-control">
              <span>Octava</span>

              <button type="button" @click="selectedOctave = Math.max(2, selectedOctave - 1)">
                −
              </button>

              <strong>
                {{ selectedOctave }}
              </strong>

              <button type="button" @click="selectedOctave = Math.min(6, selectedOctave + 1)">
                +
              </button>
            </div>
          </div>

          <div class="note-picker">
            <button
              v-for="note in notes"
              :key="note.value"
              type="button"
              class="picker-note"
              :class="{
                inScale: scaleNotes.includes(note.value),
              }"
              @click="addNote(phrase.id, note.value)"
            >
              <strong>
                {{ note.label }}
              </strong>

              <span>
                {{ note.international }}
              </span>
            </button>
          </div>

          <div class="duration-picker">
            <span>Duración de la próxima nota</span>

            <button
              v-for="duration in durations"
              :key="duration.value"
              type="button"
              :class="{
                active: selectedDuration === duration.value,
              }"
              @click="selectedDuration = duration.value"
            >
              {{ duration.label }}
            </button>
          </div>
        </div>

        <div v-if="phrase.notes.length" class="melody-line">
          <div
            v-for="(melodyNote, noteIndex) in phrase.notes"
            :key="melodyNote.id"
            class="melody-note"
            :class="{
              playing: activeNoteId === melodyNote.id,
            }"
          >
            <button type="button" class="note-main" @click="playSingleNote(melodyNote)">
              <strong>
                {{ noteName(melodyNote.noteIndex) }}
              </strong>

              <span>
                {{ melodyNote.octave }}
              </span>

              <small>
                {{ durationLabel(melodyNote.beats) }}
              </small>
            </button>

            <div class="note-actions">
              <button
                type="button"
                :disabled="noteIndex === 0"
                @click="moveNote(phrase.id, noteIndex, -1)"
              >
                ‹
              </button>

              <button
                type="button"
                :disabled="noteIndex === phrase.notes.length - 1"
                @click="moveNote(phrase.id, noteIndex, 1)"
              >
                ›
              </button>

              <button
                type="button"
                class="remove-note"
                @click="removeNote(phrase.id, melodyNote.id)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-melody">
          <q-icon name="music_off" />

          <div>
            <strong> Esta frase todavía no tiene melodía </strong>

            <span> Usa las notas de arriba para comenzar. </span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty-phrases">
      <q-icon name="queue_music" />

      <strong> Todavía no hay frases </strong>

      <span> Crea la primera frase para comenzar a construir la melodía. </span>

      <q-btn
        unelevated
        no-caps
        icon="add"
        label="Crear primera frase"
        class="first-phrase-button"
        @click="addPhrase"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import { notes } from '../../shared/music';

import {
  getChordLabel,
  getScaleNotes,
  melodyNoteFrequency,
  type ChordStep,
  type MelodyNote,
  type MelodyNoteDuration,
  type MelodyPhrase,
  type ScaleMode,
} from '../../shared/harmony';

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
  phrases: MelodyPhrase[];
}>();

const emit = defineEmits<{
  'update:phrases': [value: MelodyPhrase[]];
}>();

const selectedOctave = ref(4);

const selectedDuration = ref<MelodyNoteDuration>(1);

const activePhraseId = ref<string | null>(null);

const activeNoteId = ref<string | null>(null);

const isPlaying = ref(false);

let audioContext: AudioContext | null = null;

let activeOscillators: OscillatorNode[] = [];

let activeGains: GainNode[] = [];

let timers: ReturnType<typeof setTimeout>[] = [];

const durations: {
  value: MelodyNoteDuration;
  label: string;
}[] = [
  {
    value: 0.5,
    label: '½ tiempo',
  },
  {
    value: 1,
    label: '1 tiempo',
  },
  {
    value: 2,
    label: '2 tiempos',
  },
  {
    value: 4,
    label: '4 tiempos',
  },
];

const scaleNotes = computed(() => getScaleNotes(props.rootNote, props.scaleMode));

const keyLabel = computed(() => {
  const root = notes.find((note) => note.value === props.rootNote) ?? notes[0]!;

  return `${root.label} ${props.scaleMode === 'major' ? 'mayor' : 'menor'}`;
});

const chordOptions = computed(() =>
  props.progression.map((step) => ({
    id: step.id,

    label: getChordLabel(props.rootNote, props.scaleMode, step.degree),
  })),
);

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function noteName(noteIndex: number): string {
  return notes.find((note) => note.value === noteIndex)?.label ?? '—';
}

function durationLabel(beats: MelodyNoteDuration): string {
  return durations.find((duration) => duration.value === beats)?.label ?? `${beats}`;
}

function updatePhrases(phrases: MelodyPhrase[]): void {
  emit('update:phrases', phrases);
}

function addPhrase(): void {
  const phrase: MelodyPhrase = {
    id: makeId(),
    title: `Frase ${props.phrases.length + 1}`,
    lyrics: '',
    chordStepId: props.progression[0]?.id ?? null,
    notes: [],
  };

  updatePhrases([...props.phrases, phrase]);
}

function removePhrase(phraseId: string): void {
  stopPlayback();

  updatePhrases(props.phrases.filter((phrase) => phrase.id !== phraseId));
}

function updatePhraseTitle(phraseId: string, event: Event): void {
  const target = event.target as HTMLInputElement;

  updatePhrases(
    props.phrases.map((phrase) =>
      phrase.id === phraseId
        ? {
            ...phrase,
            title: target.value,
          }
        : phrase,
    ),
  );
}

function updatePhraseLyrics(phraseId: string, event: Event): void {
  const target = event.target as HTMLTextAreaElement;

  updatePhrases(
    props.phrases.map((phrase) =>
      phrase.id === phraseId
        ? {
            ...phrase,
            lyrics: target.value,
          }
        : phrase,
    ),
  );
}

function updatePhraseChord(phraseId: string, event: Event): void {
  const target = event.target as HTMLSelectElement;

  updatePhrases(
    props.phrases.map((phrase) =>
      phrase.id === phraseId
        ? {
            ...phrase,
            chordStepId: target.value || null,
          }
        : phrase,
    ),
  );
}

function addNote(phraseId: string, noteIndex: number): void {
  const melodyNote: MelodyNote = {
    id: makeId(),
    noteIndex,
    octave: selectedOctave.value,
    beats: selectedDuration.value,
  };

  updatePhrases(
    props.phrases.map((phrase) =>
      phrase.id === phraseId
        ? {
            ...phrase,

            notes: [...phrase.notes, melodyNote],
          }
        : phrase,
    ),
  );
}

function removeNote(phraseId: string, noteId: string): void {
  stopPlayback();

  updatePhrases(
    props.phrases.map((phrase) =>
      phrase.id === phraseId
        ? {
            ...phrase,

            notes: phrase.notes.filter((note) => note.id !== noteId),
          }
        : phrase,
    ),
  );
}

function moveNote(phraseId: string, noteIndex: number, direction: number): void {
  const phrase = props.phrases.find((item) => item.id === phraseId);

  if (!phrase) {
    return;
  }

  const targetIndex = noteIndex + direction;

  if (targetIndex < 0 || targetIndex >= phrase.notes.length) {
    return;
  }

  const nextNotes = [...phrase.notes];

  const current = nextNotes[noteIndex];

  const target = nextNotes[targetIndex];

  if (!current || !target) {
    return;
  }

  nextNotes[noteIndex] = target;

  nextNotes[targetIndex] = current;

  updatePhrases(
    props.phrases.map((item) =>
      item.id === phraseId
        ? {
            ...item,
            notes: nextNotes,
          }
        : item,
    ),
  );
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

function createTone(context: AudioContext, note: MelodyNote, durationSeconds: number): void {
  const oscillator = context.createOscillator();

  const gain = context.createGain();

  oscillator.type = 'sine';

  oscillator.frequency.setValueAtTime(
    melodyNoteFrequency(note.noteIndex, note.octave),
    context.currentTime,
  );

  gain.gain.setValueAtTime(0, context.currentTime);

  gain.gain.linearRampToValueAtTime(0.22, context.currentTime + 0.03);

  gain.gain.setValueAtTime(0.22, context.currentTime + Math.max(durationSeconds - 0.06, 0.04));

  gain.gain.linearRampToValueAtTime(0, context.currentTime + durationSeconds);

  oscillator.connect(gain);

  gain.connect(context.destination);

  oscillator.start();

  oscillator.stop(context.currentTime + durationSeconds + 0.03);

  activeOscillators.push(oscillator);

  activeGains.push(gain);
}

async function playSingleNote(note: MelodyNote): Promise<void> {
  stopPlayback();

  const context = await prepareAudio();

  isPlaying.value = true;

  activeNoteId.value = note.id;

  createTone(context, note, 0.8);

  const timer = setTimeout(() => {
    stopPlayback();
  }, 850);

  timers.push(timer);
}

async function playPhrase(phrase: MelodyPhrase): Promise<void> {
  stopPlayback();

  if (!phrase.notes.length) {
    return;
  }

  const context = await prepareAudio();

  isPlaying.value = true;

  activePhraseId.value = phrase.id;

  let elapsed = 0;

  phrase.notes.forEach((note) => {
    const durationMs = note.beats * 420;

    const timer = setTimeout(() => {
      activeNoteId.value = note.id;

      createTone(context, note, durationMs / 1000);
    }, elapsed);

    timers.push(timer);

    elapsed += durationMs;
  });

  const endTimer = setTimeout(() => {
    stopPlayback();
  }, elapsed + 100);

  timers.push(endTimer);
}

function stopPlayback(): void {
  timers.forEach((timer) => clearTimeout(timer));

  timers = [];

  if (audioContext) {
    const now = audioContext.currentTime;

    activeGains.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);

        gain.gain.setValueAtTime(gain.gain.value, now);

        gain.gain.linearRampToValueAtTime(0, now + 0.03);
      } catch {
        // Nodo terminado.
      }
    });

    activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop(now + 0.04);
      } catch {
        // Oscilador terminado.
      }
    });
  }

  activeOscillators = [];
  activeGains = [];

  activePhraseId.value = null;

  activeNoteId.value = null;

  isPlaying.value = false;
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
.melody-editor {
  padding: 18px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 15px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.kicker {
  color: #34d399;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

h3 {
  margin: 3px 0 4px;
  color: #edf3fa;
  font-size: 16px;
}

.heading-copy p {
  max-width: 600px;
  margin: 0;
  color: #718399;
  font-size: 10px;
  line-height: 1.45;
}

.add-phrase-button,
.first-phrase-button {
  color: white;
  background: #187c63;
  border-radius: 9px;
}

.scale-reference {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 15px;
  padding: 10px 12px;
  background: rgb(52 211 153 / 5%);
  border: 1px solid rgb(52 211 153 / 14%);
  border-radius: 10px;
}

.scale-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scale-info > .q-icon {
  color: #34d399;
  font-size: 18px;
}

.scale-info div {
  display: flex;
  flex-direction: column;
}

.scale-info span {
  color: #688a7e;
  font-size: 7px;
  text-transform: uppercase;
}

.scale-info strong {
  color: #b8d9cc;
  font-size: 10px;
}

.scale-notes {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
}

.scale-notes span {
  min-width: 31px;
  padding: 4px 6px;
  color: #a8cfc0;
  background: rgb(52 211 153 / 8%);
  border-radius: 6px;
  font-size: 8px;
  text-align: center;
}

.phrases {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.phrase-card {
  overflow: hidden;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 12px;
}

.phrase-card.active {
  border-color: rgb(52 211 153 / 60%);
}

.phrase-header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  background: rgb(255 255 255 / 1%);
  border-bottom: 1px solid #26394e;
}

.phrase-number {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  color: #87a697;
  background: rgb(52 211 153 / 8%);
  border-radius: 7px;
  font-size: 9px;
  font-weight: 700;
}

.phrase-title-area {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 7px;
}

.phrase-title-input {
  min-width: 0;
  flex: 1;
  padding: 5px 7px;
  color: #e4edf6;
  background: transparent;
  border: 0;
  border-bottom: 1px solid transparent;
  outline: none;
  font-size: 11px;
  font-weight: 650;
}

.phrase-title-input:focus {
  border-bottom-color: #45657d;
}

.phrase-title-area span {
  color: #60758c;
  font-size: 8px;
}

.phrase-actions {
  display: flex;
}

.phrase-actions .q-btn {
  color: #7f92a8;
}

.phrase-actions .delete-button {
  color: #c47783;
}

.phrase-content {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    190px;
  gap: 10px;
  padding: 10px;
}

.lyrics-area,
.chord-area {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.lyrics-area label,
.chord-area label {
  color: #778ba1;
  font-size: 8px;
}

.lyrics-area textarea,
.chord-area select {
  width: 100%;
  color: #cdd8e5;
  background: #0c1723;
  border: 1px solid #293d53;
  border-radius: 8px;
  outline: none;
  font: inherit;
  font-size: 9px;
}

.lyrics-area textarea {
  min-height: 58px;
  padding: 8px;
  resize: vertical;
}

.chord-area select {
  min-height: 34px;
  padding: 5px 7px;
}

.note-builder {
  margin: 0 10px 10px;
  padding: 10px;
  background: #0c1723;
  border: 1px solid #24374b;
  border-radius: 9px;
}

.builder-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.builder-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.builder-heading strong {
  color: #cdd8e5;
  font-size: 9px;
}

.builder-heading span {
  color: #60748b;
  font-size: 7px;
}

.octave-control {
  display: flex;
  align-items: center;
  gap: 5px;
}

.octave-control > span {
  margin-right: 2px;
  color: #697d93;
}

.octave-control button {
  width: 23px;
  height: 23px;
  padding: 0;
  color: #9aacbe;
  background: #152638;
  border: 1px solid #30465e;
  border-radius: 6px;
  cursor: pointer;
}

.octave-control strong {
  min-width: 18px;
  color: #d9e5f1;
  text-align: center;
}

.note-picker {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  margin-top: 9px;
}

.picker-note {
  min-height: 40px;
  padding: 4px;
  color: #8193a7;
  background: #111f2e;
  border: 1px solid #293d53;
  border-radius: 7px;
  cursor: pointer;
}

.picker-note strong,
.picker-note span {
  display: block;
}

.picker-note strong {
  font-size: 8px;
}

.picker-note span {
  color: #5d7188;
  font-size: 6px;
}

.picker-note.inScale {
  color: #b7d9cc;
  background: rgb(52 211 153 / 8%);
  border-color: rgb(52 211 153 / 28%);
}

.picker-note:hover {
  border-color: #34d399;
}

.duration-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.duration-picker > span {
  margin-right: 3px;
  color: #667a91;
  font-size: 7px;
}

.duration-picker button {
  padding: 4px 7px;
  color: #7d90a5;
  background: #122131;
  border: 1px solid #2c4055;
  border-radius: 6px;
  cursor: pointer;
  font-size: 7px;
}

.duration-picker button.active {
  color: #bce1d3;
  background: rgb(52 211 153 / 10%);
  border-color: rgb(52 211 153 / 45%);
}

.melody-line {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin: 0 10px 10px;
  padding: 9px;
  overflow-x: auto;
  background: rgb(255 255 255 / 1%);
  border-radius: 9px;
}

.melody-note {
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid #2a4055;
  border-radius: 8px;
}

.melody-note.playing {
  border-color: #34d399;
}

.note-main {
  display: flex;
  min-width: 64px;
  min-height: 55px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 6px;
  color: #dbe7f2;
  background: #122131;
  border: 0;
  cursor: pointer;
}

.note-main strong {
  font-size: 13px;
}

.note-main > span {
  color: #34d399;
  font-size: 8px;
}

.note-main small {
  margin-top: 2px;
  color: #657a91;
  font-size: 6px;
}

.note-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid #263b50;
}

.note-actions button {
  min-height: 21px;
  padding: 0;
  color: #71859a;
  background: #0d1925;
  border: 0;
  border-right: 1px solid #263b50;
  cursor: pointer;
  font-size: 11px;
}

.note-actions button:last-child {
  border-right: 0;
}

.note-actions button:disabled {
  opacity: 0.3;
}

.note-actions .remove-note {
  color: #c47783;
}

.empty-melody {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 10px 10px;
  padding: 12px;
  color: #5c7187;
  border: 1px dashed #2a3e53;
  border-radius: 9px;
}

.empty-melody .q-icon {
  font-size: 20px;
}

.empty-melody div {
  display: flex;
  flex-direction: column;
}

.empty-melody strong {
  color: #75899e;
  font-size: 8px;
}

.empty-melody span {
  font-size: 7px;
}

.empty-phrases {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: 14px;
  color: #596e84;
  border: 1px dashed #293d53;
  border-radius: 11px;
}

.empty-phrases > .q-icon {
  font-size: 28px;
}

.empty-phrases strong {
  margin-top: 5px;
  color: #75899e;
  font-size: 10px;
}

.empty-phrases span {
  margin: 2px 0 9px;
  font-size: 8px;
}

@media (max-width: 900px) {
  .note-picker {
    grid-template-columns: repeat(6, 1fr);
  }

  .phrase-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .section-heading,
  .scale-reference,
  .builder-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .scale-notes {
    justify-content: flex-start;
  }

  .note-picker {
    grid-template-columns: repeat(4, 1fr);
  }

  .phrase-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .phrase-title-area {
    min-width: 180px;
  }
}
</style>
