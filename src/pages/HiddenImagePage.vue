<template>
  <q-page class="hidden-image-page">
    <div class="page-shell">
      <header class="page-header">
        <div class="header-left">
          <q-btn
            flat
            round
            dense
            icon="arrow_back"
            class="back-button"
            aria-label="Volver"
            @click="goBack"
          />

          <div class="activity-icon">
            <q-icon name="image_search" />
          </div>

          <div class="header-copy">
            <h1>Imagen escondida</h1>
            <p>
              Crea actividades con una o varias imágenes ocultas por casillas.
            </p>
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
          <q-btn
            flat
            no-caps
            label="Cancelar"
            class="cancel-button"
            @click="cancelActivity"
          />

          <q-btn
            unelevated
            no-caps
            icon="save"
            :label="editingId ? 'Guardar cambios' : 'Guardar'"
            class="primary-button"
            :loading="isSaving"
            @click="saveActivity"
          />
        </div>

        <div v-else class="header-actions">
          <q-btn
            flat
            no-caps
            icon="close"
            label="Salir del juego"
            class="cancel-button"
            @click="closePlayMode"
          />

          <q-btn
            unelevated
            no-caps
            icon="cast"
            label="Enviar en vivo"
            class="primary-button"
            disable
          >
            <q-tooltip>
              La conexión con las pantallas será el próximo paso.
            </q-tooltip>
          </q-btn>
        </div>
      </header>

      <!-- BIBLIOTECA -->
      <section v-if="viewMode === 'library'" class="library-area">
        <div v-if="isLoading" class="loading-state">
          <q-spinner size="34px" />
          <span>Cargando actividades...</span>
        </div>

        <div v-else-if="activities.length === 0" class="empty-state">
          <div class="empty-icon">
            <q-icon name="image_search" />
          </div>

          <h2>Imagen escondida</h2>

          <p>
            Todavía no tienes actividades guardadas. Puedes crear todas las
            actividades que quieras y cada una puede contener varias imágenes.
          </p>

          <q-btn
            unelevated
            no-caps
            icon="add"
            label="Crear primera actividad"
            class="primary-button"
            @click="createActivity"
          />
        </div>

        <template v-else>
          <div class="library-heading">
            <div>
              <span class="eyebrow">ACTIVIDADES GUARDADAS</span>
              <h2>Mis actividades</h2>

              <p>
                {{ activities.length }}
                {{
                  activities.length === 1
                    ? 'actividad guardada'
                    : 'actividades guardadas'
                }}
              </p>
            </div>
          </div>

          <div class="activity-grid">
            <article
              v-for="activity in activities"
              :key="activity.id"
              class="activity-card"
            >
              <div class="activity-image">
                <img
                  v-if="getActivityPreviewUrl(activity)"
                  :src="getActivityPreviewUrl(activity)"
                  :alt="activity.title"
                />

                <div v-else class="activity-image-placeholder">
                  <q-icon name="image" />
                </div>

                <div class="activity-round-count">
                  <q-icon name="collections" />

                  <span>
                    {{ activity.rounds.length }}
                    {{ activity.rounds.length === 1 ? 'imagen' : 'imágenes' }}
                  </span>
                </div>
              </div>

              <div class="activity-card-content">
                <div class="activity-card-heading">
                  <div>
                    <h3>{{ activity.title }}</h3>
                    <span>Actualizada {{ formatDate(activity.updatedAt) }}</span>
                  </div>

                  <q-btn flat round dense icon="more_vert" class="more-button">
                    <q-menu dark>
                      <q-list dense style="min-width: 170px">
                        <q-item
                          clickable
                          v-close-popup
                          @click="editActivity(activity)"
                        >
                          <q-item-section avatar>
                            <q-icon name="edit" />
                          </q-item-section>

                          <q-item-section>Editar</q-item-section>
                        </q-item>

                        <q-item
                          clickable
                          v-close-popup
                          @click="duplicateActivity(activity)"
                        >
                          <q-item-section avatar>
                            <q-icon name="content_copy" />
                          </q-item-section>

                          <q-item-section>Duplicar actividad</q-item-section>
                        </q-item>

                        <q-separator dark />

                        <q-item
                          clickable
                          v-close-popup
                          class="delete-menu-item"
                          @click="deleteActivity(activity)"
                        >
                          <q-item-section avatar>
                            <q-icon name="delete_outline" />
                          </q-item-section>

                          <q-item-section>Eliminar</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>

                <div class="activity-info-row">
                  <div>
                    <q-icon name="collections" />

                    <span>
                      {{ activity.rounds.length }}
                      {{ activity.rounds.length === 1 ? 'ronda' : 'rondas' }}
                    </span>
                  </div>

                  <div v-if="activity.rounds[0]">
                    <q-icon name="grid_view" />

                    <span>
                      {{ activity.rounds[0].rows }}
                      ×
                      {{ activity.rounds[0].columns }}
                    </span>
                  </div>
                </div>

                <div class="activity-card-actions">
                  <q-btn
                    flat
                    no-caps
                    icon="edit"
                    label="Editar"
                    class="secondary-button"
                    @click="editActivity(activity)"
                  />

                  <q-btn
                    unelevated
                    no-caps
                    icon="play_arrow"
                    label="Abrir"
                    class="open-button"
                    @click="openActivity(activity)"
                  />
                </div>
              </div>
            </article>
          </div>
        </template>
      </section>

      <!-- EDITOR -->
      <section v-else-if="viewMode === 'editor'" class="creator-area">
        <aside class="configuration-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">
                {{ editingId ? 'EDITANDO ACTIVIDAD' : 'NUEVA ACTIVIDAD' }}
              </span>

              <h2>
                {{
                  editingId
                    ? 'Editar Imagen escondida'
                    : 'Configurar actividad'
                }}
              </h2>
            </div>

            <q-icon name="tune" />
          </div>

          <div class="form-section">
            <label class="field-label">Nombre de la actividad</label>

            <q-input
              v-model="form.title"
              dense
              outlined
              dark
              placeholder="Ej. Personajes del Antiguo Testamento"
              class="app-input"
            />

            <span class="field-help">
              Este nombre identifica el conjunto completo de imágenes.
            </span>
          </div>

          <div class="form-section rounds-section">
            <div class="section-title-row">
              <div>
                <label class="field-label">Imágenes de la actividad</label>

                <span class="field-help">
                  Cada imagen funciona como una ronda independiente.
                </span>
              </div>

              <q-btn
                unelevated
                dense
                no-caps
                icon="add"
                label="Agregar"
                class="add-round-button"
                @click="addRound"
              />
            </div>

            <div class="round-list">
              <button
                v-for="(round, index) in rounds"
                :key="round.id"
                type="button"
                class="round-item"
                :class="{ active: round.id === activeRoundId }"
                @click="selectRound(round.id)"
              >
                <div class="round-thumbnail">
                  <img
                    v-if="round.imageUrl"
                    :src="round.imageUrl"
                    :alt="round.answer || `Imagen ${index + 1}`"
                  />

                  <q-icon v-else name="image" />
                </div>

                <div class="round-copy">
                  <strong>Imagen {{ index + 1 }}</strong>
                  <span>{{ round.answer.trim() || 'Sin respuesta' }}</span>
                </div>

                <q-icon
                  v-if="round.id === activeRoundId"
                  name="chevron_right"
                  class="round-active-icon"
                />
              </button>
            </div>
          </div>

          <template v-if="activeRound">
            <div class="round-editor-heading">
              <div>
                <span class="eyebrow">CONFIGURACIÓN DE IMAGEN</span>
                <h3>Imagen {{ activeRoundNumber }}</h3>
              </div>

              <div class="round-editor-actions">
                <q-btn
                  flat
                  dense
                  round
                  icon="content_copy"
                  class="round-action-button"
                  @click="duplicateRound"
                >
                  <q-tooltip>Duplicar imagen</q-tooltip>
                </q-btn>

                <q-btn
                  flat
                  dense
                  round
                  icon="delete_outline"
                  class="remove-image-button"
                  :disable="rounds.length <= 1"
                  @click="deleteRound"
                >
                  <q-tooltip>Eliminar imagen</q-tooltip>
                </q-btn>
              </div>
            </div>

            <div class="form-section">
              <label class="field-label">Respuesta</label>

              <q-input
                v-model="activeRound.answer"
                dense
                outlined
                dark
                placeholder="Ej. Daniel en el foso de los leones"
                class="app-input"
              />

              <span class="field-help">
                Esta información será privada para el operador.
              </span>
            </div>

            <div class="form-section">
              <label class="field-label">Referencia bíblica</label>

              <q-input
                v-model="activeRound.bibleReference"
                dense
                outlined
                dark
                placeholder="Ej. Daniel 6"
                class="app-input"
              />
            </div>

            <div class="form-section">
              <div class="field-heading">
                <div>
                  <label class="field-label">Imagen</label>

                  <span class="field-help">
                    Selecciona la imagen que será descubierta.
                  </span>
                </div>

                <q-btn
                  v-if="activeRound.imageUrl"
                  flat
                  dense
                  round
                  icon="delete_outline"
                  class="remove-image-button"
                  @click="removeRoundImage"
                />
              </div>

              <label class="image-selector">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="file-input"
                  @change="handleImageSelected"
                />

                <q-icon
                  :name="
                    activeRound.imageUrl
                      ? 'swap_horiz'
                      : 'add_photo_alternate'
                  "
                />

                <div>
                  <strong>
                    {{
                      activeRound.imageUrl
                        ? 'Cambiar imagen'
                        : 'Seleccionar imagen'
                    }}
                  </strong>

                  <span>
                    {{
                      activeRound.imageName ||
                      'JPG, PNG, WEBP u otra imagen compatible.'
                    }}
                  </span>
                </div>
              </label>
            </div>

            <div class="form-section">
              <div class="section-title-row">
                <div>
                  <label class="field-label">Cuadrícula</label>

                  <span class="field-help">
                    Cada imagen puede tener su propia cantidad de casillas.
                  </span>
                </div>

                <q-badge class="grid-count">
                  {{ totalTiles }} casillas
                </q-badge>
              </div>

              <div class="grid-controls">
                <div class="number-control">
                  <span>Filas</span>

                  <div class="number-control-buttons">
                    <q-btn
                      flat
                      dense
                      round
                      icon="remove"
                      :disable="activeRound.rows <= MIN_GRID_SIZE"
                      @click="changeRows(-1)"
                    />

                    <strong>{{ activeRound.rows }}</strong>

                    <q-btn
                      flat
                      dense
                      round
                      icon="add"
                      :disable="activeRound.rows >= MAX_GRID_SIZE"
                      @click="changeRows(1)"
                    />
                  </div>
                </div>

                <div class="number-control">
                  <span>Columnas</span>

                  <div class="number-control-buttons">
                    <q-btn
                      flat
                      dense
                      round
                      icon="remove"
                      :disable="activeRound.columns <= MIN_GRID_SIZE"
                      @click="changeColumns(-1)"
                    />

                    <strong>{{ activeRound.columns }}</strong>

                    <q-btn
                      flat
                      dense
                      round
                      icon="add"
                      :disable="activeRound.columns >= MAX_GRID_SIZE"
                      @click="changeColumns(1)"
                    />
                  </div>
                </div>
              </div>

              <div class="grid-presets">
                <q-btn
                  v-for="preset in gridPresets"
                  :key="preset"
                  flat
                  dense
                  no-caps
                  :label="`${preset} × ${preset}`"
                  :class="[
                    'preset-button',
                    {
                      active:
                        activeRound.rows === preset &&
                        activeRound.columns === preset,
                    },
                  ]"
                  @click="applyGridPreset(preset)"
                />
              </div>
            </div>
          </template>
        </aside>

        <main class="preview-panel">
          <div class="preview-heading">
            <div>
              <span class="eyebrow">PREVISUALIZACIÓN</span>
              <h2>{{ form.title.trim() || 'Imagen escondida' }}</h2>

              <span v-if="activeRound" class="preview-round-label">
                Imagen {{ activeRoundNumber }} de {{ rounds.length }}
              </span>
            </div>

            <div class="preview-status">
              <q-icon name="visibility" />

              <span>
                {{ revealedCount }} / {{ totalTiles }} descubiertas
              </span>
            </div>
          </div>

          <div class="preview-round-navigation">
            <q-btn
              flat
              dense
              no-caps
              icon="chevron_left"
              label="Anterior"
              class="round-navigation-button"
              :disable="activeRoundIndex <= 0"
              @click="goToPreviousRound"
            />

            <div class="round-dots">
              <button
                v-for="(round, index) in rounds"
                :key="round.id"
                type="button"
                class="round-dot"
                :class="{ active: round.id === activeRoundId }"
                :aria-label="`Ir a imagen ${index + 1}`"
                @click="selectRound(round.id)"
              />
            </div>

            <q-btn
              flat
              dense
              no-caps
              icon-right="chevron_right"
              label="Siguiente"
              class="round-navigation-button"
              :disable="activeRoundIndex >= rounds.length - 1"
              @click="goToNextRound"
            />
          </div>

          <div class="game-preview">
            <div
              v-if="activeRound"
              class="image-stage"
              :class="{ 'without-image': !activeRound.imageUrl }"
              :style="gridStyle"
            >
              <img
                v-if="activeRound.imageUrl"
                :src="activeRound.imageUrl"
                alt="Imagen de la actividad"
                class="hidden-image"
              />

              <div v-else class="image-placeholder">
                <q-icon name="image" />
                <strong>Selecciona una imagen</strong>
              </div>

              <button
                v-for="tile in tiles"
                :key="tile.id"
                type="button"
                class="cover-tile"
                :class="{ revealed: tile.revealed }"
                @click="toggleTile(tile.id)"
              >
                <span v-if="!tile.revealed">{{ tile.id }}</span>
              </button>
            </div>
          </div>

          <div v-if="activeRound" class="preview-footer">
            <div class="operator-answer">
              <span>RESPUESTA DEL OPERADOR</span>

              <strong>
                {{ activeRound.answer.trim() || 'Sin respuesta definida' }}
              </strong>

              <small v-if="activeRound.bibleReference.trim()">
                {{ activeRound.bibleReference }}
              </small>
            </div>

            <div class="preview-actions">
              <q-btn
                flat
                no-caps
                icon="restart_alt"
                label="Cubrir"
                class="secondary-button"
                @click="resetTiles"
              />

              <q-btn
                flat
                no-caps
                icon="shuffle"
                label="Aleatoria"
                class="secondary-button"
                :disable="allTilesRevealed"
                @click="revealRandomTile"
              />

              <q-btn
                flat
                no-caps
                icon="visibility"
                label="Descubrir todas"
                class="secondary-button"
                @click="revealAllTiles"
              />
            </div>
          </div>
        </main>
      </section>

      <!-- MODO OPERADOR -->
      <section v-else class="play-area">
        <aside class="play-sidebar">
          <div class="play-sidebar-heading">
            <span class="eyebrow">MODO OPERADOR</span>
            <h2>{{ playingActivity?.title }}</h2>

            <p>
              Imagen {{ playingRoundIndex + 1 }}
              de
              {{ playingActivity?.rounds.length ?? 0 }}
            </p>
          </div>

          <div class="play-round-list">
            <button
              v-for="(round, index) in playingActivity?.rounds ?? []"
              :key="round.id"
              type="button"
              class="play-round-item"
              :class="{ active: index === playingRoundIndex }"
              @click="setPlayingRound(index)"
            >
              <span class="play-round-number">{{ index + 1 }}</span>

              <div>
                <strong>Imagen {{ index + 1 }}</strong>
                <small>{{ round.answer }}</small>
              </div>

              <q-icon
                v-if="index === playingRoundIndex"
                name="play_arrow"
              />
            </button>
          </div>

          <div v-if="playingRound" class="private-answer-card">
            <div class="private-label">
              <q-icon name="lock" />
              INFORMACIÓN DEL OPERADOR
            </div>

            <span>Respuesta</span>
            <strong>{{ playingRound.answer }}</strong>

            <template v-if="playingRound.bibleReference">
              <span>Referencia bíblica</span>
              <strong>{{ playingRound.bibleReference }}</strong>
            </template>
          </div>
        </aside>

        <main class="operator-workspace">
          <div class="operator-topbar">
            <div>
              <span class="eyebrow">CONTROL DEL JUEGO</span>

              <h2>
                Imagen {{ playingRoundIndex + 1 }}
              </h2>
            </div>

            <div class="operator-progress">
              <q-icon name="grid_view" />

              <strong>
                {{ playingRevealedCount }}
                /
                {{ playingTiles.length }}
              </strong>

              <span>descubiertas</span>
            </div>
          </div>

          <div class="operator-stage-shell">
            <div
              v-if="playingRound"
              class="operator-image-stage"
              :style="playingGridStyle"
            >
              <img
                :src="playingImageUrl"
                :alt="playingRound.answer"
                class="hidden-image"
              />

              <button
                v-for="tile in playingTiles"
                :key="tile.id"
                type="button"
                class="cover-tile operator-cover-tile"
                :class="{ revealed: tile.revealed }"
                :aria-label="`Descubrir casilla ${tile.id}`"
                @click="togglePlayingTile(tile.id)"
              >
                <span v-if="!tile.revealed">{{ tile.id }}</span>
              </button>
            </div>
          </div>

          <div class="operator-controls">
            <div class="operator-control-group">
              <q-btn
                unelevated
                no-caps
                icon="shuffle"
                label="Descubrir aleatoria"
                class="control-primary"
                :disable="playingAllRevealed"
                @click="revealRandomPlayingTile"
              />

              <q-btn
                flat
                no-caps
                icon="visibility"
                label="Descubrir todas"
                class="control-secondary"
                :disable="playingAllRevealed"
                @click="revealAllPlayingTiles"
              />

              <q-btn
                flat
                no-caps
                icon="restart_alt"
                label="Cubrir todas"
                class="control-secondary"
                :disable="playingRevealedCount === 0"
                @click="resetPlayingTiles"
              />
            </div>

            <div class="operator-round-navigation">
              <q-btn
                flat
                no-caps
                icon="arrow_upward"
                label="Anterior"
                class="control-secondary"
                :disable="playingRoundIndex <= 0"
                @click="movePlayingRound(-1)"
              />

              <q-btn
                unelevated
                no-caps
                icon-right="arrow_downward"
                label="Siguiente"
                class="control-primary"
                :disable="
                  playingRoundIndex >=
                  (playingActivity?.rounds.length ?? 1) - 1
                "
                @click="movePlayingRound(1)"
              />
            </div>
          </div>
        </main>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

