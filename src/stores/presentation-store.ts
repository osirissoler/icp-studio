import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { ServicePresentationItem } from '../shared/presentation';
import type { MediaPlaybackCommand } from '../shared/projection';
import { showAppNotification } from '../services/app-notification';

function showServiceNotification(message: string, icon: string): void {
  showAppNotification(message, 'info', icon, { timeout: 2600 });
}

export const usePresentationStore = defineStore('presentation', () => {
  const serviceItems = ref<ServicePresentationItem[]>([]);
  const selectedServiceItemId = ref<string | null>(null);
  const previewItem = ref<ServicePresentationItem | null>(null);
  const previewFrameIndex = ref(0);
  const liveItem = ref<ServicePresentationItem | null>(null);
  const liveFrameIndex = ref(0);
  const mediaPlayback = ref({ isPlaying: false, time: 0, duration: 0 });
  const mediaCommand = ref<MediaPlaybackCommand>({ action: 'pause', time: 0 });
  const mediaCommandSequence = ref(0);

  const liveFrame = computed(() => liveItem.value?.frames[liveFrameIndex.value] ?? null);
  const previewFrame = computed(() => previewItem.value?.frames[previewFrameIndex.value] ?? null);

  function setPreviewItem(item: ServicePresentationItem, frameIndex = 0): void {
    previewItem.value = item;
    previewFrameIndex.value = Math.min(
      Math.max(0, frameIndex),
      Math.max(0, item.frames.length - 1),
    );
  }

  function movePreviewFrame(direction: -1 | 1): void {
    const frames = previewItem.value?.frames ?? [];
    if (frames.length === 0) return;
    previewFrameIndex.value = Math.min(
      frames.length - 1,
      Math.max(0, previewFrameIndex.value + direction),
    );
  }

  function setPreviewFrame(index: number): void {
    const frames = previewItem.value?.frames ?? [];
    if (!frames[index]) return;
    previewFrameIndex.value = index;
  }

  function clearPreview(): void {
    previewItem.value = null;
    previewFrameIndex.value = 0;
  }

  function addToService(item: ServicePresentationItem): boolean {
    const alreadyExists = serviceItems.value.some(
      (serviceItem) => serviceItem.type === item.type && serviceItem.sourceId === item.sourceId,
    );

    if (alreadyExists) {
      showServiceNotification(`${item.title} ya está agregado al servicio.`, 'info');
      return false;
    }

    serviceItems.value = [...serviceItems.value, item];
    selectedServiceItemId.value = item.id;
    showServiceNotification(`${item.title} fue agregado al servicio.`, 'playlist_add_check');
    return true;
  }

  function updateServiceItem(item: ServicePresentationItem): void {
    const itemIndex = serviceItems.value.findIndex((serviceItem) => serviceItem.id === item.id);

    if (itemIndex < 0) {
      return;
    }

    serviceItems.value = serviceItems.value.map((serviceItem) =>
      serviceItem.id === item.id ? item : serviceItem,
    );

    if (liveItem.value?.id === item.id) {
      const currentFrameId = liveFrame.value?.id;
      liveItem.value = item;
      const nextFrameIndex = item.frames.findIndex((frame) => frame.id === currentFrameId);
      liveFrameIndex.value = nextFrameIndex >= 0 ? nextFrameIndex : 0;
      projectCurrentFrame();
    }
  }

  function selectServiceItem(itemId: string): void {
    selectedServiceItemId.value = itemId;
  }

  function removeFromService(itemId: string): void {
    serviceItems.value = serviceItems.value.filter((item) => item.id !== itemId);

    if (selectedServiceItemId.value === itemId) {
      selectedServiceItemId.value = null;
    }
  }

  function projectCurrentFrame(): void {
    const item = liveItem.value;
    const frame = liveFrame.value;

    if (!item || !frame) {
      return;
    }

    if (item.type === 'activity' && frame.activity) {
      window.icpStudio?.projection.setState({ mode: 'activity', ...frame.activity });
      return;
    }

    if (frame.mediaType && frame.mediaUrl) {
      if (frame.mediaType === 'document') {
        if (frame.documentFormat) {
          window.icpStudio?.projection.setState({
            mode: 'document',
            url: frame.mediaUrl,
            name: item.title,
            format: frame.documentFormat,
            pageIndex: frame.pageIndex ?? 0,
          });
        }
        return;
      }

      window.icpStudio?.projection.setState({
        mode: 'media',
        mediaType: frame.mediaType,
        url: frame.mediaUrl,
        name: item.title,
      });
      return;
    }

    window.icpStudio?.projection.setState({
      mode: 'content',
      title: '',
      body: frame.text,
      footer: item.footer,
    });
  }

  function resetMediaPlayback(): void {
    mediaPlayback.value = { isPlaying: false, time: 0, duration: 0 };
    mediaCommand.value = { action: 'pause', time: 0 };
    mediaCommandSequence.value += 1;
  }

  function updateLiveMediaTime(time: number): void {
    if (!Number.isFinite(time)) return;
    mediaPlayback.value.time = Math.max(0, time);
  }

  function updateLiveMediaDuration(duration: number): void {
    if (!Number.isFinite(duration)) return;
    mediaPlayback.value.duration = Math.max(0, duration);
  }

  function setLiveMediaPlaying(isPlaying: boolean): void {
    mediaPlayback.value.isPlaying = isPlaying;
  }

  function controlLiveMedia(command: MediaPlaybackCommand): void {
    if (typeof command.time === 'number') {
      updateLiveMediaTime(command.time);
    }

    if (command.action === 'play') {
      mediaPlayback.value.isPlaying = true;
    } else if (command.action === 'pause') {
      mediaPlayback.value.isPlaying = false;
    }

    mediaCommand.value = command;
    mediaCommandSequence.value += 1;
    window.icpStudio?.projection.controlMedia(command);
  }

  function activateServiceItem(itemId: string): void {
    const item = serviceItems.value.find((serviceItem) => serviceItem.id === itemId);

    if (!item || item.frames.length === 0) {
      return;
    }

    selectedServiceItemId.value = item.id;
    setLiveItem(item);
  }

  function setLiveItem(item: ServicePresentationItem, frameIndex = 0): void {
    if (item.frames.length === 0) return;
    liveItem.value = item;
    liveFrameIndex.value = Math.min(Math.max(0, frameIndex), item.frames.length - 1);
    resetMediaPlayback();
    projectCurrentFrame();
  }

  function setLiveFrame(index: number): void {
    const frames = liveItem.value?.frames ?? [];

    if (!frames[index]) {
      return;
    }

    liveFrameIndex.value = index;
    resetMediaPlayback();
    projectCurrentFrame();
  }

  function moveLiveFrame(direction: -1 | 1): void {
    const frames = liveItem.value?.frames ?? [];

    if (frames.length === 0) {
      return;
    }

    const nextIndex = Math.min(frames.length - 1, Math.max(0, liveFrameIndex.value + direction));

    if (nextIndex === liveFrameIndex.value) {
      return;
    }

    liveFrameIndex.value = nextIndex;
    resetMediaPlayback();
    projectCurrentFrame();
  }

  function clearLive(): void {
    liveItem.value = null;
    liveFrameIndex.value = 0;
    resetMediaPlayback();
    window.icpStudio?.projection.setState({ mode: 'blank' });
  }

  return {
    serviceItems,
    selectedServiceItemId,
    previewItem,
    previewFrameIndex,
    previewFrame,
    liveItem,
    liveFrameIndex,
    liveFrame,
    mediaPlayback,
    mediaCommand,
    mediaCommandSequence,
    addToService,
    setPreviewItem,
    movePreviewFrame,
    setPreviewFrame,
    clearPreview,
    updateServiceItem,
    selectServiceItem,
    removeFromService,
    activateServiceItem,
    setLiveItem,
    setLiveFrame,
    moveLiveFrame,
    controlLiveMedia,
    setLiveMediaPlaying,
    updateLiveMediaDuration,
    updateLiveMediaTime,
    clearLive,
  };
});
