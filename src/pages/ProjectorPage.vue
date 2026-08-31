<template>
  <main class="projector-page" :style="surfaceStyle">
    <Transition name="projection" mode="out-in">
      <section
        v-if="projectionState.mode === 'content'"
        key="content"
        class="projector-content"
        :style="contentLayoutStyle"
      >
        <p v-if="projectionState.body">{{ projectionState.body }}</p>
        <footer v-if="projectionState.footer" class="projection-footer">
          {{ projectionState.footer }}
        </footer>
      </section>

      <section
        v-else-if="projectionState.mode === 'document'"
        :key="projectionState.url"
        class="projector-document"
      >
        <DocumentViewer
          :url="projectionState.url"
          :format="projectionState.format"
          :page-index="projectionState.pageIndex"
        />
      </section>

      <section
        v-else-if="projectionState.mode === 'media'"
        :key="projectionState.url"
        class="projector-media"
        :class="{ 'projector-media--themed': projectionState.mediaType === 'audio' }"
      >
        <img
          v-if="projectionState.mediaType === 'image'"
          :src="projectionState.url"
          :alt="projectionState.name"
        />
        <video
          v-else-if="projectionState.mediaType === 'video'"
          ref="projectedVideo"
          :src="projectionState.url"
          preload="auto"
        />
        <div v-else class="projector-audio" :class="{ 'projector-audio--playing': audioIsPlaying }">
          <q-icon name="album" />
          <AudioVisualizer
            :type="audioVisualizer.type"
            :playing="audioIsPlaying"
            :primary-color="visualizerColors.primary"
            :secondary-color="visualizerColors.secondary"
            :sensitivity="audioVisualizer.sensitivity"
          />
          <strong v-if="audioVisualizer.showTitle">{{ projectionState.name }}</strong>
          <small>{{ audioIsPlaying ? 'Reproduciendo' : 'Pausado' }}</small>
        </div>
      </section>

      <section v-else key="blank" class="projector-blank">
        <div class="projector-mark">ICP Studio</div>
      </section>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import AudioVisualizer from '../components/AudioVisualizer.vue';
import DocumentViewer from '../components/DocumentViewer.vue';
import type { MediaPlaybackCommand, ProjectionState } from '@/shared/projection';
import { useProjectionSettingsStore } from '../stores/projection-settings';

const projectionSettings = useProjectionSettingsStore();
const { audioVisualizer, visualizerColors, surfaceStyle, contentLayoutStyle } =
  storeToRefs(projectionSettings);

const projectionState = ref<ProjectionState>({ mode: 'blank' });
const projectedVideo = ref<HTMLVideoElement | null>(null);
const audioIsPlaying = ref(false);
let unsubscribeState: (() => void) | undefined;
let unsubscribeMediaControl: (() => void) | undefined;

function applyMediaCommand(command: MediaPlaybackCommand): void {
  if (projectionState.value.mode === 'media' && projectionState.value.mediaType === 'audio') {
    if (command.action === 'play') audioIsPlaying.value = true;
    if (command.action === 'pause') audioIsPlaying.value = false;
  }

  const video = projectedVideo.value;
  if (!video) return;

  if (typeof command.time === 'number' && Number.isFinite(command.time)) {
    video.currentTime = Math.max(0, command.time);
  }

  if (command.action === 'play') {
    void video.play();
  } else if (command.action === 'pause') {
    video.pause();
  }
}

onMounted(() => {
  unsubscribeState = window.icpStudio?.projection.onState((state) => {
    projectionState.value = state;
    if (state.mode !== 'media' || state.mediaType !== 'audio') {
      audioIsPlaying.value = false;
    }
    void nextTick(() => {
      if (state.mode === 'media' && state.mediaType === 'video') {
        projectedVideo.value?.pause();
      }
    });
  });

  unsubscribeMediaControl = window.icpStudio?.projection.onMediaControl(applyMediaCommand);
});

onBeforeUnmount(() => {
  unsubscribeState?.();
  unsubscribeMediaControl?.();
});
</script>

<style scoped lang="scss">
.projector-page {
  display: grid;
  min-height: 100vh;
  overflow: hidden;
  color: var(--projection-text-color);
  place-items: center;
}

.projector-content,
.projector-media,
.projector-document,
.projector-blank {
  width: 100vw;
  min-height: 100vh;
  text-align: center;
}

.projector-document {
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.projector-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(42px, 6vw, 110px);
}

.projector-media {
  display: grid;
  overflow: hidden;
  background: #000;
  place-items: center;
}

.projector-media--themed {
  background: transparent;
}

.projector-media img,
.projector-media video {
  width: 100vw;
  height: 100vh;
  object-fit: contain;
}

.projector-audio {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 24px;
  color: var(--projection-text-color);
}

.projector-audio :deep(.q-icon) {
  font-size: clamp(70px, 11vw, 170px);
  opacity: 0.5;
}

.projector-audio strong {
  max-width: 80vw;
  font-size: clamp(22px, 3vw, 48px);
}

.projector-audio small {
  color: var(--projection-footer-color);
  font-size: clamp(13px, 1.2vw, 20px);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.projector-blank {
  display: grid;
  padding: clamp(42px, 6vw, 110px);
  place-items: center;
}

.projector-mark {
  color: var(--projection-footer-color);
  font-size: clamp(16px, 1.4vw, 24px);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.3;
}

p {
  margin: 0;
  max-width: 100%;
  color: var(--projection-text-color);
  font-size: calc(clamp(24px, 3vw, 50px) * var(--projection-font-scale));
  font-weight: var(--projection-font-weight);
  line-height: 1.25;
  text-wrap: balance;
  white-space: pre-line;
}

.projection-footer {
  position: absolute;
  bottom: clamp(22px, 3vw, 52px);
  left: clamp(24px, 4vw, 72px);
  color: var(--projection-footer-color);
  font-size: clamp(15px, 1.35vw, 24px);
  font-weight: 500;
  text-align: left;
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
