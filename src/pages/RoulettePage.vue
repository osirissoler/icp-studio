<template>
  <q-page class="roulette-page" @keydown.space.prevent="spin">
    <header class="roulette-page-header">
      <div>
        <q-icon name="donut_large" />
        <div>
          <h1>Ruleta</h1>
          <p>Crea, guarda y presenta selecciones al azar.</p>
        </div>
      </div>
      <div class="header-actions">
        <q-btn
          outline
          no-caps
          color="blue-grey-3"
          icon="save"
          label="Guardar"
          @click="saveCurrent"
        />
        <q-btn
          unelevated
          no-caps
          color="red-6"
          icon="live_tv"
          label="Enviar a En vivo"
          @click="sendLive"
        />
      </div>
    </header>

    <main class="roulette-layout">
      <aside class="roulette-editor">
        <div class="editor-title">
          <strong>Mis ruletas</strong><q-btn flat round dense icon="add" @click="newRoulette" />
        </div>
        <div class="saved-list">
          <button
            v-for="saved in savedRoulettes"
            :key="saved.id"
            :class="{ active: saved.id === roulette.id }"
            @click="loadRoulette(saved)"
          >
            <q-icon name="donut_large" /><span
              ><strong>{{ saved.title }}</strong
              ><small>{{ saved.options.length }} opciones</small></span
            >
          </button>
        </div>
        <q-separator dark />
        <q-input
          v-model="roulette.title"
          dark
          outlined
          dense
          label="Nombre de la ruleta"
          maxlength="80"
        />
        <q-input
          v-model="optionsText"
          dark
          outlined
          type="textarea"
          autogrow
          label="Opciones · una por línea"
          hint="También puedes pegar una lista completa"
          @update:model-value="applyOptionsText"
        />
        <q-select
          v-model="roulette.labelMode"
          dark
          outlined
          dense
          emit-value
          map-options
          label="Texto dentro de la ruleta"
          :options="labelModeOptions"
        />
        <div class="editor-toggles">
          <q-toggle
            v-model="roulette.allowRepeats"
            dark
            color="primary"
            label="Permitir resultados repetidos"
          />
          <q-toggle
            v-model="roulette.removeWinner"
            dark
            color="primary"
            label="Retirar ganador al continuar"
          />
        </div>
        <div class="option-preview-list">
          <div v-for="(option, index) in roulette.options" :key="option.id">
            <i :style="{ backgroundColor: option.color }"></i><span>{{ option.label }}</span
            ><q-btn flat round dense size="xs" icon="close" @click="removeOption(index)" />
          </div>
        </div>
      </aside>

      <section class="roulette-operator">
        <div class="operator-label">
          <span><i></i> Vista del operador</span
          ><small>{{ liveSent ? 'En vivo' : 'Vista previa' }}</small>
        </div>
        <div class="operator-wheel"><RouletteWheel :roulette="presentationData" /></div>
        <div class="spin-controls">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="play_arrow"
            :label="spinning ? 'Girando…' : 'Girar ruleta'"
            :disable="spinning || roulette.options.length < 2"
            @click="spin"
          />
          <q-btn
            outline
            no-caps
            color="blue-grey-3"
            icon="restart_alt"
            label="Reiniciar"
            :disable="spinning"
            @click="resetGame"
          />
          <q-btn
            v-if="winner"
            flat
            no-caps
            color="orange-4"
            icon="person_remove"
            label="Retirar ganador"
            :disable="spinning"
            @click="removeWinner"
          />
        </div>
        <span class="keyboard-tip"><kbd>Espacio</kbd> Girar</span>
      </section>

      <aside class="roulette-history">
        <header>
          <div>
            <strong>Resultados</strong><small>{{ history.length }} selecciones</small>
          </div>
          <q-btn
            flat
            round
            dense
            icon="delete_sweep"
            :disable="!history.length"
            @click="history = []"
          />
        </header>
        <div v-if="history.length" class="history-list">
          <div v-for="(result, index) in history" :key="`${result.id}-${index}`">
            <span>{{ history.length - index }}</span
            ><i :style="{ backgroundColor: result.color }"></i><strong>{{ result.label }}</strong>
          </div>
        </div>
        <div v-else class="history-empty">
          <q-icon name="history" /><span>Los resultados aparecerán aquí.</span>
        </div>
      </aside>
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import RouletteWheel from '../components/RouletteWheel.vue';
import { showAppNotification } from '../services/app-notification';
import type { ServicePresentationItem } from '../shared/presentation';
import type { RouletteOption, RoulettePresentationData, SavedRoulette } from '../shared/roulette';
import { usePresentationStore } from '../stores/presentation-store';

