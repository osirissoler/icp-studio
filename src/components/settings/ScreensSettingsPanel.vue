<template>
  <section class="screens-settings-panel">
    <div class="panel-heading">
      <div>
        <h2>Pantallas</h2>
        <p>Configura los monitores físicos y agrúpalos por áreas de proyección.</p>
      </div>
      <q-btn outline no-caps color="light-blue-4" icon="pin_drop" label="Identificar" :loading="identifying" @click="identifyDisplays" />
    </div>

    <q-card flat class="settings-card mode-card">
      <q-card-section class="card-header">
        <div>
          <strong>Pantallas que utilizará ICP Studio</strong>
          <small>Automático usa todas las pantallas externas. La pantalla del operador se habilita aparte.</small>
        </div>
      </q-card-section>
      <q-separator dark />
      <q-card-section class="mode-options">
        <button v-for="option in modeOptions" :key="option.value" type="button" class="mode-option" :class="{ 'mode-option--active': mode === option.value }" @click="mode = option.value">
          <q-icon :name="option.icon" />
          <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
          <q-icon :name="mode === option.value ? 'check_circle' : 'radio_button_unchecked'" />
        </button>
      </q-card-section>
    </q-card>

    <div v-if="loading" class="loading-state">
      <q-spinner color="primary" size="34px" />
      <span>Leyendo pantallas...</span>
    </div>

    <template v-else>
      <div class="display-grid">
        <q-card v-for="display in displays" :key="display.id" flat class="settings-card display-card">
          <q-card-section class="display-card-main">
            <div class="display-icon">
              <q-icon :name="display.isPrimary ? 'laptop_mac' : 'connected_tv'" />
              <span>{{ displayNumber(display) }}</span>
            </div>
            <div class="display-info">
              <strong>{{ display.label }}</strong>
              <small>{{ display.bounds.width }} × {{ display.bounds.height }} · escala {{ display.scaleFactor }}</small>
              <q-badge
                :color="display.isPrimary ? (operatorDisplayProjectionEnabled ? 'positive' : 'blue-grey-7') : isProjectionSelected(display) ? 'positive' : 'blue-grey-8'"
                :label="display.isPrimary ? (operatorDisplayProjectionEnabled ? 'Operador + Proyección' : 'Solo operador') : isProjectionSelected(display) ? 'Disponible para proyección' : 'Desactivada'"
              />
            </div>
          </q-card-section>
          <q-separator dark />
          <q-card-section class="display-controls">
            <q-toggle
              v-if="display.isPrimary"
              :model-value="operatorDisplayProjectionEnabled"
              color="positive"
              label="Permitir proyección en esta pantalla"
              @update:model-value="toggleOperatorProjection(Boolean($event))"
            />
            <q-toggle
              v-else
              :model-value="isProjectionSelected(display)"
              :disable="mode === 'automatic'"
              color="positive"
              label="Usar esta pantalla"
              @update:model-value="toggleProjection(display, Boolean($event))"
            />
            <small v-if="display.isPrimary" class="control-help">
              {{ operatorDisplayProjectionEnabled ? 'Puede asignarse a un área y abrirá una ventana de proyección sobre la pantalla del operador.' : 'No se usará como salida de proyección.' }}
            </small>
            <small v-else-if="mode === 'automatic'" class="control-help">Incluida por modo automático</small>
            <small v-else class="control-help">Puedes dejarla fuera de la proyección</small>
          </q-card-section>
        </q-card>
      </div>

      <q-card flat class="settings-card independent-card">
        <q-card-section class="independent-header">
          <div class="independent-icon"><q-icon name="splitscreen" /></div>
          <div class="independent-copy">
            <strong>Proyecciones diferentes por área</strong>
            <small>Una misma área puede usar varias pantallas. Todas las pantallas del área mostrarán siempre el mismo contenido.</small>
          </div>
          <q-toggle v-model="independentProjectionEnabled" color="positive" size="lg" :label="independentProjectionEnabled ? 'Habilitado' : 'Deshabilitado'" />
        </q-card-section>

        <template v-if="independentProjectionEnabled">
          <q-separator dark />
          <q-card-section class="areas-section">
            <div class="areas-heading">
              <div>
                <strong>Áreas de proyección</strong>
                <small>Asigna una o varias pantallas a cada área. Una pantalla solo puede pertenecer a un área.</small>
              </div>
              <q-btn outline no-caps color="light-blue-4" icon="add" label="Crear área" @click="addProjectionArea" />
            </div>

            <div v-if="projectionAreas.length" class="areas-list">
              <q-card v-for="(area, index) in projectionAreas" :key="area.localId" flat class="area-card" :class="{ 'area-card--disabled': !area.enabled }">
                <q-card-section class="area-row">
                  <div class="area-number">{{ index + 1 }}</div>

                  <q-input v-model="area.name" dark dense outlined maxlength="60" label="Nombre del área" class="area-name">
                    <template #prepend><q-icon name="label" /></template>
                  </q-input>

                  <q-select
                    :model-value="area.displayIds"
                    :options="displayOptions"
                    dark
                    dense
                    outlined
                    multiple
                    use-chips
                    emit-value
                    map-options
                    label="Pantallas del área"
                    class="area-display"
                    popup-content-class="projection-area-menu"
                    @update:model-value="setAreaDisplaysFromValue(area.localId, $event)"
                  >
                    <template #prepend><q-icon name="desktop_windows" /></template>
                  </q-select>

                  <q-toggle v-model="area.enabled" color="positive" label="Activa" />

                  <q-btn flat round color="negative" icon="delete_outline" aria-label="Eliminar área" @click="removeProjectionArea(area.localId)">
                    <q-tooltip>Eliminar área</q-tooltip>
                  </q-btn>
                </q-card-section>

                <div class="area-status">
                  <q-icon :name="area.displayIds.length === 0 ? 'warning_amber' : 'check_circle'" />
                  <span v-if="area.displayIds.length === 0">Esta área todavía no tiene pantallas asignadas.</span>
                  <span v-else>{{ areaDisplaySummary(area.displayIds) }}</span>
                </div>
              </q-card>
            </div>

            <div v-else class="areas-empty">
              <q-icon name="dashboard_customize" />
              <div>
                <strong>No has creado áreas.</strong>
                <span>Crea, por ejemplo, Principal, Jóvenes, Lobby o Entrada.</span>
              </div>
            </div>
          </q-card-section>
        </template>
      </q-card>

      <q-card flat class="settings-card audio-card">
        <q-card-section class="card-header">
          <div>
            <strong>Audio de las pantallas de proyección</strong>
            <small>Elige una pantalla para el audio principal o desactívalo en las pantallas.</small>
          </div>
        </q-card-section>
        <q-separator dark />
        <q-card-section class="audio-options">
          <q-radio v-model="audioDisplayId" :val="null" color="amber-5" label="Sin audio en pantallas" />
          <q-radio v-for="display in selectedAudioDisplays" :key="display.id" v-model="audioDisplayId" :val="display.id" color="amber-5" :label="`Audio por ${display.label}`" />
        </q-card-section>
      </q-card>

      <div class="summary-row">
        <div><q-icon name="tv" /><span>{{ selectedProjectionIds.length }} pantalla{{ selectedProjectionIds.length === 1 ? '' : 's' }} disponible{{ selectedProjectionIds.length === 1 ? '' : 's' }}</span></div>
        <div><q-icon :name="operatorDisplayProjectionEnabled ? 'laptop_mac' : 'laptop'" /><span>{{ operatorDisplayProjectionEnabled ? 'Pantalla del operador habilitada para proyección' : 'Pantalla del operador solo para control' }}</span></div>
        <div><q-icon :name="independentProjectionEnabled ? 'splitscreen' : 'content_copy'" /><span>{{ independentProjectionEnabled ? `${activeAreaCount} área${activeAreaCount === 1 ? '' : 's'} activa${activeAreaCount === 1 ? '' : 's'}` : 'Modo espejo' }}</span></div>
        <div><q-icon :name="audioDisplayId === null ? 'volume_off' : 'volume_up'" /><span>{{ audioDisplayLabel }}</span></div>
      </div>

      <div class="actions-row">
        <q-btn flat no-caps color="blue-grey-4" label="Recargar pantallas" icon="refresh" @click="loadStatus" />
        <q-btn unelevated no-caps color="primary" icon="check" label="Aplicar configuración" :loading="applying" @click="applyConfiguration" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Notify } from 'quasar';
