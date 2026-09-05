<template>
  <section class="score-panel">
    <header class="score-heading">
      <div>
        <span class="kicker"> LEER PARTITURA </span>

        <h2>Partitura a piano y armonías</h2>

        <p>
          Importa MusicXML, PDF o imágenes. ICP Studio convierte la partitura a su modelo musical
          interno y genera Principal, Segunda arriba, Segunda abajo, Tenor, Barítono y Bajo.
        </p>
      </div>

      <div class="stage-chip">
        <q-icon name="library_music" />

        <div>
          <span>ETAPA ACTUAL</span>
          <strong> MusicXML + OMR experimental </strong>
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
            Lee directamente notas, compases, duraciones, silencios, tonalidad y tempo.
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

      <span>{{ parseError }}</span>
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
            <span>Compases</span>

            <strong>
              {{ score.measures.length }}
            </strong>
          </div>

          <div>
            <span>Notas</span>

            <strong>
              {{ timeline.length }}
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

          <small> Los tiempos se recalculan automáticamente cuando cambias el tempo. </small>
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

      <section class="voice-section">
        <header>
          <div>
            <span> REPRODUCCIÓN EN PIANO </span>

            <strong> Principal y cinco líneas de armonía </strong>

            <small> Todas mantienen los tiempos del modelo musical interpretado. </small>
          </div>

          <q-icon name="piano" />
        </header>

        <div class="voice-grid">
          <button
            v-for="voice in voices"
            :key="voice.id"
            type="button"
            class="voice-button"
            :class="{
              active: playingVoice === voice.id,
            }"
            :disabled="isPlaying"
            @click="playVoice(voice.id)"
          >
            <q-icon :name="voice.icon" />

            <div>
              <span>
                {{ voice.shortLabel }}
              </span>

              <strong>
                {{ voice.label }}
              </strong>
            </div>

            <q-icon name="play_arrow" class="play-icon" />
          </button>
        </div>

        <div class="playback-actions">
          <q-btn
            unelevated
            no-caps
            icon="groups"
            :label="playbackMode === 'all' ? 'Reproduciendo todas' : 'Escuchar todas'"
            class="all-button"
            :disable="isPlaying || !harmonyRows.length"
            @click="playAll"
          />

          <q-btn
            outline
            no-caps
            icon="stop"
            label="Detener"
            class="stop-button"
            :disable="!isPlaying"
            @click="stopPlayback"
          />
        </div>
      </section>

      <section class="timeline-section">
        <header>
          <div>
            <span> NOTAS Y ARMONÍAS INTERPRETADAS </span>

            <strong> Línea de tiempo musical </strong>

            <small> Cada fila representa una nota de la canción interpretada. </small>
          </div>

          <div v-if="isPlaying" class="playing-status">
            <span></span>
            Reproduciendo
          </div>
        </header>

        <div class="table-wrapper">
          <table class="score-table">
            <thead>
              <tr>
                <th>Compás</th>
                <th>Beat</th>
                <th>Duración</th>
                <th>Principal</th>
                <th>2ª ↑</th>
                <th>2ª ↓</th>
                <th>Tenor</th>
                <th>Barítono</th>
                <th>Bajo</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, index) in harmonyRows"
                :key="row.source.id"
                :class="{
                  active: activeNoteIndex === index,
                }"
              >
                <td>
                  {{ row.source.measureNumber }}
                </td>

                <td>
                  {{ formatBeat(row.source.startBeat) }}
                </td>

                <td>
                  {{ formatBeat(row.source.durationBeats) }}
                  t
                </td>

                <td v-for="voice in voices" :key="voice.id">
                  <button type="button" class="note-cell" @click="playSingle(row, voice.id)">
                    {{ voiceLabel(row, voice.id) }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="process-summary">
        <article>
          <q-icon name="description" />
          <span>1</span>
          <strong>Partitura</strong>
          <small> MusicXML u OMR se convierten al mismo modelo musical. </small>
        </article>

        <article>
          <q-icon name="schedule" />
          <span>2</span>
          <strong>Tiempo</strong>
          <small> Cada nota conserva su duración y posición. </small>
        </article>

        <article>
          <q-icon name="account_tree" />
          <span>3</span>
          <strong>Armonización</strong>
          <small> Se generan las cinco líneas adicionales. </small>
        </article>

        <article>
          <q-icon name="piano" />
          <span>4</span>
          <strong>Piano</strong>
          <small> Cada voz puede escucharse sola o en conjunto. </small>
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
import { computed, onBeforeUnmount, ref } from 'vue';

import { notes } from '../../shared/music';

import { scoreDurationMs, scoreToTimeline, type ScoreDocument } from '../../shared/score';

import OpticalScoreImporter from './optical-score/OpticalScoreImporter.vue';

import { buildScoreHarmony, type ScoreHarmonyRow, type ScoreVoiceId } from './score-harmony-engine';

import { ScorePianoPlayer } from './score-piano-player';

import { parseMusicXml } from './score-parser';

interface VoiceDefinition {
  id: ScoreVoiceId;
  label: string;
  shortLabel: string;
  icon: string;
}

const voices: VoiceDefinition[] = [
  {
    id: 'principal',
    label: 'Principal',
    shortLabel: 'P',
    icon: 'music_note',
  },
  {
    id: 'second-up',
    label: 'Segunda arriba',
    shortLabel: '2ª ↑',
    icon: 'north',
  },
  {
    id: 'second-down',
    label: 'Segunda abajo',
    shortLabel: '2ª ↓',
    icon: 'south',
  },
  {
    id: 'tenor',
    label: 'Tenor',
    shortLabel: 'T',
    icon: 'graphic_eq',
  },
  {
    id: 'baritone',
    label: 'Barítono',
    shortLabel: 'Brt',
    icon: 'equalizer',
  },
  {
    id: 'bass',
    label: 'Bajo',
    shortLabel: 'B',
    icon: 'volume_down',
  },
];

const musicXmlInput = ref<HTMLInputElement | null>(null);

const score = ref<ScoreDocument | null>(null);

const parseError = ref('');

const isPlaying = ref(false);

const activeNoteIndex = ref<number | null>(null);

const playingVoice = ref<ScoreVoiceId | null>(null);

const playbackMode = ref<'voice' | 'all' | 'single' | null>(null);

const player = new ScorePianoPlayer();

const timeline = computed(() => {
  if (!score.value) {
    return [];
  }

  return scoreToTimeline(score.value);
});

const harmonyRows = computed(() => {
  if (!score.value) {
    return [];
  }

  return buildScoreHarmony(score.value, timeline.value);
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

    score.value = parseMusicXml(text, file.name);
  } catch (error) {
    score.value = null;

    parseError.value =
      error instanceof Error ? error.message : 'No fue posible interpretar la partitura.';
  }
}

function handleOpticalScoreDetected(detectedScore: ScoreDocument): void {
  stopPlayback();

  parseError.value = '';

  score.value = detectedScore;
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

async function playVoice(voiceId: ScoreVoiceId): Promise<void> {
  if (!harmonyRows.value.length) {
    return;
  }

  isPlaying.value = true;

  playingVoice.value = voiceId;

  playbackMode.value = 'voice';

  await player.playVoice(harmonyRows.value, voiceId, {
    onNoteChange(index) {
      activeNoteIndex.value = index;
    },
    onFinish() {
      finishPlayback();
    },
  });
}

async function playAll(): Promise<void> {
  if (!harmonyRows.value.length) {
    return;
  }

  isPlaying.value = true;

  playingVoice.value = null;

  playbackMode.value = 'all';

  await player.playAll(harmonyRows.value, {
    onNoteChange(index) {
      activeNoteIndex.value = index;
    },
    onFinish() {
      finishPlayback();
    },
  });
}

async function playSingle(row: ScoreHarmonyRow, voiceId: ScoreVoiceId): Promise<void> {
  const voice = row.voices.find((candidate) => candidate.voiceId === voiceId);

  if (!voice) {
    return;
  }

  stopPlayback();

  playbackMode.value = 'single';

  await player.playSingle(
    voice.frequency,
    Math.min(1.4, Math.max(0.35, row.source.durationMs / 1000)),
  );

  playbackMode.value = null;
}

function stopPlayback(): void {
  player.stop();

  finishPlayback();
}

function finishPlayback(): void {
  isPlaying.value = false;

  activeNoteIndex.value = null;

  playingVoice.value = null;

  playbackMode.value = null;
}

function voiceLabel(row: ScoreHarmonyRow, voiceId: ScoreVoiceId): string {
  const voice = row.voices.find((candidate) => candidate.voiceId === voiceId);

  if (!voice) {
    return '—';
  }

  const definition = notes.find((note) => note.value === voice.noteIndex) ?? notes[0]!;

  return `${definition.label}${voice.octave}`;
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
.all-button {
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

.voice-section {
  margin-top: 11px;
  padding: 12px;
  background: #0d1a27;
  border: 1px solid #24394d;
  border-radius: 10px;
}

.voice-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.voice-section > header > div {
  display: flex;
  flex-direction: column;
}

.voice-section > header span {
  color: #22d3ee;
  font-size: 7px;
  font-weight: 700;
}

.voice-section > header strong {
  color: #c7d6e5;
  font-size: 10px;
}

.voice-section > header small {
  color: #65798f;
  font-size: 7px;
}

.voice-section > header > .q-icon {
  color: #22d3ee;
  font-size: 22px;
}

.voice-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-top: 9px;
}

.voice-button {
  display: grid;
  min-height: 55px;
  grid-template-columns: 22px 1fr 16px;
  align-items: center;
  gap: 5px;
  padding: 7px;
  color: #8da0b4;
  text-align: left;
  background: #122131;
  border: 1px solid #2a4056;
  border-radius: 8px;
  cursor: pointer;
}

.voice-button:hover,
.voice-button.active {
  color: #67e8f9;
  border-color: rgb(34 211 238 / 45%);
}

.voice-button:disabled {
  opacity: 0.45;
}

.voice-button > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.voice-button span {
  color: #22d3ee;
  font-size: 6px;
}

.voice-button strong {
  overflow: hidden;
  color: #dbe6f1;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.play-icon {
  font-size: 16px;
}

.playback-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 9px;
}

.stop-button {
  color: #94a8bc;
  border-radius: 8px;
}

.timeline-section {
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid #21364a;
}

.timeline-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timeline-section > header > div:first-child {
  display: flex;
  flex-direction: column;
}

.timeline-section > header span {
  color: #22d3ee;
  font-size: 7px;
  font-weight: 700;
}

.timeline-section > header strong {
  color: #b6c7d8;
  font-size: 9px;
}

.timeline-section > header small {
  color: #62778d;
  font-size: 7px;
}

.playing-status {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #67e8f9;
  font-size: 7px;
}

.playing-status > span {
  width: 6px;
  height: 6px;
  background: #22d3ee;
  border-radius: 50%;
}

.table-wrapper {
  margin-top: 8px;
  overflow-x: auto;
  background: #08131e;
  border: 1px solid #21364a;
  border-radius: 9px;
}

.score-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.score-table th {
  padding: 7px;
  color: #667b91;
  font-size: 7px;
  text-align: center;
  border-bottom: 1px solid #21364a;
}

.score-table td {
  padding: 5px;
  color: #70859a;
  font-size: 7px;
  text-align: center;
  border-bottom: 1px solid #172a3c;
}

.score-table tr.active {
  background: rgb(34 211 238 / 7%);
}

.note-cell {
  min-width: 66px;
  padding: 5px;
  color: #b9d8e2;
  background: #102030;
  border: 1px solid #263b50;
  border-radius: 6px;
  cursor: pointer;
  font-size: 8px;
  font-weight: 700;
}

.note-cell:hover {
  color: #67e8f9;
  border-color: #22d3ee;
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
  .summary-grid,
  .voice-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .process-summary {
    grid-template-columns: repeat(2, 1fr);
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
  .voice-grid,
  .process-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .summary-grid,
  .voice-grid,
  .process-summary {
    grid-template-columns: 1fr;
  }

  .import-card {
    grid-template-columns: 42px 1fr;
  }

  .import-card .q-btn {
    grid-column: 1 / -1;
  }

  .playback-actions {
    flex-direction: column;
  }
}
</style>
