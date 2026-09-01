<template>
  <div
    ref="panelElement"
    class="global-live-panel"
    tabindex="0"
    @keydown.up.prevent="moveLiveFrame(-1)"
    @keydown.down.prevent="moveLiveFrame(1)"
    @wheel="handleLiveWheel"
  >
    <template v-for="(section, index) in sections" :key="section">
      <section
        class="live-section"
        :style="{ flexGrow: sectionSizes[section] }"
        @dragover.prevent
        @drop="dropSection(section)"
      >
        <header
          class="section-header"
          draggable="true"
          @dragstart="draggingSection = section"
          @dragend="draggingSection = null"
        >
          <span><q-icon name="drag_indicator" /> {{ sectionTitle(section) }}</span>

          <span v-if="section === 'screen'" class="output-label">
            <span class="live-dot"></span>
            Salida de proyección
          </span>

          <span v-else class="content-actions">
            <small v-if="liveItem && liveFrame">
              {{ liveFrameIndex + 1 }} de {{ liveItem.frames.length }}
            </small>
            <q-badge v-if="liveFrame" color="primary" label="Seleccionado" />
            <q-btn
              flat
              round
              dense
              size="xs"
              icon="delete_sweep"
              color="red-4"
              :disable="!liveItem"
              @click.stop="clearLive"
            >
              <q-tooltip>Limpiar contenido en vivo</q-tooltip>
            </q-btn>
          </span>
        </header>

        <div
          v-if="section === 'screen'"
          class="technical-screen"
          :class="{
            'technical-screen--activity':
              liveItem?.type === 'activity' || Boolean(liveFrame?.roulette),
          }"
          :style="[surfaceStyle, contentLayoutStyle]"
        >
          <template v-if="liveFrame">
            <ActivityProjectionView
              v-if="liveItem?.type === 'activity' && liveFrame.activity"
              :activity="liveFrame.activity"
              compact
            />
            <RouletteWheel
              v-else-if="liveItem?.type === 'game' && liveFrame.roulette"
              :roulette="liveFrame.roulette"
              compact
              show-timer
            />
            <img
              v-else-if="liveFrame.mediaType === 'image' && liveFrame.mediaUrl"
              :src="liveFrame.mediaUrl"
              :alt="liveItem?.title"
              class="live-media"
            />
            <div
              v-else-if="liveFrame.mediaType === 'video' && liveFrame.mediaUrl"
              class="live-video"
            >
              <video
                :key="liveFrame.id"
                :src="liveFrame.mediaUrl"
                class="live-media"
                muted
                preload="metadata"
              />
              <div class="media-playback-controls">
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  :icon="mediaPlayback.isPlaying ? 'pause' : 'play_arrow'"
                  color="primary"
                  @click="togglePlayback"
                />
                <q-slider
                  v-model="seekPosition"
                  :min="0"
                  :max="Math.max(1, mediaPlayback.duration)"
                  color="primary"
                  @pan="handleSeekPan"
                  @change="seekPlayback"
                />
                <small>
                  {{ formatTime(mediaPlayback.time) }} /
                  {{ formatTime(mediaPlayback.duration) }}
                </small>
              </div>
            </div>
            <div
              v-else-if="liveFrame.mediaType === 'audio' && liveFrame.mediaUrl"
              class="live-audio"
            >
              <q-icon name="album" size="52px" />
              <AudioVisualizer
                :type="audioVisualizer.type"
                :playing="mediaPlayback.isPlaying"
                compact
                :primary-color="visualizerColors.primary"
                :secondary-color="visualizerColors.secondary"
                :sensitivity="audioVisualizer.sensitivity"
              />
              <strong v-if="audioVisualizer.showTitle">{{ liveItem?.title }}</strong>
              <div class="media-playback-controls">
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  :icon="mediaPlayback.isPlaying ? 'pause' : 'play_arrow'"
                  color="primary"
                  @click="togglePlayback"
                />
                <q-slider
                  v-model="seekPosition"
                  :min="0"
                  :max="Math.max(1, mediaPlayback.duration)"
                  color="primary"
                  @pan="handleSeekPan"
                  @change="seekPlayback"
                />
                <small>
                  {{ formatTime(mediaPlayback.time) }} /
                  {{ formatTime(mediaPlayback.duration) }}
                </small>
              </div>
            </div>
            <DocumentViewer
              v-else-if="
                liveFrame.mediaType === 'document' && liveFrame.mediaUrl && liveFrame.documentFormat
              "
              :url="liveFrame.mediaUrl"
              :format="liveFrame.documentFormat"
              :page-index="liveFrame.pageIndex ?? 0"
            />
            <FittedTechnicalText v-else :text="liveDisplayText" :min-size="10" :max-size="26" />
            <span
              v-if="liveFrame && liveItem?.type !== 'activity' && !liveFrame.roulette"
              class="technical-selection"
            >
              {{ liveFrame.label }} · Seleccionado
            </span>
            <span
              v-if="!liveFrame.mediaType && liveItem?.type !== 'activity' && !liveFrame.roulette"
              class="screen-footer"
            >
              {{ liveItem?.footer }}
            </span>
          </template>
          <template v-else>
            <q-icon name="live_tv" size="44px" />
            <span>Haz doble clic en un elemento del servicio</span>
          </template>
        </div>

        <div v-else-if="liveItem" class="frame-list" :style="activeContentStyle">
          <div class="item-title-row">
            <div class="item-title">{{ liveItem.title }}</div>
            <div
              v-if="liveItem.type === 'game' && liveFrame?.roulette"
              class="roulette-live-actions"
            >
              <q-toggle
                :model-value="liveFrame.roulette.timedSpin"
                dark
                dense
                color="primary"
                label="Tiempo"
                :disable="liveFrame.roulette.spinning"
                @update:model-value="setLiveRouletteTimed"
              />
              <q-input
                v-if="liveFrame.roulette.timedSpin"
                v-model.number="liveRouletteSeconds"
                dark
                outlined
                dense
                type="number"
                min="1"
                max="600"
                suffix="seg"
                :disable="liveFrame.roulette.spinning"
                aria-label="Duración del giro en segundos"
              />
              <q-btn
                v-if="!liveFrame.roulette.spinning"
                unelevated
                no-caps
                dense
                size="sm"
                color="primary"
                icon="play_arrow"
                label="Girar"
                :disable="liveFrame.roulette.options.length < 2"
                @click="spinLiveRoulette"
              />
              <q-btn
                v-else
                unelevated
                no-caps
                dense
                size="sm"
                color="red-6"
                icon="stop"
                label="Detener"
                @click="stopLiveRoulette"
              />
            </div>
          </div>
          <button
            v-for="(frame, frameIndex) in liveItem.frames"
            :key="frame.id"
            type="button"
            class="frame-item"
            :class="{ 'frame-item--active': liveFrameIndex === frameIndex }"
            @click="setLiveFrame(frameIndex)"
          >
            <span class="position">{{ frameIndex + 1 }}</span>
            <span class="frame-details">
              <strong v-if="liveItem.type === 'bible'" class="frame-inline-text">
                {{ displayFrameLabel(frame) }}. {{ frame.text }}
              </strong>
              <template v-else>
                <strong>{{ displayFrameLabel(frame) }}</strong>
                <small>{{ frame.text || mediaFrameLabel(frame.mediaType) }}</small>
              </template>
            </span>
            <DocumentThumbnail
              v-if="frame.mediaType === 'document' && frame.mediaUrl && frame.documentFormat"
              :url="frame.mediaUrl"
              :format="frame.documentFormat"
              :page-index="frame.pageIndex ?? 0"
            />
            <div
              v-else-if="liveItem.type === 'activity' && frame.activity"
              class="activity-frame-thumbnail"
              :style="activityThumbnail(frame.activity.imageUrl)"
            >
              <q-icon v-if="!frame.activity.imageUrl" name="event" />
            </div>
          </button>
        </div>

        <div v-else class="empty-content">El contenido activo aparecerá aquí.</div>
      </section>

      <div v-if="index === 0" class="section-resizer" @pointerdown="startResize">
        <span></span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AudioVisualizer from './AudioVisualizer.vue';
