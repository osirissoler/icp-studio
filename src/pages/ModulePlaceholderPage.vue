<template>
  <q-page class="module-page q-pa-lg">
    <div class="module-heading">
      <q-icon :name="moduleData.icon" size="36px" color="primary" />

      <div>
        <div class="text-h5 text-weight-bold">{{ moduleData.title }}</div>
        <div class="text-grey-6">{{ moduleData.description }}</div>
      </div>
    </div>

    <q-card flat bordered class="module-placeholder q-mt-lg">
      <q-card-section class="row items-center no-wrap q-gutter-md">
        <q-icon name="construction" size="32px" color="blue-grey-5" />

        <div>
          <div class="text-subtitle1 text-weight-medium">
            Módulo preparado para su desarrollo
          </div>
          <div class="text-body2 text-grey-6">
            Aquí construiremos las funciones de {{ moduleData.title.toLowerCase() }} paso por paso.
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const moduleData = computed(() => ({
  title: String(route.meta.title ?? 'Módulo'),
  description: String(route.meta.description ?? ''),
  icon: String(route.meta.icon ?? 'widgets'),
}));
</script>

<style scoped>
.module-page {
  background: #f4f6f8;
}

.module-heading {
  display: flex;
  align-items: center;
  gap: 16px;
}

.module-placeholder {
  max-width: 760px;
  border-radius: 12px;
}
</style>
