<template>
  <div class="optical-score-importer">
    <div class="optical-import-card">
      <div class="import-icon">
        <q-icon name="document_scanner" />
      </div>

      <div class="import-copy">
        <span>RECONOCIMIENTO ÓPTICO MUSICAL</span>

        <strong>PDF / Imagen</strong>

        <small>
          Carga una partitura completa y analiza todas sus páginas para convertirlas en notas.
        </small>
      </div>

      <q-btn
        unelevated
        no-caps
        :loading="isLoading"
        icon="add_photo_alternate"
        label="Seleccionar"
        class="select-button"
        @click="openFilePicker"
      />

      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
        hidden
        @change="handleFileSelection"
      />
    </div>

    <section v-if="errorMessage" class="optical-error">
      <q-icon name="error_outline" />

      <span>{{ errorMessage }}</span>
    </section>

    <section v-if="isLoading" class="loading-panel">
      <q-spinner-dots size="30px" />

      <div>
        <strong> Preparando partitura </strong>

        <span>{{ loadingMessage }}</span>
      </div>
    </section>

    <section v-if="opticalDocument && selectedPage" class="optical-preview">
      <header class="preview-header">
        <div class="document-info">
          <div class="document-icon">
            <q-icon :name="opticalDocument.sourceKind === 'pdf' ? 'picture_as_pdf' : 'image'" />
          </div>

          <div>
            <span> PARTITURA PREPARADA </span>

            <strong>
              {{ opticalDocument.sourceFileName }}
            </strong>

            <small>
              {{
                opticalDocument.sourceKind === 'pdf'
                  ? `${opticalDocument.pages.length} página${opticalDocument.pages.length === 1 ? '' : 's'}`
                  : '1 imagen'
              }}
              · Página
              {{ selectedPage.pageNumber }}
              · {{ selectedPage.width }} × {{ selectedPage.height }} px
            </small>
          </div>
        </div>

        <div class="preview-actions">
          <q-btn flat dense no-caps icon="upload_file" label="Cambiar" @click="openFilePicker" />

          <q-btn
            flat
            dense
            no-caps
            icon="close"
            label="Quitar"
            class="clear-button"
            @click="clearDocument"
          />
        </div>
      </header>

      <div v-if="opticalDocument.pages.length > 1" class="page-strip">
        <button
          v-for="page in opticalDocument.pages"
          :key="page.id"
          type="button"
          class="page-thumbnail"
          :class="{
            active: page.id === selectedPage.id,
          }"
          @click="selectPage(page)"
        >
          <div class="thumbnail-image">
            <img :src="page.dataUrl" :alt="`Página ${page.pageNumber}`" />
          </div>

          <span> Página {{ page.pageNumber }} </span>
        </button>
      </div>

      <div class="preview-body">
        <div class="preview-canvas">
          <img :src="selectedPage.dataUrl" :alt="`Partitura página ${selectedPage.pageNumber}`" />
        </div>

        <aside class="analysis-sidebar">
          <div class="analysis-status">
            <q-icon :name="analysis ? 'check_circle' : 'document_scanner'" />

            <div>
              <span> ESTADO DEL RECONOCIMIENTO </span>

              <strong>
                {{ analysis ? 'Partitura analizada' : 'Lista para analizar' }}
              </strong>
            </div>
          </div>

          <div class="analysis-step complete">
            <span>1</span>

            <div>
              <strong>Archivo</strong>

              <small> PDF o imagen cargado correctamente. </small>
            </div>

            <q-icon name="check" />
          </div>

          <div class="analysis-step complete">
            <span>2</span>

            <div>
              <strong>Renderizado</strong>

              <small> Todas las páginas fueron convertidas a imágenes. </small>
            </div>

            <q-icon name="check" />
          </div>

          <div
            class="analysis-step"
            :class="{
              complete: Boolean(analysis),
              pending: !analysis,
            }"
          >
            <span>3</span>

            <div>
              <strong> Pentagramas y notas </strong>

              <small>
                {{
                  analysis
                    ? `${analysis.staffCount} pentagramas y ${analysis.noteCount} notas detectadas.`
                    : 'Pendiente de reconocimiento óptico musical.'
                }}
              </small>
            </div>

            <q-icon :name="analysis ? 'check' : 'hourglass_empty'" />
          </div>

          <div
            class="analysis-step"
            :class="{
              complete: Boolean(analysis),
              pending: !analysis,
            }"
          >
            <span>4</span>

            <div>
              <strong> ScoreDocument </strong>

              <small>
                {{
                  analysis
                    ? 'La canción ya entró al motor musical de ICP Studio.'
                    : 'Se generará después de reconocer las notas.'
                }}
              </small>
            </div>

            <q-icon :name="analysis ? 'check' : 'account_tree'" />
          </div>

          <div v-if="analysis" class="analysis-results">
            <div>
              <span>PENTAGRAMAS</span>
              <strong>
                {{ analysis.staffCount }}
              </strong>
            </div>

            <div>
              <span>NOTAS</span>
              <strong>
                {{ analysis.noteCount }}
              </strong>
            </div>

            <div>
              <span>CONFIANZA</span>
              <strong>
                {{ confidenceLabel }}
              </strong>
            </div>
          </div>

          <q-btn
            unelevated
            no-caps
            icon="auto_fix_high"
            :loading="isAnalyzing"
            :disable="isAnalyzing"
            label="Analizar partitura completa"
            class="analyze-button"
            @click="analyzeCompleteScore"
          />

          <small class="analysis-note">
            Primera versión OMR: optimizada para partituras impresas limpias, melodía principal y
            clave de Sol.
          </small>
        </aside>
      </div>

      <section v-if="analysis" class="detected-pages">
        <header>
          <div>
            <span> RESULTADO DEL RECONOCIMIENTO </span>

            <strong> Análisis por página </strong>
          </div>

          <q-icon name="analytics" />
        </header>

        <div class="detected-page-grid">
          <article v-for="pageResult in analysis.pages" :key="pageResult.pageNumber">
            <span>
              Página
              {{ pageResult.pageNumber }}
            </span>

            <strong>
              {{ pageResult.noteCount }}
              notas
            </strong>

            <small>
              {{ pageResult.staffCount }}
              pentagrama{{ pageResult.staffCount === 1 ? '' : 's' }}
            </small>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { ScoreDocument } from '../../../shared/score';