import ActivityProjectionView from './ActivityProjectionView.vue';
import FittedTechnicalText from './FittedTechnicalText.vue';
import DocumentViewer from './DocumentViewer.vue';
import DocumentThumbnail from './DocumentThumbnail.vue';
import RouletteWheel from './RouletteWheel.vue';
import type { PresentationFrame } from '../shared/presentation';
import { usePresentationStore } from '../stores/presentation-store';
import { useProjectionSettingsStore } from '../stores/projection-settings';

type LiveSection = 'screen' | 'content';

const presentationStore = usePresentationStore();
const projectionSettings = useProjectionSettingsStore();
const { liveFrame, liveFrameIndex, liveItem, mediaPlayback } = storeToRefs(presentationStore);
const { audioVisualizer, activeContent, visualizerColors, surfaceStyle, contentLayoutStyle } =
  storeToRefs(projectionSettings);
const {
  clearLive,
  controlLiveMedia,
  moveLiveFrame,
  setLiveFrame,
  spinLiveRoulette,
  stopLiveRoulette,
  setLiveRouletteDuration,
  setLiveRouletteTimed,
} = presentationStore;

const liveRouletteSeconds = computed({
  get: () => Math.max(1, Math.round((liveFrame.value?.roulette?.spinDuration ?? 6000) / 1000)),
  set: (seconds: number) => setLiveRouletteDuration(Number(seconds) * 1000),
});

