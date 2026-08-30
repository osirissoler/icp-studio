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

          <q-banner v-if="actionMessage" dense rounded class="action-banner">
            <template #avatar>
              <q-icon name="playlist_add_check" color="positive" />
            </template>
            {{ actionMessage }}
          </q-banner>

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

              <div class="results-actions">
                <q-checkbox
                  :model-value="allResultsSelected"
                  dense
                  label="Todos"
                  color="primary"
                  @update:model-value="toggleAllResults(Boolean($event))"
                />

                <q-chip dense color="blue-grey-9" text-color="blue-grey-2">
                  {{ searchResult.versionCode }}
                </q-chip>

                <q-btn
                  flat
                  round
                  dense
                  color="primary"
                  icon="add_to_queue"
                  aria-label="Agregar seleccionados a previsualización"
                  class="result-action-button"
                  :disable="selectedVerses.length === 0"
                  @click="addSelectedToPreview"
                >
                  <q-tooltip>Agregar seleccionados a previsualización</q-tooltip>
                </q-btn>

                <q-btn
                  flat
                  round
                  dense
                  color="primary"
                  icon="playlist_add"
                  aria-label="Agregar seleccionados al servicio"
                  class="result-action-button"
                  :disable="selectedVerses.length === 0"
                  @click="addSelectedToService"
                >
                  <q-tooltip>Agregar seleccionados al servicio</q-tooltip>
                </q-btn>
              </div>
            </div>

            <button
              v-for="(verse, verseIndex) in searchResult.verses"
              :key="verseKey(verse)"
              :data-result-index="verseIndex"
              type="button"
              class="verse-card"
              :class="{ 'verse-card--selected': selectedVerse && verseKey(selectedVerse) === verseKey(verse) }"
              @click="selectVerse(verse)"
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
              {{ serviceVerses.length }}
            </q-chip>
          </div>

          <div v-if="serviceVerses.length" class="service-list">
            <button
              v-for="(verse, index) in serviceVerses"
              :key="verseKey(verse)"
              type="button"
              class="service-item"
              :class="{ 'service-item--active': selectedVerse && verseKey(selectedVerse) === verseKey(verse) }"
              @click="selectServiceVerse(verse)"
            >
              <span class="service-position">{{ index + 1 }}</span>
              <span class="service-item-content">
                <strong>{{ verse.reference }}</strong>
                <small>{{ verse.text }}</small>
              </span>
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="close"
                aria-label="Quitar del servicio"
                @click.stop="removeServiceVerse(verse)"
              >
                <q-tooltip>Quitar del servicio</q-tooltip>
              </q-btn>
            </button>
          </div>

          <div v-else class="panel-state service-empty">
            <q-icon name="playlist_add" size="40px" />
            <strong>Servicio vacío</strong>
            <span>Agrega versículos con el botón + del buscador.</span>
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

          <div v-if="previewVerses.length" class="preview-queue">
            <button
              v-for="(verse, index) in previewVerses"
              :key="verseKey(verse)"
              type="button"
              class="preview-queue-item"
              :class="{
                'preview-queue-item--active':
                  selectedVerse && verseKey(selectedVerse) === verseKey(verse),
              }"
              @click="selectPreviewVerse(verse)"
            >
              <span class="preview-position">{{ index + 1 }}</span>
              <span class="preview-item-content">
                <strong>{{ verse.reference }}</strong>
                <small>{{ verse.text }}</small>
              </span>
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="close"
                aria-label="Quitar de previsualización"
                @click.stop="removePreviewVerse(verse)"
              >
                <q-tooltip>Quitar de previsualización</q-tooltip>
              </q-btn>
            </button>
          </div>

          <div v-if="previewVerses.length > 1" class="preview-navigation">
            <q-btn flat round dense icon="chevron_left" @click="movePreview(-1)">
              <q-tooltip>Versículo anterior en previsualización</q-tooltip>
            </q-btn>
            <span>{{ previewPosition }} de {{ previewVerses.length }}</span>
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
import { computed, nextTick, onMounted, ref } from 'vue';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';
import type {
  BibleBook,
  BiblePassage,
  BibleVerse,
} from '../shared/bible';

