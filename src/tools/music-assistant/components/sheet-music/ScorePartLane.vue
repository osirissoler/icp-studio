<template>
  <section
    class="part-lane"
    :class="[
      `part-lane--${accent}`,
      {
        'part-lane--playing': effectiveActiveBeat !== null,
        'part-lane--compact': compact,
        'part-lane--interactive': interactive,
      },
    ]"
  >
    <header v-if="!compact" class="lane-heading">
      <div>
        <q-icon name="view_timeline" />

        <span>PISTA MUSICAL</span>
      </div>

      <div class="lane-stats">
        <span>
          {{ timelineNotes.length }}
          notas
        </span>

        <span>
          MIDI
          {{ minimumMidi }}–{{ maximumMidi }}
        </span>
      </div>
    </header>

    <div v-else class="compact-heading">
      <div>
        <q-icon name="view_timeline" />

        <span>PISTA</span>

        <small v-if="interactive"> · clic para corregir </small>
      </div>

      <span>
        {{ timelineNotes.length }}
        notas
      </span>
    </div>

    <div ref="scrollContainer" class="lane-scroll">
      <div class="lane-canvas" :style="canvasStyle">
        <div
          v-for="line in horizontalLines"
          :key="line"
          class="pitch-line"
          :style="pitchLineStyle(line)"
        />

        <div
          v-for="marker in measureMarkers"
          :key="marker.key"
          class="measure-marker"
          :style="measureMarkerStyle(marker.absoluteBeat)"
        >
          <span>
            {{ marker.number }}
          </span>
        </div>

        <button
          v-for="note in timelineNotes"
          :key="note.id"
          type="button"
          class="lane-note"
          :class="{
            manual: isManual(note.id),

            selected: selectedNoteId === note.id,

            clickable: interactive && !disabled,
          }"
          :style="noteStyle(note)"
          :disabled="disabled"
          tabindex="-1"
          @click="handleNoteClick(note)"
        >
          <q-icon v-if="isManual(note.id)" name="edit" class="manual-icon" />

          <span>
            {{ noteLabel(note.midi) }}
          </span>

          <q-tooltip anchor="top middle" self="bottom middle">
            {{ noteLabel(note.midi) }}
            · MIDI {{ note.midi }} · Compás {{ note.measureNumber }} · Beat
            {{ formatBeat(note.startBeat) }} · {{ formatBeat(note.durationBeats) }} tiempos

            <template v-if="isManual(note.id)"> · Corrección manual </template>

            <template v-if="interactive && !disabled"> · Clic para editar </template>
          </q-tooltip>
        </button>

        <div v-if="playheadPercent !== null" class="playhead" :style="playheadStyle">
          <span />
        </div>
      </div>
    </div>

    <footer v-if="!compact" class="lane-footer">
      <span>INICIO</span>

      <div />

      <span>
        {{ formatBeat(safeTotalBeats) }}
        tiempos
      </span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type CSSProperties } from 'vue';

import { notes } from '../../shared/music';

import type { ScoreNoteEvent, ScorePart } from '../../shared/score';

import { scorePlaybackState } from './score-playback-store';

interface LaneNote {
  id: string;

  measureNumber: number;

  startBeat: number;

  absoluteBeat: number;

  durationBeats: number;

  midi: number;
}

interface MeasureMarker {
  key: string;

  number: number;

  absoluteBeat: number;
}

const props = withDefaults(
  defineProps<{
    part: ScorePart;

    totalBeats: number;

    activeBeat?: number | null;

    accent?: 'original' | 'generated';

    compact?: boolean;

    interactive?: boolean;

    disabled?: boolean;

    selectedNoteId?: string | null;
  }>(),
  {
    activeBeat: null,
    accent: 'original',
    compact: false,
    interactive: false,
    disabled: false,
    selectedNoteId: null,
  },
);

const emit = defineEmits<{
  noteClick: [noteId: string];
}>();

const scrollContainer = ref<HTMLElement | null>(null);

const horizontalLines = [0, 1, 2, 3, 4];

const effectiveActiveBeat = computed<number | null>(() => {
  if (props.activeBeat !== null && props.activeBeat !== undefined) {
    return props.activeBeat;
  }

  if (!scorePlaybackState.playing) {
    return null;
  }

  return scorePlaybackState.activeBeat;
});

const partLastBeat = computed(() => {
  let maximum = 0;

  props.part.measures.forEach((measure) => {
    measure.events.forEach((event) => {
      maximum = Math.max(maximum, event.absoluteBeat + event.durationBeats);
    });
  });

  return maximum;
});

const safeTotalBeats = computed(() => Math.max(1, props.totalBeats, partLastBeat.value));

