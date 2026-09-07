<template>
  <div
    class="global-service-panel"
    tabindex="0"
    @keydown.up.prevent="moveServiceSelection(-1)"
    @keydown.down.prevent="moveServiceSelection(1)"
    @keydown.enter.prevent="activateSelectedServiceItem"
  >
    <div class="panel-label">
      <span>Orden del servicio</span>
      <q-chip dense color="blue-grey-9" text-color="blue-grey-2">
        {{ serviceItems.length }}
      </q-chip>
    </div>

    <div class="projection-target">
      <ProjectionOutputSelector v-model="projectionOutputTarget" />
    </div>

    <div v-if="activeOutputName" class="active-area-caption">
      <div class="active-area-copy">
        <q-icon name="desktop_windows" />
        <span>Servicio de <strong>{{ activeOutputName }}</strong></span>
      </div>
      <q-btn
        v-if="outputs.length > 0"
        flat
        round
        dense
        size="xs"
        icon="grid_view"
        color="light-blue-4"
        aria-label="Ver todas las pantallas"
        @click="monitorOpen = true"
      >
        <q-tooltip>Ver contenido en vivo de todas las pantallas</q-tooltip>
      </q-btn>
    </div>

    <div v-if="serviceItems.length" ref="serviceListElement" class="service-list">
      <button
        v-for="(item, index) in serviceItems"
        :key="item.id"
        :data-service-index="index"
        type="button"
        class="service-item"
        :class="{ 'service-item--active': selectedServiceItemId === item.id }"
        @click="selectServiceItem(item.id)"
        @dblclick="activateServiceItem(item.id)"
      >
        <span class="position">{{ index + 1 }}</span>
        <q-icon :name="itemIcon(item.type)" color="blue-grey-5" />
        <strong>{{ item.title }}</strong>
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="close"
          aria-label="Quitar del servicio"
          @click.stop="removeFromService(item.id)"
          @dblclick.stop
          @keydown.stop
        >
          <q-tooltip>Quitar del servicio</q-tooltip>
        </q-btn>
      </button>
    </div>

    <div v-else class="empty-state">
      <q-icon name="playlist_add" size="40px" />
      <strong>Servicio vacío</strong>
      <span v-if="activeOutputName">Agrega elementos al servicio de {{ activeOutputName }}.</span>
      <span v-else>Los elementos agregados aparecerán aquí.</span>
    </div>

    <ProjectionOutputsMonitorDialog v-model="monitorOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import ProjectionOutputSelector from './projection/ProjectionOutputSelector.vue';
import ProjectionOutputsMonitorDialog from './projection/ProjectionOutputsMonitorDialog.vue';
import type { PresentationItemType } from '../shared/presentation';
import type { ProjectionOutputTarget } from '../shared/projection';
import { usePresentationStore } from '../stores/presentation-store';
import { useProjectionWorkspaceStore } from '../stores/projection-workspace-store';

const serviceListElement = ref<HTMLElement | null>(null);
const monitorOpen = ref(false);
const presentationStore = usePresentationStore();
const workspaceStore = useProjectionWorkspaceStore();
const { serviceItems, selectedServiceItemId } = storeToRefs(presentationStore);
const { activeOutputId, activeOutput, outputs } = storeToRefs(workspaceStore);
const { activateServiceItem, removeFromService, selectServiceItem } = presentationStore;

const projectionOutputTarget = ref<ProjectionOutputTarget>(activeOutputId.value);
const activeOutputName = computed(() => activeOutput.value?.name ?? '');
let unsubscribeDisplayStatus: (() => void) | undefined;

watch(
  projectionOutputTarget,
  (outputId) => {
    workspaceStore.switchWorkspace(outputId);
  },
);

watch(activeOutputId, (outputId) => {
  if (projectionOutputTarget.value !== outputId) {
    projectionOutputTarget.value = outputId;
  }
});

function applyDisplayStatus(status: Awaited<ReturnType<NonNullable<typeof window.icpStudio>['displays']['getStatus']>>): void {
  workspaceStore.applyDisplayState(
    status.configuration.independentProjectionEnabled,
    status.activeProjectionOutputs,
  );
  projectionOutputTarget.value = workspaceStore.activeOutputId;
}

async function initializeProjectionAreas(): Promise<void> {
  const status = await window.icpStudio?.displays.getStatus();
  if (status) {
    applyDisplayStatus(status);
  }
  unsubscribeDisplayStatus = window.icpStudio?.displays.onStatusChanged(applyDisplayStatus);
}

function moveServiceSelection(direction: -1 | 1): void {
  if (serviceItems.value.length === 0) {
    return;
  }

  const currentIndex = serviceItems.value.findIndex(
    (item) => item.id === selectedServiceItemId.value,
  );
  const nextIndex =
    currentIndex < 0
      ? 0
      : Math.min(serviceItems.value.length - 1, Math.max(0, currentIndex + direction));
  const nextItem = serviceItems.value[nextIndex];

  if (!nextItem) {
    return;
  }

  selectServiceItem(nextItem.id);

  void nextTick(() => {
    serviceListElement.value
      ?.querySelector<HTMLElement>(`[data-service-index="${nextIndex}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function activateSelectedServiceItem(): void {
  const selectedItem = serviceItems.value.find((item) => item.id === selectedServiceItemId.value);

  if (selectedItem) {
    activateServiceItem(selectedItem.id);
  }
}

function itemIcon(type: PresentationItemType): string {
  const icons: Record<PresentationItemType, string> = {
    bible: 'menu_book',
    song: 'music_note',
    image: 'image',
    video: 'movie',
    audio: 'audio_file',
    document: 'description',
    presentation: 'co_present',
    game: 'sports_esports',
    'time-tool': 'schedule',
    activity: 'event',
  };

  return icons[type];
}

onMounted(() => {
  void initializeProjectionAreas();
});

onBeforeUnmount(() => {
  workspaceStore.saveCurrentWorkspace();
  unsubscribeDisplayStatus?.();
});
</script>

<style scoped>
.global-service-panel {
  display: flex;
  min-height: 100%;
  flex: 1;
  flex-direction: column;
}

.panel-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
  color: #8492a6;
  font-size: 10px;
}

.projection-target {
  margin-bottom: 7px;
}

.active-area-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
  padding: 6px 8px;
  color: #8eb9df;
  background: #0d1d2c;
  border: 1px solid #24425e;
  border-radius: 7px;
  font-size: 9px;
}

.active-area-copy {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.active-area-caption strong { color: #d9efff; }

.service-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.service-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  padding: 6px;
  color: #bdc8d6;
  background: #0d1621;
  border: 1px solid #26364b;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
}

.service-item:hover,
.service-item--active {
  background: #12243a;
  border-color: #3b82f6;
}

.service-item strong {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.position {
  display: flex;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  background: #172d49;
  border-radius: 5px;
  font-size: 10px;
}

.empty-state {
  display: flex;
  min-height: 180px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #66758a;
  text-align: center;
  font-size: 11px;
}
</style>