import { loadOpticalScoreImage } from './image-loader';

import { analyzeOpticalScore } from './optical-score-engine';

import type {
  OpticalScoreAnalysis,
  OpticalScoreDocument,
  OpticalScorePage,
} from './optical-score-types';

import { loadOpticalScorePdf } from './pdf-loader';

const emit = defineEmits<{
  scoreDetected: [score: ScoreDocument];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const opticalDocument = ref<OpticalScoreDocument | null>(null);

const selectedPage = ref<OpticalScorePage | null>(null);

const analysis = ref<OpticalScoreAnalysis | null>(null);

const errorMessage = ref('');

const loadingMessage = ref('');

const isLoading = ref(false);

const isAnalyzing = ref(false);

const confidenceLabel = computed(() => {
  if (!analysis.value) {
    return '--';
  }

  return `${Math.round(analysis.value.averageConfidence * 100)}%`;
});

function openFilePicker(): void {
  fileInput.value?.click();
}

async function handleFileSelection(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;

  const file = input.files?.[0];

  input.value = '';

  if (!file) {
    return;
  }

  errorMessage.value = '';

  analysis.value = null;

  isLoading.value = true;

  opticalDocument.value = null;

  selectedPage.value = null;

  try {
    const document = await loadFile(file);

    opticalDocument.value = document;

    selectedPage.value = document.pages[0] ?? null;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'No fue posible preparar el archivo seleccionado.';
  } finally {
    isLoading.value = false;

    loadingMessage.value = '';
  }
}

async function loadFile(file: File): Promise<OpticalScoreDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  const isPdf = file.type === 'application/pdf' || extension === 'pdf';

  if (isPdf) {
    loadingMessage.value = 'Renderizando todas las páginas del PDF.';

    return loadOpticalScorePdf(file);
  }

  const supportedImages = ['png', 'jpg', 'jpeg', 'webp'];

  const isImage = file.type.startsWith('image/') || supportedImages.includes(extension ?? '');

  if (isImage) {
    loadingMessage.value = 'Normalizando la imagen para reconocimiento musical.';

    return loadOpticalScoreImage(file);
  }

  throw new Error('Formato no compatible. Utiliza PDF, PNG, JPG, JPEG o WEBP.');
}

