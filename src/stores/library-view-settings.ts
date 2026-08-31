import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type {
  LibraryViewMode,
  LibraryViewModule,
  LibraryViewSettings,
} from '../shared/library-view';

export const LIBRARY_VIEW_STORAGE_KEY = 'icp-studio:library-view-settings:v1';

const defaultViews: LibraryViewSettings = {
  song: 'list',
  audio: 'grid',
  image: 'grid',
  video: 'grid',
  document: 'list',
};

function isViewMode(value: unknown): value is LibraryViewMode {
  return value === 'grid' || value === 'list' || value === 'details';
}

function loadSettings(): LibraryViewSettings {
  try {
    const stored = window.localStorage.getItem(LIBRARY_VIEW_STORAGE_KEY);
    if (!stored) return { ...defaultViews };
    const parsed = JSON.parse(stored) as Partial<LibraryViewSettings>;
    return Object.fromEntries(
      Object.entries(defaultViews).map(([module, fallback]) => {
        const storedMode = parsed[module as LibraryViewModule];
        return [module, isViewMode(storedMode) ? storedMode : fallback];
      }),
    ) as LibraryViewSettings;
  } catch {
    return { ...defaultViews };
  }
}

export const useLibraryViewSettingsStore = defineStore('library-view-settings', () => {
  const views = ref<LibraryViewSettings>(loadSettings());

  const viewFor = computed(() => (module: LibraryViewModule) => views.value[module]);

  function save(): void {
    window.localStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, JSON.stringify(views.value));
  }

  function setView(module: LibraryViewModule, mode: LibraryViewMode): void {
    views.value = { ...views.value, [module]: mode };
    save();
  }

  function resetViews(): void {
    views.value = { ...defaultViews };
    save();
  }

  function reload(): void {
    views.value = loadSettings();
  }

  window.addEventListener('storage', (event) => {
    if (event.key === LIBRARY_VIEW_STORAGE_KEY) reload();
  });

  return { views, viewFor, setView, resetViews, reload };
});