const STORAGE_KEY = 'icp-studio-roulettes';
const colors = [
  '#2563eb',
  '#db2777',
  '#16a34a',
  '#ea580c',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#65a30d',
  '#4f46e5',
  '#c026d3',
  '#0d9488',
  '#d97706',
];
const labelModeOptions = [
  { label: 'Texto completo', value: 'full' },
  { label: 'Primera palabra', value: 'first-word' },
  { label: 'Texto abreviado…', value: 'short' },
  { label: 'Solo colores, sin texto', value: 'hidden' },
];
const presentationStore = usePresentationStore();
const savedRoulettes = ref(loadSaved());
const roulette = reactive<SavedRoulette>(
  savedRoulettes.value[0] ? structuredClone(savedRoulettes.value[0]) : createRoulette(),
);
const optionsText = ref(roulette.options.map((option) => option.label).join('\n'));
const rotation = ref(0);
const winnerId = ref('');
const spinning = ref(false);
const liveSent = ref(false);
const history = ref<RouletteOption[]>([]);
let finishTimer: ReturnType<typeof setTimeout> | null = null;

const winner = computed(
  () => roulette.options.find((option) => option.id === winnerId.value) ?? null,
);
const presentationData = computed<RoulettePresentationData>(() => ({
  id: roulette.id,
  title: roulette.title || 'Ruleta',
  options: roulette.options,
  rotation: rotation.value,
  winnerId: winnerId.value,
  spinning: spinning.value,
  spinDuration: 5200,
  labelMode: roulette.labelMode,
}));

