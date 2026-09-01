<template>
  <q-page class="roulette-page">
    <header class="roulette-page-header">
      <div class="roulette-heading">
        <button type="button" class="back-button" @click="router.push('/herramientas')">
          <q-icon name="arrow_back" />
        </button>
        <span class="roulette-heading-icon"><q-icon name="donut_large" /></span>
        <div>
          <span class="roulette-eyebrow">Herramientas · Dinámicas interactivas</span>
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
          :label="hasUnsavedChanges ? 'Guardar cambios' : 'Guardado'"
          :disable="!hasUnsavedChanges"
          class="app-action-button app-action-button--secondary"
          @click="saveCurrent"
        />
        <q-btn
          unelevated
          no-caps
          color="red-6"
          icon="live_tv"
          label="Enviar a En vivo"
          class="app-action-button app-action-button--live"
          @click="sendLive"
        />
      </div>
    </header>

    <main class="roulette-layout">
      <aside class="roulette-editor">
        <div class="editor-title">
          <span
            ><strong>Mis ruletas</strong><small>{{ savedRoulettes.length }} guardadas</small></span
          >
          <div>
            <q-badge v-if="hasUnsavedChanges" color="orange-7" label="Sin guardar" />
            <q-btn flat round dense icon="add" @click="newRoulette">
              <q-tooltip>Crear otra ruleta</q-tooltip>
            </q-btn>
          </div>
        </div>
        <div class="saved-list">
          <article
            v-for="saved in savedRoulettes"
            :key="saved.id"
            class="saved-roulette-card"
            :class="{
              'saved-roulette-card--active': saved.id === roulette.id,
              'saved-roulette-card--live': activeLiveItem?.sourceId === saved.id,
            }"
          >
            <button type="button" class="saved-roulette-main" @click="loadRoulette(saved)">
              <q-icon name="donut_large" />
              <span>
                <strong>{{ saved.title }}</strong>
                <small
                  >{{ saved.options.length }} opciones · {{ updatedLabel(saved.updatedAt) }}</small
                >
              </span>
              <q-badge v-if="activeLiveItem?.sourceId === saved.id" color="red-6" label="En vivo" />
            </button>
            <div class="saved-roulette-actions">
              <q-btn flat round dense size="xs" icon="visibility" @click="loadRoulette(saved)">
                <q-tooltip>Visualizar y configurar</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="live_tv"
                color="red-4"
                @click="sendSavedLive(saved)"
              >
                <q-tooltip>Enviar esta ruleta a En vivo</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="content_copy"
                @click="duplicateRoulette(saved)"
              >
                <q-tooltip>Duplicar</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="delete_outline"
                color="red-4"
                @click="deleteRoulette(saved)"
              >
                <q-tooltip>Eliminar</q-tooltip>
              </q-btn>
            </div>
          </article>
          <div v-if="!savedRoulettes.length" class="saved-list-empty">
            <q-icon name="donut_large" /><span>Guarda tu primera ruleta para reutilizarla.</span>
          </div>
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
          class="roulette-options-input"
          label="Opciones · una por línea"
          hint="Puedes pegar una lista y ampliar este campo hacia abajo"
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
          @update:model-value="changeLabelMode"
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
        <div class="duration-settings">
          <q-toggle
            v-model="roulette.useTimer"
            dark
            color="primary"
            label="Usar tiempo automático"
            class="duration-toggle"
          />
          <template v-if="roulette.useTimer">
            <q-input
              v-model.number="roulette.durationValue"
              dark
              outlined
              dense
              type="number"
              min="1"
              :max="roulette.durationUnit === 'minutes' ? 10 : 600"
              label="Duración del giro"
            />
            <q-select
              v-model="roulette.durationUnit"
              dark
              outlined
              dense
              emit-value
              map-options
              :options="durationUnitOptions"
            />
          </template>
          <small v-else>La ruleta seguirá girando hasta que pulses Detener.</small>
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
          <span><i></i> Vista de configuración</span><small>Vista previa local</small>
        </div>
        <div class="operator-wheel">
          <RouletteWheel
            :key="`${roulette.id}-${roulette.labelMode}-${roulette.options.length}`"
            :roulette="presentationData"
            show-timer
          />
        </div>
        <div class="spin-controls">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="play_arrow"
            :label="spinning ? 'Girando…' : 'Girar ruleta'"
            :disable="spinning || roulette.options.length < 2"
            class="app-action-button app-action-button--primary"
            @click="spin"
          />
          <q-btn
            v-if="spinning && !roulette.useTimer"
            unelevated
            no-caps
            color="red-6"
            icon="stop"
            label="Detener"
            class="app-action-button app-action-button--live"
            @click="stopSpin"
          />
          <q-btn
            outline
            no-caps
            color="blue-grey-3"
            icon="restart_alt"
            label="Reiniciar"
            :disable="spinning"
            class="app-action-button app-action-button--secondary"
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
            class="app-action-button app-action-button--ghost"
            @click="removeWinner"
          />
        </div>
      </section>

      <aside class="roulette-history">
        <header>
          <div>
            <strong>Resultados en vivo</strong><small>{{ liveResults.length }} selecciones</small>
          </div>
          <q-btn
            flat
            round
            dense
            icon="delete_sweep"
            :disable="!liveResults.length"
            @click="clearCurrentLiveResults"
          />
        </header>
        <div v-if="liveResults.length" class="history-list">
          <div v-for="(result, index) in liveResults" :key="result.id">
            <span>{{ liveResults.length - index }}</span
            ><i :style="{ backgroundColor: result.color }"></i>
            <span class="history-result-details">
              <strong>{{ result.label }}</strong
              ><small>{{ resultDateLabel(result.createdAt) }}</small>
            </span>
            <q-btn
              flat
              round
              dense
              size="xs"
              icon="close"
              aria-label="Eliminar resultado"
              @click="removeLiveRouletteResult(result.id)"
            />
          </div>
        </div>
        <div v-else class="history-empty">
          <q-icon name="history" /><span
            >Los resultados de las presentaciones en vivo aparecerán aquí.</span
          >
        </div>
      </aside>
    </main>

    <q-dialog v-model="operatorConsoleOpen" maximized>
      <q-card v-if="liveRoulette" class="roulette-console">
        <header class="roulette-console-header">
          <div>
            <span class="console-live-dot"></span>
            <span
              ><strong>Control de Ruleta · En vivo</strong
              ><small>{{ activeLiveItem?.title }}</small></span
            >
          </div>
          <div class="header-actions">
            <q-btn
              outline
              no-caps
              color="red-4"
              icon="tv_off"
              label="Limpiar En vivo"
              class="app-action-button app-action-button--danger"
              @click="stopLive"
            />
            <q-btn
              flat
              round
              icon="close"
              aria-label="Cerrar control"
              @click="operatorConsoleOpen = false"
            />
          </div>
        </header>
        <main class="roulette-console-body">
          <section class="roulette-console-preview">
            <div class="operator-label">
              <span><i></i> Ahora En vivo</span>
            </div>
            <div class="console-wheel-scroll">
              <RouletteWheel
                :key="`live-${liveRoulette.id}-${liveRoulette.labelMode}-${liveRoulette.options.length}`"
                :roulette="liveRoulette"
                show-timer
              />
            </div>
          </section>
          <aside class="roulette-console-controls">
            <q-icon name="donut_large" />
            <strong>{{
              liveRoulette.spinning ? 'La ruleta está girando' : 'Control de la ruleta'
            }}</strong>
            <p>Enviar a En vivo no inicia el giro. Usa este botón cuando estés listo.</p>
            <q-toggle
              :model-value="liveRoulette.timedSpin"
              dark
              color="primary"
              label="Usar tiempo automático"
              :disable="liveRoulette.spinning"
              @update:model-value="setLiveRouletteTimed"
            />
            <div v-if="liveRoulette.timedSpin" class="console-duration-settings">
              <q-input
                v-model.number="liveDurationValue"
                dark
                outlined
                dense
                type="number"
                min="1"
                :max="liveDurationUnit === 'minutes' ? 10 : 600"
                label="Duración"
                :disable="liveRoulette.spinning"
              />
              <q-select
                v-model="liveDurationUnit"
                dark
                outlined
                dense
                emit-value
                map-options
                :options="durationUnitOptions"
                :disable="liveRoulette.spinning"
              />
            </div>
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="play_arrow"
              :label="liveRoulette.spinning ? 'Girando…' : 'Girar ruleta'"
              :disable="liveRoulette.spinning || liveRoulette.options.length < 2"
              class="app-action-button app-action-button--primary"
              @click="spinLiveRoulette"
            />
            <q-btn
              v-if="liveRoulette.spinning && !liveRoulette.timedSpin"
              unelevated
              no-caps
              color="red-6"
              icon="stop"
              label="Detener"
              class="app-action-button app-action-button--live"
              @click="stopLiveRoulette"
            />
            <q-btn
              outline
              no-caps
              color="blue-grey-3"
              icon="restart_alt"
              label="Reiniciar"
              :disable="liveRoulette.spinning"
              class="app-action-button app-action-button--secondary"
              @click="resetLiveRoulette"
            />
            <div v-if="liveWinner" class="console-result">
              <small>Resultado</small><strong>{{ liveWinner.label }}</strong>
            </div>
          </aside>
        </main>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import RouletteWheel from '../components/RouletteWheel.vue';
