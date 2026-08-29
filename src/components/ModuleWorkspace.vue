<template>
  <section class="workspace-shell">
    <div ref="workspaceElement" class="workspace-panels">
      <template v-for="(panel, index) in panels" :key="panel.id">
        <article
          class="workspace-panel"
          :class="{ 'workspace-panel--dragging': draggingPanelId === panel.id }"
          :style="{ flexGrow: panelSizes[panel.id] }"
          @dragover.prevent
          @drop="dropPanel(panel.id)"
        >
          <header
            class="panel-header"
            draggable="true"
            @dragstart="startDragging($event, panel.id)"
            @dragend="stopDragging"
          >
            <div class="panel-heading">
              <q-icon name="drag_indicator" class="drag-icon">
                <q-tooltip>Arrastra para cambiar la posición del panel</q-tooltip>
              </q-icon>
              <q-icon :name="panel.id === 'search' ? icon : panel.icon" size="19px" />
              <span>{{ panel.id === 'search' ? title : panel.title }}</span>
              <span v-if="panel.id === 'search'" class="panel-context">Búsqueda y contenido</span>
            </div>

            <q-btn
              v-if="panel.id === 'search'"
              flat
              round
              dense
              size="sm"
              icon="info_outline"
              aria-label="Información del módulo"
              @click.stop
            >
              <q-tooltip>{{ description }}</q-tooltip>
            </q-btn>

            <q-btn v-else flat round dense size="sm" icon="more_horiz" @click.stop />
          </header>

          <div class="panel-content">
            <template v-if="panel.id === 'search'">
              <q-input
                v-model="searchText"
                outlined
                dense
                clearable
                :placeholder="searchPlaceholder"
                class="search-input"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>

              <div class="filter-row">
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="add"
                  label="Agregar"
                  class="add-button"
                />
                <q-btn flat round dense icon="filter_list">
                  <q-tooltip>Filtros</q-tooltip>
                </q-btn>
              </div>

              <div class="empty-state">
                <q-icon :name="icon" size="44px" />
                <div class="empty-title">Buscar en {{ title }}</div>
                <div class="empty-text">Los resultados y elementos guardados aparecerán aquí.</div>
              </div>
            </template>

            <template v-else-if="panel.id === 'preview'">
              <div class="screen-label">
                <span>Vista del operador</span>
                <q-icon name="visibility" />
              </div>

              <div class="projection-screen preview-screen">
                <q-icon name="preview" size="46px" />
                <div>Selecciona un elemento para previsualizarlo</div>
              </div>

              <div class="panel-actions">
                <q-btn
                  outline
                  no-caps
                  color="primary"
                  icon="playlist_add"
                  label="Agregar al servicio"
                  disable
                />
              </div>
            </template>

            <template v-else>
              <div class="screen-label">
                <div class="live-indicator">
                  <span class="live-dot"></span>
                  <span>Salida de proyección</span>
                </div>
                <q-icon name="connected_tv" />
              </div>

              <div class="projection-screen live-screen">
                <q-icon name="live_tv" size="46px" />
                <div>Todavía no hay contenido en vivo</div>
              </div>

              <div class="panel-actions live-actions">
                <q-btn flat round icon="stop_circle" color="negative">
                  <q-tooltip>Detener proyección</q-tooltip>
                </q-btn>
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="present_to_all"
                  label="Presentar"
                  disable
                />
              </div>
            </template>
          </div>
        </article>

        <div
          v-if="index < panels.length - 1"
          class="resize-handle"
          title="Arrastra para cambiar el ancho"
          @pointerdown="startResize($event, index)"
        >
          <span></span>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';

interface Props {
  title: string;
  description: string;
  icon: string;
}

type PanelId = 'search' | 'preview' | 'live';

interface WorkspacePanel {
  id: PanelId;
  title: string;
  icon: string;
}

const searchText = ref('');
const draggingPanelId = ref<PanelId | null>(null);
const workspaceElement = ref<HTMLElement | null>(null);

const panels = ref<WorkspacePanel[]>([
  { id: 'search', title: 'Búsqueda y contenido', icon: 'search' },
  { id: 'preview', title: 'Previsualización', icon: 'preview' },
  { id: 'live', title: 'En vivo', icon: 'sensors' },
]);

const panelSizes = reactive<Record<PanelId, number>>({
  search: 36,
  preview: 32,
  live: 32,
});

const props = defineProps<Props>();

const searchPlaceholder = computed(() => `Buscar en ${props.title.toLowerCase()}...`);

let stopActiveResize: (() => void) | null = null;

function startDragging(event: DragEvent, panelId: PanelId) {
  draggingPanelId.value = panelId;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', panelId);
  }
}

function stopDragging() {
  draggingPanelId.value = null;
}