import type {
  DisplayConfigurationMode,
  DisplayInfo,
  DisplayStatus,
  ProjectionOutputAssignmentRequest,
} from '../../shared/display';

interface ProjectionAreaDraft {
  localId: string;
  outputId?: string;
  name: string;
  enabled: boolean;
  displayIds: number[];
}

const modeOptions = [
  { value: 'automatic' as const, label: 'Automático', icon: 'auto_awesome', description: 'Todas las pantallas externas quedan disponibles.' },
  { value: 'custom' as const, label: 'Personalizado', icon: 'tune', description: 'Tú decides cuáles pantallas externas puede utilizar ICP Studio.' },
];

const displays = ref<DisplayInfo[]>([]);
const mode = ref<DisplayConfigurationMode>('automatic');
const customProjectionIds = ref<number[]>([]);
const independentProjectionEnabled = ref(false);
const operatorDisplayProjectionEnabled = ref(false);
const projectionAreas = ref<ProjectionAreaDraft[]>([]);
const audioDisplayId = ref<number | null>(null);
const loading = ref(true);
const applying = ref(false);
const identifying = ref(false);
let unsubscribeStatus: (() => void) | undefined;

const primaryDisplay = computed(() => displays.value.find((display) => display.isPrimary) ?? null);
const externalDisplays = computed(() => displays.value.filter((display) => !display.isPrimary));
const selectedExternalProjectionIds = computed(() =>
  mode.value === 'automatic'
    ? externalDisplays.value.map((display) => display.id)
    : customProjectionIds.value.filter((id) => externalDisplays.value.some((display) => display.id === id)),
);
const selectedProjectionIds = computed(() => {
  const ids = [...selectedExternalProjectionIds.value];
  if (operatorDisplayProjectionEnabled.value && primaryDisplay.value) {
    ids.unshift(primaryDisplay.value.id);
  }
  return ids;
});
const selectedAudioDisplays = computed(() => displays.value.filter((display) => selectedProjectionIds.value.includes(display.id)));
const activeAreaCount = computed(() => projectionAreas.value.filter((area) => area.enabled && area.displayIds.length > 0).length);
const displayOptions = computed(() => selectedProjectionIds.value.map((id) => ({ value: id, label: displayOptionLabel(id) })));
const audioDisplayLabel = computed(() => audioDisplayId.value === null ? 'Audio desactivado en pantallas' : `Audio: ${displayLabel(audioDisplayId.value)}`);

