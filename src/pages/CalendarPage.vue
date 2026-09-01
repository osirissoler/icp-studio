<template>
  <q-page class="calendar-page">
    <header class="calendar-header">
      <div class="calendar-heading">
        <button type="button" class="back-button" @click="router.push('/herramientas')">
          <q-icon name="arrow_back" />
        </button>
        <span class="calendar-heading-icon"><q-icon name="calendar_month" /></span>
        <div>
          <span class="calendar-eyebrow">Herramientas · Planificación anual</span>
          <h1>Calendario de actividades</h1>
          <p>Organiza y comunica con claridad todas las actividades de la iglesia.</p>
        </div>
      </div>

      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="add"
        label="Nueva actividad"
        class="new-activity-button"
        @click="openCreateActivity()"
      />
    </header>

    <section class="calendar-summary" aria-label="Resumen anual">
      <article class="summary-card">
        <span class="summary-icon summary-icon--blue"><q-icon name="event_note" /></span>
        <div>
          <strong>{{ yearActivities.length }}</strong
          ><small>Actividades en {{ year }}</small>
        </div>
      </article>
      <article class="summary-card">
        <span class="summary-icon summary-icon--green"><q-icon name="verified" /></span>
        <div>
          <strong>{{ confirmedActivities }}</strong
          ><small>Actividades confirmadas</small>
        </div>
      </article>
      <article class="summary-card">
        <span class="summary-icon summary-icon--purple"><q-icon name="date_range" /></span>
        <div>
          <strong>{{ activeMonths }}</strong
          ><small>Meses con planificación</small>
        </div>
      </article>
      <article class="summary-card summary-card--next">
        <span class="summary-icon summary-icon--amber"><q-icon name="upcoming" /></span>
        <div>
          <strong>{{ nextActivity?.title ?? 'Sin actividad próxima' }}</strong>
          <small>{{
            nextActivity ? activityDateLabel(nextActivity) : 'Agenda la primera actividad'
          }}</small>
        </div>
      </article>
    </section>

    <div class="calendar-layout">
      <aside class="calendar-sidebar">
        <q-input
          v-model="searchText"
          dark
          outlined
          dense
          clearable
          placeholder="Buscar una actividad..."
          class="calendar-search"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>

        <section class="sidebar-section">
          <header><strong>Categorías</strong><small>Filtrar calendario</small></header>
          <div class="category-list">
            <button
              type="button"
              class="category-filter"
              :class="{ 'category-filter--active': activeCategory === 'all' }"
              @click="activeCategory = 'all'"
            >
              <span class="category-dot category-dot--all"></span>
              <span>Todas</span>
              <small>{{ yearActivities.length }}</small>
            </button>
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              class="category-filter"
              :class="{ 'category-filter--active': activeCategory === category.id }"
              @click="activeCategory = category.id"
            >
              <span class="category-dot" :style="{ backgroundColor: category.color }"></span>
              <span>{{ category.label }}</span>
              <small>{{ categoryCount(category.id) }}</small>
            </button>
          </div>
        </section>

        <section class="sidebar-section upcoming-section">
          <header>
            <strong>Próximas actividades</strong><small>{{ upcomingActivities.length }}</small>
          </header>
          <div v-if="upcomingActivities.length" class="upcoming-list">
            <button
              v-for="activity in upcomingActivities"
              :key="activity.id"
              type="button"
              class="upcoming-card"
              @click="openEditActivity(activity)"
            >
              <span
                class="upcoming-date"
                :style="{ '--category-color': categoryInfo(activity.category).color }"
              >
                <b>{{ dayNumber(activity.date) }}</b>
                <small>{{ shortMonth(activity.date) }}</small>
              </span>
              <span class="upcoming-copy">
                <b>{{ activity.title }}</b>
                <small>
                  {{ activity.allDay ? 'Todo el día' : activity.startTime || 'Hora pendiente' }}
                  <template v-if="activity.location"> · {{ activity.location }}</template>
                </small>
              </span>
              <q-icon name="chevron_right" />
            </button>
          </div>
          <div v-else class="upcoming-empty">
            <q-icon name="event_available" />
            <span>No hay actividades próximas.</span>
          </div>
        </section>
      </aside>

      <main class="year-calendar">
        <header class="year-toolbar">
          <div>
            <span>Planificación general</span>
            <strong>{{ year }}</strong>
          </div>
          <div class="year-actions">
            <q-btn flat dense no-caps color="blue-grey-3" label="Hoy" @click="goToCurrentYear" />
            <q-btn flat round dense icon="chevron_left" @click="year -= 1">
              <q-tooltip>Año anterior</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="chevron_right" @click="year += 1">
              <q-tooltip>Año siguiente</q-tooltip>
            </q-btn>
          </div>
        </header>

        <div class="year-progress-row">
          <span>Progreso del año</span>
          <q-linear-progress
            :value="yearProgress"
            rounded
            color="primary"
            track-color="blue-grey-9"
          />
          <small>{{ Math.round(yearProgress * 100) }}%</small>
        </div>

        <div class="months-grid">
          <article
            v-for="month in months"
            :key="month.index"
            class="month-card"
            :class="{ 'month-card--current': month.isCurrentMonth }"
          >
            <header class="month-header">
              <div>
                <strong>{{ month.label }}</strong>
                <span v-if="month.isCurrentMonth">Mes actual</span>
              </div>
              <small
                >{{ month.activityCount }}
                {{ month.activityCount === 1 ? 'actividad' : 'actividades' }}</small
              >
            </header>

            <div class="month-weekdays" aria-hidden="true">
              <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
            </div>

            <div class="month-days">
              <span
                v-for="(cell, cellIndex) in month.days"
                :key="cell?.dateKey ?? `empty-${cellIndex}`"
                class="day-cell-wrapper"
              >
                <button
                  v-if="cell"
                  type="button"
                  class="day-cell"
                  :class="{
                    'day-cell--today': cell.isToday,
                    'day-cell--busy': activitiesForDay(cell.dateKey).length > 0,
                  }"
                  :aria-label="`Agendar actividad el ${cell.day} de ${month.label}`"
                  @click="openCreateActivity(cell.dateKey)"
                >
                  <span>{{ cell.day }}</span>
                  <i v-if="activitiesForDay(cell.dateKey).length" class="activity-dots">
                    <b
                      v-for="activity in activitiesForDay(cell.dateKey).slice(0, 3)"
                      :key="activity.id"
                      :style="{ backgroundColor: categoryInfo(activity.category).color }"
                    ></b>
                  </i>
                  <q-tooltip v-if="activitiesForDay(cell.dateKey).length">
                    {{
                      activitiesForDay(cell.dateKey)
                        .map((activity) => activity.title)
                        .join(' · ')
                    }}
                  </q-tooltip>
                </button>
              </span>
            </div>
          </article>
        </div>
      </main>
    </div>

    <q-dialog v-model="activityDialogOpen" persistent>
      <q-card class="activity-dialog">
        <q-card-section class="activity-dialog-header">
          <div>
            <span class="dialog-icon"><q-icon name="event" /></span>
            <div>
              <strong>{{ editingActivityId ? 'Editar actividad' : 'Nueva actividad' }}</strong>
              <small>Completa la información que verán los miembros.</small>
            </div>
          </div>
          <q-btn v-close-popup flat round dense icon="close" aria-label="Cerrar" />
        </q-card-section>

        <q-separator dark />

        <q-card-section class="activity-dialog-body">
          <div class="activity-form">
            <q-input
              v-model="activityForm.title"
              dark
              outlined
              dense
              autofocus
              label="Nombre de la actividad *"
              maxlength="120"
            >
              <template #prepend><q-icon name="title" /></template>
            </q-input>

            <div class="form-grid form-grid--date">
              <q-input v-model="activityForm.date" dark outlined dense type="date" label="Fecha *">
                <template #prepend><q-icon name="calendar_today" /></template>
              </q-input>
              <q-toggle v-model="activityForm.allDay" dark color="primary" label="Todo el día" />
              <q-input
                v-if="!activityForm.allDay"
                v-model="activityForm.startTime"
                dark
                outlined
                dense
                type="time"
                label="Inicia"
              />
              <q-input
                v-if="!activityForm.allDay"
                v-model="activityForm.endTime"
                dark
                outlined
                dense
                type="time"
                label="Finaliza"
              />
            </div>

            <div class="form-grid">
              <q-select
                v-model="activityForm.category"
                dark
                outlined
                dense
                emit-value
                map-options
                :options="categoryOptions"
                label="Categoría"
              >
                <template #prepend><q-icon name="category" /></template>
              </q-select>
              <q-select
                v-model="activityForm.status"
                dark
                outlined
                dense
                emit-value
                map-options
                :options="statusOptions"
                label="Estado"
              >
                <template #prepend><q-icon name="task_alt" /></template>
              </q-select>
            </div>

            <div class="form-grid">
              <q-input v-model="activityForm.location" dark outlined dense label="Lugar">
                <template #prepend><q-icon name="location_on" /></template>
              </q-input>
              <q-input v-model="activityForm.responsible" dark outlined dense label="Responsable">
                <template #prepend><q-icon name="person" /></template>
              </q-input>
            </div>

            <q-input
              v-model="activityForm.description"
              dark
              outlined
              type="textarea"
              autogrow
              label="Descripción e información importante"
              maxlength="1500"
            />
          </div>

          <aside class="activity-image-panel">
            <div v-if="activityForm.imageUrl" class="activity-image-preview">
              <img :src="activityForm.imageUrl" alt="Imagen de la actividad" />
              <q-btn
                flat
                round
                dense
                icon="delete_outline"
                color="red-3"
                class="remove-image-button"
                aria-label="Quitar imagen"
                @click="activityForm.imageUrl = ''"
              />
            </div>
            <button v-else type="button" class="activity-image-empty" @click="chooseActivityImage">
              <q-icon name="add_photo_alternate" />
              <strong>Agregar imagen</strong>
              <span>Portada, invitación o anuncio de la actividad.</span>
            </button>
            <q-btn
              v-if="activityForm.imageUrl"
              outline
              no-caps
              color="blue-grey-4"
              icon="image"
              label="Cambiar imagen"
              @click="chooseActivityImage"
            />

            <div class="future-live-note">
              <q-icon name="live_tv" />
              <div>
                <strong>Preparado para En vivo</strong>
                <span
                  >En la siguiente etapa podrás presentar esta actividad y avanzar a la
                  próxima.</span
                >
              </div>
            </div>
          </aside>
        </q-card-section>

        <q-separator dark />

        <q-card-actions align="between" class="activity-dialog-actions">
          <q-btn
            v-if="editingActivityId"
            flat
            no-caps
            color="red-4"
            icon="delete_outline"
            label="Eliminar"
            @click="deleteCurrentActivity"
          />
          <span v-else></span>
          <div>
            <q-btn v-close-popup flat no-caps color="blue-grey-4" label="Cancelar" />
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="save"
              label="Guardar actividad"
              @click="saveActivity"
            />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { showAppNotification } from '../services/app-notification';