import { showAppNotification } from '../services/app-notification';
import type { ServicePresentationItem } from '../shared/presentation';
import type { RouletteOption, RoulettePresentationData, SavedRoulette } from '../shared/roulette';
import { usePresentationStore } from '../stores/presentation-store';

const STORAGE_KEY = 'icp-studio-roulettes';
const router = useRouter();
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
  { label: 'Colores y texto', value: 'colors-text' },
  { label: 'Solo colores, sin texto', value: 'hidden' },
];
const durationUnitOptions = [
  { label: 'Segundos', value: 'seconds' },
  { label: 'Minutos', value: 'minutes' },
];
const presentationStore = usePresentationStore();
const { liveFrame: activeLiveFrame, liveItem: activeLiveItem } = storeToRefs(presentationStore);
const {
  clearLiveRouletteResults,
  removeLiveRouletteResult,
  resetLiveRoulette,
  setLiveRouletteDuration,
  setLiveRouletteTimed,
  spinLiveRoulette,
  stopLiveRoulette,
} = presentationStore;
const { liveRouletteResults } = storeToRefs(presentationStore);
const savedRoulettes = ref(loadSaved());
const roulette = reactive<SavedRoulette>(
  savedRoulettes.value[0] ? cloneRoulette(savedRoulettes.value[0]) : createRoulette(),
);
const optionsText = ref(roulette.options.map((option) => option.label).join('\n'));
const rotation = ref(0);
const winnerId = ref('');
const pendingWinnerId = ref('');
const spinning = ref(false);
const spinStartedAt = ref(0);
const operatorConsoleOpen = ref(false);
const liveDurationUnit = ref<'seconds' | 'minutes'>('seconds');
const history = ref<RouletteOption[]>([]);
const savedBaseline = ref(rouletteSignature(roulette));
let finishTimer: ReturnType<typeof setTimeout> | null = null;

