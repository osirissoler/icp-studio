<template>
  <section class="score-panel">
    <header class="score-heading">
      <div>
        <span class="kicker"> LEER PARTITURA </span>

        <h2>Partitura a piano y armonías</h2>

        <p>
          Importa una partitura, conserva sus voces originales y genera nuevas líneas adicionales
          sin modificar lo escrito en el archivo.
        </p>
      </div>

      <div class="stage-chip">
        <q-icon name="library_music" />

        <div>
          <span>ETAPA ACTUAL</span>

          <strong> Partitura multiparte + generación </strong>
        </div>
      </div>
    </header>

    <section class="import-area">
      <div class="import-card active-import">
        <div class="import-icon">
          <q-icon name="description" />
        </div>

        <div class="import-copy">
          <span> IMPORTAR PARTITURA </span>

          <strong> MusicXML / XML </strong>

          <small>
            Lee partes, notas, compases, duraciones, silencios, tonalidad, claves y tempo.
          </small>
        </div>

        <q-btn
          unelevated
          no-caps
          icon="upload_file"
          label="Seleccionar archivo"
          class="import-button"
          @click="openMusicXmlPicker"
        />

        <input
          ref="musicXmlInput"
          type="file"
          accept=".musicxml,.xml,application/xml,text/xml"
          hidden
          @change="handleMusicXmlSelection"
        />
      </div>

      <OpticalScoreImporter @score-detected="handleOpticalScoreDetected" />
    </section>

    <div v-if="parseError" class="error-message">
      <q-icon name="error_outline" />

      <span>
        {{ parseError }}
      </span>
    </div>

    <template v-if="score">
      <section class="score-summary">
        <div class="summary-title">
          <q-icon name="queue_music" />

          <div>
            <span> PARTITURA CARGADA </span>

            <strong>
              {{ score.title }}
            </strong>

            <small>
              {{ score.sourceFileName }}
            </small>
          </div>
        </div>

        <div class="summary-grid">
          <div>
            <span>Tonalidad</span>

            <strong>
              {{ keyLabel }}
            </strong>
          </div>

          <div>
            <span>Compás</span>

            <strong>
              {{ score.timeSignature.numerator }}/{{ score.timeSignature.denominator }}
            </strong>
          </div>

          <div>
            <span>Tempo</span>

            <strong> {{ score.tempo }} BPM </strong>
          </div>

          <div>
            <span>Originales</span>

            <strong>
              {{ originalParts.length }}
            </strong>
          </div>

          <div>
            <span>Generadas</span>

            <strong>
              {{ generatedParts.length }}
            </strong>
          </div>

          <div>
            <span>Duración</span>

            <strong>
              {{ durationLabel }}
            </strong>
          </div>
        </div>
      </section>

      <section class="tempo-card">
        <div>
          <span> TEMPO DE REPRODUCCIÓN </span>

          <strong> {{ score.tempo }} BPM </strong>

          <small> El mismo tempo se aplica a las voces originales y generadas. </small>
        </div>

        <div class="tempo-actions">
          <q-btn
            flat
            round
            dense
            icon="remove"
            :disable="score.tempo <= 30 || isPlaying"
            @click="changeTempo(-5)"
          />

          <q-slider
            :model-value="score.tempo"
            :min="30"
            :max="220"
            :step="1"
            class="tempo-slider"
            :disable="isPlaying"
            @update:model-value="setTempo"
          />

          <q-btn
            flat
            round
            dense
            icon="add"
            :disable="score.tempo >= 220 || isPlaying"
            @click="changeTempo(5)"
          />
        </div>
      </section>

      <ScorePartsMixer
        v-if="originalParts.length"
        :parts="originalParts"
        :selected-ids="selectedOriginalPartIds"
        :disabled="isPlaying"
        :playing="playbackMode === 'originals'"
        :active-beat="activeBeat"
        @update:selected-ids="selectedOriginalPartIds = $event"
        @play="playOriginalParts"
        @stop="stopPlayback"
      />

      <section v-if="originalParts.length" class="timeline-section">
        <header>
          <div>
            <span> PARTITURA ORIGINAL </span>

            <strong> Línea de tiempo de las voces originales </strong>

            <small>
              Estas notas vienen directamente del archivo importado y no son modificadas por ICP
              Studio.
            </small>
          </div>

          <div
            v-if="playbackMode === 'originals' || playbackMode === 'combined'"
            class="playing-status"
          >
            <span></span>
            Siguiendo reproducción
          </div>
        </header>

        <div class="timeline-info">
          <div>
            <q-icon name="verified" />

            <span>NOTAS</span>

            <strong>
              {{ originalNoteCount }}
            </strong>
          </div>

          <div>
            <q-icon name="groups" />

            <span>VOCES</span>

            <strong>
              {{ originalParts.length }}
            </strong>
          </div>

          <div>
            <q-icon name="schedule" />

            <span>POSICIONES</span>

            <strong>
              {{ originalTimelineRows.length }}
            </strong>
          </div>
        </div>

        <div ref="originalTimelineScroll" class="table-wrapper timeline-scroll">
          <table class="score-table original-table">
            <thead>
              <tr>
                <th class="measure-column">Compás</th>

                <th class="beat-column">Beat</th>

                <th v-for="part in originalParts" :key="part.id" class="part-column">
                  <div class="part-heading">
                    <span>
                      {{ part.abbreviation || 'VOZ' }}
                    </span>

                    <strong>
                      {{ part.name }}
                    </strong>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="row in originalTimelineRows"
                :key="row.key"
                :data-timeline-beat="timelinePositionKey(row.absoluteBeat)"
                :class="{
                  active: isTimelineRowActive(row.absoluteBeat),
                }"
              >
                <td class="measure-cell">
                  {{ row.measureNumber }}
                </td>

                <td class="beat-cell">
                  {{ formatBeat(row.startBeat) }}
                </td>

                <td v-for="part in originalParts" :key="part.id" class="original-note-cell">
                  <div v-if="notesForPart(row, part.id).length" class="timeline-notes">
                    <button
                      v-for="note in notesForPart(row, part.id)"
                      :key="note.id"
                      type="button"
                      class="timeline-note"
                      :disabled="isPlaying"
                      @click="playSingleNote(note)"
                    >
                      <strong>
                        {{ noteLabel(note) }}
                      </strong>

                      <small> {{ formatBeat(note.durationBeats) }} t </small>
                    </button>
                  </div>

                  <span v-else class="empty-note"> — </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <GeneratedVoiceBuilder
        v-if="originalParts.length"
        :parts="originalParts"
        :source-part-id="generationSourcePartId"
        :disabled="isPlaying"
        @update:source-part-id="generationSourcePartId = $event"
        @generate="handleGenerateVoices"
      />

      <GeneratedVoiceManager
        v-if="generatedParts.length"
        :parts="generatedParts"
        :original-parts="originalParts"
        :selected-ids="selectedGeneratedPartIds"
        :disabled="isPlaying"
        :playing="playbackMode === 'generated'"
        :playing-part-id="playingGeneratedPartId"
        @update:selected-ids="selectedGeneratedPartIds = $event"
        @play-selected="playGeneratedParts"
        @play-part="playGeneratedPart"
        @stop="stopPlayback"
        @regenerate="handleRegenerateGeneratedPart"
        @delete="removeGeneratedPart"
      />

      <section v-if="generatedParts.length" class="timeline-section generated-timeline-section">
        <header>
          <div>
            <span> VOCES GENERADAS </span>

            <strong> Línea de tiempo generada </strong>

            <small>
              Haz clic en cualquier nota generada para escucharla o modificarla manualmente. Las
              correcciones quedan asociadas únicamente a esa voz.
            </small>
          </div>

          <div class="generated-header-actions">
            <div v-if="manualOverrideCount" class="manual-count">
              <q-icon name="edit_note" />

              {{ manualOverrideCount }}
              {{ manualOverrideCount === 1 ? 'corrección' : 'correcciones' }}
            </div>

            <div
              v-if="playbackMode === 'generated' || playbackMode === 'combined'"
              class="playing-status generated-status"
            >
              <span></span>
              Siguiendo reproducción
            </div>
          </div>
        </header>

        <div class="timeline-info">
          <div>
            <q-icon name="auto_awesome" />

            <span> NOTAS GENERADAS </span>

            <strong>
              {{ generatedNoteCount }}
            </strong>
          </div>

          <div>
            <q-icon name="account_tree" />

            <span>VOCES</span>

            <strong>
              {{ generatedParts.length }}
            </strong>
          </div>

          <div>
            <q-icon name="schedule" />

            <span>POSICIONES</span>

            <strong>
              {{ generatedTimelineRows.length }}
            </strong>
          </div>
        </div>

        <div ref="generatedTimelineScroll" class="table-wrapper timeline-scroll generated-scroll">
          <table class="score-table generated-table">
            <thead>
              <tr>
                <th class="measure-column">Compás</th>

                <th class="beat-column">Beat</th>

                <th v-for="part in generatedParts" :key="part.id" class="part-column">
                  <div class="part-heading generated-part-heading">
                    <span>
                      {{ part.abbreviation || 'GEN' }}
                    </span>

                    <strong>
                      {{ part.name }}
                    </strong>

                    <small v-if="generatedPartOverrideCount(part)" class="part-manual-count">
                      {{ generatedPartOverrideCount(part) }}
                      manual
                    </small>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="row in generatedTimelineRows"
                :key="row.key"
                :data-timeline-beat="timelinePositionKey(row.absoluteBeat)"
                :class="{
                  active: isTimelineRowActive(row.absoluteBeat),
                }"
              >
                <td class="measure-cell">
                  {{ row.measureNumber }}
                </td>

                <td class="beat-cell">
                  {{ formatBeat(row.startBeat) }}
                </td>

                <td v-for="part in generatedParts" :key="part.id" class="original-note-cell">
                  <div v-if="notesForPart(row, part.id).length" class="timeline-notes">
                    <button
                      v-for="note in notesForPart(row, part.id)"
                      :key="note.id"
                      type="button"
                      class="timeline-note generated-note"
                      :class="{
                        manual: isGeneratedNoteOverridden(part, note.id),
                        editing:
                          editingGeneratedPartId === part.id && editingGeneratedNoteId === note.id,
                      }"
                      :disabled="isPlaying"
                      @click="openGeneratedNoteEditor(part.id, note.id)"
                    >
                      <q-icon
                        v-if="isGeneratedNoteOverridden(part, note.id)"
                        name="edit"
                        class="manual-note-icon"
                      />

                      <strong>
                        {{ noteLabel(note) }}
                      </strong>

                      <small> {{ formatBeat(note.durationBeats) }} t </small>
                    </button>
                  </div>

                  <span v-else class="empty-note"> — </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <GeneratedNoteEditor
          v-if="editingGeneratedPart && editingGeneratedNote"
          :part="editingGeneratedPart"
          :note="editingGeneratedNote"
          :overridden="isGeneratedNoteOverridden(editingGeneratedPart, editingGeneratedNote.id)"
          :disabled="isPlaying"
          @preview="previewGeneratedMidi"
          @save="saveGeneratedNote"
          @reset="resetGeneratedNote"
          @close="closeGeneratedNoteEditor"
        />
      </section>

      <section v-if="generatedParts.length" class="combined-playback">
        <header>
          <div>
            <span> MEZCLA COMPLETA </span>

            <strong> Originales + generadas </strong>

            <small> Reproduce simultáneamente las voces seleccionadas de ambos grupos. </small>
          </div>

          <q-icon name="groups" />
        </header>

        <div class="combined-summary">
          <div>
            <span> ORIGINALES </span>

            <strong>
              {{ selectedOriginalPartIds.length }}
            </strong>
          </div>

          <q-icon name="add" />

          <div>
            <span> GENERADAS </span>

            <strong>
              {{ selectedGeneratedPartIds.length }}
            </strong>
          </div>

          <q-icon name="drag_handle" />

          <div>
            <span> TOTAL </span>

            <strong>
              {{ combinedSelectedCount }}
            </strong>
          </div>
        </div>

        <q-btn
          unelevated
          no-caps
          icon="groups"
          :label="
            playbackMode === 'combined' ? 'Reproduciendo combinación' : 'Escuchar combinación'
          "
          class="combined-button"
          :disable="isPlaying || !combinedSelectedCount"
          @click="playCombinedParts"
        />
      </section>

      <section class="process-summary">
        <article>
          <q-icon name="description" />

          <span>1</span>

          <strong> Originales </strong>

          <small> Se conservan exactamente como fueron importadas. </small>
        </article>

        <article>
          <q-icon name="view_timeline" />

          <span>2</span>

          <strong> Línea original </strong>

          <small> Las notas reales pueden estudiarse parte por parte. </small>
        </article>

        <article>
          <q-icon name="auto_awesome" />

          <span>3</span>

          <strong> Generador </strong>

          <small> Tú decides cuántas voces nuevas quieres crear. </small>
        </article>

        <article>
          <q-icon name="edit_note" />

          <span>4</span>

          <strong> Corrección </strong>

          <small>
            Las notas generadas pueden corregirse manualmente sin alterar las originales.
          </small>
        </article>
      </section>
    </template>

    <div v-else class="empty-state">
      <q-icon name="queue_music" />

      <strong> Carga una partitura para comenzar </strong>

      <span> Puedes utilizar MusicXML, PDF, PNG, JPG, JPEG o WEBP. </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { notes } from '../../shared/music';

