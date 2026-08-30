<template>
  <div ref="containerElement" class="fitted-text">
    <div
      ref="textElement"
      class="fitted-text__content"
      :style="{ fontSize: `${fontSize}px` }"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

interface Props {
  text: string;
  minSize?: number;
  maxSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minSize: 10,
  maxSize: 26,
});

const containerElement = ref<HTMLElement | null>(null);
const textElement = ref<HTMLElement | null>(null);
const fontSize = ref(props.maxSize);
let resizeObserver: ResizeObserver | null = null;
let animationFrame: number | null = null;

function textFits(size: number): boolean {
  const container = containerElement.value;
  const text = textElement.value;

  if (!container || !text) {
    return true;
  }

  text.style.fontSize = `${size}px`;

  return (
    text.scrollHeight <= container.clientHeight &&
    text.scrollWidth <= container.clientWidth
  );
}

function fitText(): void {
  const container = containerElement.value;

  if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
    return;
  }

  let minimum = props.minSize;
  let maximum = props.maxSize;
  let bestSize = props.minSize;

  while (maximum - minimum >= 0.5) {
    const candidate = (minimum + maximum) / 2;

    if (textFits(candidate)) {
      bestSize = candidate;
      minimum = candidate + 0.25;
    } else {
      maximum = candidate - 0.25;
    }
  }

  fontSize.value = Math.round(bestSize * 2) / 2;
}

function scheduleFit(): void {
  if (animationFrame !== null) {
    window.cancelAnimationFrame(animationFrame);
  }

  animationFrame = window.requestAnimationFrame(() => {
    animationFrame = null;
    fitText();
  });
}

watch(
  () => props.text,
  async () => {
    await nextTick();
    scheduleFit();
  },
);

onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleFit);

  if (containerElement.value) {
    resizeObserver.observe(containerElement.value);
  }

  scheduleFit();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();

  if (animationFrame !== null) {
    window.cancelAnimationFrame(animationFrame);
  }
});
</script>

<style scoped>
.fitted-text {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.fitted-text__content {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  color: #f2f5f9;
  font-weight: 600;
  line-height: 1.18;
  overflow-wrap: anywhere;
  text-align: center;
  white-space: pre-line;
}
</style>
