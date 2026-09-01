import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { ServicePresentationItem } from '../shared/presentation';
import type { MediaPlaybackCommand } from '../shared/projection';
import type { RouletteLiveResult } from '../shared/roulette';
import { showAppNotification } from '../services/app-notification';

function showServiceNotification(message: string, icon: string): void {
  showAppNotification(message, 'info', icon, { timeout: 2600 });
}

export const usePresentationStore = defineStore('presentation', () => {
  const rouletteResultsStorageKey = 'icp-studio-roulette-live-results';
  const serviceItems = ref<ServicePresentationItem[]>([]);
  const selectedServiceItemId = ref<string | null>(null);
  const previewItem = ref<ServicePresentationItem | null>(null);
  const previewFrameIndex = ref(0);
  const liveItem = ref<ServicePresentationItem | null>(null);
  const liveFrameIndex = ref(0);
  const mediaPlayback = ref({ isPlaying: false, time: 0, duration: 0 });
  const mediaCommand = ref<MediaPlaybackCommand>({ action: 'pause', time: 0 });
  const mediaCommandSequence = ref(0);
  const liveRouletteResults = ref<RouletteLiveResult[]>(loadLiveRouletteResults());

  function loadLiveRouletteResults(): RouletteLiveResult[] {
    try {
      const value = JSON.parse(localStorage.getItem(rouletteResultsStorageKey) ?? '[]') as unknown;
      return Array.isArray(value)
        ? value.filter(
            (result): result is RouletteLiveResult =>
              typeof result === 'object' &&
              result !== null &&
              typeof (result as RouletteLiveResult).id === 'string' &&
              typeof (result as RouletteLiveResult).rouletteId === 'string' &&
              typeof (result as RouletteLiveResult).label === 'string',
          )
        : [];
    } catch {
      return [];
    }
  }

  function persistLiveRouletteResults(): void {
    localStorage.setItem(rouletteResultsStorageKey, JSON.stringify(liveRouletteResults.value));
  }

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

    if (item.type === 'game' && frame.roulette) {
      const roulette = frame.roulette;
      window.icpStudio?.projection.setState({
        mode: 'roulette',
        ...roulette,
        options: roulette.options.map((option) => ({ ...option })),
        usedWinnerIds: [...roulette.usedWinnerIds],
      });
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

  function spinLiveRoulette(): void {
    const item = liveItem.value;
    const frameIndex = liveFrameIndex.value;
    const frame = item?.frames[frameIndex];
    const roulette = frame?.roulette;
    if (!item || !frame || !roulette || roulette.spinning || roulette.options.length < 2) return;

    let displayOptions = roulette.options;
    let usedWinnerIds = roulette.usedWinnerIds;
    if (roulette.removeWinner && roulette.winnerId) {
      displayOptions = roulette.options.filter((option) => option.id !== roulette.winnerId);
    }
    let availableOptions = displayOptions;
    if (!roulette.allowRepeats) {
      const unusedOptions = availableOptions.filter((option) => !usedWinnerIds.includes(option.id));
      if (unusedOptions.length) availableOptions = unusedOptions;
      else usedWinnerIds = [];
    }
    if (availableOptions.length < 1) return;

    const randomValues = new Uint32Array(2);
    crypto.getRandomValues(randomValues);
    const selected = availableOptions[(randomValues[0] ?? 0) % availableOptions.length];
    if (!selected) return;
    const selectedIndex = displayOptions.findIndex((option) => option.id === selected.id);
    const center = (360 / displayOptions.length) * (selectedIndex + 0.5);
    const current = ((roulette.rotation % 360) + 360) % 360;
    const rotation =
      roulette.rotation +
      360 * (6 + ((randomValues[1] ?? 0) % 3)) +
      ((360 - center - current + 360) % 360);
    const spinDuration = roulette.spinDuration;

    const updateRoulette = (nextRoulette: typeof roulette): void => {
      if (liveItem.value?.id !== item.id) return;
      liveItem.value = {
        ...liveItem.value,
        frames: liveItem.value.frames.map((currentFrame, index) =>
          index === frameIndex ? { ...currentFrame, roulette: nextRoulette } : currentFrame,
        ),
      };
      projectCurrentFrame();
    };

    updateRoulette({
      ...roulette,
      options: displayOptions,
      rotation,
      winnerId: '',
      pendingWinnerId: selected.id,
      spinning: true,
      spinStartedAt: Date.now(),
      usedWinnerIds,
    });
    if (roulette.timedSpin) {
      window.setTimeout(() => {
        const currentRoulette = liveItem.value?.frames[frameIndex]?.roulette;
        if (!currentRoulette || currentRoulette.rotation !== rotation || !currentRoulette.spinning)
          return;
        stopLiveRoulette();
      }, spinDuration);
    }
  }

  function stopLiveRoulette(): void {
    const item = liveItem.value;
    const frameIndex = liveFrameIndex.value;
    const roulette = item?.frames[frameIndex]?.roulette;
    if (!item || !roulette || !roulette.spinning) return;
    const winner = roulette.options.find((option) => option.id === roulette.pendingWinnerId);
    liveItem.value = {
      ...item,
      frames: item.frames.map((frame, index) =>
        index === frameIndex
          ? {
              ...frame,
              roulette: {
                ...roulette,
                winnerId: roulette.pendingWinnerId,
                pendingWinnerId: '',
                spinning: false,
                spinStartedAt: 0,
                usedWinnerIds: roulette.pendingWinnerId
                  ? [...roulette.usedWinnerIds, roulette.pendingWinnerId]
                  : roulette.usedWinnerIds,
              },
            }
          : frame,
      ),
    };
    projectCurrentFrame();
    if (winner) {
      liveRouletteResults.value = [
        {
          id: crypto.randomUUID(),
          rouletteId: roulette.id,
          rouletteTitle: roulette.title,
          optionId: winner.id,
          label: winner.label,
          color: winner.color,
          createdAt: new Date().toISOString(),
        },
        ...liveRouletteResults.value,
      ];
      persistLiveRouletteResults();
    }
  }

  function setLiveRouletteDuration(duration: number): void {
    const item = liveItem.value;
    const frameIndex = liveFrameIndex.value;
    const roulette = item?.frames[frameIndex]?.roulette;
    if (!item || !roulette || roulette.spinning || !Number.isFinite(duration)) return;
    liveItem.value = {
      ...item,
      frames: item.frames.map((frame, index) =>
        index === frameIndex
          ? {
              ...frame,
              roulette: {
                ...roulette,
                spinDuration: Math.min(600_000, Math.max(1_000, duration)),
              },
            }
          : frame,
      ),
    };
    projectCurrentFrame();
  }

  function setLiveRouletteTimed(timedSpin: boolean): void {
    const item = liveItem.value;
    const frameIndex = liveFrameIndex.value;
    const roulette = item?.frames[frameIndex]?.roulette;
    if (!item || !roulette || roulette.spinning) return;
    liveItem.value = {
      ...item,
      frames: item.frames.map((frame, index) =>
        index === frameIndex ? { ...frame, roulette: { ...roulette, timedSpin } } : frame,
      ),
    };
    projectCurrentFrame();
  }

  function resetLiveRoulette(): void {
    const item = liveItem.value;
    const frameIndex = liveFrameIndex.value;
    const roulette = item?.frames[frameIndex]?.roulette;
    if (!item || !roulette) return;
    liveItem.value = {
      ...item,
      frames: item.frames.map((frame, index) =>
        index === frameIndex
          ? {
              ...frame,
              roulette: {
                ...roulette,
                rotation: 0,
                winnerId: '',
                pendingWinnerId: '',
                spinning: false,
                spinStartedAt: 0,
                usedWinnerIds: [],
              },
            }
          : frame,
      ),
    };
    projectCurrentFrame();
  }

  function removeLiveRouletteResult(resultId: string): void {
    liveRouletteResults.value = liveRouletteResults.value.filter(
      (result) => result.id !== resultId,
    );
    persistLiveRouletteResults();
  }

  function clearLiveRouletteResults(rouletteId: string): void {
    liveRouletteResults.value = liveRouletteResults.value.filter(
      (result) => result.rouletteId !== rouletteId,
    );
    persistLiveRouletteResults();
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
    liveRouletteResults,
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
    spinLiveRoulette,
    stopLiveRoulette,
    setLiveRouletteDuration,
    setLiveRouletteTimed,
    resetLiveRoulette,
    removeLiveRouletteResult,
    clearLiveRouletteResults,
    controlLiveMedia,
    setLiveMediaPlaying,
    updateLiveMediaDuration,
    updateLiveMediaTime,
    clearLive,
  };
});