import {
  generatedScoreParts,
  originalScoreParts,
  scoreDurationMs,
  scorePartToTimeline,
  type ScoreDocument,
  // type ScoreGeneratedNoteOverride,
  type ScorePart,
  type ScoreTimelineNote,
} from '../../shared/score';

import GeneratedNoteEditor from './GeneratedNoteEditor.vue';

import GeneratedVoiceBuilder from './GeneratedVoiceBuilder.vue';

import GeneratedVoiceManager from './GeneratedVoiceManager.vue';

import {
  applyGeneratedNoteOverrides,
  generatedNoteIsOverridden,
  generatedNoteOverrideCount,
  setGeneratedNoteOverride,
  withoutGeneratedNoteOverride,
} from './generated-note-overrides';

import {
  generateScorePart,
  generateScoreParts,
  type GeneratedVoiceKind,
  type GeneratedVoicePlacement,
  type GeneratedVoiceRequest,
} from './generated-voice-engine';

import OpticalScoreImporter from './optical-score/OpticalScoreImporter.vue';

import ScorePartsMixer from './ScorePartsMixer.vue';

import { ScorePianoPlayer } from './score-piano-player';

import { parseMusicXml } from './score-parser';

interface TimelineRow {
  key: string;

  absoluteBeat: number;

  measureNumber: number;