function displayNumber(display: DisplayInfo): number {
  return displays.value.findIndex((item) => item.id === display.id) + 1;
}

function displayLabel(displayId: number): string {
  return displays.value.find((display) => display.id === displayId)?.label ?? `Pantalla ${displayId}`;
}

function displayOptionLabel(displayId: number): string {
  const display = displays.value.find((item) => item.id === displayId);
  if (!display) return `Pantalla ${displayId}`;
  const suffix = display.isPrimary ? ' · Operador' : '';
  return `Pantalla ${displayNumber(display)} · ${display.label}${suffix}`;
}

function areaDisplaySummary(displayIds: number[]): string {
  return displayIds.map(displayOptionLabel).join(' · ');
}

function isProjectionSelected(display: DisplayInfo): boolean {
  if (display.isPrimary) return operatorDisplayProjectionEnabled.value;
  return selectedExternalProjectionIds.value.includes(display.id);
}

function validateAudioSelection(): void {
  if (audioDisplayId.value !== null && !selectedProjectionIds.value.includes(audioDisplayId.value)) audioDisplayId.value = null;
}

function validateAreaAssignments(): void {
  const allowed = new Set(selectedProjectionIds.value);
  const used = new Set<number>();
  projectionAreas.value.forEach((area) => {
    area.displayIds = area.displayIds.filter((displayId) => {
      if (!allowed.has(displayId) || used.has(displayId)) return false;
      used.add(displayId);
      return true;
    });
  });
}

function setAreaDisplays(localId: string, nextDisplayIds: number[]): void {
  const target = projectionAreas.value.find((area) => area.localId === localId);
  if (!target) return;
  const allowed = new Set(selectedProjectionIds.value);
  const uniqueNext = Array.from(new Set(nextDisplayIds.filter((id) => allowed.has(id))));

  projectionAreas.value.forEach((area) => {
    if (area.localId !== localId) {
      area.displayIds = area.displayIds.filter((id) => !uniqueNext.includes(id));
    }
  });
  target.displayIds = uniqueNext;
}

