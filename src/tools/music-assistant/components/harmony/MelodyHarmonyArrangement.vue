<template>
  <section class="harmony-result">
    <header class="result-heading">
      <div>
        <span class="kicker"> 4 · ARMONIZACIÓN DE LA MELODÍA </span>

        <h3>Movimiento de las voces</h3>

        <p>
          ICP Studio utiliza la melodía principal y el acorde asignado a cada frase para proponer
          movimientos para Segunda voz, Tenor, Barítono y Bajo.
        </p>
      </div>

      <div class="legend">
        <span
          v-for="voice in voiceLegend"
          :key="voice.id"
          :style="{
            '--voice-color': voice.color,
          }"
        >
          <i />
          {{ voice.label }}
        </span>
      </div>
    </header>

    <div class="proposal-note">
      <q-icon name="auto_awesome" />

      <div>
        <strong> Propuesta automática </strong>

        <p>
          Las voces buscan notas del acorde y procuran moverse de forma suave entre una nota y otra.
          Más adelante podremos permitir editar manualmente cada voz.
        </p>
      </div>
    </div>

    <div v-if="usablePhrases.length" class="phrases">
      <article
        v-for="phrase in usablePhrases"
        :key="phrase.phraseId"
        class="phrase-card"
        :class="{
          playing: activePhraseId === phrase.phraseId,
        }"
      >
        <header class="phrase-heading">
          <div>
            <span>
              {{ phrase.chordLabel }}
            </span>

            <strong>
              {{ phrase.title }}
            </strong>

            <small v-if="phrase.lyrics">
              {{ phrase.lyrics }}
            </small>
          </div>

          <div class="phrase-actions">
            <q-btn
              unelevated
              no-caps
              icon="groups"
              label="Todas"
              class="all-button"
              :disable="isPlaying"
              @click="playPhraseAll(phrase)"
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
        </header>

        <div class="voice-buttons">
          <button
            v-for="voice in voiceLegend"
            :key="voice.id"
            type="button"
            :style="{
              '--voice-color': voice.color,
            }"
            :disabled="isPlaying"
            @click="playPhraseVoice(phrase, voice.id)"
          >
            <q-icon name="play_arrow" />

            {{ voice.label }}
          </button>
        </div>

        <div class="harmony-table">
          <div class="table-header">
            <div>#</div>
            <div>Duración</div>

            <div v-for="voice in voiceLegend" :key="voice.id">
              {{ voice.label }}
            </div>
          </div>

          <div
            v-for="(harmonyNote, noteIndex) in phrase.notes"
            :key="harmonyNote.sourceNote.id"
            class="table-row"
            :class="{
              active: activeNoteId === harmonyNote.sourceNote.id,
            }"
          >
            <div class="index-cell">
              {{ noteIndex + 1 }}
            </div>

            <div class="duration-cell">
              {{ harmonyNote.sourceNote.beats }}
              t
            </div>

            <button
              v-for="voice in harmonyNote.voices"
              :key="voice.voiceId"
              type="button"
              class="voice-cell"
              :style="{
                '--voice-color': voice.color,
              }"
              @click="playSingleVoice(voice)"
            >
              <strong>
                {{ noteName(voice.noteIndex) }}
              </strong>

              <span>
                {{ voice.octave }}
              </span>

              <small>
                {{ voice.frequency.toFixed(1) }}
                Hz
              </small>
            </button>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <q-icon name="graphic_eq" />

      <strong> Falta melodía para armonizar </strong>

      <span> Crea al menos una frase con notas en la etapa de Melodía principal. </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import { notes } from '../../shared/music';

import {
  harmonizeMelodyPhrases,
  type ChordStep,
  type HarmonizedMelodyPhrase,
  type MelodyHarmonyVoiceNote,
  type MelodyPhrase,
  type MelodyVoiceId,
  type ScaleMode,
} from '../../shared/harmony';

const props = defineProps<{
  rootNote: number;
  scaleMode: ScaleMode;
  progression: ChordStep[];
  phrases: MelodyPhrase[];
}>();

const voiceLegend = [
  {
    id: 'principal' as MelodyVoiceId,
    label: 'Principal',
    color: '#f472b6',
  },
  {
    id: 'second' as MelodyVoiceId,
    label: 'Segunda',
    color: '#60a5fa',
  },
  {
    id: 'tenor' as MelodyVoiceId,
    label: 'Tenor',
    color: '#a78bfa',
  },
  {
    id: 'baritone' as MelodyVoiceId,
    label: 'Barítono',
    color: '#34d399',
  },
  {
    id: 'bass' as MelodyVoiceId,
    label: 'Bajo',
    color: '#fbbf24',
  },
];

