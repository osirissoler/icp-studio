<template>
  <q-page class="metronome-page">
    <header class="metronome-header">
      <div class="metronome-heading">
        <button
          type="button"
          class="back-button"
          aria-label="Volver a herramientas"
          @click="router.push('/herramientas')"
        >
          <q-icon name="arrow_back" />
        </button>

        <span class="metronome-heading-icon">
          <q-icon name="speed" />
        </span>

        <div>
          <span class="metronome-eyebrow"> Herramientas · Música </span>

          <h1>Metrónomo</h1>

          <p>Marca el pulso para ensayos, músicos, grupos de canto y práctica de tempo.</p>
        </div>
      </div>

      <div class="metronome-header-actions">
        <q-btn
          outline
          no-caps
          color="blue-grey-3"
          icon="restart_alt"
          label="Restablecer"
          class="app-action-button app-action-button--secondary"
          @click="restoreDefaults"
        />

        <template v-if="liveMetronome">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="tune"
            label="Control En vivo"
            class="app-action-button app-action-button--primary"
            @click="openLiveConsole"
          />

          <q-btn
            v-if="liveMetronome.running"
            unelevated
            no-caps
            color="red-6"
            icon="stop"
            label="Detener"
            class="app-action-button app-action-button--live"
            @click="stopLiveMetronome"
          />
        </template>

        <q-btn
          v-else
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

    <main class="page-layout">
      <aside class="settings panel">
        <div class="panel-heading">
          <div>
            <small> CONFIGURACIÓN </small>

            <strong> Tempo y compás </strong>
          </div>

          <q-icon name="tune" />
        </div>

        <div class="settings-scroll">
          <q-input v-model="config.title" dark outlined label="Título en pantalla" maxlength="80" />

          <section class="setting-section">
            <div class="section-title">
              <q-icon name="speed" />

              <span> Velocidad </span>
            </div>

            <div class="bpm-editor">
              <q-btn round flat icon="remove" @click="changeBpm(-1)" />

              <div class="bpm-input">
                <input
                  v-model.number="config.bpm"
                  type="number"
                  min="30"
                  max="300"
                  @change="normalizeBpm"
                />

                <span> BPM </span>
              </div>

              <q-btn round flat icon="add" @click="changeBpm(1)" />
            </div>

            <q-slider
              v-model="config.bpm"
              :min="30"
              :max="300"
              :step="1"
              color="purple-4"
              label
              :label-value="`${config.bpm} BPM`"
            />

            <div class="quick-bpm">
              <q-btn flat dense no-caps label="-5" @click="changeBpm(-5)" />

              <q-btn
                unelevated
                no-caps
                color="purple-7"
                icon="touch_app"
                :label="tapLabel"
                @click="registerTap"
              />

              <q-btn flat dense no-caps label="+5" @click="changeBpm(5)" />
            </div>

            <div class="tempo-readout">
              <span>
                {{ tempoName }}
              </span>

              <strong> {{ beatSymbol }} = {{ config.bpm }} </strong>
            </div>
          </section>

          <section class="setting-section">
            <div class="section-title">
              <q-icon name="grid_view" />

              <span> Compás </span>
            </div>

            <div class="measure-grid">
              <q-input
                v-model.number="config.beatsPerMeasure"
                dark
                outlined
                type="number"
                min="2"
                max="12"
                label="Tiempos"
                @change="normalizeMeasure"
              />

              <q-select
                v-model="config.beatUnit"
                dark
                outlined
                emit-value
                map-options
                label="Figura"
                :options="beatUnitOptions"
              />
            </div>

            <div class="measure-preview">
              <strong> {{ config.beatsPerMeasure }}/{{ config.beatUnit }} </strong>

              <span>
                {{ config.beatUnit === 8 ? '♪ corchea' : '♩ negra' }}
              </span>
            </div>

            <q-toggle v-model="config.accentFirstBeat" dark label="Acentuar el primer tiempo" />

            <q-toggle v-model="config.showBeat" dark label="Mostrar número del tiempo" />

            <q-toggle v-model="config.showTempoName" dark label="Mostrar nombre del tempo" />
          </section>

          <section class="setting-section count-in-settings">
            <div class="section-title">
              <q-icon name="timer" />

              <span> Preconteo antes de comenzar </span>
            </div>

            <q-toggle v-model="config.countInEnabled" dark label="Activar conteo regresivo" />

            <template v-if="config.countInEnabled">
              <q-input
                v-model.number="config.countInBeats"
                dark
                outlined
                type="number"
                min="1"
                max="99"
                label="Comenzar desde"
                suffix="pulsos"
                @change="normalizeCountIn"
              />

              <div class="count-in-preview">
                <small> CONTEO </small>

                <strong>
                  {{ countInPreview }}
                </strong>

                <span>
                  Después del 1 comienza inmediatamente el metrónomo a
                  {{ config.bpm }} BPM.
                </span>
              </div>

              <q-toggle v-model="config.countInSound" dark label="Sonido durante el preconteo" />
            </template>
          </section>

          <section class="setting-section">
            <div class="section-title">
              <q-icon name="volume_up" />

              <span> Sonido </span>
            </div>

            <q-toggle v-model="config.soundEnabled" dark label="Activar clic del metrónomo" />

            <q-select
              v-model="config.soundStyle"
              dark
              outlined
              emit-value
              map-options
              label="Tipo de clic"
              :disable="!config.soundEnabled"
              :options="soundOptions"
            />

            <template v-if="config.soundEnabled">
              <label class="field-label">
                Volumen · {{ Math.round(config.soundVolume * 100) }}%
              </label>

              <q-slider
                v-model="config.soundVolume"
                :min="0"
                :max="1"
                :step="0.05"
                color="purple-4"
              />
            </template>
          </section>

          <section class="setting-section">
            <div class="section-title">
              <q-icon name="palette" />

              <span> Apariencia </span>
            </div>

            <label class="field-label">
              Tamaño · {{ Math.round(config.displayScale * 100) }}%
            </label>

            <q-slider
              v-model="config.displayScale"
              :min="0.65"
              :max="1.5"
              :step="0.05"
              color="purple-4"
            />

            <div class="colors">
              <label>
                Fondo

                <input v-model="config.backgroundColor" type="color" />
              </label>

              <label>
                Acento

                <input v-model="config.accentColor" type="color" />
              </label>

              <label>
                Texto

                <input v-model="config.textColor" type="color" />
              </label>
            </div>
          </section>

          <div class="shortcut-help">
            <q-icon name="keyboard" />

            <div>
              <strong> Atajos </strong>

              <span> Espacio · Iniciar/Pausar </span>

              <span> ↑ ↓ · BPM ±1 </span>

              <span> Shift + ↑ ↓ · BPM ±5 </span>

              <span> T · Tap Tempo </span>
            </div>
          </div>
        </div>
      </aside>

      <section class="preview panel">
        <div class="panel-heading">
          <div>
            <small> VISTA DEL OPERADOR </small>

            <strong> Previsualización local </strong>
          </div>

          <q-badge
            :color="liveMetronome ? 'red-8' : 'blue-grey-8'"
            :label="liveMetronome ? 'Metrónomo en vivo' : 'No está en vivo'"
          />
        </div>

        <div class="preview-screen">
          <MetronomeDisplay :tool="localPresentation" :play-sounds="!liveMetronome" />
        </div>

        <div class="preview-controls">
          <q-btn
            v-if="!localState.running"
            unelevated
            no-caps
            size="lg"
            color="purple-6"
            icon="play_arrow"
            :label="localState.baseTimeMs > 0 ? 'Continuar' : 'Iniciar'"
            @click="startLocal"
          />

          <q-btn
            v-else
            unelevated
            no-caps
            size="lg"
            color="orange-7"
            icon="pause"
            label="Pausar"
            @click="pauseLocal"
          />

          <q-btn
            outline
            no-caps
            size="lg"
            icon="restart_alt"
            label="Reiniciar"
            @click="resetLocal"
          />

          <q-btn
            outline
            no-caps
            size="lg"
            icon="touch_app"
            label="Tap Tempo"
            @click="registerTap"
          />
        </div>

        <div class="operator-info">
          <article>
            <span> TEMPO </span>

            <strong> {{ config.bpm }} BPM </strong>

            <small>
              {{ tempoName }}
            </small>
          </article>

          <article>
            <span> COMPÁS </span>

            <strong> {{ config.beatsPerMeasure }}/{{ config.beatUnit }} </strong>

            <small>
              {{ config.accentFirstBeat ? 'Primer tiempo acentuado' : 'Sin acento' }}
            </small>
          </article>

          <article>
            <span> PRECONTEO </span>

            <strong>
              {{ config.countInEnabled ? `Desde ${config.countInBeats}` : 'Desactivado' }}
            </strong>

            <small>
              {{ config.countInEnabled ? countInPreview : 'Comienza inmediatamente' }}
            </small>
          </article>

          <article>
            <span> SONIDO </span>

            <strong>
              {{ config.soundEnabled ? soundStyleLabel : 'Desactivado' }}
            </strong>

            <small>
              {{ config.soundEnabled ? `${Math.round(config.soundVolume * 100)}%` : 'Solo visual' }}
            </small>
          </article>
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
        <header class="live-header">
          <div>
            <small> CONTROL EN VIVO </small>

            <h2>
              {{ liveMetronome?.title || 'Metrónomo' }}
            </h2>

            <p>
              Enviar a En vivo solo lo coloca en pantalla. El conteo y el metrónomo comienzan cuando
              pulses Iniciar.
            </p>
          </div>

          <q-btn flat round icon="close" aria-label="Cerrar" v-close-popup />
        </header>

        <div class="live-body">
          <section class="live-preview">
            <MetronomeDisplay v-if="liveMetronome" :tool="liveMetronome" :play-sounds="false" />

            <div v-else class="missing-live">El metrónomo ya no está en vivo.</div>
          </section>

          <aside class="live-controls">
            <q-chip color="red-8" text-color="white" icon="fiber_manual_record"> EN VIVO </q-chip>

            <h3>Control del operador</h3>

            <template v-if="liveMetronome">
              <div class="live-tempo">
                <small> TEMPO </small>

                <strong>
                  {{ liveMetronome.metronomeBpm ?? 120 }}
                </strong>

                <span> BPM </span>
              </div>

              <div class="live-measure">
                {{ liveMetronome.metronomeBeatsPerMeasure ?? 4 }}/{{
                  liveMetronome.metronomeBeatUnit ?? 4
                }}
              </div>

              <div class="live-count-in">
                <small> PRECONTEO </small>

                <strong>
                  {{ liveCountInLabel }}
                </strong>
              </div>

              <q-btn
                v-if="!liveMetronome.running"
                unelevated
                no-caps
                size="lg"
                color="purple-6"
                icon="play_arrow"
                :label="liveMetronome.baseTimeMs > 0 ? 'Continuar' : 'Iniciar'"
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

            <div class="live-note">
              <q-icon name="volume_up" />

              <span>
                El preconteo y el clic se generan desde la primera pantalla pública. Las demás
                pantallas permanecen sincronizadas sin duplicar el sonido.
              </span>
            </div>

            <q-btn
              outline
              no-caps
              color="red-4"
              icon="tv_off"
              label="Quitar de pantalla"
              @click="removeFromLive"
            />
          </aside>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { useRouter } from 'vue-router';

