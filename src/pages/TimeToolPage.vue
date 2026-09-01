<template>
  <q-page class="time-tool-page">
    <header class="tool-header">
      <q-btn
        flat
        round
        icon="arrow_back"
        aria-label="Volver"
        @click="router.push('/herramientas')"
      />
      <span class="tool-header-icon"><q-icon name="schedule" /></span>
      <div>
        <small>Herramientas · Control del tiempo</small>
        <h1>Reloj y tiempo</h1>
        <p>Prepara un reloj, temporizador o cronómetro y contrólalo cuando esté en vivo.</p>
      </div>
      <div class="header-actions">
        <q-btn outline no-caps icon="restart_alt" label="Restablecer" @click="restoreDefaults" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="live_tv"
          label="Enviar en vivo"
          @click="sendLive"
        />
      </div>
    </header>

    <main class="time-tool-layout">
      <aside class="time-settings panel-card">
        <div class="panel-title">
          <div><small>Configuración</small><strong>Prepara la herramienta</strong></div>
          <q-icon name="tune" />
        </div>

        <q-tabs
          v-model="config.mode"
          dense
          no-caps
          align="justify"
          active-color="primary"
          indicator-color="primary"
        >
          <q-tab name="clock" icon="schedule" label="Reloj" />
          <q-tab name="timer" icon="hourglass_top" label="Temporizador" />
          <q-tab name="stopwatch" icon="timer" label="Cronómetro" />
        </q-tabs>

        <div class="settings-scroll">
          <q-input v-model="config.title" dark outlined label="Título en pantalla" maxlength="80" />

          <template v-if="config.mode === 'clock'">
            <label class="field-label">Presentación del reloj</label>
            <q-btn-toggle
              v-model="config.clockStyle"
              spread
              no-caps
              unelevated
              toggle-color="primary"
              color="blue-grey-10"
              :options="[
                { label: 'Digital', value: 'digital', icon: 'pin' },
                { label: 'Análogo', value: 'analog', icon: 'schedule' },
              ]"
            />
            <q-toggle v-model="config.use24Hour" dark label="Formato de 24 horas" />
            <q-toggle v-model="config.showSeconds" dark label="Mostrar segundos" />
            <q-toggle v-model="config.showDate" dark label="Mostrar fecha" />
          </template>

          <template v-if="config.mode === 'timer'">
            <label class="field-label">Duración inicial</label>
            <div class="duration-grid">
              <q-input
                v-model.number="timerHours"
                dark
                outlined
                type="number"
                min="0"
                max="99"
                label="Horas"
              />
              <q-input
                v-model.number="timerMinutes"
                dark
                outlined
                type="number"
                min="0"
                max="59"
                label="Minutos"
              />
              <q-input
                v-model.number="timerSeconds"
                dark
                outlined
                type="number"
                min="0"
                max="59"
                label="Segundos"
              />
            </div>
            <q-toggle
              v-model="config.countdownSound"
              dark
              label="Sonido en los últimos 3 segundos"
            />
            <q-toggle v-model="config.completionSound" dark label="Sonido al finalizar" />
          </template>

          <template v-if="config.mode === 'stopwatch'">
            <q-toggle
              v-model="config.showMilliseconds"
              dark
              label="Mostrar centésimas de segundo"
            />
            <q-toggle v-model="config.completionSound" dark label="Sonido al detener" />
          </template>

          <template v-if="config.countdownSound || config.completionSound">
            <label class="field-label">Volumen · {{ Math.round(config.soundVolume * 100) }}%</label>
            <q-slider v-model="config.soundVolume" :min="0" :max="1" :step="0.05" color="primary" />
          </template>

          <div class="appearance-title"><q-icon name="palette" /> Apariencia</div>
          <div class="color-grid">
            <label>Fondo <input v-model="config.backgroundColor" type="color" /></label>
            <label>Acento <input v-model="config.accentColor" type="color" /></label>
            <label>Texto <input v-model="config.textColor" type="color" /></label>
          </div>

          <div class="separation-note">
            <q-icon name="info" /> Esta vista sirve para preparar y probar. Sus controles no cambian
            lo que está en vivo.
          </div>
        </div>
      </aside>

      <section class="operator-preview panel-card">
        <div class="panel-title">
          <div><small>Vista del operador</small><strong>Previsualización local</strong></div>
          <q-badge color="blue-grey-8" label="No está en vivo" />
        </div>
        <div class="preview-screen">
          <TimeToolDisplay :tool="localPresentation" play-sounds />
        </div>
        <div v-if="config.mode !== 'clock'" class="preview-controls">
          <q-btn
            v-if="!localState.running"
            unelevated
            no-caps
            color="primary"
            icon="play_arrow"
            label="Iniciar prueba"
            :disable="config.mode === 'timer' && config.durationMs <= 0"
            @click="startLocal"
          />
          <q-btn
            v-else
            unelevated
            no-caps
            color="orange-7"
            icon="pause"
            label="Pausar"
            @click="pauseLocal"
          />
          <q-btn flat no-caps icon="replay" label="Reiniciar" @click="resetLocal" />
        </div>
      </section>
    </main>

    <q-dialog
      v-model="liveConsoleOpen"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="live-console">
        <header class="live-console-header">
          <div>
            <small>Control en vivo</small>
            <h2>{{ liveTimeTool?.title || 'Reloj y tiempo' }}</h2>
            <p>Lo que controles aquí cambia inmediatamente en las pantallas de los miembros.</p>
          </div>
          <q-btn flat round icon="close" aria-label="Cerrar control en vivo" v-close-popup />
        </header>
        <div class="live-console-body">
          <section class="live-stage-wrap">
            <TimeToolDisplay v-if="liveTimeTool" :tool="liveTimeTool" play-sounds />
            <div v-else class="live-missing">Esta herramienta ya no está en vivo.</div>
          </section>
          <aside class="live-controls">
            <q-chip color="red-8" text-color="white" icon="fiber_manual_record">EN VIVO</q-chip>
            <h3>Control del operador</h3>
            <p v-if="liveTimeTool?.mode === 'clock'">
              El reloj está funcionando automáticamente. No necesita iniciarse.
            </p>
            <template v-else-if="liveTimeTool">
              <q-btn
                v-if="!liveTimeTool.running"
                unelevated
                no-caps
                size="lg"
                color="primary"
                icon="play_arrow"
                :label="liveTimeTool.baseTimeMs > 0 ? 'Iniciar' : 'Iniciar nuevamente'"
                @click="startLiveTimeTool"
              />
              <q-btn
                v-else
                unelevated
                no-caps
                size="lg"
                color="orange-7"
                icon="pause"
                label="Pausar"
                @click="pauseLiveTimeTool"
              />
              <q-btn
                outline
                no-caps
                size="lg"
                icon="restart_alt"
                label="Reiniciar"
                @click="resetLiveTimeTool"
              />
            </template>
            <q-separator dark />
            <q-btn
              outline
              no-caps
              color="red-4"
              icon="tv_off"
              label="Quitar de pantalla"
              @click="removeFromLive"
            />
            <small
              >También puedes usar estos controles desde Contenido activo en la pantalla
              principal.</small
            >
          </aside>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import TimeToolDisplay from '../components/TimeToolDisplay.vue';
