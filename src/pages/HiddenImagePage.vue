<template>
  <q-page class="hidden-image-page">
    <div class="page-shell">
      <header class="page-header">
        <div class="header-left">
          <q-btn
            flat
            round
            dense
            icon="arrow_back"
            class="back-button"
            aria-label="Volver a actividades"
            @click="goBack"
          />

          <div class="activity-icon">
            <q-icon name="image_search" />
          </div>

          <div class="header-copy">
            <h1>Imagen escondida</h1>
            <p>
              Prepara imágenes ocultas por casillas para juegos y competencias.
            </p>
          </div>
        </div>

        <q-btn
          unelevated
          no-caps
          icon="add"
          label="Nueva actividad"
          class="new-activity-button"
          @click="createActivity"
        />
      </header>

      <section class="content-area">
        <div class="empty-state">
          <div class="empty-icon">
            <q-icon name="image_search" />
          </div>

          <h2>Imagen escondida</h2>

          <p>
            Aquí podrás crear actividades donde una imagen permanece cubierta
            por casillas y se va descubriendo durante el juego.
          </p>

          <q-btn
            unelevated
            no-caps
            icon="add"
            label="Crear primera actividad"
            class="empty-action"
            @click="createActivity"
          />
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

const router = useRouter();
const $q = useQuasar();

function goBack(): void {
  void router.push('/actividades');
}

function createActivity(): void {
  $q.notify({
    type: 'info',
    icon: 'construction',
    message: 'El creador de Imagen escondida será el próximo paso.',
    position: 'top',
    timeout: 2200,
  });
}
</script>

<style scoped>
.hidden-image-page {
  min-height: 100%;
  padding: 16px;
  color: #dce7f4;
  background: #08111c;
}

.page-shell {
  display: flex;
  min-height: calc(100vh - 98px);
  flex-direction: column;
  overflow: hidden;
  background: #0c1521;
  border: 1px solid #25364a;
  border-radius: 14px;
}

.page-header {
  display: flex;
  min-height: 74px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 18px;
  background: #0d1825;
  border-bottom: 1px solid #25364a;
}

.header-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.back-button {
  flex: 0 0 auto;
  color: #8fa2b8;
}

.back-button:hover {
  color: #ffffff;
}

.activity-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  color: #c084fc;
  background: rgb(192 132 252 / 12%);
  border: 1px solid rgb(192 132 252 / 28%);
  border-radius: 12px;
}

.activity-icon .q-icon {
  font-size: 25px;
}

.header-copy {
  min-width: 0;
}

.header-copy h1 {
  margin: 0;
  color: #edf4fb;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
}

.header-copy p {
  margin: 4px 0 0;
  overflow: hidden;
  color: #8191a5;
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-activity-button {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 14px;
  color: #ffffff;
  background: #2563eb;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
}

.content-area {
  display: grid;
  min-height: 0;
  flex: 1;
  place-items: center;
  padding: 28px;
}

.empty-state {
  display: flex;
  width: min(100%, 540px);
  align-items: center;
  flex-direction: column;
  padding: 38px 28px;
  text-align: center;
}

.empty-icon {
  display: grid;
  width: 82px;
  height: 82px;
  place-items: center;
  margin-bottom: 18px;
  color: #c084fc;
  background: rgb(192 132 252 / 10%);
  border: 1px solid rgb(192 132 252 / 24%);
  border-radius: 22px;
}

.empty-icon .q-icon {
  font-size: 42px;
}

.empty-state h2 {
  margin: 0;
  color: #edf4fb;
  font-size: 21px;
  font-weight: 700;
}

.empty-state p {
  max-width: 460px;
  margin: 10px 0 22px;
  color: #8191a5;
  font-size: 12px;
  line-height: 1.65;
}

.empty-action {
  min-height: 40px;
  padding: 0 18px;
  color: #ffffff;
  background: #2563eb;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 700px) {
  .hidden-image-page {
    padding: 10px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .new-activity-button {
    width: 100%;
  }

  .header-copy p {
    white-space: normal;
  }

  .content-area {
    padding: 18px;
  }
}
</style>