import { storeToRefs } from 'pinia';

import MetronomeDisplay from './components/MetronomeDisplay.vue';

import type { ServicePresentationItem } from '../../shared/presentation';

import {
  currentTimeToolValue,
  type MetronomeBeatUnit,
  type MetronomeSoundStyle,
  type TimeToolPresentationData,
} from '../../shared/time-tool';

import { usePresentationStore } from '../../stores/presentation-store';

interface MetronomeConfig {
  title: string;
  bpm: number;
  beatsPerMeasure: number;
  beatUnit: MetronomeBeatUnit;
  accentFirstBeat: boolean;
  countInEnabled: boolean;
  countInBeats: number;
  countInSound: boolean;
  soundEnabled: boolean;
  soundStyle: MetronomeSoundStyle;
  soundVolume: number;
  showBeat: boolean;
  showTempoName: boolean;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  displayScale: number;
}

interface MetronomeState {
  baseTimeMs: number;
  startedAt: number;
  running: boolean;
  completed: boolean;
}

const router = useRouter();

const presentationStore = usePresentationStore();

const { liveFrame } = storeToRefs(presentationStore);

const { clearLive, pauseLiveTimeTool, resetLiveTimeTool, startLiveTimeTool } = presentationStore;

const storageKey = 'icp-studio-metronome-settings';