type ViewMode = 'library' | 'editor' | 'play';

interface HiddenImageTile {
  id: number;
  revealed: boolean;
}

interface HiddenImageStoredRound {
  id: string;
  answer: string;
  bibleReference: string;
  rows: number;
  columns: number;
  imageName: string;
  imageBlob: Blob;
}

interface HiddenImageRoundDraft {
  id: string;
  answer: string;
  bibleReference: string;
  rows: number;
  columns: number;
  imageName: string;
  imageBlob: Blob | null;
  imageUrl: string;
}

interface HiddenImageActivity {
  id: string;
  title: string;
  rounds: HiddenImageStoredRound[];
  createdAt: string;
  updatedAt: string;
}

interface LegacyHiddenImageActivity {
  id: string;
  title: string;
  answer?: string;
  bibleReference?: string;
  rows?: number;
  columns?: number;
  imageName?: string;
  imageBlob?: Blob;
  rounds?: HiddenImageStoredRound[];
  createdAt?: string;
  updatedAt?: string;
}

interface HiddenImageForm {
  title: string;
}

const DB_NAME = 'icp-studio';
const DB_VERSION = 1;
const STORE_NAME = 'hidden-image-activities';

const MIN_GRID_SIZE = 2;
const MAX_GRID_SIZE = 8;

