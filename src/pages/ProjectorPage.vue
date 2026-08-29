<template>
  <main class="projector-page">
    <Transition name="projection" mode="out-in">
      <section
        v-if="projectionState.mode === 'content'"
        key="content"
        class="projector-content"
      >
        <div class="projector-logo">ICP Studio</div>

        <h1 v-if="projectionState.title">
          {{ projectionState.title }}
        </h1>

        <p v-if="projectionState.body">
          {{ projectionState.body }}
        </p>
      </section>

      <section v-else key="blank" class="projector-blank">
        <div class="projector-mark">ICP Studio</div>
      </section>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { ProjectionState } from '@/shared/projection';

const projectionState = ref<ProjectionState>({ mode: 'blank' });
let unsubscribe: (() => void) | undefined;

onMounted(() => {
  unsubscribe = window.icpStudio?.projection.onState((state) => {
    projectionState.value = state;
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
});
</script>

<style scoped lang="scss">
.projector-page {
  display: grid;
  min-height: 100vh;
  overflow: hidden;
  color: white;
  background:
    radial-gradient(circle at 50% 35%, rgb(29 61 117 / 45%), transparent 38%),
    #05070d;
  place-items: center;
}

.projector-content,
.projector-blank {
  width: min(88vw, 1500px);
  padding: 48px;
  text-align: center;
}

.projector-logo,
.projector-mark {
  color: #70a1ff;
  font-size: clamp(16px, 1.4vw, 24px);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.projector-logo {
  margin-bottom: 32px;
}

.projector-mark {
  opacity: 0.3;
}

h1 {
  margin: 0 0 24px;
  font-size: clamp(44px, 6vw, 96px);
  line-height: 1.05;
  text-wrap: balance;
}

p {
  margin: 0;
  color: #d8e2f2;
  font-size: clamp(24px, 3vw, 50px);
  line-height: 1.25;
  text-wrap: balance;
  white-space: pre-line;
}

.projection-enter-active,
.projection-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.projection-enter-from,
.projection-leave-to {
  opacity: 0;
  transform: scale(0.985);
}
</style>