  startBeat: number;

  partNotes: Map<string, ScoreTimelineNote[]>;
}

const musicXmlInput = ref<HTMLInputElement | null>(null);

const originalTimelineScroll = ref<HTMLElement | null>(null);

const generatedTimelineScroll = ref<HTMLElement | null>(null);

const score = ref<ScoreDocument | null>(null);

const parseError = ref('');

const isPlaying = ref(false);

const activeBeat = ref<number | null>(null);

const selectedOriginalPartIds = ref<string[]>([]);

const selectedGeneratedPartIds = ref<string[]>([]);

const generationSourcePartId = ref<string | null>(null);

const playingGeneratedPartId = ref<string | null>(null);

const editingGeneratedPartId = ref<string | null>(null);

const editingGeneratedNoteId = ref<string | null>(null);

const playbackMode = ref<'originals' | 'generated' | 'combined' | 'single' | null>(null);

const player = new ScorePianoPlayer();

const originalParts = computed(() => {
  if (!score.value) {
    return [];
  }

  return originalScoreParts(score.value);
});

const generatedParts = computed(() => {
  if (!score.value) {
    return [];
  }

  return generatedScoreParts(score.value);
});

const originalPartTimelines = computed(() => {
  if (!score.value) {
    return [];
  }

  return originalParts.value.map((part) => ({
    part,

    timeline: scorePartToTimeline(score.value!, part),
  }));
});

const generatedPartTimelines = computed(() => {
  if (!score.value) {
    return [];
  }

  return generatedParts.value.map((part) => ({
    part,

    timeline: scorePartToTimeline(score.value!, part),
  }));
});

const originalTimelineRows = computed<TimelineRow[]>(() =>
  buildTimelineRows(originalPartTimelines.value),
);

const generatedTimelineRows = computed<TimelineRow[]>(() =>
  buildTimelineRows(generatedPartTimelines.value),
);

const originalNoteCount = computed(() =>
  originalPartTimelines.value.reduce((total, item) => total + item.timeline.length, 0),
);

const generatedNoteCount = computed(() =>
  generatedPartTimelines.value.reduce((total, item) => total + item.timeline.length, 0),
);

const combinedSelectedCount = computed(
  () => selectedOriginalPartIds.value.length + selectedGeneratedPartIds.value.length,
);

