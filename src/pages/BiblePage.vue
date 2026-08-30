<template>
  <q-page>
    <ModuleWorkspace
      title="Biblia"
      description="Busca, previsualiza y agrega pasajes bíblicos al servicio."
      icon="menu_book"
    >
      <template #search>
        <div class="bible-search-panel">
          <div class="bible-search-toolbar">
            <q-input
              v-model="referenceText"
              outlined
              dense
              clearable
              placeholder="Ejemplo: Génesis 4:1-10"
              class="reference-input"
              @keyup.enter="searchPassage"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <q-btn
              unelevated
              color="primary"
              icon="search"
              aria-label="Buscar pasaje"
              class="search-button"
              :loading="searching"
              :disable="!canSearch"
              @click="searchPassage"
            >
              <q-tooltip>Buscar pasaje</q-tooltip>
            </q-btn>
          </div>

          <q-banner v-if="errorMessage" dense rounded class="error-banner">
            <template #avatar>
              <q-icon name="error_outline" color="negative" />
            </template>
            {{ errorMessage }}
          </q-banner>

          <div v-if="searching" class="panel-state">
            <q-spinner color="primary" size="34px" />
            <span>Buscando el pasaje...</span>
          </div>

          <div v-else-if="searchResult" class="search-results">
            <div class="results-heading">
              <div>
                <div class="results-title">
                  {{ searchResult.bookName }} {{ searchResult.chapter }}
                </div>
                <div class="results-count">
                  {{ searchResult.verses.length }}
                  {{ searchResult.verses.length === 1 ? 'división' : 'divisiones' }}
                </div>
              </div>

              <q-chip dense color="blue-grey-9" text-color="blue-grey-2">
                {{ searchResult.versionCode }}
              </q-chip>
            </div>

            <button
              v-for="verse in searchResult.verses"
              :key="verse.reference"
              type="button"
              class="verse-card"
              :class="{ 'verse-card--selected': selectedVerse?.reference === verse.reference }"
              @click="selectVerse(verse)"
            >
              <span class="verse-number">{{ verse.verseLabel }}</span>
              <span class="verse-content">
                <strong>{{ verse.reference }}</strong>
                <span>{{ verse.text }}</span>
              </span>
              <q-icon name="chevron_right" />
            </button>
          </div>

          <div v-else class="panel-state">
            <q-icon name="menu_book" size="44px" />
            <strong>Busca un pasaje bíblico</strong>
            <span>
              Escribe una referencia como Génesis 4:1-10, Juan 3:16 o Salmos 23.
            </span>
          </div>
        </div>
      </template>

      <template #preview>
        <div class="bible-preview-panel">
          <div class="panel-label">
            <span>Vista del operador</span>
            <q-icon name="visibility" />
          </div>

          <div class="bible-screen">
            <template v-if="selectedVerse">
              <div class="screen-reference">{{ selectedVerse.reference }}</div>
              <div class="screen-text">{{ selectedVerse.text }}</div>
              <div class="screen-version">{{ selectedVerse.versionCode }}</div>
            </template>

            <template v-else>
              <q-icon name="preview" size="46px" />
              <span>Selecciona un versículo para previsualizarlo</span>
            </template>
          </div>

          <div class="preview-actions">
            <q-btn
              outline
              no-caps
              color="primary"
              icon="playlist_add"
              label="Agregar al servicio"
              disable
            >
              <q-tooltip>Disponible cuando construyamos el servicio</q-tooltip>
            </q-btn>

            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="present_to_all"
              label="Presentar"
              :disable="!selectedVerse"
              @click="presentSelectedVerse"
            />
          </div>
        </div>
      </template>

      <template #live>
        <div class="bible-live-panel">
          <div class="panel-label">
            <div class="live-label">
              <span class="live-dot"></span>
              <span>Salida de proyección</span>
            </div>
            <q-icon name="connected_tv" />
          </div>

          <div class="bible-screen bible-screen--live">
            <template v-if="liveVerse">
              <div class="screen-reference">{{ liveVerse.reference }}</div>
              <div class="screen-text">{{ liveVerse.text }}</div>
              <div class="screen-version">{{ liveVerse.versionCode }}</div>
            </template>

            <template v-else>
              <q-icon name="live_tv" size="46px" />
              <span>Todavía no hay un versículo en vivo</span>
            </template>
          </div>

          <div class="live-actions">
            <q-btn
              flat
              round
              icon="stop_circle"
              color="negative"
              :disable="!liveVerse"
              @click="stopProjection"
            >
              <q-tooltip>Detener proyección</q-tooltip>
            </q-btn>
          </div>
        </div>
      </template>
    </ModuleWorkspace>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';
