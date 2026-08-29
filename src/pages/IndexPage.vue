<template>
  <q-page class="operator-page q-pa-lg">
    <div class="operator-shell">
      <header class="q-mb-lg">
        <div class="text-overline text-primary">ICP Studio</div>
        <h1 class="text-h4 q-my-xs">Prueba de proyección</h1>
        <p class="text-body1 text-grey-7 q-mb-none">
          Escribe un contenido y envíalo a todas las pantallas de proyección.
        </p>
      </header>

      <q-card flat bordered class="projection-card">
        <q-card-section class="q-gutter-md">
          <q-input v-model="title" outlined label="Título" maxlength="200" counter />

          <q-input
            v-model="body"
            outlined
            type="textarea"
            label="Contenido"
            autogrow
            maxlength="5000"
            counter
          />
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            flat
            color="negative"
            icon="clear_all"
            label="Limpiar proyección"
            :disable="!isElectron"
            @click="clearProjection"
          />

          <q-btn
            unelevated
            color="primary"
            icon="cast"
            label="Proyectar"
            :disable="!canProject"
            @click="projectContent"
          />
        </q-card-actions>
      </q-card>

      <q-banner v-if="!isElectron" rounded class="q-mt-md bg-orange-1 text-orange-10">
        El control de proyección solo está disponible dentro de Electron.
      </q-banner>

      <q-banner v-else-if="statusMessage" rounded class="q-mt-md bg-blue-1 text-primary">
        {{ statusMessage }}
      </q-banner>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ProjectionState } from '@/shared/projection';

const title = ref('Bienvenidos');
const body = ref('La salida de proyección de ICP Studio está conectada.');
const statusMessage = ref('');

const isElectron = Boolean(window.icpStudio);

const canProject = computed(() => {
  return isElectron && Boolean(title.value.trim() || body.value.trim());
});

function sendProjectionState(state: ProjectionState): void {
  window.icpStudio?.projection.setState(state);
}

function projectContent(): void {
  sendProjectionState({
    mode: 'content',
    title: title.value.trim(),
    body: body.value.trim(),
  });

  statusMessage.value = 'Contenido enviado a las pantallas.';
}

function clearProjection(): void {
  sendProjectionState({ mode: 'blank' });
  statusMessage.value = 'Proyección limpiada.';
}
</script>

<style scoped lang="scss">
.operator-page {
  background: #f4f7fb;
}

.operator-shell {
  width: min(100%, 760px);
  margin: 0 auto;
}

.projection-card {
  border-radius: 16px;
  background: white;
}
</style>
