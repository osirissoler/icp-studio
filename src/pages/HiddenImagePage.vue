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
            aria-label="Volver a actividades"
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
          class="new-activity-button"
          @click="createActivity"
        />

        <div v-else class="header-actions">
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
            label="Guardar"
            class="save-button"
            @click="saveActivity"
          />
        </div>
      </header>

      <section v-if="!isCreating" class="content-area">
        <div class="empty-state">
          <div class="empty-icon">
            <q-icon name="image_search" />
          </div>

          <h2>Imagen escondida</h2>

          <p>
            Crea actividades donde una imagen permanece cubierta por casillas
            y se va descubriendo durante el juego.
          </p>

          <q-btn
            unelevated
            no-caps
            icon="add"
            label="Crear primera actividad"
            class="empty-action"
            @click="createActivity"
          />
        </div>
      </section>

      <section v-else class="creator-area">
        <aside class="configuration-panel">
          <div class="panel-heading">
            <div>
              <span class="panel-eyebrow">CONFIGURACIÓN</span>
              <h2>Nueva actividad</h2>
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

            <span class="field-help">
              Esta información será privada para el operador durante el juego.
            </span>
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
                <span class="field-help">JPG, PNG, WEBP u otra imagen compatible.</span>
              </div>

              <q-btn
                v-if="imageUrl"
                flat
                dense
                round
                icon="delete_outline"
                class="remove-image-button"
                aria-label="Quitar imagen"
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
                  {{
                    selectedFileName ||
                    'Selecciona la imagen que será descubierta durante el juego.'
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
                  Configura cuántas casillas cubrirán la imagen.
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
                    active:
                      form.rows === preset &&
                      form.columns === preset,
                  },
                ]"
                @click="applyGridPreset(preset)"
              />
            </div>
          </div>

          <div class="form-section">
            <div class="section-title-row">
              <div>
                <label class="field-label">Prueba de casillas</label>
                <span class="field-help">
                  Descubre casillas en la previsualización para probar la actividad.
                </span>
              </div>

              <q-btn
                flat
                dense
                no-caps
                icon="restart_alt"
                label="Cubrir todas"
                class="reset-button"
                @click="resetTiles"
              />
            </div>
          </div>
        </aside>

        <main class="preview-panel">
          <div class="preview-heading">
            <div>
              <span class="panel-eyebrow">PREVISUALIZACIÓN</span>
              <h2>{{ form.title.trim() || 'Imagen escondida' }}</h2>
            </div>

            <div class="preview-status">
              <q-icon name="visibility" />
              <span>{{ revealedCount }} / {{ totalTiles }} descubiertas</span>
            </div>
          </div>

          <div class="game-preview">
            <div
              class="image-stage"
              :class="{ 'without-image': !imageUrl }"
              :style="gridStyle"
            >
              <img
                v-if="imageUrl"
                :src="imageUrl"
                alt="Imagen seleccionada para la actividad"
                class="hidden-image"
              />

              <div v-else class="image-placeholder">
                <div class="placeholder-icon">
                  <q-icon name="image" />
                </div>

                <strong>Selecciona una imagen</strong>

                <span>
                  Cuando selecciones una imagen aparecerá aquí cubierta por la
                  cuadrícula.
                </span>
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
                <span v-if="!tile.revealed">{{ tile.id }}</span>
              </button>
            </div>
          </div>

          <div class="preview-footer">
            <div class="operator-answer">
              <span>RESPUESTA DEL OPERADOR</span>
              <strong>{{ form.answer.trim() || 'Sin respuesta definida' }}</strong>
              <small v-if="form.bibleReference.trim()">
                {{ form.bibleReference }}
              </small>
            </div>

            <div class="preview-actions">
              <q-btn
                flat
                no-caps
                icon="visibility"
                label="Descubrir todas"
                class="secondary-action"
                @click="revealAllTiles"
              />

              <q-btn
                flat
                no-caps
                icon="shuffle"
                label="Descubrir aleatoria"
                class="secondary-action"
                :disable="allTilesRevealed"
                @click="revealRandomTile"
              />
            </div>
          </div>
        </main>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
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

