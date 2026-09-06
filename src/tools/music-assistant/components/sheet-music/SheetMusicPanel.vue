<template>
  <section class="score-panel">
    <header class="score-heading">
      <div>
        <span class="kicker"> LEER PARTITURA </span>

        <h2>Partitura a piano y armonías</h2>

        <p>
          Conserva las voces originales, crea voces adicionales, corrige notas y analiza la
          armonización sin modificar la partitura importada.
        </p>
      </div>

      <div class="stage-chip">
        <q-icon name="library_music" />

        <div>
          <span>ETAPA ACTUAL</span>

          <strong> Mezcla + armonización </strong>
        </div>
      </div>
    </header>

    <section class="import-area">
      <div class="import-card active-import">
        <div class="import-icon">
          <q-icon name="description" />
        </div>

        <div class="import-copy">
          <span>IMPORTAR PARTITURA</span>

          <strong>MusicXML / XML</strong>

          <small> Lee partes, notas, compases, tonalidad, tempo y estructura musical. </small>
        </div>

        <q-btn
          unelevated
          no-caps
          icon="upload_file"
          label="Seleccionar archivo"
          class="primary-button"
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

      {{ parseError }}
    </div>

    <template v-if="score">
      <section class="score-summary">
        <div class="summary-title">
          <q-icon name="queue_music" />

          <div>
            <span>PARTITURA CARGADA</span>

            <strong>
              {{ score.title }}
            </strong>

            <small>
              {{ score.sourceFileName }}
            </small>
          </div>
        </div>

        <div class="summary-grid">
          <article>
            <span>Tonalidad</span>
            <strong>{{ keyLabel }}</strong>
          </article>

          <article>
            <span>Compás</span>
            <strong>
              {{ score.timeSignature.numerator }}/{{ score.timeSignature.denominator }}
            </strong>
          </article>

          <article>
            <span>Tempo</span>
            <strong>{{ score.tempo }} BPM</strong>
          </article>

          <article>
            <span>Originales</span>
            <strong>{{ originalParts.length }}</strong>
          </article>

          <article>
            <span>Generadas</span>
            <strong>{{ generatedParts.length }}</strong>
          </article>

          <article>
            <span>Duración</span>
            <strong>{{ durationLabel }}</strong>
          </article>
        </div>

        <div v-if="sessionRestored" class="session-restored">
          <q-icon name="restore" />

          Sesión anterior restaurada: voces, correcciones, mezcla y tempo.
        </div>
      </section>

      <section class="tempo-card">
        <div>
          <span>TEMPO DE REPRODUCCIÓN</span>

          <strong>{{ score.tempo }} BPM</strong>

          <small> Se guarda automáticamente para esta partitura. </small>
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

      <section v-if="originalParts.length" class="original-reference">
        <header>
          <div>
            <span>REFERENCIA ORIGINAL</span>

            <strong> Notas de la partitura </strong>

            <small> Se conservan de solo lectura. Puedes escuchar una nota individualmente. </small>
          </div>

          <div
            v-if="playbackMode === 'originals' || playbackMode === 'combined'"
            class="playing-status"
          >
            <i />

            Siguiendo reproducción
          </div>
        </header>

        <div ref="originalTimelineScroll" class="original-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Compás</th>
                <th>Beat</th>

                <th v-for="part in originalParts" :key="part.id">
                  {{ part.abbreviation || 'VOZ' }}
                  <small>
                    {{ part.name }}
                  </small>
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
                <td>
                  {{ row.measureNumber }}
                </td>

                <td>
                  {{ formatBeat(row.startBeat) }}
                </td>

                <td v-for="part in originalParts" :key="part.id">
                  <div class="original-note-list">
                    <button
                      v-for="note in notesForPart(row, part.id)"
                      :key="note.id"
                      type="button"
                      :disabled="isPlaying"
                      @click="playSingleNote(note)"
                    >
                      {{ noteLabel(note) }}
                    </button>

                    <span v-if="!notesForPart(row, part.id).length"> — </span>
                  </div>
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
        :note-editing-part-id="editingGeneratedPartId"
        :note-editing-note-id="editingGeneratedNoteId"
        @update:selected-ids="selectedGeneratedPartIds = $event"
        @play-selected="playGeneratedParts"
        @play-part="playGeneratedPart"
        @edit-note="openGeneratedNoteEditor"
        @stop="stopPlayback"
        @regenerate="handleRegenerateGeneratedPart"
        @delete="removeGeneratedPart"
      />

      <section v-if="editingGeneratedPart && editingGeneratedNote" class="note-workspace">
        <header>
          <div>
            <span>CORRECCIÓN DIRECTA</span>

            <strong>
              {{ editingGeneratedPart.name }}
              ·
              {{ noteLabel(editingGeneratedNote) }}
            </strong>

            <small> La nota seleccionada está resaltada en su pista. </small>
          </div>

          <q-icon name="edit_note" />
        </header>

        <GeneratedNoteEditor
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
        <div>
          <span>MEZCLA COMPLETA</span>

          <strong> Originales + generadas </strong>

          <small>
            {{ selectedOriginalPartIds.length }}
            originales +
            {{ selectedGeneratedPartIds.length }}
            generadas
          </small>
        </div>

        <div class="combined-actions">
          <q-btn
            unelevated
            no-caps
            icon="groups"
            :label="
              playbackMode === 'combined' ? 'Reproduciendo combinación' : 'Escuchar combinación'
            "
            class="primary-button"
            :disable="isPlaying || !combinedSelectedCount"
            @click="playCombinedParts"
          />

          <q-btn
            v-if="playbackMode === 'combined' && isPlaying"
            outline
            no-caps
            icon="stop"
            label="Detener"
            class="stop-button"
            @click="stopPlayback"
          />
        </div>
      </section>

      <HarmonyDiagnosticsPanel
        v-if="generatedParts.length"
        :score="score"
        :parts="generatedParts"
      />

      <section class="autosave-info">
        <q-icon name="save" />

        <div>
          <strong> Guardado automático </strong>

          <span>
            ICP Studio conserva para esta partitura las voces generadas, correcciones manuales,
            tempo, selección, volumen, Solo y Mute.
          </span>
        </div>
      </section>
    </template>

    <div v-else class="empty-state">
      <q-icon name="queue_music" />

      <strong> Carga una partitura para comenzar </strong>
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
  type ScorePart,
  type ScoreTimelineNote,
} from '../../shared/score';

