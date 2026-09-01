<template>
  <section class="workspace-shell">
    <div ref="workspaceElement" class="workspace-panels" :style="workspaceGridStyle">
      <article
        v-for="panel in visiblePanels"
        :key="panel.id"
        class="workspace-panel"
        :class="{ 'workspace-panel--dragging': draggingPanelId === panel.id }"
        :style="panelGridPosition(panel)"
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
            <span class="panel-title">{{ panel.id === 'search' ? title : panel.title }}</span>
            <span v-if="panel.id === 'search'" class="panel-context">Búsqueda y contenido</span>
          </div>

          <div class="panel-header-actions">
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

            <q-btn
              flat
              round
              dense
              size="sm"
              icon="more_horiz"
              aria-label="Opciones del área"
              @click.stop
            >
              <q-menu dark>
                <q-list dense style="min-width: 170px">
                  <q-item
                    clickable
                    v-close-popup
                    @click="workspaceSettings.setPanelVisible(panel.id, false)"
                  >
                    <q-item-section avatar>
                      <q-icon name="visibility_off" />
                    </q-item-section>
                    <q-item-section>Ocultar área</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
        </header>

        <div class="panel-content">
          <GlobalServicePanel v-if="panel.id === 'service'" />
          <GlobalLivePanel v-else-if="panel.id === 'live'" />
          <MonitorsPanel v-else-if="panel.id === 'monitors'" />
          <UpcomingActivitiesPanel v-else-if="panel.id === 'upcomingActivities'" />
          <slot v-else-if="$slots[panel.id]" :name="panel.id" />

          <template v-else-if="panel.id === 'search'">
            <div class="search-toolbar">
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

              <q-btn
                v-if="isSongModule"
                unelevated
                color="primary"
                icon="add"
                class="toolbar-button"
                aria-label="Crear nueva alabanza"
                @click="openSongEditor"
              >
                <q-tooltip>Crear nueva alabanza</q-tooltip>
              </q-btn>

              <q-btn
                outline
                color="blue-grey-5"
                icon="filter_list"
                class="toolbar-button"
                aria-label="Filtrar contenido"
              >
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
        </div>
      </article>

      <div
        v-for="separatorIndex in Math.max(0, layoutColumnCount - 1)"
        :key="`column-separator-${separatorIndex}`"
        class="resize-handle resize-handle--column"
        :style="{
          gridColumn: String(separatorIndex * 2),
          gridRow: '1 / 101',
        }"
        title="Arrastra para cambiar el ancho"
        @pointerdown="startColumnResize($event, separatorIndex - 1)"
      >
        <span></span>
      </div>

      <div
        v-for="column in splitColumns"
        :key="`row-separator-${column.logicalIndex}`"
        class="resize-handle resize-handle--center"
        :style="{
          gridColumn: String(column.renderedIndex * 2 + 1),
          gridRow: String(column.splitPercent),
        }"
        title="Arrastra para cambiar la altura"
        @pointerdown="startRowResize($event, column.logicalIndex)"
      >
        <span></span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import GlobalLivePanel from './GlobalLivePanel.vue';
import GlobalServicePanel from './GlobalServicePanel.vue';
import MonitorsPanel from './MonitorsPanel.vue';
import UpcomingActivitiesPanel from './UpcomingActivitiesPanel.vue';
import type { WorkspacePanelId } from '../shared/workspace';
import { useWorkspaceSettingsStore } from '../stores/workspace-settings';

interface Props {
  title: string;
  description: string;
  icon: string;
}

type PanelId = WorkspacePanelId;

interface WorkspacePanel {
  id: PanelId;
  title: string;
  icon: string;
}

const workspaceSettings = useWorkspaceSettingsStore();
const searchText = ref('');
const draggingPanelId = ref<PanelId | null>(null);
const workspaceElement = ref<HTMLElement | null>(null);
const columnSizes = reactive<number[]>([0.9, 1.15, 1.15, 0.9]);
const panelDefinitions: WorkspacePanel[] = [
  { id: 'search', title: 'Búsqueda y contenido', icon: 'search' },
  { id: 'upcomingActivities', title: 'Próximas actividades', icon: 'event_upcoming' },
  { id: 'preview', title: 'Previsualización', icon: 'preview' },
  { id: 'service', title: 'Servicio', icon: 'playlist_play' },
  { id: 'live', title: 'En vivo', icon: 'sensors' },
  { id: 'monitors', title: 'Monitores', icon: 'display_settings' },
];

