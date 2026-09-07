<template>
  <q-dialog v-model="dialogOpen" maximized transition-show="fade" transition-hide="fade">
    <q-card class="monitor-dialog">
      <q-card-section class="monitor-header">
        <div>
          <strong>Monitoreo de pantallas</strong>
          <small>Supervisa simultáneamente lo que está en vivo y el contenido activo de cada área.</small>
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
                <small>{{ displayLabel(output.displayId) }}</small>
              </div>

              <div class="monitor-card-actions">
                <q-badge
                  :color="activeOutputId === output.outputId ? 'primary' : 'blue-grey-8'"
                  :label="activeOutputId === output.outputId ? 'Área del operador' : 'Monitoreando'"
                />
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  icon="open_in_new"
                  color="light-blue-3"
                  @click="selectOutput(output.outputId)"
                >
                  <q-tooltip>Abrir esta área en el operador</q-tooltip>
                </q-btn>
              </div>
            </header>

            <section class="monitor-live-section">
              <div class="section-label">
                <span><q-icon name="live_tv" /> Pantalla en vivo</span>
                <strong>{{ workspace(output.outputId).liveItem?.title || 'Sin contenido' }}</strong>
              </div>

              <div class="screen-preview">
                <template v-if="workspace(output.outputId).liveItem && liveFrame(output.outputId)">
                  <img
                    v-if="liveFrame(output.outputId)?.mediaType === 'image' && liveFrame(output.outputId)?.mediaUrl"
                    :src="liveFrame(output.outputId)?.mediaUrl"
                    :alt="workspace(output.outputId).liveItem?.title"
                  />
                  <div v-else-if="liveFrame(output.outputId)?.mediaType === 'video'" class="media-placeholder">
                    <q-icon name="movie" size="36px" />
                    <span>{{ workspace(output.outputId).liveItem?.title }}</span>
                  </div>
                  <div v-else-if="liveFrame(output.outputId)?.mediaType === 'audio'" class="media-placeholder">
                    <q-icon name="graphic_eq" size="36px" />
                    <span>{{ workspace(output.outputId).liveItem?.title }}</span>
                  </div>
                  <div v-else-if="liveFrame(output.outputId)?.mediaType === 'document'" class="media-placeholder">
                    <q-icon name="description" size="36px" />
                    <span>{{ workspace(output.outputId).liveItem?.title }}</span>
                  </div>
                  <div v-else-if="liveFrame(output.outputId)?.activity" class="text-preview">
                    <strong>{{ liveFrame(output.outputId)?.activity?.title }}</strong>
                    <span>{{ liveFrame(output.outputId)?.activity?.description }}</span>
                  </div>
                  <div v-else-if="liveFrame(output.outputId)?.roulette" class="media-placeholder">
                    <q-icon name="casino" size="36px" />
                    <span>{{ liveFrame(output.outputId)?.roulette?.title }}</span>
                  </div>
                  <div v-else-if="liveFrame(output.outputId)?.timeTool" class="media-placeholder">
                    <q-icon name="schedule" size="36px" />
                    <span>{{ workspace(output.outputId).liveItem?.title }}</span>
                  </div>
                  <div v-else class="text-preview">
                    <strong>{{ workspace(output.outputId).liveItem?.title }}</strong>
                    <span>{{ liveFrame(output.outputId)?.text }}</span>
                  </div>
                </template>

                <template v-else>
                  <div class="screen-empty">
                    <q-icon name="tv_off" size="34px" />
                    <span>Sin contenido en vivo</span>
                  </div>
                </template>
              </div>
            </section>

            <section class="monitor-active-section">
              <div class="section-label">
                <span><q-icon name="view_list" /> Contenido activo</span>
                <strong v-if="workspace(output.outputId).liveItem">
                  {{ workspace(output.outputId).liveFrameIndex + 1 }} / {{ workspace(output.outputId).liveItem?.frames.length }}
                </strong>
              </div>

              <div v-if="workspace(output.outputId).liveItem" class="active-content-list">
                <div class="active-content-title">
                  {{ workspace(output.outputId).liveItem?.title }}
                </div>
                <div
                  v-for="(frame, frameIndex) in workspace(output.outputId).liveItem?.frames ?? []"
                  :key="frame.id"
                  class="active-content-row"
                  :class="{
                    'active-content-row--selected': workspace(output.outputId).liveFrameIndex === frameIndex,
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
                <span>Sin contenido activo</span>
              </div>
            </section>

            <footer class="monitor-card-footer">
              <span>
                {{ workspace(output.outputId).serviceItems.length }} elemento{{ workspace(output.outputId).serviceItems.length === 1 ? '' : 's' }} en servicio
              </span>
              <strong>{{ workspace(output.outputId).liveItem?.title || 'Nada en vivo' }}</strong>
            </footer>
          </article>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import type { PresentationFrame, ServicePresentationItem } from '../../shared/presentation';