async function analyzeCompleteScore(): Promise<void> {
  if (!opticalDocument.value) {
    return;
  }

  errorMessage.value = '';

  analysis.value = null;

  isAnalyzing.value = true;

  try {
    const result = await analyzeOpticalScore(opticalDocument.value, (current, total) => {
      loadingMessage.value = `Analizando página ${current} de ${total}...`;
    });

    analysis.value = result.analysis;

    emit('scoreDetected', result.score);
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'No fue posible reconocer musicalmente la partitura.';
  } finally {
    isAnalyzing.value = false;

    loadingMessage.value = '';
  }
}

function selectPage(page: OpticalScorePage): void {
  selectedPage.value = page;
}

function clearDocument(): void {
  opticalDocument.value = null;

  selectedPage.value = null;

  analysis.value = null;

  errorMessage.value = '';

  loadingMessage.value = '';
}
</script>

<style scoped>
.optical-score-importer {
  display: contents;
}

.optical-import-card {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 11px;
  background: #101e2c;
  border: 1px solid rgb(34 211 238 / 22%);
  border-radius: 10px;
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
  line-height: 1.35;
}

.select-button,
.analyze-button {
  color: white;
  background: #16738a;
  border-radius: 8px;
}

.optical-error,
.loading-panel,
.optical-preview {
  grid-column: 1 / -1;
}

.optical-error {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 10px;
  color: #fecdd3;
  background: rgb(251 113 133 / 6%);
  border: 1px solid rgb(251 113 133 / 16%);
  border-radius: 8px;
  font-size: 8px;
}

.loading-panel {
  display: flex;
  min-height: 95px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #22d3ee;
  background: #0c1926;
  border: 1px solid #23394d;
  border-radius: 10px;
}

.loading-panel > div {
  display: flex;
  flex-direction: column;
}

.loading-panel strong {
  color: #c6d7e7;
  font-size: 10px;
}

.loading-panel span {
  color: #687e93;
  font-size: 7px;
}

.optical-preview {
  overflow: hidden;
  background: #0b1825;
  border: 1px solid #294157;
  border-radius: 11px;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 12px;
  background: #0f1f2e;
  border-bottom: 1px solid #253b50;
}

.document-info {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.document-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  color: #22d3ee;
  background: rgb(34 211 238 / 8%);
  border-radius: 8px;
}

.document-info > div:last-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.document-info span {
  color: #22d3ee;
  font-size: 6px;
  font-weight: 700;
}

.document-info strong {
  overflow: hidden;
  color: #d8e4ef;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-info small {
  color: #687e93;
  font-size: 7px;
}

.preview-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  color: #8fa4b8;
}

.clear-button {
  color: #fb7185;
}

.page-strip {
  display: flex;
  gap: 7px;
  padding: 9px;
  overflow-x: auto;
  background: #091522;
  border-bottom: 1px solid #23394d;
}