const router = useRouter();
const $q = useQuasar();

const viewMode = ref<ViewMode>('library');

const isLoading = ref(true);
const isSaving = ref(false);

const editingId = ref<string | null>(null);
const activeRoundId = ref('');

const activities = ref<HiddenImageActivity[]>([]);
const rounds = ref<HiddenImageRoundDraft[]>([]);
const tiles = ref<HiddenImageTile[]>([]);

const fileInput = ref<HTMLInputElement | null>(null);

const previewUrls = new Map<string, string>();

const gridPresets = [2, 3, 4, 5, 6];

const form = reactive<HiddenImageForm>({
  title: '',
});

const playingActivity = ref<HiddenImageActivity | null>(null);
const playingRoundIndex = ref(0);
const playingTiles = ref<HiddenImageTile[]>([]);
const playingImageUrl = ref('');

const activeRoundIndex = computed(() =>
  rounds.value.findIndex(
    (round) => round.id === activeRoundId.value,
  ),
);

const activeRound = computed<HiddenImageRoundDraft | null>(() => {
  const index = activeRoundIndex.value;

  if (index < 0) {
    return null;
  }

  return rounds.value[index] ?? null;
});

const activeRoundNumber = computed(() =>
  activeRoundIndex.value >= 0
    ? activeRoundIndex.value + 1
    : 0,
);

