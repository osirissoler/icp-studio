import { computed, ref } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import type { ActiveProjectionOutput } from '../shared/display';
import type { ServicePresentationItem } from '../shared/presentation';
import type {
  MediaPlaybackCommand,
  ProjectionOutputTarget,
  ProjectionState,
} from '../shared/projection';
import { usePresentationStore } from './presentation-store';

interface ProjectionWorkspaceSnapshot {
  serviceItems: ServicePresentationItem[];
  selectedServiceItemId: string | null;
  liveItem: ServicePresentationItem | null;
  liveFrameIndex: number;
  mediaPlayback: {
    isPlaying: boolean;
    time: number;
    duration: number;
  };
  mediaCommand: MediaPlaybackCommand;
  mediaCommandSequence: number;
}

function emptyWorkspace(): ProjectionWorkspaceSnapshot {
  return {
    serviceItems: [],
    selectedServiceItemId: null,
    liveItem: null,
    liveFrameIndex: 0,
    mediaPlayback: { isPlaying: false, time: 0, duration: 0 },
    mediaCommand: { action: 'pause', time: 0 },
    mediaCommandSequence: 0,
  };
}

function projectionStateForFrame(
  item: ServicePresentationItem,
  frameIndex: number,
): ProjectionState | null {
  const frame = item.frames[frameIndex];
  if (!frame) return null;

  if (item.type === 'activity' && frame.activity) {
    return { mode: 'activity', ...frame.activity };
  }

  if (item.type === 'game' && frame.roulette) {
    return {
      mode: 'roulette',
      ...frame.roulette,
      options: frame.roulette.options.map((option) => ({ ...option })),
      usedWinnerIds: [...frame.roulette.usedWinnerIds],
    };
  }

  if (item.type === 'time-tool' && frame.timeTool) {
    return { mode: 'time-tool', tool: { ...frame.timeTool } };
  }

  if (frame.mediaType && frame.mediaUrl) {
    if (frame.mediaType === 'document') {
      if (!frame.documentFormat) return null;
      return {
        mode: 'document',
        url: frame.mediaUrl,
        name: item.title,
        format: frame.documentFormat,
        pageIndex: frame.pageIndex ?? 0,
      };
    }

    return {
      mode: 'media',
      mediaType: frame.mediaType,
      url: frame.mediaUrl,
      name: item.title,
    };
  }

  return {
    mode: 'content',
    title: '',
    body: frame.text,
    footer: item.footer,
  };
}

