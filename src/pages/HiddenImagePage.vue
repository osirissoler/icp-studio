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
            <p>Prepara imágenes ocultas por casillas para juegos y competencias.</p>
          </div>
        </div>

        <q-btn
          v-if="!isCreating"
          unelevated
          no-caps
          icon="add"
          label="Nueva actividad"
          class="primary-button"
          @click="createActivity"
        />

        <div v-else class="header-actions">
          <q-btn flat no-caps label="Cancelar" class="cancel-button" @click="cancelActivity" />

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
      </header>

      <section v-if="!isCreating" class="library-area">
        <div v-if="isLoading" class="loading-state">
          <q-spinner size="34px" />
          <span>Cargando actividades...</span>
        </div>

        <div v-else-if="activities.length === 0" class="empty-state">
          <div class="empty-icon">
            <q-icon name="image_search" />
          </div>

          <h2>Imagen escondida</h2>

          <p>Todavía no tienes actividades guardadas. Crea la primera para comenzar.</p>

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
                {{ activities.length === 1 ? 'actividad guardada' : 'actividades guardadas' }}
              </p>
            </div>
          </div>

          <div class="activity-grid">
            <article v-for="activity in activities" :key="activity.id" class="activity-card">
              <div class="activity-image">
                <img
                  v-if="getActivityPreviewUrl(activity)"
                  :src="getActivityPreviewUrl(activity)"
                  :alt="activity.title"
                />

                <div class="activity-grid-overlay">
                  <span> {{ activity.rows }} × {{ activity.columns }} </span>
                </div>
              </div>

              <div class="activity-card-content">
                <div class="activity-card-heading">
                  <div>
                    <h3>{{ activity.title }}</h3>

                    <span v-if="activity.bibleReference">
                      {{ activity.bibleReference }}
                    </span>
                  </div>

                  <q-btn flat round dense icon="more_vert" class="more-button">
                    <q-menu dark>
                      <q-list dense style="min-width: 160px">
                        <q-item clickable v-close-popup @click="editActivity(activity)">
                          <q-item-section avatar>
                            <q-icon name="edit" />
                          </q-item-section>

                          <q-item-section>Editar</q-item-section>
                        </q-item>

                        <q-item clickable v-close-popup @click="duplicateActivity(activity)">
                          <q-item-section avatar>
                            <q-icon name="content_copy" />
                          </q-item-section>

                          <q-item-section>Duplicar</q-item-section>
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
                    <q-icon name="grid_view" />
                    <span>{{ activity.rows * activity.columns }} casillas</span>
                  </div>

                  <div>
                    <q-icon name="schedule" />
                    <span>{{ formatDate(activity.updatedAt) }}</span>
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
                    @click="editActivity(activity)"
                  />
                </div>
              </div>
            </article>
          </div>
        </template>
      </section>

      <section v-else class="creator-area">
        <aside class="configuration-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">
                {{ editingId ? 'EDITANDO ACTIVIDAD' : 'NUEVA ACTIVIDAD' }}
              </span>

              <h2>
                {{ editingId ? 'Editar imagen escondida' : 'Configurar actividad' }}
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
              placeholder="Ej. Personajes bíblicos"
              class="app-input"
            />
          </div>

          <div class="form-section">
            <label class="field-label">Respuesta</label>

            <q-input
              v-model="form.answer"
              dense
              outlined
              dark
              placeholder="Ej. Daniel en el foso de los leones"
              class="app-input"
            />

            <span class="field-help"> La respuesta es información privada para el operador. </span>
          </div>

          <div class="form-section">
            <label class="field-label">Referencia bíblica</label>

            <q-input
              v-model="form.bibleReference"
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
                <span class="field-help"> Selecciona la imagen que será descubierta. </span>
              </div>

              <q-btn
                v-if="imageUrl"
                flat
                dense
                round
                icon="delete_outline"
                class="remove-image-button"
                @click="removeImage"
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

              <q-icon :name="imageUrl ? 'swap_horiz' : 'add_photo_alternate'" />

              <div>
                <strong>
                  {{ imageUrl ? 'Cambiar imagen' : 'Seleccionar imagen' }}
                </strong>

                <span>
                  {{ selectedFileName || 'JPG, PNG, WEBP u otra imagen compatible.' }}
                </span>
              </div>
            </label>
          </div>

          <div class="form-section">
            <div class="section-title-row">
              <div>
                <label class="field-label">Cuadrícula</label>

                <span class="field-help"> Configura cuántas casillas cubrirán la imagen. </span>
              </div>

              <q-badge class="grid-count"> {{ totalTiles }} casillas </q-badge>
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
                    :disable="form.rows <= MIN_GRID_SIZE"
                    @click="changeRows(-1)"
                  />

                  <strong>{{ form.rows }}</strong>

                  <q-btn
                    flat
                    dense
                    round
                    icon="add"
                    :disable="form.rows >= MAX_GRID_SIZE"
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
                    :disable="form.columns <= MIN_GRID_SIZE"
                    @click="changeColumns(-1)"
                  />

                  <strong>{{ form.columns }}</strong>

                  <q-btn
                    flat
                    dense
                    round
                    icon="add"
                    :disable="form.columns >= MAX_GRID_SIZE"
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
                    active: form.rows === preset && form.columns === preset,
                  },
                ]"
                @click="applyGridPreset(preset)"
              />
            </div>
          </div>

          <div class="form-section">
            <div class="section-title-row">
              <div>
                <label class="field-label">Prueba</label>

                <span class="field-help"> Prueba las casillas antes de guardar. </span>
              </div>

              <q-btn
                flat
                dense
                no-caps
                icon="restart_alt"
                label="Cubrir todas"
                class="small-button"
                @click="resetTiles"
              />
            </div>
          </div>
        </aside>

        <main class="preview-panel">
          <div class="preview-heading">
            <div>
              <span class="eyebrow">PREVISUALIZACIÓN</span>
              <h2>{{ form.title.trim() || 'Imagen escondida' }}</h2>
            </div>

            <div class="preview-status">
              <q-icon name="visibility" />
              <span> {{ revealedCount }} / {{ totalTiles }} descubiertas </span>
            </div>
          </div>

          <div class="game-preview">
            <div class="image-stage" :class="{ 'without-image': !imageUrl }" :style="gridStyle">
              <img
                v-if="imageUrl"
                :src="imageUrl"
                alt="Imagen de la actividad"
                class="hidden-image"
              />

              <div v-else class="image-placeholder">
                <div class="placeholder-icon">
                  <q-icon name="image" />
                </div>

                <strong>Selecciona una imagen</strong>

                <span> La imagen aparecerá aquí cubierta por las casillas. </span>
              </div>

              <button
                v-for="tile in tiles"
                :key="tile.id"
                type="button"
                class="cover-tile"
                :class="{ revealed: tile.revealed }"
                :aria-label="`Casilla ${tile.id}`"
                @click="toggleTile(tile.id)"
              >
                <span v-if="!tile.revealed">
                  {{ tile.id }}
                </span>
              </button>
            </div>
          </div>

          <div class="preview-footer">
            <div class="operator-answer">
              <span>RESPUESTA DEL OPERADOR</span>

              <strong>
                {{ form.answer.trim() || 'Sin respuesta definida' }}
              </strong>

              <small v-if="form.bibleReference.trim()">
                {{ form.bibleReference }}
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
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

