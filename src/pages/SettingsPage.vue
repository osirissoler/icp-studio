<template>
  <div class="settings-page">
    <nav class="settings-navigation" aria-label="Categorías de configuración">
      <button
        v-for="item in navigationItems"
        :key="item.id"
        type="button"
        class="settings-navigation-item"
        :class="{ 'settings-navigation-item--active': activeSection === item.id }"
        @click="activeSection = item.id"
      >
        <q-icon :name="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <header class="settings-header">
      <p>Organiza cada área del sistema desde un solo lugar.</p>
    </header>

    <main class="settings-content">
      <section v-if="activeSection === 'general'" class="settings-section">
        <div class="section-heading">
          <q-icon name="tune" />
          <div>
            <h2>General</h2>
            <p>Define qué áreas aparecen en el espacio de trabajo.</p>
          </div>
        </div>

        <q-card flat class="settings-card general-panels-card">
          <q-list>
            <q-item v-for="panel in panelOptions" :key="panel.id">
              <q-item-section avatar
                ><q-icon :name="panel.icon" color="blue-grey-4"
              /></q-item-section>
              <q-item-section>
                <q-item-label>{{ panel.label }}</q-item-label>
                <q-item-label caption>{{ panel.description }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  :model-value="workspaceSettings.visiblePanels[panel.id]"
                  color="primary"
                  @update:model-value="workspaceSettings.setPanelVisible(panel.id, Boolean($event))"
                />
              </q-item-section>
            </q-item>
          </q-list>
          <q-separator dark />
          <q-card-actions align="right">
            <q-btn
              flat
              no-caps
              color="primary"
              icon="restart_alt"
              label="Restaurar distribución"
              @click="workspaceSettings.resetWorkspace"
            />
          </q-card-actions>
        </q-card>
      </section>

      <section v-else-if="activeSection === 'screens'" class="settings-section">
        <div class="section-heading">
          <q-icon name="display_settings" />
          <div>
            <h2>Pantallas</h2>
            <p>Consulta los monitores que ICP Studio detecta automáticamente.</p>
          </div>
        </div>

        <q-card flat class="settings-card">
          <q-card-section class="card-header">
            <strong>Pantallas detectadas</strong>
            <q-chip dense color="blue-grey-9" text-color="blue-grey-2">{{
              displays.length
            }}</q-chip>
          </q-card-section>
          <q-separator dark />
          <q-list separator dark>
            <q-item v-for="display in displays" :key="display.id">
              <q-item-section avatar>
                <q-icon
                  :name="display.isPrimary ? 'laptop_mac' : 'connected_tv'"
                  :color="display.isPrimary ? 'blue-grey-4' : 'positive'"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ display.label }}</q-item-label>
                <q-item-label caption
                  >{{ display.bounds.width }} × {{ display.bounds.height }} · Escala
                  {{ display.scaleFactor }}</q-item-label
                >
              </q-item-section>
              <q-item-section side>
                <q-badge
                  :color="display.isPrimary ? 'blue-grey-7' : 'positive'"
                  :label="display.isPrimary ? 'Operador' : 'Proyección'"
                />
              </q-item-section>
            </q-item>
            <q-item v-if="displays.length === 0"
              ><q-item-section>No fue posible leer las pantallas.</q-item-section></q-item
            >
          </q-list>
        </q-card>
      </section>

      <section v-else-if="activeSection === 'bible'" class="settings-section">
        <div class="section-heading">
          <q-icon name="menu_book" />
          <div>
            <h2>Biblia</h2>
            <p>Selecciona la versión principal y administra las versiones instaladas.</p>
          </div>
        </div>

        <div class="settings-columns">
          <q-card flat class="settings-card">
            <q-card-section class="card-header">
              <div>
                <strong>Versiones instaladas</strong
                ><small>La predeterminada se utilizará en todas las búsquedas.</small>
              </div>
              <q-chip dense color="blue-grey-9" text-color="blue-grey-2">{{
                bibleVersions.length
              }}</q-chip>
            </q-card-section>
            <q-separator dark />
            <div v-if="loadingBibleVersions" class="loading-state">
              <q-spinner color="primary" size="30px" /><span>Cargando versiones...</span>
            </div>
            <q-list v-else separator dark>
              <q-item
                v-for="version in bibleVersions"
                :key="version.code"
                clickable
                @click="selectBibleVersion(version.code)"
              >
                <q-item-section avatar>
                  <q-radio
                    :model-value="preferredBibleVersionCode"
                    :val="version.code"
                    color="primary"
                    @update:model-value="selectBibleVersion(String($event))"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ version.name }}</q-item-label>
                  <q-item-label caption
                    >{{ version.shortName }} · {{ version.language.toUpperCase() }}</q-item-label
                  >
                </q-item-section>
                <q-item-section side>
                  <div class="version-actions">
                    <q-badge v-if="version.isBuiltin" color="blue-grey-8" label="Incluida" />
                    <q-btn
                      flat
                      round
                      dense
                      color="primary"
                      icon="download"
                      :loading="exportingBibleCode === version.code"
                      :aria-label="`Descargar ${version.name} en formato ICP Bible`"
                      @click.stop="downloadBibleVersion(version)"
                    >
                      <q-tooltip>Descargar como .icpbible</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="!version.isBuiltin"
                      flat
                      round
                      dense
                      color="red-4"
                      icon="delete_outline"
                      :loading="removingBibleCode === version.code"
                      :aria-label="`Eliminar ${version.name}`"
                      @click.stop="deleteBibleVersion(version)"
                    >
                      <q-tooltip>Eliminar versión importada</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-if="bibleError" class="settings-error">
              <q-icon name="error_outline" />{{ bibleError }}
            </div>
          </q-card>

          <q-card flat class="settings-card import-card">
            <q-icon name="upload_file" />
            <strong>Importar una versión</strong>
            <p>Podrás instalar paquetes de ICP Studio y Biblias provenientes del formato XMM.</p>
            <div class="format-list" aria-label="Formatos de importación admitidos">
              <q-chip dense outline color="primary" icon="inventory_2">.icpbible</q-chip>
              <q-chip dense outline color="primary" icon="code">.xmm</q-chip>
            </div>
            <q-btn
              outline
              no-caps
              color="primary"
              icon="add"
              label="Elegir archivo"
              :loading="importingBible"
              @click="chooseBibleFile"
            />
            <small>
              El nombre y el código se obtienen automáticamente del archivo seleccionado.
            </small>
          </q-card>
        </div>
      </section>

      <section v-else-if="activeSection === 'projection'" class="settings-section">
        <div class="section-heading">
          <q-icon name="palette" />
          <div>
            <h2>Temas</h2>
            <p>Configura el fondo, la tipografía y la distribución de la presentación final.</p>
          </div>
        </div>

        <div class="theme-settings-layout">
          <q-card flat class="settings-card theme-library-card">
            <q-card-section class="card-header">
              <div>
                <strong>Temas disponibles</strong>
                <small>El tema seleccionado se aplica inmediatamente.</small>
              </div>
              <q-btn
                flat
                round
                dense
                color="light-blue-4"
                icon="content_copy"
                @click="projectionSettings.duplicateActiveTheme"
              >
                <q-tooltip>Duplicar el tema seleccionado</q-tooltip>
              </q-btn>
            </q-card-section>
            <q-separator dark />
            <div class="theme-list">
              <button
                v-for="theme in themes"
                :key="theme.id"
                type="button"
                class="theme-option"
                :class="{ 'theme-option--active': activeThemeId === theme.id }"
                @click="projectionSettings.selectTheme(theme.id)"
              >
                <span class="theme-swatch" :style="themeSwatchStyle(theme)"></span>
                <span>
                  <strong>{{ theme.name }}</strong>
                  <small>{{ theme.isBuiltin ? 'Incluido' : 'Personalizado' }}</small>
                </span>
                <q-icon v-if="activeThemeId === theme.id" name="check_circle" />
              </button>
            </div>
            <q-separator dark />
            <q-card-actions align="between">
              <q-btn
                flat
                dense
                no-caps
                color="blue-grey-4"
                icon="restart_alt"
                label="Restaurar incluidos"
                @click="resetProjectionThemes"
              />
              <q-btn
                flat
                dense
                no-caps
                color="red-4"
                icon="delete_outline"
                label="Eliminar tema"
                :disable="activeTheme.isBuiltin"
                @click="deleteProjectionTheme"
              />
            </q-card-actions>
          </q-card>

          <q-card flat class="settings-card theme-editor-card">
            <q-card-section class="theme-editor-grid">
              <q-input
                :model-value="activeTheme.name"
                dark
                outlined
                dense
                label="Nombre del tema"
                @update:model-value="projectionSettings.updateActiveTheme({ name: String($event) })"
              />

              <q-select
                :model-value="activeTheme.backgroundType"
                :options="backgroundTypeOptions"
                dark
                outlined
                dense
                emit-value
                map-options
                label="Tipo de fondo"
                @update:model-value="updateBackgroundType"
              />

              <label class="color-field">
                <span>Color principal</span>
                <input
                  type="color"
                  :value="activeTheme.backgroundColor"
                  @input="updateThemeColor('backgroundColor', $event)"
                />
                <code>{{ activeTheme.backgroundColor }}</code>
              </label>

              <label v-if="activeTheme.backgroundType === 'gradient'" class="color-field">
                <span>Color del degradado</span>
                <input
                  type="color"
                  :value="activeTheme.gradientColor"
                  @input="updateThemeColor('gradientColor', $event)"
                />
                <code>{{ activeTheme.gradientColor }}</code>
              </label>

              <div v-if="activeTheme.backgroundType === 'image'" class="image-background-field">
                <q-btn
                  outline
                  dense
                  no-caps
                  color="light-blue-4"
                  icon="image"
                  label="Elegir imagen"
                  @click="chooseThemeBackground"
                />
                <small>{{
                  activeTheme.backgroundImageUrl
                    ? 'Imagen guardada localmente'
                    : 'Sin imagen seleccionada'
                }}</small>
              </div>

              <label class="color-field">
                <span>Color del texto</span>
                <input
                  type="color"
                  :value="activeTheme.textColor"
                  @input="updateThemeColor('textColor', $event)"
                />
                <code>{{ activeTheme.textColor }}</code>
              </label>

              <label class="color-field">
                <span>Color de referencia</span>
                <input
                  type="color"
                  :value="activeTheme.footerColor"
                  @input="updateThemeColor('footerColor', $event)"
                />
                <code>{{ activeTheme.footerColor }}</code>
              </label>

              <q-select
                :model-value="activeTheme.fontFamily"
                :options="fontOptions"
                dark
                outlined
                dense
                emit-value
                map-options
                label="Tipografía"
                @update:model-value="updateFontFamily"
              />

              <q-select
                :model-value="activeTheme.horizontalAlign"
                :options="horizontalAlignOptions"
                dark
                outlined
                dense
                emit-value
                map-options
                label="Alineación horizontal"
                @update:model-value="updateHorizontalAlign"
              />

              <q-select
                :model-value="activeTheme.verticalAlign"
                :options="verticalAlignOptions"
                dark
                outlined
                dense
                emit-value
                map-options
                label="Posición vertical"
                @update:model-value="updateVerticalAlign"
              />

              <div class="slider-field">
                <span>Tamaño del texto · {{ Math.round(activeTheme.fontScale * 100) }}%</span>
                <q-slider
                  :model-value="activeTheme.fontScale"
                  :min="0.7"
                  :max="1.5"
                  :step="0.05"
                  color="primary"
                  @update:model-value="
                    projectionSettings.updateActiveTheme({ fontScale: Number($event) })
                  "
                />
              </div>

              <div v-if="activeTheme.backgroundType === 'image'" class="slider-field">
                <span>Oscurecer imagen · {{ Math.round(activeTheme.overlayOpacity * 100) }}%</span>
                <q-slider
                  :model-value="activeTheme.overlayOpacity"
                  :min="0"
                  :max="0.85"
                  :step="0.05"
                  color="primary"
                  @update:model-value="
                    projectionSettings.updateActiveTheme({ overlayOpacity: Number($event) })
                  "
                />
              </div>
            </q-card-section>
          </q-card>

          <q-card flat class="settings-card theme-preview-card">
            <div class="card-header theme-preview-heading">
              <div>
                <strong>Vista previa</strong><small>Los cambios se guardan automáticamente.</small>
              </div>
              <q-badge color="positive" label="Tema activo" />
            </div>
            <div class="theme-preview" :style="[surfaceStyle, contentLayoutStyle]">
              <div class="theme-preview-text">Todo lo puedo en Cristo que me fortalece.</div>
              <small>Filipenses 4:13</small>
            </div>
          </q-card>
        </div>
      </section>

      <section v-else-if="activeSection === 'music'" class="settings-section">
        <div class="section-heading">
          <q-icon name="graphic_eq" />
          <div>
            <h2>Música</h2>
            <p>Elige la animación que se mostrará mientras se reproduce una canción.</p>
          </div>
        </div>

        <div class="settings-columns music-settings-columns">
          <q-card flat class="settings-card">
            <q-card-section class="card-header">
              <div>
                <strong>Visualizador</strong><small>Selecciona un estilo de animación.</small>
              </div>
            </q-card-section>
            <div class="visualizer-options">
              <button
                v-for="option in visualizerOptions"
                :key="option.value"
                type="button"
                class="visualizer-option"
                :class="{ 'visualizer-option--active': audioVisualizer.type === option.value }"
                @click="projectionSettings.updateAudioVisualizer({ type: option.value })"
              >
                <q-icon :name="option.icon" />
                <span
                  ><strong>{{ option.label }}</strong
                  ><small>{{ option.description }}</small></span
                >
                <q-icon v-if="audioVisualizer.type === option.value" name="check_circle" />
              </button>
            </div>

            <q-separator dark />
            <q-card-section class="music-controls">
              <q-toggle
                :model-value="audioVisualizer.inheritThemeColors"
                color="primary"
                label="Usar los colores del tema activo"
                @update:model-value="
                  projectionSettings.updateAudioVisualizer({ inheritThemeColors: Boolean($event) })
                "
              />
              <q-toggle
                :model-value="audioVisualizer.showTitle"
                color="primary"
                label="Mostrar título de la canción"
                @update:model-value="
                  projectionSettings.updateAudioVisualizer({ showTitle: Boolean($event) })
                "
              />
              <div class="slider-field">
                <span>Sensibilidad · {{ Math.round(audioVisualizer.sensitivity * 100) }}%</span>
                <q-slider
                  :model-value="audioVisualizer.sensitivity"
                  :min="0.5"
                  :max="1.8"
                  :step="0.1"
                  color="primary"
                  @update:model-value="
                    projectionSettings.updateAudioVisualizer({ sensitivity: Number($event) })
                  "
                />
              </div>
              <div v-if="!audioVisualizer.inheritThemeColors" class="visualizer-color-row">
                <label class="color-field">
                  <span>Color principal</span>
                  <input
                    type="color"
                    :value="audioVisualizer.primaryColor"
                    @input="updateVisualizerColor('primaryColor', $event)"
                  />
                </label>
                <label class="color-field">
                  <span>Color secundario</span>
                  <input
                    type="color"
                    :value="audioVisualizer.secondaryColor"
                    @input="updateVisualizerColor('secondaryColor', $event)"
                  />
                </label>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat class="settings-card visualizer-preview-card" :style="surfaceStyle">
            <q-icon name="album" size="48px" />
            <AudioVisualizer
              :type="audioVisualizer.type"
              playing
              compact
              :primary-color="visualizerColors.primary"
              :secondary-color="visualizerColors.secondary"
              :sensitivity="audioVisualizer.sensitivity"
            />
            <strong v-if="audioVisualizer.showTitle">Canción de ejemplo</strong>
            <small>Vista previa del visualizador</small>
          </q-card>
        </div>
      </section>

      <section v-else class="settings-section">
        <div class="section-heading">
          <q-icon :name="activeNavigationItem.icon" />
          <div>
            <h2>{{ activeNavigationItem.label }}</h2>
            <p>{{ activeNavigationItem.description }}</p>
          </div>
        </div>
        <q-card flat class="settings-card planned-settings">
          <q-icon :name="activeNavigationItem.icon" />
          <strong>Configuración preparada</strong>
          <p>
            Aquí agregaremos las opciones de {{ activeNavigationItem.label.toLowerCase() }} cuando
            desarrollemos ese módulo.
          </p>
        </q-card>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import AudioVisualizer from '../components/AudioVisualizer.vue';