const arrangement = computed(() =>
  harmonizeMelodyPhrases(props.rootNote, props.scaleMode, props.progression, props.phrases),
);

const usablePhrases = computed(() => arrangement.value.filter((phrase) => phrase.notes.length > 0));

const isPlaying = ref(false);

const activePhraseId = ref<string | null>(null);

const activeNoteId = ref<string | null>(null);

let audioContext: AudioContext | null = null;

let activeOscillators: OscillatorNode[] = [];

let activeGains: GainNode[] = [];

let timers: ReturnType<typeof setTimeout>[] = [];

function noteName(noteIndex: number): string {
  return notes.find((note) => note.value === noteIndex)?.label ?? '—';
}

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }

  return audioContext;
}

async function prepareAudio(): Promise<AudioContext> {
  const context = getAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  return context;
}

function createTone(
  context: AudioContext,
  frequency: number,
  volume: number,
  durationSeconds: number,
): void {
  const oscillator = context.createOscillator();

  const gain = context.createGain();

  oscillator.type = 'sine';

  oscillator.frequency.setValueAtTime(frequency, context.currentTime);

  gain.gain.setValueAtTime(0, context.currentTime);

  gain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.025);

  gain.gain.setValueAtTime(volume, context.currentTime + Math.max(durationSeconds - 0.06, 0.04));

  gain.gain.linearRampToValueAtTime(0, context.currentTime + durationSeconds);

  oscillator.connect(gain);

  gain.connect(context.destination);

  oscillator.start();

  oscillator.stop(context.currentTime + durationSeconds + 0.03);

  activeOscillators.push(oscillator);

  activeGains.push(gain);
}

async function playSingleVoice(voice: MelodyHarmonyVoiceNote): Promise<void> {
  stopPlayback();

  const context = await prepareAudio();

  isPlaying.value = true;

  createTone(context, voice.frequency, 0.25, 1);

  const timer = setTimeout(() => {
    stopPlayback();
  }, 1050);

  timers.push(timer);
}

async function playPhraseVoice(
  phrase: HarmonizedMelodyPhrase,
  voiceId: MelodyVoiceId,
): Promise<void> {
  stopPlayback();

  const context = await prepareAudio();

  isPlaying.value = true;

  activePhraseId.value = phrase.phraseId;

  let elapsed = 0;

  phrase.notes.forEach((item) => {
    const voice = item.voices.find((candidate) => candidate.voiceId === voiceId);

    if (!voice) {
      return;
    }

    const durationMs = item.sourceNote.beats * 420;

    const timer = setTimeout(() => {
      activeNoteId.value = item.sourceNote.id;

      createTone(context, voice.frequency, 0.24, durationMs / 1000);
    }, elapsed);

    timers.push(timer);

    elapsed += durationMs;
  });

  const finish = setTimeout(() => {
    stopPlayback();
  }, elapsed + 100);

  timers.push(finish);
}

async function playPhraseAll(phrase: HarmonizedMelodyPhrase): Promise<void> {
  stopPlayback();

  const context = await prepareAudio();

  isPlaying.value = true;

  activePhraseId.value = phrase.phraseId;

  let elapsed = 0;

  phrase.notes.forEach((item) => {
    const durationMs = item.sourceNote.beats * 420;

    const timer = setTimeout(() => {
      activeNoteId.value = item.sourceNote.id;

      item.voices.forEach((voice) => {
        createTone(context, voice.frequency, 0.065, durationMs / 1000);
      });
    }, elapsed);

    timers.push(timer);

    elapsed += durationMs;
  });

  const finish = setTimeout(() => {
    stopPlayback();
  }, elapsed + 100);

  timers.push(finish);
}

function stopPlayback(): void {
  timers.forEach((timer) => clearTimeout(timer));

  timers = [];

  if (audioContext) {
    const now = audioContext.currentTime;

    activeGains.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);

        gain.gain.setValueAtTime(gain.gain.value, now);

        gain.gain.linearRampToValueAtTime(0, now + 0.03);
      } catch {
        // Nodo terminado.
      }
    });

    activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop(now + 0.04);
      } catch {
        // Oscilador terminado.
      }
    });
  }

  activeOscillators = [];
  activeGains = [];

  activePhraseId.value = null;

  activeNoteId.value = null;

  isPlaying.value = false;
}