import GeneratedNoteEditor from './GeneratedNoteEditor.vue';

import GeneratedVoiceBuilder from './GeneratedVoiceBuilder.vue';

import GeneratedVoiceManager from './GeneratedVoiceManager.vue';

import HarmonyDiagnosticsPanel from './HarmonyDiagnosticsPanel.vue';

import {
  applyGeneratedNoteOverrides,
  generatedNoteIsOverridden,
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

import {
  restoreScoreMixerSnapshot,
  scoreMixerSnapshot,
  scoreMixerState,
} from './score-mixer-store';

import { ScorePianoPlayer } from './score-piano-player';

import {
  applySavedSessionToScore,
  loadScoreSession,
  saveScoreSession,
} from './score-session-store';

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

const sessionRestored = ref(false);

const restoringSession = ref(false);

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

const originalTimelineRows = computed<TimelineRow[]>(() =>
  buildTimelineRows(originalPartTimelines.value),
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

const combinedSelectedCount = computed(
  () => selectedOriginalPartIds.value.length + selectedGeneratedPartIds.value.length,
);

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

  void nextTick(followActiveTimeline);
});

watch(
  [
    score,
    selectedOriginalPartIds,
    selectedGeneratedPartIds,
    generationSourcePartId,
    () => scoreMixerState,
  ],
  () => {
    persistCurrentSession();
  },
  {
    deep: true,
  },
);

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

    loadScore(parseMusicXml(text, file.name));
  } catch (error) {
    score.value = null;

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
  restoringSession.value = true;

  sessionRestored.value = false;

  const session = loadScoreSession(newScore);

  const resolvedScore = session ? applySavedSessionToScore(newScore, session) : newScore;

  score.value = resolvedScore;

  const originals = originalScoreParts(resolvedScore);

  const generated = generatedScoreParts(resolvedScore);

  const originalIds = new Set(originals.map((part) => part.id));

  const generatedIds = new Set(generated.map((part) => part.id));

  if (session) {
    selectedOriginalPartIds.value = session.selectedOriginalPartIds.filter((id) =>
      originalIds.has(id),
    );

    selectedGeneratedPartIds.value = session.selectedGeneratedPartIds.filter((id) =>
      generatedIds.has(id),
    );

    generationSourcePartId.value =
      session.generationSourcePartId && originalIds.has(session.generationSourcePartId)
        ? session.generationSourcePartId
        : (originals[0]?.id ?? null);

    restoreScoreMixerSnapshot(session.mixer);

    sessionRestored.value = true;
  } else {
    selectedOriginalPartIds.value = originals.map((part) => part.id);

    selectedGeneratedPartIds.value = [];

    generationSourcePartId.value = originals[0]?.id ?? null;

    restoreScoreMixerSnapshot({});
  }

  playingGeneratedPartId.value = null;

  closeGeneratedNoteEditor();

  resetTimelineScrolls();

  void nextTick(() => {
    restoringSession.value = false;

    persistCurrentSession();
  });
}

