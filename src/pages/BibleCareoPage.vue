<template>
  <q-page class="careo-page">
    <div class="careo-shell">
      <header class="careo-header">
        <div class="header-left">
          <q-btn flat round dense icon="arrow_back" @click="goBack" />
          <div class="careo-icon"><q-icon name="groups" /></div>
          <div>
            <h1>Careo bíblico</h1>
            <p>Combina actividades bíblicas, equipos, puntuación y rondas en una sola competencia.</p>
          </div>
        </div>
        <q-btn v-if="viewMode === 'library'" unelevated no-caps icon="add" label="Nuevo careo" class="primary-button" @click="createCareo" />
        <div v-else-if="viewMode === 'editor'" class="header-actions">
          <q-btn flat no-caps label="Cancelar" @click="cancelEditor" />
          <q-btn unelevated no-caps icon="save" label="Guardar careo" class="primary-button" @click="saveCareo" />
        </div>
        <div v-else class="header-actions">
          <q-badge color="positive">EN VIVO</q-badge>
          <q-btn flat no-caps icon="close" label="Terminar" @click="finishSession" />
        </div>
      </header>

      <main v-if="viewMode === 'library'" class="library-view">
        <div v-if="careos.length === 0" class="empty-state">
          <q-icon name="groups" size="58px" />
          <h2>Crea tu primer careo bíblico</h2>
          <p>Mezcla crucigramas, personajes, frases, verdadero/falso, quién dijo esto e Imagen escondida.</p>
          <q-btn unelevated no-caps icon="add" label="Nuevo careo" class="primary-button" @click="createCareo" />
        </div>
        <div v-else class="careo-grid">
          <article v-for="careo in careos" :key="careo.id" class="careo-card">
            <div class="careo-card-top">
              <div class="careo-card-icon"><q-icon name="emoji_events" /></div>
              <div>
                <h3>{{ careo.title }}</h3>
                <span>{{ careo.teamNames.length }} equipos · {{ careo.activities.length }} actividades</span>
              </div>
            </div>
            <div class="careo-types">
              <q-chip v-for="type in careoTypes(careo)" :key="type" dense>{{ getDefinition(type).label }}</q-chip>
            </div>
            <div class="card-actions">
              <q-btn flat round dense icon="edit" @click="editCareo(careo)" />
              <q-btn flat round dense icon="delete_outline" color="red-4" @click="removeCareo(careo)" />
              <q-btn unelevated no-caps icon="play_arrow" label="Comenzar" class="primary-button" @click="startCareo(careo)" />
            </div>
          </article>
        </div>
      </main>

      <main v-else-if="viewMode === 'editor'" class="editor-view">
        <aside class="settings-panel">
          <div class="section-title"><span>CONFIGURACIÓN</span><h2>Datos del careo</h2></div>
          <label>Nombre del careo</label>
          <q-input v-model="form.title" dark outlined dense placeholder="Ej. Careo de Jóvenes 2026" />

          <div class="form-section">
            <div class="row-title">
              <div><label>Equipos</label><small>Entre 2 y 8 equipos.</small></div>
              <q-btn flat round dense icon="add" :disable="form.teamNames.length >= 8" @click="addTeam" />
            </div>
            <div v-for="(_, index) in form.teamNames" :key="index" class="team-input-row">
              <q-input v-model="form.teamNames[index]" dark outlined dense :label="`Equipo ${index + 1}`" />
              <q-btn flat round dense icon="close" :disable="form.teamNames.length <= 2" @click="removeTeam(index)" />
            </div>
          </div>

          <div class="score-grid form-section">
            <div><label>Puntos iniciales</label><q-input v-model.number="form.initialScore" type="number" min="0" dark outlined dense suffix="pts" /></div>
            <div><label>Puntos por acierto</label><q-input v-model.number="form.pointsPerCorrect" type="number" min="0" dark outlined dense suffix="pts" /></div>
          </div>
        </aside>

        <section class="activity-builder">
          <div class="builder-header">
            <div><span>SECUENCIA DEL CAREO</span><h2>Actividades seleccionadas</h2></div>
            <q-badge>{{ form.activities.length }}</q-badge>
          </div>

          <div v-if="form.activities.length" class="selected-list">
            <article v-for="(entry, index) in form.activities" :key="entry.id" class="selected-entry">
              <span class="entry-number">{{ index + 1 }}</span>
              <q-icon :name="getDefinition(entry.activityType).icon" :style="{ color: getDefinition(entry.activityType).color }" />
              <div><strong>{{ entry.title }}</strong><small>{{ getDefinition(entry.activityType).label }}</small></div>
              <q-btn flat round dense icon="arrow_upward" :disable="index === 0" @click="moveEntry(index, -1)" />
              <q-btn flat round dense icon="arrow_downward" :disable="index === form.activities.length - 1" @click="moveEntry(index, 1)" />
              <q-btn flat round dense icon="close" color="red-4" @click="removeEntry(index)" />
            </article>
          </div>
          <div v-else class="selected-empty">Agrega actividades desde la biblioteca inferior.</div>

          <div class="source-header"><span>BIBLIOTECA DE ACTIVIDADES</span><h2>Agregar al careo</h2></div>
          <div class="source-grid">
            <article v-for="source in availableSources" :key="`${source.activityType}-${source.sourceActivityId}`" class="source-card">
              <q-icon :name="getDefinition(source.activityType).icon" :style="{ color: getDefinition(source.activityType).color }" />
              <div><strong>{{ source.title }}</strong><small>{{ getDefinition(source.activityType).label }}</small></div>
              <q-btn flat round dense icon="add" color="light-blue-4" @click="addEntry(source)" />
            </article>
          </div>
        </section>
      </main>

      <main v-else class="live-view">
        <aside class="score-sidebar">
          <div class="session-title"><span>CAREO EN VIVO</span><h2>{{ activeCareo?.title }}</h2><p>Actividad {{ activeEntryIndex + 1 }} de {{ activeCareo?.activities.length ?? 0 }}</p></div>
          <div class="scoreboard">
            <button v-for="team in teams" :key="team.id" class="team-card" :class="{ active: team.id === activeTeamId }" @click="activeTeamId = team.id">
              <div><strong>{{ team.name }}</strong><small>{{ team.id === activeTeamId ? 'Equipo seleccionado' : 'Seleccionar' }}</small></div>
              <span>{{ team.score }}</span>
            </button>
          </div>
          <div v-if="activeTeam" class="manual-score">
            <q-btn flat round dense icon="remove" @click="adjustScore(-10)" />
            <strong>{{ activeTeam.score }}</strong>
            <q-btn flat round dense icon="add" @click="adjustScore(10)" />
          </div>
          <div class="careo-entry-list">
            <button v-for="(entry, index) in activeCareo?.activities ?? []" :key="entry.id" class="entry-nav" :class="{ active: index === activeEntryIndex, done: completedEntries.has(entry.id) }" @click="selectEntry(index)">
              <span>{{ completedEntries.has(entry.id) ? '✓' : index + 1 }}</span>
              <div><strong>{{ entry.title }}</strong><small>{{ getDefinition(entry.activityType).label }}</small></div>
            </button>
          </div>
        </aside>

        <section class="live-workspace">
          <template v-if="activeEntry?.activityType === 'hidden-image'">
            <div class="external-activity-card">
              <q-icon name="image_search" size="60px" />
              <h2>{{ activeEntry.title }}</h2>
              <p>Imagen escondida conserva su motor especializado de casillas, pistas y puntuación.</p>
              <q-btn unelevated no-caps icon="open_in_new" label="Abrir Imagen escondida" class="primary-button" @click="openHiddenImage" />
              <q-btn flat no-caps icon="check_circle" label="Marcar completada y continuar" @click="completeEntry(false)" />
            </div>
          </template>

          <template v-else-if="activeActivity && activeRound">
            <div class="live-topbar">
              <div><span>{{ getDefinition(activeActivity.type).label }}</span><h2>{{ activeActivity.title }}</h2></div>
              <div>Ronda {{ activeRoundIndex + 1 }} / {{ activeActivity.rounds.length }}</div>
            </div>
            <div class="question-stage">
              <span>{{ getDefinition(activeActivity.type).label }}</span>
              <h1>{{ displayPrompt(activeRound, activeActivity.type) }}</h1>
              <div v-if="showHint && activeRound.hint" class="hint-box">💡 {{ activeRound.hint }}</div>
              <div v-if="showAnswer" class="answer-box"><small>RESPUESTA</small><strong>{{ activeRound.answer }}</strong><p v-if="activeRound.explanation">{{ activeRound.explanation }}</p></div>
              <small v-if="activeRound.bibleReference" class="reference">{{ activeRound.bibleReference }}</small>
            </div>
            <div class="live-controls">
              <q-btn flat no-caps icon="lightbulb" label="Pista" :disable="!activeRound.hint" @click="toggleHint" />
              <q-btn flat no-caps icon="visibility" label="Respuesta" @click="revealAnswer" />
              <q-btn unelevated no-caps icon="check_circle" :label="`Acierto +${activeCareo?.pointsPerCorrect ?? 0}`" class="correct-button" :disable="!activeTeam" @click="awardCorrect" />
              <q-space />
              <q-btn flat no-caps icon="arrow_upward" label="Anterior" :disable="activeRoundIndex <= 0" @click="moveRound(-1)" />
              <q-btn unelevated no-caps icon-right="arrow_downward" label="Siguiente" class="primary-button" :disable="activeRoundIndex >= activeActivity.rounds.length - 1" @click="moveRound(1)" />
            </div>
          </template>

          <div v-else class="missing-activity">
            <q-icon name="warning_amber" size="52px" /><h2>Actividad no disponible</h2><p>Puede haber sido eliminada de su biblioteca.</p>
            <q-btn flat no-caps label="Saltar actividad" @click="completeEntry(false)" />
          </div>
        </section>
      </main>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import {
  createBibleActivityId,
  deleteBibleCareo,
  getBibleActivities,
  getBibleActivity,
  getBibleCareos,
  saveBibleCareo,
} from '../services/bible-activity-library';
import {
  BIBLE_ACTIVITY_DEFINITIONS,
  getBibleActivityDefinition,
  type BibleActivityRecord,
  type BibleActivityRound,
  type BibleActivityType,
  type BibleCareo,
  type CareoActivityEntry,
} from '../shared/bible-activities';