const defaults: MetronomeConfig = {
  title: 'Metrónomo',
  bpm: 120,
  beatsPerMeasure: 4,
  beatUnit: 4,
  accentFirstBeat: true,
  countInEnabled: true,
  countInBeats: 4,
  countInSound: true,
  soundEnabled: true,
  soundStyle: 'classic',
  soundVolume: 0.58,
  showBeat: true,
  showTempoName: true,
  backgroundColor: '#07111d',
  accentColor: '#a78bfa',
  textColor: '#f8fafc',
  displayScale: 1,
};

function loadConfig(): MetronomeConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<MetronomeConfig>;

    return {
      ...defaults,
      ...saved,

      bpm: Math.round(clamp(Number(saved.bpm ?? defaults.bpm), 30, 300)),

      beatsPerMeasure: Math.round(
        clamp(Number(saved.beatsPerMeasure ?? defaults.beatsPerMeasure), 2, 12),
      ),

      beatUnit: saved.beatUnit === 8 ? 8 : 4,

      countInBeats: Math.round(clamp(Number(saved.countInBeats ?? defaults.countInBeats), 1, 99)),

      displayScale: clamp(Number(saved.displayScale ?? defaults.displayScale), 0.65, 1.5),
    };
  } catch {
    return {
      ...defaults,
    };
  }
}

