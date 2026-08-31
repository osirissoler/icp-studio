<template>
  <q-page>
    <ModuleWorkspace
      title="Biblia"
      description="Busca, previsualiza y agrega pasajes bíblicos al servicio."
      icon="menu_book"
    >
      <template #search>
        <div class="bible-search-panel">
          <div class="search-controls">
            <q-tabs
              v-model="searchMode"
              dense
              no-caps
              align="left"
              active-color="primary"
              indicator-color="primary"
              class="search-tabs"
            >
              <q-tab name="reference" icon="search" label="Referencia" />
              <q-tab name="manual" icon="touch_app" label="Manual" />
            </q-tabs>

            <div v-if="searchMode === 'reference'" class="bible-search-toolbar">
              <div class="reference-field">
                <q-input
                  ref="referenceInput"
                  :model-value="referenceText"
                  outlined
                  dense
                  clearable
                  placeholder="Ejemplo: Mateo 4:1-10"
                  class="dark-field"
                  @update:model-value="updateReferenceText"
                  @clear="clearReferenceSearch"
                  @focus="showBookSuggestions = true"
                  @blur="hideBookSuggestions"
                  @keyup.enter="searchReference"
                >
                  <template #prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>

                <div v-if="shouldShowBookSuggestions" class="book-suggestions">
                  <button
                    v-for="book in suggestedBooks"
                    :key="book.code"
                    type="button"
                    class="book-suggestion"
                    @mousedown.prevent="selectBookSuggestion(book)"
                  >
                    <q-icon name="menu_book" />
                    <span>{{ shortBookName(book.displayName) }}</span>
                    <small>{{ book.displayName }}</small>
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="manual-search">
              <div class="manual-fields">
                <q-select
                  v-model="manualBookCode"
                  :options="bookOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  options-dense
                  label="Libro"
                  class="dark-field"
                  @update:model-value="onManualBookChange"
                />

                <q-select
                  v-model="manualChapter"
                  :options="manualChapters"
                  outlined
                  dense
                  options-dense
                  label="Capítulo"
                  class="dark-field"
                  :disable="!manualBookCode || loadingManualData"
                  @update:model-value="onManualChapterChange"
                />

                <q-select
                  v-model="manualVerseStart"
                  :options="manualVerseStartOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  options-dense
                  label="Desde"
                  class="dark-field"
                  :disable="manualVerseStartOptions.length === 0"
                  @update:model-value="onManualVerseStartChange"
                />

                <q-select
                  v-model="manualVerseEnd"
                  :options="manualVerseEndOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  options-dense
                  label="Hasta"
                  class="dark-field"
                  :disable="manualVerseEndOptions.length === 0"
                />
              </div>

              <div class="manual-actions">
                <q-btn
                  unelevated
                  color="primary"
                  icon="search"
                  aria-label="Buscar selección manual"
                  class="toolbar-button"
                  :loading="searching || loadingManualData"
                  :disable="!canSearchManual"
                  @click="searchManualPassage"
                >
                  <q-tooltip>Buscar pasaje seleccionado</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>

          <q-banner v-if="errorMessage" dense rounded class="error-banner">
            <template #avatar>
              <q-icon name="error_outline" color="negative" />
            </template>
            {{ errorMessage }}
          </q-banner>

          <div
            v-if="!searchResult && activeVersionName"
            class="results-heading idle-version-heading"
          >
            <div aria-hidden="true"></div>
            <div class="active-version-summary">
              <span>Versión bíblica</span>
              <strong>{{ activeVersionName }}</strong>
            </div>
          </div>

          <div v-if="searching" class="panel-state">
            <q-spinner color="primary" size="34px" />
            <span>Buscando el pasaje...</span>
          </div>

          <div
            v-else-if="searchResult"
            ref="resultsElement"
            class="search-results"
            tabindex="0"
            @keydown.up.prevent="moveResultSelection(-1)"
            @keydown.down.prevent="moveResultSelection(1)"
          >
            <div class="results-heading">
              <div>
                <div class="results-title">
                  {{ searchResult.bookName }} {{ searchResult.chapter }}
                </div>
                <div class="results-count">
                  {{ searchResult.verses.length }}
                  {{ searchResult.verses.length === 1 ? 'división' : 'divisiones' }}
                  · {{ selectedVerses.length }} seleccionados
                </div>
              </div>

              <div class="active-version-summary">
                <span>Versión bíblica</span>
                <strong>{{ activeVersionName }}</strong>
              </div>
            </div>

            <div class="results-actions">
              <q-checkbox
                :model-value="allResultsSelected"
                dense
                label="Todos"
                color="primary"
                @update:model-value="toggleAllResults(Boolean($event))"
              />

              <q-btn
                flat
                round
                dense
                size="xs"
                color="green-4"
                icon="playlist_add"
                aria-label="Agregar seleccionados al servicio"
                class="result-action-button"
                :disable="selectedVerses.length === 0"
                @click="addSelectedToService"
              >
                <q-tooltip>Agregar seleccionados al servicio</q-tooltip>
              </q-btn>

              <q-btn
                flat
                round
                dense
                size="xs"
                color="deep-purple-3"
                icon="present_to_all"
                aria-label="Proyectar seleccionados ahora"
                class="result-action-button"
                :disable="selectedVerses.length === 0"
                @click="projectSelectedNow"
              >
                <q-tooltip>Agregar al servicio y proyectar ahora</q-tooltip>
              </q-btn>

              <q-btn
                flat
                round
                dense
                size="xs"
                color="red-4"
                icon="delete_sweep"
                aria-label="Eliminar versículos seleccionados"
                class="result-action-button"
                :disable="selectedVerses.length === 0"
                @click="removeSelectedResults"
              >
                <q-tooltip>Eliminar de la lista los versículos seleccionados</q-tooltip>
              </q-btn>
            </div>

            <button
              v-for="(verse, verseIndex) in searchResult.verses"
              :key="verseKey(verse)"
              :data-result-index="verseIndex"
              type="button"
              class="verse-card"
              :class="{
                'verse-card--selected':
                  selectedVerse && verseKey(selectedVerse) === verseKey(verse),
              }"
              @click="selectVerse(verse)"
              @dblclick="addSingleVerseToService(verse)"
            >
              <q-checkbox
                :model-value="isVerseSelected(verse)"
                dense
                color="primary"
                class="verse-checkbox"
                @click.stop
                @update:model-value="toggleVerseSelection(verse, Boolean($event))"
              />
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
              Usa una referencia escrita o selecciona el libro, capítulo y versículos manualmente.
            </span>
          </div>
        </div>
      </template>

      <template #service>
        <div class="bible-service-panel">
          <div class="panel-label">
            <span>Orden del servicio</span>
            <q-chip dense color="blue-grey-9" text-color="blue-grey-2">
              {{ serviceItems.length }}
            </q-chip>
          </div>

          <div v-if="serviceItems.length" class="service-list">
            <button
              v-for="(item, index) in serviceItems"
              :key="item.id"
              type="button"
              class="service-item"
              :class="{
                'service-item--active': selectedServiceItemId === item.id,
              }"
              @click="selectServiceItem(item)"
              @dblclick="activateServiceItem(item)"
            >
              <span class="service-position">{{ index + 1 }}</span>
              <span class="service-item-content">
                <strong>{{ item.title }}</strong>
              </span>
              <q-icon name="menu_book" size="16px" color="blue-grey-5">
                <q-tooltip>
                  {{ item.verses.length }}
                  {{ item.verses.length === 1 ? 'versículo' : 'versículos' }}
                </q-tooltip>
              </q-icon>
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="close"
                aria-label="Quitar del servicio"
                @click.stop="removeServiceItem(item.id)"
                @dblclick.stop
              >
                <q-tooltip>Quitar del servicio</q-tooltip>
              </q-btn>
            </button>
          </div>

          <div v-else class="panel-state service-empty">
            <q-icon name="playlist_add" size="40px" />
            <strong>Servicio vacío</strong>
            <span>Agrega pasajes con el botón del buscador.</span>
          </div>
        </div>
      </template>

      <template #preview>
        <div class="bible-preview-panel">
          <div class="panel-label">
            <span>Vista del operador</span>
            <q-icon name="visibility" />
          </div>

          <div class="bible-screen" :style="[surfaceStyle, contentLayoutStyle]">
            <template v-if="selectedVerse">
              <div class="screen-reference">{{ selectedVerse.reference }}</div>
              <FittedTechnicalText
                class="screen-fitted-text"
                :text="selectedVerse.text"
                :min-size="9"
                :max-size="29"
              />
              <div class="screen-version">{{ selectedVerse.versionCode }}</div>
            </template>

            <template v-else>
              <q-icon name="preview" size="46px" />
              <span>Selecciona un versículo para previsualizarlo</span>
            </template>
          </div>

          <div v-if="(searchResult?.verses.length ?? 0) > 1" class="preview-navigation">
            <q-btn flat round dense icon="chevron_left" @click="movePreview(-1)">
              <q-tooltip>Versículo anterior en previsualización</q-tooltip>
            </q-btn>
            <span>{{ previewPosition }} de {{ searchResult?.verses.length ?? 0 }}</span>
            <q-btn flat round dense icon="chevron_right" @click="movePreview(1)">
              <q-tooltip>Versículo siguiente en previsualización</q-tooltip>
            </q-btn>
          </div>

          <div class="preview-actions">
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
        <div
          ref="livePanelElement"
          class="bible-live-panel"
          tabindex="0"
          @keydown.up.prevent="moveLiveVerse(-1)"
          @keydown.down.prevent="moveLiveVerse(1)"
        >
          <template v-for="(section, sectionIndex) in liveSections" :key="section">
            <section
              class="live-section"
              :class="{ 'live-section--dragging': draggingLiveSection === section }"
              :style="{ flexGrow: liveSectionSizes[section] }"
              @dragover.prevent
              @drop="dropLiveSection(section)"
            >
              <header
                class="live-section-header"
                draggable="true"
                @dragstart="startLiveSectionDrag($event, section)"
                @dragend="stopLiveSectionDrag"
              >
                <div class="live-section-heading">
                  <q-icon name="drag_indicator" />
                  <span>
                    {{ section === 'screen' ? 'Pantalla en vivo' : 'Contenido del pasaje' }}
                  </span>
                </div>

                <div v-if="section === 'screen'" class="live-output-label">
                  <span class="live-dot"></span>
                  <span>Salida de proyección</span>
                  <q-icon name="connected_tv" />
                </div>

                <div v-else class="live-content-actions">
                  <span v-if="liveServiceItem && liveVerse" class="live-position">
                    {{ liveVersePosition }} de {{ liveServiceItem.verses.length }}
                  </span>
                  <q-btn
                    flat
                    round
                    dense
                    size="xs"
                    icon="delete_sweep"
                    color="red-4"
                    :disable="!liveServiceItem && !liveVerse"
                    @click.stop="clearLiveArea"
                  >
                    <q-tooltip>Limpiar todo el contenido en vivo</q-tooltip>
                  </q-btn>
                </div>
              </header>

              <template v-if="section === 'screen'">
                <div
                  class="bible-screen bible-screen--live"
                  :style="[surfaceStyle, contentLayoutStyle]"
                >
                  <template v-if="liveVerse">
                    <FittedTechnicalText
                      class="screen-fitted-text"
                      :text="liveVerse.text"
                      :min-size="9"
                      :max-size="29"
                    />
                    <div v-if="liveServiceItem" class="screen-passage-reference">
                      {{ liveServiceItem.projectionReference }}
                    </div>
                  </template>

                  <template v-else>
                    <q-icon name="live_tv" size="46px" />
                    <span>Haz doble clic en un elemento del servicio</span>
                  </template>
                </div>
              </template>

              <template v-else>
                <div v-if="liveServiceItem" class="live-verse-list">
                  <div class="live-service-title">{{ liveServiceItem.title }}</div>
                  <button
                    v-for="verse in liveServiceItem.verses"
                    :key="verseKey(verse)"
                    type="button"
                    class="live-verse-item"
                    :class="{
                      'live-verse-item--active':
                        liveVerse && verseKey(liveVerse) === verseKey(verse),
                    }"
                    @click="setLiveVerse(verse)"
                  >
                    <span class="verse-number">{{ verse.verseLabel }}</span>
                    <span>{{ verse.text }}</span>
                  </button>
                </div>

                <div v-else class="live-content-empty">
                  El contenido del servicio aparecerá aquí.
                </div>
              </template>
            </section>

            <div
              v-if="sectionIndex === 0"
              class="live-section-resizer"
              title="Arrastra para cambiar la altura"
              @pointerdown="startLiveSectionResize"
            >
              <span></span>
            </div>
          </template>
        </div>
      </template>
    </ModuleWorkspace>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import FittedTechnicalText from '../components/FittedTechnicalText.vue';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';