const totalTiles = computed(() => {
  if (!activeRound.value) {
    return 0;
  }

  return activeRound.value.rows * activeRound.value.columns;
});

const revealedCount = computed(
  () => tiles.value.filter((tile) => tile.revealed).length,
);

const allTilesRevealed = computed(
  () =>
    tiles.value.length > 0 &&
    revealedCount.value === tiles.value.length,
);

const gridStyle = computed(() => ({
  '--hidden-image-rows': String(activeRound.value?.rows ?? 4),
  '--hidden-image-columns': String(activeRound.value?.columns ?? 4),
}));

const playingRound = computed<HiddenImageStoredRound | null>(() => {
  return playingActivity.value?.rounds[playingRoundIndex.value] ?? null;
});

const playingRevealedCount = computed(
  () => playingTiles.value.filter((tile) => tile.revealed).length,
);

const playingAllRevealed = computed(
  () =>
    playingTiles.value.length > 0 &&
    playingRevealedCount.value === playingTiles.value.length,
);

const playingGridStyle = computed(() => ({
  '--hidden-image-rows': String(playingRound.value?.rows ?? 4),
  '--hidden-image-columns': String(playingRound.value?.columns ?? 4),
}));

function createIndexedDbError(
  message: string,
  error: DOMException | null,
): Error {
  if (error) {
    return new Error(`${message}: ${error.message}`);
  }

  return new Error(message);
}