const props = defineProps<Props>();

const visiblePanels = computed(() =>
  workspaceSettings.panelOrder
    .map((panelId) => panelDefinitions.find((panel) => panel.id === panelId))
    .filter(
      (panel): panel is WorkspacePanel =>
        panel !== undefined && workspaceSettings.isVisible(panel.id),
    ),
);

const searchPlaceholder = computed(() => `Buscar en ${props.title.toLowerCase()}...`);
const isSongModule = computed(() => props.title === 'Alabanzas');
const columnCapacities = computed(() =>
  workspaceSettings.layoutPreset.split('-').map((columnType) => (columnType === 'split' ? 2 : 1)),
);

const panelColumns = computed(() => {
  const columns: WorkspacePanel[][] = [];
  let panelIndex = 0;
  for (const capacity of columnCapacities.value) {
    columns.push(
      workspaceSettings.panelOrder
        .slice(panelIndex, panelIndex + capacity)
        .map((panelId) => panelDefinitions.find((panel) => panel.id === panelId))
        .filter((panel): panel is WorkspacePanel => panel !== undefined),
    );
    panelIndex += capacity;
  }
  while (panelIndex < workspaceSettings.panelOrder.length) {
    const panel = panelDefinitions.find(
      (definition) => definition.id === workspaceSettings.panelOrder[panelIndex],
    );
    if (panel) columns.push([panel]);
    panelIndex += 1;
  }
  return columns;
});

const activeLogicalColumns = computed(() =>
  panelColumns.value
    .map((panels, logicalIndex) => ({
      logicalIndex,
      panels: panels.filter((panel) => workspaceSettings.isVisible(panel.id)),
    }))
    .filter((column) => column.panels.length > 0),
);

const layoutColumnCount = computed(() => activeLogicalColumns.value.length);
const splitColumns = computed(() =>
  activeLogicalColumns.value
    .map((column, renderedIndex) => ({
      ...column,
      renderedIndex,
      splitPercent: Math.round(workspaceSettings.columnSplitPercents[column.logicalIndex] ?? 50),
    }))
    .filter((column) => column.panels.length === 2),
);
const workspaceGridStyle = computed(() => {
  const columnCount = layoutColumnCount.value;
  const columns = Array.from(
    { length: columnCount },
    (_, index) => `minmax(170px, ${columnSizes[index] ?? 1}fr)`,
  ).join(' 12px ');

  return {
    gridTemplateColumns: columns || '1fr',
    gridTemplateRows: 'repeat(100, minmax(0, 1fr))',
  };
});

function panelGridPosition(panel: WorkspacePanel): Record<string, string> {
  const renderedColumnIndex = activeLogicalColumns.value.findIndex((column) =>
    column.panels.some((item) => item.id === panel.id),
  );
  const column = activeLogicalColumns.value[renderedColumnIndex];
  if (!column) return {};
  const panelIndex = column.panels.findIndex((item) => item.id === panel.id);
  if (column.panels.length === 1) {
    return { gridColumn: String(renderedColumnIndex * 2 + 1), gridRow: '1 / 101' };
  }
  const splitPercent = Math.round(workspaceSettings.columnSplitPercents[column.logicalIndex] ?? 50);
  return {
    gridColumn: String(renderedColumnIndex * 2 + 1),
    gridRow: panelIndex === 0 ? `1 / ${splitPercent}` : `${splitPercent + 1} / 101`,
  };
}

let stopActiveResize: (() => void) | null = null;

function openSongEditor(): void {
  window.icpStudio?.windows.openSongEditor();
}

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

  workspaceSettings.movePanel(sourcePanelId, targetPanelId);
  stopDragging();
}

function beginResize(
  event: PointerEvent,
  handlePointerMove: (moveEvent: PointerEvent) => void,
  cursorClass: string,
): void {
  stopActiveResize?.();

  const stopResize = () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopResize);
    document.body.classList.remove(cursorClass);
    stopActiveResize = null;
  };

  stopActiveResize = stopResize;
  document.body.classList.add(cursorClass);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopResize);
  event.preventDefault();
}