import { usePresentationStore } from '../stores/presentation-store';
import { useProjectionSettingsStore } from '../stores/projection-settings';
import type { BibleBook, BiblePassage, BibleVersion, BibleVerse } from '../shared/bible';
import { getPreferredBibleVersion } from '../services/bible-settings';

const presentationStore = usePresentationStore();
const projectionSettings = useProjectionSettingsStore();
const { surfaceStyle, contentLayoutStyle } = storeToRefs(projectionSettings);

type SearchMode = 'reference' | 'manual';
type LiveSectionId = 'screen' | 'content';

interface FocusableInput {
  focus: () => void;
}

interface SelectOption<T> {
  label: string;
  value: T;
}

interface BibleServiceItem {
  id: string;
  type: 'bible';
  title: string;
  projectionReference: string;
  versionCode: string;
  verses: BibleVerse[];
}

const books = ref<BibleBook[]>([]);
const bibleVersions = ref<BibleVersion[]>([]);
const preferredVersionCode = ref<string | null>(null);
const referenceInput = ref<FocusableInput | null>(null);
const resultsElement = ref<HTMLElement | null>(null);
const referenceText = ref('');
const searchMode = ref<SearchMode>('reference');
const searchResult = ref<BiblePassage | null>(null);
const selectedVerse = ref<BibleVerse | null>(null);
const selectedVerses = ref<BibleVerse[]>([]);
const serviceItems = ref<BibleServiceItem[]>([]);
const selectedServiceItemId = ref<string | null>(null);
const liveServiceItem = ref<BibleServiceItem | null>(null);
const liveVerse = ref<BibleVerse | null>(null);
const livePanelElement = ref<HTMLElement | null>(null);
const liveSections = ref<LiveSectionId[]>(['screen', 'content']);
const liveSectionSizes = reactive<Record<LiveSectionId, number>>({
  screen: 1,
  content: 1,
});
const draggingLiveSection = ref<LiveSectionId | null>(null);
let stopLiveResize: (() => void) | null = null;
const showBookSuggestions = ref(false);
const searching = ref(false);
const loadingManualData = ref(false);
const errorMessage = ref('');
let unsubscribePreferredVersion: (() => void) | undefined;