const config = reactive<MetronomeConfig>(loadConfig());

const localState = reactive<MetronomeState>({
  baseTimeMs: 0,
  startedAt: 0,
  running: false,
  completed: false,
});

const liveConsoleOpen = ref(false);

const tapTimes = ref<number[]>([]);

const tapLabel = ref('Tap Tempo');

let tapResetTimer: number | null = null;

const beatUnitOptions = [
  {
    label: '♩ Negra',
    value: 4,
  },
  {
    label: '♪ Corchea',
    value: 8,
  },
];

const soundOptions = [
  {
    label: 'Clásico',
    value: 'classic',
  },
  {
    label: 'Madera',
    value: 'wood',
  },
  {
    label: 'Digital',
    value: 'digital',
  },
];

const tempoName = computed(() => getTempoName(config.bpm));

const beatSymbol = computed(() => (config.beatUnit === 8 ? '♪' : '♩'));

const countInDurationMs = computed(() => {
  if (!config.countInEnabled) {
    return 0;
  }

  return (60_000 / config.bpm) * config.countInBeats;
});

const countInPreview = computed(() => {
  if (!config.countInEnabled) {
    return 'Desactivado';
  }

  if (config.countInBeats <= 8) {
    return Array.from(
      {
        length: config.countInBeats,
      },
      (_, index) => config.countInBeats - index,
    ).join(' · ');
  }

  return `${config.countInBeats} · … · 3 · 2 · 1`;
});

const soundStyleLabel = computed(() => {
  if (config.soundStyle === 'wood') {
    return 'Madera';
  }

  if (config.soundStyle === 'digital') {
    return 'Digital';
  }

  return 'Clásico';
});

function buildPresentation(state: MetronomeState = localState): TimeToolPresentationData {
  return {
    id: 'metronome',

    title: config.title.trim() || 'Metrónomo',

    mode: 'metronome',

    clockStyle: 'digital',

    use24Hour: false,

    showSeconds: false,

    showDate: false,

    showMilliseconds: false,

    durationMs: countInDurationMs.value,

    baseTimeMs: state.baseTimeMs,

    startedAt: state.startedAt,

    running: state.running,

    completed: state.completed,

    countdownSound: config.countInSound,

    completionSound: false,

    soundVolume: config.soundVolume,

    backgroundColor: config.backgroundColor,

    accentColor: config.accentColor,

    textColor: config.textColor,

    displayScale: config.displayScale,

    metronomeBpm: config.bpm,

    metronomeBeatsPerMeasure: config.beatsPerMeasure,

    metronomeBeatUnit: config.beatUnit,

    metronomeAccentFirstBeat: config.accentFirstBeat,

    metronomeSoundEnabled: config.soundEnabled,

    metronomeSoundStyle: config.soundStyle,

    metronomeShowBeat: config.showBeat,

    metronomeShowTempoName: config.showTempoName,
  };
}

const localPresentation = computed(() => buildPresentation());

const liveMetronome = computed(() => {
  const tool = liveFrame.value?.timeTool;

  if (tool?.mode !== 'metronome') {
    return null;
  }

  return tool;
});

const liveCountInLabel = computed(() => {
  const tool = liveMetronome.value;

  if (!tool || tool.durationMs <= 0) {
    return 'Desactivado';
  }

  const bpmValue = clamp(Number(tool.metronomeBpm ?? 120), 30, 300);

  const beatDuration = 60_000 / bpmValue;

  const beats = Math.max(1, Math.round(tool.durationMs / beatDuration));

  return `Desde ${beats}`;
});

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeBpm(): void {
  config.bpm = Math.round(clamp(Number(config.bpm), 30, 300));
}

function normalizeMeasure(): void {
  config.beatsPerMeasure = Math.round(clamp(Number(config.beatsPerMeasure), 2, 12));
}

function normalizeCountIn(): void {
  config.countInBeats = Math.round(clamp(Number(config.countInBeats), 1, 99));
}

function changeBpm(amount: number): void {
  config.bpm = Math.round(clamp(config.bpm + amount, 30, 300));
}