const liveDisplayText = computed(() => {
  if (!liveFrame.value) return '';
  if (liveItem.value?.type !== 'bible') return liveFrame.value.text;
  const verseNumber = liveFrame.value.label.match(/(\d+:\d+)$/)?.[1] ?? liveFrame.value.label;
  return `${verseNumber}. ${liveFrame.value.text}`;
});

const activeContentStyle = computed<Record<string, string>>(() => ({
  '--active-content-background': activeContent.value.activeBackgroundColor,
  '--active-content-border': activeContent.value.activeBorderColor,
  '--active-content-text': activeContent.value.activeTextColor,
  '--inactive-content-text': activeContent.value.inactiveTextColor,
  '--active-content-font-size': `${activeContent.value.fontSize}px`,
  '--active-content-lines': String(activeContent.value.visibleLines),
}));

function displayFrameLabel(frame: PresentationFrame): string {
  if (liveItem.value?.type !== 'bible') return frame.label;
  return frame.label.match(/(\d+:\d+)$/)?.[1] ?? frame.label;
}

function activityThumbnail(imageUrl: string): Record<string, string> {
  return imageUrl ? { backgroundImage: `url("${imageUrl.replaceAll('"', '%22')}")` } : {};
}

const panelElement = ref<HTMLElement | null>(null);
const seekPosition = ref(0);
const isSeeking = ref(false);
const sections = ref<LiveSection[]>(['screen', 'content']);
const sectionSizes = reactive<Record<LiveSection, number>>({
  screen: 1,
  content: 1,
});
const draggingSection = ref<LiveSection | null>(null);
let stopResizeListener: (() => void) | null = null;
let wheelLockedUntil = 0;

function handleLiveWheel(event: WheelEvent): void {
  const eventTarget = event.target;
  if (eventTarget instanceof Element && eventTarget.closest('.frame-list')) {
    return;
  }

  if (
    liveFrame.value?.mediaType !== 'document' ||
    liveFrame.value.documentFormat === 'spreadsheet'
  ) {
    return;
  }

  event.preventDefault();
  const now = Date.now();
  if (now < wheelLockedUntil || Math.abs(event.deltaY) < 4) return;
  wheelLockedUntil = now + 220;
  moveLiveFrame(event.deltaY > 0 ? 1 : -1);
}

