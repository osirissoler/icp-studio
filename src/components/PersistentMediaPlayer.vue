<template>
  <video
    v-if="isPlayableMedia"
    ref="mediaElement"
    :src="liveFrame?.mediaUrl"
    :muted="liveFrame?.mediaType === 'video'"
    preload="auto"
    playsinline
    class="persistent-media-player"
    @loadedmetadata="handleMetadata"
    @durationchange="handleMetadata"
    @timeupdate="handleTimeUpdate"
    @ended="handleEnded"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePresentationStore } from '../stores/presentation-store';

const presentationStore = usePresentationStore();
const { liveFrame, mediaCommand, mediaCommandSequence } = storeToRefs(presentationStore);
const { controlLiveMedia, setLiveMediaPlaying, updateLiveMediaDuration, updateLiveMediaTime } =
  presentationStore;

const mediaElement = ref<HTMLVideoElement | null>(null);
const isPlayableMedia = computed(
  () =>
    Boolean(liveFrame.value?.mediaUrl) &&
    (liveFrame.value?.mediaType === 'video' || liveFrame.value?.mediaType === 'audio'),
);

function handleMetadata(event: Event): void {
  const media = event.currentTarget as HTMLMediaElement;
  updateLiveMediaDuration(media.duration);
}

function handleTimeUpdate(event: Event): void {
  const media = event.currentTarget as HTMLMediaElement;
  updateLiveMediaTime(media.currentTime);
}

function handleEnded(event: Event): void {
  const media = event.currentTarget as HTMLMediaElement;
  controlLiveMedia({ action: 'pause', time: media.duration });
}

watch(
  () => liveFrame.value?.mediaUrl,
  async () => {
    await nextTick();
    const media = mediaElement.value;
    if (!media) return;

    media.pause();
    media.currentTime = 0;
    media.load();
  },
);

watch(mediaCommandSequence, async () => {
  await nextTick();
  const media = mediaElement.value;
  if (!media) return;

  const command = mediaCommand.value;

  if (typeof command.time === 'number' && Number.isFinite(command.time)) {
    try {
      media.currentTime = Math.max(0, command.time);
    } catch {
      // The requested time will be restored after metadata is available.
    }
  }

  if (command.action === 'play') {
    try {
      await media.play();
    } catch {
      setLiveMediaPlaying(false);
    }
  } else if (command.action === 'pause') {
    media.pause();
  }
});
</script>

<style scoped>
.persistent-media-player {
  position: fixed;
  z-index: -1;
  width: 1px;
  height: 1px;
  pointer-events: none;
  opacity: 0;
}
</style>