function setAreaDisplaysFromValue(localId: string, value: unknown): void {
  if (!Array.isArray(value)) return;
  setAreaDisplays(localId, value.filter((item): item is number => typeof item === 'number' && Number.isInteger(item)));
}

function toggleOperatorProjection(enabled: boolean): void {
  operatorDisplayProjectionEnabled.value = enabled;
  validateAudioSelection();
  validateAreaAssignments();
}

function toggleProjection(display: DisplayInfo, explicitValue?: boolean): void {
  if (display.isPrimary || mode.value === 'automatic') return;
  const current = customProjectionIds.value.includes(display.id);
  const next = explicitValue ?? !current;
  customProjectionIds.value = next
    ? Array.from(new Set([...customProjectionIds.value, display.id]))
    : customProjectionIds.value.filter((id) => id !== display.id);
  validateAudioSelection();
  validateAreaAssignments();
}

function nextAreaName(): string {
  const preferred = ['Principal', 'Retorno', 'Lobby', 'Murales'];
  return preferred[projectionAreas.value.length] ?? `Área ${projectionAreas.value.length + 1}`;
}

function addProjectionArea(): void {
  const used = new Set(projectionAreas.value.flatMap((area) => area.displayIds));
  const availableDisplay = selectedProjectionIds.value.find((id) => !used.has(id));
  projectionAreas.value.push({
    localId: crypto.randomUUID(),
    name: nextAreaName(),
    enabled: true,
    displayIds: availableDisplay === undefined ? [] : [availableDisplay],
  });
}

function removeProjectionArea(localId: string): void {
  projectionAreas.value = projectionAreas.value.filter((area) => area.localId !== localId);
}

function resolvedDisplayIds(status: DisplayStatus, outputId: string, storedIds: number[]): number[] {
  const active = status.activeProjectionOutputs.find((output) => output.outputId === outputId);
  if (active) return [...active.displayIds];
  return storedIds.filter((id) => status.displays.some((display) => display.id === id));
}

function applyStatus(status: DisplayStatus): void {
  displays.value = status.displays;
  mode.value = status.configuration.mode;
  independentProjectionEnabled.value = status.configuration.independentProjectionEnabled;
  operatorDisplayProjectionEnabled.value = status.configuration.operatorDisplayProjectionEnabled;
  customProjectionIds.value = status.activeProjectionDisplayIds.filter((id) => status.displays.some((display) => !display.isPrimary && display.id === id));
  projectionAreas.value = status.configuration.projectionOutputs.map((output) => ({
    localId: output.outputId,
    outputId: output.outputId,
    name: output.name,
    enabled: output.enabled,
    displayIds: resolvedDisplayIds(status, output.outputId, output.displays.map((display) => display.id).filter((id): id is number => id !== null)),
  }));
  audioDisplayId.value = status.audioDisplayId;
  validateAudioSelection();
  validateAreaAssignments();
}

async function loadStatus(): Promise<void> {
  loading.value = true;
  try {
    const status = await window.icpStudio?.displays.getStatus();
    if (status) applyStatus(status);
  } finally {
    loading.value = false;
  }
}

async function applyConfiguration(): Promise<void> {
  applying.value = true;
  try {
    validateAudioSelection();
    validateAreaAssignments();
    const areas: ProjectionOutputAssignmentRequest[] = projectionAreas.value.map((area) => ({
      outputId: area.outputId,
      name: area.name.trim() || 'Área',
      enabled: area.enabled,
      displayIds: [...area.displayIds],
    }));

    const status = await window.icpStudio?.displays.applyConfiguration({
      mode: mode.value,
      independentProjectionEnabled: independentProjectionEnabled.value,
      operatorDisplayProjectionEnabled: operatorDisplayProjectionEnabled.value,
      projectionDisplayIds: selectedExternalProjectionIds.value,
      audioDisplayId: audioDisplayId.value,
      projectionOutputs: areas,
    });
    if (status) applyStatus(status);
    Notify.create({ type: 'positive', message: independentProjectionEnabled.value ? 'Pantallas y áreas de proyección actualizadas.' : 'Pantallas actualizadas en modo espejo.' });
  } catch (error) {
    Notify.create({ type: 'negative', message: error instanceof Error ? error.message : 'No se pudo aplicar la configuración.' });
  } finally {
    applying.value = false;
  }
}

async function identifyDisplays(): Promise<void> {
  identifying.value = true;
  try {
    await window.icpStudio?.displays.identify();
  } finally {
    identifying.value = false;
  }
}

