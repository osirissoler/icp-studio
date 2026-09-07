<template>
  <q-page class="activity-page">
    <div class="activity-shell">
      <header class="activity-header">
        <div class="header-left">
          <q-btn flat round dense icon="arrow_back" aria-label="Volver" @click="goBack" />
          <div class="activity-icon" :style="{ color: definition.color }">
            <q-icon :name="definition.icon" />
          </div>
          <div>
            <h1>{{ definition.label }}</h1>
            <p>{{ definition.description }}</p>
          </div>
        </div>

        <q-btn
          v-if="viewMode === 'library'"
          unelevated
          no-caps
          icon="add"
          label="Nueva actividad"
          class="primary-button"
          @click="createActivity"
        />
        <div v-else-if="viewMode === 'editor'" class="header-actions">
          <q-btn flat no-caps label="Cancelar" @click="cancelEditor" />
          <q-btn
            unelevated
            no-caps
            icon="save"
            label="Guardar"
            class="primary-button"
            @click="saveActivity"
          />
        </div>
        <div v-else class="header-actions">
          <q-badge color="positive">EN VIVO</q-badge>
          <q-btn flat no-caps icon="close" label="Salir" @click="stopPlaying" />
          <q-btn
            unelevated
            no-caps
            icon="cast"
            label="Actualizar en vivo"
            class="primary-button"
            @click="sendLive"
          />
        </div>
      </header>

      <section v-if="viewMode === 'library'" class="library-view">
        <div v-if="activities.length === 0" class="empty-state">
          <q-icon :name="definition.icon" size="56px" />
          <h2>No hay actividades guardadas</h2>
          <p>Crea la primera actividad de {{ definition.label.toLowerCase() }}.</p>
          <q-btn
            unelevated
            no-caps
            icon="add"
            label="Crear actividad"
            class="primary-button"
            @click="createActivity"
          />
        </div>

        <div v-else class="activity-grid">
          <article v-for="activity in activities" :key="activity.id" class="activity-card">
            <div class="card-icon"><q-icon :name="definition.icon" /></div>
            <div class="card-copy">
              <h3>{{ activity.title }}</h3>
              <span>
                {{ activity.rounds.length }}
                {{ activity.rounds.length === 1 ? 'ronda' : 'rondas' }}
              </span>
            </div>
            <div class="card-actions">
              <q-btn flat round dense icon="edit" @click="editActivity(activity)" />
              <q-btn
                flat
                round
                dense
                icon="delete_outline"
                color="red-4"
                @click="removeActivity(activity)"
              />
              <q-btn
                unelevated
                no-caps
                icon="play_arrow"
                label="Abrir"
                class="primary-button"
                @click="playActivity(activity)"
              />
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="viewMode === 'editor'" class="editor-view">
        <aside class="editor-panel">
          <label>Nombre de la actividad</label>
          <q-input
            v-model="formTitle"
            dark
            outlined
            dense
            placeholder="Ej. Repaso de personajes"
          />

          <div class="round-heading">
            <div>
              <span>Rondas</span>
              <small>{{ rounds.length }} configuradas</small>
            </div>
            <q-btn flat dense no-caps icon="add" label="Agregar" @click="addRound" />
          </div>

          <button
            v-for="(round, index) in rounds"
            :key="round.id"
            type="button"
            class="round-row"
            :class="{ active: activeRoundId === round.id }"
            @click="activeRoundId = round.id"
          >
            <span>{{ index + 1 }}</span>
            <div>
              <strong>{{ editorRoundLabel(round, index) }}</strong>
              <small>{{ round.bibleReference || 'Sin referencia' }}</small>
            </div>
            <q-btn
              v-if="rounds.length > 1"
              flat
              round
              dense
              icon="close"
              @click.stop="deleteRound(round.id)"
            />
          </button>
        </aside>

        <main v-if="activeRound" class="round-editor">
          <div class="editor-title">
            <div>
              <span>{{ definition.label }}</span>
              <h2>Configurar ronda {{ activeRoundNumber }}</h2>
            </div>
            <q-badge>{{ activeRoundNumber }} / {{ rounds.length }}</q-badge>
          </div>

          <template v-if="activityType === 'crossword'">
            <div class="field-block">
              <label>Pista</label>
              <small>La pista que se mostrará para descubrir la palabra.</small>
              <q-input
                v-model="activeRound.prompt"
                dark
                outlined
                dense
                autogrow
                placeholder="Ej. Construyó un arca por mandato de Dios"
              />
            </div>
            <div class="field-block">
              <label>Palabra / respuesta</label>
              <q-input v-model="activeRound.answer" dark outlined dense placeholder="NOÉ" />
            </div>
          </template>

          <template v-else-if="activityType === 'character'">
            <div class="field-block">
              <label>Pistas del personaje</label>
              <small>Escribe una o varias pistas, una por línea.</small>
              <q-input
                v-model="activeRound.prompt"
                dark
                outlined
                dense
                autogrow
                placeholder="Fue rey de Israel\nDerrotó a Goliat\nEscribió salmos"
              />
            </div>
            <div class="field-block">
              <label>Personaje correcto</label>
              <q-input v-model="activeRound.answer" dark outlined dense placeholder="David" />
            </div>
          </template>

          <template v-else-if="activityType === 'order-phrase'">
            <div class="field-block">
              <label>Frase correcta</label>
              <small>ICP Studio desordenará las palabras de forma estable durante el juego.</small>
              <q-input
                v-model="activeRound.answer"
                dark
                outlined
                dense
                autogrow
                placeholder="Todo lo puedo en Cristo que me fortalece"
              />
            </div>
          </template>

          <template v-else-if="activityType === 'complete-phrase'">
            <div class="field-block">
              <label>Frase incompleta</label>
              <small>Usa ___ en el lugar que debe completar el participante.</small>
              <q-input
                v-model="activeRound.prompt"
                dark
                outlined
                dense
                autogrow
                placeholder="El Señor es mi ___; nada me faltará"
              />
            </div>
            <div class="field-block">
              <label>Respuesta correcta</label>
              <q-input v-model="activeRound.answer" dark outlined dense placeholder="pastor" />
            </div>
          </template>

          <template v-else-if="activityType === 'true-false'">
            <div class="field-block">
              <label>Afirmación</label>
              <q-input
                v-model="activeRound.prompt"
                dark
                outlined
                dense
                autogrow
                placeholder="Moisés construyó el arca."
              />
            </div>
            <div class="field-block">
              <label>Respuesta correcta</label>
              <q-btn-toggle
                v-model="activeRound.answer"
                spread
                no-caps
                unelevated
                toggle-color="primary"
                :options="trueFalseOptions"
              />
            </div>
          </template>

          <template v-else>
            <div class="field-block">
              <label>¿Qué se dijo?</label>
              <q-input
                v-model="activeRound.prompt"
                dark
                outlined
                dense
                autogrow
                placeholder="¿Soy yo acaso guarda de mi hermano?"
              />
            </div>
            <div class="field-block">
              <label>¿Quién lo dijo?</label>
              <q-input v-model="activeRound.answer" dark outlined dense placeholder="Caín" />
            </div>
          </template>

          <div class="field-block">
            <label>Referencia bíblica</label>
            <q-input
              v-model="activeRound.bibleReference"
              dark
              outlined
              dense
              placeholder="Ej. Génesis 4:9"
            />
          </div>
          <div class="field-block">
            <label>Pista adicional</label>
            <small>Opcional; el operador decide cuándo mostrarla.</small>
            <q-input v-model="activeRound.hint" dark outlined dense autogrow />
          </div>
          <div class="field-block">
            <label>Explicación</label>
            <small>Opcional; puede acompañar la respuesta al final de la ronda.</small>
            <q-input v-model="activeRound.explanation" dark outlined dense autogrow />
          </div>

          <div class="preview-card">
            <span>PREVISUALIZACIÓN</span>
            <h3>{{ displayPrompt(activeRound, activityType) }}</h3>
            <small v-if="activeRound.bibleReference">{{ activeRound.bibleReference }}</small>
          </div>
        </main>
      </section>

      <section v-else class="play-view">
        <aside class="play-sidebar">
          <h2>{{ playingActivity?.title }}</h2>
          <p>Ronda {{ playingIndex + 1 }} de {{ playingActivity?.rounds.length ?? 0 }}</p>
          <button
            v-for="(round, index) in playingActivity?.rounds ?? []"
            :key="round.id"
            type="button"
            class="play-round"
            :class="{ active: index === playingIndex }"
            @click="setPlayingRound(index)"
          >
            <span>{{ index + 1 }}</span>
            <strong>{{ editorRoundLabel(round, index) }}</strong>
          </button>
        </aside>

        <main v-if="playingRound" class="play-stage">
          <div class="stage-screen">
            <div class="stage-label">{{ definition.label }}</div>
            <h1>{{ displayPrompt(playingRound, activityType) }}</h1>
            <div v-if="showHint && playingRound.hint" class="hint-box">
              💡 {{ playingRound.hint }}
            </div>
            <div v-if="showAnswer" class="answer-box">
              <span>RESPUESTA</span>
              <strong>{{ playingRound.answer }}</strong>
              <small v-if="playingRound.explanation">{{ playingRound.explanation }}</small>
            </div>
            <small v-if="playingRound.bibleReference" class="reference">
              {{ playingRound.bibleReference }}
            </small>
          </div>

          <div class="play-controls">
            <q-btn
              flat
              no-caps
              icon="lightbulb"
              label="Pista"
              :disable="!playingRound.hint"
              @click="toggleHint"
            />
            <q-btn
              unelevated
              no-caps
              icon="visibility"
              label="Revelar respuesta"
              class="primary-button"
              @click="revealAnswer"
            />
            <q-space />
            <q-btn
              flat
              no-caps
              icon="arrow_upward"
              label="Anterior"
              :disable="playingIndex <= 0"
              @click="moveRound(-1)"
            />
            <q-btn
              unelevated
              no-caps
              icon-right="arrow_downward"
              label="Siguiente"
              class="primary-button"
              :disable="playingIndex >= (playingActivity?.rounds.length ?? 1) - 1"
              @click="moveRound(1)"
            />
          </div>
        </main>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import {
  createBibleActivityId,
  deleteBibleActivity,
  getBibleActivities,
  saveBibleActivity,
} from '../services/bible-activity-library';
import {
  getBibleActivityDefinition,
  type BibleActivityRecord,
  type BibleActivityRound,
  type BibleActivityType,
} from '../shared/bible-activities';