import { useProjectionWorkspaceStore } from '../../stores/projection-workspace-store';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const workspaceStore = useProjectionWorkspaceStore();
const { activeOutputId, outputs } = storeToRefs(workspaceStore);

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

function displayLabel(displayId: number): string {
  return `Pantalla ${displayId}`;
}

function selectOutput(outputId: string): void {
  workspaceStore.switchWorkspace(outputId);
}
</script>

<style scoped>
.monitor-dialog { min-height: 100vh; color: #e8eef6; background: #08111b; }
.monitor-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 22px; background: #0f1a27; }
.monitor-header > div { display: flex; flex-direction: column; }
.monitor-header strong { font-size: 18px; }
.monitor-header small { margin-top: 3px; color: #8193a8; }
.monitor-body { height: calc(100vh - 76px); padding: 18px; overflow: auto; }
.monitor-grid { display: grid; min-height: 100%; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 16px; }
.monitor-card { display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; color: #dbe7f5; background: #101b28; border: 1px solid #293b50; border-radius: 13px; text-align: left; }
.monitor-card--active { border-color: #4ba3ff; box-shadow: 0 0 0 1px rgba(75, 163, 255, .2); }
.monitor-card-header, .monitor-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; }
.monitor-card-header > div:first-child { display: flex; min-width: 0; flex-direction: column; }
.monitor-card-header small, .monitor-card-footer span { color: #71859b; font-size: 10px; }
.monitor-card-actions { display: flex; align-items: center; gap: 5px; }
.monitor-live-section, .monitor-active-section { display: flex; min-height: 0; flex-direction: column; border-top: 1px solid #24354a; }
.monitor-live-section { flex: 0 0 auto; }
.monitor-active-section { flex: 1; }
.section-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; color: #7f93a9; background: #0d1722; font-size: 9px; text-transform: uppercase; letter-spacing: .035em; }
.section-label span { display: flex; align-items: center; gap: 5px; }
.section-label strong { max-width: 55%; overflow: hidden; color: #b9d8ef; text-overflow: ellipsis; white-space: nowrap; }
.screen-preview { position: relative; display: grid; width: 100%; aspect-ratio: 16 / 9; place-items: center; overflow: hidden; background: #03070c; border-top: 1px solid #1d2b3b; border-bottom: 1px solid #24354a; }
.screen-preview img { width: 100%; height: 100%; object-fit: contain; }
.media-placeholder, .screen-empty, .text-preview { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 9px; padding: 22px; color: #91a5ba; text-align: center; }
.text-preview strong { color: #f2f7fc; font-size: 18px; }
.text-preview span { display: -webkit-box; max-width: 92%; overflow: hidden; color: #d4dfeb; font-size: 14px; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 5; }
.active-content-list { min-height: 0; flex: 1; padding: 8px; overflow-y: auto; }
.active-content-title { padding: 2px 4px 7px; overflow: hidden; color: #dce8f4; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.active-content-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 7px; margin-bottom: 4px; padding: 6px; color: #93a3b5; background: #0b141e; border: 1px solid transparent; border-radius: 7px; }
.active-content-row--selected { color: #f2f8ff; background: #14304a; border-color: #4ba3ff; box-shadow: inset 3px 0 #4ba3ff; }
.active-content-position { display: grid; width: 22px; height: 22px; place-items: center; color: #8fbbe0; background: #17293a; border-radius: 5px; font-size: 9px; }
.active-content-row > div { display: flex; min-width: 0; flex-direction: column; }
.active-content-row strong, .active-content-row small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.active-content-row strong { font-size: 10px; }
.active-content-row small { margin-top: 1px; color: #75889d; font-size: 9px; }
.active-content-row--selected small { color: #b7d4ec; }
.active-content-empty { display: flex; min-height: 90px; flex: 1; align-items: center; justify-content: center; flex-direction: column; gap: 6px; color: #667a90; font-size: 10px; }
.monitor-card-footer { border-top: 1px solid #24354a; }
.monitor-card-footer strong { max-width: 58%; overflow: hidden; color: #cfe8fb; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.monitor-empty { display: flex; min-height: 50vh; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: #76899e; }
@media (max-width: 760px) { .monitor-grid { grid-template-columns: 1fr; grid-auto-rows: auto; } .monitor-card { min-height: 620px; } }
</style>
