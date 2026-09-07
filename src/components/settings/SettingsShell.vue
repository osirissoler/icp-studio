<template>
  <div class="settings-shell" @click.capture="handleCapturedClick">
    <div v-if="activeSection === 'screens'" class="screens-shell">
      <div class="screens-shell-toolbar">
        <q-btn
          flat
          dense
          no-caps
          color="blue-grey-4"
          icon="arrow_back"
          label="Volver a configuración"
          @click.stop="activeSection = 'general'"
        />
      </div>
      <ScreensSettingsPanel />
    </div>

    <SettingsPage v-else :initial-section="activeSection" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import SettingsPage from '../../pages/SettingsPage.vue';
import ScreensSettingsPanel from './ScreensSettingsPanel.vue';

type SettingsSectionId =
  | 'general'
  | 'screens'
  | 'bible'
  | 'songs'
  | 'music'
  | 'projection'
  | 'remote';

const props = withDefaults(defineProps<{ initialSection?: SettingsSectionId }>(), {
  initialSection: 'general',
});

const activeSection = ref<SettingsSectionId>(props.initialSection);

watch(
  () => props.initialSection,
  (section) => {
    activeSection.value = section;
  },
);

function handleCapturedClick(event: MouseEvent): void {
  if (activeSection.value === 'screens') {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest('button');
  if (!button) {
    return;
  }

  const label = button.textContent?.trim().toLowerCase() ?? '';
  if (label !== 'pantallas') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  activeSection.value = 'screens';
}
</script>

<style scoped>
.settings-shell,
.screens-shell {
  min-height: 100%;
}

.screens-shell-toolbar {
  display: flex;
  padding: 10px 18px 0;
  background: #0c131d;
}
</style>
