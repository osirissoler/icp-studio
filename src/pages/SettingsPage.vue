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

        <q-card flat class="settings-card">
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
import { showAppNotification } from '../services/app-notification';
import {
  clearPreferredBibleVersion,
  getPreferredBibleVersion,
  setPreferredBibleVersion,
} from '../services/bible-settings';
import type { BibleTransferResult, BibleVersion } from '../shared/bible';
import type { DisplayInfo } from '../shared/display';
import type { WorkspacePanelId } from '../shared/workspace';
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
    label: 'Proyección',
    icon: 'present_to_all',
    description: 'Temas, tipografía y salida final.',
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

const activeNavigationItem = computed(
  () => navigationItems.find((item) => item.id === activeSection.value) ?? navigationItems[0]!,
);

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
  min-height: 100vh;
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
@media (max-width: 850px) {
  .settings-columns {
    grid-template-columns: 1fr;
  }
}
</style>
