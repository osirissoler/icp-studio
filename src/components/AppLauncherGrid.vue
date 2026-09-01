<template>
  <div class="app-launcher">
    <div class="app-launcher-heading">
      <div>
        <strong>{{ heading }}</strong>
        <span>{{ description }}</span>
      </div>
      <q-chip dense color="blue-grey-9" text-color="blue-grey-3">
        {{ items.length }} {{ items.length === 1 ? 'opción' : 'opciones' }}
      </q-chip>
    </div>

    <div class="app-grid">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="app-tile"
        :aria-label="item.label"
        @click="selectItem(item)"
      >
        <span
          class="app-icon"
          :style="{
            '--app-color': item.color,
            '--app-color-soft': `${item.color}2b`,
          }"
        >
          <q-icon :name="item.icon" />
        </span>
        <span class="app-name">{{ item.label }}</span>
        <span class="app-status">{{ item.status ?? (item.to ? 'Abrir' : 'Próximamente') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { showAppNotification } from '../services/app-notification';
import { useRouter } from 'vue-router';

interface LauncherItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  to?: string;
  status?: string;
}

interface Props {
  heading: string;
  description: string;
  items: LauncherItem[];
}

defineProps<Props>();

const router = useRouter();

function selectItem(item: LauncherItem): void {
  if (item.to) {
    void router.push(item.to);
    return;
  }

  showAppNotification(
    `${item.label} está preparado para una próxima etapa de desarrollo.`,
    'info',
    item.icon,
  );
}
</script>

<style scoped>
.app-launcher {
  container-type: inline-size;
  display: flex;
  min-height: 100%;
  flex: 1;
  flex-direction: column;
  gap: 18px;
}

.app-launcher-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.app-launcher-heading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.app-launcher-heading strong {
  color: #dce7f4;
  font-size: 14px;
}

.app-launcher-heading span {
  color: #7f8da1;
  font-size: 11px;
  line-height: 1.45;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 14px;
  align-content: start;
}

.app-tile {
  display: flex;
  min-width: 0;
  min-height: 142px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 14px 9px 11px;
  color: #dce7f4;
  background: #0d1723;
  border: 1px solid #26384d;
  border-radius: 16px;
  cursor: pointer;
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease;
}

.app-tile:hover,
.app-tile:focus-visible {
  background: #122033;
  border-color: #45678e;
  box-shadow: 0 10px 22px rgb(0 0 0 / 22%);
  outline: none;
  transform: translateY(-3px);
}

.app-icon {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  color: var(--app-color);
  background: linear-gradient(145deg, var(--app-color-soft), rgb(15 27 41 / 88%));
  border: 1px solid color-mix(in srgb, var(--app-color) 38%, #26384d);
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%);
}

.app-icon .q-icon {
  font-size: 31px;
}

.app-name {
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
}

.app-status {
  color: #68778b;
  font-size: 9px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

@container (max-width: 390px) {
  .app-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .app-tile {
    min-height: 125px;
    border-radius: 13px;
  }

  .app-icon {
    width: 54px;
    height: 54px;
    border-radius: 15px;
  }
}
</style>
