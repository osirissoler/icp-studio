<template>
  <main class="song-editor-page">
    <header class="editor-header">
      <div class="editor-brand">
        <q-icon name="music_note" size="26px" />
        <div>
          <div class="editor-title">Nueva alabanza</div>
          <div class="editor-subtitle">Editor de alabanzas de ICP Studio</div>
        </div>
      </div>

      <q-btn flat round dense icon="close" aria-label="Cerrar editor" @click="closeEditor">
        <q-tooltip>Cerrar</q-tooltip>
      </q-btn>
    </header>

    <section class="song-details">
      <q-input
        v-model="songTitle"
        dark
        outlined
        dense
        label="Título de la alabanza *"
        class="title-field"
        maxlength="160"
      />
      <q-input v-model="songAuthor" dark outlined dense label="Autor (opcional)" maxlength="120" />
      <q-input
        v-model="musicalKey"
        dark
        outlined
        dense
        label="Tonalidad (opcional)"
        maxlength="20"
        class="key-field"
      />
    </section>

    <q-tabs
      v-model="activeTab"
      dense
      no-caps
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="editor-tabs"
    >
      <q-tab name="parts" icon="view_agenda" label="Crear por partes">
        <q-badge v-if="parts.length" floating color="primary">{{ parts.length }}</q-badge>
      </q-tab>
      <q-tab name="paste" icon="content_paste" label="Pegado rápido" />
      <q-tab name="order" icon="reorder" label="Orden y revisión" />
      <q-tab name="preview" icon="preview" label="Vista previa" />
    </q-tabs>

    <q-separator dark />

    <q-tab-panels v-model="activeTab" animated class="editor-panels">
      <q-tab-panel name="parts" class="parts-panel">
        <div class="parts-toolbar">
          <div>
            <div class="panel-title">Partes de la alabanza</div>
            <div class="panel-help">Agrégalas en el mismo orden en que serán presentadas.</div>
          </div>

          <div class="part-buttons">
            <q-btn
              v-for="option in quickPartOptions"
              :key="option.value"
              outline
              no-caps
              color="primary"
              :icon="option.icon"
              :label="option.label"
              @click="addPart(option.value)"
            >
              <q-tooltip>Agregar {{ option.label.toLowerCase() }}</q-tooltip>
            </q-btn>
          </div>
        </div>

        <div v-if="parts.length" class="parts-list">
          <article
            v-for="(part, index) in parts"
            :key="part.id"
            class="part-card"
            :class="{ 'part-card--dragging': draggedPartId === part.id }"
            @dragover.prevent
            @drop="dropPart(part.id)"
          >
            <header class="part-card-header">
              <q-icon
                name="drag_indicator"
                size="22px"
                class="part-drag-handle"
                draggable="true"
                @dragstart="startPartDragging($event, part.id)"
                @dragend="stopPartDragging"
              >
                <q-tooltip>Arrastra para cambiar el orden</q-tooltip>
              </q-icon>

              <span class="part-position">{{ index + 1 }}</span>

              <q-select
                v-model="part.type"
                dark
                dense
                outlined
                emit-value
                map-options
                :options="partTypeOptions"
                option-label="label"
                option-value="value"
                class="part-type-select"
              />

              <q-space />

              <q-btn
                flat
                round
                dense
                icon="content_copy"
                size="sm"
                aria-label="Duplicar parte"
                @click="duplicatePart(part.id)"
              >
                <q-tooltip>Duplicar parte</q-tooltip>
              </q-btn>

              <q-btn
                flat
                round
                dense
                icon="delete_outline"
                color="negative"
                size="sm"
                aria-label="Eliminar parte"
                @click="removePart(part.id)"
              >
                <q-tooltip>Eliminar parte</q-tooltip>
              </q-btn>
            </header>

            <q-input
              v-model="part.content"
              dark
              outlined
              autogrow
              type="textarea"
              :label="`Letra de ${getPartLabel(part.type).toLowerCase()}`"
              class="part-content-input"
            />
          </article>
        </div>

        <div v-else class="parts-empty">
          <q-icon name="queue_music" size="52px" />
          <div class="empty-title">La alabanza todavía no tiene partes</div>
          <div class="empty-description">
            Comienza agregando una estrofa, un coro, un puente u otra parte.
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="paste" class="paste-panel">
        <div class="paste-layout">
          <section>
            <div class="panel-title">Pegar canción completa</div>
            <div class="panel-help">
              Separa cada parte con su encabezado. También aceptamos textos separados por líneas
              vacías.
            </div>

            <q-input
              v-model="pastedText"
              dark
              outlined
              type="textarea"
              placeholder="Estrofa&#10;Escribe o pega aquí la primera estrofa...&#10;&#10;Coro&#10;Escribe aquí el coro...&#10;&#10;Estrofa&#10;Escribe aquí la siguiente estrofa..."
              class="paste-input q-mt-md"
            />

            <div class="paste-actions">
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="auto_fix_high"
                label="Convertir a partes"
                :disable="!pastedText.trim()"
                @click="processPastedSong"
              />
            </div>
          </section>

          <aside class="paste-guide">
            <div class="guide-title">Encabezados reconocidos</div>
            <div class="guide-types">
              <q-chip
                v-for="option in partTypeOptions"
                :key="option.value"
                dense
                square
                color="blue-grey-9"
                text-color="blue-grey-2"
                :icon="option.icon"
              >
                {{ option.label }}
              </q-chip>
            </div>

            <q-separator dark class="q-my-md" />

            <div class="guide-note">
              Los números son opcionales. Puedes escribir “Estrofa” o “Estrofa 1”; ambas formas se
              reconocerán correctamente.
            </div>
            <div class="guide-note q-mt-sm">
              Al procesar el texto se reemplazarán las partes actuales y pasarás a “Crear por
              partes” para revisarlas.
            </div>
          </aside>
        </div>
      </q-tab-panel>

      <q-tab-panel name="order">
        <div class="empty-editor-state">
          <q-icon name="reorder" size="52px" />
          <div class="text-h6">Orden y revisión</div>
          <div class="state-description">
            En el próximo paso mostraremos aquí la secuencia completa para organizarla.
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="preview">
        <div class="empty-editor-state">
          <q-icon name="preview" size="52px" />
          <div class="text-h6">Vista previa</div>
          <div class="state-description">
            Aquí revisaremos cómo se verá cada parte antes de guardar la alabanza.
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { SONG_PART_TYPE_OPTIONS, type SongPart, type SongPartType } from '../shared/song';

