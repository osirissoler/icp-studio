<template>
  <q-dialog v-model="dialogOpen" maximized transition-show="fade" transition-hide="fade">
    <q-card class="monitor-dialog">
      <q-card-section class="monitor-header">
        <div>
          <strong>Monitoreo de pantallas</strong>
          <small>Cada área conserva su propia pantalla en vivo, contenido activo, orden, controles y desplazamiento.</small>
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
                :label="activeOutputId === output.outputId ? 'Área del operador' : 'Control independiente'"
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
                    <q-btn flat round dense size="xs" icon="keyboard_arrow_up" :disable="!canMoveFrame(output.outputId, -1)" aria-label="Contenido anterior" @mousedown.stop @click.stop="moveFrame(output.outputId, -1)">
                      <q-tooltip>Contenido anterior</q-tooltip>
                    </q-btn>
                    <small v-if="workspace(output.outputId).liveItem && liveFrame(output.outputId)">
                      {{ workspace(output.outputId).liveFrameIndex + 1 }} de {{ workspace(output.outputId).liveItem?.frames.length }}
                    </small>
                    <q-badge v-if="liveFrame(output.outputId)" color="primary" label="Seleccionado" />
                    <q-btn flat round dense size="xs" icon="keyboard_arrow_down" :disable="!canMoveFrame(output.outputId, 1)" aria-label="Contenido siguiente" @mousedown.stop @click.stop="moveFrame(output.outputId, 1)">
                      <q-tooltip>Contenido siguiente</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      size="xs"
                      icon="delete_sweep"
                      color="red-4"
                      :disable="!workspace(output.outputId).liveItem"
                      @mousedown.stop
                      @click.stop="workspaceStore.clearWorkspaceLive(output.outputId)"
                    >
                      <q-tooltip>Limpiar esta salida</q-tooltip>
                    </q-btn>
                  </span>
                </header>

                <div
                  v-if="section === 'screen'"
                  class="technical-screen"
                  :class="{
                    'technical-screen--activity':
                      workspace(output.outputId).liveItem?.type === 'activity' ||
                      Boolean(liveFrame(output.outputId)?.roulette || liveFrame(output.outputId)?.timeTool),
                  }"
                  :style="[surfaceStyle, contentLayoutStyle]"
                >
                  <template v-if="workspace(output.outputId).liveItem && liveFrame(output.outputId)">
                    <ActivityProjectionView
                      v-if="workspace(output.outputId).liveItem?.type === 'activity' && liveFrame(output.outputId)?.activity"
                      :activity="liveFrame(output.outputId)!.activity!"
                      compact
                    />

                    <RouletteWheel
                      v-else-if="workspace(output.outputId).liveItem?.type === 'game' && liveFrame(output.outputId)?.roulette"
                      :roulette="liveFrame(output.outputId)!.roulette!"
                      compact
                      play-sounds
                      show-timer
                    />

                    <TimeToolDisplay
                      v-else-if="workspace(output.outputId).liveItem?.type === 'time-tool' && liveFrame(output.outputId)?.timeTool"
                      :tool="liveFrame(output.outputId)!.timeTool!"
                      compact
                      play-sounds
                    />

                    <img
                      v-else-if="liveFrame(output.outputId)?.mediaType === 'image' && liveFrame(output.outputId)?.mediaUrl"
                      :src="liveFrame(output.outputId)?.mediaUrl"
                      :alt="workspace(output.outputId).liveItem?.title"
                      class="live-media"
                    />

                    <div
                      v-else-if="liveFrame(output.outputId)?.mediaType === 'video' && liveFrame(output.outputId)?.mediaUrl"
                      class="live-video"
                    >
                      <video
                        :key="liveFrame(output.outputId)?.id"
                        :src="liveFrame(output.outputId)?.mediaUrl"
                        class="live-media"
                        muted
                        preload="metadata"
                      />
                      <div class="media-playback-controls">
                        <q-btn
                          flat
                          round
                          dense
                          size="sm"
                          :icon="workspace(output.outputId).mediaPlayback.isPlaying ? 'pause' : 'play_arrow'"
                          color="primary"
                          @click="toggleMedia(output.outputId)"
                        />
                        <small>{{ workspace(output.outputId).mediaPlayback.isPlaying ? 'Reproduciendo' : 'Pausado' }}</small>
                      </div>
                    </div>

                    <div
                      v-else-if="liveFrame(output.outputId)?.mediaType === 'audio' && liveFrame(output.outputId)?.mediaUrl"
                      class="live-audio"
                    >
                      <q-icon name="album" size="52px" />
                      <strong>{{ workspace(output.outputId).liveItem?.title }}</strong>
                      <div class="media-playback-controls">
                        <q-btn
                          flat
                          round
                          dense
                          size="sm"
                          :icon="workspace(output.outputId).mediaPlayback.isPlaying ? 'pause' : 'play_arrow'"
                          color="primary"
                          @click="toggleMedia(output.outputId)"
                        />
                        <small>{{ workspace(output.outputId).mediaPlayback.isPlaying ? 'Reproduciendo' : 'Pausado' }}</small>
                      </div>
                    </div>

                    <DocumentViewer
                      v-else-if="
                        liveFrame(output.outputId)?.mediaType === 'document' &&
                        liveFrame(output.outputId)?.mediaUrl &&
                        liveFrame(output.outputId)?.documentFormat
                      "
                      :url="liveFrame(output.outputId)?.mediaUrl ?? ''"
                      :format="liveFrame(output.outputId)?.documentFormat ?? 'pdf'"
                      :page-index="liveFrame(output.outputId)?.pageIndex ?? 0"
                    />

                    <FittedTechnicalText
                      v-else
                      :text="liveDisplayText(output.outputId)"
                      :min-size="10"
                      :max-size="26"
                    />

                    <span
                      v-if="
                        liveFrame(output.outputId) &&
                        workspace(output.outputId).liveItem?.type !== 'activity' &&
                        !liveFrame(output.outputId)?.roulette &&
                        !liveFrame(output.outputId)?.timeTool
                      "
                      class="technical-selection"
                    >
                      {{ liveFrame(output.outputId)?.label }} · Seleccionado
                    </span>

                    <span
                      v-if="
                        !liveFrame(output.outputId)?.mediaType &&
                        workspace(output.outputId).liveItem?.type !== 'activity' &&
                        !liveFrame(output.outputId)?.roulette &&
                        !liveFrame(output.outputId)?.timeTool
                      "
                      class="screen-footer"
                    >
                      {{ workspace(output.outputId).liveItem?.footer }}
                    </span>
                  </template>

                  <template v-else>
                    <q-icon name="live_tv" size="42px" />
                    <span>Sin contenido en vivo</span>
                  </template>
                </div>

                <div v-else class="active-content-shell" :style="activeContentStyle">
                  <div v-if="workspace(output.outputId).liveItem" class="active-content-list">
                    <div class="active-content-title-row">
                      <div class="active-content-title">{{ workspace(output.outputId).liveItem?.title }}</div>

                      <div
                        v-if="workspace(output.outputId).liveItem?.type === 'game' && liveFrame(output.outputId)?.roulette"
                        class="tool-actions"
                      >
                        <q-toggle
                          :model-value="liveFrame(output.outputId)?.roulette?.timedSpin ?? false"
                          dark
                          dense
                          size="xs"
                          color="primary"
                          label="Tiempo"
                          :disable="liveFrame(output.outputId)?.roulette?.spinning"
                          @update:model-value="workspaceStore.setWorkspaceRouletteTimed(output.outputId, Boolean($event))"
                        />
                        <q-input
                          v-if="liveFrame(output.outputId)?.roulette?.timedSpin"
                          :model-value="rouletteSeconds(output.outputId)"
                          dark
                          outlined
                          dense
                          type="number"
                          min="1"
                          max="600"
                          suffix="seg"
                          :disable="liveFrame(output.outputId)?.roulette?.spinning"
                          @update:model-value="setRouletteSeconds(output.outputId, $event)"
                        />
                        <q-btn
                          v-if="!liveFrame(output.outputId)?.roulette?.spinning"
                          unelevated
                          no-caps
                          dense
                          size="sm"
                          color="primary"
                          icon="play_arrow"
                          label="Girar"
                          :disable="(liveFrame(output.outputId)?.roulette?.options.length ?? 0) < 2"
                          @click="workspaceStore.spinWorkspaceRoulette(output.outputId)"
                        />
                        <q-btn
                          v-else
                          unelevated
                          no-caps
                          dense
                          size="sm"
                          color="red-6"
                          icon="stop"
                          label="Detener"
                          @click="workspaceStore.stopWorkspaceRoulette(output.outputId)"
                        />
                        <q-btn flat round dense size="sm" icon="restart_alt" @click="workspaceStore.resetWorkspaceRoulette(output.outputId)">
                          <q-tooltip>Reiniciar ruleta</q-tooltip>
                        </q-btn>
                      </div>

                      <div
                        v-else-if="workspace(output.outputId).liveItem?.type === 'time-tool' && liveFrame(output.outputId)?.timeTool"
                        class="tool-actions"
                      >
                        <q-badge color="blue-grey-8" :label="timeToolModeLabel(output.outputId)" />
                        <template v-if="liveFrame(output.outputId)?.timeTool?.mode !== 'clock'">
                          <q-btn
                            v-if="!liveFrame(output.outputId)?.timeTool?.running"
                            unelevated
                            no-caps
                            dense
                            size="sm"
                            color="primary"
                            icon="play_arrow"
                            label="Iniciar"
                            @click="workspaceStore.startWorkspaceTimeTool(output.outputId)"
                          />
                          <q-btn
                            v-else
                            unelevated
                            no-caps
                            dense
                            size="sm"
                            color="orange-7"
                            icon="pause"
                            label="Pausar"
                            @click="workspaceStore.pauseWorkspaceTimeTool(output.outputId)"
                          />
                          <q-btn flat round dense size="sm" icon="restart_alt" @click="workspaceStore.resetWorkspaceTimeTool(output.outputId)">
                            <q-tooltip>Reiniciar</q-tooltip>
                          </q-btn>
                        </template>
                        <q-badge v-else color="positive" label="Funcionando" />
                      </div>
                    </div>

                    <button
                      v-for="(frame, frameIndex) in workspace(output.outputId).liveItem?.frames ?? []"
                      :key="frame.id"
                      type="button"
                      class="active-content-row"
                      :class="{ 'active-content-row--selected': workspace(output.outputId).liveFrameIndex === frameIndex }"
                      @click="selectFrame(output.outputId, frameIndex)"
                    >
                      <span class="active-content-position">{{ frameIndex + 1 }}</span>
                      <span class="active-content-copy">
                        <strong v-if="workspace(output.outputId).liveItem?.type === 'bible'" class="active-content-inline">
                          {{ displayFrameLabel(output.outputId, frame) }}. {{ frame.text }}
                        </strong>
                        <template v-else>
                          <strong>{{ displayFrameLabel(output.outputId, frame) }}</strong>
                          <small>{{ frame.text || frameContentLabel(frame) }}</small>
                        </template>
                      </span>
                      <q-icon v-if="workspace(output.outputId).liveFrameIndex === frameIndex" name="radio_button_checked" color="light-blue-3" />
                    </button>
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
import ActivityProjectionView from '../ActivityProjectionView.vue';
import DocumentViewer from '../DocumentViewer.vue';
import FittedTechnicalText from '../FittedTechnicalText.vue';
import RouletteWheel from '../RouletteWheel.vue';
import TimeToolDisplay from '../TimeToolDisplay.vue';
import type { PresentationFrame, ServicePresentationItem } from '../../shared/presentation';
import { useProjectionSettingsStore } from '../../stores/projection-settings';
import { useProjectionWorkspaceStore } from '../../stores/projection-workspace-store';

