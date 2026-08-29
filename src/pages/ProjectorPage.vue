<template>
  <main class="projector-page">
    <section class="projector-content">
      <div class="projector-logo">ICP Studio</div>

      <h1>Pantalla de proyección</h1>

      <p>La salida del proyector está funcionando correctamente.</p>
    </section>
  </main>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.projector-page {
  display: grid;
  min-height: 100vh;
  color: white;
  background: #05070d;
  place-items: center;
}

.projector-content {
  padding: 48px;
  text-align: center;
}

.projector-logo {
  margin-bottom: 24px;
  color: #4f8cff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 16px;
  font-size: clamp(40px, 6vw, 88px);
}

p {
  margin: 0;
  color: #b8c4d9;
  font-size: clamp(18px, 2vw, 30px);
}
</style>