function togglePlayback(): void {
  controlLiveMedia({
    action: mediaPlayback.value.isPlaying ? 'pause' : 'play',
    time: mediaPlayback.value.time,
  });
}

function handleSeekPan(phase: 'start' | 'update' | 'end'): void {
  isSeeking.value = phase !== 'end';
}

function seekPlayback(value: number | null): void {
  if (value === null) return;
  seekPosition.value = value;
  controlLiveMedia({ action: 'seek', time: value });
  isSeeking.value = false;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '0:00';
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function mediaFrameLabel(mediaType: PresentationFrame['mediaType']): string {
  if (mediaType === 'image') return 'Imagen';
  if (mediaType === 'video') return 'Video';
  if (mediaType === 'audio') return 'Audio';
  if (mediaType === 'document') return 'Página del documento';
  return '';
}

function sectionTitle(section: LiveSection): string {
  return section === 'screen' ? 'Pantalla en vivo' : 'Contenido activo';
}

function dropSection(target: LiveSection): void {
  if (!draggingSection.value || draggingSection.value === target) {
    draggingSection.value = null;
    return;
  }

  sections.value = [...sections.value].reverse();
  draggingSection.value = null;
}

function startResize(event: PointerEvent): void {
  const containerHeight = panelElement.value?.clientHeight;
  const topSection = sections.value[0];
  const bottomSection = sections.value[1];

  if (!containerHeight || !topSection || !bottomSection) {
    return;
  }

  stopResizeListener?.();

  const startY = event.clientY;
  const initialTop = sectionSizes[topSection];
  const initialBottom = sectionSizes[bottomSection];
  const combined = initialTop + initialBottom;

  const handleMove = (moveEvent: PointerEvent) => {
    const difference = ((moveEvent.clientY - startY) / containerHeight) * combined;
    const nextTop = initialTop + difference;
    const nextBottom = initialBottom - difference;

    if (nextTop < 0.35 || nextBottom < 0.35) {
      return;
    }

    sectionSizes[topSection] = nextTop;
    sectionSizes[bottomSection] = combined - nextTop;
  };

  const stop = () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', stop);
    stopResizeListener = null;
  };

  stopResizeListener = stop;
  window.addEventListener('pointermove', handleMove);
  window.addEventListener('pointerup', stop);
  event.preventDefault();
}

watch(
  () => mediaPlayback.value.time,
  (time) => {
    if (!isSeeking.value) {
      seekPosition.value = time;
    }
  },
  { immediate: true },
);

watch(liveFrameIndex, async () => {
  await nextTick();
  panelElement.value?.querySelector('.frame-item--active')?.scrollIntoView({
    block: 'nearest',
    behavior: 'smooth',
  });
});

onBeforeUnmount(() => {
  stopResizeListener?.();
});
</script>

<style scoped>
.global-live-panel {
  display: flex;
  min-height: 100%;
  flex: 1;
  flex-direction: column;
  outline: none;
}

.live-section {
  display: flex;
  min-height: 110px;
  flex-basis: 0;
  flex-direction: column;
  overflow: hidden;
  background: #0b131d;
  border: 1px solid #26364b;
  border-radius: 8px;
}

.section-header {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 7px;
  color: #77869a;
  background: #121e2c;
  border-bottom: 1px solid #26364b;
  font-size: 10px;
  cursor: grab;
  user-select: none;
}

.section-header > span,
.content-actions,
.output-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.live-dot {
  width: 7px;
  height: 7px;
  background: #f05252;
  border-radius: 50%;
}

.technical-screen {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 14px 14px 24px;
  overflow: hidden;
  color: var(--projection-text-color);
  text-align: center;
}

