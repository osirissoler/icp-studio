<template>
  <section class="instrument-workspace">
    <header class="workspace-heading">
      <div class="heading-copy">
        <div class="heading-icon piano-icon">
          <q-icon name="piano" />
        </div>

        <div>
          <span class="section-kicker piano-kicker"> PIANO VIRTUAL </span>

          <h2>Piano Virtual</h2>

          <p>
            Toca con el mouse o con tu teclado físico. Las teclas reaccionan visualmente mientras
            las mantienes presionadas.
          </p>
        </div>
      </div>

      <div class="octave-toolbar">
        <span>Octava actual:</span>

        <strong>{{ keyboardOctave }}</strong>

        <button type="button" title="Bajar octava" @click="changeKeyboardOctave(-1)">
          <q-icon name="chevron_left" />
        </button>

        <button type="button" title="Subir octava" @click="changeKeyboardOctave(1)">
          <q-icon name="chevron_right" />
        </button>

        <button type="button" class="reset-button" @click="resetPiano">Restablecer</button>
      </div>
    </header>

    <div class="piano-layout">
      <main class="piano-main">
        <div class="theory-toolbar">
          <label>
            <span>Tonalidad</span>

            <select v-model.number="root">
              <option
                v-for="note in instrumentNotes"
                :key="note.pitchClass"
                :value="note.pitchClass"
              >
                {{ note.spanish }} · {{ note.international }}
              </option>
            </select>
          </label>

          <label>
            <span>Escala</span>

            <select v-model="scaleMode">
              <option value="major">Mayor</option>
              <option value="minor">Menor</option>
            </select>
          </label>

          <label>
            <span>Acorde</span>

            <select v-model="chordQuality">
              <option value="major">Mayor</option>
              <option value="minor">Menor</option>
              <option value="dominant7">Séptima dominante</option>
              <option value="major7">Mayor 7</option>
              <option value="minor7">Menor 7</option>
            </select>
          </label>

          <q-btn
            unelevated
            no-caps
            icon="play_arrow"
            label="Escuchar acorde"
            class="play-chord-button"
            @click="playChord"
          />

          <q-btn
            outline
            no-caps
            icon="stop"
            label="Detener"
            class="stop-button"
            @click="stopEverything"
          />
        </div>

        <div class="piano-case">
          <div class="piano-top-strip">
            <div class="brand">
              <span>ICP</span>
              <strong>STUDIO</strong>
            </div>

            <div class="leds">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div class="keyboard-scroll">
            <div class="keyboard">
              <div v-for="whiteKey in whiteKeys" :key="whiteKey.midi" class="white-slot">
                <button
                  type="button"
                  class="piano-key white-key"
                  :class="keyClasses(whiteKey)"
                  @pointerdown.prevent="pointerStart(whiteKey.midi)"
                  @pointerup.prevent="pointerStop(whiteKey.midi)"
                  @pointerleave="pointerStop(whiteKey.midi)"
                >
                  <span class="keyboard-letter">
                    {{ keyboardLabelForMidi(whiteKey.midi) }}
                  </span>

                  <span class="note-name"> {{ whiteKey.international }}{{ whiteKey.octave }} </span>

                  <span v-if="pressedMidis.has(whiteKey.midi)" class="active-glow"></span>
                </button>

                <button
                  v-if="blackKeyAfter(whiteKey.midi)"
                  type="button"
                  class="piano-key black-key"
                  :class="keyClasses(blackKeyAfter(whiteKey.midi)!)"
                  @pointerdown.prevent="pointerStart(blackKeyAfter(whiteKey.midi)!.midi)"
                  @pointerup.prevent="pointerStop(blackKeyAfter(whiteKey.midi)!.midi)"
                  @pointerleave="pointerStop(blackKeyAfter(whiteKey.midi)!.midi)"
                >
                  <span class="keyboard-letter">
                    {{ keyboardLabelForMidi(blackKeyAfter(whiteKey.midi)!.midi) }}
                  </span>

                  <span
                    v-if="pressedMidis.has(blackKeyAfter(whiteKey.midi)!.midi)"
                    class="black-active-glow"
                  ></span>
                </button>
              </div>
            </div>
          </div>

          <div class="playing-bar">
            <span class="playing-led" :class="{ active: pressedMidis.size > 0 }"></span>

            <strong>Tocando:</strong>

            <span>
              {{ playingLabels.length ? playingLabels.join(', ') : 'ninguna nota' }}
            </span>
          </div>
        </div>

        <div class="information-grid">
          <article>
            <span>TONALIDAD</span>
            <strong>{{ rootName }}</strong>

            <small>
              {{ scaleMode === 'major' ? 'Escala mayor' : 'Escala menor' }}
            </small>
          </article>

          <article>
            <span>NOTAS DE LA ESCALA</span>
            <strong>{{ scaleNames }}</strong>
          </article>

          <article>
            <span>NOTAS DEL ACORDE</span>
            <strong>{{ chordNames }}</strong>
          </article>
        </div>
      </main>

      <aside class="keyboard-help">
        <div class="keyboard-help-title">
          <q-icon name="keyboard" />

          <div>
            <strong>Teclas del teclado</strong>
            <span>Toca el instrumento con tu teclado físico</span>
          </div>
        </div>

        <div class="mapping-block">
          <div class="keys-row">
            <kbd>Z</kbd>
            <kbd>X</kbd>
            <kbd>C</kbd>
            <kbd>V</kbd>
            <kbd>B</kbd>
            <kbd>N</kbd>
            <kbd>M</kbd>
          </div>

          <span>Notas · octava actual</span>
        </div>

        <div class="mapping-block">
          <div class="keys-row">
            <kbd>S</kbd>
            <kbd>D</kbd>
            <kbd>G</kbd>
            <kbd>H</kbd>
            <kbd>J</kbd>
          </div>

          <span>Sostenidos</span>
        </div>

        <div class="mapping-block">
          <div class="keys-row">
            <kbd>Q</kbd>
            <kbd>W</kbd>
            <kbd>E</kbd>
            <kbd>R</kbd>
            <kbd>T</kbd>
            <kbd>Y</kbd>
            <kbd>U</kbd>
          </div>

          <span>Notas · octava superior</span>
        </div>

        <div class="mapping-block">
          <div class="keys-row">
            <kbd>2</kbd>
            <kbd>3</kbd>
            <kbd>5</kbd>
            <kbd>6</kbd>
            <kbd>7</kbd>
          </div>

          <span>Sostenidos · octava superior</span>
        </div>

        <div class="mapping-shortcut">
          <div>
            <kbd>←</kbd>
            <kbd>→</kbd>
          </div>

          <span>Cambiar octava</span>
        </div>

        <div class="mapping-shortcut">
          <kbd class="space-key">Espacio</kbd>
          <span>Detener todas las notas</span>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  playInstrumentChord,
  startInstrumentNote,
  stopAllInstrumentNotes,
  stopInstrumentVoice,
} from './instrument-audio';