function getTempoName(bpm: number): string {
  if (bpm < 40) {
    return 'Grave';
  }

  if (bpm < 60) {
    return 'Largo';
  }

  if (bpm < 66) {
    return 'Larghetto';
  }

  if (bpm < 76) {
    return 'Adagio';
  }

  if (bpm < 108) {
    return 'Andante';
  }

  if (bpm < 120) {
    return 'Moderato';
  }

  if (bpm < 156) {
    return 'Allegro';
  }

  if (bpm < 176) {
    return 'Vivace';
  }

  if (bpm < 200) {
    return 'Presto';
  }

  return 'Prestissimo';
}

function registerTap(): void {
  const current = performance.now();

  const previous = tapTimes.value.at(-1);

  if (previous !== undefined && current - previous > 2500) {
    tapTimes.value = [];
  }

  tapTimes.value = [...tapTimes.value, current].slice(-7);

  tapLabel.value = tapTimes.value.length < 2 ? 'Otra vez...' : 'Tap Tempo';

  if (tapTimes.value.length >= 2) {
    const intervals: number[] = [];

    for (let index = 1; index < tapTimes.value.length; index += 1) {
      const currentTap = tapTimes.value[index];

      const previousTap = tapTimes.value[index - 1];

      if (currentTap === undefined || previousTap === undefined) {
        continue;
      }

      intervals.push(currentTap - previousTap);
    }

    if (intervals.length) {
      const average = intervals.reduce((total, interval) => total + interval, 0) / intervals.length;

      config.bpm = Math.round(clamp(60_000 / average, 30, 300));
    }
  }

  if (tapResetTimer !== null) {
    window.clearTimeout(tapResetTimer);
  }

  tapResetTimer = window.setTimeout(() => {
    tapTimes.value = [];

    tapLabel.value = 'Tap Tempo';

    tapResetTimer = null;
  }, 2500);
}

function startLocal(): void {
  if (localState.running) {
    return;
  }

  localState.startedAt = Date.now();

  localState.running = true;

  localState.completed = false;
}

function pauseLocal(): void {
  if (!localState.running) {
    return;
  }

  localState.baseTimeMs = currentTimeToolValue(buildPresentation(), Date.now());

  localState.startedAt = 0;

  localState.running = false;
}

function resetLocal(): void {
  localState.baseTimeMs = 0;

  localState.startedAt = 0;

  localState.running = false;

  localState.completed = false;
}

function toggleLocal(): void {
  if (localState.running) {
    pauseLocal();

    return;
  }

  startLocal();
}

function restoreDefaults(): void {
  resetLocal();

  Object.assign(config, defaults);

  tapTimes.value = [];

  tapLabel.value = 'Tap Tempo';
}

function metronomeItem(): ServicePresentationItem {
  const metronome = buildPresentation({
    baseTimeMs: 0,
    startedAt: 0,
    running: false,
    completed: false,
  });

  return {
    id: `metronome-${crypto.randomUUID()}`,

    sourceId: 'metronome',

    type: 'time-tool',

    title: metronome.title,

    footer: 'Metrónomo',

    frames: [
      {
        id: `metronome-frame-${crypto.randomUUID()}`,

        label: 'Metrónomo',

        text: `${config.bpm} BPM · ${config.beatsPerMeasure}/${config.beatUnit}`,

        timeTool: metronome,
      },
    ],
  };
}

function sendLive(): void {
  resetLocal();

  presentationStore.setLiveItem(metronomeItem());

  liveConsoleOpen.value = true;
}

function openLiveConsole(): void {
  if (!liveMetronome.value) {
    return;
  }

  liveConsoleOpen.value = true;
}

function stopLiveMetronome(): void {
  if (!liveMetronome.value) {
    return;
  }

  resetLiveTimeTool();
}

function removeFromLive(): void {
  clearLive();

  liveConsoleOpen.value = false;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

function handleKeyDown(event: KeyboardEvent): void {
  if (isEditableTarget(event.target)) {
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();

    if (liveConsoleOpen.value && liveMetronome.value) {
      if (liveMetronome.value.running) {
        pauseLiveTimeTool();
      } else {
        startLiveTimeTool();
      }

      return;
    }

    toggleLocal();

    return;
  }

  if (event.key.toLowerCase() === 't') {
    event.preventDefault();

    registerTap();

    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();

    changeBpm(event.shiftKey ? 5 : 1);

    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();

    changeBpm(event.shiftKey ? -5 : -1);
  }
}

watch(
  config,

  () => {
    normalizeBpm();

    normalizeMeasure();

    normalizeCountIn();

    localStorage.setItem(storageKey, JSON.stringify(config));
  },

  {
    deep: true,
  },
);

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);

  if (tapResetTimer !== null) {
    window.clearTimeout(tapResetTimer);
  }
});
</script>

