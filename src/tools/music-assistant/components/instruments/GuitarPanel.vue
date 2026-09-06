<template>
  <section class="guitar-page">
    <!-- CABECERA -->
    <header class="guitar-header">
      <div class="title-area">
        <div class="title-icon">
          <q-icon name="music_note" />
        </div>

        <div>
          <span class="eyebrow"> GUITARRA VIRTUAL </span>

          <h2>Guitarra Virtual</h2>

          <p>Toca con el mouse o con tu teclado. Pasa el mouse por las cuerdas para rasguear.</p>
        </div>
      </div>

      <div class="controls">
        <label>
          <span>Buscar nota</span>

          <select v-model.number="searchPitchClass">
            <option :value="-1">Todas</option>

            <option v-for="note in instrumentNotes" :key="note.pitchClass" :value="note.pitchClass">
              {{ note.spanish }}
              ({{ note.international }})
            </option>
          </select>
        </label>

        <label>
          <span>Tonalidad</span>

          <select v-model.number="root">
            <option v-for="note in instrumentNotes" :key="note.pitchClass" :value="note.pitchClass">
              {{ note.spanish }}
              ({{ note.international }})
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

        <q-btn
          outline
          no-caps
          icon="restart_alt"
          label="Restablecer"
          class="reset-button"
          @click="resetGuitar"
        />

        <div class="active-fret-card">
          <span>Traste activo</span>

          <strong>
            {{ activeFret }}
          </strong>
        </div>
      </div>
    </header>

    <!-- LEYENDA -->
    <div class="legend">
      <span>
        <i class="legend-dot root-dot"></i>
        Nota raíz
      </span>

      <span>
        <i class="legend-dot scale-dot"></i>
        Nota de escala
      </span>

      <span>
        <i class="legend-dot search-dot"></i>
        Nota buscada
      </span>
    </div>

    <div class="workspace">
      <!-- ÁREA PRINCIPAL -->
      <main class="instrument-area">
        <div class="guitar-viewport">
          <div class="guitar-canvas">
            <!--
              LA GUITARRA REAL.
              Ya no dibujamos el cuerpo con SVG/CSS.
            -->
            <img
              :src="guitarBaseImage"
              class="guitar-image"
              alt="Guitarra acústica ICP Studio"
              draggable="false"
            />

            <!-- NÚMEROS DE TRASTE -->
            <div class="fret-number-layer">
              <button
                v-for="fret in frets"
                :key="`fret-${fret}`"
                type="button"
                class="fret-number"
                :class="{
                  active: activeFret === fret,
                }"
                :style="fretNumberStyle(fret)"
                @click="activeFret = fret"
              >
                {{ fret }}
              </button>
            </div>

            <!-- ETIQUETAS DE LAS 6 CUERDAS -->
            <div class="string-label-layer">
              <button
                v-for="string in guitarStrings"
                :key="`label-${string.number}`"
                type="button"
                class="string-label"
                :style="stringLabelStyle(string.number)"
                @pointerdown.prevent="holdPointerString(string.number, string.midi)"
                @pointerup.prevent="releasePointerString(string.number)"
                @pointercancel="releasePointerString(string.number)"
                @pointerleave="releasePointerString(string.number)"
              >
                <kbd>
                  {{ string.number }}
                </kbd>

                <strong>
                  {{ string.name }}
                </strong>

                <span>
                  {{ midiLabel(string.midi) }}
                </span>
              </button>
            </div>

            <!--
              CUERDAS FUNCIONALES.

              La zona clicable es deliberadamente
              más gruesa que la cuerda visible.
              Así el rasgueo es fácil y natural.
            -->
            <div class="strings-layer">
              <button
                v-for="string in guitarStrings"
                :key="`string-${string.number}`"
                type="button"
                class="string-hitbox"
                :class="{
                  vibrating: vibratingStrings.has(string.number),
                  held: heldStringNumbers.has(string.number),
                }"
                :style="stringStyle(string.number)"
                :aria-label="`Cuerda ${string.number} ${string.name}`"
                @pointerenter="strumString(string.number, string.midi)"
                @pointerdown.prevent="holdPointerString(string.number, string.midi)"
                @pointerup.prevent="releasePointerString(string.number)"
                @pointercancel="releasePointerString(string.number)"
              >
                <span class="interactive-string">
                  <span class="string-light"></span>
                </span>
              </button>
            </div>

            <!-- NOTAS DE ESCALA / BÚSQUEDA -->
            <div class="note-layer">
              <template v-for="string in guitarStrings" :key="`notes-${string.number}`">
                <button
                  v-for="fret in frets"
                  :key="`note-${string.number}-${fret}`"
                  v-show="shouldShowPosition(string.midi, fret)"
                  type="button"
                  class="note-marker"
                  :class="noteMarkerClasses(string.number, string.midi, fret)"
                  :style="noteMarkerStyle(string.number, fret)"
                  @click="playPosition(string.number, string.midi, fret)"
                >
                  {{ noteDefinition(string.midi + fret).international }}
                </button>
              </template>
            </div>

            <!-- EFECTO DE RASGUEO CERCA DE LA BOCA -->
            <div v-if="showStrumEffect" class="strum-ripple">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <!-- ESTADO -->
        <div class="playing-status">
          <span
            class="status-dot"
            :class="{
              active: vibratingStrings.size > 0,
            }"
          ></span>

          <strong> Tocando: </strong>

          <span>
            {{ currentPlayingDescription }}
          </span>
        </div>

        <!-- INFORMACIÓN -->
        <div class="summary-grid">
          <article>
            <q-icon name="graphic_eq" class="summary-icon" />

            <div>
              <span>AFINACIÓN ESTÁNDAR</span>

              <strong> Mi · La · Re · Sol · Si · Mi </strong>

              <small> E2 · A2 · D3 · G3 · B3 · E4 </small>
            </div>
          </article>

          <article>
            <q-icon name="music_note" class="summary-icon gold" />

            <div>
              <span>ESCALA ACTUAL</span>

              <strong>
                {{ rootName }}
                {{ scaleMode === 'major' ? 'mayor' : 'menor' }}
              </strong>

              <small>
                {{ scaleNames }}
              </small>
            </div>
          </article>

          <article>
            <q-icon name="apps" class="summary-icon" />

            <div>
              <span>TRASTE ACTUAL</span>

              <strong>
                {{ activeFret }}
              </strong>

              <small> A S D F G H J K L Ñ </small>
            </div>
          </article>
        </div>
      </main>

      <!-- PANEL TECLADO -->
      <aside class="keyboard-panel">
        <div class="keyboard-title">
          <q-icon name="keyboard" />

          <div>
            <strong> Controles del teclado </strong>

            <span> Toca la guitarra con tu teclado físico </span>
          </div>
        </div>

        <div class="keyboard-columns">
          <div>
            <span class="column-title"> CUERDAS </span>

            <div
              v-for="string in guitarStrings"
              :key="`keyboard-string-${string.number}`"
              class="mapping-row"
              :class="{
                active: heldStringNumbers.has(string.number),
              }"
            >
              <kbd>
                {{ string.number }}
              </kbd>

              <span>
                Cuerda {{ string.number }} · {{ string.name }} ({{ midiLabel(string.midi) }})
              </span>
            </div>
          </div>

          <div>
            <span class="column-title"> TRASTES </span>

            <div
              v-for="mapping in fretMappings"
              :key="mapping.key"
              class="mapping-row"
              :class="{
                selected: activeFret === mapping.fret,
              }"
            >
              <kbd>
                {{ mapping.label }}
              </kbd>

              <span> Traste {{ mapping.fret }} </span>
            </div>
          </div>
        </div>

        <div class="tip-card">
          <q-icon name="lightbulb" />

          <div>
            <strong> Rasgueo con mouse </strong>

            <p>
              Pasa el mouse de arriba hacia abajo o de abajo hacia arriba atravesando las seis
              cuerdas.
            </p>

            <small> No necesitas hacer clic. Cada cuerda sonará al atravesarla. </small>
          </div>
        </div>

        <div class="keyboard-tip">
          <strong> Acordes manuales </strong>

          <p>
            Mantén varias teclas del
            <b>1 al 6</b>
            presionadas simultáneamente.
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import guitarBaseImage from '../../assets/acoustic-guitar-base.png';

