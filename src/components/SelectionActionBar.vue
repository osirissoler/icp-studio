<template>
  <Transition name="selection-bar">
    <div v-if="count > 0" class="selection-action-bar" role="toolbar" aria-label="Selección">
      <div class="selection-count">
        <q-icon name="check_circle" />
        <strong>{{ count }}</strong>
        <span>{{ count === 1 ? 'seleccionado' : 'seleccionados' }}</span>
      </div>

      <q-space />

      <q-btn
        flat
        dense
        no-caps
        size="sm"
        color="blue-grey-3"
        icon="done_all"
        :label="allSelected ? 'Quitar todos' : 'Todos'"
        @click="$emit('toggle-all')"
      />
      <q-btn
        flat
        dense
        no-caps
        size="sm"
        color="blue-grey-3"
        label="Cancelar"
        @click="$emit('cancel')"
      />
      <q-btn
        unelevated
        round
        dense
        size="sm"
        color="red-5"
        icon="delete_outline"
        :loading="deleting"
        aria-label="Eliminar seleccionados"
        @click="$emit('delete')"
      >
        <q-tooltip>Eliminar seleccionados</q-tooltip>
      </q-btn>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  count: number;
  allSelected: boolean;
  deleting?: boolean;
}>();

defineEmits<{
  'toggle-all': [];
  cancel: [];
  delete: [];
}>();
</script>

<style scoped>
.selection-action-bar {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 5px 7px;
  color: #cbd8e8;
  background: #15253a;
  border: 1px solid #315175;
  border-radius: 9px;
  box-shadow: 0 -8px 24px rgb(0 0 0 / 22%);
}

.selection-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #a9c9ef;
  font-size: 10px;
  white-space: nowrap;
}

.selection-count .q-icon {
  color: #60a5fa;
  font-size: 16px;
}

.selection-bar-enter-active,
.selection-bar-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.selection-bar-enter-from,
.selection-bar-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
