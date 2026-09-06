<template>
  <section class="diagnostics-panel">
    <header class="diagnostics-heading">
      <div>
        <span>DIAGNÓSTICO ARMÓNICO</span>

        <strong> Revisión de voces generadas </strong>

        <small>
          Detecta cruces, choques entre voces, saltos excesivos, notas fuera de rango y relaciones
          armónicas que conviene revisar.
        </small>
      </div>

      <q-icon name="analytics" />
    </header>

    <div class="diagnostic-toolbar">
      <q-select
        v-model="selectedPartId"
        :options="partOptions"
        emit-value
        map-options
        dense
        outlined
        dark
        options-dense
        color="cyan-4"
        label="Voz a revisar"
        class="part-select"
      />

      <q-toggle v-model="onlyIssues" dense color="cyan-4" label="Solo problemas" />
    </div>

    <template v-if="diagnostics">
      <div class="summary-grid">
        <article>
          <span>NOTAS</span>

          <strong>
            {{ diagnostics.totalNotes }}
          </strong>
        </article>

        <article
          :class="{
            warning: diagnostics.issueNotes,
          }"
        >
          <span>REVISAR</span>

          <strong>
            {{ diagnostics.issueNotes }}
          </strong>
        </article>

        <article>
          <span>EN ACORDE</span>

          <strong> {{ diagnostics.chordTonePercent }}% </strong>
        </article>

        <article
          :class="{
            warning: diagnostics.crossings,
          }"
        >
          <span>CRUCES</span>

          <strong>
            {{ diagnostics.crossings }}
          </strong>
        </article>

        <article
          :class="{
            warning: diagnostics.collisions,
          }"
        >
          <span>CHOQUES</span>

          <strong>
            {{ diagnostics.collisions }}
          </strong>
        </article>

        <article
          :class="{
            warning: diagnostics.largeLeaps,
          }"
        >
          <span>SALTOS</span>

          <strong>
            {{ diagnostics.largeLeaps }}
          </strong>
        </article>
      </div>

      <div class="diagnostic-table-wrapper">
        <table class="diagnostic-table">
          <thead>
            <tr>
              <th>Compás</th>
              <th>Beat</th>
              <th>Base</th>
              <th>Generada</th>
              <th>Intervalo</th>
              <th>Acorde</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in visibleRows"
              :key="row.id"
              :class="{
                problem: row.issues.length,
                manual: row.manual,
              }"
            >
              <td>
                {{ row.measureNumber }}
              </td>

              <td>
                {{ formatBeat(row.beat) }}
              </td>

              <td>
                {{ midiLabel(row.sourceMidi) }}
              </td>

              <td>
                <div class="generated-note-value">
                  <q-icon v-if="row.manual" name="edit" />

                  {{ midiLabel(row.generatedMidi) }}
                </div>
              </td>

              <td>
                {{ row.intervalLabel }}
              </td>

              <td>
                <span
                  class="chord-status"
                  :class="{
                    good: row.chordTone,
                  }"
                >
                  {{ row.chordTone ? 'Sí' : 'No' }}
                </span>
              </td>

              <td>
                <div v-if="row.issues.length" class="issues">
                  <span v-for="issue in row.issues" :key="issue">
                    {{ issue }}
                  </span>
                </div>

                <span v-else class="ok-status"> Correcta </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!visibleRows.length" class="no-issues">
        <q-icon name="check_circle" />

        <span> No hay problemas en este filtro. </span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { notes } from '../../shared/music';

import type { ScoreDocument, ScorePart } from '../../shared/score';

import { analyzeGeneratedVoice } from './harmony-diagnostics';

const props = defineProps<{
  score: ScoreDocument;

  parts: ScorePart[];
}>();

const selectedPartId = ref<string | null>(props.parts[0]?.id ?? null);

const onlyIssues = ref(false);

watch(
  () => props.parts,
  (parts) => {
    if (selectedPartId.value && parts.some((part) => part.id === selectedPartId.value)) {
      return;
    }

    selectedPartId.value = parts[0]?.id ?? null;
  },
  {
    deep: true,
  },
);