import {
  playInstrumentNote,
  startInstrumentNote,
  stopAllInstrumentNotes,
  stopInstrumentVoice,
} from './instrument-audio';

import {
  guitarStrings,
  instrumentNotes,
  midiLabel,
  midiSpanishLabel,
  normalizePitchClass,
  noteDefinition,
  scalePitchClasses,
  type ScaleMode,
} from './instrument-theory';

interface FretMapping {
  key: string;
  label: string;
  fret: number;
}

const fretMappings: FretMapping[] = [
  {
    key: 'a',
    label: 'A',
    fret: 0,
  },
  {
    key: 's',
    label: 'S',
    fret: 1,
  },
  {
    key: 'd',
    label: 'D',
    fret: 2,
  },
  {
    key: 'f',
    label: 'F',
    fret: 3,
  },
  {
    key: 'g',
    label: 'G',
    fret: 4,
  },
  {
    key: 'h',
    label: 'H',
    fret: 5,
  },
  {
    key: 'j',
    label: 'J',
    fret: 6,
  },
  {
    key: 'k',
    label: 'K',
    fret: 7,
  },
  {
    key: 'l',
    label: 'L',
    fret: 8,
  },
  {
    key: 'ñ',
    label: 'Ñ',
    fret: 9,
  },
];

const frets = Array.from(
  {
    length: 16,
  },
  (_, index) => index,
);

