<template>
  <section class="hidden-image-projection">
    <header class="projection-heading">
      <div>
        <span class="projection-kicker"> IMAGEN ESCONDIDA </span>

        <h1>{{ payload.title }}</h1>
      </div>

      <div class="round-indicator">
        <span>Imagen</span>

        <strong>
          {{ payload.roundIndex + 1 }}
          /
          {{ payload.roundCount }}
        </strong>
      </div>
    </header>

    <div class="projection-stage-shell">
      <div class="projection-stage" :style="gridStyle">
        <img :src="payload.imageDataUrl" alt="" class="projection-image" />

        <div
          v-for="tileId in totalTiles"
          :key="tileId"
          class="projection-tile"
          :class="{
            'projection-tile--revealed': revealedTiles.has(tileId),
          }"
        >
          <span v-if="!revealedTiles.has(tileId)">
            {{ tileId }}
          </span>
        </div>

        <Transition name="hint">
          <div v-if="activeHint" class="public-hint">
            <div class="public-hint-icon">
              <q-icon name="lightbulb" />
            </div>

            <div class="public-hint-copy">
              <span>PISTA</span>
              <strong>{{ activeHint }}</strong>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <footer class="projection-status">
      <div class="status-progress">
        <span
          class="status-progress-bar"
          :style="{
            width: `${progressPercentage}%`,
          }"
        />

        <span class="status-progress-track" />
      </div>

      <span>
        {{ payload.revealedTileIds.length }}
        de
        {{ totalTiles }}
        descubiertas
      </span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { HiddenImageProjectionPayload } from '../shared/hidden-image-projection';

const props = defineProps<{
  payload: HiddenImageProjectionPayload;
}>();

const totalTiles = computed(() => props.payload.rows * props.payload.columns);

const revealedTiles = computed(() => new Set(props.payload.revealedTileIds));

const activeHint = computed(() => (props.payload.activeHint ?? '').trim());

const progressPercentage = computed(() => {
  if (totalTiles.value <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, (props.payload.revealedTileIds.length / totalTiles.value) * 100),
  );
});

const gridStyle = computed(() => ({
  '--hidden-image-rows': String(props.payload.rows),

  '--hidden-image-columns': String(props.payload.columns),
}));
</script>

<style scoped>
.hidden-image-projection {
  display: flex;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  box-sizing: border-box;
  flex-direction: column;
  gap: clamp(14px, 2vh, 28px);
  padding: clamp(22px, 3.2vh, 48px) clamp(26px, 4vw, 72px) clamp(20px, 3vh, 44px);
  overflow: hidden;
  color: #f8fafc;
  background: radial-gradient(circle at 50% 36%, rgb(45 71 99 / 34%), transparent 52%), #050b12;
}

.projection-heading {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.projection-kicker {
  display: block;
  margin-bottom: 5px;
  color: #93a4b8;
  font-size: clamp(10px, 0.85vw, 15px);
  font-weight: 700;
  letter-spacing: 0.15em;
}

.projection-heading h1 {
  max-width: 72vw;
  margin: 0;
  overflow: hidden;
  color: #f8fafc;
  font-size: clamp(20px, 2.3vw, 42px);
  font-weight: 700;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.round-indicator {
  display: flex;
  flex: 0 0 auto;
  align-items: baseline;
  gap: 8px;
  padding: 9px 13px;
  color: #9fb0c4;
  background: rgb(12 23 35 / 82%);
  border: 1px solid #2b3d51;
  border-radius: 10px;
}

.round-indicator span {
  font-size: clamp(9px, 0.75vw, 13px);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.round-indicator strong {
  color: #d8b4fe;
  font-size: clamp(13px, 1.1vw, 19px);
}

.projection-stage-shell {
  display: grid;
  min-height: 0;
  flex: 1;
  place-items: center;
}

.projection-stage {
  position: relative;
  display: grid;
  width: min(100%, 1480px);
  max-height: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;

  grid-template-columns: repeat(var(--hidden-image-columns), minmax(0, 1fr));

  grid-template-rows: repeat(var(--hidden-image-rows), minmax(0, 1fr));

  background: #000;
  border: 1px solid #33485f;
  border-radius: clamp(8px, 0.8vw, 16px);

  box-shadow:
    0 30px 90px rgb(0 0 0 / 44%),
    0 0 0 1px rgb(255 255 255 / 2%);
}

.projection-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #020406;
}

.projection-tile {
  position: relative;
  z-index: 2;
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  color: #c7d4e2;

  background: linear-gradient(145deg, rgb(30 48 68 / 99%), rgb(12 24 36 / 99%));

  border: 1px solid rgb(73 99 127 / 76%);

  opacity: 1;

  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.projection-tile::after {
  position: absolute;
  inset: 7%;
  content: '';
  border: 1px solid rgb(255 255 255 / 3%);
  border-radius: 5px;
  pointer-events: none;
}

.projection-tile span {
  font-size: clamp(11px, 1.55vw, 27px);
  font-weight: 750;

  text-shadow: 0 2px 4px rgb(0 0 0 / 40%);
}

.projection-tile--revealed {
  opacity: 0;
  transform: scale(0.92);
}

.public-hint {
  position: absolute;
  right: clamp(18px, 2.6vw, 44px);
  bottom: clamp(18px, 3vh, 42px);
  left: clamp(18px, 2.6vw, 44px);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.4vw, 22px);
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(13px, 1.4vw, 22px) clamp(16px, 1.8vw, 28px);

  color: #f8fafc;

  background: linear-gradient(135deg, rgb(9 20 31 / 95%), rgb(20 31 44 / 95%));

  border: 1px solid rgb(250 204 21 / 40%);

  border-radius: clamp(12px, 1vw, 18px);

  box-shadow:
    0 18px 60px rgb(0 0 0 / 45%),
    0 0 32px rgb(250 204 21 / 8%);

  backdrop-filter: blur(12px);
}

.public-hint-icon {
  display: grid;
  width: clamp(42px, 4vw, 66px);
  height: clamp(42px, 4vw, 66px);
  flex: 0 0 auto;
  place-items: center;
  color: #fde047;
  background: rgb(250 204 21 / 12%);
  border: 1px solid rgb(250 204 21 / 24%);
  border-radius: 14px;
}

.public-hint-icon .q-icon {
  font-size: clamp(24px, 2vw, 36px);
}

.public-hint-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.public-hint-copy span {
  color: #fde047;
  font-size: clamp(9px, 0.8vw, 14px);
  font-weight: 800;
  letter-spacing: 0.14em;
}

.public-hint-copy strong {
  color: #f8fafc;
  font-size: clamp(16px, 1.55vw, 27px);
  font-weight: 650;
  line-height: 1.3;
}

.projection-status {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 13px;
  color: #8395a9;
  font-size: clamp(9px, 0.75vw, 13px);
}

.status-progress {
  position: relative;
  width: min(240px, 24vw);
  height: 4px;
  overflow: hidden;
  background: #1b2b3d;
  border-radius: 999px;
}

.status-progress-track {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: #1b2b3d;
}

.status-progress-bar {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 2;
  background: #c084fc;
  border-radius: inherit;
  transition: width 220ms ease;
}

.hint-enter-active,
.hint-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