const manualOverrideCount = computed(() =>
  generatedParts.value.reduce((total, part) => total + generatedNoteOverrideCount(part), 0),
);

const editingGeneratedPart = computed<ScorePart | null>(() => {
  if (!editingGeneratedPartId.value) {
    return null;
  }

  return generatedParts.value.find((part) => part.id === editingGeneratedPartId.value) ?? null;
});

const editingGeneratedNote = computed<ScoreTimelineNote | null>(() => {
  if (!score.value || !editingGeneratedPart.value || !editingGeneratedNoteId.value) {
    return null;
  }

  return (
    scorePartToTimeline(score.value, editingGeneratedPart.value).find(
      (note) => note.id === editingGeneratedNoteId.value,
    ) ?? null
  );
});

const durationLabel = computed(() => {
  if (!score.value) {
    return '--';
  }

  return formatMilliseconds(scoreDurationMs(score.value));
});

const keyLabel = computed(() => {
  if (!score.value) {
    return '--';
  }

  const definition =
    notes.find((note) => note.value === score.value?.keySignature.rootNote) ?? notes[0]!;

  return `${definition.label} ${
    score.value.keySignature.scaleMode === 'major' ? 'mayor' : 'menor'
  }`;
});

watch(activeBeat, (beat) => {
  if (beat === null) {
    return;
  }

  void nextTick(() => {
    followActiveTimeline();
  });
});

function openMusicXmlPicker(): void {
  musicXmlInput.value?.click();
}

async function handleMusicXmlSelection(event: Event): Promise<void> {
  parseError.value = '';

  stopPlayback();

  const target = event.target as HTMLInputElement;

  const file = target.files?.[0];

  target.value = '';

  if (!file) {
    return;
  }

  try {
    const text = await file.text();

    const parsedScore = parseMusicXml(text, file.name);

    loadScore(parsedScore);
  } catch (error) {
    score.value = null;

    selectedOriginalPartIds.value = [];

    selectedGeneratedPartIds.value = [];

    generationSourcePartId.value = null;

    playingGeneratedPartId.value = null;

    closeGeneratedNoteEditor();

    parseError.value =
      error instanceof Error ? error.message : 'No fue posible interpretar la partitura.';
  }
}

function handleOpticalScoreDetected(detectedScore: ScoreDocument): void {
  stopPlayback();

  parseError.value = '';

  loadScore(detectedScore);
}

function loadScore(newScore: ScoreDocument): void {
  score.value = newScore;

  const originals = originalScoreParts(newScore);

  selectedOriginalPartIds.value = originals.map((part) => part.id);

  selectedGeneratedPartIds.value = [];

  generationSourcePartId.value = originals[0]?.id ?? null;

  playingGeneratedPartId.value = null;

  closeGeneratedNoteEditor();

  resetTimelineScrolls();
}

function changeTempo(change: number): void {
  if (!score.value) {
    return;
  }

  setTempo(score.value.tempo + change);
}

function setTempo(value: number | null): void {
  if (!score.value || value === null) {
    return;
  }

  score.value = {
    ...score.value,

    tempo: Math.min(220, Math.max(30, Math.round(value))),
  };
}

function handleGenerateVoices(sourcePartId: string, requests: GeneratedVoiceRequest[]): void {
  if (!score.value) {
    return;
  }

  const sourcePart = originalParts.value.find((part) => part.id === sourcePartId);

  if (!sourcePart) {
    return;
  }

  const newParts = generateScoreParts(score.value, sourcePart, requests);

  const existingParts = score.value.parts ?? [];

  const generatedIds = new Set(newParts.map((part) => part.id));

  const preservedParts = existingParts.filter((part) => !generatedIds.has(part.id));

  score.value = {
    ...score.value,

    parts: [...preservedParts, ...newParts],
  };

  const newSelectedIds = newParts.map((part) => part.id);

  selectedGeneratedPartIds.value = Array.from(
    new Set([...selectedGeneratedPartIds.value, ...newSelectedIds]),
  );

  closeGeneratedNoteEditor();

  void nextTick(() => {
    if (generatedTimelineScroll.value) {
      generatedTimelineScroll.value.scrollTop = 0;

      generatedTimelineScroll.value.scrollLeft = 0;
    }
  });
}

function handleRegenerateGeneratedPart(partId: string, request: GeneratedVoiceRequest): void {
  if (!score.value) {
    return;
  }

  const currentPart = generatedParts.value.find((part) => part.id === partId);

  if (!currentPart) {
    return;
  }

  const sourcePart = originalParts.value.find(
    (part) => part.id === currentPart.generatedFromPartId,
  );

  if (!sourcePart) {
    return;
  }

  const regenerated = generateScorePart(score.value, sourcePart, request);

  const withOverrides = applyGeneratedNoteOverrides(
    {
      ...regenerated,

      id: partId,
    },
    currentPart.generatedManualOverrides,
  );

  score.value = {
    ...score.value,

    parts: score.value.parts?.map((part) => (part.id === partId ? withOverrides : part)) ?? [],
  };

  if (!selectedGeneratedPartIds.value.includes(partId)) {
    selectedGeneratedPartIds.value = [...selectedGeneratedPartIds.value, partId];
  }

  closeGeneratedNoteEditor();
}

function removeGeneratedPart(partId: string): void {
  if (!score.value) {
    return;
  }

  score.value = {
    ...score.value,

    parts: score.value.parts?.filter((part) => part.id !== partId) ?? [],
  };

  selectedGeneratedPartIds.value = selectedGeneratedPartIds.value.filter((id) => id !== partId);

  if (playingGeneratedPartId.value === partId) {
    playingGeneratedPartId.value = null;
  }

  if (editingGeneratedPartId.value === partId) {
    closeGeneratedNoteEditor();
  }
}