type SearchMode = 'reference' | 'manual';

interface FocusableInput {
  focus: () => void;
}

interface SelectOption<T> {
  label: string;
  value: T;
}

const books = ref<BibleBook[]>([]);
const referenceInput = ref<FocusableInput | null>(null);
const resultsElement = ref<HTMLElement | null>(null);
const referenceText = ref('');
const searchMode = ref<SearchMode>('reference');
const searchResult = ref<BiblePassage | null>(null);
const selectedVerse = ref<BibleVerse | null>(null);
const selectedVerses = ref<BibleVerse[]>([]);
const previewVerses = ref<BibleVerse[]>([]);
const serviceVerses = ref<BibleVerse[]>([]);
const liveVerse = ref<BibleVerse | null>(null);
const showBookSuggestions = ref(false);
const searching = ref(false);
const loadingManualData = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');

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
    .filter(
      (verse) =>
        manualVerseStart.value === null ||
        verse.verseEnd >= manualVerseStart.value,
    )
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

      return (
        completeName.includes(term) ||
        shortName.includes(term) ||
        abbreviation.includes(term)
      );
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

const previewPosition = computed(() => {
  const currentVerse = selectedVerse.value;

  if (!currentVerse) {
    return 0;
  }

  const index = previewVerses.value.findIndex(
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
  return [
    verse.versionCode,
    verse.bookCode,
    verse.chapter,
    verse.verseLabel,
  ].join(':');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No fue posible completar la operación.';
}

async function loadBooks(): Promise<void> {
  const bibleApi = window.icpStudio?.bible;

  if (!bibleApi) {
    errorMessage.value =
      'El módulo Biblia solamente está disponible en la aplicación de escritorio.';
    return;
  }

  try {
    books.value = await bibleApi.getBooks();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

function updateReferenceText(value: string | number | null): void {
  referenceText.value =
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '';

  showBookSuggestions.value = true;
}

function clearReferenceSearch(): void {
  referenceText.value = '';
  errorMessage.value = '';
  actionMessage.value = '';
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
  actionMessage.value = '';
  searchResult.value = null;
  selectedVerse.value = null;
  selectedVerses.value = [];

  try {
    const result = await bibleApi.searchPassage({ reference });

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
    manualChapters.value = await bibleApi.getBookChapters({ bookCode });
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

  const book = books.value.find(
    (bookItem) => bookItem.code === manualBookCode.value,
  );

  const bibleApi = window.icpStudio?.bible;

  if (!book || !bibleApi) {
    return;
  }

  loadingManualData.value = true;
  errorMessage.value = '';

  try {
    const passage = await bibleApi.searchPassage({
      reference: `${book.displayName} ${chapter}`,
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

  if (
    value !== null &&
    (manualVerseEnd.value === null ||
      manualVerseEnd.value < value)
  ) {
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

  const book = books.value.find(
    (bookItem) => bookItem.code === manualBookCode.value,
  );

  if (!book) {
    return;
  }

  const verseRange =
    manualVerseStart.value === manualVerseEnd.value
      ? String(manualVerseStart.value)
      : `${manualVerseStart.value}-${manualVerseEnd.value}`;

  void executeSearch(
    `${book.displayName} ${manualChapter.value}:${verseRange}`,
  );
}

function selectVerse(verse: BibleVerse): void {
  selectedVerse.value = verse;
}

function isVerseSelected(verse: BibleVerse): boolean {
  const key = verseKey(verse);

  return selectedVerses.value.some(
    (selected) => verseKey(selected) === key,
  );
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
  selectedVerse.value = selected ? verses[0] ?? null : null;
}

function moveResultSelection(direction: -1 | 1): void {
  const verses = searchResult.value?.verses ?? [];

  if (verses.length === 0) {
    return;
  }

  const currentVerse = selectedVerse.value;
  const currentIndex = currentVerse
    ? verses.findIndex(
        (verse) => verseKey(verse) === verseKey(currentVerse),
      )
    : -1;

  const nextIndex =
    currentIndex < 0
      ? direction === 1
        ? 0
        : verses.length - 1
      : (currentIndex + direction + verses.length) %
        verses.length;

  selectedVerse.value = verses[nextIndex] ?? null;

  const selectedCard =
    resultsElement.value?.querySelector<HTMLElement>(
      `[data-result-index="${nextIndex}"]`,
    );

  selectedCard?.scrollIntoView({
    block: 'nearest',
    behavior: 'smooth',
  });
}

function movePreview(direction: -1 | 1): void {
  const currentVerse = selectedVerse.value;

  if (previewVerses.value.length === 0) {
    return;
  }

  const currentIndex = currentVerse
    ? previewVerses.value.findIndex(
        (verse) => verseKey(verse) === verseKey(currentVerse),
      )
    : -1;

  const nextIndex =
    (currentIndex + direction + previewVerses.value.length) %
    previewVerses.value.length;

  selectedVerse.value = previewVerses.value[nextIndex] ?? null;
}

function addSelectedToPreview(): void {
  const existingKeys = new Set(previewVerses.value.map(verseKey));
  const newVerses = selectedVerses.value.filter(
    (verse) => !existingKeys.has(verseKey(verse)),
  );

  previewVerses.value = [...previewVerses.value, ...newVerses];

  if (newVerses[0]) {
    selectedVerse.value = newVerses[0];
  }

  actionMessage.value =
    newVerses.length > 0
      ? `${newVerses.length} versículos agregados a previsualización.`
      : 'Los versículos seleccionados ya estaban en previsualización.';
}

function selectPreviewVerse(verse: BibleVerse): void {
  selectedVerse.value = verse;
}

function removePreviewVerse(verse: BibleVerse): void {
  const key = verseKey(verse);

  previewVerses.value = previewVerses.value.filter(
    (previewVerse) => verseKey(previewVerse) !== key,
  );

  if (selectedVerse.value && verseKey(selectedVerse.value) === key) {
    selectedVerse.value = previewVerses.value[0] ?? null;
  }
}

function addSelectedToService(): void {
  const existingKeys = new Set(serviceVerses.value.map(verseKey));
  const newVerses = selectedVerses.value.filter(
    (verse) => !existingKeys.has(verseKey(verse)),
  );

  serviceVerses.value = [...serviceVerses.value, ...newVerses];
  actionMessage.value =
    newVerses.length > 0
      ? `${newVerses.length} versículos agregados al servicio.`
      : 'Los versículos seleccionados ya estaban agregados.';
}

function selectServiceVerse(verse: BibleVerse): void {
  selectedVerse.value = verse;
}

function removeServiceVerse(verse: BibleVerse): void {
  const key = verseKey(verse);

  serviceVerses.value = serviceVerses.value.filter(
    (serviceVerse) => verseKey(serviceVerse) !== key,
  );

  if (selectedVerse.value && verseKey(selectedVerse.value) === key) {
    selectedVerse.value = serviceVerses.value[0] ?? null;
  }
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
  window.icpStudio?.projection.setState({ mode: 'blank' });
}

onMounted(() => {
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
  width: 28px;
  height: 28px;
  min-width: 28px;
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

.error-banner,
.action-banner {
  margin-top: 10px;
  font-size: 12px;
}

.error-banner {
  color: #fecaca;
  background: rgb(127 29 29 / 24%);
  border: 1px solid rgb(248 113 113 / 25%);
}

.action-banner {
  color: #bbf7d0;
  background: rgb(20 83 45 / 25%);
  border: 1px solid rgb(74 222 128 / 22%);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
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

.results-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: #a8b4c3;
  font-size: 11px;
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

.preview-queue {
  display: flex;
  max-height: 180px;
  flex-direction: column;
  gap: 4px;
  margin-top: 9px;
  overflow-y: auto;
}

.preview-queue-item {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  color: #bac6d4;
  background: #0d1621;
  border: 1px solid #26364b;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
}

.preview-queue-item:hover,
.preview-queue-item--active {
  background: #12243a;
  border-color: #3b82f6;
}

.preview-position {
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

.preview-item-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.preview-item-content strong {
  color: #dce6f2;
  font-size: 10px;
}

.preview-item-content small {
  overflow: hidden;
  color: #8492a6;
  font-size: 10px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  justify-content: flex-start;
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