const manualBookCode = ref<string | null>(null);
const manualChapter = ref<number | null>(null);
const manualChapters = ref<number[]>([]);
const manualChapterPassage = ref<BiblePassage | null>(null);
const manualVerseStart = ref<number | null>(null);
const manualVerseEnd = ref<number | null>(null);

const canSearchReference = computed(
  () => referenceText.value.trim().length > 0 && !searching.value,
);

const canSearchManual = computed(
  () =>
    manualBookCode.value !== null &&
    manualChapter.value !== null &&
    manualVerseStart.value !== null &&
    manualVerseEnd.value !== null &&
    !searching.value &&
    !loadingManualData.value,
);

const bookOptions = computed<SelectOption<string>[]>(() =>
  books.value.map((book) => ({
    label: shortBookName(book.displayName),
    value: book.code,
  })),
);

const manualVerseStartOptions = computed<SelectOption<number>[]>(() =>
  (manualChapterPassage.value?.verses ?? []).map((verse) => ({
    label: verse.verseLabel,
    value: verse.verseStart,
  })),
);

const manualVerseEndOptions = computed<SelectOption<number>[]>(() =>
  (manualChapterPassage.value?.verses ?? [])
    .filter((verse) => manualVerseStart.value === null || verse.verseEnd >= manualVerseStart.value)
    .map((verse) => ({
      label: verse.verseLabel,
      value: verse.verseEnd,
    })),
);