interface TeamState { id: string; name: string; score: number }
interface ActivitySource { activityType: BibleActivityType; sourceActivityId: string; title: string }
type ViewMode = 'library' | 'editor' | 'live';

const router = useRouter();
const $q = useQuasar();
const viewMode = ref<ViewMode>('library');
const careos = ref<BibleCareo[]>([]);
const editingId = ref<string | null>(null);
const availableSources = ref<ActivitySource[]>([]);
const form = reactive({ title: '', teamNames: ['Equipo 1', 'Equipo 2'], initialScore: 100, pointsPerCorrect: 100, activities: [] as CareoActivityEntry[] });

const activeCareo = ref<BibleCareo | null>(null);
const activeEntryIndex = ref(0);
const activeRoundIndex = ref(0);
const teams = ref<TeamState[]>([]);
const activeTeamId = ref('');
const showHint = ref(false);
const showAnswer = ref(false);
const completedEntries = ref(new Set<string>());

const activeEntry = computed(() => activeCareo.value?.activities[activeEntryIndex.value] ?? null);
const activeActivity = computed<BibleActivityRecord | null>(() => {
  const entry = activeEntry.value;
  if (!entry || entry.activityType === 'hidden-image') return null;
  return getBibleActivity(entry.sourceActivityId);
});
const activeRound = computed(() => activeActivity.value?.rounds[activeRoundIndex.value] ?? null);
const activeTeam = computed(() => teams.value.find((team) => team.id === activeTeamId.value) ?? null);