const root = ref(0);

const scaleMode = ref<ScaleMode>('major');

const searchPitchClass = ref(-1);

const activeFret = ref(0);

const vibratingStrings = ref<Set<number>>(new Set<number>());

const heldStringNumbers = ref<Set<number>>(new Set<number>());

const activeStringMidis = ref<Map<number, number>>(new Map<number, number>());

const keyboardHeldStrings = new Set<number>();

const pointerHeldStrings = new Set<number>();

const vibrationTimers = new Map<number, ReturnType<typeof setTimeout>>();

const strumCooldown = new Map<number, number>();

const noteCleanupTimers = new Map<number, ReturnType<typeof setTimeout>>();

const showStrumEffect = ref(false);

let strumEffectTimer: ReturnType<typeof setTimeout> | null = null;

const scaleNotes = computed<number[]>(() => scalePitchClasses(root.value, scaleMode.value));

const rootName = computed(() => noteDefinition(root.value).spanish);

const scaleNames = computed(() =>
  scaleNotes.value.map((pitchClass: number) => noteDefinition(pitchClass).spanish).join(' · '),
);

const currentPlayingDescription = computed(() => {
  if (activeStringMidis.value.size === 0) {
    return 'ninguna cuerda';
  }

  return Array.from(activeStringMidis.value.entries())
    .sort(([left], [right]) => left - right)
    .map(([stringNumber, midi]) => `C${stringNumber} · ${midiSpanishLabel(midi)}`)
    .join(', ');
});

/*
 * Coordenadas tomadas sobre la imagen
 * acoustic-guitar-base.png.
 *
 * La guitarra generada tiene las cuerdas
 * perfectamente centradas sobre la boca.
 *
 * El canvas conserva siempre la misma
 * proporción, así que podemos trabajar
 * con porcentajes.
 */
function stringTop(stringNumber: number): number {
  /*
   * Aproximadamente:
   *
   * cuerda 1 -> 40.7 %
   * cuerda 2 -> 44.2 %
   * cuerda 3 -> 47.7 %
   * cuerda 4 -> 51.2 %
   * cuerda 5 -> 54.7 %
   * cuerda 6 -> 58.2 %
   */
  return 40.7 + (stringNumber - 1) * 3.5;
}

function stringStyle(stringNumber: number): Record<string, string> {
  return {
    top: `${stringTop(stringNumber)}%`,

    '--string-thickness': `${0.75 + stringNumber * 0.22}px`,
  };
}

function stringLabelStyle(stringNumber: number): Record<string, string> {
  return {
    top: `calc(${stringTop(stringNumber)}% - 15px)`,
  };
}

/*
 * Coordenadas horizontales aproximadas
 * de cada centro de traste sobre la
 * imagen generada.
 *
 * Se utilizan posiciones reales en
 * porcentaje en lugar de repartir
 * artificialmente los trastes.
 */
const fretCenters = [
  37.4, 40.4, 43.2, 45.9, 48.5, 51.0, 53.4, 55.8, 58.1, 60.4, 62.6, 64.8, 67.0, 69.2, 71.4, 73.6,
];

function fretLeft(fret: number): number {
  return fretCenters[fret] ?? fretCenters[fretCenters.length - 1]!;
}

function fretNumberStyle(fret: number): Record<string, string> {
  return {
    left: `${fretLeft(fret)}%`,
  };
}

function noteMarkerStyle(stringNumber: number, fret: number): Record<string, string> {
  return {
    top: `${stringTop(stringNumber)}%`,

    left: `${fretLeft(fret)}%`,
  };
}

