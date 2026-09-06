<template>
  <section
    class="metronome-display"
    :class="{
      'metronome-display--compact': compact,
      'metronome-display--running': tool.running,
      'metronome-display--pulse': beatPulse,
    }"
    :style="displayStyle"
  >
    <div class="ambient ambient--one"></div>
    <div class="ambient ambient--two"></div>

    <header class="metronome-header">
      <div>
        <small> METRÓNOMO </small>

        <strong>
          {{ tool.title || 'Metrónomo' }}
        </strong>
      </div>

      <div v-if="showTempoName" class="tempo-name">
        {{ tempoName }}
      </div>
    </header>

    <div class="metronome-body">
      <div class="bpm-section">
        <span class="bpm-value">
          {{ bpm }}
        </span>

        <span class="bpm-label"> BPM </span>

        <div class="meter-label">
          <span>
            {{ beatSymbol }}
            =
            {{ bpm }}
          </span>

          <span> {{ beatsPerMeasure }}/{{ beatUnit }} </span>
        </div>
      </div>

      <div class="mechanism">
        <div class="mechanism-glow"></div>

        <div class="scale">
          <span
            v-for="mark in scaleMarks"
            :key="mark.angle"
            class="scale-mark"
            :class="{
              'scale-mark--major': mark.major,
            }"
            :style="{
              transform: `rotate(${mark.angle}deg)`,
            }"
          >
            <i></i>
          </span>
        </div>

        <div class="scale-label scale-label--left">L</div>

        <div class="scale-label scale-label--center">•</div>

        <div class="scale-label scale-label--right">R</div>

        <div class="needle" :style="needleStyle">
          <span class="needle-rod"></span>

          <span class="needle-weight">
            <i></i>
          </span>
        </div>

        <div class="pivot">
          <span></span>
        </div>
      </div>

      <div v-if="showBeat" class="beat-section">
        <small> TIEMPO </small>

        <strong>
          {{ currentBeat }}
        </strong>

        <span> de {{ beatsPerMeasure }} </span>
      </div>
    </div>

    <div class="beat-dots">
      <span
        v-for="beat in beatsPerMeasure"
        :key="beat"
        :class="{
          active: tool.running && currentBeat === beat,
          accent: beat === 1 && accentFirstBeat,
        }"
      >
        {{ beat }}
      </span>
    </div>

    <footer class="metronome-footer">
      <div class="running-status">
        <span
          class="status-dot"
          :class="{
            active: tool.running,
          }"
        ></span>

        {{ tool.running ? 'En marcha' : 'Preparado' }}
      </div>

      <div class="measure-status">
        Compás
        <strong> {{ beatsPerMeasure }}/{{ beatUnit }} </strong>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import {
  currentTimeToolValue,
  type MetronomeSoundStyle,
  type TimeToolPresentationData,
} from '../../../shared/time-tool';

const props = withDefaults(
  defineProps<{
    tool: TimeToolPresentationData;
    compact?: boolean;
    playSounds?: boolean;
  }>(),
  {
    compact: false,
    playSounds: false,
  },
);

const now = ref(Date.now());

let animationFrame = 0;

let audioContext: AudioContext | null = null;

let lastPlayedBeat = -1;

const bpm = computed(() => clamp(Number(props.tool.metronomeBpm ?? 120), 30, 300));

const beatsPerMeasure = computed(() =>
  Math.round(clamp(Number(props.tool.metronomeBeatsPerMeasure ?? 4), 2, 12)),
);

const beatUnit = computed(() => (props.tool.metronomeBeatUnit === 8 ? 8 : 4));

const accentFirstBeat = computed(() => props.tool.metronomeAccentFirstBeat !== false);

const soundEnabled = computed(() => props.tool.metronomeSoundEnabled !== false);

const soundStyle = computed<MetronomeSoundStyle>(() => props.tool.metronomeSoundStyle ?? 'classic');

const showBeat = computed(() => props.tool.metronomeShowBeat !== false);

const showTempoName = computed(() => props.tool.metronomeShowTempoName !== false);

const displayScale = computed(() => clamp(Number(props.tool.displayScale ?? 1), 0.65, 1.5));

const displayStyle = computed(() => ({
  '--metro-background': props.tool.backgroundColor || '#07111d',

  '--metro-accent': props.tool.accentColor || '#a78bfa',

  '--metro-text': props.tool.textColor || '#f8fafc',

  '--metro-scale': String(displayScale.value),
}));