const partOptions = computed(() =>
  props.parts.map((part) => ({
    label: part.name,

    value: part.id,
  })),
);

const selectedPart = computed(
  () => props.parts.find((part) => part.id === selectedPartId.value) ?? null,
);

const diagnostics = computed(() => {
  if (!selectedPart.value) {
    return null;
  }

  return analyzeGeneratedVoice(props.score, selectedPart.value);
});

const visibleRows = computed(() => {
  if (!diagnostics.value) {
    return [];
  }

  const rows = onlyIssues.value
    ? diagnostics.value.rows.filter((row) => row.issues.length > 0)
    : diagnostics.value.rows;

  return rows.slice(0, 300);
});

function midiLabel(midi: number | null): string {
  if (midi === null) {
    return '--';
  }

  const noteIndex = ((midi % 12) + 12) % 12;

  const definition = notes.find((candidate) => candidate.value === noteIndex) ?? notes[0]!;

  const octave = Math.floor(midi / 12) - 1;

  return `${definition.label}${octave}`;
}

function formatBeat(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
</script>

<style scoped>
.diagnostics-panel {
  margin-top: 11px;
  padding: 11px;
  background: radial-gradient(circle at 100% 0%, rgb(34 211 238 / 6%), transparent 35%), #0d1a27;
  border: 1px solid #29475a;
  border-radius: 10px;
}

.diagnostics-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.diagnostics-heading > div {
  display: flex;
  flex-direction: column;
}

.diagnostics-heading span {
  color: #22d3ee;
  font-size: 7px;
  font-weight: 700;
}

.diagnostics-heading strong {
  color: #d2e5ee;
  font-size: 10px;
}

.diagnostics-heading small {
  max-width: 700px;
  color: #6b8192;
  font-size: 7px;
}

.diagnostics-heading > .q-icon {
  color: #67e8f9;
  font-size: 24px;
}

.diagnostic-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 9px;
}

.part-select {
  width: 280px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
  margin-top: 9px;
}

.summary-grid article {
  display: flex;
  flex-direction: column;
  padding: 7px;
  background: #101f2d;
  border: 1px solid #20384a;
  border-radius: 7px;
}

.summary-grid article.warning {
  border-color: rgb(245 158 11 / 35%);
}

.summary-grid span {
  color: #617789;
  font-size: 5px;
}

.summary-grid strong {
  color: #bfdae5;
  font-size: 9px;
}

.summary-grid .warning strong {
  color: #fcd34d;
}

.diagnostic-table-wrapper {
  max-height: 340px;
  margin-top: 8px;
  overflow: auto;
  background: #08131e;
  border: 1px solid #21384a;
  border-radius: 8px;
}

.diagnostic-table {
  width: 100%;
  border-collapse: collapse;
}

.diagnostic-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 7px;
  color: #8199ab;
  font-size: 6px;
  background: #0c1b28;
  border-bottom: 1px solid #28475c;
}

.diagnostic-table td {
  padding: 6px 7px;
  color: #8196a7;
  font-size: 7px;
  text-align: center;
  border-bottom: 1px solid #172a3a;
}

.diagnostic-table tr.problem td {
  background: rgb(245 158 11 / 3%);
}

.diagnostic-table tr.manual td {
  box-shadow: inset 2px 0 0 rgb(167 139 250 / 45%);
}

.generated-note-value {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #d8ccff;
}

.generated-note-value .q-icon {
  color: #c4b5fd;
  font-size: 9px;
}

.chord-status {
  color: #fda4af;
}

.chord-status.good {
  color: #86efac;
}

.issues {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 3px;
}

.issues span {
  padding: 2px 4px;
  color: #fbbf24;
  background: rgb(245 158 11 / 8%);
  border-radius: 4px;
  font-size: 5px;
}

.ok-status {
  color: #86efac;
}

.no-issues {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 8px;
  padding: 10px;
  color: #86efac;
  font-size: 7px;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .diagnostic-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .part-select {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