type EditableActivityType = Exclude<BibleActivityType, 'hidden-image'>;
type ViewMode = 'library' | 'editor' | 'play';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const activityType = computed(() => route.meta.activityType as EditableActivityType);
const definition = computed(() => getBibleActivityDefinition(activityType.value));
const viewMode = ref<ViewMode>('library');
const activities = ref<BibleActivityRecord[]>([]);
const editingId = ref<string | null>(null);
const formTitle = ref('');
const rounds = ref<BibleActivityRound[]>([]);
const activeRoundId = ref('');
const playingActivity = ref<BibleActivityRecord | null>(null);
const playingIndex = ref(0);
const showAnswer = ref(false);
const showHint = ref(false);

const trueFalseOptions = [
  { label: 'Verdadero', value: 'Verdadero' },
  { label: 'Falso', value: 'Falso' },
];

const activeRound = computed(
  () => rounds.value.find((round) => round.id === activeRoundId.value) ?? null,
);
const activeRoundNumber = computed(() =>
  Math.max(0, rounds.value.findIndex((round) => round.id === activeRoundId.value) + 1),
);
const playingRound = computed(
  () => playingActivity.value?.rounds[playingIndex.value] ?? null,
);

function createEmptyRound(): BibleActivityRound {
  return {
    id: createBibleActivityId('round'),
    prompt: '',
    answer: activityType.value === 'true-false' ? 'Verdadero' : '',
    bibleReference: '',
    hint: '',
    explanation: '',
  };
}

