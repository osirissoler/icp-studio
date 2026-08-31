import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type {
  ActiveContentSettings,
  AudioVisualizerSettings,
  ProjectionTheme,
  StoredProjectionSettings,
} from '../shared/theme';

export const PROJECTION_SETTINGS_STORAGE_KEY = 'icp-studio:projection-settings:v1';

const defaultThemes: ProjectionTheme[] = [
  {
    id: 'midnight-blue',
    name: 'Azul nocturno',
    isBuiltin: true,
    backgroundType: 'gradient',
    backgroundColor: '#05070d',
    gradientColor: '#1d3d75',
    backgroundImageUrl: '',
    overlayOpacity: 0.18,
    textColor: '#d8e2f2',
    footerColor: '#aebed4',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: 600,
    fontScale: 1,
    horizontalAlign: 'center',
    verticalAlign: 'center',
  },
  {
    id: 'warm-sanctuary',
    name: 'Santuario cálido',
    isBuiltin: true,
    backgroundType: 'gradient',
    backgroundColor: '#160d08',
    gradientColor: '#70411f',
    backgroundImageUrl: '',
    overlayOpacity: 0.24,
    textColor: '#fff4df',
    footerColor: '#e4c8a3',
    fontFamily: 'Georgia, Times New Roman, serif',
    fontWeight: 600,
    fontScale: 1,
    horizontalAlign: 'center',
    verticalAlign: 'center',
  },
  {
    id: 'clean-dark',
    name: 'Oscuro limpio',
    isBuiltin: true,
    backgroundType: 'solid',
    backgroundColor: '#050505',
    gradientColor: '#202020',
    backgroundImageUrl: '',
    overlayOpacity: 0,
    textColor: '#ffffff',
    footerColor: '#b8b8b8',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: 700,
    fontScale: 1.08,
    horizontalAlign: 'center',
    verticalAlign: 'center',
  },
];

const defaultAudioVisualizer: AudioVisualizerSettings = {
  type: 'bars',
  inheritThemeColors: true,
  primaryColor: '#93c5fd',
  secondaryColor: '#2563eb',
  sensitivity: 1,
  showTitle: true,
};

const defaultActiveContent: ActiveContentSettings = {
  activeBackgroundColor: '#1f4f7a',
  activeBorderColor: '#60a5fa',
  activeTextColor: '#f8fbff',
  inactiveTextColor: '#94a3b8',
  fontSize: 11,
  visibleLines: 2,
};

function cloneDefaultThemes(): ProjectionTheme[] {
  return defaultThemes.map((theme) => ({ ...theme }));
}

function defaultSettings(): StoredProjectionSettings {
  return {
    themes: cloneDefaultThemes(),
    activeThemeId: defaultThemes[0]!.id,
    audioVisualizer: { ...defaultAudioVisualizer },
    activeContent: { ...defaultActiveContent },
  };
}

function isTheme(value: unknown): value is ProjectionTheme {
  if (typeof value !== 'object' || value === null) return false;
  const theme = value as Partial<ProjectionTheme>;
  return (
    typeof theme.id === 'string' &&
    typeof theme.name === 'string' &&
    typeof theme.backgroundType === 'string' &&
    typeof theme.backgroundColor === 'string' &&
    typeof theme.textColor === 'string'
  );
}