interface HiddenImageForm {
  title: string;
  answer: string;
  bibleReference: string;
  rows: number;
  columns: number;
}

interface HiddenImageTile {
  id: number;
  revealed: boolean;
}

interface HiddenImageActivity {
  id: string;
  title: string;
  answer: string;
  bibleReference: string;
  rows: number;
  columns: number;
  imageName: string;
  imageBlob: Blob;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'icp-studio';
const DB_VERSION = 1;
const STORE_NAME = 'hidden-image-activities';

const MIN_GRID_SIZE = 2;
const MAX_GRID_SIZE = 8;

const router = useRouter();
const $q = useQuasar();

const isCreating = ref(false);
const isLoading = ref(true);
const isSaving = ref(false);

const editingId = ref<string | null>(null);

const activities = ref<HiddenImageActivity[]>([]);
const tiles = ref<HiddenImageTile[]>([]);

const selectedImageBlob = ref<Blob | null>(null);
const selectedFileName = ref('');
const imageUrl = ref('');

const fileInput = ref<HTMLInputElement | null>(null);

const previewUrls = new Map<string, string>();

const gridPresets = [2, 3, 4, 5, 6];

const form = reactive<HiddenImageForm>({
  title: '',
  answer: '',
  bibleReference: '',
  rows: 4,
  columns: 4,
});

const totalTiles = computed(() => form.rows * form.columns);

const revealedCount = computed(() => tiles.value.filter((tile) => tile.revealed).length);

const allTilesRevealed = computed(
  () => tiles.value.length > 0 && revealedCount.value === tiles.value.length,
);

const gridStyle = computed(() => ({
  '--hidden-image-rows': String(form.rows),
  '--hidden-image-columns': String(form.columns),
}));

watch(
  () => [form.rows, form.columns],
  () => {
    rebuildTiles();
  },
);

function createIndexedDbError(message: string, error: DOMException | null): Error {
  if (error) {
    return new Error(`${message}: ${error.message}`);
  }

  return new Error(message);
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

async function loadActivities(): Promise<void> {
  isLoading.value = true;

  try {
    const database = await openDatabase();

    const records = await new Promise<HiddenImageActivity[]>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');

      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(
          (request.result as HiddenImageActivity[]).sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
        );
      };

      request.onerror = () => {
        reject(
          createIndexedDbError('No se pudieron leer las actividades guardadas', request.error),
        );
      };
    });

