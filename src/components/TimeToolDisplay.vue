<template>
  <section
    class="time-stage"
    :class="[`time-stage--${tool.mode}`, { 'time-stage--compact': compact }]"
    :style="stageStyle"
  >
    <header v-if="tool.title">
      <small>{{ modeLabel }}</small>
      <strong>{{ tool.title }}</strong>
    </header>

    <div v-if="tool.mode === 'clock' && tool.clockStyle === 'analog'" class="analog-clock">
      <span
        v-for="hour in 12"
        :key="hour"
        class="hour-mark"
        :style="{ transform: `rotate(${hour * 30}deg)` }"
      >
        <i :style="{ transform: `rotate(${-hour * 30}deg)` }">{{ hour }}</i>
      </span>
      <span class="clock-hand clock-hand--hour" :style="hourHandStyle"></span>
      <span class="clock-hand clock-hand--minute" :style="minuteHandStyle"></span>
      <span
        v-if="tool.showSeconds"
        class="clock-hand clock-hand--second"
        :style="secondHandStyle"
      ></span>
      <span class="clock-center"></span>
    </div>

    <div v-else class="digital-time" :class="{ 'digital-time--completed': tool.completed }">
      {{ displayValue }}
    </div>

    <p v-if="tool.mode === 'clock' && tool.showDate" class="date-label">{{ dateLabel }}</p>
    <div v-if="tool.mode !== 'clock'" class="status-row">
      <span class="status-dot" :class="{ 'status-dot--running': tool.running }"></span>
      {{ tool.completed ? 'Tiempo finalizado' : tool.running ? 'En curso' : 'Preparado' }}
    </div>

    <Transition name="finish-pop">
      <div v-if="tool.mode === 'timer' && tool.completed" class="finished-message">
        <q-icon name="notifications_active" />
        <strong>¡Tiempo!</strong>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { currentTimeToolValue, type TimeToolPresentationData } from '../shared/time-tool';

const props = withDefaults(
  defineProps<{
    tool: TimeToolPresentationData;
    compact?: boolean;
    playSounds?: boolean;
  }>(),
  { compact: false, playSounds: false },
);

const now = ref(Date.now());
let interval = window.setInterval(() => (now.value = Date.now()), 50);
let audioContext: AudioContext | null = null;
let lastCountdownSecond = -1;

const stageStyle = computed(() => ({
  '--time-background': props.tool.backgroundColor || '#07111d',
  '--time-accent': props.tool.accentColor || '#38bdf8',
  '--time-text': props.tool.textColor || '#f8fafc',
}));

const modeLabel = computed(() => {
  if (props.tool.mode === 'clock') return 'Reloj';
  if (props.tool.mode === 'timer') return 'Temporizador';
  return 'Cronómetro';
});

const currentValue = computed(() => currentTimeToolValue(props.tool, now.value));

const displayValue = computed(() => {
  if (props.tool.mode === 'clock') {
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit',
      second: props.tool.showSeconds ? '2-digit' : undefined,
      hour12: !props.tool.use24Hour,
    }).format(now.value);
  }

  const value = currentValue.value;
  const totalSeconds = Math.floor(value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const base = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return props.tool.mode === 'stopwatch' && props.tool.showMilliseconds
    ? `${base}.${String(Math.floor((value % 1000) / 10)).padStart(2, '0')}`
    : base;
});

const dateLabel = computed(() =>
  new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now.value),
);

const clockDate = computed(() => new Date(now.value));
const hourHandStyle = computed(() => ({
  transform: `translateX(-50%) rotate(${(clockDate.value.getHours() % 12) * 30 + clockDate.value.getMinutes() / 2}deg)`,
}));
const minuteHandStyle = computed(() => ({
  transform: `translateX(-50%) rotate(${clockDate.value.getMinutes() * 6 + clockDate.value.getSeconds() / 10}deg)`,
}));
const secondHandStyle = computed(() => ({
  transform: `translateX(-50%) rotate(${clockDate.value.getSeconds() * 6}deg)`,
}));

