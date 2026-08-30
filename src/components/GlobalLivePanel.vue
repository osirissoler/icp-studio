<template>
  <div
    ref="panelElement"
    class="global-live-panel"
    tabindex="0"
    @keydown.up.prevent="moveLiveFrame(-1)"
    @keydown.down.prevent="moveLiveFrame(1)"
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

        <div v-if="section === 'screen'" class="technical-screen">
          <template v-if="liveFrame">
            <img
              v-if="liveFrame.mediaType === 'image' && liveFrame.mediaUrl"
              :src="liveFrame.mediaUrl"
              :alt="liveItem?.title"
              class="live-media"
            />
            <video
              v-else-if="liveFrame.mediaType === 'video' && liveFrame.mediaUrl"
              ref="liveMediaElement"
              :key="liveFrame.id"
              :src="liveFrame.mediaUrl"
              class="live-media"
              controls
              preload="metadata"
              @play="controlPlayback('play', $event)"
              @pause="controlPlayback('pause', $event)"
              @seeked="controlPlayback('seek', $event)"
              @timeupdate="rememberPlaybackTime"
            />
            <div
              v-else-if="liveFrame.mediaType === 'audio' && liveFrame.mediaUrl"
              class="live-audio"
            >
              <q-icon name="album" size="52px" />
              <strong>{{ liveItem?.title }}</strong>
              <audio
                ref="liveMediaElement"
                :key="liveFrame.id"
                :src="liveFrame.mediaUrl"
                controls
                preload="metadata"
                @play="controlPlayback('play', $event)"
                @pause="controlPlayback('pause', $event)"
                @seeked="controlPlayback('seek', $event)"
                @timeupdate="rememberPlaybackTime"
              />
            </div>
            <FittedTechnicalText
              v-else
              :text="liveFrame.text"
              :min-size="10"
              :max-size="26"
            />
            <span v-if="!liveFrame.mediaType" class="screen-footer">
              {{ liveItem?.footer }}
            </span>
          </template>
          <template v-else>
            <q-icon name="live_tv" size="44px" />
            <span>Haz doble clic en un elemento del servicio</span>
          </template>
        </div>

        <div v-else-if="liveItem" class="frame-list">
          <div class="item-title">{{ liveItem.title }}</div>
          <button
            v-for="(frame, frameIndex) in liveItem.frames"
            :key="frame.id"
            type="button"
            class="frame-item"
            :class="{ 'frame-item--active': liveFrameIndex === frameIndex }"
            @click="setLiveFrame(frameIndex)"
          >
            <span class="position">{{ frameIndex + 1 }}</span>
            <span>
              <strong>{{ frame.label }}</strong>
              <small>{{ frame.text || (frame.mediaType === 'image' ? 'Imagen' : frame.mediaType === 'video' ? 'Video' : 'Audio') }}</small>
            </span>
          </button>
        </div>

        <div v-else class="empty-content">
          El contenido activo aparecerá aquí.
        </div>
      </section>

      <div
        v-if="index === 0"
        class="section-resizer"
        @pointerdown="startResize"
      >
        <span></span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  reactive,
  ref,
  watch,
} from 'vue';
import { storeToRefs } from 'pinia';
import FittedTechnicalText from './FittedTechnicalText.vue';
import { usePresentationStore } from '../stores/presentation-store';

type LiveSection = 'screen' | 'content';

const presentationStore = usePresentationStore();
const { liveFrame, liveFrameIndex, liveItem, mediaPlayback } =
  storeToRefs(presentationStore);
const {
  clearLive,
  controlLiveMedia,
  moveLiveFrame,
  setLiveFrame,
  updateLiveMediaTime,
} = presentationStore;

const panelElement = ref<HTMLElement | null>(null);
const liveMediaElement = ref<HTMLMediaElement | null>(null);
const sections = ref<LiveSection[]>(['screen', 'content']);
const sectionSizes = reactive<Record<LiveSection, number>>({
  screen: 1,
  content: 1,
});
const draggingSection = ref<LiveSection | null>(null);
let stopResizeListener: (() => void) | null = null;
let suppressPlaybackEvents = true;
let mediaSyncVersion = 0;

function controlPlayback(
  action: 'play' | 'pause' | 'seek',
  event: Event,
): void {
  if (suppressPlaybackEvents) return;

  const media = event.currentTarget as HTMLMediaElement;
  controlLiveMedia({
    action,
    time: media.currentTime,
  });
}

function rememberPlaybackTime(event: Event): void {
  const media = event.currentTarget as HTMLMediaElement;
  updateLiveMediaTime(media.currentTime);
}

async function synchronizeMediaElement(): Promise<void> {
  const syncVersion = ++mediaSyncVersion;
  await nextTick();

  if (syncVersion !== mediaSyncVersion) return;

  const media = liveMediaElement.value;

  if (!media) {
    suppressPlaybackEvents = false;
    return;
  }

  suppressPlaybackEvents = true;

  const restorePlayback = () => {
    if (syncVersion !== mediaSyncVersion) return;

    if (Math.abs(media.currentTime - mediaPlayback.value.time) > 0.2) {
      media.currentTime = mediaPlayback.value.time;
    }

    if (mediaPlayback.value.isPlaying) {
      void media.play();
    } else {
      media.pause();
    }

    window.setTimeout(() => {
      suppressPlaybackEvents = false;
    }, 0);
  };

  if (media.readyState === 0) {
    media.addEventListener('loadedmetadata', restorePlayback, { once: true });
  } else {
    restorePlayback();
  }
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
    const difference =
      ((moveEvent.clientY - startY) / containerHeight) * combined;
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
  () => liveFrame.value?.id,
  () => {
    void synchronizeMediaElement();
  },
);

onActivated(() => {
  void synchronizeMediaElement();
});

onDeactivated(() => {
  mediaSyncVersion += 1;
  suppressPlaybackEvents = true;
  const media = liveMediaElement.value;

  if (media) {
    updateLiveMediaTime(media.currentTime);
    media.pause();
  }
});

onBeforeUnmount(() => {
  mediaSyncVersion += 1;
  suppressPlaybackEvents = true;
  stopResizeListener?.();
  liveMediaElement.value?.pause();
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
  color: #65748a;
  background: radial-gradient(circle at center, rgb(35 55 79 / 55%), transparent 62%), #05080d;
  text-align: center;
}

.live-media {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.live-audio {
  display: flex;
  width: min(90%, 440px);
  align-items: center;
  flex-direction: column;
  gap: 10px;
  color: #c7d2e0;
}

.live-audio audio {
  width: 100%;
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

.frame-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  padding: 5px;
  color: #aebaca;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
}

.frame-item:hover,
.frame-item--active {
  background: #12243a;
  border-color: #3b82f6;
}

.frame-item > span:last-child {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.frame-item small {
  overflow: hidden;
  color: #8492a6;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