import {
  buildPianoKeys,
  chordMidis,
  chordPitchClasses,
  instrumentNotes,
  midiSpanishLabel,
  noteDefinition,
  scalePitchClasses,
  type ChordQuality,
  type PianoKey,
  type ScaleMode,
} from './instrument-theory';

interface KeyboardNoteMapping {
  offset: number;
  label: string;
}

const keyboardMap: Record<string, KeyboardNoteMapping> = {
  z: { offset: 0, label: 'Z' },
  s: { offset: 1, label: 'S' },
  x: { offset: 2, label: 'X' },
  d: { offset: 3, label: 'D' },
  c: { offset: 4, label: 'C' },
  v: { offset: 5, label: 'V' },
  g: { offset: 6, label: 'G' },
  b: { offset: 7, label: 'B' },
  h: { offset: 8, label: 'H' },
  n: { offset: 9, label: 'N' },
  j: { offset: 10, label: 'J' },
  m: { offset: 11, label: 'M' },

  q: { offset: 12, label: 'Q' },
  '2': { offset: 13, label: '2' },
  w: { offset: 14, label: 'W' },
  '3': { offset: 15, label: '3' },
  e: { offset: 16, label: 'E' },
  r: { offset: 17, label: 'R' },
  '5': { offset: 18, label: '5' },
  t: { offset: 19, label: 'T' },
  '6': { offset: 20, label: '6' },
  y: { offset: 21, label: 'Y' },
  '7': { offset: 22, label: '7' },
  u: { offset: 23, label: 'U' },
};

