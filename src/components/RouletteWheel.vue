<template>
  <section
    class="roulette-stage"
    :class="{
      'roulette-stage--compact': compact,
      'roulette-stage--celebrating': showCelebration,
    }"
  >
    <div v-if="showCelebration" class="winner-confetti" aria-hidden="true">
      <i v-for="piece in confettiPieces" :key="piece.id" :style="piece.style"></i>
    </div>
    <header v-if="showTitle">
      <small>Ruleta</small><strong>{{ roulette.title }}</strong>
    </header>
    <div class="wheel-shell">
      <span class="wheel-pointer"></span>
      <div
        ref="wheelElement"
        class="roulette-wheel"
        :class="{ 'roulette-wheel--manual': roulette.spinning && !roulette.timedSpin }"
        :style="wheelStyle"
      >
        <svg
          v-if="roulette.labelMode !== 'hidden'"
          class="wheel-labels"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <text
            v-for="(option, index) in roulette.options"
            :key="option.id"
            class="wheel-label"
            :x="labelPosition(index).x"
            :y="labelPosition(index).y"
            :transform="labelPosition(index).transform"
            :font-size="labelFontSize"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {{ optionLabel(option.label) }}
          </text>
        </svg>
        <span class="wheel-center"><q-icon name="church" /></span>
      </div>
    </div>
    <Transition name="winner">
      <div v-if="!roulette.spinning && winner" class="winner-banner">
        <small>Resultado</small><strong>{{ winner.label }}</strong>
      </div>
    </Transition>
    <div v-if="showTimer && roulette.spinning && roulette.timedSpin" class="spin-clock">
      <q-icon name="timer" /><strong>{{ remainingLabel }}</strong
      ><span>restantes</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { RoulettePresentationData } from '../shared/roulette';

const props = withDefaults(
  defineProps<{
    roulette: RoulettePresentationData;
    compact?: boolean;
    celebrateWinner?: boolean;
    showTitle?: boolean;
    showTimer?: boolean;
  }>(),
  { compact: false, celebrateWinner: false, showTitle: true, showTimer: false },
);

const winner = computed(() =>
  props.roulette.options.find((option) => option.id === props.roulette.winnerId),
);
const displayedRotation = ref(
  props.roulette.spinning ? props.roulette.rotation - 2160 : props.roulette.rotation,
);
const wheelElement = ref<HTMLElement | null>(null);
const clockNow = ref(Date.now());
const showCelebration = ref(false);
let clockTimer: ReturnType<typeof setInterval> | null = null;
let spinAnimationFrame: number | null = null;
const confettiColors = ['#38bdf8', '#facc15', '#fb7185', '#4ade80', '#c084fc', '#f8fafc'];
const confettiPieces = Array.from({ length: 64 }, (_, index) => ({
  id: index,
  style: {
    '--confetti-x': `${(index * 37) % 100}%`,
    '--confetti-delay': `${(index % 13) * 45}ms`,
    '--confetti-duration': `${2300 + (index % 8) * 170}ms`,
    '--confetti-color': confettiColors[index % confettiColors.length]!,
    '--confetti-drift': `${((index * 29) % 120) - 60}px`,
    '--confetti-rotation': `${360 + (index % 5) * 180}deg`,
  },
}));
const wheelBackground = computed(() => {
  const count = Math.max(1, props.roulette.options.length);
  return `conic-gradient(${props.roulette.options
    .map(
      (option, index) =>
        `${option.color} ${(index / count) * 100}% ${((index + 1) / count) * 100}%`,
    )
    .join(',')})`;
});
const wheelStyle = computed<Record<string, string>>(() => ({
  background: wheelBackground.value,
  transform: `rotate(${displayedRotation.value}deg)`,
  transitionDuration: '0ms',
}));
const labelFontSize = computed(() => {
  const count = props.roulette.options.length;
  if (count <= 4) return 5;
  if (count <= 8) return 4;
  if (count <= 14) return 3.2;
  return 2.5;
});
const remainingLabel = computed(() => {
  const remaining = Math.max(
    0,
    props.roulette.spinDuration - (clockNow.value - props.roulette.spinStartedAt),
  );
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return minutes ? `${minutes}:${seconds}` : `${totalSeconds}s`;
});