import { showAppNotification } from '../services/app-notification';
import {
  clearPreferredBibleVersion,
  getPreferredBibleVersion,
  setPreferredBibleVersion,
} from '../services/bible-settings';
import type { BibleTransferResult, BibleVersion } from '../shared/bible';
import type { DisplayInfo } from '../shared/display';
import type {
  AudioVisualizerType,
  ProjectionTheme,
  ThemeBackgroundType,
  ThemeHorizontalAlign,
  ThemeVerticalAlign,
} from '../shared/theme';
import type { WorkspacePanelId } from '../shared/workspace';
import { useProjectionSettingsStore } from '../stores/projection-settings';
import { useWorkspaceSettingsStore } from '../stores/workspace-settings';

type SettingsSectionId =
  'general' | 'screens' | 'bible' | 'songs' | 'music' | 'projection' | 'remote';
interface NavigationItem {
  id: SettingsSectionId;
  label: string;
  icon: string;
  description: string;
}
interface PanelOption {
  id: WorkspacePanelId;
  label: string;
  description: string;
  icon: string;
}

const navigationItems: NavigationItem[] = [
  { id: 'general', label: 'General', icon: 'tune', description: 'Opciones generales del sistema.' },
  {
    id: 'screens',
    label: 'Pantallas',
    icon: 'display_settings',
    description: 'Monitores y salidas de proyección.',
  },
  {
    id: 'bible',
    label: 'Biblia',
    icon: 'menu_book',
    description: 'Versiones y presentación bíblica.',
  },
  {
    id: 'songs',
    label: 'Alabanzas',
    icon: 'music_note',
    description: 'Texto, orden y formato de las alabanzas.',
  },
  {
    id: 'music',
    label: 'Música',
    icon: 'audio_file',
    description: 'Reproducción y archivos de audio.',
  },
  {
    id: 'projection',
    label: 'Temas',
    icon: 'palette',
    description: 'Fondos, tipografía y apariencia de la presentación.',
  },
  {
    id: 'remote',
    label: 'Control remoto',
    icon: 'smartphone',
    description: 'Acceso móvil y código QR.',
  },
];