import {
  CALENDAR_ACTIVITY_CATEGORIES,
  type CalendarActivity,
  type CalendarActivityCategory,
  type CalendarActivityStatus,
} from '../shared/calendar';
import { useCalendarActivitiesStore } from '../stores/calendar-activities';

interface CalendarDay {
  day: number;
  dateKey: string;
  isToday: boolean;
}

interface ActivityForm {
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  category: CalendarActivityCategory;
  status: CalendarActivityStatus;
  location: string;
  responsible: string;
  description: string;
  imageUrl: string;
}

const router = useRouter();
const calendarStore = useCalendarActivitiesStore();
const { activities } = storeToRefs(calendarStore);
const categories = CALENDAR_ACTIVITY_CATEGORIES;
const now = new Date();
const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
const year = ref(now.getFullYear());
const searchText = ref('');
const activeCategory = ref<'all' | CalendarActivityCategory>('all');
const activityDialogOpen = ref(false);
const editingActivityId = ref<string | null>(null);
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const activityForm = reactive<ActivityForm>(emptyActivityForm(todayKey));

const categoryOptions = categories.map((category) => ({
  label: category.label,
  value: category.id,
}));

const statusOptions: Array<{ label: string; value: CalendarActivityStatus }> = [
  { label: 'Planificada', value: 'planned' },
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'Realizada', value: 'completed' },
  { label: 'Cancelada', value: 'cancelled' },
];