import type { ServicePresentationItem } from '../shared/presentation';
import {
  currentTimeToolValue,
  type ClockDisplayStyle,
  type TimeToolMode,
  type TimeToolPresentationData,
} from '../shared/time-tool';
import { usePresentationStore } from '../stores/presentation-store';

const router = useRouter();
const presentationStore = usePresentationStore();
const { liveFrame } = storeToRefs(presentationStore);
const { clearLive, pauseLiveTimeTool, resetLiveTimeTool, startLiveTimeTool } = presentationStore;
const storageKey = 'icp-studio-time-tool-settings';

interface TimeToolConfig {
  title: string;
  mode: TimeToolMode;
  clockStyle: ClockDisplayStyle;
  use24Hour: boolean;
  showSeconds: boolean;
  showDate: boolean;
  showMilliseconds: boolean;
  durationMs: number;
  countdownSound: boolean;
  completionSound: boolean;
  soundVolume: number;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
}

const defaults: TimeToolConfig = {
  title: 'Reloj y tiempo',
  mode: 'clock',
  clockStyle: 'digital',
  use24Hour: false,
  showSeconds: true,
  showDate: true,
  showMilliseconds: true,
  durationMs: 5 * 60_000,
  countdownSound: true,
  completionSound: true,
  soundVolume: 0.55,
  backgroundColor: '#07111d',
  accentColor: '#38bdf8',
  textColor: '#f8fafc',
};