function shouldShowPosition(openMidi: number, fret: number): boolean {
  const pitchClass = normalizePitchClass(openMidi + fret);

  if (searchPitchClass.value >= 0) {
    return pitchClass === searchPitchClass.value;
  }

  return scaleNotes.value.includes(pitchClass);
}

function noteMarkerClasses(
  stringNumber: number,
  openMidi: number,
  fret: number,
): Record<string, boolean> {
  const midi = openMidi + fret;

  const pitchClass = normalizePitchClass(midi);

  return {
    root: pitchClass === root.value,

    scale: scaleNotes.value.includes(pitchClass),

    searched: searchPitchClass.value >= 0 && pitchClass === searchPitchClass.value,

    playing: activeStringMidis.value.get(stringNumber) === midi,
  };
}

function updateHeldVisuals(): void {
  heldStringNumbers.value = new Set<number>([...keyboardHeldStrings, ...pointerHeldStrings]);
}

function updateActiveMidi(stringNumber: number, midi: number | null): void {
  const next = new Map(activeStringMidis.value);

  if (midi === null) {
    next.delete(stringNumber);
  } else {
    next.set(stringNumber, midi);
  }

  activeStringMidis.value = next;
}

function setVibrating(stringNumber: number, duration = 700): void {
  const previous = vibrationTimers.get(stringNumber);

  if (previous) {
    clearTimeout(previous);
  }

  const next = new Set(vibratingStrings.value);

  next.add(stringNumber);

  vibratingStrings.value = next;

  const timer = setTimeout(() => {
    if (keyboardHeldStrings.has(stringNumber) || pointerHeldStrings.has(stringNumber)) {
      return;
    }

    const updated = new Set(vibratingStrings.value);

    updated.delete(stringNumber);

    vibratingStrings.value = updated;

    vibrationTimers.delete(stringNumber);
  }, duration);

  vibrationTimers.set(stringNumber, timer);
}

function stopVibrating(stringNumber: number): void {
  const timer = vibrationTimers.get(stringNumber);

  if (timer) {
    clearTimeout(timer);

    vibrationTimers.delete(stringNumber);
  }

  const next = new Set(vibratingStrings.value);

  next.delete(stringNumber);

  vibratingStrings.value = next;
}

function showRasgueo(): void {
  showStrumEffect.value = true;

  if (strumEffectTimer) {
    clearTimeout(strumEffectTimer);
  }

  strumEffectTimer = setTimeout(() => {
    showStrumEffect.value = false;

    strumEffectTimer = null;
  }, 290);
}

/*
 * Rasgueo al pasar el mouse.
 *
 * No requiere click.
 */
function strumString(stringNumber: number, openMidi: number): void {
  /*
   * Si estamos manteniendo esa cuerda
   * físicamente, no disparamos otro
   * sonido de rasgueo encima.
   */
  if (keyboardHeldStrings.has(stringNumber) || pointerHeldStrings.has(stringNumber)) {
    return;
  }

  const now = performance.now();

  const previous = strumCooldown.get(stringNumber) ?? 0;

  /*
   * Impide que pequeños movimientos
   * dentro de la misma zona disparen
   * la cuerda muchas veces.
   */
  if (now - previous < 110) {
    return;
  }

  strumCooldown.set(stringNumber, now);

  const midi = openMidi + activeFret.value;

  setVibrating(stringNumber, 720);

  updateActiveMidi(stringNumber, midi);

  playInstrumentNote(midi, 1.55, 0.18);

  const previousCleanup = noteCleanupTimers.get(stringNumber);

  if (previousCleanup) {
    clearTimeout(previousCleanup);
  }

  const cleanup = setTimeout(() => {
    if (keyboardHeldStrings.has(stringNumber) || pointerHeldStrings.has(stringNumber)) {
      return;
    }

    if (activeStringMidis.value.get(stringNumber) === midi) {
      updateActiveMidi(stringNumber, null);
    }

    noteCleanupTimers.delete(stringNumber);
  }, 1200);

  noteCleanupTimers.set(stringNumber, cleanup);

  showRasgueo();
}

/*
 * Mantener cuerda con mouse.
 */
function holdPointerString(stringNumber: number, openMidi: number): void {
  if (pointerHeldStrings.has(stringNumber)) {
    return;
  }

  pointerHeldStrings.add(stringNumber);

  updateHeldVisuals();

  const midi = openMidi + activeFret.value;

  updateActiveMidi(stringNumber, midi);

  setVibrating(stringNumber, 10000);

  startInstrumentNote(`guitar-pointer-${stringNumber}`, midi, 0.18);
}