function createRoulette(): SavedRoulette {
  return {
    id: crypto.randomUUID(),
    title: 'Nueva ruleta',
    options: ['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'].map((label, index) => ({
      id: crypto.randomUUID(),
      label,
      color: colors[index]!,
    })),
    allowRepeats: true,
    removeWinner: false,
    labelMode: 'short',
    updatedAt: new Date().toISOString(),
  };
}
function loadSaved(): SavedRoulette[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedRoulette[];
    return Array.isArray(value)
      ? value
          .filter((item) => item?.id && Array.isArray(item.options))
          .map((item) => ({ ...item, labelMode: item.labelMode ?? 'short' }))
      : [];
  } catch {
    return [];
  }
}
function persist(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoulettes.value));
}
function newRoulette(): void {
  Object.assign(roulette, createRoulette());
  optionsText.value = roulette.options.map((o) => o.label).join('\n');
  resetGame();
}
function loadRoulette(saved: SavedRoulette): void {
  Object.assign(roulette, structuredClone(saved));
  optionsText.value = roulette.options.map((o) => o.label).join('\n');
  resetGame();
}
function saveCurrent(): void {
  applyOptionsText();
  roulette.updatedAt = new Date().toISOString();
  const index = savedRoulettes.value.findIndex((item) => item.id === roulette.id);
  const copy = structuredClone(roulette);
  if (index >= 0) savedRoulettes.value[index] = copy;
  else savedRoulettes.value = [...savedRoulettes.value, copy];
  persist();
  showAppNotification('La ruleta fue guardada.', 'positive', 'save');
}
function applyOptionsText(): void {
  const labels = optionsText.value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 40);
  const previous = new Map(roulette.options.map((option) => [option.label, option]));
  roulette.options = labels.map(
    (label, index) =>
      previous.get(label) ?? {
        id: crypto.randomUUID(),
        label,
        color: colors[index % colors.length]!,
      },
  );
  if (winnerId.value && !roulette.options.some((option) => option.id === winnerId.value)) {
    winnerId.value = '';
  }
  if (liveSent.value && !spinning.value) publishLive();
}
function removeOption(index: number): void {
  roulette.options.splice(index, 1);
  optionsText.value = roulette.options.map((o) => o.label).join('\n');
}
function rouletteItem(data: RoulettePresentationData): ServicePresentationItem {
  return {
    id: `roulette-live-${roulette.id}`,
    sourceId: roulette.id,
    type: 'game',
    title: roulette.title,
    footer: 'Ruleta',
    frames: [
      {
        id: `roulette-frame-${roulette.id}`,
        label: roulette.title,
        text: `${roulette.options.length} opciones`,
        roulette: data,
      },
    ],
  };
}
function publishLive(): void {
  presentationStore.setLiveItem(rouletteItem(presentationData.value));
  liveSent.value = true;
}
function sendLive(): void {
  applyOptionsText();
  if (roulette.options.length < 2) {
    showAppNotification('Agrega por lo menos dos opciones.', 'warning', 'warning');
    return;
  }
  publishLive();
  showAppNotification('La ruleta está en Contenido activo.', 'positive', 'live_tv');
}
function randomIndex(max: number): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (values[0] ?? 0) % max;
}
function spin(): void {
  if (spinning.value) return;
  applyOptionsText();
  if (roulette.removeWinner && winnerId.value) {
    const previousIndex = roulette.options.findIndex((option) => option.id === winnerId.value);
    if (previousIndex >= 0) removeOption(previousIndex);
    winnerId.value = '';
  }
  const used = new Set(history.value.map((item) => item.id));
  let pool = roulette.allowRepeats
    ? roulette.options
    : roulette.options.filter((option) => !used.has(option.id));
  if (!pool.length) {
    history.value = [];
    pool = roulette.options;
  }
  if (pool.length < 1) {
    showAppNotification('Agrega opciones para girar.', 'warning', 'warning');
    return;
  }
  const selected = pool[randomIndex(pool.length)]!;
  const selectedIndex = roulette.options.findIndex((option) => option.id === selected.id);
  const center = (360 / roulette.options.length) * (selectedIndex + 0.5);
  const current = ((rotation.value % 360) + 360) % 360;
  rotation.value += 360 * (6 + randomIndex(3)) + ((360 - center - current + 360) % 360);
  winnerId.value = '';
  spinning.value = true;
  publishLive();
  finishTimer = setTimeout(() => {
    spinning.value = false;
    winnerId.value = selected.id;
    history.value = [selected, ...history.value];
    publishLive();
  }, 5200);
}
function removeWinner(): void {
  const index = roulette.options.findIndex((option) => option.id === winnerId.value);
  if (index >= 0) removeOption(index);
  winnerId.value = '';
  publishLive();
}
function resetGame(): void {
  if (finishTimer) clearTimeout(finishTimer);
  spinning.value = false;
  winnerId.value = '';
  rotation.value = 0;
  history.value = [];
  if (liveSent.value) publishLive();
}
onBeforeUnmount(() => {
  if (finishTimer) clearTimeout(finishTimer);
});
function handleKeyboard(event: KeyboardEvent): void {
  if (
    event.code !== 'Space' ||
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  )
    return;
  event.preventDefault();
  spin();
}
onMounted(() => window.addEventListener('keydown', handleKeyboard));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyboard));
</script>

