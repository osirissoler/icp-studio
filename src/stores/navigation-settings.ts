import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  MAIN_NAVIGATION_ITEMS,
  type MenuSide,
  type NavigationItemId,
  type ToolbarPosition,
} from '../shared/navigation';

const STORAGE_KEY = 'icp-studio:navigation-settings:v1';
const defaultOrder = MAIN_NAVIGATION_ITEMS.map((item) => item.id);

interface StoredNavigationSettings {
  order?: NavigationItemId[];
  side?: MenuSide;
  collapsed?: boolean;
  toolbarPosition?: ToolbarPosition;
}

function normalizeOrder(value: unknown): NavigationItemId[] {
  if (!Array.isArray(value)) {
    return [...defaultOrder];
  }

  const validIds = new Set<NavigationItemId>(defaultOrder);
  const storedIds = value.filter(
    (item): item is NavigationItemId =>
      typeof item === 'string' && validIds.has(item as NavigationItemId),
  );
  const uniqueIds = [...new Set(storedIds)];

  return [...uniqueIds, ...defaultOrder.filter((id) => !uniqueIds.includes(id))];
}

function loadSettings(): Required<StoredNavigationSettings> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      throw new Error('No stored navigation settings');
    }

    const parsed = JSON.parse(stored) as StoredNavigationSettings;

    return {
      order: normalizeOrder(parsed.order),
      side: parsed.side === 'right' ? 'right' : 'left',
      collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : true,
      toolbarPosition: parsed.toolbarPosition === 'bottom' ? 'bottom' : 'top',
    };
  } catch {
    return { order: [...defaultOrder], side: 'left', collapsed: true, toolbarPosition: 'top' };
  }
}

export const useNavigationSettingsStore = defineStore('navigation-settings', () => {
  const initialSettings = loadSettings();
  const order = ref<NavigationItemId[]>(initialSettings.order);
  const side = ref<MenuSide>(initialSettings.side);
  const collapsed = ref(initialSettings.collapsed);
  const toolbarPosition = ref<ToolbarPosition>(initialSettings.toolbarPosition);

  const orderedItems = computed(() =>
    order.value
      .map((id) => MAIN_NAVIGATION_ITEMS.find((item) => item.id === id))
      .filter((item): item is (typeof MAIN_NAVIGATION_ITEMS)[number] => item !== undefined),
  );

  function save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        order: order.value,
        side: side.value,
        collapsed: collapsed.value,
        toolbarPosition: toolbarPosition.value,
      }),
    );
  }

  function moveItem(sourceId: NavigationItemId, targetId: NavigationItemId): void {
    if (sourceId === targetId) return;

    const nextOrder = [...order.value];
    const sourceIndex = nextOrder.indexOf(sourceId);
    const targetIndex = nextOrder.indexOf(targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const [movedItem] = nextOrder.splice(sourceIndex, 1);
    if (!movedItem) return;

    nextOrder.splice(targetIndex, 0, movedItem);
    order.value = nextOrder;
    save();
  }

  function setSide(nextSide: MenuSide): void {
    side.value = nextSide;
    save();
  }

  function setCollapsed(nextCollapsed: boolean): void {
    collapsed.value = nextCollapsed;
    save();
  }

  function toggleCollapsed(): void {
    setCollapsed(!collapsed.value);
  }

  function setToolbarPosition(position: ToolbarPosition): void {
    toolbarPosition.value = position;
    save();
  }

  function resetNavigation(): void {
    order.value = [...defaultOrder];
    side.value = 'left';
    collapsed.value = true;
    toolbarPosition.value = 'top';
    save();
  }

  return {
    order,
    side,
    collapsed,
    toolbarPosition,
    orderedItems,
    moveItem,
    setSide,
    setCollapsed,
    toggleCollapsed,
    setToolbarPosition,
    resetNavigation,
  };
});