const winner = computed(
  () => roulette.options.find((option) => option.id === winnerId.value) ?? null,
);
const hasUnsavedChanges = computed(() => rouletteSignature(roulette) !== savedBaseline.value);
const liveResults = computed(() =>
  liveRouletteResults.value.filter((result) => result.rouletteId === roulette.id),
);
const liveRoulette = computed(() => activeLiveFrame.value?.roulette ?? null);
const liveWinner = computed(() =>
  liveRoulette.value?.options.find((option) => option.id === liveRoulette.value?.winnerId),
);
const liveDurationValue = computed({
  get: () => {
    const duration = liveRoulette.value?.spinDuration ?? 6000;
    return Math.max(
      1,
      Math.round(duration / (liveDurationUnit.value === 'minutes' ? 60000 : 1000)),
    );
  },
  set: (value: number) => {
    const multiplier = liveDurationUnit.value === 'minutes' ? 60000 : 1000;
    setLiveRouletteDuration(Number(value) * multiplier);
  },
});
const presentationData = computed<RoulettePresentationData>(() => ({
  id: roulette.id,
  title: roulette.title || 'Ruleta',
  options: roulette.options,
  rotation: rotation.value,
  winnerId: winnerId.value,
  pendingWinnerId: pendingWinnerId.value,
  spinning: spinning.value,
  spinDuration: spinDuration.value,
  spinStartedAt: spinStartedAt.value,
  timedSpin: roulette.useTimer,
  allowRepeats: roulette.allowRepeats,
  removeWinner: roulette.removeWinner,
  usedWinnerIds: [],
  labelMode: roulette.labelMode,
}));
const spinDuration = computed(() => {
  const value = Math.max(1, Number(roulette.durationValue) || 1);
  return Math.min(600_000, value * (roulette.durationUnit === 'minutes' ? 60_000 : 1_000));
});

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
    durationValue: 6,
    durationUnit: 'seconds',
    useTimer: true,
    updatedAt: new Date().toISOString(),
  };
}
function cloneRoulette(value: SavedRoulette): SavedRoulette {
  return {
    id: String(value.id),
    title: String(value.title),
    options: value.options.map((option) => ({
      id: String(option.id),
      label: String(option.label),
      color: String(option.color),
    })),
    allowRepeats: Boolean(value.allowRepeats),
    removeWinner: Boolean(value.removeWinner),
    labelMode: value.labelMode,
    durationValue: Number(value.durationValue),
    durationUnit: value.durationUnit,
    useTimer: Boolean(value.useTimer),
    updatedAt: String(value.updatedAt),
  };
}
function loadSaved(): SavedRoulette[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedRoulette[];
    return Array.isArray(value)
      ? value
          .filter((item) => item?.id && Array.isArray(item.options))
          .map((item) => ({
            ...item,
            labelMode: item.labelMode ?? 'short',
            durationValue: item.durationValue ?? 6,
            durationUnit: item.durationUnit ?? 'seconds',
            useTimer: item.useTimer ?? true,
          }))
      : [];
  } catch {
    return [];
  }
}
function persist(): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoulettes.value));
    return true;
  } catch {
    showAppNotification('No se pudieron guardar las ruletas.', 'negative', 'error_outline');
    return false;
  }
}
function rouletteSignature(value: SavedRoulette): string {
  return JSON.stringify({
    id: value.id,
    title: value.title,
    options: value.options,
    allowRepeats: value.allowRepeats,
    removeWinner: value.removeWinner,
    labelMode: value.labelMode,
    durationValue: value.durationValue,
    durationUnit: value.durationUnit,
    useTimer: value.useTimer,
  });
}
function canReplaceCurrent(): boolean {
  return (
    !hasUnsavedChanges.value ||
    window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos y continuar?')
  );
}
function newRoulette(): void {
  if (!canReplaceCurrent()) return;
  Object.assign(roulette, createRoulette());
  optionsText.value = roulette.options.map((o) => o.label).join('\n');
  savedBaseline.value = '';
  resetGame();
}
function loadRoulette(saved: SavedRoulette): void {
  if (saved.id === roulette.id && !hasUnsavedChanges.value) return;
  if (!canReplaceCurrent()) return;
  Object.assign(roulette, cloneRoulette(saved));
  optionsText.value = roulette.options.map((o) => o.label).join('\n');
  savedBaseline.value = rouletteSignature(roulette);
  resetGame();
}
function saveCurrent(): void {
  applyOptionsText();
  roulette.updatedAt = new Date().toISOString();
  const index = savedRoulettes.value.findIndex((item) => item.id === roulette.id);
  const previous = savedRoulettes.value;
  const copy = cloneRoulette(roulette);
  if (index >= 0) {
    savedRoulettes.value = savedRoulettes.value.map((item, itemIndex) =>
      itemIndex === index ? copy : item,
    );
  } else savedRoulettes.value = [...savedRoulettes.value, copy];
  if (!persist()) {
    savedRoulettes.value = previous;
    return;
  }
  savedBaseline.value = rouletteSignature(roulette);
  showAppNotification('La ruleta fue guardada.', 'positive', 'save');
}
function sendSavedLive(saved: SavedRoulette): void {
  if (saved.id !== roulette.id) {
    if (!canReplaceCurrent()) return;
    Object.assign(roulette, cloneRoulette(saved));
    optionsText.value = roulette.options.map((option) => option.label).join('\n');
    savedBaseline.value = rouletteSignature(roulette);
    resetGame();
  }
  sendLive();
}
function duplicateRoulette(saved: SavedRoulette): void {
  const duplicate = cloneRoulette(saved);
  duplicate.id = crypto.randomUUID();
  duplicate.title = `${saved.title} · copia`;
  duplicate.options = duplicate.options.map((option) => ({
    ...option,
    id: crypto.randomUUID(),
  }));
  duplicate.updatedAt = new Date().toISOString();
  savedRoulettes.value = [...savedRoulettes.value, duplicate];
  persist();
  showAppNotification(`${saved.title} fue duplicada.`, 'positive', 'content_copy');
}
function deleteRoulette(saved: SavedRoulette): void {
  if (!window.confirm(`¿Eliminar la ruleta “${saved.title}”?`)) return;
  savedRoulettes.value = savedRoulettes.value.filter((item) => item.id !== saved.id);
  persist();
  if (roulette.id === saved.id) {
    const next = savedRoulettes.value[0];
    Object.assign(roulette, next ? cloneRoulette(next) : createRoulette());
    optionsText.value = roulette.options.map((option) => option.label).join('\n');
    savedBaseline.value = next ? rouletteSignature(roulette) : '';
    resetGame();
  }
  showAppNotification(`${saved.title} fue eliminada.`, 'info', 'delete_outline');
}
function updatedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
  }).format(date);
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
}
function changeLabelMode(value: unknown): void {
  if (
    value === 'full' ||
    value === 'first-word' ||
    value === 'short' ||
    value === 'colors-text' ||
    value === 'hidden'
  ) {
    roulette.labelMode = value;
  }
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
function publishLive(data: RoulettePresentationData): void {
  presentationStore.setLiveItem(rouletteItem(data));
}
function sendLive(): void {
  applyOptionsText();
  if (roulette.options.length < 2) {
    showAppNotification('Agrega por lo menos dos opciones.', 'warning', 'warning');
    return;
  }
  publishLive({
    ...presentationData.value,
    rotation: 0,
    winnerId: '',
    pendingWinnerId: '',
    spinning: false,
    spinStartedAt: 0,
  });
  operatorConsoleOpen.value = true;
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
  const cruiseTurns = roulette.useTimer
    ? Math.max(6, Math.ceil(Math.max(0, spinDuration.value - 2000) / 650) + 2)
    : 8;
  rotation.value += 360 * (cruiseTurns + randomIndex(3)) + ((360 - center - current + 360) % 360);
  winnerId.value = '';
  pendingWinnerId.value = selected.id;
  spinning.value = true;
  spinStartedAt.value = Date.now();
  if (roulette.useTimer) {
    finishTimer = setTimeout(() => {
      finishSpin();
    }, spinDuration.value);
  }
}
function finishSpin(): void {
  if (!spinning.value) return;
  if (finishTimer) clearTimeout(finishTimer);
  finishTimer = null;
  spinning.value = false;
  spinStartedAt.value = 0;
  winnerId.value = pendingWinnerId.value;
  const selected = roulette.options.find((option) => option.id === pendingWinnerId.value);
  pendingWinnerId.value = '';
  if (selected) history.value = [selected, ...history.value];
}
function stopSpin(): void {
  finishSpin();
}
function removeWinner(): void {
  const index = roulette.options.findIndex((option) => option.id === winnerId.value);
  if (index >= 0) removeOption(index);
  winnerId.value = '';
}
function resetGame(): void {
  if (finishTimer) clearTimeout(finishTimer);
  spinning.value = false;
  winnerId.value = '';
  pendingWinnerId.value = '';
  rotation.value = 0;
  spinStartedAt.value = 0;
  history.value = [];
}
function stopLive(): void {
  presentationStore.clearLive();
  operatorConsoleOpen.value = false;
}
function clearCurrentLiveResults(): void {
  clearLiveRouletteResults(roulette.id);
}
function resultDateLabel(value: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
onBeforeUnmount(() => {
  if (finishTimer) clearTimeout(finishTimer);
});
</script>

<style scoped>
.roulette-page {
  min-height: 100%;
  padding: 20px;
  color: #e7eef7;
  background: radial-gradient(circle at 78% -15%, rgb(31 82 123 / 22%), transparent 34%), #0b121b;
}
button {
  font: inherit;
}
.roulette-page-header,
.roulette-heading,
.header-actions,
.operator-label,
.roulette-history header {
  display: flex;
  align-items: center;
}
.roulette-page-header {
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}
.roulette-heading {
  min-width: 0;
  gap: 12px;
}
.roulette-heading > div {
  min-width: 0;
}
.back-button {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  color: #9badc1;
  background: #111c29;
  border: 1px solid #2a3b4f;
  border-radius: 9px;
  cursor: pointer;
}
.back-button:hover {
  color: #dbeafe;
  border-color: #4d7199;
}
.roulette-heading-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  color: #93c5fd;
  background: #112f4a;
  border: 1px solid #285a82;
  border-radius: 13px;
  font-size: 25px;
}
.roulette-eyebrow {
  display: block;
  color: #6e839a;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.roulette-heading h1 {
  margin: 1px 0 0;
  font-size: 22px;
  line-height: 1.2;
}
.roulette-heading p {
  margin: 3px 0 0;
  color: #8190a3;
  font-size: 11px;
}
.header-actions {
  gap: 8px;
}
.header-actions .q-btn {
  min-height: 39px;
  border-radius: 9px;
}
.app-action-button {
  min-height: 40px;
  padding: 0 15px;
  border: 0 !important;
  border-radius: 8px !important;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.01em;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}
.app-action-button:not(.disabled):hover {
  transform: translateY(-1px);
  filter: brightness(1.12);
}
.app-action-button--primary {
  color: #f7fbff !important;
  background: #2479ad !important;
  box-shadow: 0 5px 14px rgb(20 91 137 / 24%);
}
.app-action-button--live {
  color: #fff7f7 !important;
  background: #d6424f !important;
  box-shadow: 0 5px 14px rgb(173 38 53 / 25%);
}
.app-action-button--danger {
  color: #f28c96 !important;
  background: rgb(163 49 63 / 13%) !important;
}
.app-action-button--secondary {
  color: #c5d5e4 !important;
  background: #1a2a39 !important;
  box-shadow: none;
}
.app-action-button--ghost {
  color: #91a6ba !important;
  background: transparent !important;
}
.roulette-layout {
  display: grid;
  height: calc(100vh - 150px);
  min-height: 610px;
  grid-template-columns: minmax(300px, 0.8fr) minmax(420px, 1.45fr) minmax(210px, 0.55fr);
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
.editor-title > span {
  display: flex;
  flex-direction: column;
}
.editor-title > span small {
  color: #708499;
  font-size: 8px;
}
.editor-title > div {
  display: flex;
  align-items: center;
  gap: 4px;
}
.saved-list {
  display: flex;
  max-height: 230px;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}
.saved-roulette-card {
  overflow: hidden;
  background: #0d1723;
  border: 1px solid #223549;
  border-radius: 8px;
  transition:
    background 150ms ease,
    border-color 150ms ease;
}
.saved-roulette-card--active {
  background: #17314a;
  border-color: #3b82c4;
  box-shadow: inset 3px 0 #60a5fa;
}
.saved-roulette-card--live {
  border-color: #9f3d4a;
}
.saved-roulette-main {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  padding: 8px;
  color: #8da1b5;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
}
.saved-roulette-card--active .saved-roulette-main {
  color: #dbeafe;
}
.saved-roulette-main > span {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.saved-roulette-main strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saved-roulette-main small {
  color: #71859a;
  font-size: 7px;
}
.saved-roulette-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1px;
  padding: 0 5px 5px;
  color: #8295a8;
  border-top: 1px solid rgb(62 85 108 / 35%);
}
.saved-list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
  min-height: 72px;
  padding: 10px;
  color: #667b90;
  border: 1px dashed #2a3d50;
  border-radius: 8px;
  font-size: 8px;
  text-align: center;
}
.saved-list-empty .q-icon {
  font-size: 22px;
}
.editor-toggles {
  display: flex;
  flex-direction: column;
}
.duration-settings {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 8px;
}
.duration-toggle,
.duration-settings > small {
  grid-column: 1 / -1;
}
.duration-settings > small {
  color: #7f93a7;
  font-size: 9px;
}
.roulette-options-input :deep(textarea) {
  min-height: 150px !important;
  max-height: 420px;
  resize: vertical !important;
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
  overflow: auto;
  border: 1px solid #314a62;
  border-radius: 10px;
}
.operator-wheel :deep(.roulette-stage) {
  min-height: 560px;
  height: auto;
}
.spin-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
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
  grid-template-columns: 22px 6px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 8px 4px;
  border-bottom: 1px solid #233548;
}
.history-result-details {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.history-result-details small {
  color: #70859a;
  font-size: 8px;
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
.roulette-console {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  color: #dce7f2;
  background: #08111b;
}
.roulette-console-header,
.roulette-console-header > div,
.roulette-console-header > div:first-child > span:last-child {
  display: flex;
  align-items: center;
}
.roulette-console-header {
  min-height: 66px;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 18px;
  background: #101c29;
  border-bottom: 1px solid #2a4055;
}
.roulette-console-header > div:first-child {
  gap: 10px;
}
.roulette-console-header > div:first-child > span:last-child {
  align-items: flex-start;
  flex-direction: column;
}
.roulette-console-header small {
  color: #7890a7;
}
.console-live-dot {
  width: 10px;
  height: 10px;
  background: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 0 5px rgb(239 68 68 / 14%);
}
.roulette-console-body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 14px;
  padding: 14px;
}
.roulette-console-preview,
.roulette-console-controls {
  min-width: 0;
  min-height: 0;
  padding: 12px;
  background: #111d2a;
  border: 1px solid #293d51;
  border-radius: 12px;
}
.roulette-console-preview {
  display: flex;
  flex-direction: column;
}
.console-wheel-scroll {
  min-height: 0;
  flex: 1;
  margin-top: 9px;
  overflow: auto;
  border-radius: 10px;
}
.console-wheel-scroll :deep(.roulette-stage) {
  min-height: 680px;
  height: auto;
}
.roulette-console-controls {
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
}
.roulette-console-controls > .q-icon {
  align-self: center;
  color: #60a5fa;
  font-size: 58px;
}
.roulette-console-controls > strong,
.roulette-console-controls > p {
  text-align: center;
}
.roulette-console-controls > p {
  margin: 0 0 12px;
  color: #8195a9;
}
.console-duration-settings {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 8px;
}
.console-result {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: 8px;
  padding: 14px;
  background: #0c283e;
  border: 1px solid #38bdf8;
  border-radius: 10px;
  text-align: center;
}
.console-result small {
  color: #7dd3fc;
  text-transform: uppercase;
}
.console-result strong {
  overflow-wrap: anywhere;
  font-size: 20px;
}
@media (max-width: 820px) {
  .roulette-page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .roulette-console-body {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .roulette-console-preview {
    min-height: 640px;
  }
}
@media (max-width: 560px) {
  .roulette-page {
    padding: 14px;
  }
  .roulette-heading {
    align-items: flex-start;
  }
  .roulette-heading-icon {
    display: none;
  }
  .header-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
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