type EditorTab = 'parts' | 'paste' | 'order' | 'preview';

const $q = useQuasar();
const activeTab = ref<EditorTab>('parts');
const songTitle = ref('');
const songAuthor = ref('');
const musicalKey = ref('');
const pastedText = ref('');
const parts = ref<SongPart[]>([]);
const draggedPartId = ref<string | null>(null);
let nextPartId = 1;

const partTypeOptions = SONG_PART_TYPE_OPTIONS;
const quickPartOptions = SONG_PART_TYPE_OPTIONS.filter((option) =>
  ['verse', 'chorus', 'bridge', 'other'].includes(option.value),
);

function createPart(type: SongPartType, content = ''): SongPart {
  const part: SongPart = {
    id: `song-part-${Date.now()}-${nextPartId}`,
    type,
    content,
  };

  nextPartId += 1;
  return part;
}

function addPart(type: SongPartType): void {
  parts.value.push(createPart(type));
}

function getPartLabel(type: SongPartType): string {
  return partTypeOptions.find((option) => option.value === type)?.label ?? 'Otra parte';
}

function duplicatePart(partId: string): void {
  const sourceIndex = parts.value.findIndex((part) => part.id === partId);
  const sourcePart = parts.value[sourceIndex];

  if (!sourcePart) {
    return;
  }

  parts.value.splice(sourceIndex + 1, 0, createPart(sourcePart.type, sourcePart.content));
}

function removePart(partId: string): void {
  parts.value = parts.value.filter((part) => part.id !== partId);
}

function startPartDragging(event: DragEvent, partId: string): void {
  draggedPartId.value = partId;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', partId);
  }
}

function stopPartDragging(): void {
  draggedPartId.value = null;
}

function dropPart(targetPartId: string): void {
  const sourcePartId = draggedPartId.value;

  if (!sourcePartId || sourcePartId === targetPartId) {
    stopPartDragging();
    return;
  }

  const sourceIndex = parts.value.findIndex((part) => part.id === sourcePartId);
  const targetIndex = parts.value.findIndex((part) => part.id === targetPartId);

  if (sourceIndex === -1 || targetIndex === -1) {
    stopPartDragging();
    return;
  }

  const [movedPart] = parts.value.splice(sourceIndex, 1);

  if (movedPart) {
    parts.value.splice(targetIndex, 0, movedPart);
  }

  stopPartDragging();
}

function detectPartType(line: string): SongPartType | null {
  const heading = line
    .trim()
    .toLocaleLowerCase('es')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/:$/, '')
    .replace(/\s+\d+$/, '')
    .trim();

  if (heading === 'estrofa' || heading === 'verso') {
    return 'verse';
  }

  if (heading === 'coro') {
    return 'chorus';
  }

  if (heading === 'puente') {
    return 'bridge';
  }

  if (heading === 'introducción' || heading === 'introduccion' || heading === 'intro') {
    return 'intro';
  }

  if (heading === 'final') {
    return 'ending';
  }

  if (heading === 'otra parte' || heading === 'otro') {
    return 'other';
  }

  return null;
}