<style scoped>
.metronome-page {
  min-height: 100%;

  padding: 20px;

  color: #e7eef7;

  background: radial-gradient(circle at 78% -15%, rgb(31 82 123 / 22%), transparent 34%), #0b121b;
}

.metronome-header,
.metronome-heading,
.metronome-header-actions {
  display: flex;

  align-items: center;
}

.metronome-header {
  justify-content: space-between;

  gap: 18px;

  margin-bottom: 16px;
}

.metronome-heading {
  min-width: 0;

  gap: 12px;
}

.metronome-heading > div {
  min-width: 0;
}

.back-button {
  display: grid;

  width: 36px;
  height: 36px;

  flex: 0 0 36px;

  place-items: center;

  padding: 0;

  color: #9fb3c8;

  background: transparent;

  border: 1px solid #26394f;

  border-radius: 10px;

  font: inherit;

  font-size: 20px;

  cursor: pointer;
}

.back-button:hover {
  color: #dbeafe;

  border-color: #4d7199;
}

.metronome-heading-icon {
  display: grid;

  width: 46px;
  height: 46px;

  flex: 0 0 46px;

  place-items: center;

  color: #c4b5fd;

  background: #241a46;

  border: 1px solid #5b45a1;

  border-radius: 13px;

  font-size: 24px;
}

.metronome-eyebrow {
  color: #6e839a;

  font-size: 9px;

  letter-spacing: 0.08em;

  text-transform: uppercase;
}

.metronome-heading h1 {
  margin: 1px 0 0;

  font-size: 22px;

  line-height: 1.2;
}

.metronome-heading p {
  margin: 3px 0 0;

  color: #8190a3;

  font-size: 11px;
}

.metronome-header-actions {
  gap: 8px;
}

.metronome-header-actions .q-btn {
  min-height: 39px;

  border-radius: 9px;
}

.app-action-button {
  min-height: 40px;

  padding: 0 16px;

  border-radius: 9px;

  font-weight: 700;

  letter-spacing: 0;
}

.app-action-button--secondary {
  min-width: 130px;
}

.app-action-button--primary {
  min-width: 145px;
}

.app-action-button--live {
  min-width: 140px;
}

/*
 * Los dos paneles comparten UNA MISMA
 * fila de Grid.
 *
 * El panel que necesite más altura
 * determina la altura de toda la fila.
 *
 * Ambos se estiran exactamente hasta
 * el mismo borde inferior.
 */
.page-layout {
  display: grid;

  grid-template-columns:
    340px
    minmax(0, 1fr);

  align-items: stretch;

  gap: 14px;
}