type MonitorSection = 'screen' | 'content';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const workspaceStore = useProjectionWorkspaceStore();
const projectionSettings = useProjectionSettingsStore();
const { activeOutputId, outputs } = storeToRefs(workspaceStore);
const { activeContent, surfaceStyle, contentLayoutStyle } = storeToRefs(projectionSettings);
const sectionOrders = reactive<Record<string, MonitorSection[]>>({});
const draggingSections = reactive<Record<string, MonitorSection | null>>({});

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const activeContentStyle = computed<Record<string, string>>(() => ({
  '--active-content-background': activeContent.value.activeBackgroundColor,
  '--active-content-border': activeContent.value.activeBorderColor,
  '--active-content-text': activeContent.value.activeTextColor,
  '--inactive-content-text': activeContent.value.inactiveTextColor,
  '--active-content-font-size': `${activeContent.value.fontSize}px`,
  '--active-content-lines': String(activeContent.value.visibleLines),
}));

function workspace(outputId: string) {
  return workspaceStore.workspaceSnapshot(outputId);
}

function liveFrame(outputId: string): ServicePresentationItem['frames'][number] | null {
  const snapshot = workspace(outputId);
  return snapshot.liveItem?.frames[snapshot.liveFrameIndex] ?? null;
}

function liveDisplayText(outputId: string): string {
  const snapshot = workspace(outputId);
  const frame = snapshot.liveItem?.frames[snapshot.liveFrameIndex];
  if (!frame) return '';
  if (snapshot.liveItem?.type !== 'bible') return frame.text;
  const verseNumber = frame.label.match(/(\d+:\d+)$/)?.[1] ?? frame.label;
  return `${verseNumber}. ${frame.text}`;
}