const normalizedBookTerm = computed(() => {
  const value = referenceText.value.trim();

  if (!value || /\s\d/.test(value)) {
    return '';
  }

  return normalizeText(value);
});

const suggestedBooks = computed(() => {
  const term = normalizedBookTerm.value;

  if (!term) {
    return [];
  }

  return books.value
    .filter((book) => {
      const completeName = normalizeText(book.displayName);
      const shortName = normalizeText(shortBookName(book.displayName));
      const abbreviation = normalizeText(book.abbreviation);

      return completeName.includes(term) || shortName.includes(term) || abbreviation.includes(term);
    })
    .sort((first, second) => {
      const firstStarts = normalizeText(shortBookName(first.displayName)).startsWith(term);
      const secondStarts = normalizeText(shortBookName(second.displayName)).startsWith(term);

      return Number(secondStarts) - Number(firstStarts);
    })
    .slice(0, 10);
});

const shouldShowBookSuggestions = computed(
  () => showBookSuggestions.value && suggestedBooks.value.length > 0,
);

const allResultsSelected = computed(() => {
  const verses = searchResult.value?.verses ?? [];

  return verses.length > 0 && verses.every((verse) => isVerseSelected(verse));
});

const activeVersionName = computed(() => {
  const versionCode = searchResult.value?.versionCode ?? preferredVersionCode.value;
  return (
    bibleVersions.value.find((version) => version.code === versionCode)?.name ?? versionCode ?? ''
  );
});

const liveVersePosition = computed(() => {
  const item = liveServiceItem.value;
  const verse = liveVerse.value;

  if (!item || !verse) {
    return 0;
  }

  const index = item.verses.findIndex((itemVerse) => verseKey(itemVerse) === verseKey(verse));

  return index >= 0 ? index + 1 : 0;
});