function animateToTarget(): void {
  if (spinAnimationFrame !== null) cancelAnimationFrame(spinAnimationFrame);
  spinAnimationFrame = null;
  if (!props.roulette.spinning || !props.roulette.timedSpin) {
    displayedRotation.value = props.roulette.rotation;
    return;
  }
  const element = wheelElement.value;
  if (!element) return;
  const duration = Math.max(1000, props.roulette.spinDuration);
  const elapsed = Math.min(duration - 50, Math.max(0, Date.now() - props.roulette.spinStartedAt));
  const remaining = Math.max(50, duration - elapsed);
  const brakingDuration = Math.min(remaining, Math.min(4000, Math.max(2000, duration * 0.25)));
  const cruiseDuration = Math.max(0, remaining - brakingDuration);
  const startRotation = displayedRotation.value;
  const targetRotation = props.roulette.rotation;
  const totalDistance = Math.max(0, targetRotation - startRotation);
  const brakingWeight = brakingDuration / 3;
  const cruiseSpeed = totalDistance / Math.max(1, cruiseDuration + brakingWeight);
  const cruiseDistance = cruiseSpeed * cruiseDuration;
  const brakingDistance = totalDistance - cruiseDistance;
  const animationStartedAt = performance.now();

  const updateRotation = (now: number): void => {
    const animationElapsed = Math.min(remaining, now - animationStartedAt);
    let currentRotation: number;
    if (animationElapsed <= cruiseDuration) {
      currentRotation = startRotation + cruiseSpeed * animationElapsed;
    } else {
      const brakingProgress = Math.min(
        1,
        (animationElapsed - cruiseDuration) / Math.max(1, brakingDuration),
      );
      const easedProgress = 1 - Math.pow(1 - brakingProgress, 3);
      currentRotation = startRotation + cruiseDistance + brakingDistance * easedProgress;
    }
    element.style.transform = `rotate(${currentRotation}deg)`;

    if (animationElapsed < remaining && props.roulette.spinning) {
      spinAnimationFrame = requestAnimationFrame(updateRotation);
    } else {
      displayedRotation.value = props.roulette.rotation;
      element.style.transform = `rotate(${props.roulette.rotation}deg)`;
      spinAnimationFrame = null;
    }
  };

  spinAnimationFrame = requestAnimationFrame(updateRotation);
}

watch(
  () => [props.roulette.rotation, props.roulette.spinning] as const,
  () => animateToTarget(),
);
onMounted(() => {
  animateToTarget();
  if (props.celebrateWinner && props.roulette.winnerId && !props.roulette.spinning) {
    startCelebration();
  }
});
watch(
  () => props.roulette.spinning,
  (spinning) => {
    if (spinning) stopCelebration();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
    if (spinning) {
      clockNow.value = Date.now();
      clockTimer = setInterval(() => (clockNow.value = Date.now()), 200);
    }
  },
  { immediate: true },
);
watch(
  () => props.roulette.winnerId,
  (winnerId, previousWinnerId) => {
    if (
      props.celebrateWinner &&
      winnerId &&
      winnerId !== previousWinnerId &&
      !props.roulette.spinning
    ) {
      startCelebration();
    } else if (!winnerId) {
      stopCelebration();
    }
  },
);
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (spinAnimationFrame !== null) cancelAnimationFrame(spinAnimationFrame);
});

function startCelebration(): void {
  showCelebration.value = true;
}

function stopCelebration(): void {
  showCelebration.value = false;
}

function optionLabel(label: string): string {
  if (props.roulette.labelMode === 'first-word') return label.split(/\s+/)[0] ?? label;
  if (props.roulette.labelMode === 'short' && label.length > 18)
    return `${label.slice(0, 18).trim()}…`;
  return label;
}

function labelPosition(index: number): { x: number; y: number; transform: string } {
  const angle = (360 / Math.max(1, props.roulette.options.length)) * (index + 0.5);
  const radians = (angle * Math.PI) / 180;
  const x = 50 + Math.sin(radians) * 33;
  const y = 50 - Math.cos(radians) * 33;
  const readableRotation = angle > 90 && angle < 270 ? angle + 180 : angle;
  return { x, y, transform: `rotate(${readableRotation} ${x} ${y})` };
}
</script>

