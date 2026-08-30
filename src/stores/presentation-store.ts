import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { Notify } from 'quasar';
import type { ServicePresentationItem } from '../shared/presentation';

function showServiceNotification(
  message: string,
  icon: string,
): void {
  Notify.create({
    message,
    icon,
    position: 'bottom-right',
    color: 'blue-grey-9',
    textColor: 'white',
    timeout: 2600,
    progress: true,
    actions: [{ icon: 'close', color: 'white', round: true }],
  });
}

export const usePresentationStore = defineStore('presentation', () => {
  const serviceItems = ref<ServicePresentationItem[]>([]);
  const selectedServiceItemId = ref<string | null>(null);
  const liveItem = ref<ServicePresentationItem | null>(null);
  const liveFrameIndex = ref(0);

  const liveFrame = computed(
    () => liveItem.value?.frames[liveFrameIndex.value] ?? null,
  );

  function addToService(item: ServicePresentationItem): boolean {
    const alreadyExists = serviceItems.value.some(
      (serviceItem) =>
        serviceItem.type === item.type &&
        serviceItem.sourceId === item.sourceId,
    );

    if (alreadyExists) {
      showServiceNotification(
        `${item.title} ya está agregado al servicio.`,
        'info',
      );
      return false;
    }

    serviceItems.value = [...serviceItems.value, item];
    selectedServiceItemId.value = item.id;
    showServiceNotification(
      `${item.title} fue agregado al servicio.`,
      'playlist_add_check',
    );
    return true;
  }

  function updateServiceItem(item: ServicePresentationItem): void {
    const itemIndex = serviceItems.value.findIndex(
      (serviceItem) => serviceItem.id === item.id,
    );

    if (itemIndex < 0) {
      return;
    }

    serviceItems.value = serviceItems.value.map((serviceItem) =>
      serviceItem.id === item.id ? item : serviceItem,
    );

    if (liveItem.value?.id === item.id) {
      const currentFrameId = liveFrame.value?.id;
      liveItem.value = item;
      const nextFrameIndex = item.frames.findIndex(
        (frame) => frame.id === currentFrameId,
      );
      liveFrameIndex.value = nextFrameIndex >= 0 ? nextFrameIndex : 0;
      projectCurrentFrame();
    }
  }

  function selectServiceItem(itemId: string): void {
    selectedServiceItemId.value = itemId;
  }

  function removeFromService(itemId: string): void {
    serviceItems.value = serviceItems.value.filter(
      (item) => item.id !== itemId,
    );

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

    if (frame.mediaType && frame.mediaUrl) {
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

  function activateServiceItem(itemId: string): void {
    const item = serviceItems.value.find(
      (serviceItem) => serviceItem.id === itemId,
    );

    if (!item || item.frames.length === 0) {
      return;
    }

    selectedServiceItemId.value = item.id;
    liveItem.value = item;
    liveFrameIndex.value = 0;
    projectCurrentFrame();
  }

  function setLiveFrame(index: number): void {
    const frames = liveItem.value?.frames ?? [];

    if (!frames[index]) {
      return;
    }

    liveFrameIndex.value = index;
    projectCurrentFrame();
  }

  function moveLiveFrame(direction: -1 | 1): void {
    const frames = liveItem.value?.frames ?? [];

    if (frames.length === 0) {
      return;
    }

    const nextIndex = Math.min(
      frames.length - 1,
      Math.max(0, liveFrameIndex.value + direction),
    );

    if (nextIndex === liveFrameIndex.value) {
      return;
    }

    liveFrameIndex.value = nextIndex;
    projectCurrentFrame();
  }

  function clearLive(): void {
    liveItem.value = null;
    liveFrameIndex.value = 0;
    window.icpStudio?.projection.setState({ mode: 'blank' });
  }

  return {
    serviceItems,
    selectedServiceItemId,
    liveItem,
    liveFrameIndex,
    liveFrame,
    addToService,
    updateServiceItem,
    selectServiceItem,
    removeFromService,
    activateServiceItem,
    setLiveFrame,
    moveLiveFrame,
    clearLive,
  };
});