const previewPosition = computed(() => {
  const currentVerse = selectedVerse.value;

  if (!currentVerse) {
    return 0;
  }

  const index = (searchResult.value?.verses ?? []).findIndex(
    (verse) => verseKey(verse) === verseKey(currentVerse),
  );

  return index >= 0 ? index + 1 : 0;
});

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(?:primera|primero|primer|1ra|1ro)\b/g, '1')
    .replace(/\b(?:segunda|segundo|2da|2do)\b/g, '2')
    .replace(/\b(?:tercera|tercero|3ra|3ro)\b/g, '3')
    .replace(/\bde\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortBookName(value: string): string {
  return value.replace(/^San\s+/i, '');
}

function verseKey(verse: BibleVerse): string {
  return [verse.versionCode, verse.bookCode, verse.chapter, verse.verseLabel].join(':');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}

async function loadBooks(requestedVersionCode?: string): Promise<void> {
  const bibleApi = window.icpStudio?.bible;

  if (!bibleApi) {
    errorMessage.value =
      'El módulo Biblia solamente está disponible en la aplicación de escritorio.';
    return;
  }

  try {
    bibleVersions.value = await bibleApi.getVersions();
    preferredVersionCode.value =
      requestedVersionCode &&
      bibleVersions.value.some((version) => version.code === requestedVersionCode)
        ? requestedVersionCode
        : getPreferredBibleVersion(bibleVersions.value);
    books.value = await bibleApi.getBooks({
      ...(preferredVersionCode.value ? { versionCode: preferredVersionCode.value } : {}),
    });
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function applyPreferredVersion(versionCode: string): Promise<void> {
  const currentPassage = searchResult.value;
  await loadBooks(versionCode);

  manualBookCode.value = null;
  manualChapter.value = null;
  manualChapters.value = [];
  manualChapterPassage.value = null;
  manualVerseStart.value = null;
  manualVerseEnd.value = null;

  if (!currentPassage) return;

  const verseRange =
    currentPassage.verseStart === null
      ? ''
      : currentPassage.verseStart === currentPassage.verseEnd
        ? `:${currentPassage.verseStart}`
        : `:${currentPassage.verseStart}-${currentPassage.verseEnd}`;

  await executeSearch(`${currentPassage.bookName} ${currentPassage.chapter}${verseRange}`);
}

function updateReferenceText(value: string | number | null): void {
  referenceText.value = typeof value === 'string' || typeof value === 'number' ? String(value) : '';

  showBookSuggestions.value = true;
}

function clearReferenceSearch(): void {
  referenceText.value = '';
  errorMessage.value = '';
  showBookSuggestions.value = true;

  void nextTick(() => {
    referenceInput.value?.focus();
  });
}

function hideBookSuggestions(): void {
  window.setTimeout(() => {
    showBookSuggestions.value = false;
  }, 120);
}

function selectBookSuggestion(book: BibleBook): void {
  referenceText.value = `${shortBookName(book.displayName)} `;
  showBookSuggestions.value = false;

  void nextTick(() => {
    referenceInput.value?.focus();
  });
}

async function executeSearch(reference: string): Promise<void> {
  const bibleApi = window.icpStudio?.bible;

  if (!bibleApi) {
    return;
  }

  showBookSuggestions.value = false;
  searching.value = true;
  errorMessage.value = '';
  searchResult.value = null;
  selectedVerse.value = null;
  selectedVerses.value = [];

  try {
    const result = await bibleApi.searchPassage({
      reference,
      ...(preferredVersionCode.value ? { versionCode: preferredVersionCode.value } : {}),
    });

    searchResult.value = result;
    selectedVerses.value = [...result.verses];
    selectedVerse.value = result.verses[0] ?? null;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    searching.value = false;
  }

  if (searchResult.value) {
    await nextTick();
    resultsElement.value?.focus();
  }
}

function searchReference(): void {
  if (!canSearchReference.value) {
    return;
  }

  void executeSearch(referenceText.value);
}

async function onManualBookChange(bookCode: string | null): Promise<void> {
  manualChapter.value = null;
  manualChapters.value = [];
  manualChapterPassage.value = null;
  manualVerseStart.value = null;
  manualVerseEnd.value = null;

  if (!bookCode) {
    return;
  }

  const bibleApi = window.icpStudio?.bible;

  if (!bibleApi) {
    return;
  }

  loadingManualData.value = true;
  errorMessage.value = '';

  try {
    manualChapters.value = await bibleApi.getBookChapters({
      bookCode,
      ...(preferredVersionCode.value ? { versionCode: preferredVersionCode.value } : {}),
    });
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loadingManualData.value = false;
  }
}

async function onManualChapterChange(chapter: number | null): Promise<void> {
  manualChapterPassage.value = null;
  manualVerseStart.value = null;
  manualVerseEnd.value = null;

  if (!chapter || !manualBookCode.value) {
    return;
  }

  const book = books.value.find((bookItem) => bookItem.code === manualBookCode.value);

  const bibleApi = window.icpStudio?.bible;

  if (!book || !bibleApi) {
    return;
  }

  loadingManualData.value = true;
  errorMessage.value = '';

  try {
    const passage = await bibleApi.searchPassage({
      reference: `${book.displayName} ${chapter}`,
      ...(preferredVersionCode.value ? { versionCode: preferredVersionCode.value } : {}),
    });

    manualChapterPassage.value = passage;
    manualVerseStart.value = passage.verses[0]?.verseStart ?? null;
    manualVerseEnd.value = passage.verses.at(-1)?.verseEnd ?? null;
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loadingManualData.value = false;
  }
}

function onManualVerseStartChange(value: number | null): void {
  manualVerseStart.value = value;

  if (value !== null && (manualVerseEnd.value === null || manualVerseEnd.value < value)) {
    manualVerseEnd.value = value;
  }
}

function searchManualPassage(): void {
  if (
    !canSearchManual.value ||
    !manualBookCode.value ||
    !manualChapter.value ||
    !manualVerseStart.value ||
    !manualVerseEnd.value
  ) {
    return;
  }

  const book = books.value.find((bookItem) => bookItem.code === manualBookCode.value);

  if (!book) {
    return;
  }

  const verseRange =
    manualVerseStart.value === manualVerseEnd.value
      ? String(manualVerseStart.value)
      : `${manualVerseStart.value}-${manualVerseEnd.value}`;

  void executeSearch(`${book.displayName} ${manualChapter.value}:${verseRange}`);
}

function selectVerse(verse: BibleVerse): void {
  selectedVerse.value = verse;
}

function isVerseSelected(verse: BibleVerse): boolean {
  const key = verseKey(verse);

  return selectedVerses.value.some((selected) => verseKey(selected) === key);
}

function toggleVerseSelection(verse: BibleVerse, selected: boolean): void {
  const key = verseKey(verse);

  if (selected) {
    if (!isVerseSelected(verse)) {
      selectedVerses.value = [...selectedVerses.value, verse];
    }

    selectedVerse.value = verse;
    return;
  }

  selectedVerses.value = selectedVerses.value.filter(
    (selectedItem) => verseKey(selectedItem) !== key,
  );

  if (selectedVerse.value && verseKey(selectedVerse.value) === key) {
    selectedVerse.value = selectedVerses.value[0] ?? null;
  }
}

function toggleAllResults(selected: boolean): void {
  const verses = searchResult.value?.verses ?? [];

  selectedVerses.value = selected ? [...verses] : [];
  selectedVerse.value = selected ? (verses[0] ?? null) : null;
}

function removeSelectedResults(): void {
  const passage = searchResult.value;
  if (!passage || selectedVerses.value.length === 0) return;

  const selectedKeys = new Set(selectedVerses.value.map(verseKey));
  const remainingVerses = passage.verses.filter((verse) => !selectedKeys.has(verseKey(verse)));
  searchResult.value = { ...passage, verses: remainingVerses };
  selectedVerses.value = [];
  selectedVerse.value = remainingVerses[0] ?? null;
}

function moveResultSelection(direction: -1 | 1): void {
  const verses = searchResult.value?.verses ?? [];

  if (verses.length === 0) {
    return;
  }

  const currentVerse = selectedVerse.value;
  const currentIndex = currentVerse
    ? verses.findIndex((verse) => verseKey(verse) === verseKey(currentVerse))
    : -1;

  const nextIndex =
    currentIndex < 0 ? 0 : Math.min(verses.length - 1, Math.max(0, currentIndex + direction));

  selectedVerse.value = verses[nextIndex] ?? null;

  const selectedCard = resultsElement.value?.querySelector<HTMLElement>(
    `[data-result-index="${nextIndex}"]`,
  );

  selectedCard?.scrollIntoView({
    block: 'nearest',
    behavior: 'smooth',
  });
}

function movePreview(direction: -1 | 1): void {
  const verses = searchResult.value?.verses ?? [];

  if (verses.length === 0) {
    return;
  }

  const currentVerse = selectedVerse.value;
  const currentIndex = currentVerse
    ? verses.findIndex((verse) => verseKey(verse) === verseKey(currentVerse))
    : -1;

  const nextIndex =
    currentIndex < 0 ? 0 : Math.min(verses.length - 1, Math.max(0, currentIndex + direction));

  selectedVerse.value = verses[nextIndex] ?? null;
}

function buildServiceTitle(passage: BiblePassage): string {
  const firstVerse = passage.verses[0];
  const lastVerse = passage.verses.at(-1);
  const range =
    firstVerse && lastVerse
      ? firstVerse.verseLabel === lastVerse.verseLabel
        ? firstVerse.verseLabel
        : `${firstVerse.verseLabel}-${lastVerse.verseLabel}`
      : '';

  return range
    ? `${passage.bookName} ${passage.chapter}:${range}`
    : `${passage.bookName} ${passage.chapter}`;
}

function buildProjectionReference(passage: BiblePassage, verses: BibleVerse[]): string {
  const selectedNumbers = new Set<number>();

  for (const verse of verses) {
    for (let number = verse.verseStart; number <= verse.verseEnd; number += 1) {
      selectedNumbers.add(number);
    }
  }

  const numbers = [...selectedNumbers].sort((first, second) => first - second);
  const ranges: string[] = [];
  let rangeStart = numbers[0];
  let previous = numbers[0];

  for (const number of numbers.slice(1)) {
    if (previous !== undefined && number === previous + 1) {
      previous = number;
      continue;
    }

    if (rangeStart !== undefined && previous !== undefined) {
      ranges.push(rangeStart === previous ? String(rangeStart) : `${rangeStart}-${previous}`);
    }

    rangeStart = number;
    previous = number;
  }

  if (rangeStart !== undefined && previous !== undefined) {
    ranges.push(rangeStart === previous ? String(rangeStart) : `${rangeStart}-${previous}`);
  }

  return `${passage.bookName} ${passage.chapter}:${ranges.join(', ')}`;
}

function addSingleVerseToService(verse: BibleVerse): void {
  const item: BibleServiceItem = {
    id: `bible-${Date.now()}-${serviceItems.value.length}`,
    type: 'bible',
    title: verse.reference,
    projectionReference: verse.reference,
    versionCode: verse.versionCode,
    verses: [verse],
  };

  const wasAdded = presentationStore.addToService({
    id: `service-${item.id}`,
    sourceId: `${verse.versionCode}:${verseKey(verse)}`,
    type: 'bible',
    title: verse.reference,
    footer: verse.reference,
    frames: [
      {
        id: verseKey(verse),
        label: verse.reference,
        text: verse.text,
      },
    ],
  });

  if (!wasAdded) return;

  serviceItems.value = [...serviceItems.value, item];
  selectedServiceItemId.value = item.id;
}

function addSelectedToService(): string | null {
  const passage = searchResult.value;

  if (!passage || selectedVerses.value.length === 0) {
    return null;
  }

  const title = buildServiceTitle(passage);
  const selectedKeys = selectedVerses.value.map(verseKey).join('|');
  const item: BibleServiceItem = {
    id: `bible-${Date.now()}-${serviceItems.value.length}`,
    type: 'bible',
    title,
    projectionReference: buildProjectionReference(passage, selectedVerses.value),
    versionCode: passage.versionCode,
    verses: [...selectedVerses.value],
  };

  const presentationId = `service-${item.id}`;
  const sourceId = `${item.versionCode}:${item.title}:${selectedKeys}`;
  const wasAdded = presentationStore.addToService({
    id: presentationId,
    sourceId,
    type: 'bible',
    title: item.title,
    footer: item.projectionReference,
    frames: item.verses.map((verse) => ({
      id: verseKey(verse),
      label: verse.reference,
      text: verse.text,
    })),
  });

  if (!wasAdded) {
    return (
      presentationStore.serviceItems.find((serviceItem) => serviceItem.sourceId === sourceId)?.id ??
      null
    );
  }

  serviceItems.value = [...serviceItems.value, item];
  selectedServiceItemId.value = item.id;
  return presentationId;
}

function projectSelectedNow(): void {
  const passage = searchResult.value;
  if (!passage || selectedVerses.value.length === 0) return;

  const title = buildServiceTitle(passage);
  const selectedKeys = selectedVerses.value.map(verseKey).join('|');
  const sourceId = `${passage.versionCode}:${title}:${selectedKeys}`;
  const existingId = presentationStore.serviceItems.find((item) => item.sourceId === sourceId)?.id;
  const presentationId = existingId ?? addSelectedToService();

  if (presentationId) {
    presentationStore.activateServiceItem(presentationId);
  }
}

function selectServiceItem(item: BibleServiceItem): void {
  selectedServiceItemId.value = item.id;
  selectedVerse.value = item.verses[0] ?? null;
}

function activateServiceItem(item: BibleServiceItem): void {
  selectedServiceItemId.value = item.id;
  liveServiceItem.value = item;

  const firstVerse = item.verses[0];

  if (firstVerse) {
    setLiveVerse(firstVerse);
  }

  void nextTick(() => {
    livePanelElement.value?.focus();
  });
}

function removeServiceItem(itemId: string): void {
  serviceItems.value = serviceItems.value.filter((item) => item.id !== itemId);

  if (selectedServiceItemId.value === itemId) {
    selectedServiceItemId.value = null;
  }
}

function setLiveVerse(verse: BibleVerse): void {
  liveVerse.value = verse;

  window.icpStudio?.projection.setState({
    mode: 'content',
    title: '',
    body: verse.text,
    footer: liveServiceItem.value?.projectionReference ?? verse.reference,
  });
}

function moveLiveVerse(direction: -1 | 1): void {
  const verses = liveServiceItem.value?.verses ?? [];

  if (verses.length === 0) {
    return;
  }

  const currentVerse = liveVerse.value;
  const currentIndex = currentVerse
    ? verses.findIndex((verse) => verseKey(verse) === verseKey(currentVerse))
    : -1;
  const nextIndex =
    currentIndex < 0 ? 0 : Math.min(verses.length - 1, Math.max(0, currentIndex + direction));

  const nextVerse = verses[nextIndex];

  if (nextVerse) {
    setLiveVerse(nextVerse);
  }
}

function startLiveSectionDrag(event: DragEvent, section: LiveSectionId): void {
  draggingLiveSection.value = section;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', section);
  }
}

function stopLiveSectionDrag(): void {
  draggingLiveSection.value = null;
}

function dropLiveSection(targetSection: LiveSectionId): void {
  const sourceSection = draggingLiveSection.value;

  if (!sourceSection || sourceSection === targetSection) {
    stopLiveSectionDrag();
    return;
  }

  liveSections.value = [...liveSections.value].reverse();
  stopLiveSectionDrag();
}

function presentSelectedVerse(): void {
  if (selectedVerse.value) {
    liveServiceItem.value = null;
    setLiveVerse(selectedVerse.value);
  }
}

function clearLiveArea(): void {
  liveServiceItem.value = null;
  liveVerse.value = null;
  window.icpStudio?.projection.setState({ mode: 'blank' });
  livePanelElement.value?.focus();
}

function startLiveSectionResize(event: PointerEvent): void {
  const containerHeight = livePanelElement.value?.clientHeight;
  const topSection = liveSections.value[0];
  const bottomSection = liveSections.value[1];

  if (!containerHeight || !topSection || !bottomSection) {
    return;
  }

  stopLiveResize?.();

  const startY = event.clientY;
  const initialTopSize = liveSectionSizes[topSection];
  const initialBottomSize = liveSectionSizes[bottomSection];
  const combinedSize = initialTopSize + initialBottomSize;
  const minimumSize = 0.35;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const sizeDifference = ((moveEvent.clientY - startY) / containerHeight) * combinedSize;
    const nextTopSize = initialTopSize + sizeDifference;
    const nextBottomSize = initialBottomSize - sizeDifference;

    if (nextTopSize < minimumSize || nextBottomSize < minimumSize) {
      return;
    }

    liveSectionSizes[topSection] = nextTopSize;
    liveSectionSizes[bottomSection] = combinedSize - nextTopSize;
  };

  const stopResize = () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopResize);
    document.body.classList.remove('is-resizing-live-sections');
    stopLiveResize = null;
  };

  stopLiveResize = stopResize;
  document.body.classList.add('is-resizing-live-sections');
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopResize);
  event.preventDefault();
}

