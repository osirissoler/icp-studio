<template>
  <q-layout view="hHh Lpr lFf" class="icp-layout">
    <q-header class="icp-header">
      <q-toolbar class="icp-toolbar">
        <q-btn
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
              <q-item clickable v-close-popup to="/configuracion">
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
          to="/configuracion"
          class="q-ml-sm"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      dark
      :width="238"
      :mini-width="72"
      :mini="miniState"
      class="icp-drawer"
    >
      <q-scroll-area class="fit">
        <q-list padding class="navigation-list">
          <template v-for="item in mainNavigation" :key="item.to">
            <q-item
              clickable
              v-ripple
              :to="item.to"
              :exact="item.to === '/'"
              active-class="navigation-item--active"
              class="navigation-item"
            >
              <q-item-section avatar>
                <q-icon :name="item.icon" size="23px" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ item.label }}</q-item-label>
              </q-item-section>

              <q-tooltip
                v-if="miniState"
                anchor="center right"
                self="center left"
                :offset="[12, 0]"
              >
                {{ item.label }}
              </q-tooltip>
            </q-item>
          </template>

          <q-separator dark class="navigation-separator" />

          <q-item
            clickable
            v-ripple
            to="/configuracion"
            active-class="navigation-item--active"
            class="navigation-item"
          >
            <q-item-section avatar>
              <q-icon name="settings" size="23px" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Configuración</q-item-label>
            </q-item-section>

            <q-tooltip v-if="miniState" anchor="center right" self="center left" :offset="[12, 0]">
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

    <PersistentMediaPlayer />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import PersistentMediaPlayer from '../components/PersistentMediaPlayer.vue';
import type { DisplayInfo } from '../shared/display';

interface NavigationItem {
  label: string;
  icon: string;
  to: string;
}

const $q = useQuasar();
const leftDrawerOpen = ref(true);
const miniState = ref(true);
const displays = ref<DisplayInfo[]>([]);
let unsubscribeDisplays: (() => void) | undefined;

const mainNavigation: NavigationItem[] = [
  { label: 'Alabanzas', icon: 'music_note', to: '/alabanzas' },
  { label: 'Canciones MP3', icon: 'audio_file', to: '/audio' },
  { label: 'Biblia', icon: 'menu_book', to: '/biblia' },
  { label: 'Imágenes', icon: 'image', to: '/imagenes' },
  { label: 'Videos', icon: 'movie', to: '/videos' },
  { label: 'Documentos', icon: 'description', to: '/documentos' },
  { label: 'Actividades', icon: 'extension', to: '/actividades' },
  { label: 'Herramientas', icon: 'construction', to: '/herramientas' },
  { label: 'Biblioteca', icon: 'local_library', to: '/biblioteca' },
];

const currentDate = computed(() => {
  const formattedDate = new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
});

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
    leftDrawerOpen.value = !leftDrawerOpen.value;
    return;
  }

  miniState.value = !miniState.value;
}
</script>

<style scoped>
.icp-layout {
  background: #f4f6f8;
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