.panel {
  min-height: 0;

  overflow: hidden;

  background: linear-gradient(145deg, #0f1b29, #0b1622);

  border: 1px solid #263a4f;

  border-radius: 14px;
}

.panel-heading {
  display: flex;

  min-height: 62px;

  flex: 0 0 62px;

  align-items: center;
  justify-content: space-between;

  padding: 13px 15px;

  border-bottom: 1px solid #26384b;
}

.panel-heading > div {
  display: flex;

  flex-direction: column;
}

.panel-heading small {
  color: #718399;

  font-size: 7px;

  font-weight: 800;

  letter-spacing: 0.12em;
}

.panel-heading strong {
  color: #e7eef6;

  font-size: 12px;
}

.panel-heading .q-icon {
  color: #a78bfa;

  font-size: 21px;
}

/*
 * CONFIGURACIÓN
 *
 * Ya NO tiene max-height independiente.
 * Se estira exactamente igual que
 * la Vista del operador.
 */
.settings {
  display: flex;

  min-width: 0;
  min-height: 0;

  flex-direction: column;

  align-self: stretch;
}

/*
 * El scroll vive aquí dentro.
 *
 * El card completo nunca queda más corto
 * que el de la derecha.
 */
.settings-scroll {
  display: flex;

  min-height: 0;

  flex: 1 1 0;

  flex-direction: column;

  gap: 14px;

  padding: 15px;

  overflow-x: hidden;
  overflow-y: auto;
}

.setting-section {
  flex: 0 0 auto;

  padding: 13px;

  background: #0a1622;

  border: 1px solid #203348;

  border-radius: 11px;
}

.count-in-settings {
  background: linear-gradient(145deg, rgb(139 92 246 / 8%), #0a1622 60%);

  border-color: rgb(167 139 250 / 25%);
}

.section-title {
  display: flex;

  align-items: center;

  gap: 7px;

  margin-bottom: 12px;

  color: #d8e2ed;

  font-size: 10px;

  font-weight: 750;
}

.section-title .q-icon {
  color: #a78bfa;

  font-size: 18px;
}

.bpm-editor {
  display: flex;

  align-items: center;
  justify-content: center;

  gap: 8px;

  margin-bottom: 5px;
}

.bpm-input {
  display: flex;

  align-items: baseline;
  justify-content: center;
  flex-direction: column;
}

.bpm-input input {
  width: 92px;

  padding: 0;

  color: #f8fafc;

  background: transparent;

  border: 0;

  outline: 0;

  font: inherit;

  font-size: 40px;

  font-weight: 800;

  line-height: 1;

  text-align: center;

  -moz-appearance: textfield;
}

.bpm-input input::-webkit-inner-spin-button,
.bpm-input input::-webkit-outer-spin-button {
  margin: 0;

  -webkit-appearance: none;
}

.bpm-input span {
  align-self: center;

  margin-top: 3px;

  color: #718399;

  font-size: 8px;

  font-weight: 800;

  letter-spacing: 0.14em;
}

.quick-bpm {
  display: grid;

  grid-template-columns: 1fr 1.8fr 1fr;

  gap: 7px;

  margin-top: 5px;
}

.tempo-readout {
  display: flex;

  align-items: center;
  justify-content: space-between;

  margin-top: 10px;

  padding: 8px 10px;

  color: #9a8fc5;

  background: rgb(139 92 246 / 6%);

  border: 1px solid rgb(139 92 246 / 17%);

  border-radius: 8px;

  font-size: 9px;
}

.tempo-readout strong {
  color: #c4b5fd;
}

.measure-grid {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 8px;
}

.measure-preview {
  display: flex;

  align-items: baseline;

  gap: 8px;

  margin: 10px 0 6px;

  padding: 9px 10px;

  background: #101e2d;

  border: 1px solid #273b50;

  border-radius: 8px;
}

.measure-preview strong {
  color: #c4b5fd;

  font-size: 21px;
}

.measure-preview span {
  color: #8294a8;

  font-size: 9px;
}

.count-in-preview {
  display: flex;

  margin: 10px 0 5px;

  flex-direction: column;

  gap: 4px;

  padding: 11px;

  background: rgb(139 92 246 / 7%);

  border: 1px solid rgb(167 139 250 / 18%);

  border-radius: 9px;
}

.count-in-preview small {
  color: #8f82bf;

  font-size: 7px;

  font-weight: 800;

  letter-spacing: 0.12em;
}

.count-in-preview strong {
  overflow: hidden;

  color: #c4b5fd;

  font-size: 16px;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.count-in-preview span {
  color: #8294a8;

  font-size: 8px;

  line-height: 1.5;
}

.field-label {
  display: block;

  margin: 9px 0 1px;

  color: #8799ad;

  font-size: 8px;
}

.colors {
  display: grid;

  grid-template-columns: repeat(3, 1fr);

  gap: 7px;

  margin-top: 8px;
}

.colors label {
  display: flex;

  align-items: center;
  justify-content: space-between;
  flex-direction: column;

  gap: 6px;

  padding: 8px;

  color: #8193a7;

  background: #0e1c29;

  border: 1px solid #253a50;

  border-radius: 8px;

  font-size: 8px;
}

.colors input {
  width: 100%;
  height: 28px;

  padding: 0;

  overflow: hidden;

  background: transparent;

  border: 0;

  border-radius: 5px;

  cursor: pointer;
}

.shortcut-help {
  display: flex;

  flex: 0 0 auto;

  gap: 9px;

  padding: 11px;

  color: #7f91a5;

  background: rgb(96 165 250 / 4%);

  border: 1px solid rgb(96 165 250 / 12%);

  border-radius: 9px;
}

.shortcut-help .q-icon {
  flex: 0 0 auto;

  color: #60a5fa;

  font-size: 20px;
}

.shortcut-help div {
  display: flex;

  flex-direction: column;

  gap: 2px;
}

.shortcut-help strong {
  margin-bottom: 3px;

  color: #aac8ef;

  font-size: 9px;
}

.shortcut-help span {
  font-size: 8px;
}

/*
 * PREVISUALIZACIÓN
 *
 * También ocupa la altura completa
 * de la misma fila.
 */
.preview {
  display: flex;

  min-width: 0;
  min-height: 0;

  align-self: stretch;

  flex-direction: column;
}

.preview-screen {
  min-height: 510px;

  flex: 1 1 auto;

  overflow: hidden;

  background: #02070b;
}

.preview-controls {
  display: flex;

  flex: 0 0 auto;

  align-items: center;
  justify-content: center;
  flex-wrap: wrap;

  gap: 8px;

  padding: 13px;

  border-top: 1px solid #26394d;
}

.operator-info {
  display: grid;

  flex: 0 0 auto;

  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 8px;

  padding: 0 13px 13px;
}

.operator-info article {
  padding: 10px 12px;

  background: #0a1622;

  border: 1px solid #203348;

  border-radius: 9px;
}

.operator-info span {
  display: block;

  color: #718399;

  font-size: 7px;

  letter-spacing: 0.08em;
}

.operator-info strong {
  display: block;

  margin-top: 3px;

  overflow: hidden;

  color: #e7eef6;

  font-size: 11px;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.operator-info small {
  display: block;

  overflow: hidden;

  color: #718399;

  font-size: 8px;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.live-console {
  min-height: 100vh;

  color: #e6edf7;

  background: #07111b;
}

.live-header {
  display: flex;

  min-height: 85px;

  align-items: center;
  justify-content: space-between;

  gap: 20px;

  padding: 16px 22px;

  border-bottom: 1px solid #26384c;
}

.live-header small {
  color: #ef4444;

  font-size: 8px;

  font-weight: 800;

  letter-spacing: 0.14em;
}

.live-header h2 {
  margin: 2px 0;

  color: #f8fafc;

  font-size: 22px;
}

.live-header p {
  margin: 0;

  color: #8395a9;

  font-size: 11px;
}

.live-body {
  display: grid;

  min-height: calc(100vh - 85px);

  grid-template-columns:
    minmax(0, 1fr)
    320px;
}

.live-preview {
  display: grid;

  min-width: 0;

  background: #02070b;

  place-items: stretch;
}

.live-controls {
  display: flex;

  flex-direction: column;

  gap: 12px;

  padding: 22px;

  background: #0d1825;

  border-left: 1px solid #26394d;
}

.live-controls h3 {
  margin: 0;

  color: #f1f5f9;

  font-size: 17px;
}

.live-tempo {
  display: flex;

  align-items: baseline;

  gap: 7px;

  padding: 14px;

  background: #081420;

  border: 1px solid #25394e;

  border-radius: 10px;
}

.live-tempo small,
.live-count-in small {
  color: #718399;

  font-size: 7px;

  letter-spacing: 0.08em;
}

.live-tempo strong {
  color: #c4b5fd;

  font-size: 38px;

  line-height: 1;
}

.live-tempo span {
  color: #8294a8;

  font-size: 9px;
}

.live-measure {
  color: #e7eef6;

  font-size: 18px;

  font-weight: 750;
}

.live-count-in {
  display: flex;

  flex-direction: column;

  gap: 2px;

  padding: 11px 13px;

  background: rgb(139 92 246 / 5%);

  border: 1px solid rgb(167 139 250 / 16%);

  border-radius: 9px;
}

.live-count-in strong {
  color: #c4b5fd;

  font-size: 14px;
}

.live-note {
  display: flex;

  gap: 8px;

  padding: 10px;

  color: #8294a8;

  background: rgb(59 130 246 / 4%);

  border: 1px solid rgb(59 130 246 / 12%);

  border-radius: 9px;

  font-size: 8px;

  line-height: 1.5;
}

.live-note .q-icon {
  flex: 0 0 auto;

  color: #60a5fa;

  font-size: 18px;
}

.missing-live {
  display: grid;

  min-height: 70vh;

  color: #718399;

  place-items: center;
}

@media (max-width: 1150px) {
  .page-layout {
    grid-template-columns:
      310px
      minmax(0, 1fr);
  }

  .operator-info {
    grid-template-columns: repeat(2, 1fr);
  }

  .preview-screen {
    min-height: 450px;
  }
}

@media (max-width: 900px) {
  .metronome-page {
    padding: 12px;
  }

  .metronome-header {
    align-items: flex-start;

    flex-direction: column;
  }

  .metronome-header-actions {
    width: 100%;

    flex-wrap: wrap;
  }

  .page-layout {
    grid-template-columns: 1fr;
  }

  .settings,
  .preview {
    height: auto;
  }

  .settings-scroll {
    overflow-y: visible;
  }

  .live-body {
    grid-template-columns: 1fr;
  }

  .live-controls {
    border-top: 1px solid #26394d;

    border-left: 0;
  }
}

@media (max-width: 620px) {
  .metronome-header {
    align-items: stretch;

    flex-direction: column;
  }

  .metronome-heading-icon,
  .metronome-heading p {
    display: none;
  }

  .metronome-header-actions {
    display: grid;

    grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  }

  .measure-grid,
  .operator-info,
  .colors {
    grid-template-columns: 1fr;
  }

  .preview-screen {
    min-height: 620px;
  }
}
</style>