import type { BiblePassage, BibleVerse } from '../shared/bible';
const referenceText = ref('');
const searchResult = ref<BiblePassage | null>(null);
const selectedVerse = ref<BibleVerse | null>(null);
const liveVerse = ref<BibleVerse | null>(null);
const searching = ref(false);
const errorMessage = ref('');

const canSearch = computed(
  () => referenceText.value.trim().length > 0 && !searching.value,
);

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No fue posible completar la operación.';
}

async function searchPassage(): Promise<void> {
  const bibleApi = window.icpStudio?.bible;

  if (!bibleApi || !canSearch.value) {
    return;
  }

  searching.value = true;
  errorMessage.value = '';
  searchResult.value = null;
  selectedVerse.value = null;

  try {
    searchResult.value = await bibleApi.searchPassage({
      reference: referenceText.value,
    });
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    searching.value = false;
  }
}

function selectVerse(verse: BibleVerse): void {
  selectedVerse.value = verse;
}

function presentSelectedVerse(): void {
  if (!selectedVerse.value) {
    return;
  }

  liveVerse.value = selectedVerse.value;

  window.icpStudio?.projection.setState({
    mode: 'content',
    title: selectedVerse.value.reference,
    body: selectedVerse.value.text,
  });
}

function stopProjection(): void {
  liveVerse.value = null;

  window.icpStudio?.projection.setState({
    mode: 'blank',
  });
}

</script>

<style scoped>
.bible-search-panel,
.bible-preview-panel,
.bible-live-panel {
  display: flex;
  min-height: 100%;
  flex: 1;
  flex-direction: column;
}

.bible-search-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 40px;
  gap: 8px;
}

.reference-input {
  min-width: 0;
}

.reference-input :deep(.q-field__control) {
  color: #e7edf5;
  background: #0d1621;
}

.reference-input :deep(.q-field__native),
.reference-input :deep(.q-field__prepend) {
  color: #b8c3d1;
}

.search-button {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.error-banner {
  margin-top: 10px;
  color: #fecaca;
  background: rgb(127 29 29 / 24%);
  border: 1px solid rgb(248 113 113 / 25%);
  font-size: 12px;
}

.panel-state {
  display: flex;
  min-height: 220px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  color: #66758a;
  text-align: center;
  font-size: 12px;
}

.panel-state strong {
  color: #aab6c5;
  font-size: 14px;
}

.panel-state span {
  max-width: 290px;
  line-height: 1.5;
}

.search-results {
  margin-top: 14px;
}

.results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.results-title {
  color: #dfe7f1;
  font-size: 14px;
  font-weight: 700;
}

.results-count {
  margin-top: 2px;
  color: #758399;
  font-size: 10px;
}

.verse-card {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 7px;
  padding: 10px;
  color: #bdc8d6;
  background: #0d1621;
  border: 1px solid #26364b;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease;
}

.verse-card:hover,
.verse-card--selected {
  background: #12243a;
  border-color: #3b82f6;
}

.verse-number {
  display: flex;
  min-width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  background: #172d49;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.verse-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.verse-content strong {
  color: #dce6f2;
  font-size: 11px;
}

.verse-content span {
  line-height: 1.45;
  font-size: 12px;
}

.panel-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #8492a6;
  font-size: 11px;
}

.live-label {
  display: flex;
  align-items: center;
  gap: 7px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #f05252;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgb(240 82 82 / 12%);
}

.bible-screen {
  display: flex;
  aspect-ratio: 16 / 9;
  min-height: 190px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  padding: clamp(18px, 3vw, 36px);
  color: #65748a;
  background:
    radial-gradient(circle at center, rgb(35 55 79 / 55%), transparent 62%),
    #05080d;
  border: 1px solid #293649;
  border-radius: 8px;
  text-align: center;
}

.bible-screen--live {
  background: #05070d;
  border-color: #3a2b34;
}

.screen-reference {
  color: #93c5fd;
  font-size: clamp(11px, 1.2vw, 15px);
  font-weight: 700;
}

.screen-text {
  color: #f2f5f9;
  font-size: clamp(16px, 2vw, 29px);
  font-weight: 600;
  line-height: 1.3;
}

.screen-version {
  color: #77869a;
  font-size: 10px;
}

.preview-actions,
.live-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.live-actions {
  justify-content: flex-start;
}

</style>
