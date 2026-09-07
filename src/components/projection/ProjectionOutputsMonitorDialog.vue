<template>
  <q-dialog v-model="dialogOpen" maximized transition-show="fade" transition-hide="fade">
    <q-card class="monitor-dialog">
      <q-card-section class="monitor-header">
        <div>
          <strong>Monitoreo de pantallas</strong>
          <small>Cada área conserva su propia pantalla en vivo, contenido activo, orden y desplazamiento.</small>
        </div>
        <q-btn flat round icon="close" color="blue-grey-3" @click="dialogOpen = false" />
      </q-card-section>

      <q-separator dark />

      <q-card-section class="monitor-body">
        <div v-if="outputs.length === 0" class="monitor-empty">
          <q-icon name="desktop_access_disabled" size="48px" />
          <strong>No hay áreas de proyección activas.</strong>
        </div>

        <div v-else class="monitor-grid">
          <article
            v-for="output in outputs"
            :key="output.outputId"
            class="monitor-card"
            :class="{ 'monitor-card--active': activeOutputId === output.outputId }"
          >
            <header class="monitor-card-header">
              <div>
                <strong>{{ output.name }}</strong>
                <small>{{ displaySummary(output.displayIds) }}</small>
              </div>
              <q-badge
                :color="activeOutputId === output.outputId ? 'primary' : 'blue-grey-8'"
                :label="activeOutputId === output.outputId ? 'Área del operador' : 'Monitoreando'"
              />
            </header>

            <div class="monitor-sections">
              <section
                v-for="section in sectionsFor(output.outputId)"
                :key="section"
                class="live-section"
                @dragover.prevent
                @drop="dropSection(output.outputId, section)"
              >
                <header
                  class="section-header"
                  draggable="true"
                  @dragstart="startSectionDrag(output.outputId, section)"
                  @dragend="endSectionDrag(output.outputId)"
                >
                  <span>
                    <q-icon name="drag_indicator" />
                    {{ sectionTitle(section) }}
                  </span>

                  <span v-if="section === 'screen'" class="output-label">
                    <span class="live-dot"></span>
                    {{ workspace(output.outputId).liveItem?.title || 'Sin contenido' }}
                  </span>

                  <span v-else class="content-actions">
                    <small v-if="workspace(output.outputId).liveItem && liveFrame(output.outputId)">
                      {{ workspace(output.outputId).liveFrameIndex + 1 }} de
                      {{ workspace(output.outputId).liveItem?.frames.length }}
                    </small>
                    <q-badge
                      v-if="liveFrame(output.outputId)"
                      color="primary"
                      label="Seleccionado"
                    />
                  </span>
                </header>

                <div v-if="section === 'screen'" class="technical-screen">
                  <template v-if="workspace(output.outputId).liveItem && liveFrame(output.outputId)">
                    <img
                      v-if="liveFrame(output.outputId)?.mediaType === 'image' && liveFrame(output.outputId)?.mediaUrl"
                      :src="liveFrame(output.outputId)?.mediaUrl"
                      :alt="workspace(output.outputId).liveItem?.title"
                      class="live-media"
                    />

                    <div
                      v-else-if="liveFrame(output.outputId)?.mediaType === 'video'"
                      class="media-placeholder"
                    >
                      <q-icon name="movie" size="36px" />
                      <strong>{{ workspace(output.outputId).liveItem?.title }}</strong>
                      <small>Video en vivo</small>
                    </div>

                    <div
                      v-else-if="liveFrame(output.outputId)?.mediaType === 'audio'"
                      class="media-placeholder"
                    >
                      <q-icon name="graphic_eq" size="36px" />
                      <strong>{{ workspace(output.outputId).liveItem?.title }}</strong>
                      <small>Audio en vivo</small>
                    </div>

                    <div
                      v-else-if="liveFrame(output.outputId)?.mediaType === 'document'"
                      class="media-placeholder"
                    >
                      <q-icon name="description" size="36px" />
                      <strong>{{ workspace(output.outputId).liveItem?.title }}</strong>
                      <small>{{ liveFrame(output.outputId)?.label }}</small>
                    </div>

                    <div v-else-if="liveFrame(output.outputId)?.activity" class="text-preview">
                      <strong>{{ liveFrame(output.outputId)?.activity?.title }}</strong>
                      <span>{{ liveFrame(output.outputId)?.activity?.description }}</span>
                    </div>

                    <div v-else-if="liveFrame(output.outputId)?.roulette" class="media-placeholder">
                      <q-icon name="casino" size="36px" />
                      <strong>{{ liveFrame(output.outputId)?.roulette?.title }}</strong>
                      <small>Ruleta en vivo</small>
                    </div>

                    <div v-else-if="liveFrame(output.outputId)?.timeTool" class="media-placeholder">
                      <q-icon name="schedule" size="36px" />
                      <strong>{{ workspace(output.outputId).liveItem?.title }}</strong>
                      <small>Herramienta de tiempo</small>
                    </div>

                    <div v-else class="text-preview">
                      <strong>{{ workspace(output.outputId).liveItem?.title }}</strong>
                      <span>{{ liveFrame(output.outputId)?.text }}</span>
                    </div>
                  </template>

                  <template v-else>
                    <q-icon name="live_tv" size="42px" />
                    <span>Sin contenido en vivo</span>
                  </template>
                </div>

                <div v-else class="active-content-shell">
                  <div v-if="workspace(output.outputId).liveItem" class="active-content-list">
                    <div class="active-content-title">
                      {{ workspace(output.outputId).liveItem?.title }}
                    </div>

                    <div
                      v-for="(frame, frameIndex) in workspace(output.outputId).liveItem?.frames ?? []"
                      :key="frame.id"
                      class="active-content-row"
                      :class="{
                        'active-content-row--selected':
                          workspace(output.outputId).liveFrameIndex === frameIndex,
                      }"
                    >
                      <span class="active-content-position">{{ frameIndex + 1 }}</span>
                      <div>
                        <strong>{{ frame.label }}</strong>
                        <small>{{ frame.text || frameContentLabel(frame) }}</small>
                      </div>
                      <q-icon
                        v-if="workspace(output.outputId).liveFrameIndex === frameIndex"
                        name="radio_button_checked"
                        color="light-blue-3"
                      />
                    </div>
                  </div>

                  <div v-else class="active-content-empty">
                    <q-icon name="playlist_remove" />
                    <span>El contenido activo aparecerá aquí.</span>
                  </div>
                </div>
              </section>
            </div>
          </article>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import type { PresentationFrame, ServicePresentationItem } from '../../shared/presentation';