function persistCurrentSession(): void {
  if (restoringSession.value || !score.value) {
    return;
  }

  saveScoreSession(score.value, {
    selectedOriginalPartIds: selectedOriginalPartIds.value,

    selectedGeneratedPartIds: selectedGeneratedPartIds.value,

    generationSourcePartId: generationSourcePartId.value,

    mixer: scoreMixerSnapshot(score.value.parts ?? []),
  });
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

  const generatedIds = new Set(newParts.map((part) => part.id));

  const preserved = (score.value.parts ?? []).filter((part) => !generatedIds.has(part.id));

  score.value = {
    ...score.value,

    parts: [...preserved, ...newParts],
  };

  selectedGeneratedPartIds.value = Array.from(
    new Set([...selectedGeneratedPartIds.value, ...newParts.map((part) => part.id)]),
  );

  closeGeneratedNoteEditor();
}

function handleRegenerateGeneratedPart(partId: string, request: GeneratedVoiceRequest): void {
  if (!score.value) {
    return;
  }

  const current = generatedParts.value.find((part) => part.id === partId);

  if (!current) {
    return;
  }

  const source = originalParts.value.find((part) => part.id === current.generatedFromPartId);

  if (!source) {
    return;
  }

  const regenerated = generateScorePart(score.value, source, request);

  const withOverrides = applyGeneratedNoteOverrides(
    {
      ...regenerated,

      id: partId,
    },
    current.generatedManualOverrides,
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

  const updated = setGeneratedNoteOverride(
    editingGeneratedPart.value,
    editingGeneratedNote.value.id,
    midi,
  );

  score.value = {
    ...score.value,

    parts: score.value.parts?.map((part) => (part.id === partId ? updated : part)) ?? [],
  };
}

function resetGeneratedNote(): void {
  if (!score.value || !editingGeneratedPart.value || !editingGeneratedNote.value) {
    return;
  }

  const current = editingGeneratedPart.value;

  const noteId = editingGeneratedNote.value.id;

  const source = originalParts.value.find((part) => part.id === current.generatedFromPartId);

  if (!source) {
    return;
  }

  const request = generatedVoiceRequestFromPart(current);

  const remainingOverrides = withoutGeneratedNoteOverride(current.generatedManualOverrides, noteId);

  const regenerated = generateScorePart(score.value, source, request);

  const restored = applyGeneratedNoteOverrides(
    {
      ...regenerated,

      id: current.id,
    },
    remainingOverrides,
  );

  score.value = {
    ...score.value,

    parts: score.value.parts?.map((part) => (part.id === current.id ? restored : part)) ?? [],
  };

  editingGeneratedPartId.value = restored.id;

  editingGeneratedNoteId.value = noteId;
}

async function previewGeneratedMidi(midi: number): Promise<void> {
  stopPlayback();

  isPlaying.value = true;

  playbackMode.value = 'single';

  await player.playMidi(midi, 0.85);

  window.setTimeout(() => {
    if (playbackMode.value === 'single') {
      finishPlayback();
    }
  }, 970);
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
    rawKind === 'tenor' ||
    rawKind === 'baritone' ||
    rawKind === 'bass' ||
    rawKind === 'custom' ||
    rawKind === 'second'
      ? rawKind
      : 'second';

  return {
    kind,

    placement: rawPlacement === 'below' ? 'below' : 'above',
  };
}

function legacyRequestId(partId: string): string {
  return partId.replace(/^generated-/, '').replace(/[^a-zA-Z0-9-_]/g, '-');
}

function isGeneratedNoteOverridden(part: ScorePart, noteId: string): boolean {
  return generatedNoteIsOverridden(part, noteId);
}

async function playOriginalParts(): Promise<void> {
  const parts = originalParts.value.filter((part) =>
    selectedOriginalPartIds.value.includes(part.id),
  );

  await playParts(parts, 'originals');
}

async function playGeneratedParts(): Promise<void> {
  const parts = generatedParts.value.filter((part) =>
    selectedGeneratedPartIds.value.includes(part.id),
  );

  await playParts(parts, 'generated');
}

async function playGeneratedPart(partId: string): Promise<void> {
  const part = generatedParts.value.find((candidate) => candidate.id === partId);

  if (!part) {
    return;
  }

  await playParts([part], 'generated', partId);
}

async function playCombinedParts(): Promise<void> {
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

  if (playbackMode.value !== 'originals' && playbackMode.value !== 'combined') {
    return;
  }

  const key = timelinePositionKey(activeBeat.value);

  const container = originalTimelineScroll.value;

  if (!container) {
    return;
  }

  const row = container.querySelector<HTMLElement>(`[data-timeline-beat="${key}"]`);

  if (!row) {
    return;
  }

  const rowRect = row.getBoundingClientRect();

  const containerRect = container.getBoundingClientRect();

  const top =
    container.scrollTop +
    rowRect.top -
    containerRect.top -
    container.clientHeight / 2 +
    rowRect.height / 2;

  container.scrollTo({
    top: Math.max(0, top),

    behavior: 'smooth',
  });
}

function resetTimelineScrolls(): void {
  void nextTick(() => {
    if (!originalTimelineScroll.value) {
      return;
    }

    originalTimelineScroll.value.scrollTop = 0;

    originalTimelineScroll.value.scrollLeft = 0;
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

          partNotes: new Map(),
        };

        rows.set(key, row);
      }

      const partNotes = row.partNotes.get(part.id) ?? [];

      partNotes.push(note);

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
  return activeBeat.value !== null && Math.abs(activeBeat.value - absoluteBeat) < 0.0001;
}

function timelinePositionKey(absoluteBeat: number): string {
  return absoluteBeat.toFixed(6);
}

function formatBeat(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatMilliseconds(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

onBeforeUnmount(() => {
  persistCurrentSession();

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
  justify-content: space-between;
  gap: 16px;
}

.kicker,
.score-summary span,
.tempo-card span,
.original-reference header span,
.combined-playback span,
.note-workspace header span {
  color: #22d3ee;
  font-size: 7px;
  font-weight: 700;
}

.score-heading h2 {
  margin: 3px 0;
  color: #edf4fb;
  font-size: 18px;
}

.score-heading p {
  max-width: 760px;
  margin: 0;
  color: #71859a;
  font-size: 9px;
}

.stage-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  color: #a5f3fc;
  background: rgb(34 211 238 / 6%);
  border: 1px solid rgb(34 211 238 / 16%);
  border-radius: 8px;
}

.stage-chip > div,
.import-copy,
.summary-title > div,
.tempo-card > div:first-child,
.original-reference header > div:first-child,
.combined-playback > div:first-child,
.note-workspace header > div:first-child {
  display: flex;
  flex-direction: column;
}

.stage-chip span {
  color: #5c8690;
  font-size: 5px;
}

.stage-chip strong {
  font-size: 8px;
}

.import-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 13px;
}

.import-card {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #101e2c;
  border: 1px solid #293e53;
  border-radius: 9px;
}

.import-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: #22d3ee;
  background: rgb(34 211 238 / 7%);
  border-radius: 8px;
}

.import-copy span {
  color: #22d3ee;
  font-size: 6px;
}

.import-copy strong {
  color: #d8e6ef;
  font-size: 9px;
}

.import-copy small {
  color: #687d90;
  font-size: 6px;
}

.primary-button {
  color: white;
  background: #16738a;
}

.stop-button {
  color: #fda4af;
}

.error-message {
  margin-top: 8px;
  padding: 8px;
  color: #fecdd3;
  background: rgb(244 63 94 / 5%);
  border: 1px solid rgb(244 63 94 / 15%);
  border-radius: 7px;
}

.score-summary,
.tempo-card,
.original-reference,
.combined-playback,
.note-workspace,
.autosave-info {
  margin-top: 10px;
  padding: 10px;
  background: #0d1a27;
  border: 1px solid #24394d;
  border-radius: 9px;
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.summary-title .q-icon {
  color: #22d3ee;
  font-size: 20px;
}

.summary-title strong {
  color: #dce7f2;
  font-size: 10px;
}

.summary-title small {
  color: #60758b;
  font-size: 6px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
  margin-top: 8px;
}

.summary-grid article {
  display: flex;
  flex-direction: column;
  padding: 6px;
  background: #101f2e;
  border-radius: 6px;
}

.summary-grid article span {
  color: #60758a;
  font-size: 5px;
}

.summary-grid article strong {
  color: #bbcad8;
  font-size: 8px;
}

.session-restored {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 7px;
  color: #86efac;
  font-size: 6px;
}

.tempo-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tempo-card strong {
  color: #ddd6fe;
  font-size: 9px;
}

.tempo-card small {
  color: #746f8c;
  font-size: 6px;
}

.tempo-actions {
  display: flex;
  width: 330px;
  align-items: center;
  gap: 5px;
}

.tempo-actions .q-slider {
  flex: 1;
}

.original-reference header,
.note-workspace header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.original-reference header strong,
.note-workspace header strong {
  color: #c7d6e5;
  font-size: 9px;
}

.original-reference header small,
.note-workspace header small {
  color: #687c90;
  font-size: 6px;
}

.playing-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67e8f9;
  font-size: 6px;
}

.playing-status i {
  width: 6px;
  height: 6px;
  background: #22d3ee;
  border-radius: 50%;
}

.original-table-wrapper {
  max-height: 260px;
  margin-top: 8px;
  overflow: auto;
  background: #08131e;
  border: 1px solid #20364a;
  border-radius: 7px;
}

.original-table-wrapper table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}