function reload(): void {
  activities.value = getBibleActivities(activityType.value);
}

function goBack(): void {
  if (viewMode.value !== 'library') {
    stopProjection();
    viewMode.value = 'library';
    return;
  }
  void router.push('/actividades');
}

function createActivity(): void {
  editingId.value = null;
  formTitle.value = '';
  rounds.value = [createEmptyRound()];
  activeRoundId.value = rounds.value[0]?.id ?? '';
  viewMode.value = 'editor';
}

function editActivity(activity: BibleActivityRecord): void {
  editingId.value = activity.id;
  formTitle.value = activity.title;
  rounds.value = activity.rounds.map((round) => ({ ...round }));
  activeRoundId.value = rounds.value[0]?.id ?? '';
  viewMode.value = 'editor';
}

function cancelEditor(): void {
  viewMode.value = 'library';
  rounds.value = [];
  activeRoundId.value = '';
}

function addRound(): void {
  const round = createEmptyRound();
  rounds.value.push(round);
  activeRoundId.value = round.id;
}

function deleteRound(id: string): void {
  if (rounds.value.length <= 1) return;
  const index = rounds.value.findIndex((round) => round.id === id);
  rounds.value = rounds.value.filter((round) => round.id !== id);
  activeRoundId.value = rounds.value[Math.min(index, rounds.value.length - 1)]?.id ?? '';
}