const elapsed = computed(() => currentTimeToolValue(props.tool, now.value));

const beatDurationMs = computed(() => 60_000 / bpm.value);

const beatIndex = computed(() => Math.floor(elapsed.value / beatDurationMs.value));

const currentBeat = computed(() => (beatIndex.value % beatsPerMeasure.value) + 1);

const beatPhase = computed(() => {
  if (!props.tool.running) {
    return 0.5;
  }

  return (elapsed.value % beatDurationMs.value) / beatDurationMs.value;
});

const needleAngle = computed(() => {
  if (!props.tool.running) {
    return 0;
  }

  const maximumAngle = 38;

  /*
   * Un pulso lleva la aguja
   * de izquierda a derecha.
   * El siguiente la devuelve.
   */
  if (beatIndex.value % 2 === 0) {
    return -maximumAngle + beatPhase.value * maximumAngle * 2;
  }

  return maximumAngle - beatPhase.value * maximumAngle * 2;
});

const needleStyle = computed(() => ({
  transform: `translateX(-50%) rotate(${needleAngle.value}deg)`,
}));

const beatPulse = computed(() => props.tool.running && beatPhase.value < 0.13);

const beatSymbol = computed(() => (beatUnit.value === 8 ? '♪' : '♩'));

const tempoName = computed(() => {
  const value = bpm.value;

  if (value < 40) {
    return 'Grave';
  }

  if (value < 60) {
    return 'Largo';
  }

  if (value < 66) {
    return 'Larghetto';
  }

  if (value < 76) {
    return 'Adagio';
  }

  if (value < 108) {
    return 'Andante';
  }

  if (value < 120) {
    return 'Moderato';
  }

  if (value < 156) {
    return 'Allegro';
  }

  if (value < 176) {
    return 'Vivace';
  }

  if (value < 200) {
    return 'Presto';
  }

  return 'Prestissimo';
});

const scaleMarks = Array.from(
  {
    length: 17,
  },
  (_, index) => ({
    angle: -40 + index * 5,

    major: index % 4 === 0,
  }),
);

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

function updateAnimation(): void {
  now.value = Date.now();

  animationFrame = window.requestAnimationFrame(updateAnimation);
}

function ensureAudioContext(): AudioContext {
  audioContext ??= new AudioContext();

  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }

  return audioContext;
}

function playClassicClick(accent: boolean): void {
  const audio = ensureAudioContext();

  const oscillator = audio.createOscillator();

  const gain = audio.createGain();

  oscillator.type = accent ? 'triangle' : 'square';

  oscillator.frequency.setValueAtTime(accent ? 1450 : 980, audio.currentTime);

  const volume = clamp(props.tool.soundVolume, 0, 1);

  gain.gain.setValueAtTime(Math.max(0.0001, volume * (accent ? 0.3 : 0.22)), audio.currentTime);

  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (accent ? 0.085 : 0.055));

  oscillator.connect(gain);
  gain.connect(audio.destination);

  oscillator.start();

  oscillator.stop(audio.currentTime + 0.1);
}

function playWoodClick(accent: boolean): void {
  const audio = ensureAudioContext();

  const oscillator = audio.createOscillator();

  const gain = audio.createGain();

  oscillator.type = 'sine';

  oscillator.frequency.setValueAtTime(accent ? 620 : 430, audio.currentTime);

  oscillator.frequency.exponentialRampToValueAtTime(accent ? 260 : 190, audio.currentTime + 0.07);

  const volume = clamp(props.tool.soundVolume, 0, 1);

  gain.gain.setValueAtTime(Math.max(0.0001, volume * (accent ? 0.42 : 0.3)), audio.currentTime);

  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.085);

  oscillator.connect(gain);
  gain.connect(audio.destination);

  oscillator.start();

  oscillator.stop(audio.currentTime + 0.1);
}