function openGeneratedNoteEditor(partId: string, noteId: string): void {
  if (isPlaying.value) {
    return;
  }

  editingGeneratedPartId.value = partId;

  editingGeneratedNoteId.value = noteId;

  void nextTick(() => {
    generatedTimelineScroll.value?.querySelector<HTMLElement>(`[data-timeline-beat]`);
  });
}

function closeGeneratedNoteEditor(): void {
  editingGeneratedPartId.value = null;

  editingGeneratedNoteId.value = null;
}

function saveGeneratedNote(midi: number): void {
  if (!score.value || !editingGeneratedPart.value || !editingGeneratedNote.value) {
    return;
  }

  const partId = editingGeneratedPart.value.id;

  const noteId = editingGeneratedNote.value.id;

  const updatedPart = setGeneratedNoteOverride(editingGeneratedPart.value, noteId, midi);

  score.value = {
    ...score.value,

    parts: score.value.parts?.map((part) => (part.id === partId ? updatedPart : part)) ?? [],
  };
}

async function previewGeneratedMidi(midi: number): Promise<void> {
  stopPlayback();

  isPlaying.value = true;

  playbackMode.value = 'single';

  playingGeneratedPartId.value = null;

  await player.playMidi(midi, 0.85);

  window.setTimeout(() => {
    if (playbackMode.value === 'single') {
      finishPlayback();
    }
  }, 970);
}

function resetGeneratedNote(): void {
  if (!score.value || !editingGeneratedPart.value || !editingGeneratedNote.value) {
    return;
  }

  const currentPart = editingGeneratedPart.value;

  const noteId = editingGeneratedNote.value.id;

  const sourcePart = originalParts.value.find(
    (part) => part.id === currentPart.generatedFromPartId,
  );

  if (!sourcePart) {
    return;
  }

  const request = generatedVoiceRequestFromPart(currentPart);

  const remainingOverrides = withoutGeneratedNoteOverride(
    currentPart.generatedManualOverrides,
    noteId,
  );

  const regenerated = generateScorePart(score.value, sourcePart, request);

  const restored = applyGeneratedNoteOverrides(
    {
      ...regenerated,

      id: currentPart.id,
    },
    remainingOverrides,
  );

  score.value = {
    ...score.value,

    parts: score.value.parts?.map((part) => (part.id === currentPart.id ? restored : part)) ?? [],
  };

  editingGeneratedPartId.value = restored.id;

  editingGeneratedNoteId.value = noteId;
}

function generatedVoiceRequestFromPart(part: ScorePart): GeneratedVoiceRequest {
  const config = part.generatedVoiceConfig;

  if (config) {
    return {
      id: config.requestId,

      label: config.label,

      kind: config.kind,

      placement: config.placement,

      customDiatonicOffset: config.customDiatonicOffset,

      customSemitoneOffset: config.customSemitoneOffset,

      minMidi: config.minMidi,

      maxMidi: config.maxMidi,
    };
  }

  const parsed = parseGeneratedVoiceType(part.generatedVoiceType);

  return {
    id: legacyRequestId(part.id),

    label: part.name,

    kind: parsed.kind,

    placement: parsed.placement,
  };
}

function parseGeneratedVoiceType(value: string | undefined): {
  kind: GeneratedVoiceKind;

  placement: GeneratedVoicePlacement;
} {
  const [rawKind, rawPlacement] = (value ?? '').split(':');

  const kind: GeneratedVoiceKind =
    rawKind === 'second' ||
    rawKind === 'tenor' ||
    rawKind === 'baritone' ||
    rawKind === 'bass' ||
    rawKind === 'custom'
      ? rawKind
      : 'second';

  const placement: GeneratedVoicePlacement = rawPlacement === 'below' ? 'below' : 'above';

  return {
    kind,

    placement,
  };
}

function legacyRequestId(partId: string): string {
  return partId.replace(/^generated-/, '').replace(/[^a-zA-Z0-9-_]/g, '-');
}

function isGeneratedNoteOverridden(part: ScorePart, noteId: string): boolean {
  return generatedNoteIsOverridden(part, noteId);
}

function generatedPartOverrideCount(part: ScorePart): number {
  return generatedNoteOverrideCount(part);
}

async function playOriginalParts(): Promise<void> {
  if (!score.value) {
    return;
  }

  const parts = originalParts.value.filter((part) =>
    selectedOriginalPartIds.value.includes(part.id),
  );

  await playParts(parts, 'originals');
}

async function playGeneratedParts(): Promise<void> {
  if (!score.value) {
    return;
  }

  const parts = generatedParts.value.filter((part) =>
    selectedGeneratedPartIds.value.includes(part.id),
  );

  await playParts(parts, 'generated', null);
}

async function playGeneratedPart(partId: string): Promise<void> {
  const part = generatedParts.value.find((candidate) => candidate.id === partId);

  if (!part) {
    return;
  }

  await playParts([part], 'generated', partId);
}

async function playCombinedParts(): Promise<void> {
  if (!score.value) {
    return;
  }

  const originals = originalParts.value.filter((part) =>
    selectedOriginalPartIds.value.includes(part.id),
  );

  const generated = generatedParts.value.filter((part) =>
    selectedGeneratedPartIds.value.includes(part.id),
  );

  await playParts([...originals, ...generated], 'combined');
}

async function playParts(
  parts: ScorePart[],
  mode: 'originals' | 'generated' | 'combined',
  generatedPartId: string | null = null,
): Promise<void> {
  if (!score.value || !parts.length) {
    return;
  }

  stopPlayback();

  resetTimelineScrolls();

  isPlaying.value = true;

  activeBeat.value = null;

  playbackMode.value = mode;

  playingGeneratedPartId.value = generatedPartId;

  await player.playScoreParts(score.value, parts, {
    onPositionChange(absoluteBeat) {
      activeBeat.value = absoluteBeat;
    },

    onFinish() {
      finishPlayback();
    },
  });
}