const yearActivities = computed(() =>
  activities.value.filter((activity) => activity.date.startsWith(`${year.value}-`)),
);

const filteredActivities = computed(() => {
  const query = searchText.value.trim().toLocaleLowerCase('es');
  return yearActivities.value.filter((activity) => {
    if (activeCategory.value !== 'all' && activity.category !== activeCategory.value) return false;
    if (!query) return true;
    return [activity.title, activity.location, activity.responsible, activity.description].some(
      (value) => value.toLocaleLowerCase('es').includes(query),
    );
  });
});

const confirmedActivities = computed(
  () => yearActivities.value.filter((activity) => activity.status === 'confirmed').length,
);

const activeMonths = computed(
  () => new Set(yearActivities.value.map((activity) => activity.date.slice(0, 7))).size,
);

const upcomingActivities = computed(() =>
  activities.value
    .filter((activity) => activity.date >= todayKey && activity.status !== 'cancelled')
    .sort(compareActivities)
    .slice(0, 6),
);

const nextActivity = computed(() => upcomingActivities.value[0] ?? null);

const yearProgress = computed(() => {
  if (year.value < now.getFullYear()) return 1;
  if (year.value > now.getFullYear()) return 0;
  const start = new Date(year.value, 0, 1).getTime();
  const end = new Date(year.value + 1, 0, 1).getTime();
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
});