function parseSongText(text: string): SongPart[] {
  const normalizedText = text.trim();
  const lines = normalizedText.split(/\r?\n/);
  const containsHeadings = lines.some((line) => detectPartType(line) !== null);

  if (!containsHeadings) {
    return normalizedText
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((content) => createPart('verse', content));
  }

  const parsedParts: SongPart[] = [];
  let currentType: SongPartType = 'verse';
  let currentLines: string[] = [];

  const saveCurrentPart = () => {
    const content = currentLines.join('\n').trim();

    if (content) {
      parsedParts.push(createPart(currentType, content));
    }

    currentLines = [];
  };

  for (const line of lines) {
    const detectedType = detectPartType(line);

    if (detectedType) {
      saveCurrentPart();
      currentType = detectedType;
      continue;
    }

    currentLines.push(line);
  }

  saveCurrentPart();
  return parsedParts;
}

function processPastedSong(): void {
  const parsedParts = parseSongText(pastedText.value);

  if (parsedParts.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'No encontramos partes con letra para procesar.',
    });
    return;
  }

  parts.value = parsedParts;
  activeTab.value = 'parts';

  $q.notify({
    type: 'positive',
    message: `Se crearon ${parsedParts.length} partes. Revisa el contenido y el orden.`,
  });
}

function closeEditor(): void {
  window.close();
}
</script>

<style scoped>
.song-editor-page {
  display: flex;
  height: 100vh;
  flex-direction: column;
  overflow: hidden;
  color: #e8eef6;
  background: #0c131d;
}

.editor-header {
  display: flex;
  min-height: 62px;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: #0b1420;
  border-bottom: 1px solid #253142;
}

.editor-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.editor-brand > .q-icon {
  color: #60a5fa;
}

.editor-title {
  font-size: 16px;
  font-weight: 700;
}

.editor-subtitle {
  margin-top: 2px;
  color: #8492a6;
  font-size: 10px;
}

.song-details {
  display: grid;
  grid-template-columns: minmax(260px, 1.4fr) minmax(220px, 1fr) minmax(140px, 0.45fr);
  gap: 10px;
  padding: 12px 16px;
  background: #101925;
  border-bottom: 1px solid #253142;
}

.title-field :deep(.q-field__label)::after {
  color: #f87171;
  content: '';
}

.editor-tabs {
  min-height: 48px;
  padding: 0 10px;
  color: #8e9bad;
  background: #111b28;
}

.editor-panels {
  min-height: 0;
  flex: 1;
  color: #e8eef6;
  background: #0c131d;
}

.editor-panels :deep(.q-panel),
.editor-panels :deep(.q-tab-panel) {
  height: 100%;
}

.parts-panel,
.paste-panel {
  overflow: auto;
  padding: 18px;
}

.parts-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.panel-title {
  color: #dce6f2;
  font-size: 15px;
  font-weight: 700;
}

.panel-help {
  margin-top: 3px;
  color: #748297;
  font-size: 11px;
}

.part-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.part-card {
  max-width: 900px;
  margin: 0 auto 12px;
  overflow: hidden;
  background: #111b28;
  border: 1px solid #29384c;
  border-radius: 10px;
  transition:
    opacity 150ms ease,
    border-color 150ms ease;
}

.part-card--dragging {
  opacity: 0.45;
  border-color: #60a5fa;
}

.part-card-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  background: #162231;
  border-bottom: 1px solid #29384c;
}

.part-drag-handle {
  color: #65748a;
  cursor: grab;
}

.part-drag-handle:active {
  cursor: grabbing;
}

.part-position {
  display: grid;
  width: 22px;
  height: 22px;
  color: #91a0b3;
  background: #243246;
  border-radius: 50%;
  font-size: 10px;
  place-items: center;
}

.part-type-select {
  width: 160px;
}

.part-content-input {
  margin: 12px;
}

.parts-empty,
.empty-editor-state {
  display: flex;
  min-height: 300px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  color: #56657a;
  text-align: center;
}

.empty-title,
.empty-editor-state .text-h6 {
  color: #aab6c5;
  font-size: 16px;
  font-weight: 600;
}

.empty-description,
.state-description {
  max-width: 440px;
  font-size: 12px;
  line-height: 1.5;
}

.paste-layout {
  display: grid;
  max-width: 1100px;
  margin: 0 auto;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 18px;
}

.paste-input :deep(textarea) {
  min-height: 360px !important;
  line-height: 1.55;
}

.paste-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.paste-guide {
  padding: 15px;
  background: #111b28;
  border: 1px solid #29384c;
  border-radius: 10px;
}

.guide-title {
  color: #cdd7e4;
  font-size: 12px;
  font-weight: 700;
}

.guide-types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 10px;
}

.guide-note {
  color: #8492a6;
  font-size: 11px;
  line-height: 1.5;
}

@media (max-width: 800px) {
  .song-details,
  .paste-layout {
    grid-template-columns: 1fr;
  }

  .parts-toolbar {
    flex-direction: column;
  }

  .part-buttons {
    justify-content: flex-start;
  }
}
</style>