const root = ref(0);
const scaleMode = ref<ScaleMode>('major');
const chordQuality = ref<ChordQuality>('major');
const keyboardOctave = ref(4);

const pressedMidis = ref<Set<number>>(new Set());

const keyboardPressed = new Map<string, number>();
const pointerPressed = new Map<number, string>();

const visiblePianoKeys = computed<PianoKey[]>(() => {
  const start = (keyboardOctave.value + 1) * 12;

  return buildPianoKeys(start, start + 24);
});

const whiteKeys = computed<PianoKey[]>(() => visiblePianoKeys.value.filter((key) => !key.black));

const scaleNotes = computed<number[]>(() => scalePitchClasses(root.value, scaleMode.value));

const chordNotes = computed<number[]>(() => chordPitchClasses(root.value, chordQuality.value));

const rootName = computed(() => {
  const note = noteDefinition(root.value);

  return `${note.spanish} · ${note.international}`;
});

const scaleNames = computed(() =>
  scaleNotes.value.map((pitchClass: number) => noteDefinition(pitchClass).spanish).join(' · '),
);

const chordNames = computed(() =>
  chordNotes.value.map((pitchClass: number) => noteDefinition(pitchClass).spanish).join(' · '),
);

const playingLabels = computed(() =>
  Array.from(pressedMidis.value)
    .sort((left: number, right: number) => left - right)
    .map((midi: number) => midiSpanishLabel(midi)),
);

function blackKeyAfter(midi: number): PianoKey | null {
  const candidate = visiblePianoKeys.value.find((key) => key.midi === midi + 1);

  return candidate?.black ? candidate : null;
}

function keyClasses(key: PianoKey): Record<string, boolean> {
  return {
    active: pressedMidis.value.has(key.midi),
    root: key.pitchClass === root.value,
    scale: scaleNotes.value.includes(key.pitchClass),
    chord: chordNotes.value.includes(key.pitchClass),
  };
}

function midiForKeyboardKey(key: string): number | null {
  const mapping = keyboardMap[key.toLowerCase()];

  if (!mapping) {
    return null;
  }

  const baseMidi = (keyboardOctave.value + 1) * 12;

  return baseMidi + mapping.offset;
}

function keyboardLabelForMidi(midi: number): string {
  const baseMidi = (keyboardOctave.value + 1) * 12;

  const offset = midi - baseMidi;

  const match = Object.values(keyboardMap).find((mapping) => mapping.offset === offset);

  return match?.label ?? '';
}

function pressMidi(midi: number): void {
  const next = new Set(pressedMidis.value);

  next.add(midi);

  pressedMidis.value = next;
}

function releaseMidi(midi: number): void {
  const next = new Set(pressedMidis.value);

  next.delete(midi);

  pressedMidis.value = next;
}

function pointerStart(midi: number): void {
  if (pointerPressed.has(midi)) {
    return;
  }

  const voiceId = `piano-pointer-${midi}`;

  pointerPressed.set(midi, voiceId);

  pressMidi(midi);

  startInstrumentNote(voiceId, midi, 0.2);
}