export const useProjectionWorkspaceStore = defineStore('projection-workspaces', () => {
  const activeOutputId = ref<ProjectionOutputTarget>(null);
  const independentProjectionEnabled = ref(false);
  const outputs = ref<ActiveProjectionOutput[]>([]);
  const snapshots = ref<Record<string, ProjectionWorkspaceSnapshot>>({});

  const activeOutput = computed(() =>
    activeOutputId.value === null
      ? null
      : outputs.value.find((output) => output.outputId === activeOutputId.value) ?? null,
  );

  function captureCurrentWorkspace(): ProjectionWorkspaceSnapshot {
    const presentationStore = usePresentationStore();
    const {
      serviceItems,
      selectedServiceItemId,
      liveItem,
      liveFrameIndex,
      mediaPlayback,
      mediaCommand,
      mediaCommandSequence,
    } = storeToRefs(presentationStore);

    return {
      serviceItems: [...serviceItems.value],
      selectedServiceItemId: selectedServiceItemId.value,
      liveItem: liveItem.value,
      liveFrameIndex: liveFrameIndex.value,
      mediaPlayback: { ...mediaPlayback.value },
      mediaCommand: { ...mediaCommand.value },
      mediaCommandSequence: mediaCommandSequence.value,
    };
  }

  function saveCurrentWorkspace(): void {
    if (activeOutputId.value === null) return;
    snapshots.value = {
      ...snapshots.value,
      [activeOutputId.value]: captureCurrentWorkspace(),
    };
  }

  function restoreWorkspace(snapshot: ProjectionWorkspaceSnapshot): void {
    const presentationStore = usePresentationStore();
    const {
      serviceItems,
      selectedServiceItemId,
      liveItem,
      liveFrameIndex,
      mediaPlayback,
      mediaCommand,
      mediaCommandSequence,
    } = storeToRefs(presentationStore);

    serviceItems.value = [...snapshot.serviceItems];
    selectedServiceItemId.value = snapshot.selectedServiceItemId;
    liveItem.value = snapshot.liveItem;
    liveFrameIndex.value = snapshot.liveFrameIndex;
    mediaPlayback.value = { ...snapshot.mediaPlayback };
    mediaCommand.value = { ...snapshot.mediaCommand };
    mediaCommandSequence.value = snapshot.mediaCommandSequence + 1;
  }

  function switchWorkspace(outputId: ProjectionOutputTarget): void {
    if (!independentProjectionEnabled.value) {
      activeOutputId.value = null;
      window.icpStudio?.projection.setTargetOutput(null);
      return;
    }

    if (outputId === null || !outputs.value.some((output) => output.outputId === outputId)) {
      return;
    }

    if (activeOutputId.value === outputId) {
      window.icpStudio?.projection.setTargetOutput(outputId);
      return;
    }

    saveCurrentWorkspace();
    activeOutputId.value = outputId;
    window.icpStudio?.projection.setTargetOutput(outputId);
    restoreWorkspace(snapshots.value[outputId] ?? emptyWorkspace());
  }

  function applyDisplayState(enabled: boolean, activeOutputs: ActiveProjectionOutput[]): void {
    independentProjectionEnabled.value = enabled;
    outputs.value = activeOutputs;

    const validIds = new Set(activeOutputs.map((output) => output.outputId));
    snapshots.value = Object.fromEntries(
      Object.entries(snapshots.value).filter(([outputId]) => validIds.has(outputId)),
    );

    if (!enabled || activeOutputs.length === 0) {
      saveCurrentWorkspace();
      activeOutputId.value = null;
      window.icpStudio?.projection.setTargetOutput(null);
      return;
    }

    const currentIsValid =
      activeOutputId.value !== null && validIds.has(activeOutputId.value);
    const nextOutputId = currentIsValid ? activeOutputId.value : activeOutputs[0]?.outputId ?? null;

    if (nextOutputId !== null) {
      switchWorkspace(nextOutputId);
    }
  }

  function workspaceSnapshot(outputId: string): ProjectionWorkspaceSnapshot {
    if (activeOutputId.value === outputId) {
      return captureCurrentWorkspace();
    }
    return snapshots.value[outputId] ?? emptyWorkspace();
  }

  function setWorkspaceLiveFrame(outputId: string, frameIndex: number): void {
    if (!outputs.value.some((output) => output.outputId === outputId)) return;

    if (activeOutputId.value === outputId) {
      usePresentationStore().setLiveFrame(frameIndex);
      saveCurrentWorkspace();
      return;
    }

    const current = snapshots.value[outputId];
    const item = current?.liveItem;
    if (!current || !item || !item.frames[frameIndex]) return;

    const state = projectionStateForFrame(item, frameIndex);
    if (!state) return;

    snapshots.value = {
      ...snapshots.value,
      [outputId]: {
        ...current,
        liveFrameIndex: frameIndex,
        mediaPlayback: { isPlaying: false, time: 0, duration: 0 },
        mediaCommand: { action: 'pause', time: 0 },
        mediaCommandSequence: current.mediaCommandSequence + 1,
      },
    };

    const restoreTarget = activeOutputId.value;
    window.icpStudio?.projection.setTargetOutput(outputId);
    window.icpStudio?.projection.setState(state);
    window.icpStudio?.projection.setTargetOutput(restoreTarget);
  }

  function moveWorkspaceLiveFrame(outputId: string, direction: -1 | 1): void {
    const snapshot = workspaceSnapshot(outputId);
    const item = snapshot.liveItem;
    if (!item || item.frames.length === 0) return;

    const nextIndex = Math.min(
      item.frames.length - 1,
      Math.max(0, snapshot.liveFrameIndex + direction),
    );

    if (nextIndex === snapshot.liveFrameIndex) return;
    setWorkspaceLiveFrame(outputId, nextIndex);
  }

  return {
    activeOutputId,
    activeOutput,
    independentProjectionEnabled,
    outputs,
    applyDisplayState,
    switchWorkspace,
    saveCurrentWorkspace,
    workspaceSnapshot,
    setWorkspaceLiveFrame,
    moveWorkspaceLiveFrame,
  };
});