    activities.value = records;

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

async function persistActivity(activity: HiddenImageActivity): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');

      const store = transaction.objectStore(STORE_NAME);

      store.put(activity);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(createIndexedDbError('No se pudo guardar la actividad', transaction.error));
      };

      transaction.onabort = () => {
        reject(createIndexedDbError('Se canceló el guardado de la actividad', transaction.error));
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
      const transaction = database.transaction(STORE_NAME, 'readwrite');

      const store = transaction.objectStore(STORE_NAME);

      store.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(createIndexedDbError('No se pudo eliminar la actividad', transaction.error));
      };

      transaction.onabort = () => {
        reject(
          createIndexedDbError('Se canceló la eliminación de la actividad', transaction.error),
        );
      };
    });
  } finally {
    database.close();
  }
}

function goBack(): void {
  if (isCreating.value) {
    cancelActivity();
    return;
  }

  void router.push('/actividades');
}

function createActivity(): void {
  editingId.value = null;

  resetForm();

  isCreating.value = true;
}

function cancelActivity(): void {
  isCreating.value = false;
  editingId.value = null;

  resetForm();
}

function resetForm(): void {
  form.title = '';
  form.answer = '';
  form.bibleReference = '';
  form.rows = 4;
  form.columns = 4;

  clearEditorImage();
  rebuildTiles();
}

function rebuildTiles(): void {
  tiles.value = Array.from(
    {
      length: totalTiles.value,
    },
    (_, index): HiddenImageTile => ({
      id: index + 1,
      revealed: false,
    }),
  );
}

function toggleTile(tileId: number): void {
  const tile = tiles.value.find((item) => item.id === tileId);

  if (!tile) {
    return;
  }

  tile.revealed = !tile.revealed;
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
  const hiddenTiles = tiles.value.filter((tile) => !tile.revealed);

  if (hiddenTiles.length === 0) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * hiddenTiles.length);

  const tile = hiddenTiles[randomIndex];

  if (tile) {
    tile.revealed = true;
  }
}

function changeRows(change: number): void {
  form.rows = clampGridValue(form.rows + change);
}

function changeColumns(change: number): void {
  form.columns = clampGridValue(form.columns + change);
}

function clampGridValue(value: number): number {
  return Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, value));
}

function applyGridPreset(size: number): void {
  const value = clampGridValue(size);

  form.rows = value;
  form.columns = value;
}

function handleImageSelected(event: Event): void {
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

  revokeEditorImageUrl();

  selectedImageBlob.value = file;
  selectedFileName.value = file.name;
  imageUrl.value = URL.createObjectURL(file);

  resetTiles();
}

function removeImage(): void {
  clearEditorImage();
  resetTiles();
}

function clearEditorImage(): void {
  revokeEditorImageUrl();

  selectedImageBlob.value = null;
  selectedFileName.value = '';
  imageUrl.value = '';

  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function revokeEditorImageUrl(): void {
  if (imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value);
  }
}