function loadSettings(): StoredProjectionSettings {
  const fallback = defaultSettings();
  try {
    const stored = window.localStorage.getItem(PROJECTION_SETTINGS_STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<StoredProjectionSettings>;
    const themes = Array.isArray(parsed.themes) ? parsed.themes.filter(isTheme) : [];
    if (themes.length === 0) return fallback;
    const activeThemeId = themes.some((theme) => theme.id === parsed.activeThemeId)
      ? parsed.activeThemeId!
      : themes[0]!.id;
    return {
      themes: themes.map((theme) => ({
        ...fallback.themes[0]!,
        ...theme,
      })),
      activeThemeId,
      audioVisualizer: {
        ...fallback.audioVisualizer,
        ...parsed.audioVisualizer,
      },
      activeContent: {
        ...fallback.activeContent,
        ...parsed.activeContent,
      },
    };
  } catch {
    return fallback;
  }
}

export const useProjectionSettingsStore = defineStore('projection-settings', () => {
  const initialSettings = loadSettings();
  const themes = ref<ProjectionTheme[]>(initialSettings.themes);
  const activeThemeId = ref(initialSettings.activeThemeId);
  const audioVisualizer = ref<AudioVisualizerSettings>(initialSettings.audioVisualizer);
  const activeContent = ref<ActiveContentSettings>(initialSettings.activeContent);

  const activeTheme = computed(
    () => themes.value.find((theme) => theme.id === activeThemeId.value) ?? themes.value[0]!,
  );
  const visualizerColors = computed(() =>
    audioVisualizer.value.inheritThemeColors
      ? {
          primary: activeTheme.value.textColor,
          secondary: activeTheme.value.gradientColor,
        }
      : {
          primary: audioVisualizer.value.primaryColor,
          secondary: audioVisualizer.value.secondaryColor,
        },
  );
  const surfaceStyle = computed<Record<string, string>>(() => {
    const theme = activeTheme.value;
    let backgroundImage = 'none';
    if (theme.backgroundType === 'gradient') {
      backgroundImage = `radial-gradient(circle at 50% 35%, ${theme.gradientColor}, transparent 58%)`;
    } else if (theme.backgroundType === 'image' && theme.backgroundImageUrl) {
      backgroundImage = `linear-gradient(rgb(0 0 0 / ${theme.overlayOpacity}), rgb(0 0 0 / ${theme.overlayOpacity})), url("${theme.backgroundImageUrl}")`;
    }

    return {
      backgroundColor: theme.backgroundColor,
      backgroundImage,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      color: theme.textColor,
      fontFamily: theme.fontFamily,
      '--projection-text-color': theme.textColor,
      '--projection-footer-color': theme.footerColor,
      '--projection-font-weight': String(theme.fontWeight),
      '--projection-font-scale': String(theme.fontScale),
      '--visualizer-primary': visualizerColors.value.primary,
      '--visualizer-secondary': visualizerColors.value.secondary,
    };
  });
  const contentLayoutStyle = computed<Record<string, string>>(() => ({
    alignItems:
      activeTheme.value.horizontalAlign === 'left'
        ? 'flex-start'
        : activeTheme.value.horizontalAlign === 'right'
          ? 'flex-end'
          : 'center',
    justifyContent:
      activeTheme.value.verticalAlign === 'top'
        ? 'flex-start'
        : activeTheme.value.verticalAlign === 'bottom'
          ? 'flex-end'
          : 'center',
    textAlign: activeTheme.value.horizontalAlign,
  }));

  function save(): void {
    window.localStorage.setItem(
      PROJECTION_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        themes: themes.value,
        activeThemeId: activeThemeId.value,
        audioVisualizer: audioVisualizer.value,
        activeContent: activeContent.value,
      } satisfies StoredProjectionSettings),
    );
  }

  function reload(): void {
    const stored = loadSettings();
    themes.value = stored.themes;
    activeThemeId.value = stored.activeThemeId;
    audioVisualizer.value = stored.audioVisualizer;
    activeContent.value = stored.activeContent;
  }

  function selectTheme(themeId: string): void {
    if (!themes.value.some((theme) => theme.id === themeId)) return;
    activeThemeId.value = themeId;
    save();
  }

  function updateActiveTheme(changes: Partial<ProjectionTheme>): void {
    themes.value = themes.value.map((theme) =>
      theme.id === activeThemeId.value ? { ...theme, ...changes, id: theme.id } : theme,
    );
    save();
  }

  function duplicateActiveTheme(): void {
    const source = activeTheme.value;
    const duplicate: ProjectionTheme = {
      ...source,
      id: window.crypto.randomUUID(),
      name: `${source.name} — copia`,
      isBuiltin: false,
    };
    themes.value = [...themes.value, duplicate];
    activeThemeId.value = duplicate.id;
    save();
  }

  function deleteActiveTheme(): boolean {
    if (activeTheme.value.isBuiltin || themes.value.length <= 1) return false;
    themes.value = themes.value.filter((theme) => theme.id !== activeThemeId.value);
    activeThemeId.value = themes.value[0]!.id;
    save();
    return true;
  }

  function resetThemes(): void {
    themes.value = cloneDefaultThemes();
    activeThemeId.value = themes.value[0]!.id;
    save();
  }

  function updateAudioVisualizer(changes: Partial<AudioVisualizerSettings>): void {
    audioVisualizer.value = { ...audioVisualizer.value, ...changes };
    save();
  }

  function updateActiveContent(changes: Partial<ActiveContentSettings>): void {
    activeContent.value = { ...activeContent.value, ...changes };
    save();
  }

  window.addEventListener('storage', (event) => {
    if (event.key === PROJECTION_SETTINGS_STORAGE_KEY) reload();
  });

  return {
    themes,
    activeThemeId,
    activeTheme,
    audioVisualizer,
    activeContent,
    visualizerColors,
    surfaceStyle,
    contentLayoutStyle,
    selectTheme,
    updateActiveTheme,
    duplicateActiveTheme,
    deleteActiveTheme,
    resetThemes,
    updateAudioVisualizer,
    updateActiveContent,
  };
});