async function playSingleNote(note: ScoreTimelineNote): Promise<void> {
  stopPlayback();

  isPlaying.value = true;

  activeBeat.value = note.absoluteBeat;

  playbackMode.value = 'single';

  playingGeneratedPartId.value = null;

  const durationSeconds = Math.min(1.8, Math.max(0.25, note.durationMs / 1000));

  await player.playMidi(note.midi, durationSeconds);

  window.setTimeout(
    () => {
      if (playbackMode.value === 'single') {
        finishPlayback();
      }
    },
    durationSeconds * 1000 + 120,
  );
}

function stopPlayback(): void {
  player.stop();

  finishPlayback();
}

function finishPlayback(): void {
  isPlaying.value = false;

  activeBeat.value = null;

  playbackMode.value = null;

  playingGeneratedPartId.value = null;
}

function followActiveTimeline(): void {
  if (activeBeat.value === null || playbackMode.value === 'single') {
    return;
  }

  const beatKey = timelinePositionKey(activeBeat.value);

  if (playbackMode.value === 'originals' || playbackMode.value === 'combined') {
    scrollTimelineToBeat(originalTimelineScroll.value, beatKey);
  }

  if (playbackMode.value === 'generated' || playbackMode.value === 'combined') {
    scrollTimelineToBeat(generatedTimelineScroll.value, beatKey);
  }
}

function scrollTimelineToBeat(container: HTMLElement | null, beatKey: string): void {
  if (!container) {
    return;
  }

  const row = container.querySelector<HTMLElement>(`[data-timeline-beat="${beatKey}"]`);

  if (!row) {
    return;
  }

  const rowRect = row.getBoundingClientRect();

  const containerRect = container.getBoundingClientRect();

  const desiredTop =
    container.scrollTop +
    rowRect.top -
    containerRect.top -
    container.clientHeight / 2 +
    rowRect.height / 2;

  const maximumTop = Math.max(0, container.scrollHeight - container.clientHeight);

  const nextTop = Math.min(maximumTop, Math.max(0, desiredTop));

  container.scrollTo({
    top: nextTop,

    behavior: 'smooth',
  });
}

function resetTimelineScrolls(): void {
  void nextTick(() => {
    [originalTimelineScroll.value, generatedTimelineScroll.value].forEach((container) => {
      if (!container) {
        return;
      }

      container.scrollTop = 0;

      container.scrollLeft = 0;
    });
  });
}

function buildTimelineRows(
  timelines: {
    part: ScorePart;

    timeline: ScoreTimelineNote[];
  }[],
): TimelineRow[] {
  const rows = new Map<string, TimelineRow>();

  timelines.forEach(({ part, timeline }) => {
    timeline.forEach((note) => {
      const key = timelinePositionKey(note.absoluteBeat);

      let row = rows.get(key);

      if (!row) {
        row = {
          key,

          absoluteBeat: note.absoluteBeat,

          measureNumber: note.measureNumber,

          startBeat: note.startBeat,

          partNotes: new Map<string, ScoreTimelineNote[]>(),
        };

        rows.set(key, row);
      }

      const partNotes = row.partNotes.get(part.id) ?? [];

      partNotes.push(note);

      partNotes.sort((left, right) => left.midi - right.midi);

      row.partNotes.set(part.id, partNotes);
    });
  });

  return Array.from(rows.values()).sort((left, right) => left.absoluteBeat - right.absoluteBeat);
}

function notesForPart(row: TimelineRow, partId: string): ScoreTimelineNote[] {
  return row.partNotes.get(partId) ?? [];
}

function noteLabel(note: ScoreTimelineNote): string {
  const definition = notes.find((candidate) => candidate.value === note.noteIndex) ?? notes[0]!;

  return `${definition.label}${note.octave}`;
}

function isTimelineRowActive(absoluteBeat: number): boolean {
  if (activeBeat.value === null) {
    return false;
  }

  return Math.abs(activeBeat.value - absoluteBeat) < 0.0001;
}

function timelinePositionKey(absoluteBeat: number): string {
  return absoluteBeat.toFixed(6);
}

function formatBeat(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatMilliseconds(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

onBeforeUnmount(() => {
  void player.destroy();
});
</script>

<style scoped>
.score-panel {
  padding: 18px;
  background: radial-gradient(circle at 85% 0%, rgb(34 211 238 / 6%), transparent 28%), #0b1622;
  border: 1px solid #21364a;
  border-radius: 16px;
}

.score-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.kicker {
  color: #22d3ee;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.score-heading h2 {
  margin: 3px 0 4px;
  color: #edf4fb;
  font-size: 18px;
}

.score-heading p {
  max-width: 760px;
  margin: 0;
  color: #71859a;
  font-size: 10px;
  line-height: 1.5;
}

.stage-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 195px;
  padding: 9px 11px;
  background: rgb(34 211 238 / 6%);
  border: 1px solid rgb(34 211 238 / 16%);
  border-radius: 9px;
}

.stage-chip > .q-icon {
  color: #22d3ee;
  font-size: 20px;
}

.stage-chip > div {
  display: flex;
  flex-direction: column;
}

.stage-chip span {
  color: #5c8690;
  font-size: 6px;
}

.stage-chip strong {
  color: #a5f3fc;
  font-size: 9px;
}

.import-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 14px;
}

.import-card {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 11px;
  background: #101e2c;
  border: 1px solid #293e53;
  border-radius: 10px;
}

.active-import {
  border-color: rgb(34 211 238 / 22%);
}

.import-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: #22d3ee;
  background: rgb(34 211 238 / 7%);
  border-radius: 9px;
}

