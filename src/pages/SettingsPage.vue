<template>
  <q-page class="settings-page">
    <header class="settings-header">
      <div>
        <div class="text-overline text-primary">ICP Studio</div>
        <h1>Configuración</h1>
        <p>Personaliza las pantallas y el espacio de trabajo del operador.</p>
      </div>
    </header>

    <div class="settings-grid">
      <q-card flat class="settings-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="display_settings" />
            <div>
              <strong>Pantallas detectadas</strong>
              <small>Se actualizan automáticamente al conectar o desconectar monitores.</small>
            </div>
            <q-chip dense color="blue-grey-9" text-color="blue-grey-2">
              {{ displays.length }}
            </q-chip>
          </div>
        </q-card-section>

        <q-separator dark />

        <q-list separator dark>
          <q-item v-for="display in displays" :key="display.id">
            <q-item-section avatar>
              <q-icon
                :name="display.isPrimary ? 'laptop_mac' : 'connected_tv'"
                color="primary"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ display.label }}</q-item-label>
              <q-item-label caption>
                {{ display.bounds.width }} × {{ display.bounds.height }}
                · Escala {{ display.scaleFactor }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge
                :color="display.isPrimary ? 'blue-grey-7' : 'positive'"
                :label="display.isPrimary ? 'Operador' : 'Proyección'"
              />
            </q-item-section>
          </q-item>

          <q-item v-if="displays.length === 0">
            <q-item-section>
              <q-item-label>No fue posible leer las pantallas.</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <q-card flat class="settings-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="dashboard_customize" />
            <div>
              <strong>Espacio de trabajo</strong>
              <small>Selecciona las áreas visibles en todos los módulos.</small>
            </div>
          </div>
        </q-card-section>

        <q-separator dark />

        <q-list>
          <q-item v-for="panel in panelOptions" :key="panel.id">
            <q-item-section avatar>
              <q-icon :name="panel.icon" color="blue-grey-4" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ panel.label }}</q-item-label>
              <q-item-label caption>{{ panel.description }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="workspaceSettings.visiblePanels[panel.id]"
                color="primary"
                @update:model-value="
                  workspaceSettings.setPanelVisible(panel.id, Boolean($event))
                "
              />
            </q-item-section>
          </q-item>
        </q-list>

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
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { DisplayInfo } from '../shared/display';
import type { WorkspacePanelId } from '../shared/workspace';
import { useWorkspaceSettingsStore } from '../stores/workspace-settings';

interface PanelOption {
  id: WorkspacePanelId;
  label: string;
  description: string;
  icon: string;
}

const workspaceSettings = useWorkspaceSettingsStore();
const displays = ref<DisplayInfo[]>([]);
let unsubscribeDisplays: (() => void) | undefined;

const panelOptions: PanelOption[] = [
  {
    id: 'search',
    label: 'Búsqueda y contenido',
    description: 'Biblioteca y herramientas del módulo seleccionado.',
    icon: 'search',
  },
  {
    id: 'preview',
    label: 'Previsualización',
    description: 'Vista privada del contenido antes de presentarlo.',
    icon: 'preview',
  },
  {
    id: 'service',
    label: 'Servicio',
    description: 'Lista organizada del contenido preparado.',
    icon: 'playlist_play',
  },
  {
    id: 'live',
    label: 'En vivo',
    description: 'Contenido y controles de la proyección activa.',
    icon: 'sensors',
  },
];

onMounted(async () => {
  displays.value = await window.icpStudio?.displays.list() ?? [];
  unsubscribeDisplays = window.icpStudio?.displays.onChanged((nextDisplays) => {
    displays.value = nextDisplays;
  });
});

onBeforeUnmount(() => {
  unsubscribeDisplays?.();
});
</script>

<style scoped>
.settings-page {
  min-height: calc(100vh - 66px);
  padding: 22px;
  color: #e8eef6;
  background: #0c131d;
}

.settings-header h1 {
  margin: 0;
  font-size: 28px;
}

.settings-header p {
  margin: 5px 0 0;
  color: #8492a6;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 22px;
}

.settings-card {
  color: #dbe5f1;
  background: #111b28;
  border: 1px solid #263448;
  border-radius: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.section-title > .q-icon {
  color: #60a5fa;
  font-size: 25px;
}

.section-title > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.section-title small,
:deep(.q-item__label--caption) {
  color: #8492a6;
}

@media (max-width: 850px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
