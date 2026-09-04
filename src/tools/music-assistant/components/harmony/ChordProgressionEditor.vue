<template>
  <section class="progression-card">
    <div class="section-heading">
      <div>
        <span class="kicker"> 2 · ACORDES </span>

        <h3>Progresión de la canción</h3>

        <p>Construye el orden de acordes de la parte de la canción que estás preparando.</p>
      </div>

      <q-btn
        flat
        dense
        no-caps
        icon="restart_alt"
        label="Reiniciar"
        class="reset-button"
        @click="resetProgression"
      />
    </div>

    <div class="degree-grid">
      <button
        v-for="degree in 7"
        :key="degree"
        type="button"
        class="degree-button"
        @click="addDegree(degree)"
      >
        <span class="roman">
          {{ romanDegree(degree) }}
        </span>

        <strong>
          {{ getChordLabel(rootNote, scaleMode, degree) }}
        </strong>

        <small> Añadir </small>
      </button>
    </div>

    <div v-if="progression.length" class="sequence">
      <article v-for="(step, index) in progression" :key="step.id" class="sequence-item">
        <div class="sequence-index">
          {{ index + 1 }}
        </div>

        <div class="sequence-chord">
          <span>
            {{ romanDegree(step.degree) }}
          </span>

          <strong>
            {{ getChordLabel(rootNote, scaleMode, step.degree) }}
          </strong>
        </div>

        <div class="beats-control">
          <button type="button" @click="changeBeats(step.id, -1)">−</button>

          <span>
            {{ step.beats }}
            tiempos
          </span>

          <button type="button" @click="changeBeats(step.id, 1)">+</button>
        </div>

        <div class="sequence-actions">
          <q-btn
            flat
            round
            dense
            icon="arrow_back"
            :disable="index === 0"
            @click="moveStep(index, -1)"
          />

          <q-btn
            flat
            round
            dense
            icon="arrow_forward"
            :disable="index === progression.length - 1"
            @click="moveStep(index, 1)"
          />

          <q-btn
            flat
            round
            dense
            icon="delete_outline"
            class="delete-button"
            @click="removeStep(step.id)"
          />
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <q-icon name="queue_music" />

      <strong> La progresión está vacía </strong>

      <span> Pulsa uno de los siete grados para comenzar. </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getChordLabel, romanDegree, type ChordStep, type ScaleMode } from '../../shared/harmony';

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
}>();

const emit = defineEmits<{
  'update:progression': [value: ChordStep[]];
}>();

function makeId(): string {
  return [Date.now(), Math.random().toString(36).slice(2, 8)].join('-');
}

function addDegree(degree: number): void {
  emit('update:progression', [
    ...props.progression,
    {
      id: makeId(),
      degree,
      beats: 4,
    },
  ]);
}

function removeStep(id: string): void {
  emit(
    'update:progression',
    props.progression.filter((step) => step.id !== id),
  );
}

function changeBeats(id: string, delta: number): void {
  emit(
    'update:progression',
    props.progression.map((step) => {
      if (step.id !== id) {
        return step;
      }

      return {
        ...step,
        beats: Math.min(16, Math.max(1, step.beats + delta)),
      };
    }),
  );
}

function moveStep(index: number, direction: number): void {
  const target = index + direction;

  if (target < 0 || target >= props.progression.length) {
    return;
  }

  const next = [...props.progression];

  const current = next[index];

  const replacement = next[target];

  if (!current || !replacement) {
    return;
  }

  next[index] = replacement;
  next[target] = current;

  emit('update:progression', next);
}

function resetProgression(): void {
  emit('update:progression', [
    {
      id: makeId(),
      degree: 1,
      beats: 4,
    },
    {
      id: makeId(),
      degree: 4,
      beats: 4,
    },
    {
      id: makeId(),
      degree: 5,
      beats: 4,
    },
    {
      id: makeId(),
      degree: 1,
      beats: 4,
    },
  ]);
}
</script>

<style scoped>
.progression-card {
  padding: 18px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 15px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}

.kicker {
  color: #60a5fa;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

h3 {
  margin: 3px 0 4px;
  color: #edf3fa;
  font-size: 16px;
}

p {
  max-width: 520px;
  margin: 0;
  color: #718399;
  font-size: 10px;
  line-height: 1.45;
}

.reset-button {
  color: #8192a8;
}

.degree-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 7px;
  margin-top: 16px;
}

.degree-button {
  display: flex;
  min-height: 63px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #b9c7d8;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 10px;
  cursor: pointer;
}

.degree-button:hover {
  border-color: #60a5fa;
}

.degree-button .roman {
  color: #647a93;
  font-size: 8px;
}

.degree-button strong {
  margin-top: 2px;
  color: #dce7f4;
  font-size: 11px;
}

.degree-button small {
  margin-top: 2px;
  color: #536a83;
  font-size: 7px;
}

.sequence {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 16px;
}

.sequence-item {
  display: grid;
  grid-template-columns:
    30px
    minmax(90px, 1fr)
    minmax(120px, auto)
    auto;
  align-items: center;
  gap: 10px;
  padding: 8px 9px;
  background: #101d2b;
  border: 1px solid #26394e;
  border-radius: 10px;
}

.sequence-index {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  color: #8295ab;
  background: #172638;
  border-radius: 7px;
  font-size: 9px;
}

.sequence-chord {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.sequence-chord span {
  color: #667c95;
  font-size: 8px;
}

.sequence-chord strong {
  color: #e3ebf5;
  font-size: 12px;
}

.beats-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.beats-control button {
  width: 25px;
  height: 25px;
  padding: 0;
  color: #9eafc1;
  background: #172638;
  border: 1px solid #31465d;
  border-radius: 6px;
  cursor: pointer;
}

.beats-control span {
  min-width: 62px;
  color: #788ba1;
  font-size: 8px;
  text-align: center;
}

.sequence-actions {
  display: flex;
}

.sequence-actions .q-btn {
  color: #71849b;
}

.delete-button {
  color: #c47783 !important;
}

.empty-state {
  display: flex;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: 15px;
  color: #53687f;
  background: rgb(255 255 255 / 1%);
  border: 1px dashed #293c51;
  border-radius: 11px;
}

.empty-state .q-icon {
  font-size: 27px;
}

.empty-state strong {
  margin-top: 5px;
  color: #71859b;
  font-size: 10px;
}

.empty-state span {
  margin-top: 2px;
  font-size: 8px;
}

@media (max-width: 800px) {
  .degree-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .sequence-item {
    grid-template-columns: 30px 1fr;
  }

  .beats-control,
  .sequence-actions {
    grid-column: 2;
  }
}
</style>
