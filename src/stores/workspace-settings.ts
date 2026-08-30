import { reactive } from 'vue';
import { defineStore } from 'pinia';
import type { WorkspacePanelId } from '../shared/workspace';

const STORAGE_KEY = 'icp-studio-workspace-settings';

interface StoredWorkspaceSettings {
  visiblePanels?: Partial<Record<WorkspacePanelId, boolean>>;
}

const defaultVisibility: Record<WorkspacePanelId, boolean> = {
  search: true,
  preview: true,
  service: true,
  live: true,
  monitors: true,
};

function loadVisibility(): Record<WorkspacePanelId, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultVisibility };
    const parsed = JSON.parse(stored) as StoredWorkspaceSettings;
    return { ...defaultVisibility, ...parsed.visiblePanels };
  } catch {
    return { ...defaultVisibility };
  }
}

export const useWorkspaceSettingsStore = defineStore(
  'workspace-settings',
  () => {
    const visiblePanels = reactive(loadVisibility());

    function save(): void {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ visiblePanels }),
      );
    }

    function isVisible(panelId: WorkspacePanelId): boolean {
      return visiblePanels[panelId];
    }

    function setPanelVisible(
      panelId: WorkspacePanelId,
      visible: boolean,
    ): void {
      if (
        !visible &&
        Object.values(visiblePanels).filter(Boolean).length <= 1
      ) {
        return;
      }

      visiblePanels[panelId] = visible;
      save();
    }

    function resetWorkspace(): void {
      Object.assign(visiblePanels, defaultVisibility);
      save();
    }

    return {
      visiblePanels,
      isVisible,
      setPanelVisible,
      resetWorkspace,
    };
  },
);
