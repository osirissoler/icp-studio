<template>
  <main class="song-editor-page">
    <header class="editor-header">
      <div class="editor-brand">
        <q-icon name="music_note" size="26px" />
        <div>
          <div class="editor-title">Nueva alabanza</div>
          <div class="editor-subtitle">Editor de alabanzas de ICP Studio</div>
        </div>
      </div>

      <q-btn flat round dense icon="close" aria-label="Cerrar editor" @click="closeEditor">
        <q-tooltip>Cerrar</q-tooltip>
      </q-btn>
    </header>

    <q-tabs
      v-model="activeTab"
      dense
      no-caps
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="editor-tabs"
    >
      <q-tab name="parts" icon="view_agenda" label="Crear por partes" />
      <q-tab name="paste" icon="content_paste" label="Pegado rápido" />
      <q-tab name="order" icon="reorder" label="Orden y revisión" />
      <q-tab name="preview" icon="preview" label="Vista previa" />
    </q-tabs>

    <q-separator dark />

    <q-tab-panels v-model="activeTab" animated class="editor-panels">
      <q-tab-panel name="parts">
        <div class="empty-editor-state">
          <q-icon name="view_agenda" size="52px" />
          <div class="text-h6">Crear alabanza por partes</div>
          <div class="state-description">
            Aquí agregaremos el título, las estrofas, los coros y los puentes.
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="paste">
        <div class="empty-editor-state">
          <q-icon name="content_paste" size="52px" />
          <div class="text-h6">Pegar canción completa</div>
          <div class="state-description">
            Aquí podremos pegar y procesar automáticamente la letra de una alabanza.
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="order">
        <div class="empty-editor-state">
          <q-icon name="reorder" size="52px" />
          <div class="text-h6">Orden y revisión</div>
          <div class="state-description">
            Aquí organizaremos las partes arrastrándolas a la posición deseada.
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="preview">
        <div class="empty-editor-state">
          <q-icon name="preview" size="52px" />
          <div class="text-h6">Vista previa</div>
          <div class="state-description">
            Aquí revisaremos cómo se verá cada parte antes de guardar la alabanza.
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';

type EditorTab = 'parts' | 'paste' | 'order' | 'preview';

const activeTab = ref<EditorTab>('parts');

function closeEditor(): void {
  window.close();
}
</script>

<style scoped>
.song-editor-page {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  color: #e8eef6;
  background: #0c131d;
}

.editor-header {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: #0b1420;
  border-bottom: 1px solid #253142;
}

.editor-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.editor-brand > .q-icon {
  color: #60a5fa;
}

.editor-title {
  font-size: 16px;
  font-weight: 700;
}

.editor-subtitle {
  margin-top: 2px;
  color: #8492a6;
  font-size: 10px;
}

.editor-tabs {
  min-height: 50px;
  padding: 0 10px;
  color: #8e9bad;
  background: #111b28;
}

.editor-panels {
  flex: 1;
  color: #e8eef6;
  background: #0c131d;
}

.editor-panels :deep(.q-panel),
.editor-panels :deep(.q-tab-panel) {
  height: 100%;
}

.empty-editor-state {
  display: flex;
  min-height: calc(100vh - 165px);
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  color: #56657a;
  text-align: center;
}

.empty-editor-state .text-h6 {
  color: #aab6c5;
}

.state-description {
  max-width: 440px;
  font-size: 12px;
  line-height: 1.5;
}
</style>