.technical-screen--activity {
  padding: 0;
}

.technical-selection {
  position: absolute;
  top: 7px;
  right: 9px;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: calc(100% - 18px);
  overflow: hidden;
  padding: 4px 7px;
  color: #dbeafe;
  background: rgb(24 105 170 / 85%);
  border: 1px solid #56a8e8;
  border-radius: 5px;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-media {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.live-video {
  display: flex;
  min-height: 0;
  width: 100%;
  height: 100%;
  flex-direction: column;
}

.live-video .live-media {
  min-height: 0;
  flex: 1;
}

.live-audio {
  display: flex;
  width: min(90%, 440px);
  align-items: center;
  flex-direction: column;
  gap: 10px;
  color: var(--projection-text-color);
}

.media-playback-controls {
  display: grid;
  width: 100%;
  align-items: center;
  grid-template-columns: auto minmax(80px, 1fr) auto;
  gap: 8px;
  padding: 4px 8px;
}

.media-playback-controls small {
  min-width: 72px;
  color: #91a0b3;
  font-size: 9px;
  text-align: right;
}

.screen-footer {
  position: absolute;
  bottom: 7px;
  left: 9px;
  max-width: calc(100% - 18px);
  overflow: hidden;
  color: rgb(216 226 242 / 68%);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.frame-list {
  min-height: 0;
  flex: 1;
  padding: 6px;
  overflow-y: auto;
}

.item-title {
  padding: 3px 5px 7px;
  color: #dce6f2;
  font-size: 11px;
  font-weight: 700;
}

.item-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 6px;
}

.item-title-row .item-title {
  min-width: 0;
  overflow: hidden;
  padding-bottom: 3px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roulette-live-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}
.roulette-live-actions .q-input {
  width: 82px;
  font-size: 9px;
}

.frame-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  padding: 5px;
  color: var(--inactive-content-text, #aebaca);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
}

.frame-item:hover,
.frame-item--active {
  color: var(--active-content-text, #f8fbff);
  background: var(--active-content-background, #1d4f7d);
  border-color: var(--active-content-border, #60a5fa);
  box-shadow:
    inset 3px 0 var(--active-content-border, #60a5fa),
    0 0 0 1px rgb(96 165 250 / 20%);
}

.frame-item--active strong {
  color: var(--active-content-text, #ffffff);
}

.frame-item--active small {
  color: #d5e8ff;
}

.frame-details {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.frame-details strong,
.frame-details small {
  font-size: var(--active-content-font-size, 11px);
}

.frame-details .frame-inline-text,
.frame-item small {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.35;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--active-content-lines, 2);
}

.activity-frame-thumbnail {
  display: grid;
  width: 58px;
  height: 34px;
  flex: 0 0 58px;
  overflow: hidden;
  place-items: center;
  color: #7690a8;
  background: radial-gradient(circle at 70% 30%, #2d506f, transparent 40%), #101d2a;
  background-position: center;
  background-size: cover;
  border-radius: 4px;
}

.frame-item small {
  color: var(--inactive-content-text, #8492a6);
  text-overflow: ellipsis;
}

.position {
  display: flex;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  background: #172d49;
  border-radius: 5px;
  font-size: 10px;
}

.frame-item--active .position {
  color: #ffffff;
  background: #2563eb;
  box-shadow: 0 0 0 2px rgb(147 197 253 / 35%);
  font-weight: 700;
}

.empty-content {
  display: grid;
  min-height: 0;
  flex: 1;
  color: #66758a;
  font-size: 11px;
  place-items: center;
}

.section-resizer {
  display: flex;
  height: 10px;
  flex: 0 0 10px;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
  touch-action: none;
}

.section-resizer span {
  width: 44px;
  height: 3px;
  background: #314155;
  border-radius: 999px;
}

.section-resizer:hover span {
  background: #60a5fa;
}
</style>
