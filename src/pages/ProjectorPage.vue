<template>
  <main class="projector-page" :style="surfaceStyle">
    <Transition name="projection" mode="out-in">
      <section
        v-if="projectionState.mode === 'activity'"
        :key="projectionState.id"
        class="projector-activity"
        :class="{ 'projector-activity--image-only': !projectionState.showOverlayText }"
        :style="activityBackground(projectionState.imageUrl)"
      >
        <div v-if="projectionState.showOverlayText" class="activity-backdrop"></div>
        <header v-if="projectionState.showOverlayText" class="activity-brand">
          <span><q-icon name="church" /> ICP Studio</span>
          <small>Próxima actividad</small>
        </header>
        <div v-if="projectionState.showOverlayText" class="activity-content">
          <span
            class="activity-category"
            :style="{ '--activity-color': projectionState.categoryColor }"
          >
            {{ projectionState.categoryLabel }}
          </span>
          <h1>{{ projectionState.title }}</h1>
          <p class="activity-date">
            <q-icon name="calendar_month" /> {{ projectionState.dateLabel }}
          </p>
          <p v-if="projectionState.location" class="activity-location">
            <q-icon name="location_on" /> {{ projectionState.location }}
          </p>
          <p
            v-if="projectionState.showDescriptionOnImage && projectionState.description"
            class="activity-description"
          >
            {{ projectionState.description }}
          </p>
        </div>
        <footer v-if="projectionState.showOverlayText" class="activity-footer">
          <span>Te esperamos</span>
          <i :style="{ backgroundColor: projectionState.categoryColor }"></i>
        </footer>
      </section>

      <section
        v-else-if="projectionState.mode === 'content'"
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

function activityBackground(imageUrl: string): Record<string, string> {
  return imageUrl ? { backgroundImage: `url("${imageUrl.replaceAll('"', '%22')}")` } : {};
}

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
.projector-activity,
.projector-media,
.projector-document,
.projector-blank {
  width: 100vw;
  min-height: 100vh;
  text-align: center;
}

.projector-activity {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: stretch;
  justify-content: space-between;
  flex-direction: column;
  padding: clamp(36px, 5vw, 90px) clamp(46px, 7vw, 130px);
  color: white;
  background:
    radial-gradient(circle at 78% 25%, #315b83, transparent 35%),
    linear-gradient(135deg, #10243a, #050b12);
  background-position: center;
  background-size: cover;
  text-align: left;
}

.projector-activity--image-only {
  padding: 0;
  background-color: #000;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.activity-backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgb(3 9 16 / 94%) 0%, rgb(5 13 22 / 76%) 48%, rgb(5 13 22 / 22%)),
    linear-gradient(0deg, rgb(2 7 12 / 62%), transparent 45%);
}

.activity-brand,
.activity-content,
.activity-footer {
  position: relative;
  z-index: 1;
}

.activity-brand,
.activity-footer,
.activity-brand > span {
  display: flex;
  align-items: center;
}

.activity-brand {
  justify-content: space-between;
  color: #d7e6f4;
  font-size: clamp(14px, 1.3vw, 24px);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.activity-brand > span {
  gap: 9px;
}

.activity-brand small {
  color: #94aabd;
  font-size: 0.68em;
  letter-spacing: 0.16em;
}

.activity-content {
  width: min(78vw, 1350px);
  margin: auto 0;
}

.activity-category {
  display: inline-flex;
  padding: clamp(7px, 0.7vw, 12px) clamp(12px, 1.2vw, 22px);
  color: white;
  background: color-mix(in srgb, var(--activity-color) 68%, rgb(8 18 30 / 88%));
  border-left: clamp(4px, 0.45vw, 8px) solid var(--activity-color);
  border-radius: 6px;
  font-size: clamp(12px, 1.15vw, 21px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.activity-content h1 {
  max-width: 95%;
  margin: clamp(16px, 2.2vw, 38px) 0 clamp(13px, 1.4vw, 25px);
  color: #fff;
  font-size: clamp(44px, 6.7vw, 120px);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.035em;
  text-wrap: balance;
  text-shadow: 0 5px 24px rgb(0 0 0 / 65%);
}

.activity-date,
.activity-location {
  display: flex;
  align-items: center;
  gap: clamp(8px, 0.8vw, 14px);
  margin: 0;
  color: #e0ebf5;
  font-size: clamp(20px, 2vw, 38px);
  font-weight: 600;
  line-height: 1.25;
  text-transform: capitalize;
  text-shadow: 0 2px 12px #000;
}

.activity-location {
  margin-top: clamp(8px, 0.8vw, 14px);
  color: #c3d4e2;
  font-size: clamp(17px, 1.6vw, 30px);
}

.activity-description {
  max-width: min(68vw, 1150px);
  margin: clamp(15px, 1.5vw, 28px) 0 0;
  overflow: hidden;
  color: #bacbd9;
  font-size: clamp(15px, 1.35vw, 25px);
  font-weight: 400;
  line-height: 1.45;
  text-wrap: pretty;
  white-space: pre-line;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.activity-footer {
  justify-content: flex-end;
  gap: 13px;
  color: #a9bac9;
  font-size: clamp(13px, 1.1vw, 20px);
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.activity-footer i {
  width: clamp(32px, 3vw, 55px);
  height: 3px;
  border-radius: 2px;
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