function loadConfig(): TimeToolConfig {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') };
  } catch {
    return { ...defaults };
  }
}

const config = reactive(loadConfig());
const localState = reactive({
  baseTimeMs: config.durationMs,
  startedAt: 0,
  running: false,
  completed: false,
});
const liveConsoleOpen = ref(false);
let localFinishTimer: number | null = null;

const timerHours = computed({
  get: () => Math.floor(config.durationMs / 3_600_000),
  set: (value: number) => updateDuration(Number(value), timerMinutes.value, timerSeconds.value),
});
const timerMinutes = computed({
  get: () => Math.floor((config.durationMs % 3_600_000) / 60_000),
  set: (value: number) => updateDuration(timerHours.value, Number(value), timerSeconds.value),
});
const timerSeconds = computed({
  get: () => Math.floor((config.durationMs % 60_000) / 1000),
  set: (value: number) => updateDuration(timerHours.value, timerMinutes.value, Number(value)),
});

function updateDuration(hours: number, minutes: number, seconds: number): void {
  config.durationMs = Math.min(
    359_999_000,
    Math.max(
      0,
      Math.max(0, hours || 0) * 3_600_000 +
        Math.max(0, minutes || 0) * 60_000 +
        Math.max(0, seconds || 0) * 1000,
    ),
  );
  if (!localState.running) localState.baseTimeMs = config.durationMs;
}

function buildPresentation(state = localState): TimeToolPresentationData {
  return {
    id: 'time-tool',
    title: config.title.trim() || 'Reloj y tiempo',
    mode: config.mode,
    clockStyle: config.clockStyle,
    use24Hour: config.use24Hour,
    showSeconds: config.showSeconds,
    showDate: config.showDate,
    showMilliseconds: config.showMilliseconds,
    durationMs: config.durationMs,
    baseTimeMs: state.baseTimeMs,
    startedAt: state.startedAt,
    running: state.running,
    completed: state.completed,
    countdownSound: config.countdownSound,
    completionSound: config.completionSound,
    soundVolume: config.soundVolume,
    backgroundColor: config.backgroundColor,
    accentColor: config.accentColor,
    textColor: config.textColor,
  };
}

const localPresentation = computed(() => buildPresentation());
const liveTimeTool = computed(() => liveFrame.value?.timeTool ?? null);

function startLocal(): void {
  if (config.mode === 'timer' && localState.baseTimeMs <= 0)
    localState.baseTimeMs = config.durationMs;
  localState.startedAt = Date.now();
  localState.running = true;
  localState.completed = false;
  if (config.mode === 'timer') {
    if (localFinishTimer !== null) window.clearTimeout(localFinishTimer);
    localFinishTimer = window.setTimeout(() => {
      localFinishTimer = null;
      localState.baseTimeMs = 0;
      localState.startedAt = 0;
      localState.running = false;
      localState.completed = true;
    }, localState.baseTimeMs);
  }
}
function pauseLocal(): void {
  const value = currentTimeToolValue(buildPresentation(), Date.now());
  localState.baseTimeMs = value;
  localState.startedAt = 0;
  localState.running = false;
  localState.completed = config.mode === 'timer' && value <= 0;
  if (localFinishTimer !== null) window.clearTimeout(localFinishTimer);
  localFinishTimer = null;
}
function resetLocal(): void {
  if (localFinishTimer !== null) window.clearTimeout(localFinishTimer);
  localFinishTimer = null;
  localState.baseTimeMs = config.mode === 'timer' ? config.durationMs : 0;
  localState.startedAt = 0;
  localState.running = false;
  localState.completed = false;
}
function restoreDefaults(): void {
  Object.assign(config, defaults);
  resetLocal();
}

function timeItem(): ServicePresentationItem {
  const timeTool = buildPresentation({
    baseTimeMs: config.mode === 'timer' ? config.durationMs : 0,
    startedAt: 0,
    running: false,
    completed: false,
  });
  return {
    id: `time-tool-${crypto.randomUUID()}`,
    sourceId: 'time-tool',
    type: 'time-tool',
    title: timeTool.title,
    footer: 'Herramienta de tiempo',
    frames: [
      {
        id: `time-frame-${crypto.randomUUID()}`,
        label:
          timeTool.mode === 'clock'
            ? 'Reloj'
            : timeTool.mode === 'timer'
              ? 'Temporizador'
              : 'Cronómetro',
        text: timeTool.title,
        timeTool,
      },
    ],
  };
}

