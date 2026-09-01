<template>
  <section class="upcoming-panel">
    <header class="upcoming-summary">
      <div class="summary-icon"><q-icon name="calendar_month" /></div>
      <div>
        <strong>{{ pendingActivities.length }}</strong>
        <span>actividades pendientes</span>
        <small>Desde hoy hasta el 31 de diciembre</small>
      </div>
      <q-btn
        flat
        round
        dense
        icon="open_in_new"
        color="light-blue-3"
        aria-label="Abrir calendario"
        @click="openCalendar()"
      >
        <q-tooltip>Abrir calendario completo</q-tooltip>
      </q-btn>
    </header>

    <div v-if="pendingActivities.length" class="upcoming-list">
      <button
        v-for="activity in pendingActivities"
        :key="activity.id"
        type="button"
        class="upcoming-item"
        :style="{ '--activity-accent': categoryColor(activity.category) }"
        @click="openCalendar(activity.id)"
      >
        <span class="activity-date">
          <strong>{{ dayNumber(activity.date) }}</strong>
          <small>{{ shortMonth(activity.date) }}</small>
        </span>
        <span class="activity-copy">
          <strong>{{ activity.title }}</strong>
          <small>
            {{ activityTime(activity) }}
            <template v-if="activity.location"> · {{ activity.location }}</template>
          </small>
        </span>
        <q-icon name="chevron_right" />
      </button>
    </div>

    <div v-else class="upcoming-empty">
      <q-icon name="event_available" />
      <strong>No hay actividades pendientes</strong>
      <span>Tu calendario está libre hasta finalizar el año.</span>
      <q-btn flat no-caps color="primary" label="Abrir calendario" @click="openCalendar()" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import type { CalendarActivity } from '../shared/calendar';
import { useCalendarActivitiesStore } from '../stores/calendar-activities';

const router = useRouter();
const calendarStore = useCalendarActivitiesStore();
const { activities, categories } = storeToRefs(calendarStore);

const today = new Date();
const todayKey = localDateKey(today);
const yearEndKey = `${today.getFullYear()}-12-31`;

const pendingActivities = computed(() =>
  activities.value
    .filter(
      (activity) =>
        activity.status === 'pending' &&
        (activity.endDate || activity.date) >= todayKey &&
        activity.date <= yearEndKey,
    )
    .sort((first, second) =>
      `${first.date}T${first.startTime}`.localeCompare(`${second.date}T${second.startTime}`),
    ),
);

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayNumber(date: string): number {
  return Number(date.slice(8, 10));
}

function shortMonth(date: string): string {
  return new Intl.DateTimeFormat('es-DO', { month: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '');
}

function activityTime(activity: CalendarActivity): string {
  if (activity.allDay) return 'Todo el día';
  return `${activity.startTime || 'Hora pendiente'}${activity.endTime ? `–${activity.endTime}` : ''}`;
}

function categoryColor(categoryId: string): string {
  return categories.value.find((category) => category.id === categoryId)?.color ?? '#38bdf8';
}

function openCalendar(activityId?: string): void {
  void router.push({ path: '/calendario', query: activityId ? { activity: activityId } : {} });
}
</script>

<style scoped>
.upcoming-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.upcoming-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 11px;
  background:
    radial-gradient(circle at 90% 0%, rgb(56 189 248 / 18%), transparent 42%),
    linear-gradient(135deg, #152a3d, #101d2b);
  border: 1px solid #2c455d;
  border-radius: 10px;
}

.summary-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: #7dd3fc;
  background: rgb(14 116 144 / 22%);
  border-radius: 9px;
  font-size: 20px;
}

.upcoming-summary > div:nth-child(2) {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 6px;
}

.upcoming-summary strong {
  color: #f4f9ff;
  font-size: 22px;
  line-height: 1;
}

.upcoming-summary span {
  color: #c5d5e4;
  font-size: 10px;
  font-weight: 700;
}

.upcoming-summary small {
  grid-column: 1 / -1;
  margin-top: 4px;
  color: #71879b;
  font-size: 8px;
}

.upcoming-list {
  min-height: 0;
  margin-top: 8px;
  overflow-y: auto;
}

.upcoming-item {
  display: grid;
  width: 100%;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  margin-bottom: 5px;
  padding: 7px;
  color: #8195a8;
  background: #101c29;
  border: 1px solid #22364a;
  border-left: 3px solid var(--activity-accent);
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: 150ms ease;
}

.upcoming-item:hover {
  background: #17293b;
  border-color: color-mix(in srgb, var(--activity-accent) 55%, #314b63);
  transform: translateX(2px);
}

.activity-date {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: white;
  background: color-mix(in srgb, var(--activity-accent) 25%, #183047);
  border-radius: 7px;
}

.activity-date strong {
  font-size: 15px;
  line-height: 1;
}

.activity-date small {
  margin-top: 2px;
  font-size: 7px;
  text-transform: uppercase;
}

.activity-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.activity-copy strong,
.activity-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-copy strong {
  color: #dce7f1;
  font-size: 10px;
}

.activity-copy small {
  margin-top: 4px;
  color: #71869a;
  font-size: 8px;
}

.upcoming-empty {
  display: flex;
  min-height: 150px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #64798d;
  text-align: center;
}

.upcoming-empty > .q-icon {
  color: #4f7898;
  font-size: 34px;
}

.upcoming-empty strong {
  margin-top: 8px;
  color: #adc0d1;
  font-size: 11px;
}

.upcoming-empty span {
  max-width: 220px;
  margin: 4px 0 5px;
  font-size: 8px;
}
</style>