const panelOptions: PanelOption[] = [
  {
    id: 'search',
    label: 'Búsqueda y contenido',
    description: 'Biblioteca y herramientas del módulo.',
    icon: 'search',
  },
  {
    id: 'preview',
    label: 'Previsualización',
    description: 'Vista privada antes de presentar.',
    icon: 'preview',
  },
  {
    id: 'service',
    label: 'Servicio',
    description: 'Contenido preparado y organizado.',
    icon: 'playlist_play',
  },
  {
    id: 'live',
    label: 'En vivo',
    description: 'Contenido y controles de proyección.',
    icon: 'sensors',
  },
  {
    id: 'monitors',
    label: 'Monitores',
    description: 'Salidas de proyección activas.',
    icon: 'display_settings',
  },
];

const workspaceSettings = useWorkspaceSettingsStore();
const projectionSettings = useProjectionSettingsStore();
const {
  themes,
  activeThemeId,
  activeTheme,
  audioVisualizer,
  visualizerColors,
  surfaceStyle,
  contentLayoutStyle,
} = storeToRefs(projectionSettings);
const activeSection = ref<SettingsSectionId>('general');
const displays = ref<DisplayInfo[]>([]);
const bibleVersions = ref<BibleVersion[]>([]);
const preferredBibleVersionCode = ref<string | null>(null);
const loadingBibleVersions = ref(true);
const bibleError = ref('');
const importingBible = ref(false);
const exportingBibleCode = ref<string | null>(null);
const removingBibleCode = ref<string | null>(null);
let unsubscribeDisplays: (() => void) | undefined;