onBeforeUnmount(() => {
  stopLiveResize?.();
  unsubscribePreferredVersion?.();
});

onMounted(() => {
  unsubscribePreferredVersion = window.icpStudio?.bible.onPreferredVersionChanged((versionCode) => {
    void applyPreferredVersion(versionCode);
  });
  void loadBooks();
});
</script>

<style scoped>
.bible-search-panel,
.bible-service-panel,
.bible-preview-panel,
.bible-live-panel {
  container-type: inline-size;
  display: flex;
  min-height: 100%;
  flex: 1;
  flex-direction: column;
}

.search-controls {
  position: sticky;
  z-index: 15;
  top: -14px;
  margin: -6px -2px 0;
  padding: 6px 2px 10px;
  background: #111b28;
  border-bottom: 1px solid #263448;
}

.search-tabs {
  min-height: 36px;
  margin: -8px 0 10px;
  color: #8290a3;
  border-bottom: 1px solid #263448;
}

.bible-search-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bible-search-toolbar .reference-field {
  min-width: 180px;
  flex: 1 1 220px;
}

.reference-field {
  position: relative;
  min-width: 0;
}

.manual-search {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.manual-fields {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
  gap: 7px;
}

.manual-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 7px;
}

.dark-field {
  min-width: 0;
}