const months = computed(() =>
  monthNames.map((label, index) => {
    const daysInMonth = new Date(year.value, index + 1, 0).getDate();
    const firstWeekday = (new Date(year.value, index, 1).getDay() + 6) % 7;
    const days = Array.from({ length: 42 }, (_, cellIndex): CalendarDay | null => {
      const day = cellIndex - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return null;
      const key = dateKey(year.value, index, day);
      return { day, dateKey: key, isToday: key === todayKey };
    });

    return {
      index,
      label,
      days,
      activityCount: filteredActivities.value.filter((activity) =>
        activity.date.startsWith(`${year.value}-${String(index + 1).padStart(2, '0')}-`),
      ).length,
      isCurrentMonth: year.value === now.getFullYear() && index === now.getMonth(),
    };
  }),
);

function emptyActivityForm(selectedDate: string): ActivityForm {
  return {
    title: '',
    date: selectedDate,
    allDay: false,
    startTime: '09:00',
    endTime: '11:00',
    category: 'worship',
    status: 'planned',
    location: '',
    responsible: '',
    description: '',
    imageUrl: '',
  };
}

function dateKey(selectedYear: number, monthIndex: number, day: number): string {
  return `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function compareActivities(first: CalendarActivity, second: CalendarActivity): number {
  return `${first.date}T${first.startTime}`.localeCompare(`${second.date}T${second.startTime}`);
}

function categoryInfo(categoryId: CalendarActivityCategory) {
  return categories.find((category) => category.id === categoryId) ?? categories[0];
}

function activitiesForDay(selectedDate: string): CalendarActivity[] {
  return filteredActivities.value
    .filter((activity) => activity.date === selectedDate)
    .sort(compareActivities);
}

function categoryCount(categoryId: CalendarActivityCategory): number {
  return yearActivities.value.filter((activity) => activity.category === categoryId).length;
}

function dayNumber(selectedDate: string): string {
  return selectedDate.slice(8, 10);
}

function shortMonth(selectedDate: string): string {
  return monthNames[Number(selectedDate.slice(5, 7)) - 1]?.slice(0, 3) ?? '';
}

function activityDateLabel(activity: CalendarActivity): string {
  const [selectedYear, selectedMonth, selectedDay] = activity.date.split('-').map(Number);
  const date = new Date(selectedYear ?? year.value, (selectedMonth ?? 1) - 1, selectedDay ?? 1);
  const label = new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  return activity.allDay ? label : `${label} · ${activity.startTime || 'Hora pendiente'}`;
}

function goToCurrentYear(): void {
  year.value = now.getFullYear();
}

function openCreateActivity(
  selectedDate = dateKey(year.value, now.getMonth(), now.getDate()),
): void {
  editingActivityId.value = null;
  Object.assign(activityForm, emptyActivityForm(selectedDate));
  activityDialogOpen.value = true;
}

function openEditActivity(activity: CalendarActivity): void {
  editingActivityId.value = activity.id;
  Object.assign(activityForm, {
    title: activity.title,
    date: activity.date,
    allDay: activity.allDay,
    startTime: activity.startTime,
    endTime: activity.endTime,
    category: activity.category,
    status: activity.status,
    location: activity.location,
    responsible: activity.responsible,
    description: activity.description,
    imageUrl: activity.imageUrl,
  });
  activityDialogOpen.value = true;
}

async function chooseActivityImage(): Promise<void> {
  try {
    const images = (await window.icpStudio?.media.select('image')) ?? [];
    const image = images[0];
    if (image) activityForm.imageUrl = image.url;
  } catch (error) {
    showAppNotification(
      error instanceof Error ? error.message : 'No fue posible agregar la imagen.',
      'negative',
      'error_outline',
    );
  }
}

function saveActivity(): void {
  const title = activityForm.title.trim();
  if (!title || !activityForm.date) {
    showAppNotification('Escribe el nombre y la fecha de la actividad.', 'warning', 'event_busy');
    return;
  }

  const existing = editingActivityId.value
    ? activities.value.find((activity) => activity.id === editingActivityId.value)
    : null;
  const timestamp = new Date().toISOString();
  const activity: CalendarActivity = {
    id: existing?.id ?? crypto.randomUUID(),
    title,
    date: activityForm.date,
    allDay: activityForm.allDay,
    startTime: activityForm.allDay ? '' : activityForm.startTime,
    endTime: activityForm.allDay ? '' : activityForm.endTime,
    category: activityForm.category,
    status: activityForm.status,
    location: activityForm.location.trim(),
    responsible: activityForm.responsible.trim(),
    description: activityForm.description.trim(),
    imageUrl: activityForm.imageUrl,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (!calendarStore.saveActivity(activity)) {
    showAppNotification(
      'No fue posible guardar la actividad en esta computadora.',
      'negative',
      'error',
    );
    return;
  }

  year.value = Number(activity.date.slice(0, 4));
  activityDialogOpen.value = false;
  showAppNotification(
    existing ? 'La actividad fue actualizada.' : 'La actividad fue agregada al calendario.',
    'positive',
    'event_available',
  );
}

function deleteCurrentActivity(): void {
  const activityId = editingActivityId.value;
  if (!activityId || !window.confirm('¿Quieres eliminar esta actividad del calendario?')) return;
  if (!calendarStore.removeActivity(activityId)) {
    showAppNotification('No fue posible eliminar la actividad.', 'negative', 'error');
    return;
  }
  activityDialogOpen.value = false;
  showAppNotification('La actividad fue eliminada.', 'positive', 'delete_outline');
}
</script>

<style scoped>
.calendar-page {
  min-height: 100%;
  padding: 20px;
  color: #e7eef7;
  background: radial-gradient(circle at 78% -15%, rgb(31 82 123 / 22%), transparent 34%), #0b121b;
}

.calendar-header,
.calendar-heading,
.calendar-heading > div,
.calendar-summary,
.summary-card,
.year-toolbar,
.year-actions,
.activity-dialog-header,
.activity-dialog-header > div,
.activity-dialog-actions > div {
  display: flex;
  align-items: center;
}

.calendar-header {
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.calendar-heading {
  min-width: 0;
  gap: 12px;
}

.calendar-heading > div {
  min-width: 0;
  align-items: flex-start;
  flex-direction: column;
}

.back-button {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  color: #9badc1;
  background: #111c29;
  border: 1px solid #2a3b4f;
  border-radius: 9px;
  cursor: pointer;
}

.back-button:hover {
  color: #dbeafe;
  border-color: #4d7199;
}

.calendar-heading-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  color: #6ee7b7;
  background: #10352f;
  border: 1px solid #1d6252;
  border-radius: 13px;
  font-size: 25px;
}

.calendar-eyebrow {
  color: #6e839a;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.calendar-heading h1 {
  margin: 1px 0 0;
  font-size: 22px;
  line-height: 1.2;
}

.calendar-heading p {
  margin: 3px 0 0;
  color: #8190a3;
  font-size: 11px;
}

.new-activity-button {
  min-height: 39px;
  border-radius: 9px;
}

.calendar-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 0.72fr)) minmax(260px, 1.35fr);
  gap: 10px;
  margin-bottom: 12px;
}

.summary-card {
  min-width: 0;
  gap: 10px;
  padding: 11px 12px;
  background: #101a27;
  border: 1px solid #243448;
  border-radius: 10px;
}

.summary-card > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.summary-card strong {
  overflow: hidden;
  color: #e8f0f9;
  font-size: 17px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-card--next strong {
  font-size: 12px;
}

.summary-card small {
  margin-top: 2px;
  color: #718196;
  font-size: 9px;
}

.summary-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 9px;
  font-size: 19px;
}

.summary-icon--blue {
  color: #93c5fd;
  background: #142f4c;
}
.summary-icon--green {
  color: #6ee7b7;
  background: #12372f;
}
.summary-icon--purple {
  color: #c4b5fd;
  background: #2c244d;
}
.summary-icon--amber {
  color: #fcd34d;
  background: #3b2e16;
}

.calendar-layout {
  display: grid;
  min-height: calc(100vh - 210px);
  grid-template-columns: 235px minmax(0, 1fr);
  gap: 12px;
}

.calendar-sidebar,
.year-calendar {
  min-width: 0;
  background: #0f1824;
  border: 1px solid #243447;
  border-radius: 11px;
}

.calendar-sidebar {
  padding: 12px;
}

.calendar-search {
  margin-bottom: 15px;
}

.sidebar-section + .sidebar-section {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 1px solid #223143;
}

.sidebar-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
}

.sidebar-section > header strong {
  color: #cdd8e5;
  font-size: 11px;
}

.sidebar-section > header small {
  color: #66768b;
  font-size: 8px;
}

.category-list,
.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.category-filter {
  display: grid;
  min-height: 34px;
  align-items: center;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 8px;
  padding: 5px 8px;
  color: #8899ad;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 10px;
  text-align: left;
  cursor: pointer;
}

.category-filter:hover,
.category-filter--active {
  color: #dce8f5;
  background: #152438;
  border-color: #2d4968;
}

.category-filter small {
  color: #65778c;
}

.category-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.category-dot--all {
  background: #93c5fd;
  box-shadow: 0 0 0 3px rgb(147 197 253 / 12%);
}

.upcoming-card {
  display: grid;
  min-width: 0;
  align-items: center;
  grid-template-columns: 38px minmax(0, 1fr) 16px;
  gap: 7px;
  padding: 7px 5px;
  color: #b8c6d7;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}

.upcoming-card:hover {
  background: #142237;
  border-color: #2c435e;
}

.upcoming-date {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--category-color);
  background: color-mix(in srgb, var(--category-color) 13%, #101b29);
  border-radius: 8px;
}

.upcoming-date b {
  font-size: 13px;
  line-height: 1;
}

.upcoming-date small {
  margin-top: 2px;
  font-size: 7px;
  text-transform: uppercase;
}

.upcoming-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.upcoming-copy b,
.upcoming-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upcoming-copy b {
  font-size: 9px;
}

.upcoming-copy small {
  margin-top: 2px;
  color: #697b91;
  font-size: 7px;
}

.upcoming-empty {
  display: flex;
  min-height: 94px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  color: #65778c;
  border: 1px dashed #2a3c51;
  border-radius: 8px;
  font-size: 9px;
}

.upcoming-empty .q-icon {
  font-size: 25px;
}

.year-calendar {
  padding: 12px;
}

.year-toolbar {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.year-toolbar > div:first-child {
  display: flex;
  flex-direction: column;
}

.year-toolbar span {
  color: #718196;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.year-toolbar strong {
  font-size: 20px;
}

.year-actions {
  gap: 2px;
}

.year-progress-row {
  display: grid;
  align-items: center;
  grid-template-columns: auto minmax(100px, 1fr) 30px;
  gap: 8px;
  margin-bottom: 12px;
  color: #65778c;
  font-size: 8px;
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(190px, 1fr));
  gap: 9px;
}

.month-card {
  min-width: 0;
  padding: 9px;
  background: #111c29;
  border: 1px solid #26384d;
  border-radius: 9px;
}

.month-card--current {
  background: linear-gradient(150deg, #12243a, #111c29 60%);
  border-color: #37638e;
  box-shadow: 0 0 0 1px rgb(96 165 250 / 8%);
}

.month-header {
  display: flex;
  min-height: 32px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  padding: 0 2px 6px;
}

.month-header > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.month-header strong {
  font-size: 11px;
}

.month-header span {
  color: #60a5fa;
  font-size: 6px;
  text-transform: uppercase;
}

.month-header small {
  color: #63758a;
  font-size: 7px;
}

.month-weekdays,
.month-days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.month-weekdays {
  margin-bottom: 2px;
}

.month-weekdays span {
  color: #52657a;
  font-size: 7px;
  text-align: center;
}

.day-cell-wrapper {
  display: block;
  min-width: 0;
  aspect-ratio: 1.15;
}

.day-cell {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  padding: 0;
  place-items: center;
  color: #8798aa;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  font-size: 8px;
  cursor: pointer;
}

.day-cell:hover {
  color: #dbeafe;
  background: #1a2b40;
  border-color: #35516f;
}

.day-cell--busy {
  color: #d5e2ef;
  background: #152335;
}

.day-cell--today {
  color: #eff7ff;
  background: #1f5e96;
  border-color: #4a93ce;
  font-weight: 700;
}

.activity-dots {
  position: absolute;
  right: 2px;
  bottom: 2px;
  left: 2px;
  display: flex;
  justify-content: center;
  gap: 1px;
}

.activity-dots b {
  width: 3px;
  height: 3px;
  border-radius: 50%;
}

.activity-dialog {
  width: min(880px, 94vw);
  max-width: 94vw;
  color: #e7eef7;
  background: #101925;
  border: 1px solid #304158;
  border-radius: 12px;
}

.activity-dialog-header {
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
}

.activity-dialog-header > div {
  gap: 10px;
}

.activity-dialog-header > div > div {
  display: flex;
  flex-direction: column;
}

.activity-dialog-header strong {
  font-size: 14px;
}

.activity-dialog-header small {
  color: #7c8da2;
  font-size: 9px;
}

.dialog-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: #6ee7b7;
  background: #14352f;
  border-radius: 9px;
  font-size: 20px;
}

.activity-dialog-body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(220px, 0.65fr);
  gap: 16px;
  max-height: 68vh;
  padding: 16px;
  overflow-y: auto;
}

.activity-form,
.activity-image-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 11px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.form-grid--date {
  grid-template-columns: minmax(155px, 1.2fr) auto minmax(105px, 0.7fr) minmax(105px, 0.7fr);
  align-items: center;
}

.activity-image-preview,
.activity-image-empty {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px solid #30445c;
  border-radius: 10px;
}

.activity-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-button {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgb(20 25 34 / 82%);
}

.activity-image-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
  padding: 20px;
  color: #8294a9;
  background: #0d1621;
  border-style: dashed;
  text-align: center;
  cursor: pointer;
}

.activity-image-empty:hover {
  color: #bfdbfe;
  background: #122337;
  border-color: #47709a;
}

.activity-image-empty .q-icon {
  color: #60a5fa;
  font-size: 34px;
}

.activity-image-empty strong {
  font-size: 11px;
}

.activity-image-empty span {
  color: #66788d;
  font-size: 8px;
  line-height: 1.4;
}

.future-live-note {
  display: flex;
  gap: 9px;
  padding: 10px;
  color: #8092a7;
  background: #111f2f;
  border: 1px solid #2a4058;
  border-radius: 9px;
}

.future-live-note > .q-icon {
  flex: 0 0 auto;
  color: #93c5fd;
  font-size: 21px;
}

.future-live-note > div {
  display: flex;
  flex-direction: column;
}

.future-live-note strong {
  color: #b9c9da;
  font-size: 9px;
}

.future-live-note span {
  margin-top: 3px;
  font-size: 8px;
  line-height: 1.4;
}

.activity-dialog-actions {
  padding: 9px 12px;
}

.activity-dialog-actions > div {
  gap: 7px;
}

@media (max-width: 1260px) {
  .months-grid {
    grid-template-columns: repeat(3, minmax(190px, 1fr));
  }

  .calendar-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .calendar-page {
    padding: 12px;
  }

  .calendar-layout {
    grid-template-columns: 1fr;
  }

  .calendar-sidebar {
    display: grid;
    grid-template-columns: minmax(180px, 0.8fr) minmax(240px, 1.2fr);
    gap: 12px;
  }

  .calendar-search {
    grid-column: 1 / -1;
    margin: 0;
  }

  .sidebar-section + .sidebar-section {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .months-grid {
    grid-template-columns: repeat(2, minmax(190px, 1fr));
  }

  .activity-dialog-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .calendar-header {
    align-items: stretch;
    flex-direction: column;
  }

  .calendar-heading-icon,
  .calendar-heading p {
    display: none;
  }

  .calendar-summary,
  .months-grid,
  .calendar-sidebar,
  .form-grid,
  .form-grid--date {
    grid-template-columns: 1fr;
  }

  .form-grid--date {
    align-items: stretch;
  }
}
</style>
