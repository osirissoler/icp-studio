import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { WorkspacePanelId } from '../shared/workspace';

const STORAGE_KEY = 'icp-studio-workspace-settings';

interface StoredWorkspaceSettings {
  visiblePanels?: Partial<Record<WorkspacePanelId, boolean>>;
  panelOrder?: WorkspacePanelId[];
  stackedTopPercent?: number;
}

interface LoadedWorkspaceSettings {
  visiblePanels: Record<WorkspacePanelId, boolean>;
  panelOrder: WorkspacePanelId[];
  stackedTopPercent: number;
}

const defaultVisibility: Record<WorkspacePanelId, boolean> = {
  search: true,
  upcomingActivities: true,
  preview: true,
  service: true,
  live: true,
  monitors: true,
};

const defaultPanelOrder: WorkspacePanelId[] = [
  'search',
  'upcomingActivities',
  'preview',
  'service',
  'live',
  'monitors',
];

function normalizePanelOrder(value: unknown): WorkspacePanelId[] {
  if (!Array.isArray(value)) return [...defaultPanelOrder];

  const validIds = new Set<WorkspacePanelId>(defaultPanelOrder);
  const storedIds = value.filter(
    (item): item is WorkspacePanelId =>
      typeof item === 'string' && validIds.has(item as WorkspacePanelId),
  );
  const uniqueIds = [...new Set(storedIds)];

  if (!uniqueIds.includes('upcomingActivities')) {
    const withoutSearch = uniqueIds.filter((id) => id !== 'search');
    return [
      'search',
      'upcomingActivities',
      'preview',
      ...withoutSearch.filter((id) => id !== 'preview'),
    ];
  }

  if (
    uniqueIds[0] === 'preview' &&
    uniqueIds[1] === 'search' &&
    uniqueIds[2] === 'upcomingActivities'
  ) {
    return [
      'search',
      'upcomingActivities',
      'preview',
      ...uniqueIds.filter(
        (id) => id !== 'search' && id !== 'upcomingActivities' && id !== 'preview',
      ),
    ];
  }

  return [...uniqueIds, ...defaultPanelOrder.filter((id) => !uniqueIds.includes(id))];
}

function loadSettings(): LoadedWorkspaceSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error('No stored workspace settings');

    const parsed = JSON.parse(stored) as StoredWorkspaceSettings;
    return {
      visiblePanels: { ...defaultVisibility, ...parsed.visiblePanels },
      panelOrder: normalizePanelOrder(parsed.panelOrder),
      stackedTopPercent:
        typeof parsed.stackedTopPercent === 'number'
          ? Math.min(80, Math.max(55, parsed.stackedTopPercent))
          : 70,
    };
  } catch {
    return {
      visiblePanels: { ...defaultVisibility },
      panelOrder: [...defaultPanelOrder],
      stackedTopPercent: 70,
    };
  }
}

export const useWorkspaceSettingsStore = defineStore('workspace-settings', () => {
  const initialSettings = loadSettings();
  const visiblePanels = reactive(initialSettings.visiblePanels);
  const panelOrder = ref<WorkspacePanelId[]>(initialSettings.panelOrder);
  const stackedTopPercent = ref(initialSettings.stackedTopPercent);

  function save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        visiblePanels,
        panelOrder: panelOrder.value,
        stackedTopPercent: stackedTopPercent.value,
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

  function setStackedTopPercent(percent: number): void {
    stackedTopPercent.value = Math.min(80, Math.max(55, percent));
    save();
  }

  function resetWorkspace(): void {
    Object.assign(visiblePanels, defaultVisibility);
    panelOrder.value = [...defaultPanelOrder];
    stackedTopPercent.value = 70;
    save();
  }

  return {
    visiblePanels,
    panelOrder,
    stackedTopPercent,
    isVisible,
    setPanelVisible,
    movePanel,
    setStackedTopPercent,
    resetWorkspace,
  };
});