.page-thumbnail {
  display: flex;
  width: 90px;
  flex: 0 0 90px;
  flex-direction: column;
  gap: 4px;
  padding: 5px;
  color: #72879b;
  background: #101f2e;
  border: 1px solid #263d52;
  border-radius: 7px;
  cursor: pointer;
}

.page-thumbnail:hover,
.page-thumbnail.active {
  color: #67e8f9;
  border-color: #22d3ee;
}

.thumbnail-image {
  display: flex;
  height: 105px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: white;
  border-radius: 4px;
}

.thumbnail-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.page-thumbnail span {
  font-size: 7px;
  text-align: center;
}

.preview-body {
  display: grid;
  min-height: 420px;
  grid-template-columns: minmax(0, 1fr) 255px;
}

.preview-canvas {
  display: flex;
  max-height: 690px;
  align-items: flex-start;
  justify-content: center;
  padding: 14px;
  overflow: auto;
  background: #0c1722;
}

.preview-canvas img {
  display: block;
  max-width: 100%;
  height: auto;
  background: white;
  box-shadow: 0 10px 35px rgb(0 0 0 / 35%);
}

.analysis-sidebar {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 11px;
  background: #0d1b29;
  border-left: 1px solid #263c51;
}

.analysis-status {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px;
  color: #34d399;
  background: rgb(52 211 153 / 6%);
  border: 1px solid rgb(52 211 153 / 16%);
  border-radius: 8px;
}

.analysis-status > div {
  display: flex;
  flex-direction: column;
}

.analysis-status span {
  font-size: 6px;
}

.analysis-status strong {
  color: #a7f3d0;
  font-size: 8px;
}

.analysis-step {
  display: grid;
  grid-template-columns: 22px 1fr 18px;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: #101f2e;
  border: 1px solid #253b50;
  border-radius: 8px;
}

.analysis-step > span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: #8297aa;
  background: #152738;
  border-radius: 50%;
  font-size: 7px;
}

.analysis-step > div {
  display: flex;
  flex-direction: column;
}

.analysis-step strong {
  color: #b8c9d9;
  font-size: 8px;
}

.analysis-step small {
  color: #63788d;
  font-size: 6px;
}

.analysis-step > .q-icon {
  color: #536d84;
}

.analysis-step.complete > .q-icon {
  color: #34d399;
}

.analysis-step.pending {
  opacity: 0.72;
}

.analysis-results {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}

.analysis-results > div {
  display: flex;
  flex-direction: column;
  padding: 6px;
  background: #101f2e;
  border-radius: 6px;
}

.analysis-results span {
  color: #60788d;
  font-size: 5px;
}

.analysis-results strong {
  color: #a5f3fc;
  font-size: 10px;
}

.analysis-note {
  color: #63788d;
  font-size: 6px;
  line-height: 1.4;
}

.detected-pages {
  padding: 11px;
  border-top: 1px solid #253b50;
}

.detected-pages > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detected-pages > header > div {
  display: flex;
  flex-direction: column;
}

.detected-pages span {
  color: #22d3ee;
  font-size: 6px;
}

.detected-pages strong {
  color: #c1d1df;
  font-size: 9px;
}

.detected-page-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-top: 8px;
}

.detected-page-grid article {
  display: flex;
  flex-direction: column;
  padding: 7px;
  background: #101f2e;
  border: 1px solid #263c51;
  border-radius: 7px;
}

.detected-page-grid small {
  color: #61778b;
  font-size: 6px;
}

@media (max-width: 900px) {
  .preview-body {
    grid-template-columns: 1fr;
  }

  .analysis-sidebar {
    border-top: 1px solid #263c51;
    border-left: 0;
  }

  .detected-page-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 520px) {
  .optical-import-card {
    grid-template-columns: 42px 1fr;
  }

  .optical-import-card .q-btn {
    grid-column: 1 / -1;
  }

  .preview-header {
    align-items: stretch;
    flex-direction: column;
  }

  .detected-page-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