function playTone(frequency: number, duration: number): void {
  if (!props.playSounds) return;
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const volume = Math.min(1, Math.max(0, props.tool.soundVolume));
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume * 0.22, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

watch(
  () => [props.tool.running, Math.ceil(currentValue.value / 1000)] as const,
  ([running, seconds]) => {
    if (
      props.tool.mode === 'timer' &&
      running &&
      props.tool.countdownSound &&
      seconds > 0 &&
      seconds <= 3 &&
      seconds !== lastCountdownSecond
    ) {
      lastCountdownSecond = seconds;
      playTone(680, 0.12);
    }
  },
);

watch(
  () => props.tool.completed,
  (completed, previous) => {
    if (completed && !previous && props.tool.completionSound) {
      playTone(940, 0.5);
      window.setTimeout(() => playTone(1180, 0.65), 170);
    }
  },
);

onBeforeUnmount(() => {
  window.clearInterval(interval);
  interval = 0;
  void audioContext?.close();
});
</script>

<style scoped>
.time-stage {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: clamp(12px, 2vh, 24px);
  padding: clamp(24px, 4vw, 64px);
  overflow: hidden;
  color: var(--time-text);
  background:
    radial-gradient(
      circle at 50% 38%,
      color-mix(in srgb, var(--time-accent) 22%, transparent),
      transparent 38%
    ),
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--time-background) 88%, #183550),
      var(--time-background)
    );
  text-align: center;
}
.time-stage::before {
  position: absolute;
  width: 46vw;
  height: 46vw;
  border: 1px solid color-mix(in srgb, var(--time-accent) 18%, transparent);
  border-radius: 50%;
  content: '';
}
.time-stage header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.time-stage header small {
  color: var(--time-accent);
  font-size: clamp(10px, 1.4vw, 16px);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.time-stage header strong {
  font-size: clamp(20px, 3vw, 42px);
}
.digital-time {
  position: relative;
  z-index: 1;
  color: var(--time-text);
  font-size: clamp(52px, 12vw, 170px);
  font-variant-numeric: tabular-nums;
  font-weight: 750;
  letter-spacing: -0.055em;
  line-height: 0.95;
  text-shadow: 0 0 40px color-mix(in srgb, var(--time-accent) 30%, transparent);
}
.digital-time--completed {
  color: var(--time-accent);
}
.date-label {
  position: relative;
  z-index: 1;
  margin: 0;
  color: color-mix(in srgb, var(--time-text) 72%, transparent);
  font-size: clamp(14px, 2vw, 24px);
  text-transform: capitalize;
}
.status-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  color: color-mix(in srgb, var(--time-text) 66%, transparent);
  font-size: clamp(11px, 1.4vw, 16px);
}
.status-dot {
  width: 8px;
  height: 8px;
  background: #64748b;
  border-radius: 50%;
}
.status-dot--running {
  background: var(--time-accent);
  box-shadow: 0 0 12px var(--time-accent);
}
.analog-clock {
  position: relative;
  z-index: 1;
  width: min(52vh, 48vw);
  aspect-ratio: 1;
  background: color-mix(in srgb, var(--time-background) 76%, transparent);
  border: clamp(4px, 0.8vw, 10px) solid color-mix(in srgb, var(--time-accent) 42%, #e2e8f0);
  border-radius: 50%;
  box-shadow:
    inset 0 0 50px rgb(0 0 0 / 35%),
    0 20px 70px rgb(0 0 0 / 34%);
}
.hour-mark {
  position: absolute;
  inset: 4%;
  color: var(--time-text);
  font-size: clamp(12px, 2.2vw, 27px);
  font-weight: 700;
}
.hour-mark i {
  display: block;
  font-style: normal;
}
.clock-hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  width: 5px;
  background: var(--time-text);
  border-radius: 999px;
  transform-origin: center bottom;
}
.clock-hand--hour {
  height: 25%;
}
.clock-hand--minute {
  height: 35%;
  width: 4px;
}
.clock-hand--second {
  height: 39%;
  width: 2px;
  background: var(--time-accent);
}
.clock-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 15px;
  height: 15px;
  background: var(--time-accent);
  border: 3px solid var(--time-text);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.finished-message {
  position: absolute;
  z-index: 3;
  bottom: 6%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  color: #06111d;
  background: var(--time-accent);
  border-radius: 999px;
  box-shadow: 0 14px 35px rgb(0 0 0 / 35%);
  font-size: clamp(16px, 2vw, 26px);
}
.time-stage--compact {
  gap: 6px;
  padding: 8px;
}
.time-stage--compact::before {
  display: none;
}
.time-stage--compact header small {
  font-size: 7px;
}
.time-stage--compact header strong {
  font-size: 11px;
}
.time-stage--compact .digital-time {
  font-size: clamp(28px, 7vw, 54px);
}
.time-stage--compact .analog-clock {
  width: min(62%, 150px);
}
.time-stage--compact .date-label,
.time-stage--compact .status-row {
  font-size: 8px;
}
.time-stage--compact .finished-message {
  bottom: 5px;
  padding: 4px 8px;
  font-size: 9px;
}
.finish-pop-enter-active {
  transition: 0.35s cubic-bezier(0.2, 1.5, 0.5, 1);
}
.finish-pop-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}
</style>