function playDigitalClick(accent: boolean): void {
  const audio = ensureAudioContext();

  const oscillator = audio.createOscillator();

  const gain = audio.createGain();

  oscillator.type = 'square';

  oscillator.frequency.setValueAtTime(accent ? 1800 : 1250, audio.currentTime);

  const volume = clamp(props.tool.soundVolume, 0, 1);

  gain.gain.setValueAtTime(Math.max(0.0001, volume * (accent ? 0.24 : 0.17)), audio.currentTime);

  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.035);

  oscillator.connect(gain);
  gain.connect(audio.destination);

  oscillator.start();

  oscillator.stop(audio.currentTime + 0.045);
}

function playBeat(): void {
  if (!props.playSounds || !soundEnabled.value) {
    return;
  }

  const accent = accentFirstBeat.value && currentBeat.value === 1;

  if (soundStyle.value === 'wood') {
    playWoodClick(accent);

    return;
  }

  if (soundStyle.value === 'digital') {
    playDigitalClick(accent);

    return;
  }

  playClassicClick(accent);
}

watch(
  () => [props.tool.running, beatIndex.value] as const,

  ([running, index]) => {
    if (!running) {
      lastPlayedBeat = -1;

      return;
    }

    if (index === lastPlayedBeat) {
      return;
    }

    lastPlayedBeat = index;

    playBeat();
  },
);

onMounted(() => {
  updateAnimation();
});

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame);

  if (audioContext) {
    void audioContext.close();

    audioContext = null;
  }
});
</script>

<style scoped>
.metronome-display {
  --metro-background: #07111d;
  --metro-accent: #a78bfa;
  --metro-text: #f8fafc;
  --metro-scale: 1;

  position: relative;

  display: flex;
  width: 100%;
  min-height: 100%;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: calc(clamp(14px, 2.2vh, 26px) * var(--metro-scale));

  padding: calc(clamp(22px, 3.5vw, 52px) * var(--metro-scale));

  overflow: hidden;

  color: var(--metro-text);

  background:
    radial-gradient(
      circle at 50% 38%,
      color-mix(in srgb, var(--metro-accent) 20%, transparent),
      transparent 35%
    ),
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--metro-background) 88%, #1b2b45),
      var(--metro-background)
    );

  text-align: center;
}

.ambient {
  position: absolute;

  border: 1px solid color-mix(in srgb, var(--metro-accent) 14%, transparent);

  border-radius: 50%;

  pointer-events: none;
}

.ambient--one {
  width: 48vw;
  height: 48vw;

  max-width: 700px;
  max-height: 700px;
}

.ambient--two {
  width: 32vw;
  height: 32vw;

  max-width: 470px;
  max-height: 470px;

  opacity: 0.55;
}

.metronome-header {
  position: relative;
  z-index: 2;

  display: flex;
  width: min(100%, 900px);

  align-items: center;
  justify-content: space-between;

  gap: 20px;
}

.metronome-header > div:first-child {
  display: flex;

  align-items: flex-start;
  flex-direction: column;
}

.metronome-header small {
  color: var(--metro-accent);

  font-size: clamp(9px, 1vw, 14px);

  font-weight: 800;

  letter-spacing: 0.2em;
}

.metronome-header strong {
  margin-top: 2px;

  color: var(--metro-text);

  font-size: clamp(18px, 2vw, 32px);
}

.tempo-name {
  padding: 7px 13px;

  color: var(--metro-accent);

  background: color-mix(in srgb, var(--metro-accent) 9%, transparent);

  border: 1px solid color-mix(in srgb, var(--metro-accent) 30%, transparent);

  border-radius: 999px;

  font-size: clamp(10px, 1.2vw, 16px);

  font-weight: 700;
}

.metronome-body {
  position: relative;
  z-index: 2;

  display: grid;

  width: min(100%, 920px);

  grid-template-columns:
    minmax(120px, 0.8fr)
    minmax(260px, 1.6fr)
    minmax(120px, 0.8fr);

  align-items: center;

  gap: clamp(16px, 3vw, 44px);
}