function displayFrameLabel(outputId: string, frame: PresentationFrame): string {
  if (workspace(outputId).liveItem?.type !== 'bible') return frame.label;
  return frame.label.match(/(\d+:\d+)$/)?.[1] ?? frame.label;
}

function sectionsFor(outputId: string): MonitorSection[] {
  if (!sectionOrders[outputId]) sectionOrders[outputId] = ['screen', 'content'];
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

function selectFrame(outputId: string, frameIndex: number): void {
  workspaceStore.setWorkspaceLiveFrame(outputId, frameIndex);
}

function moveFrame(outputId: string, direction: -1 | 1): void {
  workspaceStore.moveWorkspaceLiveFrame(outputId, direction);
}

function canMoveFrame(outputId: string, direction: -1 | 1): boolean {
  const snapshot = workspace(outputId);
  const frameCount = snapshot.liveItem?.frames.length ?? 0;
  if (frameCount === 0) return false;
  if (direction < 0) return snapshot.liveFrameIndex > 0;
  return snapshot.liveFrameIndex < frameCount - 1;
}

function toggleMedia(outputId: string): void {
  const snapshot = workspace(outputId);
  workspaceStore.controlWorkspaceMedia(outputId, {
    action: snapshot.mediaPlayback.isPlaying ? 'pause' : 'play',
    time: snapshot.mediaPlayback.time,
  });
}

function rouletteSeconds(outputId: string): number {
  return Math.max(1, Math.round((liveFrame(outputId)?.roulette?.spinDuration ?? 6000) / 1000));
}

function setRouletteSeconds(outputId: string, value: string | number | null): void {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return;
  workspaceStore.setWorkspaceRouletteDuration(outputId, seconds * 1000);
}

function timeToolModeLabel(outputId: string): string {
  const mode = liveFrame(outputId)?.timeTool?.mode;
  if (mode === 'timer') return 'Temporizador';
  if (mode === 'stopwatch') return 'Cronómetro';
  return 'Reloj';
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
.monitor-dialog { display: flex; width: 100vw; height: 100vh; flex-direction: column; overflow: hidden; color: #e8eef6; background: #08111b; }
.monitor-header { display: flex; min-height: 72px; flex: 0 0 72px; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; background: #0f1a27; }
.monitor-header > div { display: flex; flex-direction: column; }
.monitor-header strong { font-size: 18px; }
.monitor-header small { margin-top: 3px; color: #8193a8; }
.monitor-body { display: flex; min-height: 0; flex: 1 1 auto; padding: 16px; overflow: hidden; }
.monitor-grid { display: grid; width: 100%; height: 100%; min-height: 0; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); grid-template-rows: minmax(0, 1fr); gap: 16px; overflow-x: auto; overflow-y: hidden; }
.monitor-card { display: flex; height: 100%; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; color: #dbe7f5; background: #0b131d; border: 1px solid #293b50; border-radius: 10px; }
.monitor-card--active { border-color: #4ba3ff; box-shadow: 0 0 0 1px rgb(75 163 255 / 20%); }
.monitor-card-header { display: flex; height: 48px; flex: 0 0 48px; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 10px; background: #0f1a27; border-bottom: 1px solid #26364b; }
.monitor-card-header > div { display: flex; min-width: 0; flex-direction: column; }
.monitor-card-header strong, .monitor-card-header small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.monitor-card-header small { color: #71859b; font-size: 9px; }
.monitor-sections { display: grid; min-height: 0; flex: 1; grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 8px; overflow: hidden; }
.live-section { display: flex; min-height: 0; flex-direction: column; overflow: hidden; background: #0b131d; border: 1px solid #26364b; border-radius: 8px; }
.section-header { display: flex; min-height: 30px; flex: 0 0 30px; align-items: center; justify-content: space-between; gap: 6px; padding: 0 7px; color: #77869a; background: #121e2c; border-bottom: 1px solid #26364b; font-size: 10px; cursor: grab; user-select: none; }
.section-header > span, .content-actions, .output-label { display: flex; min-width: 0; align-items: center; gap: 5px; }
.content-actions .q-btn { color: #8fbbe0; }
.output-label { max-width: 58%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.live-dot { width: 7px; height: 7px; flex: 0 0 7px; background: #f05252; border-radius: 50%; }
.technical-screen { position: relative; display: flex; min-height: 0; flex: 1; align-items: center; justify-content: center; overflow: hidden; text-align: center; }
.technical-screen--activity { align-items: stretch !important; justify-content: stretch !important; }
.live-media, .live-video { width: 100%; height: 100%; object-fit: contain; }
.live-video { position: relative; display: flex; min-height: 0; align-items: center; justify-content: center; }
.live-audio { position: relative; display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 10px; color: var(--projection-text-color, inherit); }
.media-playback-controls { position: absolute; right: 8px; bottom: 8px; left: 8px; z-index: 4; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 5px 8px; background: rgb(0 0 0 / 55%); border-radius: 8px; }
.media-playback-controls small { color: #dcecff; font-size: 9px; }
.technical-selection { position: absolute; top: 8px; right: 8px; z-index: 3; max-width: 66%; padding: 4px 7px; overflow: hidden; color: var(--projection-text-color, #fff); background: rgb(0 0 0 / 42%); border: 1px solid rgb(255 255 255 / 16%); border-radius: 6px; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.screen-footer { position: absolute; right: 10px; bottom: 8px; left: 10px; z-index: 2; overflow: hidden; color: var(--projection-footer-color, #aebed4); font-size: calc(10px * var(--projection-font-scale, 1)); text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.active-content-shell { min-height: 0; flex: 1; overflow: hidden; }
.active-content-list { height: 100%; padding: 6px; overflow-y: auto; overscroll-behavior: contain; }
.active-content-title-row { position: sticky; top: -6px; z-index: 2; display: flex; min-height: 34px; align-items: center; justify-content: space-between; gap: 6px; padding: 5px; background: #0b131d; }
.active-content-title { min-width: 0; overflow: hidden; color: var(--active-content-text, #dce8f4); font-size: var(--active-content-font-size, 11px); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.tool-actions { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 4px; }
.tool-actions .q-field { width: 82px; }
.tool-actions :deep(.q-field__control) { min-height: 28px; height: 28px; }
.tool-actions :deep(.q-field__native), .tool-actions :deep(.q-field__suffix) { font-size: 9px; }
.active-content-row { display: grid; width: 100%; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 7px; margin-bottom: 3px; padding: 5px; color: var(--inactive-content-text, #93a3b5); background: transparent; border: 1px solid transparent; border-radius: 6px; font-size: var(--active-content-font-size, 11px); text-align: left; cursor: pointer; }
.active-content-row:hover { color: var(--active-content-text, #d9edff); background: color-mix(in srgb, var(--active-content-background, #10243a) 45%, transparent); border-color: color-mix(in srgb, var(--active-content-border, #284b6c) 55%, transparent); }
.active-content-row--selected { color: var(--active-content-text, #f2f8ff); background: var(--active-content-background, #1d4f7d); border-color: var(--active-content-border, #60a5fa); box-shadow: inset 3px 0 var(--active-content-border, #60a5fa); }
.active-content-position { display: grid; width: 22px; height: 22px; place-items: center; color: var(--active-content-text, #93c5fd); background: color-mix(in srgb, var(--active-content-background, #172d49) 72%, #000); border-radius: 5px; font-size: 9px; }
.active-content-copy { display: flex; min-width: 0; flex-direction: column; }
.active-content-row strong, .active-content-row small { overflow: hidden; text-overflow: ellipsis; }
.active-content-row strong { display: -webkit-box; font-size: inherit; line-height: 1.2; -webkit-box-orient: vertical; -webkit-line-clamp: var(--active-content-lines, 2); }
.active-content-row small { display: -webkit-box; margin-top: 1px; color: inherit; font-size: .86em; line-height: 1.2; opacity: .75; -webkit-box-orient: vertical; -webkit-line-clamp: var(--active-content-lines, 2); }
.active-content-inline { white-space: normal; }
.active-content-empty { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 7px; color: var(--inactive-content-text, #66758a); font-size: var(--active-content-font-size, 11px); }
.monitor-empty { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: #76899e; }
@media (max-width: 780px) { .monitor-grid { grid-template-columns: minmax(360px, 1fr); grid-auto-columns: minmax(360px, 1fr); grid-auto-flow: column; } }
</style>