import { useProjectionWorkspaceStore } from '../../stores/projection-workspace-store';

type MonitorSection = 'screen' | 'content';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const workspaceStore = useProjectionWorkspaceStore();
const { activeOutputId, outputs } = storeToRefs(workspaceStore);
const sectionOrders = reactive<Record<string, MonitorSection[]>>({});
const draggingSections = reactive<Record<string, MonitorSection | null>>({});

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

function workspace(outputId: string) {
  return workspaceStore.workspaceSnapshot(outputId);
}

function liveFrame(outputId: string): ServicePresentationItem['frames'][number] | null {
  const snapshot = workspace(outputId);
  return snapshot.liveItem?.frames[snapshot.liveFrameIndex] ?? null;
}

function sectionsFor(outputId: string): MonitorSection[] {
  if (!sectionOrders[outputId]) {
    sectionOrders[outputId] = ['screen', 'content'];
  }
  return sectionOrders[outputId];
}

function sectionTitle(section: MonitorSection): string {
  return section === 'screen' ? 'Pantalla en vivo' : 'Contenido activo';
}

function startSectionDrag(outputId: string, section: MonitorSection): void {
  draggingSections[outputId] = section;
}

function endSectionDrag(outputId: string): void {
  draggingSections[outputId] = null;
}

function dropSection(outputId: string, target: MonitorSection): void {
  const dragging = draggingSections[outputId];
  if (!dragging || dragging === target) {
    draggingSections[outputId] = null;
    return;
  }

  const order = sectionsFor(outputId);
  const draggingIndex = order.indexOf(dragging);
  const targetIndex = order.indexOf(target);
  if (draggingIndex < 0 || targetIndex < 0) return;

  const next = [...order];
  next[draggingIndex] = target;
  next[targetIndex] = dragging;
  sectionOrders[outputId] = next;
  draggingSections[outputId] = null;
}