function releasePointerString(stringNumber: number): void {
  if (!pointerHeldStrings.has(stringNumber)) {
    return;
  }

  pointerHeldStrings.delete(stringNumber);

  updateHeldVisuals();

  stopInstrumentVoice(`guitar-pointer-${stringNumber}`);

  if (!keyboardHeldStrings.has(stringNumber)) {
    stopVibrating(stringNumber);

    updateActiveMidi(stringNumber, null);
  }
}

/*
 * Mantener cuerda desde teclado.
 */
function holdKeyboardString(stringNumber: number, openMidi: number): void {
  if (keyboardHeldStrings.has(stringNumber)) {
    return;
  }

  keyboardHeldStrings.add(stringNumber);

  updateHeldVisuals();

  const midi = openMidi + activeFret.value;

  updateActiveMidi(stringNumber, midi);

  setVibrating(stringNumber, 10000);

  startInstrumentNote(`guitar-keyboard-${stringNumber}`, midi, 0.18);
}

function releaseKeyboardString(stringNumber: number): void {
  if (!keyboardHeldStrings.has(stringNumber)) {
    return;
  }

  keyboardHeldStrings.delete(stringNumber);

  updateHeldVisuals();

  stopInstrumentVoice(`guitar-keyboard-${stringNumber}`);

  if (!pointerHeldStrings.has(stringNumber)) {
    stopVibrating(stringNumber);

    updateActiveMidi(stringNumber, null);
  }
}

/*
 * Click directo sobre una nota
 * del diapasón.
 */
function playPosition(stringNumber: number, openMidi: number, fret: number): void {
  activeFret.value = fret;

  const midi = openMidi + fret;

  setVibrating(stringNumber, 750);

  updateActiveMidi(stringNumber, midi);

  playInstrumentNote(midi, 1.5, 0.19);

  window.setTimeout(() => {
    if (keyboardHeldStrings.has(stringNumber) || pointerHeldStrings.has(stringNumber)) {
      return;
    }

    if (activeStringMidis.value.get(stringNumber) === midi) {
      updateActiveMidi(stringNumber, null);
    }
  }, 1200);
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

  const key = event.key.toLowerCase();

  /*
   * TRASTES A–Ñ
   */
  const fretMapping = fretMappings.find((mapping) => mapping.key === key);

  if (fretMapping && !event.repeat) {
    event.preventDefault();

    activeFret.value = fretMapping.fret;

    return;
  }

  /*
   * CUERDAS 1–6
   */
  const stringNumber = Number(key);

  if (!Number.isInteger(stringNumber) || stringNumber < 1 || stringNumber > 6 || event.repeat) {
    return;
  }

  const string = guitarStrings.find((candidate) => candidate.number === stringNumber);

  if (!string) {
    return;
  }

  event.preventDefault();

  holdKeyboardString(string.number, string.midi);
}

function handleKeyUp(event: KeyboardEvent): void {
  const stringNumber = Number(event.key);

  if (!Number.isInteger(stringNumber) || stringNumber < 1 || stringNumber > 6) {
    return;
  }

  releaseKeyboardString(stringNumber);
}

function resetGuitar(): void {
  stopEverything();

  root.value = 0;

  scaleMode.value = 'major';

  searchPitchClass.value = -1;

  activeFret.value = 0;
}

