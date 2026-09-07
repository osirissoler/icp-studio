import { computed, ref } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import type { ActiveProjectionOutput } from '../shared/display';
import type { ServicePresentationItem } from '../shared/presentation';
import type {
  MediaPlaybackCommand,
  ProjectionOutputTarget,
  ProjectionState,
} from '../shared/projection';
import { currentTimeToolValue } from '../shared/time-tool';
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
  const timeToolTimers = new Map<string, number>();
  const rouletteTimers = new Map<string, number>();

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

  function withProjectionTarget(outputId: string, action: () => void): void {
    const restoreTarget = activeOutputId.value;
    window.icpStudio?.projection.setTargetOutput(outputId);
    action();
    window.icpStudio?.projection.setTargetOutput(restoreTarget);
  }

  function projectSnapshot(outputId: string, snapshot: ProjectionWorkspaceSnapshot): void {
    const item = snapshot.liveItem;
    if (!item) {
      withProjectionTarget(outputId, () => {
        window.icpStudio?.projection.setState({ mode: 'blank' });
      });
      return;
    }

    const state = projectionStateForFrame(item, snapshot.liveFrameIndex);
    if (!state) return;
    withProjectionTarget(outputId, () => {
      window.icpStudio?.projection.setState(state);
    });
  }

  function replaceSnapshot(outputId: string, snapshot: ProjectionWorkspaceSnapshot): void {
    snapshots.value = { ...snapshots.value, [outputId]: snapshot };
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

    const next = {
      ...current,
      liveFrameIndex: frameIndex,
      mediaPlayback: { isPlaying: false, time: 0, duration: 0 },
      mediaCommand: { action: 'pause', time: 0 } as MediaPlaybackCommand,
      mediaCommandSequence: current.mediaCommandSequence + 1,
    };
    replaceSnapshot(outputId, next);
    projectSnapshot(outputId, next);
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

  function clearWorkspaceLive(outputId: string): void {
    if (activeOutputId.value === outputId) {
      usePresentationStore().clearLive();
      saveCurrentWorkspace();
      return;
    }
    const current = snapshots.value[outputId];
    if (!current) return;
    const next = {
      ...current,
      liveItem: null,
      liveFrameIndex: 0,
      mediaPlayback: { isPlaying: false, time: 0, duration: 0 },
      mediaCommand: { action: 'pause', time: 0 } as MediaPlaybackCommand,
      mediaCommandSequence: current.mediaCommandSequence + 1,
    };
    replaceSnapshot(outputId, next);
    projectSnapshot(outputId, next);
  }

  function controlWorkspaceMedia(outputId: string, command: MediaPlaybackCommand): void {
    if (activeOutputId.value === outputId) {
      usePresentationStore().controlLiveMedia(command);
      saveCurrentWorkspace();
      return;
    }
    const current = snapshots.value[outputId];
    if (!current) return;
    const next = {
      ...current,
      mediaPlayback: {
        ...current.mediaPlayback,
        isPlaying:
          command.action === 'play'
            ? true
            : command.action === 'pause'
              ? false
              : current.mediaPlayback.isPlaying,
        time: typeof command.time === 'number' ? Math.max(0, command.time) : current.mediaPlayback.time,
      },
      mediaCommand: command,
      mediaCommandSequence: current.mediaCommandSequence + 1,
    };
    replaceSnapshot(outputId, next);
    withProjectionTarget(outputId, () => {
      window.icpStudio?.projection.controlMedia(command);
    });
  }

  function updateWorkspaceLiveItem(
    outputId: string,
    updateFrame: (
      frame: ServicePresentationItem['frames'][number],
    ) => ServicePresentationItem['frames'][number],
  ): ProjectionWorkspaceSnapshot | null {
    const current = workspaceSnapshot(outputId);
    const item = current.liveItem;
    const frame = item?.frames[current.liveFrameIndex];
    if (!item || !frame) return null;
    const nextItem = {
      ...item,
      frames: item.frames.map((currentFrame, index) =>
        index === current.liveFrameIndex ? updateFrame(currentFrame) : currentFrame,
      ),
    };
    const next = { ...current, liveItem: nextItem };

    if (activeOutputId.value === outputId) {
      const presentationStore = usePresentationStore();
      const { liveItem } = storeToRefs(presentationStore);
      liveItem.value = nextItem;
      saveCurrentWorkspace();
    } else {
      replaceSnapshot(outputId, next);
    }
    projectSnapshot(outputId, next);
    return next;
  }

  function setWorkspaceRouletteTimed(outputId: string, timedSpin: boolean): void {
    const frame = workspaceSnapshot(outputId).liveItem?.frames[workspaceSnapshot(outputId).liveFrameIndex];
    if (!frame?.roulette || frame.roulette.spinning) return;
    updateWorkspaceLiveItem(outputId, (currentFrame) => ({
      ...currentFrame,
      roulette: currentFrame.roulette ? { ...currentFrame.roulette, timedSpin } : currentFrame.roulette,
    }));
  }

  function setWorkspaceRouletteDuration(outputId: string, duration: number): void {
    if (!Number.isFinite(duration)) return;
    const snapshot = workspaceSnapshot(outputId);
    const roulette = snapshot.liveItem?.frames[snapshot.liveFrameIndex]?.roulette;
    if (!roulette || roulette.spinning) return;
    updateWorkspaceLiveItem(outputId, (currentFrame) => ({
      ...currentFrame,
      roulette: currentFrame.roulette
        ? { ...currentFrame.roulette, spinDuration: Math.min(600_000, Math.max(1_000, duration)) }
        : currentFrame.roulette,
    }));
  }

  function stopWorkspaceRoulette(outputId: string): void {
    const snapshot = workspaceSnapshot(outputId);
    const roulette = snapshot.liveItem?.frames[snapshot.liveFrameIndex]?.roulette;
    if (!roulette || !roulette.spinning) return;
    const timer = rouletteTimers.get(outputId);
    if (timer !== undefined) window.clearTimeout(timer);
    rouletteTimers.delete(outputId);
    updateWorkspaceLiveItem(outputId, (currentFrame) => {
      if (!currentFrame.roulette) return currentFrame;
      const currentRoulette = currentFrame.roulette;
      return {
        ...currentFrame,
        roulette: {
          ...currentRoulette,
          winnerId: currentRoulette.pendingWinnerId,
          pendingWinnerId: '',
          spinning: false,
          spinStartedAt: 0,
          usedWinnerIds: currentRoulette.pendingWinnerId
            ? [...currentRoulette.usedWinnerIds, currentRoulette.pendingWinnerId]
            : currentRoulette.usedWinnerIds,
        },
      };
    });
  }

  function spinWorkspaceRoulette(outputId: string): void {
    const snapshot = workspaceSnapshot(outputId);
    const roulette = snapshot.liveItem?.frames[snapshot.liveFrameIndex]?.roulette;
    if (!roulette || roulette.spinning || roulette.options.length < 2) return;

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
    const currentRotation = ((roulette.rotation % 360) + 360) % 360;
    const cruiseTurns = roulette.timedSpin
      ? Math.max(6, Math.ceil(Math.max(0, roulette.spinDuration - 2000) / 650) + 2)
      : 8;
    const rotation =
      roulette.rotation +
      360 * (cruiseTurns + ((randomValues[1] ?? 0) % 3)) +
      ((360 - center - currentRotation + 360) % 360);

    updateWorkspaceLiveItem(outputId, (currentFrame) => ({
      ...currentFrame,
      roulette: currentFrame.roulette
        ? {
            ...currentFrame.roulette,
            options: displayOptions,
            rotation,
            winnerId: '',
            pendingWinnerId: selected.id,
            spinning: true,
            spinStartedAt: Date.now(),
            usedWinnerIds,
          }
        : currentFrame.roulette,
    }));

    if (roulette.timedSpin) {
      const previous = rouletteTimers.get(outputId);
      if (previous !== undefined) window.clearTimeout(previous);
      rouletteTimers.set(
        outputId,
        window.setTimeout(() => {
          rouletteTimers.delete(outputId);
          stopWorkspaceRoulette(outputId);
        }, roulette.spinDuration),
      );
    }
  }

  function resetWorkspaceRoulette(outputId: string): void {
    const timer = rouletteTimers.get(outputId);
    if (timer !== undefined) window.clearTimeout(timer);
    rouletteTimers.delete(outputId);
    updateWorkspaceLiveItem(outputId, (currentFrame) => ({
      ...currentFrame,
      roulette: currentFrame.roulette
        ? {
            ...currentFrame.roulette,
            rotation: 0,
            winnerId: '',
            pendingWinnerId: '',
            spinning: false,
            spinStartedAt: 0,
            usedWinnerIds: [],
          }
        : currentFrame.roulette,
    }));
  }

  function scheduleWorkspaceTimeToolFinish(outputId: string): void {
    const existing = timeToolTimers.get(outputId);
    if (existing !== undefined) window.clearTimeout(existing);
    timeToolTimers.delete(outputId);
    const snapshot = workspaceSnapshot(outputId);
    const tool = snapshot.liveItem?.frames[snapshot.liveFrameIndex]?.timeTool;
    if (!tool || tool.mode !== 'timer' || !tool.running) return;
    const remaining = currentTimeToolValue(tool);
    timeToolTimers.set(
      outputId,
      window.setTimeout(() => {
        timeToolTimers.delete(outputId);
        updateWorkspaceLiveItem(outputId, (currentFrame) => ({
          ...currentFrame,
          timeTool: currentFrame.timeTool
            ? { ...currentFrame.timeTool, baseTimeMs: 0, startedAt: 0, running: false, completed: true }
            : currentFrame.timeTool,
        }));
      }, Math.max(0, remaining)),
    );
  }

  function startWorkspaceTimeTool(outputId: string): void {
    const snapshot = workspaceSnapshot(outputId);
    const tool = snapshot.liveItem?.frames[snapshot.liveFrameIndex]?.timeTool;
    if (!tool || tool.mode === 'clock' || tool.running) return;
    const baseTimeMs = tool.mode === 'timer' && tool.baseTimeMs <= 0 ? tool.durationMs : tool.baseTimeMs;
    if (tool.mode === 'timer' && baseTimeMs <= 0) return;
    updateWorkspaceLiveItem(outputId, (currentFrame) => ({
      ...currentFrame,
      timeTool: currentFrame.timeTool
        ? { ...currentFrame.timeTool, baseTimeMs, startedAt: Date.now(), running: true, completed: false }
        : currentFrame.timeTool,
    }));
    scheduleWorkspaceTimeToolFinish(outputId);
  }

  function pauseWorkspaceTimeTool(outputId: string): void {
    const snapshot = workspaceSnapshot(outputId);
    const tool = snapshot.liveItem?.frames[snapshot.liveFrameIndex]?.timeTool;
    if (!tool || tool.mode === 'clock' || !tool.running) return;
    const value = currentTimeToolValue(tool);
    const timer = timeToolTimers.get(outputId);
    if (timer !== undefined) window.clearTimeout(timer);
    timeToolTimers.delete(outputId);
    updateWorkspaceLiveItem(outputId, (currentFrame) => ({
      ...currentFrame,
      timeTool: currentFrame.timeTool
        ? {
            ...currentFrame.timeTool,
            baseTimeMs: value,
            startedAt: 0,
            running: false,
            completed: currentFrame.timeTool.mode === 'timer' && value <= 0,
          }
        : currentFrame.timeTool,
    }));
  }

  function resetWorkspaceTimeTool(outputId: string): void {
    const snapshot = workspaceSnapshot(outputId);
    const tool = snapshot.liveItem?.frames[snapshot.liveFrameIndex]?.timeTool;
    if (!tool || tool.mode === 'clock') return;
    const timer = timeToolTimers.get(outputId);
    if (timer !== undefined) window.clearTimeout(timer);
    timeToolTimers.delete(outputId);
    updateWorkspaceLiveItem(outputId, (currentFrame) => ({
      ...currentFrame,
      timeTool: currentFrame.timeTool
        ? {
            ...currentFrame.timeTool,
            baseTimeMs: currentFrame.timeTool.mode === 'timer' ? currentFrame.timeTool.durationMs : 0,
            startedAt: 0,
            running: false,
            completed: false,
          }
        : currentFrame.timeTool,
    }));
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
    clearWorkspaceLive,
    controlWorkspaceMedia,
    setWorkspaceRouletteTimed,
    setWorkspaceRouletteDuration,
    spinWorkspaceRoulette,
    stopWorkspaceRoulette,
    resetWorkspaceRoulette,
    startWorkspaceTimeTool,
    pauseWorkspaceTimeTool,
    resetWorkspaceTimeTool,
  };
});