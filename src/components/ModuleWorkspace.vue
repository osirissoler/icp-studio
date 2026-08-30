<template>
  <section class="workspace-shell">
    <div
      ref="workspaceElement"
      class="workspace-panels"
      :style="workspaceGridStyle"
    >
      <article
        v-for="(panel, index) in panels"
        :key="panel.id"
        class="workspace-panel"
        :class="[
          `workspace-panel--slot-${index + 1}`,
          { 'workspace-panel--dragging': draggingPanelId === panel.id },
        ]"
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
            <slot v-if="$slots[panel.id]" :name="panel.id" />

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

            <template v-else-if="panel.id === 'service'">
              <div class="screen-label">
                <span>Orden del servicio</span>
                <q-icon name="playlist_play" />
              </div>

              <div class="empty-state">
                <q-icon name="playlist_add" size="44px" />
                <div class="empty-title">Servicio vacío</div>
                <div class="empty-text">
                  Los elementos agregados para el culto aparecerán aquí.
                </div>
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
        class="resize-handle resize-handle--left"
        title="Arrastra para cambiar el ancho"
        @pointerdown="startColumnResize($event, 0)"
      >
        <span></span>
      </div>

      <div
        class="resize-handle resize-handle--right"
        title="Arrastra para cambiar el ancho"
        @pointerdown="startColumnResize($event, 1)"
      >
        <span></span>
      </div>

      <div
        class="resize-handle resize-handle--center"
        title="Arrastra para cambiar la altura"
        @pointerdown="startRowResize"
      >
        <span></span>
      </div>
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

type PanelId = 'search' | 'service' | 'preview' | 'live';

interface WorkspacePanel {
  id: PanelId;
  title: string;
  icon: string;
}

const searchText = ref('');
const draggingPanelId = ref<PanelId | null>(null);
const workspaceElement = ref<HTMLElement | null>(null);
const columnSizes = reactive<[number, number, number]>([1.35, 1, 1]);
const topRowPercent = ref(50);
const panels = ref<WorkspacePanel[]>([
  { id: 'search', title: 'Búsqueda y contenido', icon: 'search' },
  { id: 'preview', title: 'Previsualización', icon: 'preview' },
  { id: 'service', title: 'Servicio', icon: 'playlist_play' },
  { id: 'live', title: 'En vivo', icon: 'sensors' },
]);

const props = defineProps<Props>();

const searchPlaceholder = computed(() => `Buscar en ${props.title.toLowerCase()}...`);
const isSongModule = computed(() => props.title === 'Alabanzas');
const workspaceGridStyle = computed(() => ({
  gridTemplateColumns: `minmax(220px, ${columnSizes[0]}fr) 12px minmax(220px, ${columnSizes[1]}fr) 12px minmax(220px, ${columnSizes[2]}fr)`,
  gridTemplateRows: `minmax(0, ${topRowPercent.value}fr) 12px minmax(0, ${100 - topRowPercent.value}fr)`,
}));

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

function startColumnResize(event: PointerEvent, leftIndex: 0 | 1): void {
  const containerWidth = workspaceElement.value?.clientWidth;

  if (!containerWidth) {
    return;
  }

  const rightIndex = (leftIndex + 1) as 1 | 2;
  const startX = event.clientX;
  const initialLeft = columnSizes[leftIndex];
  const initialRight = columnSizes[rightIndex];
  const combinedSize = initialLeft + initialRight;
  const totalSize = columnSizes[0] + columnSizes[1] + columnSizes[2];
  const minimumSize = Math.max(0.45, (220 / containerWidth) * totalSize);

  beginResize(
    event,
    (moveEvent) => {
      const sizeDifference =
        ((moveEvent.clientX - startX) / containerWidth) * totalSize;
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

function startRowResize(event: PointerEvent): void {
  const containerHeight = workspaceElement.value?.clientHeight;

  if (!containerHeight) {
    return;
  }

  const startY = event.clientY;
  const initialTop = topRowPercent.value;

  beginResize(
    event,
    (moveEvent) => {
      const difference =
        ((moveEvent.clientY - startY) / containerHeight) * 100;
      topRowPercent.value = Math.min(75, Math.max(25, initialTop + difference));
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
  grid-template-columns: minmax(220px, 1.35fr) 12px minmax(220px, 1fr) 12px minmax(220px, 1fr);
  grid-template-rows: minmax(0, 1fr) 12px minmax(0, 1fr);
  gap: 0;
  overflow: hidden;
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

.resize-handle--left {
  grid-column: 2;
  grid-row: 1 / 4;
  cursor: col-resize;
}

.resize-handle--right {
  grid-column: 4;
  grid-row: 1 / 4;
  cursor: col-resize;
}

.resize-handle--center {
  grid-column: 3;
  grid-row: 2;
  cursor: row-resize;
}

.resize-handle--left span,
.resize-handle--right span {
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