watch(mode, () => {
  validateAudioSelection();
  validateAreaAssignments();
});

onMounted(async () => {
  await loadStatus();
  unsubscribeStatus = window.icpStudio?.displays.onStatusChanged(applyStatus);
});

onBeforeUnmount(() => unsubscribeStatus?.());
</script>

<style scoped>
.screens-settings-panel { padding: 24px; color: #e8eef6; }
.panel-heading, .card-header, .summary-row, .actions-row, .independent-header, .areas-heading, .area-row { display: flex; align-items: center; gap: 16px; }
.panel-heading, .card-header, .areas-heading { justify-content: space-between; }
.panel-heading { margin-bottom: 18px; }
.panel-heading h2 { margin: 0; font-size: 22px; }
.panel-heading p, .card-header small, .mode-option small, .display-info small, .control-help, .independent-copy small, .areas-heading small { margin: 4px 0 0; color: #8fa0b5; }
.settings-card { color: #e8eef6; background: #111c29; border: 1px solid #26384d; border-radius: 12px; }
.mode-card { margin-bottom: 18px; }
.card-header > div, .mode-option span, .display-info, .independent-copy, .areas-heading > div { display: flex; flex-direction: column; }
.mode-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.mode-option { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 14px; text-align: left; color: #dbe7f5; background: #0d1621; border: 1px solid #2a3b50; border-radius: 10px; cursor: pointer; }
.mode-option--active { border-color: #4ba3ff; background: #102740; }
.loading-state { display: flex; min-height: 180px; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: #91a2b7; }
.display-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
.display-card-main { display: flex; align-items: center; gap: 14px; }
.display-icon { position: relative; display: grid; width: 58px; height: 48px; place-items: center; font-size: 28px; }
.display-icon span { position: absolute; right: -3px; bottom: -4px; display: grid; width: 22px; height: 22px; place-items: center; color: #07111d; background: #e7eef7; border-radius: 50%; font-size: 11px; font-weight: 800; }
.display-info { min-width: 0; flex: 1; gap: 4px; }
.display-info .q-badge { align-self: flex-start; }
.display-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.independent-card, .audio-card { margin-top: 18px; }
.independent-header { padding: 18px; }
.independent-icon { display: grid; width: 48px; height: 48px; flex: 0 0 48px; place-items: center; color: #8fd3ff; background: #102740; border-radius: 12px; font-size: 25px; }
.independent-copy { min-width: 0; flex: 1; }
.areas-section { padding: 18px; }
.areas-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.area-card { color: #e8eef6; background: #0b1520; border: 1px solid #2a3b50; border-radius: 10px; }
.area-card--disabled { opacity: .62; }
.area-row { padding: 12px; }
.area-number { display: grid; width: 30px; height: 30px; flex: 0 0 30px; place-items: center; color: #bfe2ff; background: #16304a; border-radius: 8px; font-weight: 700; }
.area-name { min-width: 180px; flex: 1; }
.area-display { min-width: 280px; flex: 1.4; }
.area-status { display: flex; align-items: center; gap: 8px; padding: 0 12px 10px 58px; color: #8295aa; font-size: 12px; }
.areas-empty { display: flex; min-height: 100px; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; color: #74879d; background: #0b1520; border: 1px dashed #2d4056; border-radius: 10px; }
.audio-options { display: flex; flex-wrap: wrap; gap: 10px 22px; }
.summary-row { justify-content: space-between; flex-wrap: wrap; margin-top: 18px; padding: 12px 14px; background: #0d1621; border: 1px solid #26384d; border-radius: 10px; }
.summary-row > div { display: flex; align-items: center; gap: 8px; color: #aebed0; }
.actions-row { justify-content: flex-end; margin-top: 16px; }
:deep(.projection-area-menu) { color: #e8eef6; background: #111c29; border: 1px solid #30455e; }
@media (max-width: 900px) { .area-row { align-items: stretch; flex-wrap: wrap; } .area-name, .area-display { min-width: calc(50% - 40px); } }
@media (max-width: 700px) { .mode-options { grid-template-columns: 1fr; } .display-controls, .summary-row, .independent-header { align-items: flex-start; flex-direction: column; } .audio-options { flex-direction: column; } .area-name, .area-display { width: 100%; min-width: 100%; } .area-status { padding-left: 12px; } }
</style>