function createId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `hidden-image-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createEmptyRound(): HiddenImageRoundDraft {
  return {
    id: createId(),
    answer: '',
    bibleReference: '',
    rows: 4,
    columns: 4,
    imageName: '',
    imageBlob: null,
    imageUrl: '',
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        createIndexedDbError(
          'No se pudo abrir la base de datos de Imagen escondida',
          request.error,
        ),
      );
    };
  });
}

function normalizeActivity(
  rawActivity: LegacyHiddenImageActivity,
): HiddenImageActivity {
  const now = new Date().toISOString();

  if (
    Array.isArray(rawActivity.rounds) &&
    rawActivity.rounds.length > 0
  ) {
    return {
      id: rawActivity.id,
      title: rawActivity.title || 'Imagen escondida',
      rounds: rawActivity.rounds.map((round) => ({
        id: round.id || createId(),
        answer: round.answer || '',
        bibleReference: round.bibleReference || '',
        rows: clampGridValue(round.rows || 4),
        columns: clampGridValue(round.columns || 4),
        imageName: round.imageName || 'imagen',
        imageBlob: round.imageBlob,
      })),
      createdAt: rawActivity.createdAt || now,
      updatedAt: rawActivity.updatedAt || now,
    };
  }

  const legacyBlob = rawActivity.imageBlob;

  if (legacyBlob) {
    return {
      id: rawActivity.id,
      title: rawActivity.title || 'Imagen escondida',
      rounds: [
        {
          id: createId(),
          answer: rawActivity.answer || '',
          bibleReference: rawActivity.bibleReference || '',
          rows: clampGridValue(rawActivity.rows || 4),
          columns: clampGridValue(rawActivity.columns || 4),
          imageName: rawActivity.imageName || 'imagen',
          imageBlob: legacyBlob,
        },
      ],
      createdAt: rawActivity.createdAt || now,
      updatedAt: rawActivity.updatedAt || now,
    };
  }

  return {
    id: rawActivity.id,
    title: rawActivity.title || 'Imagen escondida',
    rounds: [],
    createdAt: rawActivity.createdAt || now,
    updatedAt: rawActivity.updatedAt || now,
  };
}

async function loadActivities(): Promise<void> {
  isLoading.value = true;

  try {
    const database = await openDatabase();

    const records = await new Promise<LegacyHiddenImageActivity[]>(
      (resolve, reject) => {
        const transaction = database.transaction(
          STORE_NAME,
          'readonly',
        );

        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result as LegacyHiddenImageActivity[]);
        };

        request.onerror = () => {
          reject(
            createIndexedDbError(
              'No se pudieron leer las actividades guardadas',
              request.error,
            ),
          );
        };
      },
    );

    activities.value = records
      .map(normalizeActivity)
      .filter((activity) => activity.rounds.length > 0)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime(),
      );

    rebuildPreviewUrls();

    database.close();
  } catch (error) {
    console.error('Error cargando actividades:', error);

    $q.notify({
      type: 'negative',
      icon: 'error',
      message: 'No se pudieron cargar las actividades guardadas.',
      position: 'top',
    });
  } finally {
    isLoading.value = false;
  }
}

async function persistActivity(
  activity: HiddenImageActivity,
): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        'readwrite',
      );

      const store = transaction.objectStore(STORE_NAME);
      store.put(activity);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () => {
        reject(
          createIndexedDbError(
            'No se pudo guardar la actividad',
            transaction.error,
          ),
        );
      };

      transaction.onabort = () => {
        reject(
          createIndexedDbError(
            'Se canceló el guardado de la actividad',
            transaction.error,
          ),
        );
      };
    });
  } finally {
    database.close();
  }
}

async function removePersistedActivity(id: string): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        'readwrite',
      );

      transaction.objectStore(STORE_NAME).delete(id);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () => {
        reject(
          createIndexedDbError(
            'No se pudo eliminar la actividad',
            transaction.error,
          ),
        );
      };

      transaction.onabort = () => {
        reject(
          createIndexedDbError(
            'Se canceló la eliminación de la actividad',
            transaction.error,
          ),
        );
      };
    });
  } finally {
    database.close();
  }
}

function goBack(): void {
  if (viewMode.value === 'editor') {
    cancelActivity();
    return;
  }

  if (viewMode.value === 'play') {
    closePlayMode();
    return;
  }

  void router.push('/actividades');
}

function createActivity(): void {
  editingId.value = null;
  resetEditor();

  const firstRound = createEmptyRound();

  rounds.value = [firstRound];
  activeRoundId.value = firstRound.id;

  rebuildTiles();

  viewMode.value = 'editor';
}

function cancelActivity(): void {
  viewMode.value = 'library';
  editingId.value = null;

  resetEditor();
}

function resetEditor(): void {
  form.title = '';

  revokeRoundUrls();

  rounds.value = [];
  activeRoundId.value = '';
  tiles.value = [];

  resetFileInput();
}

function addRound(): void {
  const round = createEmptyRound();

  rounds.value.push(round);
  activeRoundId.value = round.id;

  rebuildTiles();
  resetFileInput();
}

function selectRound(roundId: string): void {
  if (activeRoundId.value === roundId) {
    return;
  }

  activeRoundId.value = roundId;

  rebuildTiles();
  resetFileInput();
}

function duplicateRound(): void {
  const source = activeRound.value;

  if (!source) {
    return;
  }

  const duplicate: HiddenImageRoundDraft = {
    id: createId(),
    answer: source.answer,
    bibleReference: source.bibleReference,
    rows: source.rows,
    columns: source.columns,
    imageName: source.imageName,
    imageBlob: source.imageBlob,
    imageUrl: source.imageBlob
      ? URL.createObjectURL(source.imageBlob)
      : '',
  };

  rounds.value.splice(activeRoundIndex.value + 1, 0, duplicate);

  activeRoundId.value = duplicate.id;

  rebuildTiles();
  resetFileInput();
}

function deleteRound(): void {
  if (rounds.value.length <= 1) {
    return;
  }

  const index = activeRoundIndex.value;

  if (index < 0) {
    return;
  }

  const round = rounds.value[index];

  if (round?.imageUrl) {
    URL.revokeObjectURL(round.imageUrl);
  }

  rounds.value.splice(index, 1);

  const nextIndex = Math.min(index, rounds.value.length - 1);
  const nextRound = rounds.value[nextIndex];

  activeRoundId.value = nextRound?.id ?? '';

  rebuildTiles();
  resetFileInput();
}

function goToPreviousRound(): void {
  if (activeRoundIndex.value <= 0) {
    return;
  }

  const round = rounds.value[activeRoundIndex.value - 1];

  if (round) {
    selectRound(round.id);
  }
}

function goToNextRound(): void {
  if (
    activeRoundIndex.value < 0 ||
    activeRoundIndex.value >= rounds.value.length - 1
  ) {
    return;
  }

  const round = rounds.value[activeRoundIndex.value + 1];

  if (round) {
    selectRound(round.id);
  }
}

function handleImageSelected(event: Event): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    $q.notify({
      type: 'negative',
      icon: 'error',
      message: 'Selecciona un archivo de imagen válido.',
      position: 'top',
    });

    target.value = '';
    return;
  }

  if (round.imageUrl) {
    URL.revokeObjectURL(round.imageUrl);
  }

  round.imageBlob = file;
  round.imageName = file.name;
  round.imageUrl = URL.createObjectURL(file);

  resetTiles();
}

function removeRoundImage(): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  if (round.imageUrl) {
    URL.revokeObjectURL(round.imageUrl);
  }

  round.imageBlob = null;
  round.imageName = '';
  round.imageUrl = '';

  resetFileInput();
  resetTiles();
}

function resetFileInput(): void {
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function rebuildTiles(): void {
  const round = activeRound.value;

  if (!round) {
    tiles.value = [];
    return;
  }

  tiles.value = createTiles(round.rows * round.columns);
}

function createTiles(count: number): HiddenImageTile[] {
  return Array.from(
    { length: count },
    (_, index): HiddenImageTile => ({
      id: index + 1,
      revealed: false,
    }),
  );
}

function toggleTile(tileId: number): void {
  const tile = tiles.value.find((item) => item.id === tileId);

  if (tile) {
    tile.revealed = !tile.revealed;
  }
}

function resetTiles(): void {
  tiles.value.forEach((tile) => {
    tile.revealed = false;
  });
}

function revealAllTiles(): void {
  tiles.value.forEach((tile) => {
    tile.revealed = true;
  });
}

function revealRandomTile(): void {
  revealRandomFromTiles(tiles.value);
}

function revealRandomFromTiles(targetTiles: HiddenImageTile[]): void {
  const hiddenTiles = targetTiles.filter((tile) => !tile.revealed);

  if (hiddenTiles.length === 0) {
    return;
  }

  const tile =
    hiddenTiles[Math.floor(Math.random() * hiddenTiles.length)];

  if (tile) {
    tile.revealed = true;
  }
}

function changeRows(change: number): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  round.rows = clampGridValue(round.rows + change);
  rebuildTiles();
}

function changeColumns(change: number): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  round.columns = clampGridValue(round.columns + change);
  rebuildTiles();
}

function clampGridValue(value: number): number {
  return Math.min(
    MAX_GRID_SIZE,
    Math.max(MIN_GRID_SIZE, value),
  );
}

function applyGridPreset(size: number): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  const value = clampGridValue(size);

  round.rows = value;
  round.columns = value;

  rebuildTiles();
}

function validateActivity(): boolean {
  if (!form.title.trim()) {
    notifyWarning('Escribe un nombre para la actividad.');
    return false;
  }

  if (rounds.value.length === 0) {
    notifyWarning('Agrega al menos una imagen.');
    return false;
  }

  for (let index = 0; index < rounds.value.length; index += 1) {
    const round = rounds.value[index];

    if (!round) {
      continue;
    }

    if (!round.imageBlob) {
      activeRoundId.value = round.id;
      rebuildTiles();

      notifyWarning(
        `Selecciona una imagen para la ronda ${index + 1}.`,
      );

      return false;
    }

    if (!round.answer.trim()) {
      activeRoundId.value = round.id;
      rebuildTiles();

      notifyWarning(
        `Escribe la respuesta de la ronda ${index + 1}.`,
      );

      return false;
    }
  }

  return true;
}

async function saveActivity(): Promise<void> {
  if (!validateActivity()) {
    return;
  }

  isSaving.value = true;

  try {
    const now = new Date().toISOString();

    const existingActivity = editingId.value
      ? activities.value.find(
          (activity) => activity.id === editingId.value,
        )
      : null;

    const storedRounds: HiddenImageStoredRound[] =
      rounds.value.map((round) => {
        if (!round.imageBlob) {
          throw new Error('La ronda no contiene imagen.');
        }

        return {
          id: round.id,
          answer: round.answer.trim(),
          bibleReference: round.bibleReference.trim(),
          rows: round.rows,
          columns: round.columns,
          imageName: round.imageName || 'imagen',
          imageBlob: round.imageBlob,
        };
      });

    const activity: HiddenImageActivity = {
      id: editingId.value ?? createId(),
      title: form.title.trim(),
      rounds: storedRounds,
      createdAt: existingActivity?.createdAt ?? now,
      updatedAt: now,
    };

    const wasEditing = Boolean(editingId.value);

    await persistActivity(activity);
    await loadActivities();

    viewMode.value = 'library';
    editingId.value = null;

    resetEditor();

    $q.notify({
      type: 'positive',
      icon: 'check_circle',
      message: wasEditing
        ? 'Actividad actualizada correctamente.'
        : 'Actividad guardada correctamente.',
      position: 'top',
      timeout: 1800,
    });
  } catch (error) {
    console.error('Error guardando actividad:', error);

    $q.notify({
      type: 'negative',
      icon: 'error',
      message: 'No se pudo guardar la actividad.',
      position: 'top',
    });
  } finally {
    isSaving.value = false;
  }
}

function editActivity(activity: HiddenImageActivity): void {
  resetEditor();

  editingId.value = activity.id;
  form.title = activity.title;

  rounds.value = activity.rounds.map(
    (round): HiddenImageRoundDraft => ({
      id: round.id,
      answer: round.answer,
      bibleReference: round.bibleReference,
      rows: round.rows,
      columns: round.columns,
      imageName: round.imageName,
      imageBlob: round.imageBlob,
      imageUrl: URL.createObjectURL(round.imageBlob),
    }),
  );

  if (rounds.value.length === 0) {
    rounds.value = [createEmptyRound()];
  }

  activeRoundId.value = rounds.value[0]?.id ?? '';

  rebuildTiles();

  viewMode.value = 'editor';
}

function openActivity(activity: HiddenImageActivity): void {
  cleanupPlayingImageUrl();

  playingActivity.value = activity;
  playingRoundIndex.value = 0;

  preparePlayingRound();

  viewMode.value = 'play';
}

function closePlayMode(): void {
  cleanupPlayingImageUrl();

  playingActivity.value = null;
  playingRoundIndex.value = 0;
  playingTiles.value = [];

  viewMode.value = 'library';
}

function preparePlayingRound(): void {
  cleanupPlayingImageUrl();

  const round = playingRound.value;

  if (!round) {
    playingTiles.value = [];
    return;
  }

  playingImageUrl.value = URL.createObjectURL(round.imageBlob);

  playingTiles.value = createTiles(
    round.rows * round.columns,
  );
}

function setPlayingRound(index: number): void {
  const activity = playingActivity.value;

  if (!activity?.rounds[index]) {
    return;
  }

  playingRoundIndex.value = index;
  preparePlayingRound();
}

function movePlayingRound(direction: -1 | 1): void {
  const activity = playingActivity.value;

  if (!activity) {
    return;
  }

  const nextIndex = Math.min(
    activity.rounds.length - 1,
    Math.max(0, playingRoundIndex.value + direction),
  );

  if (nextIndex === playingRoundIndex.value) {
    return;
  }

  setPlayingRound(nextIndex);
}

function togglePlayingTile(tileId: number): void {
  const tile = playingTiles.value.find(
    (item) => item.id === tileId,
  );

  if (tile) {
    tile.revealed = !tile.revealed;
  }
}

function resetPlayingTiles(): void {
  playingTiles.value.forEach((tile) => {
    tile.revealed = false;
  });
}

function revealAllPlayingTiles(): void {
  playingTiles.value.forEach((tile) => {
    tile.revealed = true;
  });
}

function revealRandomPlayingTile(): void {
  revealRandomFromTiles(playingTiles.value);
}

function cleanupPlayingImageUrl(): void {
  if (playingImageUrl.value) {
    URL.revokeObjectURL(playingImageUrl.value);
    playingImageUrl.value = '';
  }
}

async function duplicateActivity(
  activity: HiddenImageActivity,
): Promise<void> {
  try {
    const now = new Date().toISOString();

    const duplicate: HiddenImageActivity = {
      id: createId(),
      title: `${activity.title} - copia`,
      rounds: activity.rounds.map((round) => ({
        ...round,
        id: createId(),
      })),
      createdAt: now,
      updatedAt: now,
    };

    await persistActivity(duplicate);
    await loadActivities();

    $q.notify({
      type: 'positive',
      icon: 'content_copy',
      message: 'Actividad duplicada.',
      position: 'top',
      timeout: 1600,
    });
  } catch (error) {
    console.error('Error duplicando actividad:', error);

    $q.notify({
      type: 'negative',
      icon: 'error',
      message: 'No se pudo duplicar la actividad.',
      position: 'top',
    });
  }
}

async function deleteActivity(
  activity: HiddenImageActivity,
): Promise<void> {
  const confirmed = window.confirm(
    `¿Eliminar "${activity.title}"?\n\nEsta acción no se puede deshacer.`,
  );

  if (!confirmed) {
    return;
  }

  try {
    await removePersistedActivity(activity.id);
    await loadActivities();

    $q.notify({
      type: 'positive',
      icon: 'delete',
      message: 'Actividad eliminada.',
      position: 'top',
      timeout: 1600,
    });
  } catch (error) {
    console.error('Error eliminando actividad:', error);

    $q.notify({
      type: 'negative',
      icon: 'error',
      message: 'No se pudo eliminar la actividad.',
      position: 'top',
    });
  }
}

function notifyWarning(message: string): void {
  $q.notify({
    type: 'warning',
    icon: 'warning',
    message,
    position: 'top',
  });
}

function rebuildPreviewUrls(): void {
  revokePreviewUrls();

  activities.value.forEach((activity) => {
    const firstRound = activity.rounds[0];

    if (!firstRound) {
      return;
    }

    previewUrls.set(
      activity.id,
      URL.createObjectURL(firstRound.imageBlob),
    );
  });
}

function getActivityPreviewUrl(
  activity: HiddenImageActivity,
): string {
  return previewUrls.get(activity.id) ?? '';
}

function revokePreviewUrls(): void {
  previewUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });

  previewUrls.clear();
}

function revokeRoundUrls(): void {
  rounds.value.forEach((round) => {
    if (round.imageUrl) {
      URL.revokeObjectURL(round.imageUrl);
    }
  });
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}

onMounted(() => {
  void loadActivities();
});

onBeforeUnmount(() => {
  cleanupPlayingImageUrl();
  revokeRoundUrls();
  revokePreviewUrls();
});
</script>

<style scoped>
.hidden-image-page {
  min-height: 100%;
  padding: 16px;
  color: #dce7f4;
  background: #08111c;
}

.page-shell {
  display: flex;
  min-height: calc(100vh - 98px);
  flex-direction: column;
  overflow: hidden;
  background: #0c1521;
  border: 1px solid #25364a;
  border-radius: 14px;
}

.page-header {
  display: flex;
  min-height: 74px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 18px;
  background: #0d1825;
  border-bottom: 1px solid #25364a;
}

.header-left,
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left {
  min-width: 0;
}

.back-button,
.more-button {
  color: #8fa2b8;
}

.activity-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  color: #c084fc;
  background: rgb(192 132 252 / 12%);
  border: 1px solid rgb(192 132 252 / 28%);
  border-radius: 12px;
}

.activity-icon .q-icon {
  font-size: 25px;
}

.header-copy h1 {
  margin: 0;
  color: #edf4fb;
  font-size: 17px;
}

.header-copy p {
  margin: 4px 0 0;
  color: #8191a5;
  font-size: 11px;
}

.primary-button,
.control-primary {
  min-height: 38px;
  padding: 0 14px;
  color: #fff;
  background: #2563eb;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
}

.cancel-button {
  color: #91a2b6;
}

.library-area {
  flex: 1;
  padding: 20px;
}

.loading-state,
.empty-state {
  display: flex;
  min-height: 430px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #718399;
  text-align: center;
}

.empty-icon {
  display: grid;
  width: 82px;
  height: 82px;
  place-items: center;
  margin-bottom: 18px;
  color: #c084fc;
  background: rgb(192 132 252 / 10%);
  border-radius: 22px;
}

.empty-icon .q-icon {
  font-size: 42px;
}

.empty-state h2 {
  margin: 0;
  color: #edf4fb;
}

.empty-state p {
  max-width: 500px;
  margin: 10px 0 22px;
  line-height: 1.6;
}

.eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #65778d;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.11em;
}

.library-heading h2,
.panel-heading h2,
.preview-heading h2,
.operator-topbar h2,
.play-sidebar-heading h2 {
  margin: 0;
  color: #e7eef7;
  font-size: 15px;
}

.library-heading p,
.play-sidebar-heading p {
  margin: 4px 0 0;
  color: #718399;
  font-size: 10px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.activity-card {
  overflow: hidden;
  background: #0d1825;
  border: 1px solid #25384c;
  border-radius: 13px;
}

.activity-image {
  position: relative;
  height: 160px;
  overflow: hidden;
  background: #050b12;
}

.activity-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-image-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #53677d;
}

.activity-image-placeholder .q-icon {
  font-size: 42px;
}

.activity-round-count {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 5px;
  padding: 5px 8px;
  background: rgb(3 8 14 / 86%);
  border-radius: 7px;
  font-size: 9px;
}

.activity-card-content {
  padding: 13px;
}

.activity-card-heading {
  display: flex;
  justify-content: space-between;
}

.activity-card-heading h3 {
  margin: 0;
  color: #e4edf7;
  font-size: 13px;
}

.activity-card-heading span {
  color: #73869c;
  font-size: 9px;
}

.activity-info-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  color: #6f8197;
}

.activity-info-row > div {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
}

.activity-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 14px;
}

.secondary-button,
.control-secondary {
  min-height: 32px;
  padding: 0 10px;
  color: #8fa3ba;
  background: #101e2c;
  border: 1px solid #283c51;
  border-radius: 8px;
  font-size: 9px;
}

.open-button {
  min-height: 32px;
  padding: 0 12px;
  color: #fff;
  background: #2563eb;
  border-radius: 8px;
  font-size: 9px;
}

.delete-menu-item,
.remove-image-button {
  color: #ff7b84;
}

.creator-area {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(320px, 385px) minmax(0, 1fr);
}

.configuration-panel {
  overflow-y: auto;
  padding: 18px;
  background: #0a1420;
  border-right: 1px solid #25364a;
}

.panel-heading,
.preview-heading,
.field-heading,
.section-title-row,
.round-editor-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.form-section {
  padding: 16px 0;
  border-top: 1px solid #1e2e40;
}

.field-label {
  display: block;
  margin-bottom: 7px;
  color: #b9c7d7;
  font-size: 11px;
  font-weight: 650;
}

.field-help {
  display: block;
  margin-top: 6px;
  color: #68798d;
  font-size: 9px;
}

.app-input :deep(.q-field__control) {
  min-height: 38px;
  background: #0d1926;
}

.round-list,
.play-round-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.round-item,
.play-round-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 8px;
  color: inherit;
  text-align: left;
  background: #0d1926;
  border: 1px solid #26394e;
  border-radius: 9px;
  cursor: pointer;
}

.round-item.active,
.play-round-item.active {
  background: rgb(192 132 252 / 10%);
  border-color: rgb(192 132 252 / 45%);
}

.round-thumbnail {
  display: grid;
  width: 52px;
  height: 36px;
  overflow: hidden;
  place-items: center;
  background: #07101a;
  border-radius: 6px;
}

.round-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.round-copy,
.play-round-item > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.round-copy strong,
.play-round-item strong {
  color: #cedae7;
  font-size: 10px;
}

.round-copy span,
.play-round-item small {
  overflow: hidden;
  color: #71849a;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-round-button {
  background: #6d28d9;
  color: white;
}

.file-input {
  display: none;
}

.image-selector {
  display: flex;
  min-height: 76px;
  align-items: center;
  gap: 12px;
  padding: 13px;
  background: #0d1926;
  border: 1px dashed #36506d;
  border-radius: 10px;
  cursor: pointer;
}

.grid-controls {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 12px;
}

.number-control {
  padding: 10px;
  background: #0d1926;
  border: 1px solid #26394e;
  border-radius: 9px;
}

.number-control-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.grid-presets,
.preview-actions,
.operator-control-group,
.operator-round-navigation {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.grid-presets {
  margin-top: 10px;
}

.preset-button {
  color: #778a9f;
  background: #101d2b;
  border: 1px solid #25384c;
}

.preset-button.active {
  color: #d7b8ff;
  border-color: #c084fc;
}

.preview-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 18px;
  background: #08111c;
}

.preview-status,
.operator-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #718399;
  font-size: 9px;
}

.preview-round-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
}

.round-dots {
  display: flex;
  gap: 6px;
}

.round-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  background: #34485f;
  border: 0;
  border-radius: 999px;
}

.round-dot.active {
  width: 20px;
  background: #c084fc;
}

.game-preview,
.operator-stage-shell {
  display: grid;
  min-height: 320px;
  flex: 1;
  place-items: center;
  padding: 18px;
  background: #050b12;
  border: 1px solid #213247;
  border-radius: 12px;
}

.image-stage,
.operator-image-stage {
  position: relative;
  display: grid;
  width: min(100%, 900px);
  aspect-ratio: 16 / 9;
  overflow: hidden;
  grid-template-columns: repeat(
    var(--hidden-image-columns),
    minmax(0, 1fr)
  );
  grid-template-rows: repeat(
    var(--hidden-image-rows),
    minmax(0, 1fr)
  );
  background: #101c29;
  border: 1px solid #344b64;
  border-radius: 10px;
}

.hidden-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #050a10;
}

.image-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.cover-tile {
  position: relative;
  z-index: 2;
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  padding: 0;
  color: #9db0c5;
  background: linear-gradient(145deg, #1b2b3d, #0f1b28);
  border: 1px solid #344b64;
  cursor: pointer;
  transition: opacity 200ms ease;
}

.cover-tile.revealed {
  opacity: 0;
  pointer-events: none;
}

.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 14px;
  padding: 12px 14px;
  background: #0c1723;
  border: 1px solid #213247;
  border-radius: 10px;
}

.operator-answer {
  display: flex;
  flex-direction: column;
}

.operator-answer span {
  color: #60748b;
  font-size: 8px;
}

.operator-answer strong {
  color: #dce7f4;
  font-size: 11px;
}

.operator-answer small {
  color: #c084fc;
}

/* PLAY MODE */

.play-area {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 280px minmax(0, 1fr);
}

.play-sidebar {
  padding: 18px;
  overflow-y: auto;
  background: #09131f;
  border-right: 1px solid #25364a;
}

.play-sidebar-heading {
  padding-bottom: 16px;
  border-bottom: 1px solid #1f3042;
}

.play-round-number {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  color: #aebfd1;
  background: #172639;
  border-radius: 7px;
  font-size: 10px;
  font-weight: 700;
}

.private-answer-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 18px;
  padding: 14px;
  background: #121b2a;
  border: 1px solid #3b2e51;
  border-radius: 11px;
}

.private-answer-card > span {
  margin-top: 8px;
  color: #72849a;
  font-size: 9px;
}

.private-answer-card > strong {
  color: #f0e9ff;
  font-size: 12px;
}

.private-label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #c084fc;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.operator-workspace {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: #07101a;
}

.operator-topbar,
.operator-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.operator-stage-shell {
  min-height: 420px;
}

.operator-image-stage {
  width: min(100%, 1050px);
}

.operator-cover-tile:hover {
  background: #2d4662;
}

.operator-controls {
  padding: 12px;
  background: #0c1723;
  border: 1px solid #213247;
  border-radius: 10px;
}

@media (max-width: 900px) {
  .creator-area,
  .play-area {
    grid-template-columns: 1fr;
  }

  .configuration-panel,
  .play-sidebar {
    border-right: 0;
    border-bottom: 1px solid #25364a;
  }
}

@media (max-width: 650px) {
  .hidden-image-page {
    padding: 8px;
  }

  .page-header,
  .operator-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .grid-controls {
    grid-template-columns: 1fr;
  }
}
</style>