const MIN_GRID_SIZE = 2;
const MAX_GRID_SIZE = 8;

const router = useRouter();
const $q = useQuasar();

const isCreating = ref(false);
const imageUrl = ref('');
const selectedFileName = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const tiles = ref<HiddenImageTile[]>([]);

const gridPresets = [2, 3, 4, 5, 6];

const form = reactive<HiddenImageForm>({
  title: '',
  answer: '',
  bibleReference: '',
  rows: 4,
  columns: 4,
});

const totalTiles = computed(() => form.rows * form.columns);

const revealedCount = computed(
  () => tiles.value.filter((tile) => tile.revealed).length,
);

const allTilesRevealed = computed(
  () =>
    tiles.value.length > 0 &&
    revealedCount.value === tiles.value.length,
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

function goBack(): void {
  if (isCreating.value) {
    cancelActivity();
    return;
  }

  void router.push('/actividades');
}

function createActivity(): void {
  resetForm();
  isCreating.value = true;
}

function cancelActivity(): void {
  isCreating.value = false;
  resetForm();
}

function resetForm(): void {
  form.title = '';
  form.answer = '';
  form.bibleReference = '';
  form.rows = 4;
  form.columns = 4;

  clearImage();
  rebuildTiles();
}

function rebuildTiles(): void {
  tiles.value = Array.from(
    { length: totalTiles.value },
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
  const selectedTile = hiddenTiles[randomIndex];

  if (selectedTile) {
    selectedTile.revealed = true;
  }
}

function changeRows(change: number): void {
  form.rows = clampGridValue(form.rows + change);
}

function changeColumns(change: number): void {
  form.columns = clampGridValue(form.columns + change);
}

function clampGridValue(value: number): number {
  return Math.min(
    MAX_GRID_SIZE,
    Math.max(MIN_GRID_SIZE, value),
  );
}

function applyGridPreset(size: number): void {
  const normalizedSize = clampGridValue(size);

  form.rows = normalizedSize;
  form.columns = normalizedSize;
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

  clearObjectUrl();

  imageUrl.value = URL.createObjectURL(file);
  selectedFileName.value = file.name;

  resetTiles();
}

function removeImage(): void {
  clearImage();
  resetTiles();
}

function clearImage(): void {
  clearObjectUrl();

  imageUrl.value = '';
  selectedFileName.value = '';

  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function clearObjectUrl(): void {
  if (imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value);
  }
}

function saveActivity(): void {
  if (!form.title.trim()) {
    $q.notify({
      type: 'warning',
      icon: 'warning',
      message: 'Escribe un nombre para la actividad.',
      position: 'top',
    });
    return;
  }

  if (!form.answer.trim()) {
    $q.notify({
      type: 'warning',
      icon: 'warning',
      message: 'Escribe la respuesta de la imagen.',
      position: 'top',
    });
    return;
  }

  if (!imageUrl.value) {
    $q.notify({
      type: 'warning',
      icon: 'warning',
      message: 'Selecciona una imagen para la actividad.',
      position: 'top',
    });
    return;
  }

  $q.notify({
    type: 'positive',
    icon: 'check_circle',
    message: 'La configuración es válida. El guardado permanente será el próximo paso.',
    position: 'top',
    timeout: 2500,
  });
}

onBeforeUnmount(() => {
  clearObjectUrl();
});

rebuildTiles();
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

.back-button {
  flex: 0 0 auto;
  color: #8fa2b8;
}

.back-button:hover {
  color: #ffffff;
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
  line-height: 1.2;
}

.header-copy p {
  margin: 4px 0 0;
  overflow: hidden;
  color: #8191a5;
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.new-activity-button,
.save-button {
  min-height: 38px;
  padding: 0 14px;
  color: #ffffff;
  background: #2563eb;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
}

.cancel-button {
  min-height: 38px;
  padding: 0 12px;
  color: #91a2b6;
  border-radius: 9px;
  font-size: 12px;
}

.content-area {
  display: grid;
  min-height: 0;
  flex: 1;
  place-items: center;
  padding: 28px;
}

.empty-state {
  display: flex;
  width: min(100%, 540px);
  align-items: center;
  flex-direction: column;
  padding: 38px 28px;
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
  font-weight: 700;
}

.empty-state p {
  max-width: 460px;
  margin: 10px 0 22px;
  color: #8191a5;
  font-size: 12px;
  line-height: 1.65;
}

.empty-action {
  min-height: 40px;
  padding: 0 18px;
  color: #ffffff;
  background: #2563eb;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
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
.preview-heading {
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

.panel-eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #65778d;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.11em;
}

.panel-heading h2,
.preview-heading h2 {
  margin: 0;
  color: #e7eef7;
  font-size: 15px;
  font-weight: 700;
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
  color: #dce7f4;
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

.app-input :deep(.q-field__control:hover::before) {
  border-color: #45617f;
}

.field-heading,
.section-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
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
  transition:
    background-color 150ms ease,
    border-color 150ms ease;
}

.image-selector:hover {
  background: #112033;
  border-color: #5a7da4;
}

.image-selector > .q-icon {
  flex: 0 0 auto;
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
  overflow: hidden;
  color: #687b91;
  font-size: 9px;
  line-height: 1.4;
  text-overflow: ellipsis;
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
  min-width: 24px;
  color: #edf4fb;
  font-size: 15px;
  text-align: center;
}

.grid-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.preset-button {
  min-height: 28px;
  padding: 0 9px;
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

.reset-button {
  min-height: 28px;
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
  background:
    radial-gradient(circle at 50% 40%, rgb(35 55 78 / 28%), transparent 55%),
    #050b12;
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
  box-shadow: 0 20px 60px rgb(0 0 0 / 35%);
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
  padding: 24px;
  color: #60748a;
  text-align: center;
}

.placeholder-icon {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  margin-bottom: 3px;
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
  line-height: 1.5;
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
  background:
    linear-gradient(145deg, rgb(27 43 61 / 98%), rgb(15 27 40 / 99%));
  border: 1px solid #344b64;
  cursor: pointer;
  transition:
    opacity 220ms ease,
    transform 180ms ease,
    background-color 180ms ease;
}

.cover-tile:hover {
  z-index: 3;
  background: #263d56;
}

.cover-tile span {
  font-size: clamp(9px, 1.3vw, 16px);
  font-weight: 700;
}

.cover-tile.revealed {
  pointer-events: auto;
  opacity: 0;
}

.without-image .cover-tile {
  opacity: 0.35;
}

.preview-footer {
  display: flex;
  flex: 0 0 auto;
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
  overflow: hidden;
  color: #dce7f4;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-answer small {
  color: #c084fc;
  font-size: 9px;
}

.preview-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 7px;
}

.secondary-action {
  min-height: 32px;
  padding: 0 10px;
  color: #8fa3ba;
  background: #101e2c;
  border: 1px solid #283c51;
  border-radius: 8px;
  font-size: 9px;
}

@media (max-width: 1000px) {
  .creator-area {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .preview-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .preview-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 780px) {
  .hidden-image-page {
    padding: 10px;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .new-activity-button,
  .save-button {
    flex: 1;
  }

  .creator-area {
    display: flex;
    flex-direction: column;
  }

  .configuration-panel {
    overflow: visible;
    border-right: 0;
    border-bottom: 1px solid #25364a;
  }

  .preview-panel {
    min-height: 600px;
  }

  .header-copy p {
    white-space: normal;
  }
}

@media (max-width: 520px) {
  .grid-controls {
    grid-template-columns: 1fr;
  }

  .preview-actions {
    flex-direction: column;
  }

  .secondary-action {
    width: 100%;
  }
}
</style>