function getDefinition(type: BibleActivityType) { return getBibleActivityDefinition(type); }
function careoTypes(careo: BibleCareo): BibleActivityType[] { return [...new Set(careo.activities.map((entry) => entry.activityType))]; }
function reload(): void { careos.value = getBibleCareos(); void loadSources(); }

async function loadHiddenImageSources(): Promise<ActivitySource[]> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('icp-studio', 1);
      request.onerror = () => resolve([]);
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('hidden-image-activities')) { database.close(); resolve([]); return; }
        const transaction = database.transaction('hidden-image-activities', 'readonly');
        const getAllRequest = transaction.objectStore('hidden-image-activities').getAll();
        getAllRequest.onerror = () => { database.close(); resolve([]); };
        getAllRequest.onsuccess = () => {
          const records = getAllRequest.result as Array<{ id?: unknown; title?: unknown }>;
          database.close();
          resolve(records.filter((record) => typeof record.id === 'string').map((record) => ({ activityType: 'hidden-image', sourceActivityId: String(record.id), title: typeof record.title === 'string' ? record.title : 'Imagen escondida' })));
        };
      };
    } catch { resolve([]); }
  });
}

async function loadSources(): Promise<void> {
  const generic = getBibleActivities().map((activity) => ({ activityType: activity.type as BibleActivityType, sourceActivityId: activity.id, title: activity.title }));
  availableSources.value = [...generic, ...(await loadHiddenImageSources())];
}