function pointerStop(midi: number): void {
  const voiceId = pointerPressed.get(midi);

  if (!voiceId) {
    return;
  }

  stopInstrumentVoice(voiceId);

  pointerPressed.delete(midi);

  if (!Array.from(keyboardPressed.values()).includes(midi)) {
    releaseMidi(midi);
  }
}

function playChord(): void {
  playInstrumentChord(chordMidis(root.value, chordQuality.value, keyboardOctave.value));
}

function resetPiano(): void {
  stopEverything();

  keyboardOctave.value = 4;
  root.value = 0;
  scaleMode.value = 'major';
  chordQuality.value = 'major';
}

function changeKeyboardOctave(direction: number): void {
  stopEverything();

  keyboardOctave.value = Math.max(2, Math.min(6, keyboardOctave.value + direction));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

function handleKeyDown(event: KeyboardEvent): void {
  if (isEditableTarget(event.target)) {
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();

    if (!event.repeat) {
      changeKeyboardOctave(-1);
    }

    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();

    if (!event.repeat) {
      changeKeyboardOctave(1);
    }

    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    stopEverything();

    return;
  }

  const key = event.key.toLowerCase();

  if (event.repeat || keyboardPressed.has(key)) {
    return;
  }

  const midi = midiForKeyboardKey(key);

  if (midi === null) {
    return;
  }

  event.preventDefault();

  keyboardPressed.set(key, midi);

  pressMidi(midi);

  startInstrumentNote(`piano-keyboard-${key}`, midi, 0.2);
}

function handleKeyUp(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();

  const midi = keyboardPressed.get(key);

  if (midi === undefined) {
    return;
  }

  stopInstrumentVoice(`piano-keyboard-${key}`);

  keyboardPressed.delete(key);

  if (!pointerPressed.has(midi)) {
    releaseMidi(midi);
  }
}

function stopEverything(): void {
  stopAllInstrumentNotes();

  keyboardPressed.clear();
  pointerPressed.clear();

  pressedMidis.value = new Set<number>();
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', stopEverything);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('blur', stopEverything);

  stopEverything();
});
</script>

<style scoped>
.instrument-workspace {
  overflow: hidden;
  padding: 20px;
  color: #e4edf7;
  background:
    radial-gradient(circle at 20% -10%, rgb(124 58 237 / 10%), transparent 35%),
    linear-gradient(180deg, #0d1825, #09131e);
  border: 1px solid #22364b;
  border-radius: 18px;
}

.workspace-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #203247;
}

.heading-copy {
  display: flex;
  align-items: center;
  gap: 13px;
}

.heading-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 12px;
}

.piano-icon {
  color: #e5e7eb;
  background: #182638;
  border: 1px solid #2f4259;
  font-size: 25px;
}

.section-kicker {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.piano-kicker {
  color: #8b5cf6;
}

h2 {
  margin: 3px 0 4px;
  color: #f3f6fa;
  font-size: 20px;
}

p {
  max-width: 720px;
  margin: 0;
  color: #8192a7;
  font-size: 11px;
  line-height: 1.5;
}

.octave-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: #101b29;
  border: 1px solid #293c50;
  border-radius: 10px;
}

.octave-toolbar span {
  margin-left: 5px;
  color: #8797aa;
  font-size: 9px;
}

.octave-toolbar strong {
  min-width: 20px;
  color: #f7f9fb;
  text-align: center;
}

.octave-toolbar button {
  display: grid;
  height: 30px;
  min-width: 30px;
  place-items: center;
  padding: 0 7px;
  color: #dce5ef;
  background: #2c2353;
  border: 1px solid #49377e;
  border-radius: 7px;
  cursor: pointer;
}

.octave-toolbar .reset-button {
  margin-left: 3px;
  color: #b8c4d1;
  background: #162333;
  border-color: #31445a;
  font-size: 9px;
}

.piano-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 14px;
  padding-top: 15px;
}

.theory-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.theory-toolbar label {
  min-width: 125px;
}

