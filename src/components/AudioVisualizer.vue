<template>
  <div
    class="audio-visualizer"
    :class="[
      `audio-visualizer--${type}`,
      { 'audio-visualizer--playing': playing, 'audio-visualizer--compact': compact },
    ]"
    :style="visualizerStyle"
    aria-hidden="true"
  >
    <template v-if="type === 'circle'">
      <span v-for="ring in 4" :key="ring" class="visualizer-ring"></span>
    </template>
    <template v-else>
      <span
        v-for="bar in barCount"
        :key="bar"
        class="visualizer-bar"
        :style="{
          height: `${20 + ((bar * 31) % 76)}%`,
          animationDelay: `${bar * -48}ms`,
        }"
      ></span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AudioVisualizerType } from '../shared/theme';

const props = withDefaults(
  defineProps<{
    type: AudioVisualizerType;
    playing: boolean;
    primaryColor: string;
    secondaryColor: string;
    sensitivity: number;
    compact?: boolean;
  }>(),
  { compact: false },
);

const barCount = computed(() => (props.compact ? 20 : 36));
const visualizerStyle = computed(() => ({
  '--visualizer-primary': props.primaryColor,
  '--visualizer-secondary': props.secondaryColor,
  '--visualizer-speed': `${Math.max(360, 980 - props.sensitivity * 260)}ms`,
}));
</script>

<style scoped>
.audio-visualizer {
  position: relative;
  display: flex;
  width: min(72vw, 980px);
  height: clamp(90px, 18vh, 210px);
  align-items: center;
  justify-content: center;
  gap: clamp(3px, 0.55vw, 10px);
}

.audio-visualizer--compact {
  width: min(82%, 320px);
  height: 54px;
  gap: 3px;
}

.visualizer-bar {
  width: clamp(3px, 0.55vw, 9px);
  background: linear-gradient(180deg, var(--visualizer-primary), var(--visualizer-secondary));
  border-radius: 999px;
  animation: visualizer-pulse var(--visualizer-speed) ease-in-out infinite alternate;
  animation-play-state: paused;
  opacity: 0.86;
  transform: scaleY(0.28);
  transform-origin: center;
}

.audio-visualizer--compact .visualizer-bar {
  width: 4px;
}

.audio-visualizer--wave .visualizer-bar {
  width: clamp(5px, 0.7vw, 12px);
  border-radius: 45% 45% 30% 30%;
}

.audio-visualizer--spectrum .visualizer-bar:nth-child(3n + 1) {
  filter: hue-rotate(38deg);
}

.audio-visualizer--spectrum .visualizer-bar:nth-child(3n + 2) {
  filter: hue-rotate(-34deg);
}

.audio-visualizer--circle {
  width: min(38vw, 380px);
  height: min(38vw, 380px);
}

.audio-visualizer--circle.audio-visualizer--compact {
  width: 74px;
  height: 74px;
}

.visualizer-ring {
  position: absolute;
  width: 34%;
  height: 34%;
  border: clamp(2px, 0.35vw, 5px) solid var(--visualizer-primary);
  border-radius: 50%;
  animation: visualizer-ring var(--visualizer-speed) ease-out infinite;
  animation-play-state: paused;
  opacity: 0.55;
}

.visualizer-ring:nth-child(2) {
  animation-delay: -180ms;
  border-color: var(--visualizer-secondary);
}
.visualizer-ring:nth-child(3) {
  animation-delay: -360ms;
}
.visualizer-ring:nth-child(4) {
  animation-delay: -540ms;
  border-color: var(--visualizer-secondary);
}

.audio-visualizer--playing .visualizer-bar,
.audio-visualizer--playing .visualizer-ring {
  animation-play-state: running;
}

@keyframes visualizer-pulse {
  from {
    filter: brightness(0.76);
    transform: scaleY(0.25);
  }
  to {
    filter: brightness(1.35);
    transform: scaleY(1);
  }
}

@keyframes visualizer-ring {
  from {
    opacity: 0.72;
    transform: scale(0.45);
  }
  to {
    opacity: 0;
    transform: scale(2.7);
  }
}
</style>