function frameContentLabel(frame: PresentationFrame): string {
  if (frame.mediaType === 'image') return 'Imagen';
  if (frame.mediaType === 'video') return 'Video';
  if (frame.mediaType === 'audio') return 'Audio';
  if (frame.mediaType === 'document') return 'Documento';
  if (frame.activity) return 'Actividad';
  if (frame.roulette) return 'Ruleta';
  if (frame.timeTool) return 'Herramienta de tiempo';
  return '';
}

function displaySummary(displayIds: number[]): string {
  if (displayIds.length === 1) return `1 pantalla · ID ${displayIds[0]}`;
  return `${displayIds.length} pantallas · ${displayIds.map((id) => `ID ${id}`).join(', ')}`;
}
</script>

<style scoped>
.monitor-dialog {
  height: 100vh;
  color: #e8eef6;
  background: #08111b;
}

.monitor-header {
  display: flex;
  height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: #0f1a27;
}

.monitor-header > div {
  display: flex;
  flex-direction: column;
}

.monitor-header strong {
  font-size: 18px;
}

.monitor-header small {
  margin-top: 3px;
  color: #8193a8;
}

.monitor-body {
  height: calc(100vh - 73px);
  padding: 16px;
  overflow: auto;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  grid-auto-rows: 620px;
  align-items: start;
  gap: 16px;
}

.monitor-card {
  display: flex;
  height: 620px;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  color: #dbe7f5;
  background: #0b131d;
  border: 1px solid #293b50;
  border-radius: 10px;
}

.monitor-card--active {
  border-color: #4ba3ff;
  box-shadow: 0 0 0 1px rgb(75 163 255 / 20%);
}

.monitor-card-header {
  display: flex;
  height: 48px;
  flex: 0 0 48px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  background: #0f1a27;
  border-bottom: 1px solid #26364b;
}

.monitor-card-header > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.monitor-card-header strong,
.monitor-card-header small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-card-header small {
  color: #71859b;
  font-size: 9px;
}

.monitor-sections {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  overflow: hidden;
}

.live-section {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: #0b131d;
  border: 1px solid #26364b;
  border-radius: 8px;
}

.section-header {
  display: flex;
  min-height: 30px;
  flex: 0 0 30px;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 7px;
  color: #77869a;
  background: #121e2c;
  border-bottom: 1px solid #26364b;
  font-size: 10px;
  cursor: grab;
  user-select: none;
}

.section-header > span,
.content-actions,
.output-label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.output-label {
  max-width: 58%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  background: #f05252;
  border-radius: 50%;
}

.technical-screen {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #d9e5f3;
  background: #03070c;
  text-align: center;
}

.live-media {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.media-placeholder,
.text-preview,
.active-content-empty {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  padding: 16px;
  color: #91a5ba;
  text-align: center;
}

.media-placeholder strong,
.text-preview strong {
  max-width: 92%;
  overflow: hidden;
  color: #f2f7fc;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-placeholder small {
  color: #70849a;
  font-size: 9px;
}

.text-preview span {
  display: -webkit-box;
  max-width: 92%;
  overflow: hidden;
  color: #d4dfeb;
  font-size: 13px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}

.active-content-shell {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.active-content-list {
  height: 100%;
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.active-content-title {
  position: sticky;
  top: -6px;
  z-index: 1;
  padding: 6px 5px 8px;
  overflow: hidden;
  color: #dce8f4;
  background: #0b131d;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-content-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  padding: 5px;
  color: #93a3b5;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
}

.active-content-row--selected {
  color: #f2f8ff;
  background: #1d4f7d;
  border-color: #60a5fa;
  box-shadow: inset 3px 0 #60a5fa;
}

.active-content-position {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: #93c5fd;
  background: #172d49;
  border-radius: 5px;
  font-size: 9px;
}

.active-content-row > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.active-content-row strong,
.active-content-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-content-row strong {
  font-size: 10px;
}

.active-content-row small {
  margin-top: 1px;
  color: #75889d;
  font-size: 9px;
}

.active-content-row--selected small {
  color: #d5e8ff;
}

.active-content-empty {
  color: #66758a;
  font-size: 10px;
}

.monitor-empty {
  display: flex;
  min-height: 50vh;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: #76899e;
}

@media (max-width: 780px) {
  .monitor-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: 620px;
  }
}
</style>