function startColumnResize(event: PointerEvent, leftIndex: number): void {
  const containerWidth = workspaceElement.value?.clientWidth;

  if (!containerWidth) {
    return;
  }

  const rightIndex = leftIndex + 1;
  const startX = event.clientX;
  const initialLeft = columnSizes[leftIndex] ?? 1;
  const initialRight = columnSizes[rightIndex] ?? 1;
  const combinedSize = initialLeft + initialRight;
  const totalSize = columnSizes
    .slice(0, layoutColumnCount.value)
    .reduce((sum, size) => sum + size, 0);
  const minimumSize = Math.max(0.4, (170 / containerWidth) * totalSize);

  beginResize(
    event,
    (moveEvent) => {
      const sizeDifference = ((moveEvent.clientX - startX) / containerWidth) * totalSize;
      const nextLeft = initialLeft + sizeDifference;
      const nextRight = initialRight - sizeDifference;

      if (nextLeft < minimumSize || nextRight < minimumSize) {
        return;
      }

      columnSizes[leftIndex] = nextLeft;
      columnSizes[rightIndex] = combinedSize - nextLeft;
    },
    'is-resizing-columns',
  );
}

function startRowResize(event: PointerEvent, logicalColumnIndex: number): void {
  const containerHeight = workspaceElement.value?.clientHeight;

  if (!containerHeight) {
    return;
  }

  const startY = event.clientY;
  const initialTop = workspaceSettings.columnSplitPercents[logicalColumnIndex] ?? 50;

  beginResize(
    event,
    (moveEvent) => {
      const difference = ((moveEvent.clientY - startY) / containerHeight) * 100;
      workspaceSettings.setColumnSplitPercent(logicalColumnIndex, initialTop + difference);
    },
    'is-resizing-rows',
  );
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
  display: grid;
  height: calc(100vh - 90px);
  min-height: 560px;
  grid-template-columns: minmax(220px, 0.9fr) 12px minmax(220px, 1.15fr) 12px minmax(220px, 1.15fr);
  grid-template-rows: minmax(0, 1fr) 12px minmax(0, 1fr);
  gap: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.workspace-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: #111b28;
  border: 1px solid #263448;
  border-radius: 10px;
  transition:
    opacity 160ms ease,
    border-color 160ms ease;
}

.workspace-panel--slot-1 {
  grid-column: 1;
  grid-row: 1 / 4;
}

.workspace-panel--slot-2 {
  grid-column: 3;
  grid-row: 1;
}

.workspace-panel--slot-3 {
  grid-column: 3;
  grid-row: 3;
}

.workspace-panel--slot-4 {
  grid-column: 5;
  grid-row: 1 / 4;
}

.workspace-panel--dragging {
  opacity: 0.45;
  border-color: #60a5fa;
}

.resize-handle {
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.resize-handle--column {
  cursor: col-resize;
}

.resize-handle--center {
  grid-column: 3;
  grid-row: 2;
  cursor: row-resize;
}

.resize-handle--column span {
  width: 3px;
  height: 46px;
  background: #314155;
  border-radius: 999px;
}

.resize-handle--center span {
  width: 46px;
  height: 3px;
  background: #314155;
  border-radius: 999px;
}

.resize-handle:hover span {
  background: #60a5fa;
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

.panel-header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

.panel-heading {
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: #dbe5f1;
  font-size: 13px;
  font-weight: 600;
}

.panel-heading > .q-icon {
  flex: 0 0 auto;
}

.panel-title {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.search-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  min-width: 0;
  flex: 1;
}

.search-input :deep(.q-field__control) {
  color: #e7edf5;
  background: #0d1621;
}

.search-input :deep(.q-field__native),
.search-input :deep(.q-field__prepend) {
  color: #b8c3d1;
}

.toolbar-button {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 8px;
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

@media (max-width: 900px) {
  .workspace-panels {
    display: flex;
    height: auto;
    overflow: visible;
    flex-direction: column;
    gap: 12px;
  }

  .workspace-panel {
    width: 100%;
    min-height: 420px;
  }

  .resize-handle {
    display: none;
  }
}
</style>

<style>
body.is-resizing-columns {
  cursor: col-resize;
  user-select: none;
}

body.is-resizing-rows {
  cursor: row-resize;
  user-select: none;
}
</style>