function validateActivity(): boolean {
  if (!formTitle.value.trim()) {
    $q.notify({ type: 'warning', message: 'Escribe un nombre para la actividad.' });
    return false;
  }

  for (let index = 0; index < rounds.value.length; index += 1) {
    const round = rounds.value[index];
    if (!round) continue;

    const promptRequired = activityType.value !== 'order-phrase';
    if ((promptRequired && !round.prompt.trim()) || !round.answer.trim()) {
      activeRoundId.value = round.id;
      $q.notify({
        type: 'warning',
        message: `Completa la información de la ronda ${index + 1}.`,
      });
      return false;
    }
  }

  return true;
}

function saveActivity(): void {
  if (!validateActivity()) return;

  const existing = editingId.value
    ? activities.value.find((activity) => activity.id === editingId.value)
    : null;
  const now = new Date().toISOString();

  const activity: BibleActivityRecord = {
    id: editingId.value ?? createBibleActivityId(activityType.value),
    type: activityType.value,
    title: formTitle.value.trim(),
    rounds: rounds.value.map((round) => ({
      ...round,
      prompt: round.prompt.trim(),
      answer: round.answer.trim(),
      bibleReference: round.bibleReference.trim(),
      hint: round.hint.trim(),
      explanation: round.explanation.trim(),
    })),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  saveBibleActivity(activity);
  reload();
  viewMode.value = 'library';
  $q.notify({ type: 'positive', icon: 'check_circle', message: 'Actividad guardada.' });
}

function removeActivity(activity: BibleActivityRecord): void {
  if (!window.confirm(`¿Eliminar “${activity.title}”?`)) return;
  deleteBibleActivity(activity.id);
  reload();
}

function stableScramble(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [...words].reverse().join('  ·  ');

  const even = words.filter((_, index) => index % 2 === 0).reverse();
  const odd = words.filter((_, index) => index % 2 !== 0);
  return [...even, ...odd].join('  ·  ');
}

function displayPrompt(round: BibleActivityRound, type: EditableActivityType): string {
  return type === 'order-phrase' ? stableScramble(round.answer) : round.prompt;
}

function editorRoundLabel(round: BibleActivityRound, index: number): string {
  if (activityType.value === 'order-phrase') return round.answer || `Ronda ${index + 1}`;
  return round.prompt || round.answer || `Ronda ${index + 1}`;
}

function playActivity(activity: BibleActivityRecord): void {
  playingActivity.value = activity;
  playingIndex.value = 0;
  showAnswer.value = false;
  showHint.value = false;
  viewMode.value = 'play';
  sendLive();
}

function setPlayingRound(index: number): void {
  if (!playingActivity.value?.rounds[index]) return;
  playingIndex.value = index;
  showAnswer.value = false;
  showHint.value = false;
  sendLive();
}

function moveRound(direction: -1 | 1): void {
  const count = playingActivity.value?.rounds.length ?? 0;
  if (!count) return;
  setPlayingRound(Math.max(0, Math.min(count - 1, playingIndex.value + direction)));
}

function toggleHint(): void {
  showHint.value = !showHint.value;
  sendLive();
}

function revealAnswer(): void {
  showAnswer.value = true;
  sendLive();
}

function sendLive(): void {
  const round = playingRound.value;
  if (!round) return;

  const body = [
    displayPrompt(round, activityType.value),
    showHint.value && round.hint ? `\n💡 ${round.hint}` : '',
    showAnswer.value ? `\n\nRespuesta: ${round.answer}` : '',
  ].join('');

  window.icpStudio?.projection.setState({
    mode: 'content',
    title: definition.value.label,
    body,
    footer: round.bibleReference || playingActivity.value?.title || '',
  });
}

function stopProjection(): void {
  window.icpStudio?.projection.setState({ mode: 'blank' });
}

function stopPlaying(): void {
  stopProjection();
  playingActivity.value = null;
  viewMode.value = 'library';
}

watch(activityType, () => {
  stopProjection();
  viewMode.value = 'library';
  reload();
});

onMounted(reload);
</script>

<style scoped>
.activity-page {
  min-height: 100%;
  padding: 16px;
  color: #dce7f4;
  background: #08111c;
}

.activity-shell {
  min-height: calc(100vh - 98px);
  overflow: hidden;
  background: #0c1521;
  border: 1px solid #25364a;
  border-radius: 14px;
}

.activity-header,
.header-left,
.header-actions,
.card-actions,
.round-heading,
.editor-title,
.play-controls {
  display: flex;
  align-items: center;
}

.activity-header {
  min-height: 74px;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 18px;
  background: #0d1825;
  border-bottom: 1px solid #25364a;
}

.header-left,
.header-actions {
  gap: 10px;
}

.header-left h1,
.editor-title h2,
.play-sidebar h2 {
  margin: 0;
  font-size: 17px;
}

.header-left p,
.play-sidebar p {
  margin: 3px 0 0;
  color: #8191a5;
  font-size: 10px;
}

.activity-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  background: #111f2e;
  border-radius: 12px;
  font-size: 25px;
}