<style scoped>
.roulette-stage {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: clamp(12px, 2vh, 24px);
  padding: clamp(18px, 3vw, 48px);
  overflow: hidden;
  color: white;
  background:
    radial-gradient(circle at 50% 42%, rgb(35 89 132 / 55%), transparent 38%),
    linear-gradient(145deg, #0b1d2e, #050b12);
}
.winner-confetti {
  position: absolute;
  z-index: 20;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.winner-confetti i {
  position: absolute;
  top: -8%;
  left: var(--confetti-x);
  width: clamp(7px, 0.8vw, 14px);
  height: clamp(12px, 1.4vw, 22px);
  background: var(--confetti-color);
  border-radius: 2px;
  opacity: 0;
  animation: confetti-fall var(--confetti-duration) cubic-bezier(0.18, 0.72, 0.3, 1)
    var(--confetti-delay) infinite;
}
@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translate3d(0, -5vh, 0) rotate(0deg);
  }
  78% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--confetti-drift), 112vh, 0) rotate(var(--confetti-rotation));
  }
}
.roulette-stage header {
  display: flex;
  align-items: center;
  flex-direction: column;
}
.roulette-stage header small {
  color: #7dd3fc;
  font-size: clamp(10px, 1vw, 17px);
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.roulette-stage header strong {
  margin-top: 4px;
  font-size: clamp(20px, 2.4vw, 42px);
}
.wheel-shell {
  position: relative;
  width: min(66vh, 62vw);
  aspect-ratio: 1;
}
.roulette-wheel {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: clamp(5px, 0.7vw, 12px) solid #e5eef7;
  border-radius: 50%;
  box-shadow:
    0 22px 55px rgb(0 0 0 / 45%),
    inset 0 0 0 3px rgb(255 255 255 / 22%);
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.12, 0.72, 0.08, 1);
}
.roulette-wheel--manual {
  animation: roulette-manual-spin 900ms linear infinite;
}
@keyframes roulette-manual-spin {
  to {
    transform: rotate(360deg);
  }
}
.wheel-pointer {
  position: absolute;
  z-index: 5;
  top: -3%;
  left: 50%;
  width: 0;
  height: 0;
  border-right: clamp(12px, 1.6vw, 25px) solid transparent;
  border-left: clamp(12px, 1.6vw, 25px) solid transparent;
  border-top: clamp(28px, 3.6vw, 55px) solid #f8fafc;
  filter: drop-shadow(0 5px 5px rgb(0 0 0 / 45%));
  transform: translateX(-50%);
}
.wheel-labels {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.wheel-label {
  color: white;
  fill: white;
  stroke: rgb(0 0 0 / 58%);
  stroke-width: 0.8px;
  paint-order: stroke fill;
  font-weight: 800;
}
.wheel-center {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 18%;
  aspect-ratio: 1;
  place-items: center;
  color: #dbeafe;
  background: linear-gradient(145deg, #173b58, #091725);
  border: 4px solid #e5eef7;
  border-radius: 50%;
  font-size: clamp(15px, 2.5vw, 42px);
  transform: translate(-50%, -50%);
}
.winner-banner {
  position: relative;
  z-index: 21;
  display: flex;
  min-width: min(440px, 80%);
  align-items: center;
  flex-direction: column;
  padding: 10px 24px;
  background: rgb(8 24 38 / 92%);
  border: 1px solid #38bdf8;
  border-radius: 12px;
  box-shadow: 0 12px 32px #0008;
}
.roulette-stage--celebrating .winner-banner {
  border-color: #facc15;
  box-shadow:
    0 12px 32px #0008,
    0 0 34px rgb(250 204 21 / 35%);
  animation: winner-celebration 650ms ease-out;
}
@keyframes winner-celebration {
  0% {
    opacity: 0;
    transform: scale(0.72);
  }
  65% {
    transform: scale(1.06);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.winner-banner small {
  color: #7dd3fc;
  font-size: 10px;
  text-transform: uppercase;
}
.winner-banner strong {
  margin-top: 3px;
  font-size: clamp(18px, 2vw, 34px);
}
.spin-clock {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  color: #dbeafe;
  background: rgb(8 24 38 / 92%);
  border: 1px solid #3b82f6;
  border-radius: 999px;
}
.spin-clock strong {
  color: #7dd3fc;
  font-size: clamp(14px, 1.5vw, 24px);
}
.spin-clock span {
  color: #8ea5ba;
  font-size: 10px;
}
.roulette-stage--compact {
  gap: 7px;
  padding: 10px;
}
.roulette-stage--compact .wheel-shell {
  width: min(72%, 280px);
}
.roulette-stage--compact header strong {
  font-size: 12px;
}
.roulette-stage--compact .winner-banner {
  min-width: 62%;
  padding: 5px 10px;
}
.roulette-stage--compact .winner-banner strong {
  font-size: 11px;
}
.winner-enter-active,
.winner-leave-active {
  transition: 220ms ease;
}
.winner-enter-from,
.winner-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
@media (prefers-reduced-motion: reduce) {
  .winner-confetti {
    display: none;
  }
  .roulette-stage--celebrating .winner-banner {
    animation: none;
  }
}
</style>