function stopEverything(): void {
  stopAllInstrumentNotes();

  keyboardHeldStrings.clear();

  pointerHeldStrings.clear();

  updateHeldVisuals();

  vibrationTimers.forEach((timer) => {
    clearTimeout(timer);
  });

  vibrationTimers.clear();

  noteCleanupTimers.forEach((timer) => {
    clearTimeout(timer);
  });

  noteCleanupTimers.clear();

  strumCooldown.clear();

  vibratingStrings.value = new Set<number>();

  activeStringMidis.value = new Map<number, number>();

  if (strumEffectTimer) {
    clearTimeout(strumEffectTimer);

    strumEffectTimer = null;
  }

  showStrumEffect.value = false;
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
.guitar-page {
  min-height: 100%;
  padding: 20px;
  overflow: hidden;
  color: #e6edf5;
  background:
    radial-gradient(circle at 65% 48%, rgb(190 92 22 / 8%), transparent 32%),
    linear-gradient(145deg, #0b1622, #07111b 62%, #0b151f);
  border: 1px solid #23364a;
  border-radius: 18px;
}

/* CABECERA */

.guitar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 15px;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 14px;
}

.title-icon {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  place-items: center;
  color: #ffbd4d;
  background: linear-gradient(145deg, rgb(251 191 36 / 15%), rgb(87 47 17 / 20%));
  border: 1px solid #a96926;
  border-radius: 14px;
  box-shadow:
    inset 0 0 16px rgb(251 191 36 / 7%),
    0 5px 15px rgb(0 0 0 / 20%);
}

.title-icon .q-icon {
  font-size: 31px;
}

.eyebrow {
  color: #e9a93f;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

h2 {
  margin: 2px 0 3px;
  color: #f5f7fa;
  font-size: 24px;
}

.title-area p {
  margin: 0;
  color: #8293a7;
  font-size: 11px;
}

/* CONTROLES */

.controls {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.controls label {
  min-width: 125px;
}

.controls label > span,
.active-fret-card > span {
  display: block;
  margin-bottom: 4px;
  color: #74869c;
  font-size: 8px;
}

.controls select {
  width: 100%;
  height: 36px;
  padding: 0 9px;
  color: #e3ebf4;
  background: #101c2a;
  border: 1px solid #2a3e54;
  border-radius: 8px;
}

.reset-button {
  height: 36px;
  color: #e5b35f;
  border-color: #9c672b;
  border-radius: 8px;
}

.active-fret-card {
  min-width: 84px;
  padding: 6px 11px;
  background: #101c2a;
  border: 1px solid #2a3e54;
  border-radius: 9px;
}

.active-fret-card strong {
  display: block;
  color: #ffb743;
  font-size: 21px;
  line-height: 1;
}

/* LEYENDA */

.legend {
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  padding: 8px 4px 12px;
  color: #8999ab;
  border-top: 1px solid #1c2c3d;
  font-size: 8px;
}

.legend-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 4px;
  border-radius: 50%;
}

.root-dot {
  background: #ffbd49;
}

.scale-dot {
  background: #3b82f6;
}

.search-dot {
  background: #e95bd6;
}

/* DISTRIBUCIÓN */

.workspace {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    285px;
  gap: 16px;
}

.instrument-area {
  min-width: 0;
}

/* GUITARRA */

.guitar-viewport {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 0 14px;
}

.guitar-canvas {
  position: relative;

  /*
   * Proporción de la imagen generada:
   * aproximadamente 2048 x 768.
   */
  width: 1180px;
  height: 443px;

  margin: 0 auto;
}

.guitar-image {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
  user-select: none;

  filter: drop-shadow(0 18px 22px rgb(0 0 0 / 34%));
}

/* NÚMEROS DE TRASTE */

.fret-number-layer {
  position: absolute;
  z-index: 24;
  inset: 0;
  pointer-events: none;
}

.fret-number {
  position: absolute;
  top: 32.5%;
  width: 26px;
  height: 22px;
  padding: 0;
  color: #8192a6;
  background: rgb(8 17 26 / 72%);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 8px;
  pointer-events: auto;
  transform: translateX(-50%);
}

.fret-number:hover {
  color: #ffd072;
  background: rgb(93 55 18 / 68%);
}

.fret-number.active {
  color: #ffbe4c;
  background: rgb(118 71 18 / 78%);
  font-weight: 850;
  box-shadow: 0 0 9px rgb(255 185 65 / 28%);
}

/* ETIQUETAS */

.string-label-layer {
  position: absolute;
  z-index: 45;
  inset: 0;
  pointer-events: none;
}

.string-label {
  position: absolute;
  left: 1.2%;
  display: grid;
  width: 118px;
  height: 30px;
  grid-template-columns: 24px 28px 1fr;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  color: #d0dae5;
  background: rgb(9 20 30 / 93%);
  border: 1px solid #31506a;
  border-radius: 9px;
  cursor: pointer;
  pointer-events: auto;
  text-align: left;
  transform: translateY(-50%);
  transition:
    background 100ms ease,
    border-color 100ms ease;
}

.string-label:hover {
  background: #162b3e;
  border-color: #e2a03d;
}

.string-label kbd {
  display: grid;
  width: 21px;
  height: 21px;
  place-items: center;
  padding: 0;
  color: white;
  background: #17293b;
  border: 1px solid #4b6176;
  border-radius: 5px;
  font-family: inherit;
  font-size: 9px;
}

.string-label strong {
  color: #f0f4f8;
  font-size: 9px;
}

.string-label span {
  color: #8999aa;
  font-size: 8px;
}

/* CUERDAS INTERACTIVAS */

.strings-layer {
  position: absolute;
  z-index: 30;
  inset: 0;
  pointer-events: none;
}

.string-hitbox {
  position: absolute;

  /*
   * Inicia cerca del puente y termina
   * antes del extremo del clavijero.
   */
  left: 14.3%;
  right: 2.1%;

  /*
   * El hitbox es mucho mayor que
   * la línea visible.
   */
  height: 18px;

  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  pointer-events: auto;

  transform: translateY(-50%);
}

.interactive-string {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;

  height: var(--string-thickness);

  background: linear-gradient(180deg, #fffdf4 0%, #d8d0c3 42%, #898178 72%, #5c554e 100%);

  box-shadow: 0 1px 1px rgb(0 0 0 / 90%);

  transform: translateY(-50%);

  transform-origin: left center;

  transition:
    filter 80ms ease,
    box-shadow 80ms ease;
}

.string-light {
  position: absolute;
  inset: 0;

  background: linear-gradient(
    90deg,
    rgb(255 193 76 / 38%),
    transparent 26%,
    rgb(255 255 255 / 12%) 65%,
    transparent
  );
}

.string-hitbox:hover .interactive-string {
  filter: brightness(1.8);
}

.string-hitbox.held .interactive-string {
  background: #ffcf72;
}

.string-hitbox.vibrating .interactive-string {
  background: linear-gradient(180deg, #fff3ad, #ffc34c 55%, #d5871b);

  box-shadow:
    0 0 3px #ffc75c,
    0 0 10px rgb(255 183 58 / 90%);

  animation: realistic-string-vibration 52ms linear infinite alternate;
}

/* NOTAS */

.note-layer {
  position: absolute;
  z-index: 42;
  inset: 0;
  pointer-events: none;
}

.note-marker {
  position: absolute;
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  padding: 0;
  color: white;
  background: linear-gradient(145deg, #5aa0ff, #2563eb);
  border: 2px solid rgb(217 235 255 / 88%);
  border-radius: 50%;
  box-shadow: 0 0 9px rgb(59 130 246 / 72%);
  cursor: pointer;
  font-size: 8px;
  font-weight: 850;
  pointer-events: auto;
  transform: translate(-50%, -50%);
  transition: transform 100ms ease;
}

.note-marker:hover {
  transform: translate(-50%, -50%) scale(1.12);
}

.note-marker.root {
  color: #2d1d06;
  background: linear-gradient(145deg, #ffe08a, #f5a623);
  border-color: #ffe3a0;
  box-shadow: 0 0 10px rgb(255 193 77 / 88%);
}

.note-marker.searched {
  color: white;
  background: linear-gradient(145deg, #f58be7, #d946c6);
  border-color: #ffc0f5;
  box-shadow: 0 0 10px rgb(231 91 213 / 88%);
}

.note-marker.playing {
  color: #092517;
  background: #4ade80;
  border-color: white;

  transform: translate(-50%, -50%) scale(1.2);

  box-shadow:
    0 0 5px white,
    0 0 19px rgb(74 222 128 / 95%);
}

/* EFECTO RASGUEO */

.strum-ripple {
  position: absolute;
  z-index: 50;

  /*
   * Centro aproximado de la boca
   * de la guitarra de la imagen.
   */
  top: 33%;
  left: 24.5%;

  width: 135px;
  height: 135px;

  pointer-events: none;
}

.strum-ripple span {
  position: absolute;
  top: 50%;
  left: 50%;

  border: 2px solid rgb(255 187 66 / 68%);

  border-radius: 50%;

  animation: strum-wave 290ms ease-out forwards;
}

.strum-ripple span:nth-child(2) {
  animation-delay: 35ms;
}

.strum-ripple span:nth-child(3) {
  animation-delay: 70ms;
}

/* STATUS */

.playing-status {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 0 12px;
  color: #8294a8;
  background: #0b1722;
  border: 1px solid #22384c;
  border-radius: 10px;
  font-size: 9px;
}

.playing-status strong {
  color: #dbe5ef;
}

.status-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  background: #56677a;
  border-radius: 50%;
}

.status-dot.active {
  background: #4ade80;
  box-shadow: 0 0 9px rgb(74 222 128 / 85%);
}

/* TARJETAS */

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.summary-grid article {
  display: flex;
  min-height: 80px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(145deg, #101d2b, #0b1722);
  border: 1px solid #263a4e;
  border-radius: 11px;
}

.summary-icon {
  width: 35px;
  flex: 0 0 auto;
  color: #74a9ff;
  font-size: 23px;
}

.summary-icon.gold {
  color: #f4b546;
}

.summary-grid span {
  display: block;
  color: #718399;
  font-size: 7px;
  letter-spacing: 0.08em;
}

.summary-grid strong {
  display: block;
  margin-top: 4px;
  color: #e5edf5;
  font-size: 10px;
}

.summary-grid small {
  display: block;
  margin-top: 2px;
  color: #71849a;
  font-size: 8px;
}

/* PANEL DEL TECLADO */

.keyboard-panel {
  align-self: end;
  padding: 15px;
  background: linear-gradient(145deg, #112030, #0c1723);
  border: 1px solid #263d54;
  border-radius: 13px;
}

.keyboard-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid #273a4e;
}

.keyboard-title .q-icon {
  color: #65a2ff;
  font-size: 25px;
}

.keyboard-title div {
  display: flex;
  flex-direction: column;
}

.keyboard-title strong {
  color: #e5edf5;
  font-size: 12px;
}

.keyboard-title span {
  color: #7890a7;
  font-size: 8px;
}

.keyboard-columns {
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 13px;
  margin-top: 13px;
}

.column-title {
  display: block;
  margin-bottom: 8px;
  color: #71a6ef;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  color: #8295aa;
  font-size: 8px;
}

.mapping-row.selected {
  color: #f2b243;
}

.mapping-row.active {
  color: #4ade80;
}

.mapping-row kbd {
  display: grid;
  min-width: 25px;
  height: 25px;
  place-items: center;
  padding: 0 5px;
  color: #edf3fa;
  background: linear-gradient(#26384c, #142130);
  border: 1px solid #42556a;
  border-bottom-width: 2px;
  border-radius: 5px;
  font-family: inherit;
  font-size: 8px;
}

.mapping-row.active kbd {
  color: #071c12;
  background: #4ade80;
  border-color: #86efac;
}

.tip-card {
  display: flex;
  gap: 9px;
  margin-top: 15px;
  padding: 11px;
  color: #8395a9;
  background: rgb(184 114 30 / 7%);
  border: 1px solid rgb(215 144 50 / 25%);
  border-radius: 9px;
}

.tip-card .q-icon {
  flex: 0 0 auto;
  color: #f0ad3c;
  font-size: 20px;
}

.tip-card strong {
  display: block;
  color: #e8b557;
  font-size: 9px;
}

.tip-card p {
  margin: 3px 0;
  color: #a58b67;
  font-size: 8px;
  line-height: 1.45;
}

.tip-card small {
  color: #74879d;
  font-size: 7px;
}

.keyboard-tip {
  margin-top: 10px;
  padding: 10px;
  color: #8193a8;
  background: rgb(59 130 246 / 4%);
  border: 1px solid rgb(59 130 246 / 12%);
  border-radius: 8px;
  font-size: 8px;
}

.keyboard-tip strong {
  color: #a9c9f7;
}

.keyboard-tip p {
  margin: 3px 0 0;
}

/* ANIMACIONES */

@keyframes realistic-string-vibration {
  0% {
    transform: translateY(-50%) translateY(-3.2px);
  }

  25% {
    transform: translateY(-50%) translateY(2px);
  }

  50% {
    transform: translateY(-50%) translateY(-2.2px);
  }

  75% {
    transform: translateY(-50%) translateY(2.7px);
  }

  100% {
    transform: translateY(-50%) translateY(-1.5px);
  }
}

@keyframes strum-wave {
  from {
    width: 8px;
    height: 8px;
    opacity: 1;

    transform: translate(-50%, -50%);
  }

  to {
    width: 125px;
    height: 125px;
    opacity: 0;

    transform: translate(-50%, -50%);
  }
}

/* RESPONSIVE */

@media (max-width: 1320px) {
  .guitar-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .controls {
    width: 100%;
    flex-wrap: wrap;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .keyboard-panel {
    align-self: auto;
  }
}

@media (max-width: 760px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .keyboard-columns {
    grid-template-columns: 1fr;
  }
}
</style>