const timelineNotes = computed<LaneNote[]>(() => {
  const result: LaneNote[] = [];

  props.part.measures.forEach((measure) => {
    measure.events.forEach((event) => {
      if (event.type !== 'note') {
        return;
      }

      result.push(noteFromEvent(event));
    });
  });

  return result.sort(
    (left, right) => left.absoluteBeat - right.absoluteBeat || left.midi - right.midi,
  );
});

const minimumMidi = computed(() => {
  if (!timelineNotes.value.length) {
    return 60;
  }

  return Math.min(...timelineNotes.value.map((note) => note.midi));
});

const maximumMidi = computed(() => {
  if (!timelineNotes.value.length) {
    return 72;
  }

  return Math.max(...timelineNotes.value.map((note) => note.midi));
});

const paddedMinimumMidi = computed(() => minimumMidi.value - 2);

const paddedMaximumMidi = computed(() => maximumMidi.value + 2);

const pitchSpan = computed(() => Math.max(1, paddedMaximumMidi.value - paddedMinimumMidi.value));

const measureMarkers = computed<MeasureMarker[]>(() => {
  const markers: MeasureMarker[] = [];

  props.part.measures.forEach((measure) => {
    const firstEvent = measure.events.reduce<
      ScoreNoteEvent | (typeof measure.events)[number] | null
    >((earliest, event) => {
      if (!earliest) {
        return event;
      }

      return event.absoluteBeat < earliest.absoluteBeat ? event : earliest;
    }, null);

    let absoluteBeat = firstEvent?.absoluteBeat;

    if (absoluteBeat === undefined) {
      const previous = markers.at(-1);

      absoluteBeat = previous ? previous.absoluteBeat + previousMeasureBeats(previous.number) : 0;
    }

    markers.push({
      key: `${measure.number}-${absoluteBeat}`,

      number: measure.number,

      absoluteBeat,
    });
  });

  return markers;
});

const pixelsPerBeat = computed(() => (props.compact ? 22 : 30));

const canvasWidth = computed(() =>
  Math.max(props.compact ? 400 : 520, Math.round(safeTotalBeats.value * pixelsPerBeat.value)),
);

const canvasStyle = computed<CSSProperties>(() => ({
  width: `${canvasWidth.value}px`,
}));

const playheadPercent = computed<number | null>(() => {
  if (effectiveActiveBeat.value === null) {
    return null;
  }

  return beatPercent(effectiveActiveBeat.value);
});

const playheadStyle = computed<CSSProperties>(() => ({
  left: `${playheadPercent.value ?? 0}%`,
}));

watch(effectiveActiveBeat, (value) => {
  if (value === null) {
    return;
  }

  void nextTick(() => {
    centerBeat(value);
  });
});

watch(
  () => props.selectedNoteId,
  (noteId) => {
    if (!noteId) {
      return;
    }

    const note = timelineNotes.value.find((candidate) => candidate.id === noteId);

    if (!note) {
      return;
    }

    void nextTick(() => {
      centerBeat(note.absoluteBeat);
    });
  },
);

function handleNoteClick(note: LaneNote): void {
  if (!props.interactive || props.disabled) {
    return;
  }

  emit('noteClick', note.id);
}

function noteFromEvent(event: ScoreNoteEvent): LaneNote {
  return {
    id: event.id,

    measureNumber: event.measureNumber,

    startBeat: event.startBeat,

    absoluteBeat: event.absoluteBeat,

    durationBeats: event.durationBeats,

    midi: event.pitch.midi,
  };
}

function noteStyle(note: LaneNote): CSSProperties {
  const left = beatPercent(note.absoluteBeat);

  const width = Math.max(0.35, (note.durationBeats / safeTotalBeats.value) * 100);

  const verticalRange = props.compact ? 72 : 78;

  const top = ((paddedMaximumMidi.value - note.midi) / pitchSpan.value) * verticalRange;

  return {
    left: `${left}%`,

    width: `${width}%`,

    top: `${Math.max(2, Math.min(verticalRange, top))}%`,
  };
}

function pitchLineStyle(index: number): CSSProperties {
  return {
    top: `${(index / 4) * 100}%`,
  };
}

function measureMarkerStyle(absoluteBeat: number): CSSProperties {
  return {
    left: `${beatPercent(absoluteBeat)}%`,
  };
}

function beatPercent(beat: number): number {
  return Math.max(0, Math.min(100, (beat / safeTotalBeats.value) * 100));
}

function isManual(noteId: string): boolean {
  return Boolean(
    props.part.generatedManualOverrides?.some((override) => override.noteId === noteId),
  );
}

function noteLabel(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;

  const octave = Math.floor(midi / 12) - 1;

  const definition = notes.find((note) => note.value === noteIndex) ?? notes[0]!;

  return `${definition.label}${octave}`;
}

function previousMeasureBeats(measureNumber: number): number {
  return props.part.measures.find((measure) => measure.number === measureNumber)?.beats ?? 4;
}