.import-icon .q-icon {
  font-size: 22px;
}

.import-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.import-copy span {
  color: #22d3ee;
  font-size: 6px;
  font-weight: 700;
}

.import-copy strong {
  color: #d9e4ef;
  font-size: 10px;
}

.import-copy small {
  color: #65798f;
  font-size: 7px;
}

.import-button,
.combined-button {
  color: white;
  background: #16738a;
  border-radius: 8px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 9px 10px;
  color: #fecdd3;
  background: rgb(251 113 133 / 6%);
  border: 1px solid rgb(251 113 133 / 16%);
  border-radius: 8px;
  font-size: 8px;
}

.score-summary {
  margin-top: 12px;
  padding: 12px;
  background: #0d1b29;
  border: 1px solid #263b50;
  border-radius: 10px;
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-title > .q-icon {
  color: #22d3ee;
  font-size: 22px;
}

.summary-title > div {
  display: flex;
  flex-direction: column;
}

.summary-title span {
  color: #22d3ee;
  font-size: 6px;
  font-weight: 700;
}

.summary-title strong {
  color: #dce7f2;
  font-size: 11px;
}

.summary-title small {
  color: #60758b;
  font-size: 7px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-top: 9px;
}

.summary-grid > div {
  display: flex;
  flex-direction: column;
  padding: 7px 8px;
  background: #101f2e;
  border-radius: 7px;
}

.summary-grid span {
  color: #5e7389;
  font-size: 6px;
  text-transform: uppercase;
}

.summary-grid strong {
  color: #b9c9d8;
  font-size: 9px;
}

.tempo-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 10px;
  padding: 10px 12px;
  background: rgb(167 139 250 / 4%);
  border: 1px solid rgb(167 139 250 / 12%);
  border-radius: 9px;
}

.tempo-card > div:first-child {
  display: flex;
  flex-direction: column;
}

.tempo-card span {
  color: #a78bfa;
  font-size: 6px;
  font-weight: 700;
}

.tempo-card strong {
  color: #ddd6fe;
  font-size: 10px;
}

.tempo-card small {
  color: #746f8c;
  font-size: 7px;
}

.tempo-actions {
  display: flex;
  width: 340px;
  align-items: center;
  gap: 7px;
}

.tempo-slider {
  flex: 1;
}

.timeline-section,
.combined-playback {
  margin-top: 11px;
  padding: 12px;
  background: #0d1a27;
  border: 1px solid #24394d;
  border-radius: 10px;
}

.timeline-section > header,
.combined-playback > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.timeline-section > header > div:first-child,
.combined-playback > header > div:first-child {
  display: flex;
  flex-direction: column;
}

.timeline-section > header span,
.combined-playback > header span {
  color: #22d3ee;
  font-size: 7px;
  font-weight: 700;
}

.timeline-section > header strong,
.combined-playback > header strong {
  color: #c7d6e5;
  font-size: 10px;
}

.timeline-section > header small,
.combined-playback > header small {
  max-width: 680px;
  color: #65798f;
  font-size: 7px;
  line-height: 1.5;
}

.generated-timeline-section {
  border-color: rgb(167 139 250 / 17%);
}

.generated-timeline-section > header span {
  color: #a78bfa;
}

.generated-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.manual-count {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 7px;
  color: #c4b5fd;
  background: rgb(167 139 250 / 7%);
  border: 1px solid rgb(167 139 250 / 15%);
  border-radius: 7px;
  font-size: 6px;
}

.playing-status {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #67e8f9;
  font-size: 7px;
  white-space: nowrap;
}

.playing-status > span {
  width: 6px;
  height: 6px;
  background: #22d3ee;
  border-radius: 50%;
  box-shadow: 0 0 8px rgb(34 211 238 / 60%);
}

.generated-status {
  color: #c4b5fd;
}

.generated-status > span {
  background: #a78bfa;
  box-shadow: 0 0 8px rgb(167 139 250 / 55%);
}

.timeline-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 10px;
}

.timeline-info > div {
  display: grid;
  grid-template-columns: 22px 1fr;
  padding: 7px 8px;
  background: #101f2e;
  border: 1px solid #22394c;
  border-radius: 7px;
}

.timeline-info .q-icon {
  grid-row: 1 / 3;
  align-self: center;
  color: #22d3ee;
  font-size: 16px;
}

.timeline-info span {
  color: #5f7489;
  font-size: 6px;
}

.timeline-info strong {
  color: #b7c8d8;
  font-size: 8px;
}

.table-wrapper {
  margin-top: 8px;
  overflow: auto;
  background: #08131e;
  border: 1px solid #21364a;
  border-radius: 9px;
}

.timeline-scroll {
  position: relative;
  max-height: 365px;
  scrollbar-color: #315b70 #0a1722;
  scrollbar-width: thin;
  scroll-behavior: smooth;
}

.timeline-scroll::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: #0a1722;
  border-radius: 8px;
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: #315b70;
  border: 2px solid #0a1722;
  border-radius: 8px;
}

.timeline-scroll::-webkit-scrollbar-thumb:hover {
  background: #3d758c;
}

.generated-scroll {
  scrollbar-color: #65588c #0a1722;
}

.generated-scroll::-webkit-scrollbar-thumb {
  background: #65588c;
}

.generated-scroll::-webkit-scrollbar-thumb:hover {
  background: #7969a6;
}

.score-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.original-table,
.generated-table {
  min-width: 760px;
}

.score-table th {
  position: sticky;
  top: 0;
  z-index: 4;
  padding: 8px 7px;
  color: #8da2b4;
  font-size: 7px;
  text-align: center;
  background: #0b1926;
  border-bottom: 1px solid #29465d;
  box-shadow: 0 1px 0 #29465d;
}

