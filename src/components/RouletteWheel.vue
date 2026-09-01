<template>
  <section class="roulette-stage" :class="{ 'roulette-stage--compact': compact }">
    <header v-if="showTitle">
      <small>Ruleta</small><strong>{{ roulette.title }}</strong>
    </header>
    <div class="wheel-shell">
      <span class="wheel-pointer"></span>
      <div class="roulette-wheel" :style="wheelStyle">
        <span
          v-for="(option, index) in roulette.options"
          :key="option.id"
          class="wheel-label"
          :style="labelStyle(index)"
        >
          <b>{{ option.label }}</b>
        </span>
        <span class="wheel-center"><q-icon name="church" /></span>
      </div>
    </div>
    <Transition name="winner">
      <div v-if="!roulette.spinning && winner" class="winner-banner">
        <small>Resultado</small><strong>{{ winner.label }}</strong>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { RoulettePresentationData } from '../shared/roulette';

const props = withDefaults(
  defineProps<{ roulette: RoulettePresentationData; compact?: boolean; showTitle?: boolean }>(),
  { compact: false, showTitle: true },
);

const winner = computed(() =>
  props.roulette.options.find((option) => option.id === props.roulette.winnerId),
);
const displayedRotation = ref(
  props.roulette.spinning ? props.roulette.rotation - 2160 : props.roulette.rotation,
);
const animating = ref(false);
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
  transitionDuration: animating.value ? `${props.roulette.spinDuration}ms` : '0ms',
}));

async function animateToTarget(): Promise<void> {
  if (!props.roulette.spinning) {
    animating.value = false;
    displayedRotation.value = props.roulette.rotation;
    return;
  }
  animating.value = false;
  await nextTick();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animating.value = true;
      displayedRotation.value = props.roulette.rotation;
    });
  });
}

watch(
  () => [props.roulette.rotation, props.roulette.spinning] as const,
  () => void animateToTarget(),
);
onMounted(() => void animateToTarget());

function labelStyle(index: number): Record<string, string> {
  const angle = (360 / Math.max(1, props.roulette.options.length)) * (index + 0.5);
  return { transform: `rotate(${angle}deg) translateY(-39%)` };
}
</script>

<style scoped>
.roulette-stage {
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
.wheel-label {
  position: absolute;
  inset: 8%;
  display: flex;
  justify-content: center;
  transform-origin: 50% 50%;
}
.wheel-label b {
  display: block;
  max-width: 30%;
  overflow: hidden;
  color: white;
  font-size: clamp(8px, 1.25vw, 22px);
  text-overflow: ellipsis;
  text-shadow: 0 2px 5px #000;
  white-space: nowrap;
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
.winner-banner small {
  color: #7dd3fc;
  font-size: 10px;
  text-transform: uppercase;
}
.winner-banner strong {
  margin-top: 3px;
  font-size: clamp(18px, 2vw, 34px);
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
</style>
