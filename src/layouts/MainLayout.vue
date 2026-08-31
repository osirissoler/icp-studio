<template>
  <q-layout :view="layoutView" class="icp-layout">
    <q-header class="icp-header">
      <q-toolbar class="icp-toolbar">
        <q-btn
          v-if="menuSide === 'left'"
          flat
          round
          dense
          icon="menu"
          aria-label="Mostrar u ocultar menú"
          @click="toggleMenu"
        />

        <div class="brand row items-center no-wrap q-ml-sm">
          <q-icon name="play_circle_outline" size="30px" />
          <span class="brand-name q-ml-sm">ICP Studio</span>
        </div>

        <q-separator dark vertical inset class="q-mx-md gt-sm" />

        <q-btn flat no-caps class="service-selector gt-xs">
          <div class="text-left">
            <div class="service-label">Servicio activo</div>
            <div class="service-name">Culto dominical</div>
          </div>
          <q-icon name="expand_more" size="18px" class="q-ml-sm" />
        </q-btn>

        <div class="header-date gt-md">{{ currentDate }}</div>

        <q-space />

        <button type="button" class="screen-status gt-sm">
          <span class="status-dot"></span>
          <span>
            {{ displays.length }}
            {{ displays.length === 1 ? 'pantalla activa' : 'pantallas activas' }}
          </span>
          <q-icon name="expand_more" size="16px" />

          <q-menu dark class="display-menu">
            <q-list dense style="min-width: 290px">
              <q-item-label header>Pantallas detectadas</q-item-label>
              <q-item v-for="display in displays" :key="display.id">
                <q-item-section avatar>
                  <q-icon
                    :name="display.isPrimary ? 'laptop_mac' : 'connected_tv'"
                    :color="display.isPrimary ? 'blue-grey-4' : 'positive'"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ display.label }}</q-item-label>
                  <q-item-label caption>
                    {{ display.bounds.width }} × {{ display.bounds.height }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge
                    :label="display.isPrimary ? 'Operador' : 'Proyección'"
                    :color="display.isPrimary ? 'blue-grey-7' : 'positive'"
                  />
                </q-item-section>
              </q-item>

              <q-separator dark />
              <q-item clickable v-close-popup @click="openSettings">
                <q-item-section avatar>
                  <q-icon name="settings" />
                </q-item-section>
                <q-item-section>Configurar pantallas</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </button>

        <q-btn
          outline
          no-caps
          icon="smartphone"
          label="Control remoto"
          class="remote-button q-ml-md gt-xs"
        />

        <q-btn
          flat
          round
          dense
          icon="settings"
          aria-label="Configuración"
          class="q-ml-sm"
          @click="openSettings"
        />

        <q-btn
          v-if="menuSide === 'right'"
          flat
          round
          dense
          icon="menu"
          aria-label="Mostrar u ocultar menú"
          class="q-ml-sm"
          @click="toggleMenu"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      :key="menuSide"
      v-model="drawerOpen"
      show-if-above
      bordered
      dark
      :side="menuSide"
      :width="238"
      :mini-width="72"
      :mini="menuCollapsed"
      class="icp-drawer"
    >
      <q-scroll-area class="fit">
        <q-list padding class="navigation-list">
          <template v-for="item in orderedNavigationItems" :key="item.id">
            <q-item
              clickable
              v-ripple
              draggable="true"
              :to="item.to"
              exact
              active-class="navigation-item--active"
              class="navigation-item"
              :class="{ 'navigation-item--dragging': draggingNavigationId === item.id }"
              @dragstart="startNavigationDrag($event, item.id)"
              @dragend="stopNavigationDrag"
              @dragover.prevent
              @drop.prevent="dropNavigationItem(item.id)"
            >
              <q-item-section avatar>
                <q-icon :name="item.icon" size="23px" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ item.label }}</q-item-label>
              </q-item-section>

              <q-item-section v-if="!menuCollapsed" side class="navigation-drag-handle">
                <q-icon name="drag_indicator" size="17px" />
              </q-item-section>

              <q-tooltip
                v-if="menuCollapsed"
                :anchor="menuTooltipAnchor"
                :self="menuTooltipSelf"
                :offset="[12, 0]"
              >
                {{ item.label }}
              </q-tooltip>
            </q-item>
          </template>

          <q-separator dark class="navigation-separator" />

          <q-item clickable v-ripple class="navigation-item" @click="openSettings">
            <q-item-section avatar>
              <q-icon name="settings" size="23px" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Configuración</q-item-label>
            </q-item-section>

            <q-tooltip
              v-if="menuCollapsed"
              :anchor="menuTooltipAnchor"
              :self="menuTooltipSelf"
              :offset="[12, 0]"
            >
              Configuración
            </q-tooltip>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component, route }">
        <keep-alive>
          <component :is="Component" :key="route.path" />
        </keep-alive>
      </router-view>
    </q-page-container>

    <q-dialog v-model="settingsDialogOpen">
      <q-card class="settings-dialog-card">
        <q-card-section class="settings-dialog-header">
          <div class="row items-center no-wrap">
            <q-icon name="settings" size="21px" color="primary" />
            <span>Configuración</span>
          </div>
          <q-space />
          <q-btn v-close-popup flat round dense icon="close" aria-label="Cerrar configuración" />
        </q-card-section>
        <q-separator dark />
        <q-card-section class="settings-dialog-content">
          <SettingsPage />
        </q-card-section>
      </q-card>
    </q-dialog>

    <PersistentMediaPlayer />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import PersistentMediaPlayer from '../components/PersistentMediaPlayer.vue';