function resetForm(): void { form.title = ''; form.teamNames = ['Equipo 1', 'Equipo 2']; form.initialScore = 100; form.pointsPerCorrect = 100; form.activities = []; }
function goBack(): void { if (viewMode.value !== 'library') { finishSession(false); viewMode.value = 'library'; return; } void router.push('/actividades'); }
function createCareo(): void { editingId.value = null; resetForm(); viewMode.value = 'editor'; void loadSources(); }
function editCareo(careo: BibleCareo): void { editingId.value = careo.id; form.title = careo.title; form.teamNames = [...careo.teamNames]; form.initialScore = careo.initialScore; form.pointsPerCorrect = careo.pointsPerCorrect; form.activities = careo.activities.map((entry) => ({ ...entry })); viewMode.value = 'editor'; void loadSources(); }
function cancelEditor(): void { viewMode.value = 'library'; resetForm(); }
function addTeam(): void { if (form.teamNames.length < 8) form.teamNames.push(`Equipo ${form.teamNames.length + 1}`); }
function removeTeam(index: number): void { if (form.teamNames.length > 2) form.teamNames.splice(index, 1); }
function addEntry(source: ActivitySource): void { form.activities.push({ id: createBibleActivityId('careo-entry'), ...source }); }
function removeEntry(index: number): void { form.activities.splice(index, 1); }
function moveEntry(index: number, direction: -1 | 1): void { const target = index + direction; if (target < 0 || target >= form.activities.length) return; const [entry] = form.activities.splice(index, 1); if (entry) form.activities.splice(target, 0, entry); }

function saveCareo(): void {
  if (!form.title.trim()) { $q.notify({ type: 'warning', message: 'Escribe un nombre para el careo.' }); return; }
  if (form.teamNames.some((name) => !name.trim())) { $q.notify({ type: 'warning', message: 'Todos los equipos necesitan un nombre.' }); return; }
  if (form.activities.length === 0) { $q.notify({ type: 'warning', message: 'Agrega al menos una actividad al careo.' }); return; }
  const existing = editingId.value ? careos.value.find((careo) => careo.id === editingId.value) : null;
  const now = new Date().toISOString();
  saveBibleCareo({ id: editingId.value ?? createBibleActivityId('careo'), title: form.title.trim(), teamNames: form.teamNames.map((name) => name.trim()), initialScore: Math.max(0, Number(form.initialScore) || 0), pointsPerCorrect: Math.max(0, Number(form.pointsPerCorrect) || 0), activities: form.activities.map((entry) => ({ ...entry })), createdAt: existing?.createdAt ?? now, updatedAt: now });
  reload(); viewMode.value = 'library'; $q.notify({ type: 'positive', message: 'Careo guardado.' });
}

function removeCareo(careo: BibleCareo): void { if (!window.confirm(`¿Eliminar “${careo.title}”?`)) return; deleteBibleCareo(careo.id); reload(); }
function startCareo(careo: BibleCareo): void { activeCareo.value = careo; activeEntryIndex.value = 0; activeRoundIndex.value = 0; teams.value = careo.teamNames.map((name, index) => ({ id: `team-${index + 1}`, name, score: careo.initialScore })); activeTeamId.value = teams.value[0]?.id ?? ''; completedEntries.value = new Set(); showHint.value = false; showAnswer.value = false; viewMode.value = 'live'; sendLive(); }
function selectEntry(index: number): void { if (!activeCareo.value?.activities[index]) return; activeEntryIndex.value = index; activeRoundIndex.value = 0; showHint.value = false; showAnswer.value = false; sendLive(); }
function displayPrompt(round: BibleActivityRound, type: BibleActivityType): string { if (type === 'order-phrase') return [...round.answer.split(/\s+/)].sort(() => Math.random() - 0.5).join('  ·  '); return round.prompt; }
function moveRound(direction: -1 | 1): void { const count = activeActivity.value?.rounds.length ?? 0; if (!count) return; activeRoundIndex.value = Math.max(0, Math.min(count - 1, activeRoundIndex.value + direction)); showHint.value = false; showAnswer.value = false; sendLive(); }
function toggleHint(): void { showHint.value = !showHint.value; sendLive(); }
function revealAnswer(): void { showAnswer.value = true; sendLive(); }
function adjustScore(amount: number): void { const team = activeTeam.value; if (!team) return; team.score += amount; }
function awardCorrect(): void { const team = activeTeam.value; if (!team || !activeCareo.value) return; team.score += activeCareo.value.pointsPerCorrect; showAnswer.value = true; sendLive(); $q.notify({ type: 'positive', message: `${team.name} +${activeCareo.value.pointsPerCorrect} puntos` }); }
function completeEntry(autoAdvance = true): void { const entry = activeEntry.value; if (!entry) return; completedEntries.value = new Set([...completedEntries.value, entry.id]); if (autoAdvance && activeCareo.value && activeEntryIndex.value < activeCareo.value.activities.length - 1) selectEntry(activeEntryIndex.value + 1); }