const backgroundTypeOptions: Array<{ label: string; value: ThemeBackgroundType }> = [
  { label: 'Color sólido', value: 'solid' },
  { label: 'Degradado', value: 'gradient' },
  { label: 'Imagen', value: 'image' },
];
const fontOptions = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, Times New Roman, serif' },
  { label: 'Trebuchet', value: 'Trebuchet MS, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];
const horizontalAlignOptions: Array<{ label: string; value: ThemeHorizontalAlign }> = [
  { label: 'Izquierda', value: 'left' },
  { label: 'Centro', value: 'center' },
  { label: 'Derecha', value: 'right' },
];
const verticalAlignOptions: Array<{ label: string; value: ThemeVerticalAlign }> = [
  { label: 'Arriba', value: 'top' },
  { label: 'Centro', value: 'center' },
  { label: 'Abajo', value: 'bottom' },
];
const visualizerOptions: Array<{
  label: string;
  value: AudioVisualizerType;
  icon: string;
  description: string;
}> = [
  { label: 'Barras', value: 'bars', icon: 'equalizer', description: 'Barras verticales clásicas.' },
  { label: 'Ondas', value: 'wave', icon: 'waves', description: 'Movimiento suave y continuo.' },
  {
    label: 'Círculos',
    value: 'circle',
    icon: 'motion_photos_on',
    description: 'Anillos que pulsan con la música.',
  },
  {
    label: 'Espectro',
    value: 'spectrum',
    icon: 'graphic_eq',
    description: 'Barras con variaciones de color.',
  },
];

const activeNavigationItem = computed(
  () => navigationItems.find((item) => item.id === activeSection.value) ?? navigationItems[0]!,
);

function themeSwatchStyle(theme: ProjectionTheme): Record<string, string> {
  if (theme.backgroundType === 'image' && theme.backgroundImageUrl) {
    return {
      backgroundColor: theme.backgroundColor,
      backgroundImage: `linear-gradient(rgb(0 0 0 / ${theme.overlayOpacity}), rgb(0 0 0 / ${theme.overlayOpacity})), url("${theme.backgroundImageUrl}")`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    };
  }
  return {
    background:
      theme.backgroundType === 'gradient'
        ? `linear-gradient(135deg, ${theme.backgroundColor}, ${theme.gradientColor})`
        : theme.backgroundColor,
  };
}

function colorFromEvent(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function updateThemeColor(
  field: 'backgroundColor' | 'gradientColor' | 'textColor' | 'footerColor',
  event: Event,
): void {
  projectionSettings.updateActiveTheme({ [field]: colorFromEvent(event) });
}

function updateVisualizerColor(field: 'primaryColor' | 'secondaryColor', event: Event): void {
  projectionSettings.updateAudioVisualizer({ [field]: colorFromEvent(event) });
}

function updateBackgroundType(value: unknown): void {
  projectionSettings.updateActiveTheme({ backgroundType: value as ThemeBackgroundType });
}

function updateFontFamily(value: unknown): void {
  projectionSettings.updateActiveTheme({ fontFamily: String(value) });
}

function updateHorizontalAlign(value: unknown): void {
  projectionSettings.updateActiveTheme({ horizontalAlign: value as ThemeHorizontalAlign });
}

function updateVerticalAlign(value: unknown): void {
  projectionSettings.updateActiveTheme({ verticalAlign: value as ThemeVerticalAlign });
}

async function chooseThemeBackground(): Promise<void> {
  try {
    const imported = (await window.icpStudio?.media.select('image')) ?? [];
    const image = imported[0];
    if (!image) return;
    projectionSettings.updateActiveTheme({
      backgroundType: 'image',
      backgroundImageUrl: image.url,
    });
    showAppNotification('La imagen de fondo fue guardada en ICP Studio.', 'positive', 'image');
  } catch (error) {
    showAppNotification(
      error instanceof Error ? error.message : 'No fue posible guardar la imagen de fondo.',
      'negative',
      'error_outline',
    );
  }
}

function deleteProjectionTheme(): void {
  if (!window.confirm(`¿Quieres eliminar el tema “${activeTheme.value.name}”?`)) return;
  projectionSettings.deleteActiveTheme();
}

function resetProjectionThemes(): void {
  if (!window.confirm('¿Quieres restaurar los temas incluidos y eliminar los personalizados?'))
    return;
  projectionSettings.resetThemes();
}

function selectBibleVersion(versionCode: string): void {
  preferredBibleVersionCode.value = versionCode;
  setPreferredBibleVersion(versionCode);
  window.icpStudio?.bible.setPreferredVersion(versionCode);
  const version = bibleVersions.value.find((item) => item.code === versionCode);
  showAppNotification(
    `${version?.name ?? versionCode} es ahora la versión bíblica predeterminada.`,
    'positive',
    'menu_book',
  );
}

async function loadBibleVersions(): Promise<void> {
  loadingBibleVersions.value = true;
  bibleError.value = '';
  try {
    bibleVersions.value = (await window.icpStudio?.bible.getVersions()) ?? [];
    preferredBibleVersionCode.value = getPreferredBibleVersion(bibleVersions.value);
  } catch (error) {
    bibleError.value =
      error instanceof Error ? error.message : 'No fue posible leer las versiones.';
  } finally {
    loadingBibleVersions.value = false;
  }
}

function transferMessage(result: BibleTransferResult): string {
  const details = [`${result.books ?? 0} libros`, `${result.verses ?? 0} versículos`];
  if (result.omittedVerses) details.push(`${result.omittedVerses} omitidos por el archivo`);
  return `${result.version?.name ?? 'La Biblia'} fue importada: ${details.join(', ')}.`;
}

async function chooseBibleFile(): Promise<void> {
  importingBible.value = true;
  bibleError.value = '';
  try {
    const result = await window.icpStudio?.bible.importVersion();
    if (!result || result.canceled) return;
    await loadBibleVersions();
    showAppNotification(transferMessage(result), 'positive', 'library_add_check');
  } catch (error) {
    bibleError.value =
      error instanceof Error ? error.message : 'No fue posible importar la Biblia.';
    showAppNotification(bibleError.value, 'negative', 'error_outline');
  } finally {
    importingBible.value = false;
  }
}

async function downloadBibleVersion(version: BibleVersion): Promise<void> {
  exportingBibleCode.value = version.code;
  bibleError.value = '';
  try {
    const result = await window.icpStudio?.bible.exportVersion(version.code);
    if (!result || result.canceled) return;
    showAppNotification(
      `${version.name} fue guardada como archivo ICP Bible.`,
      'positive',
      'download_done',
    );
  } catch (error) {
    bibleError.value =
      error instanceof Error ? error.message : 'No fue posible descargar la Biblia.';
    showAppNotification(bibleError.value, 'negative', 'error_outline');
  } finally {
    exportingBibleCode.value = null;
  }
}

async function deleteBibleVersion(version: BibleVersion): Promise<void> {
  if (!window.confirm(`¿Quieres eliminar la versión "${version.name}" de ICP Studio?`)) return;
  removingBibleCode.value = version.code;
  bibleError.value = '';
  try {
    await window.icpStudio?.bible.removeVersion(version.code);
    if (preferredBibleVersionCode.value === version.code) {
      clearPreferredBibleVersion();
    }
    await loadBibleVersions();
    showAppNotification(`${version.name} fue eliminada.`, 'positive', 'delete_outline');
  } catch (error) {
    bibleError.value =
      error instanceof Error ? error.message : 'No fue posible eliminar la Biblia.';
    showAppNotification(bibleError.value, 'negative', 'error_outline');
  } finally {
    removingBibleCode.value = null;
  }
}

onMounted(async () => {
  displays.value = (await window.icpStudio?.displays.list()) ?? [];
  unsubscribeDisplays = window.icpStudio?.displays.onChanged((nextDisplays) => {
    displays.value = nextDisplays;
  });
  await loadBibleVersions();
});

onBeforeUnmount(() => unsubscribeDisplays?.());
</script>

<style scoped>
.settings-page {
  min-height: 100%;
  padding: 22px;
  color: #e8eef6;
  background: #0c131d;
}
.section-heading h2 {
  margin: 0;
}
.settings-header p,
.section-heading p,
.import-card p,
.planned-settings p {
  margin: 5px 0 0;
  color: #8492a6;
}
.settings-navigation {
  display: flex;
  gap: 5px;
  margin: 0 0 12px;
  padding: 4px;
  overflow-x: auto;
  background: #101a27;
  border: 1px solid #263448;
  border-radius: 10px;
}
.settings-navigation-item {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  font-size: 13px;
  color: #8492a6;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}
.settings-navigation-item:hover {
  color: #dbeafe;
  background: #162438;
}
.settings-navigation-item--active {
  color: #bfdbfe;
  background: #173252;
}
.settings-content {
  max-width: 1150px;
}
.settings-header {
  margin: 0 0 16px;
}
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-heading > .q-icon {
  color: #60a5fa;
  font-size: 29px;
}
.section-heading h2 {
  font-size: 21px;
}
.settings-columns {
  display: grid;
  grid-template-columns: minmax(380px, 1.4fr) minmax(270px, 0.8fr);
  gap: 16px;
}
.settings-card {
  color: #dbe5f1;
  background: #111b28;
  border: 1px solid #263448;
  border-radius: 10px;
}
.general-panels-card {
  width: min(100%, 520px);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-header > div {
  display: flex;
  flex-direction: column;
}
.card-header small,
.import-card small,
:deep(.q-item__label--caption) {
  color: #8492a6;
}
.version-actions,
.format-list {
  display: flex;
  align-items: center;
  gap: 6px;
}
.loading-state,
.settings-error,
.import-card,
.planned-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px;
}
.import-card,
.planned-settings {
  min-height: 240px;
  flex-direction: column;
  text-align: center;
}
.import-card > .q-icon,
.planned-settings > .q-icon {
  color: #60a5fa;
  font-size: 46px;
}
.settings-error {
  color: #fca5a5;
}
code {
  color: #93c5fd;
}

.theme-settings-layout {
  display: grid;
  grid-template-columns: minmax(205px, 0.55fr) minmax(390px, 1.08fr) minmax(315px, 0.9fr);
  gap: 16px;
  align-items: start;
}

.theme-library-card,
.theme-editor-card,
.theme-preview-card {
  min-width: 0;
}

.theme-list,
.visualizer-options {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
}

.theme-option,
.visualizer-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 7px;
  color: #b9c6d5;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}

.theme-option:hover,
.theme-option--active,
.visualizer-option:hover,
.visualizer-option--active {
  background: #15263b;
  border-color: #3b6ea8;
}

.theme-option > span:nth-child(2),
.visualizer-option > span {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.theme-option small,
.visualizer-option small,
.image-background-field small,
.visualizer-preview-card small {
  color: #8492a6;
}

.theme-option > .q-icon:last-child,
.visualizer-option > .q-icon:last-child {
  color: #60a5fa;
}

.theme-swatch {
  width: 44px;
  height: 30px;
  flex: 0 0 44px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 6px;
}

.theme-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.color-field,
.slider-field,
.image-background-field {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  color: #9cabbc;
  background: #0d1723;
  border: 1px solid #314055;
  border-radius: 6px;
  font-size: 11px;
}

.color-field span,
.slider-field span {
  flex: 1;
}

.color-field input {
  width: 30px;
  height: 25px;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.color-field code {
  font-size: 9px;
}

.slider-field {
  align-items: stretch;
  flex-direction: column;
  gap: 2px;
}

.image-background-field {
  justify-content: space-between;
}

.theme-preview-card {
  position: sticky;
  top: 0;
  padding: 10px;
}

.theme-preview-heading {
  padding: 3px 2px 10px;
}

.theme-preview {
  position: relative;
  display: flex;
  aspect-ratio: 16 / 9;
  min-height: 190px;
  flex-direction: column;
  padding: clamp(22px, 5vw, 58px);
  overflow: hidden;
  border: 1px solid #34465d;
  border-radius: 9px;
}

@media (max-width: 1080px) {
  .theme-settings-layout {
    grid-template-columns: minmax(210px, 0.65fr) minmax(390px, 1.35fr);
  }

  .theme-preview-card {
    position: static;
    grid-column: 1 / -1;
  }
}

.theme-preview-text {
  max-width: 90%;
  color: var(--projection-text-color);
  font-size: calc(clamp(22px, 3.2vw, 46px) * var(--projection-font-scale));
  font-weight: var(--projection-font-weight);
  line-height: 1.2;
}

.theme-preview small {
  position: absolute;
  bottom: 14px;
  left: 16px;
  color: var(--projection-footer-color);
}

.music-settings-columns {
  grid-template-columns: minmax(390px, 1fr) minmax(300px, 0.8fr);
}

.visualizer-option > .q-icon:first-child {
  color: #93c5fd;
  font-size: 24px;
}

.music-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.visualizer-color-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.visualizer-preview-card {
  display: flex;
  min-height: 330px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  text-align: center;
}

.visualizer-preview-card > .q-icon {
  color: var(--projection-text-color);
  opacity: 0.65;
}

@media (max-width: 850px) {
  .settings-columns,
  .theme-settings-layout {
    grid-template-columns: 1fr;
  }

  .theme-editor-grid {
    grid-template-columns: 1fr;
  }

  .theme-preview-card {
    grid-column: auto;
  }
}
</style>