async function saveActivity(): Promise<void> {
  if (!form.title.trim()) {
    notifyWarning('Escribe un nombre para la actividad.');
    return;
  }

  if (!form.answer.trim()) {
    notifyWarning('Escribe la respuesta de la imagen.');
    return;
  }

  if (!selectedImageBlob.value) {
    notifyWarning('Selecciona una imagen para la actividad.');
    return;
  }

  isSaving.value = true;

  try {
    const now = new Date().toISOString();

    const existingActivity = editingId.value
      ? activities.value.find((activity) => activity.id === editingId.value)
      : null;

    const activity: HiddenImageActivity = {
      id: editingId.value ?? createId(),
      title: form.title.trim(),
      answer: form.answer.trim(),
      bibleReference: form.bibleReference.trim(),
      rows: form.rows,
      columns: form.columns,
      imageName: selectedFileName.value || existingActivity?.imageName || 'imagen',
      imageBlob: selectedImageBlob.value,
      createdAt: existingActivity?.createdAt ?? now,
      updatedAt: now,
    };

    await persistActivity(activity);
    await loadActivities();

    const wasEditing = Boolean(editingId.value);

    isCreating.value = false;
    editingId.value = null;

    resetForm();

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
  editingId.value = activity.id;

  form.title = activity.title;
  form.answer = activity.answer;
  form.bibleReference = activity.bibleReference;
  form.rows = activity.rows;
  form.columns = activity.columns;

  clearEditorImage();

  selectedImageBlob.value = activity.imageBlob;
  selectedFileName.value = activity.imageName;
  imageUrl.value = URL.createObjectURL(activity.imageBlob);

  rebuildTiles();

  isCreating.value = true;
}

async function duplicateActivity(activity: HiddenImageActivity): Promise<void> {
  try {
    const now = new Date().toISOString();

    const copy: HiddenImageActivity = {
      ...activity,
      id: createId(),
      title: `${activity.title} - copia`,
      createdAt: now,
      updatedAt: now,
    };

    await persistActivity(copy);
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

async function deleteActivity(activity: HiddenImageActivity): Promise<void> {
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

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `hidden-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getActivityPreviewUrl(activity: HiddenImageActivity): string {
  return previewUrls.get(activity.id) ?? '';
}

function rebuildPreviewUrls(): void {
  revokePreviewUrls();

  activities.value.forEach((activity) => {
    previewUrls.set(activity.id, URL.createObjectURL(activity.imageBlob));
  });
}

function revokePreviewUrls(): void {
  previewUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });

  previewUrls.clear();
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

onMounted(() => {
  rebuildTiles();

  void loadActivities();
});

onBeforeUnmount(() => {
  revokeEditorImageUrl();
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

.header-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.header-copy {
  min-width: 0;
}

.header-copy h1 {
  margin: 0;
  color: #edf4fb;
  font-size: 17px;
  font-weight: 700;
}

.header-copy p {
  margin: 4px 0 0;
  color: #8191a5;
  font-size: 11px;
}

.primary-button {
  min-height: 38px;
  padding: 0 14px;
  color: #fff;
  background: #2563eb;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
}

.cancel-button {
  min-height: 38px;
  color: #91a2b6;
  font-size: 12px;
}

.library-area {
  min-height: 0;
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

.loading-state {
  gap: 12px;
  font-size: 11px;
}

.empty-icon {
  display: grid;
  width: 82px;
  height: 82px;
  place-items: center;
  margin-bottom: 18px;
  color: #c084fc;
  background: rgb(192 132 252 / 10%);
  border: 1px solid rgb(192 132 252 / 24%);
  border-radius: 22px;
}

.empty-icon .q-icon {
  font-size: 42px;
}

.empty-state h2 {
  margin: 0;
  color: #edf4fb;
  font-size: 21px;
}

.empty-state p {
  max-width: 450px;
  margin: 10px 0 22px;
  color: #8191a5;
  font-size: 12px;
  line-height: 1.6;
}

.library-heading {
  margin-bottom: 18px;
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
.preview-heading h2 {
  margin: 0;
  color: #e7eef7;
  font-size: 15px;
}

.library-heading p {
  margin: 4px 0 0;
  color: #718399;
  font-size: 10px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.activity-card {
  overflow: hidden;
  background: #0d1825;
  border: 1px solid #25384c;
  border-radius: 13px;
  transition:
    transform 150ms ease,
    border-color 150ms ease;
}

.activity-card:hover {
  border-color: #405c7b;
  transform: translateY(-2px);
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

.activity-grid-overlay {
  position: absolute;
  right: 10px;
  bottom: 10px;
}

.activity-grid-overlay span {
  padding: 5px 8px;
  color: #e7eef7;
  background: rgb(3 8 14 / 82%);
  border-radius: 7px;
  font-size: 9px;
}

.activity-card-content {
  padding: 13px;
}

.activity-card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.activity-card-heading h3 {
  margin: 0;
  color: #e4edf7;
  font-size: 13px;
}

.activity-card-heading span {
  display: block;
  margin-top: 4px;
  color: #c084fc;
  font-size: 9px;
}

.activity-info-row {
  display: flex;
  flex-wrap: wrap;
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

.activity-info-row .q-icon {
  font-size: 14px;
}

.activity-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 14px;
}

.secondary-button {
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

.delete-menu-item {
  color: #ff7b84;
}

.creator-area {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
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
.section-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading {
  margin-bottom: 20px;
}

.panel-heading > .q-icon {
  color: #60748d;
  font-size: 21px;
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
  line-height: 1.45;
}

.app-input :deep(.q-field__control) {
  min-height: 38px;
  background: #0d1926;
  border-radius: 8px;
}

.app-input :deep(.q-field__native),
.app-input :deep(.q-field__input) {
  color: #dce7f4;
  font-size: 11px;
}

.app-input :deep(.q-field__control::before) {
  border-color: #2a3c51;
}

.remove-image-button {
  color: #ef6b73;
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

.image-selector:hover {
  background: #112033;
  border-color: #5a7da4;
}

.image-selector > .q-icon {
  color: #c084fc;
  font-size: 27px;
}

.image-selector > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.image-selector strong {
  color: #cbd7e4;
  font-size: 11px;
}

.image-selector span {
  color: #687b91;
  font-size: 9px;
}

.grid-count {
  padding: 5px 8px;
  color: #c8d5e4;
  background: #17283a;
  border-radius: 999px;
  font-size: 9px;
}

.grid-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.number-control {
  padding: 10px;
  background: #0d1926;
  border: 1px solid #26394e;
  border-radius: 9px;
}

.number-control > span {
  display: block;
  margin-bottom: 8px;
  color: #708197;
  font-size: 9px;
}

.number-control-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.number-control-buttons .q-btn {
  color: #91a4ba;
}

.number-control-buttons strong {
  color: #edf4fb;
  font-size: 15px;
}

.grid-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.preset-button {
  min-height: 28px;
  color: #778a9f;
  background: #101d2b;
  border: 1px solid #25384c;
  border-radius: 7px;
  font-size: 9px;
}

.preset-button.active {
  color: #d7b8ff;
  background: rgb(192 132 252 / 12%);
  border-color: rgb(192 132 252 / 45%);
}

.small-button {
  color: #8ea2b8;
  font-size: 9px;
}

.preview-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: 18px;
  background: #08111c;
}

.preview-heading {
  flex: 0 0 auto;
  align-items: center;
  margin-bottom: 14px;
}

.preview-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #718399;
  font-size: 9px;
}

.preview-status .q-icon {
  color: #c084fc;
  font-size: 16px;
}

.game-preview {
  display: grid;
  min-height: 320px;
  flex: 1;
  place-items: center;
  padding: 18px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 40%, rgb(35 55 78 / 28%), transparent 55%), #050b12;
  border: 1px solid #213247;
  border-radius: 12px;
}

.image-stage {
  position: relative;
  display: grid;
  width: min(100%, 900px);
  aspect-ratio: 16 / 9;
  overflow: hidden;
  grid-template-columns: repeat(var(--hidden-image-columns), minmax(0, 1fr));
  grid-template-rows: repeat(var(--hidden-image-rows), minmax(0, 1fr));
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
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #60748a;
  text-align: center;
}

.placeholder-icon {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  color: #647b93;
  background: #142334;
  border-radius: 16px;
}

.placeholder-icon .q-icon {
  font-size: 30px;
}

.image-placeholder strong {
  color: #8799ad;
  font-size: 13px;
}

.image-placeholder span {
  max-width: 330px;
  font-size: 10px;
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
  background: linear-gradient(145deg, rgb(27 43 61 / 98%), rgb(15 27 40 / 99%));
  border: 1px solid #344b64;
  cursor: pointer;
  transition:
    opacity 220ms ease,
    background-color 180ms ease;
}

.cover-tile:hover {
  background: #263d56;
}

.cover-tile span {
  font-size: clamp(9px, 1.3vw, 16px);
  font-weight: 700;
}

.cover-tile.revealed {
  opacity: 0;
}

.without-image .cover-tile {
  opacity: 0.35;
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
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.operator-answer span {
  color: #60748b;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.operator-answer strong {
  color: #dce7f4;
  font-size: 11px;
}

.operator-answer small {
  color: #c084fc;
  font-size: 9px;
}

.preview-actions {
  display: flex;
  gap: 7px;
}

@media (max-width: 900px) {
  .creator-area {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .preview-footer {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (max-width: 760px) {
  .hidden-image-page {
    padding: 10px;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .creator-area {
    display: flex;
    flex-direction: column;
  }

  .configuration-panel {
    border-right: 0;
    border-bottom: 1px solid #25364a;
  }

  .activity-grid {
    grid-template-columns: 1fr;
  }
}
</style>