function centerBeat(absoluteBeat: number): void {
  const container = scrollContainer.value;

  if (!container) {
    return;
  }

  const x = (absoluteBeat / safeTotalBeats.value) * canvasWidth.value;

  const desired = x - container.clientWidth / 2;

  const maximum = Math.max(0, container.scrollWidth - container.clientWidth);

  container.scrollTo({
    left: Math.min(maximum, Math.max(0, desired)),

    behavior: 'smooth',
  });
}

function formatBeat(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
</script>

<style scoped>
.part-lane {
  margin-top: 8px;
  padding: 7px;
  background: #091722;
  border: 1px solid #1d3447;
  border-radius: 7px;
}

.lane-heading,
.compact-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lane-heading {
  margin-bottom: 5px;
}

.lane-heading > div:first-child,
.compact-heading > div:first-child {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67e8f9;
}

.lane-heading .q-icon {
  font-size: 13px;
}

.compact-heading .q-icon {
  font-size: 11px;
}

.lane-heading span,
.compact-heading span {
  font-size: 5px;
  font-weight: 700;
}

.compact-heading {
  margin-bottom: 3px;
  color: #61788c;
}

.compact-heading small {
  color: #6d647f;
  font-size: 5px;
}

.lane-stats {
  display: flex;
  gap: 7px;
  color: #61788c;
  font-size: 5px;
}

.lane-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  background: #07121c;
  border: 1px solid #182c3d;
  border-radius: 5px;
  scrollbar-width: thin;
  scrollbar-color: #315b70 #07121c;
}

.lane-scroll::-webkit-scrollbar {
  height: 6px;
}

.lane-scroll::-webkit-scrollbar-track {
  background: #07121c;
}

.lane-scroll::-webkit-scrollbar-thumb {
  background: #315b70;
  border-radius: 6px;
}

.lane-canvas {
  position: relative;
  height: 92px;
  min-width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(255 255 255 / 1%), transparent);
}

.part-lane--compact {
  margin-top: 5px;
  padding: 5px;
}

.part-lane--compact .lane-canvas {
  height: 56px;
}

.part-lane--compact .lane-scroll::-webkit-scrollbar {
  height: 4px;
}

.pitch-line {
  position: absolute;
  right: 0;
  left: 0;
  height: 1px;
  background: rgb(94 128 152 / 9%);
  pointer-events: none;
}

.measure-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgb(148 163 184 / 19%);
  pointer-events: none;
}

.measure-marker span {
  position: absolute;
  top: 2px;
  left: 3px;
  color: #506779;
  font-size: 5px;
}

.lane-note {
  position: absolute;
  z-index: 2;
  height: 11px;
  min-width: 4px;
  overflow: hidden;
  padding: 0 3px;
  color: #caf5fb;
  line-height: 9px;
  text-align: left;
  white-space: nowrap;
  background: rgb(34 211 238 / 30%);
  border: 1px solid rgb(34 211 238 / 52%);
  border-radius: 3px;
  cursor: default;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    box-shadow 0.12s ease;
}

.lane-note.clickable {
  cursor: pointer;
}

.lane-note.clickable:hover {
  z-index: 4;
  border-color: #67e8f9;
  box-shadow: 0 0 0 1px rgb(34 211 238 / 22%);
}

.part-lane--compact .lane-note {
  height: 8px;
  padding: 0 2px;
  line-height: 6px;
}

.lane-note span {
  font-size: 5px;
  pointer-events: none;
}

.part-lane--compact .lane-note span {
  font-size: 4px;
}

.part-lane--generated {
  border-color: rgb(167 139 250 / 20%);
}

.part-lane--generated .compact-heading > div:first-child,
.part-lane--generated .lane-heading > div:first-child {
  color: #c4b5fd;
}

.part-lane--generated .lane-note {
  color: #ede9fe;
  background: rgb(167 139 250 / 28%);
  border-color: rgb(167 139 250 / 52%);
}

.part-lane--generated .lane-note.manual {
  color: #fff7ed;
  background: rgb(245 158 11 / 35%);
  border-color: rgb(251 191 36 / 70%);
}

.lane-note.selected {
  z-index: 4;
  border-color: #22d3ee !important;
  box-shadow: 0 0 0 2px rgb(34 211 238 / 28%);
}

.manual-icon {
  position: absolute;
  top: -1px;
  right: 0;
  color: #fde68a;
  font-size: 6px;
}

.playhead {
  position: absolute;
  z-index: 5;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #f8fafc;
  box-shadow: 0 0 6px rgb(255 255 255 / 55%);
  pointer-events: none;
}

.playhead span {
  position: absolute;
  top: 0;
  left: -3px;
  width: 7px;
  height: 7px;
  background: #f8fafc;
  border-radius: 50%;
}

.lane-footer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  color: #465e70;
  font-size: 5px;
}

.lane-footer div {
  height: 1px;
  background: #182c3d;
}
</style>