function sendLive(): void {
  if (config.mode === 'timer' && config.durationMs <= 0) return;
  presentationStore.setLiveItem(timeItem());
  liveConsoleOpen.value = true;
}
function removeFromLive(): void {
  clearLive();
  liveConsoleOpen.value = false;
}

watch(config, () => localStorage.setItem(storageKey, JSON.stringify(config)), { deep: true });
watch(
  () => config.mode,
  () => resetLocal(),
);
onBeforeUnmount(() => {
  if (localFinishTimer !== null) window.clearTimeout(localFinishTimer);
});
</script>

<style scoped>
.time-tool-page {
  min-height: 100vh;
  padding: 24px;
  color: #e6edf7;
  background: #07111b;
}
.tool-header {
  display: grid;
  align-items: center;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 16px;
  margin-bottom: 20px;
  padding: 10px 2px 18px;
  border-bottom: 1px solid #223247;
}
.tool-header-icon {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  color: #7dd3fc;
  background: #0b3445;
  border: 1px solid #16627b;
  border-radius: 18px;
  font-size: 30px;
}
.tool-header small,
.panel-title small,
.live-console-header small {
  color: #7890a8;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.tool-header h1,
.live-console-header h2 {
  margin: 2px 0;
  font-size: 30px;
  line-height: 1.1;
}
.tool-header p,
.live-console-header p {
  margin: 4px 0 0;
  color: #8595a8;
}
.header-actions {
  display: flex;
  gap: 10px;
}
.time-tool-layout {
  display: grid;
  min-height: calc(100vh - 150px);
  grid-template-columns: minmax(330px, 420px) minmax(0, 1fr);
  gap: 18px;
}
.panel-card {
  min-height: 0;
  overflow: hidden;
  background: #0e1b28;
  border: 1px solid #293b50;
  border-radius: 18px;
  box-shadow: 0 18px 48px rgb(0 0 0 / 18%);
}
.time-settings {
  display: flex;
  flex-direction: column;
}
.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #26384b;
}
.panel-title > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.panel-title strong {
  font-size: 18px;
}
.panel-title > .q-icon {
  color: #60a5fa;
  font-size: 24px;
}
.settings-scroll {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
}
.field-label,
.appearance-title {
  color: #a9bbcf;
  font-size: 13px;
  font-weight: 650;
}
.duration-grid,
.color-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.appearance-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 5px;
}
.color-grid label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  padding: 8px;
  color: #aab8c8;
  background: #101f2e;
  border: 1px solid #2b3d52;
  border-radius: 8px;
  font-size: 11px;
}
.color-grid input {
  width: 30px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 0;
}
.separation-note {
  display: flex;
  gap: 9px;
  padding: 12px;
  color: #8fa6bc;
  background: rgb(30 95 130 / 18%);
  border: 1px solid #224965;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
}
.operator-preview {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.preview-screen {
  min-height: 420px;
  flex: 1;
  overflow: hidden;
}
.preview-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: #0b1722;
  border-top: 1px solid #26384b;
}
.live-console {
  min-height: 100vh;
  color: #e7eff8;
  background: #07111b;
}
.live-console-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 22px 28px;
  background: #0d1a27;
  border-bottom: 1px solid #293b50;
}
.live-console-body {
  display: grid;
  height: calc(100vh - 112px);
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 18px;
  padding: 18px;
}
.live-stage-wrap {
  overflow: hidden;
  border: 1px solid #30465e;
  border-radius: 18px;
}
.live-controls {
  display: flex;
  align-self: stretch;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
  background: #0e1b28;
  border: 1px solid #293b50;
  border-radius: 18px;
}
.live-controls h3 {
  margin: 0;
  font-size: 22px;
}
.live-controls p,
.live-controls small {
  color: #91a2b5;
  line-height: 1.5;
}
.live-missing {
  display: grid;
  height: 100%;
  place-items: center;
  color: #8fa0b2;
}
@media (max-width: 900px) {
  .time-tool-layout,
  .live-console-body {
    grid-template-columns: 1fr;
  }
  .tool-header {
    grid-template-columns: auto auto 1fr;
  }
  .header-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
  .live-console-body {
    height: auto;
  }
  .live-stage-wrap {
    min-height: 55vh;
  }
}
</style>
