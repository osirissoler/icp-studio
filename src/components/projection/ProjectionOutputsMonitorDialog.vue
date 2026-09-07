<template>
  <q-dialog v-model="dialogOpen" maximized transition-show="fade" transition-hide="fade">
    <q-card class="monitor-dialog">
      <q-card-section class="monitor-header">
        <div>
          <strong>Monitoreo de pantallas</strong>
          <small>Contenido en vivo de cada área de proyección.</small>
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
          <button
            v-for="output in outputs"
            :key="output.outputId"
            type="button"
            class="monitor-card"
            :class="{ 'monitor-card--active': activeOutputId === output.outputId }"
            @click="selectOutput(output.outputId)"
          >
            <div class="monitor-card-header">
              <div>
                <strong>{{ output.name }}</strong>
                <small>{{ displayLabel(output.displayId) }}</small>
              </div>
              <q-badge
                :color="activeOutputId === output.outputId ? 'primary' : 'blue-grey-8'"
                :label="activeOutputId === output.outputId ? 'Área activa' : 'Cambiar a esta área'"
              />
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

            <div class="monitor-card-footer">
              <span>
                {{ workspace(output.outputId).serviceItems.length }} elemento{{ workspace(output.outputId).serviceItems.length === 1 ? '' : 's' }} en servicio
              </span>
              <strong>{{ workspace(output.outputId).liveItem?.title || 'Nada en vivo' }}</strong>
            </div>
          </button>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import type { ServicePresentationItem } from '../../shared/presentation';
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
.monitor-body { padding: 22px; }
.monitor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px; }
.monitor-card { display: flex; min-width: 0; flex-direction: column; padding: 0; overflow: hidden; color: #dbe7f5; background: #101b28; border: 1px solid #293b50; border-radius: 13px; text-align: left; cursor: pointer; transition: border-color .16s ease, transform .16s ease; }
.monitor-card:hover { transform: translateY(-1px); border-color: #47759f; }
.monitor-card--active { border-color: #4ba3ff; box-shadow: 0 0 0 1px rgba(75, 163, 255, .2); }
.monitor-card-header, .monitor-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; }
.monitor-card-header > div { display: flex; min-width: 0; flex-direction: column; }
.monitor-card-header small, .monitor-card-footer span { color: #71859b; font-size: 10px; }
.screen-preview { position: relative; display: grid; width: 100%; aspect-ratio: 16 / 9; place-items: center; overflow: hidden; background: #03070c; border-top: 1px solid #24354a; border-bottom: 1px solid #24354a; }
.screen-preview img { width: 100%; height: 100%; object-fit: contain; }
.media-placeholder, .screen-empty, .text-preview { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 9px; padding: 22px; color: #91a5ba; text-align: center; }
.text-preview strong { color: #f2f7fc; font-size: 19px; }
.text-preview span { display: -webkit-box; max-width: 92%; overflow: hidden; color: #d4dfeb; font-size: 15px; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 5; }
.monitor-card-footer strong { max-width: 58%; overflow: hidden; color: #cfe8fb; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.monitor-empty { display: flex; min-height: 50vh; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: #76899e; }
@media (max-width: 760px) { .monitor-grid { grid-template-columns: 1fr; } }
</style>
