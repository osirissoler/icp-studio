import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { StackedColumnPosition, WorkspacePanelId } from '../shared/workspace';

const STORAGE_KEY = 'icp-studio-workspace-settings';

interface StoredWorkspaceSettings {
  visiblePanels?: Partial<Record<WorkspacePanelId, boolean>>;
  panelOrder?: WorkspacePanelId[];
  stackedColumnPosition?: StackedColumnPosition;
}

interface LoadedWorkspaceSettings {
  visiblePanels: Record<WorkspacePanelId, boolean>;
  panelOrder: WorkspacePanelId[];
  stackedColumnPosition: StackedColumnPosition;
}

const defaultVisibility: Record<WorkspacePanelId, boolean> = {
  search: true,
  preview: true,
  service: true,
  live: true,
  monitors: true,
};

const defaultPanelOrder: WorkspacePanelId[] = ['search', 'preview', 'service', 'live', 'monitors'];

function normalizePanelOrder(value: unknown): WorkspacePanelId[] {
  if (!Array.isArray(value)) return [...defaultPanelOrder];

  const validIds = new Set<WorkspacePanelId>(defaultPanelOrder);
  const storedIds = value.filter(
    (item): item is WorkspacePanelId =>
      typeof item === 'string' && validIds.has(item as WorkspacePanelId),
  );
  const uniqueIds = [...new Set(storedIds)];

  return [...uniqueIds, ...defaultPanelOrder.filter((id) => !uniqueIds.includes(id))];
}

function loadSettings(): LoadedWorkspaceSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error('No stored workspace settings');

    const parsed = JSON.parse(stored) as StoredWorkspaceSettings;
    const stackedColumnPosition: StackedColumnPosition =
      parsed.stackedColumnPosition === 'start' || parsed.stackedColumnPosition === 'end'
        ? parsed.stackedColumnPosition
        : 'center';

    return {
      visiblePanels: { ...defaultVisibility, ...parsed.visiblePanels },
      panelOrder: normalizePanelOrder(parsed.panelOrder),
      stackedColumnPosition,
    };
  } catch {
    return {
      visiblePanels: { ...defaultVisibility },
      panelOrder: [...defaultPanelOrder],
      stackedColumnPosition: 'center',
    };
  }
}

export const useWorkspaceSettingsStore = defineStore('workspace-settings', () => {
  const initialSettings = loadSettings();
  const visiblePanels = reactive(initialSettings.visiblePanels);
  const panelOrder = ref<WorkspacePanelId[]>(initialSettings.panelOrder);
  const stackedColumnPosition = ref<StackedColumnPosition>(initialSettings.stackedColumnPosition);

  function save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        visiblePanels,
        panelOrder: panelOrder.value,
        stackedColumnPosition: stackedColumnPosition.value,
      }),
    );
  }

  function isVisible(panelId: WorkspacePanelId): boolean {
    return visiblePanels[panelId];
  }

  function setPanelVisible(panelId: WorkspacePanelId, visible: boolean): void {
    if (!visible && Object.values(visiblePanels).filter(Boolean).length <= 1) return;

    visiblePanels[panelId] = visible;
    save();
  }

  function movePanel(sourceId: WorkspacePanelId, targetId: WorkspacePanelId): void {
    if (sourceId === targetId) return;

    const nextOrder = [...panelOrder.value];
    const sourceIndex = nextOrder.indexOf(sourceId);
    const targetIndex = nextOrder.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [movedPanel] = nextOrder.splice(sourceIndex, 1);
    if (!movedPanel) return;

    nextOrder.splice(targetIndex, 0, movedPanel);
    panelOrder.value = nextOrder;
    save();
  }

  function setStackedColumnPosition(position: StackedColumnPosition): void {
    stackedColumnPosition.value = position;
    save();
  }

  function resetWorkspace(): void {
    Object.assign(visiblePanels, defaultVisibility);
    panelOrder.value = [...defaultPanelOrder];
    stackedColumnPosition.value = 'center';
    save();
  }

  return {
    visiblePanels,
    panelOrder,
    stackedColumnPosition,
    isVisible,
    setPanelVisible,
    movePanel,
    setStackedColumnPosition,
    resetWorkspace,
  };
});