function sendLive(): void {
  const activity = activeActivity.value; const round = activeRound.value;
  if (!activity || !round) return;
  const body = [displayPrompt(round, activity.type), showHint.value && round.hint ? `\n💡 ${round.hint}` : '', showAnswer.value ? `\n\nRespuesta: ${round.answer}` : ''].join('');
  window.icpStudio?.projection.setState({ mode: 'content', title: `${activeCareo.value?.title ?? 'Careo'} · ${getDefinition(activity.type).label}`, body, footer: round.bibleReference || activity.title });
}

function openHiddenImage(): void { const entry = activeEntry.value; if (!entry || !activeCareo.value) return; void router.push({ path: '/actividades/imagen-escondida', query: { activityId: entry.sourceActivityId, careoId: activeCareo.value.id, careoEntryId: entry.id } }); }
function finishSession(blank = true): void { if (blank) window.icpStudio?.projection.setState({ mode: 'blank' }); activeCareo.value = null; teams.value = []; activeTeamId.value = ''; completedEntries.value = new Set(); if (viewMode.value === 'live') viewMode.value = 'library'; }

onMounted(reload);
</script>

<style scoped>
.careo-page { min-height: 100%; padding: 16px; color: #dce7f4; background: #08111c; }
.careo-shell { min-height: calc(100vh - 98px); overflow: hidden; background: #0c1521; border: 1px solid #25364a; border-radius: 14px; }
.careo-header, .header-left, .header-actions, .card-actions, .careo-card-top, .row-title, .builder-header, .source-header, .selected-entry, .source-card, .live-topbar, .live-controls, .manual-score { display: flex; align-items: center; }
.careo-header { min-height: 74px; justify-content: space-between; gap: 14px; padding: 12px 18px; background: #0d1825; border-bottom: 1px solid #25364a; }
.header-left, .header-actions { gap: 10px; }
.header-left h1, .section-title h2, .builder-header h2, .source-header h2, .session-title h2, .live-topbar h2 { margin: 0; font-size: 17px; }
.header-left p, .session-title p { margin: 3px 0 0; color: #8191a5; font-size: 10px; }
.careo-icon { display: grid; width: 44px; height: 44px; place-items: center; color: #60a5fa; background: rgba(96,165,250,.1); border-radius: 12px; font-size: 25px; }
.primary-button { color: white; background: #2563eb; border-radius: 9px; }
.library-view { padding: 20px; }
.empty-state { display: grid; min-height: 480px; place-items: center; align-content: center; gap: 8px; color: #718399; text-align: center; }
.empty-state h2 { margin: 0; color: #edf4fb; }
.careo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.careo-card { padding: 15px; background: #0d1825; border: 1px solid #25384c; border-radius: 13px; }
.careo-card-top { gap: 10px; }
.careo-card-icon { display: grid; width: 42px; height: 42px; place-items: center; color: #facc15; background: rgba(250,204,21,.08); border-radius: 10px; }
.careo-card h3 { margin: 0; font-size: 13px; }
.careo-card span { color: #718399; font-size: 9px; }
.careo-types { min-height: 34px; margin: 12px 0; }
.card-actions { justify-content: flex-end; gap: 5px; }
.editor-view { display: grid; min-height: calc(100vh - 174px); grid-template-columns: 330px minmax(0,1fr); }
.settings-panel { padding: 17px; overflow-y: auto; background: #09131e; border-right: 1px solid #25364a; }
.section-title > span, .builder-header span, .source-header span, .session-title span, .live-topbar span { color: #64778d; font-size: 8px; font-weight: 800; letter-spacing: .09em; }
.settings-panel > label, .form-section label { display: block; margin: 14px 0 7px; color: #c1cedc; font-size: 10px; font-weight: 700; }
.form-section { margin-top: 16px; padding-top: 14px; border-top: 1px solid #203044; }
.row-title { justify-content: space-between; }
.row-title > div { display: flex; flex-direction: column; }
.row-title label { margin: 0; }
.row-title small { color: #718399; font-size: 8px; }
.team-input-row { display: grid; grid-template-columns: 1fr auto; gap: 5px; margin-top: 7px; }
.score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.score-grid label { margin-top: 0; }
.activity-builder { padding: 18px; overflow-y: auto; }
.builder-header, .source-header, .live-topbar { justify-content: space-between; }
.selected-list { margin-top: 12px; }
.selected-entry { gap: 8px; margin-bottom: 6px; padding: 9px; background: #0d1926; border: 1px solid #26394e; border-radius: 9px; }
.entry-number { display: grid; width: 26px; height: 26px; place-items: center; background: #162638; border-radius: 7px; }
.selected-entry > div, .source-card > div { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.selected-entry strong, .source-card strong { font-size: 10px; }
.selected-entry small, .source-card small { color: #718399; font-size: 8px; }
.selected-empty { margin-top: 12px; padding: 30px; color: #718399; text-align: center; border: 1px dashed #30455c; border-radius: 10px; }
.source-header { margin-top: 26px; padding-top: 18px; border-top: 1px solid #203044; }
.source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 8px; margin-top: 12px; }
.source-card { gap: 9px; padding: 11px; background: #0b1622; border: 1px solid #273a4e; border-radius: 10px; }
.live-view { display: grid; min-height: calc(100vh - 174px); grid-template-columns: 290px minmax(0,1fr); }
.score-sidebar { padding: 16px; overflow-y: auto; background: #09131e; border-right: 1px solid #25364a; }
.scoreboard { margin-top: 14px; }
.team-card { display: flex; width: 100%; align-items: center; justify-content: space-between; margin-bottom: 6px; padding: 9px; color: #dce7f4; background: #0d1926; border: 1px solid #26394e; border-radius: 9px; cursor: pointer; }
.team-card.active { background: rgba(59,130,246,.1); border-color: #3b82f6; }
.team-card > div { display: flex; flex-direction: column; text-align: left; }
.team-card small { color: #718399; font-size: 8px; }
.team-card > span { color: white; font-size: 20px; font-weight: 800; }
.manual-score { justify-content: center; gap: 10px; margin: 10px 0 16px; }
.manual-score strong { font-size: 20px; }
.entry-nav { display: flex; width: 100%; align-items: center; gap: 8px; margin-bottom: 5px; padding: 8px; color: #aebdcd; text-align: left; background: #0c1723; border: 1px solid #26394e; border-radius: 8px; cursor: pointer; }
.entry-nav.active { border-color: #3b82f6; }
.entry-nav.done { border-color: rgba(34,197,94,.35); }
.entry-nav > span { display: grid; width: 24px; height: 24px; place-items: center; background: #162638; border-radius: 6px; }
.entry-nav > div { display: flex; min-width: 0; flex-direction: column; }
.entry-nav strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; }
.entry-nav small { color: #718399; font-size: 8px; }
.live-workspace { display: flex; min-width: 0; flex-direction: column; padding: 18px; background: #08111c; }
.question-stage, .external-activity-card, .missing-activity { display: flex; min-height: 450px; flex: 1; align-items: center; justify-content: center; flex-direction: column; gap: 16px; padding: 35px; text-align: center; background: #050b12; border: 1px solid #213247; border-radius: 13px; }
.question-stage > span { color: #60a5fa; font-size: 9px; font-weight: 800; text-transform: uppercase; }
.question-stage h1 { max-width: 900px; margin: 0; font-size: clamp(24px,4vw,52px); }
.hint-box { padding: 12px 18px; color: #fde68a; background: rgba(250,204,21,.08); border: 1px solid rgba(250,204,21,.25); border-radius: 10px; }
.answer-box { padding: 15px 22px; color: #bbf7d0; background: rgba(34,197,94,.08); border: 1px solid rgba(34,197,94,.28); border-radius: 11px; }
.answer-box strong { display: block; font-size: 28px; }
.answer-box p { margin: 5px 0 0; color: #9fb7a7; }
.reference { color: #93c5fd; }
.live-controls { gap: 7px; padding-top: 12px; }
.correct-button { color: white; background: #16a34a; }
@media (max-width: 900px) { .editor-view, .live-view { display: block; } .settings-panel, .score-sidebar { border-right: 0; border-bottom: 1px solid #25364a; } .careo-header { align-items: flex-start; flex-direction: column; } }
</style>