onBeforeUnmount(() => {
  stopPlayback();

  if (audioContext) {
    void audioContext.close();

    audioContext = null;
  }
});
</script>

<style scoped>
.harmony-result {
  padding: 18px;
  background: #0d1825;
  border: 1px solid #213247;
  border-radius: 15px;
}

.result-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.kicker {
  color: #a78bfa;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

h3 {
  margin: 3px 0 4px;
  color: #edf3fa;
  font-size: 16px;
}

.result-heading p {
  max-width: 600px;
  margin: 0;
  color: #718399;
  font-size: 10px;
  line-height: 1.45;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.legend span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #7a8da3;
  font-size: 7px;
}

.legend i {
  width: 7px;
  height: 7px;
  background: var(--voice-color);
  border-radius: 50%;
}

.proposal-note {
  display: flex;
  gap: 9px;
  margin-top: 13px;
  padding: 10px 12px;
  background: rgb(167 139 250 / 5%);
  border: 1px solid rgb(167 139 250 / 14%);
  border-radius: 9px;
}

.proposal-note > .q-icon {
  color: #a78bfa;
  font-size: 18px;
}

.proposal-note strong {
  color: #b9afd7;
  font-size: 8px;
}

.proposal-note p {
  margin: 1px 0 0;
  color: #746d88;
  font-size: 7px;
  line-height: 1.4;
}

.phrases {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 13px;
}

.phrase-card {
  overflow: hidden;
  background: #101d2b;
  border: 1px solid #293d53;
  border-radius: 11px;
}

.phrase-card.playing {
  border-color: rgb(167 139 250 / 60%);
}

.phrase-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #26394e;
}

.phrase-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.phrase-heading span {
  color: #8c7fc1;
  font-size: 7px;
  text-transform: uppercase;
}

.phrase-heading strong {
  color: #dce6f2;
  font-size: 11px;
}

.phrase-heading small {
  margin-top: 2px;
  max-width: 600px;
  overflow: hidden;
  color: #667a91;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phrase-actions {
  display: flex;
  gap: 6px;
}

.all-button {
  color: white;
  background: #6d55c7;
  border-radius: 8px;
  font-size: 8px;
}

.stop-button {
  color: #8c9bad;
  border-radius: 8px;
  font-size: 8px;
}

.voice-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px 10px;
  background: rgb(255 255 255 / 1%);
}

.voice-buttons button {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 7px;
  color: var(--voice-color);
  background: #122131;
  border: 1px solid #2a3e53;
  border-radius: 7px;
  cursor: pointer;
  font-size: 7px;
}

.voice-buttons button:disabled {
  opacity: 0.4;
}

.harmony-table {
  padding: 8px 10px 10px;
  overflow-x: auto;
}

.table-header,
.table-row {
  display: grid;
  min-width: 700px;
  grid-template-columns:
    32px
    58px
    repeat(5, minmax(100px, 1fr));
}

.table-header {
  color: #61758c;
  font-size: 7px;
  text-transform: uppercase;
}

.table-header > div {
  padding: 5px 6px;
}

.table-row {
  margin-top: 4px;
  background: #0c1723;
  border: 1px solid #24384c;
  border-radius: 8px;
}

.table-row.active {
  border-color: #a78bfa;
}

.index-cell,
.duration-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60748b;
  font-size: 7px;
  border-right: 1px solid #24384c;
}

.voice-cell {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  padding: 8px 5px;
  background: transparent;
  border: 0;
  border-right: 1px solid #24384c;
  cursor: pointer;
}

.voice-cell:last-child {
  border-right: 0;
}

.voice-cell:hover {
  background: rgb(255 255 255 / 3%);
}

.voice-cell strong {
  color: var(--voice-color);
  font-size: 11px;
}

.voice-cell span {
  color: #8a9caf;
  font-size: 8px;
}

.voice-cell small {
  margin-left: 4px;
  color: #566b82;
  font-size: 6px;
}

.empty-state {
  display: flex;
  min-height: 135px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: 13px;
  color: #53687f;
  border: 1px dashed #293d53;
  border-radius: 10px;
}

.empty-state .q-icon {
  font-size: 27px;
}

.empty-state strong {
  margin-top: 5px;
  color: #74889d;
  font-size: 9px;
}

.empty-state span {
  margin-top: 2px;
  font-size: 7px;
}

@media (max-width: 750px) {
  .result-heading,
  .phrase-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .legend {
    justify-content: flex-start;
  }

  .phrase-actions {
    align-self: flex-start;
  }
}
</style>