.bpm-section,
.beat-section {
  display: flex;

  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.bpm-value {
  color: var(--metro-text);

  font-size: calc(clamp(62px, 9vw, 136px) * var(--metro-scale));

  font-variant-numeric: tabular-nums;

  font-weight: 800;

  letter-spacing: -0.06em;

  line-height: 0.85;

  text-shadow: 0 0 28px color-mix(in srgb, var(--metro-accent) 22%, transparent);
}

.bpm-label {
  margin-top: 10px;

  color: color-mix(in srgb, var(--metro-text) 62%, transparent);

  font-size: clamp(10px, 1vw, 15px);

  font-weight: 800;

  letter-spacing: 0.22em;
}

.meter-label {
  display: flex;

  margin-top: 13px;

  align-items: center;
  justify-content: center;
  flex-wrap: wrap;

  gap: 7px;
}

.meter-label span {
  padding: 5px 9px;

  color: color-mix(in srgb, var(--metro-text) 76%, transparent);

  background: rgb(255 255 255 / 4%);

  border: 1px solid rgb(255 255 255 / 7%);

  border-radius: 7px;

  font-size: clamp(9px, 1vw, 13px);
}

.mechanism {
  position: relative;

  width: min(38vw, 410px);

  aspect-ratio: 1;

  margin: 0 auto;

  border: clamp(3px, 0.4vw, 6px) solid color-mix(in srgb, var(--metro-accent) 42%, #d8e0ea);

  border-radius: 50%;

  background:
    radial-gradient(circle at 50% 62%, rgb(255 255 255 / 5%), transparent 34%),
    radial-gradient(
      circle,
      color-mix(in srgb, var(--metro-background) 70%, #1b2940),
      var(--metro-background) 78%
    );

  box-shadow:
    inset 0 0 55px rgb(0 0 0 / 38%),
    0 22px 70px rgb(0 0 0 / 36%);
}

.mechanism-glow {
  position: absolute;

  inset: 8%;

  border: 1px solid color-mix(in srgb, var(--metro-accent) 13%, transparent);

  border-radius: 50%;

  box-shadow: inset 0 0 30px color-mix(in srgb, var(--metro-accent) 7%, transparent);
}

.scale {
  position: absolute;
  inset: 8%;
}

.scale-mark {
  position: absolute;
  inset: 0;

  transform-origin: 50% 50%;
}

.scale-mark i {
  position: absolute;

  top: 0;
  left: 50%;

  width: 1px;
  height: 7%;

  background: color-mix(in srgb, var(--metro-text) 38%, transparent);

  transform: translateX(-50%);
}

.scale-mark--major i {
  width: 2px;
  height: 10%;

  background: color-mix(in srgb, var(--metro-text) 74%, transparent);
}

.scale-label {
  position: absolute;

  top: 17%;

  color: color-mix(in srgb, var(--metro-text) 45%, transparent);

  font-size: clamp(9px, 1vw, 14px);

  font-weight: 700;
}

.scale-label--left {
  left: 19%;
}

.scale-label--center {
  left: 50%;

  transform: translateX(-50%);
}

.scale-label--right {
  right: 19%;
}

.needle {
  position: absolute;

  z-index: 4;

  bottom: 20%;
  left: 50%;

  width: 20px;
  height: 68%;

  transform: translateX(-50%);

  transform-origin: 50% 100%;

  will-change: transform;
}

.needle-rod {
  position: absolute;

  right: 50%;
  bottom: 0;

  width: 4px;
  height: 100%;

  background: linear-gradient(90deg, #727b85, #f3f5f7 48%, #5d6670);

  border-radius: 999px;

  box-shadow: 0 0 8px rgb(255 255 255 / 17%);

  transform: translateX(50%);
}

.needle-weight {
  position: absolute;

  top: 17%;
  left: 50%;

  display: grid;

  width: 31px;
  height: 57px;

  place-items: center;

  background: linear-gradient(145deg, #44505d, #171f28);

  border: 2px solid #7e8994;

  border-radius: 8px;

  box-shadow: 0 8px 14px rgb(0 0 0 / 42%);

  transform: translateX(-50%);
}

.needle-weight i {
  width: 7px;
  height: 31px;

  background: linear-gradient(#a9b0b7, #3d4650);

  border-radius: 999px;
}

.pivot {
  position: absolute;

  z-index: 5;

  bottom: 16.5%;
  left: 50%;

  display: grid;

  width: clamp(28px, 4vw, 46px);

  aspect-ratio: 1;

  place-items: center;

  background: radial-gradient(circle, #e6eaf0, #76818b 55%, #2b343d);

  border: 3px solid #1e2933;

  border-radius: 50%;

  box-shadow: 0 5px 14px rgb(0 0 0 / 50%);

  transform: translateX(-50%);
}

.pivot span {
  width: 34%;
  height: 34%;

  background: var(--metro-accent);

  border-radius: 50%;

  box-shadow: 0 0 13px var(--metro-accent);
}

.beat-section small {
  color: color-mix(in srgb, var(--metro-text) 55%, transparent);

  font-size: clamp(9px, 1vw, 13px);

  font-weight: 800;

  letter-spacing: 0.16em;
}

.beat-section strong {
  color: var(--metro-accent);

  font-size: calc(clamp(68px, 9vw, 132px) * var(--metro-scale));

  font-variant-numeric: tabular-nums;

  line-height: 0.94;

  text-shadow: 0 0 24px color-mix(in srgb, var(--metro-accent) 35%, transparent);
}

.beat-section span {
  color: color-mix(in srgb, var(--metro-text) 48%, transparent);

  font-size: clamp(9px, 1vw, 14px);
}

.beat-dots {
  position: relative;
  z-index: 2;

  display: flex;

  min-height: 40px;

  align-items: center;
  justify-content: center;
  flex-wrap: wrap;

  gap: 8px;
}

.beat-dots > span {
  display: grid;

  width: clamp(27px, 3vw, 38px);
  height: clamp(27px, 3vw, 38px);

  place-items: center;

  color: color-mix(in srgb, var(--metro-text) 52%, transparent);

  background: rgb(255 255 255 / 4%);

  border: 1px solid rgb(255 255 255 / 8%);

  border-radius: 50%;

  font-size: clamp(8px, 0.9vw, 12px);

  font-weight: 700;

  transition:
    transform 90ms ease,
    color 90ms ease,
    background 90ms ease,
    box-shadow 90ms ease;
}

.beat-dots > span.accent {
  border-color: color-mix(in srgb, var(--metro-accent) 42%, transparent);
}

.beat-dots > span.active {
  color: color-mix(in srgb, var(--metro-background) 88%, #000);

  background: var(--metro-accent);

  border-color: var(--metro-accent);

  box-shadow: 0 0 18px color-mix(in srgb, var(--metro-accent) 65%, transparent);

  transform: scale(1.13);
}

.metronome-footer {
  position: relative;
  z-index: 2;

  display: flex;

  width: min(100%, 900px);

  align-items: center;
  justify-content: space-between;

  color: color-mix(in srgb, var(--metro-text) 55%, transparent);

  font-size: clamp(9px, 1vw, 13px);
}

.running-status {
  display: flex;

  align-items: center;

  gap: 7px;
}

.status-dot {
  width: 8px;
  height: 8px;

  background: #64748b;

  border-radius: 50%;
}

.status-dot.active {
  background: var(--metro-accent);

  box-shadow: 0 0 12px var(--metro-accent);
}

.measure-status strong {
  margin-left: 5px;

  color: var(--metro-text);
}

.metronome-display--pulse .pivot span {
  transform: scale(1.25);
}

.metronome-display--compact {
  gap: 5px;

  padding: 8px;
}

.metronome-display--compact .ambient {
  display: none;
}

.metronome-display--compact .metronome-header {
  width: 100%;
}

.metronome-display--compact .metronome-header small {
  font-size: 6px;
}

.metronome-display--compact .metronome-header strong {
  font-size: 10px;
}

.metronome-display--compact .tempo-name {
  padding: 3px 6px;

  font-size: 6px;
}

.metronome-display--compact .metronome-body {
  width: 100%;

  grid-template-columns: 0.8fr 1.5fr 0.8fr;

  gap: 5px;
}

.metronome-display--compact .mechanism {
  width: min(48%, 150px);
}

.metronome-display--compact .bpm-value,
.metronome-display--compact .beat-section strong {
  font-size: 27px;
}

.metronome-display--compact .bpm-label,
.metronome-display--compact .meter-label,
.metronome-display--compact .beat-section small,
.metronome-display--compact .beat-section span {
  font-size: 6px;
}

.metronome-display--compact .beat-dots > span {
  width: 16px;
  height: 16px;

  font-size: 5px;
}

.metronome-display--compact .metronome-footer {
  font-size: 6px;
}

@media (max-width: 720px) {
  .metronome-body {
    grid-template-columns: 1fr;
  }

  .mechanism {
    width: min(72vw, 360px);
  }

  .bpm-section {
    order: 2;
  }

  .beat-section {
    order: 3;
  }

  .metronome-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