function dropPanel(targetPanelId: PanelId) {
  const sourcePanelId = draggingPanelId.value;

  if (!sourcePanelId || sourcePanelId === targetPanelId) {
    stopDragging();
    return;
  }

  const sourceIndex = panels.value.findIndex((panel) => panel.id === sourcePanelId);
  const targetIndex = panels.value.findIndex((panel) => panel.id === targetPanelId);

  if (sourceIndex === -1 || targetIndex === -1) {
    stopDragging();
    return;
  }

  const [movedPanel] = panels.value.splice(sourceIndex, 1);

  if (movedPanel) {
    panels.value.splice(targetIndex, 0, movedPanel);
  }

  stopDragging();
}

function startResize(event: PointerEvent, dividerIndex: number) {
  const leftPanel = panels.value[dividerIndex];
  const rightPanel = panels.value[dividerIndex + 1];
  const containerWidth = workspaceElement.value?.clientWidth;

  if (!leftPanel || !rightPanel || !containerWidth) {
    return;
  }

  stopActiveResize?.();

  const startX = event.clientX;
  const initialLeftSize = panelSizes[leftPanel.id];
  const initialRightSize = panelSizes[rightPanel.id];
  const combinedSize = initialLeftSize + initialRightSize;
  const minimumSize = 18;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const sizeDifference = ((moveEvent.clientX - startX) / containerWidth) * 100;
    const nextLeftSize = initialLeftSize + sizeDifference;
    const nextRightSize = initialRightSize - sizeDifference;

    if (nextLeftSize < minimumSize || nextRightSize < minimumSize) {
      return;
    }

    panelSizes[leftPanel.id] = nextLeftSize;
    panelSizes[rightPanel.id] = combinedSize - nextLeftSize;
  };

  const stopResize = () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopResize);
    document.body.classList.remove('is-resizing-panels');
    stopActiveResize = null;
  };

  stopActiveResize = stopResize;
  document.body.classList.add('is-resizing-panels');
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopResize);
  event.preventDefault();
}

onBeforeUnmount(() => {
  stopActiveResize?.();
});
</script>

<style scoped>
.workspace-shell {
  min-height: calc(100vh - 66px);
  padding: 12px;
  background: #0c131d;
  color: #e8eef6;
}

.workspace-panels {
  display: flex;
  align-items: stretch;
  height: calc(100vh - 90px);
  min-height: 480px;
  overflow: hidden;
}

.workspace-panel {
  display: flex;
  min-width: 0;
  flex-basis: 0;
  flex-direction: column;
  overflow: hidden;
  background: #111b28;
  border: 1px solid #263448;
  border-radius: 10px;
  transition:
    opacity 160ms ease,
    border-color 160ms ease;
}

.workspace-panel--dragging {
  opacity: 0.45;
  border-color: #60a5fa;
}

.panel-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: #162231;
  border-bottom: 1px solid #263448;
  cursor: grab;
  user-select: none;
}

.panel-header:active {
  cursor: grabbing;
}

.panel-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: #dbe5f1;
  font-size: 13px;
  font-weight: 600;
}

.drag-icon {
  color: #5e6c7e;
}

.panel-context {
  overflow: hidden;
  color: #738196;
  font-size: 10px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-context::before {
  margin-right: 8px;
  color: #415066;
  content: '•';
}

.panel-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 14px;
  overflow: auto;
}

.search-input :deep(.q-field__control) {
  color: #e7edf5;
  background: #0d1621;
}

.search-input :deep(.q-field__native),
.search-input :deep(.q-field__prepend) {
  color: #b8c3d1;
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.add-button {
  border-radius: 7px;
}

.empty-state {
  display: flex;
  flex: 1;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #526176;
  text-align: center;
}

.empty-title {
  margin-top: 12px;
  color: #9eabba;
  font-size: 14px;
  font-weight: 600;
}

.empty-text {
  max-width: 240px;
  margin-top: 5px;
  font-size: 11px;
  line-height: 1.5;
}

.screen-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #8492a6;
  font-size: 11px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 7px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #f05252;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgb(240 82 82 / 12%);
}

.projection-screen {
  display: flex;
  aspect-ratio: 16 / 9;
  min-height: 170px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: #05080d;
  border: 1px solid #293649;
  border-radius: 8px;
  color: #556277;
  text-align: center;
  font-size: 12px;
}

.preview-screen {
  background: radial-gradient(circle at center, rgb(35 55 79 / 55%), transparent 62%), #070b11;
}

.live-screen {
  border-color: #3a2b34;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.live-actions {
  justify-content: space-between;
}

.resize-handle {
  display: flex;
  width: 12px;
  flex: 0 0 12px;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
}

.resize-handle span {
  width: 3px;
  height: 46px;
  background: #314155;
  border-radius: 999px;
  transition:
    height 150ms ease,
    background 150ms ease;
}

.resize-handle:hover span {
  height: 70px;
  background: #60a5fa;
}

@media (max-width: 900px) {
  .workspace-panels {
    height: auto;
    overflow: visible;
    flex-direction: column;
    gap: 12px;
  }

  .workspace-panel {
    width: 100%;
    min-height: 420px;
    flex-basis: auto;
  }

  .resize-handle {
    display: none;
  }
}
</style>

<style>
body.is-resizing-panels {
  cursor: col-resize;
  user-select: none;
}
</style>