.original-table-wrapper th {
  position: sticky;
  top: 0;
  padding: 6px;
  color: #8ca3b4;
  font-size: 6px;
  background: #0c1a27;
  border-bottom: 1px solid #29465d;
}

.original-table-wrapper th small {
  display: block;
  color: #61788c;
  font-size: 5px;
}

.original-table-wrapper td {
  padding: 5px;
  color: #778c9d;
  font-size: 6px;
  text-align: center;
  border-bottom: 1px solid #172a3b;
}

.original-table-wrapper tr.active td {
  background: rgb(34 211 238 / 8%);
}

.original-note-list {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 3px;
}

.original-note-list button {
  padding: 3px 5px;
  color: #c9e4eb;
  background: #102230;
  border: 1px solid #2b4658;
  border-radius: 4px;
  cursor: pointer;
}

.original-note-list button:disabled {
  opacity: 0.5;
}

.note-workspace {
  border-color: rgb(34 211 238 / 20%);
}

.note-workspace header > .q-icon {
  color: #67e8f9;
  font-size: 22px;
}

.combined-playback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.combined-playback strong {
  color: #c7d6e5;
  font-size: 10px;
}

.combined-playback small {
  color: #677b8e;
  font-size: 6px;
}

.combined-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.autosave-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #748a9d;
}

.autosave-info > .q-icon {
  color: #86efac;
  font-size: 20px;
}

.autosave-info > div {
  display: flex;
  flex-direction: column;
}

.autosave-info strong {
  color: #a9c7b4;
  font-size: 7px;
}

.autosave-info span {
  font-size: 6px;
}

.empty-state {
  display: grid;
  min-height: 160px;
  margin-top: 12px;
  place-items: center;
  align-content: center;
  gap: 6px;
  color: #70869a;
  border: 1px dashed #294054;
  border-radius: 10px;
}

.empty-state .q-icon {
  color: #22d3ee;
  font-size: 30px;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .import-area {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .score-heading,
  .tempo-card,
  .combined-playback {
    align-items: stretch;
    flex-direction: column;
  }

  .tempo-actions {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .combined-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