.dark-field :deep(.q-field__control) {
  color: #e7edf5;
  background: #0d1621;
}

.dark-field :deep(.q-field__native),
.dark-field :deep(.q-field__input),
.dark-field :deep(.q-field__label),
.dark-field :deep(.q-field__prepend),
.dark-field :deep(.q-field__append) {
  color: #b8c3d1;
}

.toolbar-button {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.result-action-button {
  width: 24px;
  height: 24px;
  min-width: 24px;
}

.book-suggestions {
  position: absolute;
  z-index: 20;
  top: calc(100% + 5px);
  right: 0;
  left: 0;
  max-height: 300px;
  padding: 5px;
  overflow-y: auto;
  background: #111b28;
  border: 1px solid #314158;
  border-radius: 8px;
  box-shadow: 0 16px 36px rgb(0 0 0 / 35%);
}

.book-suggestion {
  display: grid;
  width: 100%;
  grid-template-columns: 22px minmax(80px, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 9px;
  color: #d6e0ec;
  background: transparent;
  border: 0;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
}

.book-suggestion:hover {
  background: #1a2b40;
}

.book-suggestion small {
  max-width: 130px;
  overflow: hidden;
  color: #718198;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-banner {
  margin-top: 10px;
  font-size: 12px;
}

.error-banner {
  color: #fecaca;
  background: rgb(127 29 29 / 24%);
  border: 1px solid rgb(248 113 113 / 25%);
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
  outline: none;
}

.results-heading {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) minmax(110px, auto);
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.idle-version-heading {
  margin-top: 14px;
  margin-bottom: 0;
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

.active-version-summary {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  flex-direction: column;
  text-align: right;
}

.active-version-summary span {
  color: #758399;
  font-size: 10px;
}

.active-version-summary strong {
  max-width: 220px;
  overflow: hidden;
  color: #9fc6f4;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.results-actions {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 9px;
  color: #a8b4c3;
  font-size: 10px;
}

.results-actions :deep(.q-checkbox__inner) {
  font-size: 32px;
}

.verse-card {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  padding: 6px 8px;
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

.verse-checkbox {
  flex: 0 0 auto;
}

.verse-number {
  display: flex;
  min-width: 24px;
  height: 24px;
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
  gap: 2px;
}

.verse-content strong {
  color: #dce6f2;
  font-size: 10px;
}

.verse-content span {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.3;
  font-size: 11px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.service-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
}

.service-item {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 7px;
  padding: 6px;
  color: #bac6d4;
  background: #0d1621;
  border: 1px solid #26364b;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
}

.service-item:hover,
.service-item--active {
  background: #12243a;
  border-color: #3b82f6;
}

.service-position {
  display: flex;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  background: #172d49;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
}

.service-item-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.service-item-content strong {
  color: #dce6f2;
  font-size: 10px;
}

.service-item-content small {
  display: -webkit-box;
  overflow: hidden;
  color: #8492a6;
  font-size: 10px;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.service-empty {
  min-height: 180px;
}

.panel-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #8492a6;
  font-size: 11px;
}

.live-section {
  display: flex;
  min-height: 110px;
  flex-basis: 0;
  flex-direction: column;
  overflow: hidden;
  background: #0b131d;
  border: 1px solid #26364b;
  border-radius: 8px;
}

.live-section-resizer {
  display: flex;
  height: 10px;
  flex: 0 0 10px;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
  touch-action: none;
}

.live-section-resizer span {
  width: 44px;
  height: 3px;
  background: #314155;
  border-radius: 999px;
}

.live-section-resizer:hover span {
  background: #60a5fa;
}

.live-section--dragging {
  opacity: 0.5;
  border-color: #60a5fa;
}

.live-section-header {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 6px 0 8px;
  color: #77869a;
  background: #121e2c;
  border-bottom: 1px solid #26364b;
  font-size: 10px;
  cursor: grab;
  user-select: none;
}

.live-section-heading,
.live-output-label,
.live-content-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.live-output-label {
  color: #8d9bae;
  white-space: nowrap;
}

.live-content-actions {
  flex: 0 0 auto;
}

.live-section-header:active {
  cursor: grabbing;
}

.live-section .bible-screen {
  position: relative;
  min-height: 0;
  flex: 1;
  aspect-ratio: auto;
  border: 0;
  border-radius: 0;
}

.live-verse-list {
  min-height: 0;
  flex: 1;
  padding: 6px;
  overflow-y: auto;
}

.live-service-title {
  padding: 3px 5px 7px;
  color: #dce6f2;
  font-size: 11px;
  font-weight: 700;
}

.live-verse-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  padding: 5px;
  color: #aebaca;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  text-align: left;
  font-size: 10px;
  cursor: pointer;
}

.live-verse-item:hover,
.live-verse-item--active {
  color: #e4edf7;
  background: #12243a;
  border-color: #3b82f6;
}

.live-content-empty {
  padding: 24px 12px;
  color: #66758a;
  text-align: center;
  font-size: 11px;
}

.live-position {
  color: #8492a6;
  font-size: 10px;
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
  color: var(--projection-text-color);
  border: 1px solid #293649;
  border-radius: 8px;
  text-align: center;
}

.bible-screen--live {
  border-color: #3a2b34;
}

.screen-reference {
  color: var(--projection-footer-color);
  font-size: clamp(11px, 1.2vw, 15px);
  font-weight: 700;
}

.screen-passage-reference {
  position: absolute;
  bottom: 9px;
  left: 11px;
  color: var(--projection-footer-color);
  font-size: 9px;
  font-weight: 500;
  text-align: left;
}

.screen-text {
  color: var(--projection-text-color);
  font-size: clamp(16px, 2vw, 29px);
  font-weight: 600;
  line-height: 1.3;
}

.screen-fitted-text {
  min-height: 0;
  flex: 1;
}

.bible-screen--live .screen-fitted-text {
  padding-bottom: 18px;
}

.screen-version {
  color: #77869a;
  font-size: 10px;
}

.preview-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
  color: #8c9aab;
  font-size: 11px;
}

.preview-actions,
.live-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.live-actions {
  align-items: center;
  justify-content: space-between;
}

@container (max-width: 430px) {
  .manual-fields,
  .manual-actions {
    width: 100%;
  }

  .manual-fields {
    grid-template-columns: repeat(2, minmax(90px, 1fr));
  }

  .manual-actions {
    justify-content: flex-end;
  }

  .results-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}

@container (max-width: 285px) {
  .manual-fields {
    grid-template-columns: 1fr;
  }

  .preview-actions :deep(.q-btn) {
    width: 100%;
  }
}
</style>

<style>
body.is-resizing-live-sections {
  cursor: row-resize;
  user-select: none;
}
</style>