<style scoped>
.roulette-page {
  min-height: 100%;
  padding: 18px;
  color: #dce7f2;
  background: #0b141f;
}
.roulette-page-header,
.roulette-page-header > div,
.header-actions,
.operator-label,
.roulette-history header {
  display: flex;
  align-items: center;
}
.roulette-page-header {
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}
.roulette-page-header > div:first-child {
  gap: 11px;
}
.roulette-page-header > div:first-child > .q-icon {
  padding: 10px;
  color: #7dd3fc;
  background: #12314a;
  border-radius: 11px;
  font-size: 28px;
}
.roulette-page h1 {
  margin: 0;
  font-size: 23px;
}
.roulette-page p {
  margin: 2px 0 0;
  color: #71869a;
  font-size: 10px;
}
.header-actions {
  gap: 8px;
}
.roulette-layout {
  display: grid;
  height: calc(100vh - 150px);
  min-height: 610px;
  grid-template-columns: minmax(235px, 0.65fr) minmax(420px, 1.55fr) minmax(210px, 0.55fr);
  gap: 12px;
}
.roulette-editor,
.roulette-operator,
.roulette-history {
  min-width: 0;
  min-height: 0;
  padding: 12px;
  background: #111d2a;
  border: 1px solid #293d51;
  border-radius: 12px;
}
.roulette-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}
.editor-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.saved-list {
  display: flex;
  max-height: 125px;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}
.saved-list button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px;
  color: #8da1b5;
  background: #0d1723;
  border: 1px solid transparent;
  border-radius: 7px;
  text-align: left;
}
.saved-list button.active {
  color: #dbeafe;
  background: #17314a;
  border-color: #3b82c4;
}
.saved-list button span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.saved-list small {
  font-size: 7px;
}
.editor-toggles {
  display: flex;
  flex-direction: column;
}
.option-preview-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.option-preview-list > div {
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 4px 6px;
  background: #0d1723;
  border-radius: 6px;
  font-size: 9px;
}
.option-preview-list i {
  width: 7px;
  height: 20px;
  border-radius: 4px;
}
.roulette-operator {
  display: flex;
  flex-direction: column;
}
.operator-label {
  justify-content: space-between;
  color: #8296aa;
  font-size: 9px;
  text-transform: uppercase;
}
.operator-label span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.operator-label i {
  width: 7px;
  height: 7px;
  background: #ef4444;
  border-radius: 50%;
}
.operator-wheel {
  min-height: 0;
  flex: 1;
  margin: 9px 0;
  overflow: hidden;
  border: 1px solid #314a62;
  border-radius: 10px;
}
.spin-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.keyboard-tip {
  margin-top: 8px;
  color: #64798d;
  font-size: 8px;
  text-align: center;
}
.keyboard-tip kbd {
  padding: 2px 6px;
  color: #cfe8ff;
  background: #1a3044;
  border: 1px solid #3b5872;
  border-radius: 4px;
}
.roulette-history {
  display: flex;
  flex-direction: column;
}
.roulette-history header {
  justify-content: space-between;
}
.roulette-history header > div {
  display: flex;
  flex-direction: column;
}
.roulette-history header small {
  color: #71869a;
  font-size: 8px;
}
.history-list {
  margin-top: 10px;
  overflow-y: auto;
}
.history-list > div {
  display: grid;
  grid-template-columns: 22px 6px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  padding: 8px 4px;
  border-bottom: 1px solid #233548;
}
.history-list span {
  color: #61778c;
  font-size: 8px;
  text-align: center;
}
.history-list i {
  width: 6px;
  height: 24px;
  border-radius: 4px;
}
.history-list strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  color: #61778c;
  font-size: 9px;
  text-align: center;
}
.history-empty .q-icon {
  font-size: 34px;
}
@media (max-width: 1000px) {
  .roulette-layout {
    height: auto;
    grid-template-columns: 1fr;
  }
  .roulette-editor,
  .roulette-history {
    max-height: 420px;
  }
  .roulette-operator {
    min-height: 620px;
  }
}
</style>
