<template>
  <section class="workspace">
    <div class="upcoming-icon">
      <q-icon :name="mode.icon" />
    </div>

    <span>PRÓXIMA ETAPA</span>

    <h2>{{ mode.label }}</h2>

    <p>{{ mode.longDescription }}</p>

    <div class="features">
      <div v-for="feature in mode.features" :key="feature">
        <q-icon name="check_circle_outline" />
        {{ feature }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ModeDefinition } from '../shared/music';

defineProps<{
  mode: ModeDefinition;
}>();
</script>

<style scoped>
.workspace {
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 20px;
  background: #0b1521;
  border: 1px solid #223348;
  border-radius: 18px;
  text-align: center;
}

.upcoming-icon {
  display: grid;
  width: 68px;
  height: 68px;
  place-items: center;
  margin-bottom: 15px;
  color: #f472b6;
  background: rgb(244 114 182 / 9%);
  border-radius: 20px;
}

.upcoming-icon .q-icon {
  font-size: 31px;
}

.workspace > span {
  color: #f472b6;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.13em;
}

h2 {
  margin: 6px 0;
  color: #edf3fa;
  font-size: 19px;
}

p {
  max-width: 650px;
  margin: 0;
  color: #8493a8;
  font-size: 12px;
}

.features {
  display: grid;
  width: min(650px, 100%);
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 22px;
}

.features > div {
  display: flex;
  gap: 8px;
  padding: 10px;
  color: #9baec2;
  background: #0f1b29;
  border: 1px solid #213247;
  border-radius: 10px;
  font-size: 10px;
  text-align: left;
}

.features .q-icon {
  color: #34d399;
}

@media (max-width: 600px) {
  .features {
    grid-template-columns: 1fr;
  }
}
</style>