.theory-toolbar label span {
  display: block;
  margin-bottom: 4px;
  color: #718399;
  font-size: 8px;
  text-transform: uppercase;
}

.theory-toolbar select {
  width: 100%;
  height: 34px;
  padding: 0 9px;
  color: #dbe5f0;
  background: #101c2a;
  border: 1px solid #2c4056;
  border-radius: 8px;
}

.play-chord-button {
  color: white;
  background: #6941d9;
}

.stop-button {
  color: #bac8d7;
}

.piano-case {
  overflow: hidden;
  padding: 10px 10px 11px;
  background: linear-gradient(180deg, #202b37 0%, #101720 23%, #090d12 100%);
  border: 1px solid #394858;
  border-radius: 13px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 8%),
    0 14px 30px rgb(0 0 0 / 30%);
}

.piano-top-strip {
  display: flex;
  height: 28px;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 7px;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.brand span {
  color: #9f7aea;
  font-size: 9px;
  font-weight: 900;
}

.brand strong {
  color: #788898;
  font-size: 7px;
  letter-spacing: 0.16em;
}

.leds {
  display: flex;
  gap: 5px;
}

.leds span {
  width: 5px;
  height: 5px;
  background: #273545;
  border-radius: 50%;
}

.leds span:first-child {
  background: #4ade80;
  box-shadow: 0 0 7px rgb(74 222 128 / 70%);
}

.keyboard-scroll {
  overflow-x: auto;
  padding-bottom: 3px;
}

.keyboard {
  display: flex;
  width: max-content;
  min-width: 100%;
  height: 235px;
  align-items: flex-start;
}

.white-slot {
  position: relative;
  width: 50px;
  height: 230px;
  flex: 0 0 50px;
}

.piano-key {
  user-select: none;
  cursor: pointer;
}

.white-key {
  position: relative;
  z-index: 1;
  width: 49px;
  height: 228px;
  padding: 0;
  color: #202934;
  background: linear-gradient(90deg, #d8dee5 0%, #ffffff 10%, #f9fafb 78%, #d1d9e1 100%);
  border: 1px solid #5d6873;
  border-top-color: #dfe5ea;
  border-radius: 0 0 6px 6px;
  box-shadow:
    inset 0 -9px 9px rgb(0 0 0 / 8%),
    inset 2px 0 2px rgb(255 255 255 / 70%),
    1px 3px 3px rgb(0 0 0 / 40%);
  transition:
    transform 65ms ease,
    filter 65ms ease,
    background 70ms ease;
}

.black-key {
  position: absolute;
  z-index: 5;
  top: 0;
  right: -17px;
  width: 34px;
  height: 143px;
  padding: 0;
  color: #e7edf4;
  background: linear-gradient(90deg, #080b0e 0%, #242a30 18%, #080b0e 80%, #000 100%);
  border: 1px solid #000;
  border-radius: 0 0 5px 5px;
  box-shadow:
    inset 0 -8px 12px rgb(0 0 0 / 85%),
    inset 2px 0 2px rgb(255 255 255 / 9%),
    2px 5px 5px rgb(0 0 0 / 55%);
  transition:
    transform 65ms ease,
    background 70ms ease;
}

.keyboard-letter {
  position: absolute;
  right: 50%;
  bottom: 38px;
  display: grid;
  min-width: 25px;
  height: 25px;
  place-items: center;
  padding: 0 4px;
  color: #253142;
  background: rgb(217 223 230 / 85%);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 750;
  transform: translateX(50%);
}

.black-key .keyboard-letter {
  bottom: 17px;
  color: #f7f7f8;
  background: rgb(77 85 95 / 65%);
}

.note-name {
  position: absolute;
  right: 0;
  bottom: 11px;
  left: 0;
  color: #73808d;
  font-size: 7px;
  text-align: center;
}

.white-key.root {
  box-shadow:
    inset 0 -5px 0 #34d399,
    inset 0 -9px 9px rgb(0 0 0 / 8%);
}

.white-key.scale {
  box-shadow:
    inset 0 -5px 0 #60a5fa,
    inset 0 -9px 9px rgb(0 0 0 / 8%);
}

.white-key.chord {
  box-shadow:
    inset 0 -5px 0 #f59e0b,
    inset 0 -9px 9px rgb(0 0 0 / 8%);
}

.white-key.active {
  z-index: 3;
  background: linear-gradient(180deg, #dbeafe 0%, #93c5fd 100%);
  transform: translateY(5px);
  box-shadow:
    inset 0 -3px 0 #3b82f6,
    0 0 16px rgb(59 130 246 / 70%);
}

.black-key.active {
  background: linear-gradient(180deg, #2563eb, #0f255c);
  transform: translateY(4px);
  box-shadow:
    0 0 16px rgb(59 130 246 / 85%),
    inset 0 -5px 8px rgb(0 0 0 / 45%);
}

.active-glow {
  position: absolute;
  inset: auto 4px 0;
  height: 8px;
  background: #60a5fa;
  filter: blur(5px);
}

.black-active-glow {
  position: absolute;
  right: 4px;
  bottom: 0;
  left: 4px;
  height: 9px;
  background: #60a5fa;
  filter: blur(4px);
}

.playing-bar {
  display: flex;
  min-height: 31px;
  align-items: center;
  gap: 7px;
  padding: 6px 7px 0;
  color: #8092a8;
  font-size: 9px;
}

.playing-bar strong {
  color: #dce7f2;
}

.playing-led {
  width: 7px;
  height: 7px;
  background: #536477;
  border-radius: 50%;
}

.playing-led.active {
  background: #4ade80;
  box-shadow: 0 0 8px rgb(74 222 128 / 85%);
}

.information-grid {
  display: grid;
  grid-template-columns: 0.75fr 1.15fr 1.1fr;
  gap: 8px;
  margin-top: 10px;
}

.information-grid article {
  padding: 10px 11px;
  background: #0e1926;
  border: 1px solid #213348;
  border-radius: 10px;
}

.information-grid span {
  display: block;
  color: #6f8197;
  font-size: 7px;
  letter-spacing: 0.06em;
}

.information-grid strong {
  display: block;
  margin-top: 3px;
  color: #e5edf6;
  font-size: 10px;
}

.information-grid small {
  color: #6f8197;
  font-size: 8px;
}

.keyboard-help {
  padding: 13px;
  background: linear-gradient(180deg, #121f30, #0e1927);
  border: 1px solid #263a50;
  border-radius: 12px;
}

.keyboard-help-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 11px;
  border-bottom: 1px solid #26374b;
}

.keyboard-help-title .q-icon {
  color: #8b5cf6;
  font-size: 20px;
}

.keyboard-help-title div {
  display: flex;
  flex-direction: column;
}

.keyboard-help-title strong {
  color: #e4ebf3;
  font-size: 10px;
}

.keyboard-help-title span {
  color: #6f8298;
  font-size: 7px;
}

.mapping-block {
  margin-top: 12px;
}

.mapping-block > span,
.mapping-shortcut > span {
  color: #7e90a5;
  font-size: 8px;
}

.keys-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 5px;
}

kbd {
  display: inline-grid;
  min-width: 23px;
  height: 23px;
  place-items: center;
  padding: 0 5px;
  color: #e5ecf4;
  background: linear-gradient(#253448, #131f2d);
  border: 1px solid #3a4d63;
  border-bottom-width: 2px;
  border-radius: 5px;
  font-family: inherit;
  font-size: 8px;
}

.mapping-shortcut {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  margin-top: 12px;
}

.space-key {
  min-width: 62px;
}

@media (max-width: 1120px) {
  .piano-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .workspace-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .information-grid {
    grid-template-columns: 1fr;
  }
}
</style>