.primary-button {
  color: #fff;
  background: #2563eb;
  border-radius: 9px;
}

.library-view,
.editor-view,
.play-view {
  min-height: calc(100vh - 174px);
}

.library-view {
  padding: 20px;
}

.empty-state {
  display: grid;
  min-height: 460px;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: #718399;
  text-align: center;
}

.empty-state h2 {
  margin: 0;
  color: #edf4fb;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.activity-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #0d1825;
  border: 1px solid #25384c;
  border-radius: 12px;
}

.card-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  background: #132234;
  border-radius: 10px;
}

.card-copy {
  min-width: 0;
  flex: 1;
}

.card-copy h3 {
  margin: 0;
  color: #e4edf7;
  font-size: 13px;
}

.card-copy span,
.round-row small,
.field-block > small {
  color: #718399;
  font-size: 9px;
}

.card-actions {
  gap: 5px;
}

.editor-view {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
}

.editor-panel {
  padding: 16px;
  overflow-y: auto;
  background: #09131e;
  border-right: 1px solid #25364a;
}

.editor-panel > label,
.field-block > label {
  display: block;
  margin-bottom: 7px;
  color: #c1cedc;
  font-size: 10px;
  font-weight: 700;
}

.round-heading {
  justify-content: space-between;
  margin: 18px 0 8px;
}

.round-heading > div,
.round-row > div {
  display: flex;
  flex-direction: column;
}

.round-row,
.play-round {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding: 9px;
  color: #aebdcd;
  text-align: left;
  background: #0d1926;
  border: 1px solid #26394e;
  border-radius: 9px;
  cursor: pointer;
}

.round-row.active,
.play-round.active {
  background: #13263c;
  border-color: #3b82f6;
}

.round-row > span,
.play-round > span {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  place-items: center;
  background: #16283a;
  border-radius: 7px;
}

.round-row > div {
  min-width: 0;
  flex: 1;
}

.round-row strong,
.play-round strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.round-editor {
  padding: 20px;
  overflow-y: auto;
}

.editor-title {
  justify-content: space-between;
  margin-bottom: 12px;
}

.editor-title span {
  color: #718399;
  font-size: 8px;
}

.field-block {
  padding: 14px 0;
  border-top: 1px solid #203044;
}

.field-block > small {
  display: block;
  margin: -3px 0 8px;
}

.preview-card {
  margin-top: 18px;
  padding: 24px;
  text-align: center;
  background: #07101a;
  border: 1px solid #2b4055;
  border-radius: 12px;
}

.preview-card > span {
  color: #718399;
  font-size: 8px;
}

.preview-card h3 {
  margin: 12px 0;
  font-size: 22px;
}

.play-view {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
}

.play-sidebar {
  padding: 16px;
  overflow-y: auto;
  background: #09131e;
  border-right: 1px solid #25364a;
}

.play-round {
  margin-top: 7px;
}

.play-stage {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 18px;
  background: #08111c;
}

.stage-screen {
  display: flex;
  min-height: 460px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 18px;
  padding: 40px;
  text-align: center;
  background: #050b12;
  border: 1px solid #213247;
  border-radius: 13px;
}

.stage-label {
  color: #60a5fa;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stage-screen h1 {
  max-width: 900px;
  margin: 0;
  font-size: clamp(24px, 4vw, 52px);
}

.hint-box {
  padding: 12px 18px;
  color: #fde68a;
  background: rgb(250 204 21 / 8%);
  border: 1px solid rgb(250 204 21 / 25%);
  border-radius: 10px;
}

.answer-box {
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  color: #bbf7d0;
  background: rgb(34 197 94 / 8%);
  border: 1px solid rgb(34 197 94 / 28%);
  border-radius: 12px;
}

.answer-box span {
  font-size: 8px;
  letter-spacing: 0.1em;
}

.answer-box strong {
  font-size: 28px;
}

.answer-box small {
  margin-top: 6px;
  color: #9fb7a7;
}

.reference {
  color: #93c5fd;
}

.play-controls {
  gap: 8px;
  padding-top: 12px;
}

@media (max-width: 850px) {
  .editor-view,
  .play-view {
    display: block;
  }

  .editor-panel,
  .play-sidebar {
    border-right: 0;
    border-bottom: 1px solid #25364a;
  }

  .activity-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