import SettingsPage from '../pages/SettingsPage.vue';
import type { DisplayInfo } from '../shared/display';
import type { NavigationItemId } from '../shared/navigation';
import { useNavigationSettingsStore } from '../stores/navigation-settings';

const $q = useQuasar();
const navigationSettings = useNavigationSettingsStore();
const {
  side: menuSide,
  collapsed: menuCollapsed,
  orderedItems: orderedNavigationItems,
} = storeToRefs(navigationSettings);
const drawerOpen = ref(true);
const displays = ref<DisplayInfo[]>([]);
const settingsDialogOpen = ref(false);
const draggingNavigationId = ref<NavigationItemId | null>(null);
let unsubscribeDisplays: (() => void) | undefined;

const layoutView = computed(() => (menuSide.value === 'right' ? 'hHh lpR lFf' : 'hHh Lpr lFf'));
const menuTooltipAnchor = computed(() =>
  menuSide.value === 'right' ? 'center left' : 'center right',
);
const menuTooltipSelf = computed(() =>
  menuSide.value === 'right' ? 'center right' : 'center left',
);

const currentDate = computed(() => {
  const formattedDate = new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
});

function openSettings(): void {
  settingsDialogOpen.value = true;
}

onMounted(async () => {
  displays.value = (await window.icpStudio?.displays.list()) ?? [];
  unsubscribeDisplays = window.icpStudio?.displays.onChanged((nextDisplays) => {
    displays.value = nextDisplays;
  });
});

onBeforeUnmount(() => {
  unsubscribeDisplays?.();
});

function toggleMenu() {
  if ($q.screen.lt.md) {
    drawerOpen.value = !drawerOpen.value;
    return;
  }

  navigationSettings.toggleCollapsed();
}

function startNavigationDrag(event: DragEvent, itemId: NavigationItemId): void {
  draggingNavigationId.value = itemId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
  }
}

function stopNavigationDrag(): void {
  draggingNavigationId.value = null;
}

function dropNavigationItem(targetId: NavigationItemId): void {
  const sourceId = draggingNavigationId.value;
  if (sourceId) navigationSettings.moveItem(sourceId, targetId);
  stopNavigationDrag();
}
</script>

<style scoped>
.icp-layout {
  background: #f4f6f8;
}

.settings-dialog-card {
  display: flex;
  width: min(90vw, 1800px);
  max-width: 90vw;
  height: 86vh;
  max-height: 86vh;
  flex-direction: column;
  overflow: hidden;
  color: #e8eef6;
  background: #0c131d;
  border: 1px solid #2a394d;
  border-radius: 12px;
}

.settings-dialog-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  color: #dce7f4;
  font-size: 14px;
  font-weight: 600;
}

.settings-dialog-header .row {
  gap: 8px;
}

.settings-dialog-content {
  min-height: 0;
  flex: 1;
  padding: 0;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .settings-dialog-card {
    width: 96vw;
    max-width: 96vw;
    height: 92vh;
    max-height: 92vh;
  }
}

.icp-header {
  background: #0b1420;
  color: #f4f7fb;
  box-shadow: none;
  border-bottom: 1px solid #253142;
}

.icp-toolbar {
  min-height: 66px;
  padding: 0 18px;
}

.brand {
  min-width: max-content;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.service-selector {
  border-radius: 8px;
  padding: 5px 9px;
}

.service-label {
  color: #8d9aad;
  font-size: 10px;
  line-height: 1.1;
}

.service-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.header-date {
  color: #9aa7b8;
  font-size: 12px;
  margin-left: 18px;
}

.screen-status {
  display: flex;
  padding: 5px 7px;
  background: transparent;
  border: 0;
  align-items: center;
  gap: 8px;
  color: #c6d0dc;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #35d07f;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgb(53 208 127 / 14%);
}

.remote-button {
  color: #cbd5e1;
  border-color: #435064;
  border-radius: 8px;
  font-size: 12px;
}

.icp-drawer {
  background: #101925;
  color: #98a6b8;
}

.navigation-list {
  padding: 12px 9px;
}

.navigation-item {
  min-height: 46px;
  margin-bottom: 4px;
  border-radius: 8px;
  color: #98a6b8;
}

.navigation-item :deep(.q-item__section--avatar) {
  min-width: 45px;
}

.navigation-item:hover {
  color: #e8eef6;
  background: #172333;
}

.navigation-item--active {
  color: #60a5fa;
  background: #132c49;
}

.navigation-item--dragging {
  opacity: 0.42;
}

.navigation-drag-handle {
  color: #526176;
  cursor: grab;
}

.navigation-separator {
  margin: 12px 4px;
  background: #263243;
}

@media (max-width: 599px) {
  .icp-toolbar {
    padding: 0 10px;
  }

  .brand-name {
    font-size: 16px;
  }
}
</style>