.score-table td {
  padding: 6px;
  color: #70859a;
  font-size: 7px;
  text-align: center;
  background: #08131e;
  border-bottom: 1px solid #172a3c;
  transition:
    background 0.14s ease,
    box-shadow 0.14s ease;
}

.score-table tr.active td {
  background: rgb(34 211 238 / 10%);
  box-shadow:
    inset 0 1px 0 rgb(34 211 238 / 17%),
    inset 0 -1px 0 rgb(34 211 238 / 17%);
}

.generated-table tr.active td {
  background: rgb(167 139 250 / 10%);
  box-shadow:
    inset 0 1px 0 rgb(167 139 250 / 17%),
    inset 0 -1px 0 rgb(167 139 250 / 17%);
}

.measure-column,
.measure-cell,
.beat-column,
.beat-cell {
  width: 68px;
}

.measure-cell {
  color: #8fa5b8 !important;
  font-weight: 700;
}

.part-column {
  min-width: 135px;
}

.part-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.part-heading span {
  color: #22d3ee;
  font-size: 6px;
}

.part-heading strong {
  max-width: 150px;
  overflow: hidden;
  color: #b8c9d9;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.generated-part-heading span {
  color: #a78bfa;
}

.part-manual-count {
  margin-top: 2px;
  color: #a78bfa !important;
  font-size: 5px !important;
  font-weight: 600;
}

.original-note-cell {
  min-width: 135px;
}

.timeline-notes {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}

.timeline-note {
  position: relative;
  display: inline-flex;
  min-width: 54px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 5px 7px;
  color: #b9d8e2;
  background: #102030;
  border: 1px solid #2a4257;
  border-radius: 6px;
  cursor: pointer;
}

.timeline-note:hover:not(:disabled) {
  color: #67e8f9;
  border-color: #22d3ee;
}

.timeline-note:disabled {
  cursor: default;
  opacity: 0.55;
}

.timeline-note strong {
  color: #d6e7ef;
  font-size: 8px;
}

.timeline-note small {
  margin-top: 1px;
  color: #647f91;
  font-size: 6px;
}

.generated-note {
  border-color: rgb(167 139 250 / 23%);
}

.generated-note:hover:not(:disabled) {
  color: #ddd6fe;
  border-color: #a78bfa;
}

.generated-note.manual {
  background: rgb(167 139 250 / 9%);
  border-color: rgb(167 139 250 / 65%);
}

.generated-note.editing {
  border-color: #22d3ee;
  box-shadow: 0 0 0 1px rgb(34 211 238 / 18%);
}

.manual-note-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #c4b5fd;
  font-size: 8px;
}

.empty-note {
  color: #30495d !important;
  font-size: 9px !important;
}

.combined-playback {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 14px;
  background: radial-gradient(circle at 90% 50%, rgb(34 211 238 / 5%), transparent 34%), #0d1a27;
}

.combined-playback > header {
  min-width: 0;
}

.combined-playback > header > .q-icon {
  display: none;
}

.combined-summary {
  display: flex;
  align-items: center;
  gap: 7px;
}

.combined-summary > div {
  display: flex;
  min-width: 72px;
  flex-direction: column;
  padding: 6px 8px;
  background: #101f2e;
  border-radius: 7px;
}

.combined-summary span {
  color: #5f7489;
  font-size: 6px;
}

.combined-summary strong {
  color: #c0d0df;
  font-size: 9px;
}

.combined-summary > .q-icon {
  color: #486178;
  font-size: 14px;
}

.process-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
  margin-top: 10px;
}

.process-summary article {
  position: relative;
  display: flex;
  min-height: 83px;
  flex-direction: column;
  padding: 9px;
  background: #0d1a27;
  border: 1px solid #21364a;
  border-radius: 8px;
}

.process-summary article > .q-icon {
  color: #22d3ee;
  font-size: 18px;
}

.process-summary article > span {
  position: absolute;
  top: 7px;
  right: 8px;
  color: #405b75;
  font-size: 7px;
}

.process-summary strong {
  margin-top: 6px;
  color: #aebfd0;
  font-size: 8px;
}

.process-summary small {
  margin-top: 2px;
  color: #61758a;
  font-size: 6px;
  line-height: 1.4;
}

.empty-state {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: 13px;
  color: #526a80;
  border: 1px dashed #294054;
  border-radius: 11px;
}

.empty-state > .q-icon {
  color: #22d3ee;
  font-size: 34px;
}

.empty-state strong {
  margin-top: 7px;
  color: #8095a9;
  font-size: 10px;
}

.empty-state span {
  margin-top: 3px;
  color: #5f7489;
  font-size: 8px;
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .process-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .combined-playback {
    grid-template-columns: 1fr;
  }

  .combined-summary {
    justify-content: flex-start;
  }

  .combined-button {
    justify-self: end;
  }
}

@media (max-width: 750px) {
  .score-heading,
  .tempo-card {
    align-items: stretch;
    flex-direction: column;
  }

  .import-area {
    grid-template-columns: 1fr;
  }

  .tempo-actions {
    width: 100%;
  }

  .summary-grid,
  .timeline-info,
  .process-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .generated-header-actions {
    align-items: flex-end;
    flex-direction: column;
  }

  .timeline-scroll {
    max-height: 320px;
  }
}

@media (max-width: 520px) {
  .summary-grid,
  .timeline-info,
  .process-summary {
    grid-template-columns: 1fr;
  }

  .import-card {
    grid-template-columns: 42px 1fr;
  }

  .import-card .q-btn {
    grid-column: 1 / -1;
  }

  .combined-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .combined-summary > .q-icon {
    display: none;
  }

  .combined-button {
    width: 100%;
  }

  .timeline-scroll {
    max-height: 280px;
  }
}
</style>
