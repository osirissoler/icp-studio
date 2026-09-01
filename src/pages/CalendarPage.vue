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
          <p>Organiza, consulta y prepara las actividades que presentarás a la iglesia.</p>
        </div>
      </div>

      <div class="calendar-header-actions">
        <q-btn
          v-if="presentedActivity"
          unelevated
          no-caps
          color="red-6"
          icon="sensors"
          label="Control En vivo"
          class="live-control-button"
          @click="operatorPresentationOpen = true"
        />
        <q-btn
          outline
          no-caps
          color="blue-grey-3"
          icon="category"
          label="Categorías"
          @click="categoriesDialogOpen = true"
        />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add"
          label="Nueva actividad"
          @click="openCreateActivity()"
        />
      </div>
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
        <span class="summary-icon summary-icon--amber"><q-icon name="pending_actions" /></span>
        <div>
          <strong>{{ pendingActivities }}</strong
          ><small>Pendientes</small>
        </div>
      </article>
      <article class="summary-card">
        <span class="summary-icon summary-icon--green"><q-icon name="task_alt" /></span>
        <div>
          <strong>{{ completedActivities }}</strong
          ><small>Completadas</small>
        </div>
      </article>
      <article class="summary-card summary-card--next">
        <span class="summary-icon summary-icon--purple"><q-icon name="upcoming" /></span>
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
          <header>
            <div><strong>Categorías</strong><small>Filtrar calendario</small></div>
            <q-btn flat round dense size="sm" icon="settings" @click="categoriesDialogOpen = true">
              <q-tooltip>Administrar categorías</q-tooltip>
            </q-btn>
          </header>
          <div class="category-list">
            <button
              type="button"
              class="category-filter"
              :class="{ 'category-filter--active': activeCategory === 'all' }"
              @click="activeCategory = 'all'"
            >
              <span class="category-dot category-dot--all"></span><span>Todas</span>
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
              <span>{{ category.label }}</span
              ><small>{{ categoryCount(category.id) }}</small>
            </button>
          </div>
        </section>

        <section class="sidebar-section upcoming-section">
          <header>
            <div>
              <strong>Próximas actividades</strong><small>Haz clic para ver el detalle</small>
            </div>
            <span class="sidebar-count">{{ upcomingActivities.length }}</span>
          </header>
          <div v-if="upcomingActivities.length" class="upcoming-list">
            <button
              v-for="activity in upcomingActivities"
              :key="activity.id"
              type="button"
              class="upcoming-card"
              @click="openActivityDetail(activity)"
            >
              <span class="upcoming-date">
                <b>{{ dayNumber(activity.date) }}</b
                ><small>{{ shortMonth(activity.date) }}</small>
              </span>
              <span class="upcoming-copy">
                <b>{{ activity.title }}</b>
                <small
                  >{{ activity.allDay ? 'Todo el día' : activity.startTime || 'Hora pendiente'
                  }}<template v-if="activity.location"> · {{ activity.location }}</template></small
                >
              </span>
              <q-icon name="chevron_right" />
            </button>
          </div>
          <div v-else class="upcoming-empty">
            <q-icon name="event_available" /><span>No hay actividades próximas.</span>
          </div>
        </section>
      </aside>

      <main class="calendar-main">
        <header class="calendar-toolbar">
          <div class="period-title">
            <span>Planificación</span>
            <strong>{{ periodTitle }}</strong>
          </div>
          <div class="view-switcher" aria-label="Vista del calendario">
            <button
              v-for="option in viewOptions"
              :key="option.value"
              type="button"
              :class="{ active: viewMode === option.value }"
              @click="viewMode = option.value"
            >
              <q-icon :name="option.icon" />{{ option.label }}
            </button>
          </div>
          <div class="period-actions">
            <q-btn flat dense no-caps color="blue-grey-3" label="Hoy" @click="goToCurrentPeriod" />
            <q-btn flat round dense icon="chevron_left" @click="previousPeriod" />
            <q-btn flat round dense icon="chevron_right" @click="nextPeriod" />
          </div>
        </header>

        <div v-if="viewMode !== 'month'" class="year-progress-row">
          <span>Progreso del año</span>
          <q-linear-progress
            :value="yearProgress"
            rounded
            color="primary"
            track-color="blue-grey-9"
          />
          <small>{{ Math.round(yearProgress * 100) }}%</small>
        </div>

        <section v-if="viewMode === 'month'" class="large-month">
          <div class="large-month-weekdays" aria-hidden="true">
            <span v-for="weekday in fullWeekdays" :key="weekday">{{ weekday }}</span>
          </div>
          <div class="large-month-grid">
            <article
              v-for="(cell, cellIndex) in currentMonth.days"
              :key="cell?.dateKey ?? `empty-${cellIndex}`"
              class="large-day"
              :class="{
                'large-day--empty': !cell,
                'large-day--today': cell?.isToday,
                'large-day--busy': cell && activitiesForDay(cell.dateKey).length > 0,
              }"
              @click="cell && handleDayClick(cell.dateKey)"
            >
              <template v-if="cell">
                <header>
                  <span>{{ cell.day }}</span>
                  <small v-if="activitiesForDay(cell.dateKey).length">
                    {{ activitiesForDay(cell.dateKey).length }}
                  </small>
                </header>
                <div class="day-activity-list">
                  <button
                    v-for="activity in activitiesForDay(cell.dateKey).slice(0, 3)"
                    :key="activity.id"
                    type="button"
                    class="day-activity-chip"
                    :class="`day-activity-chip--${activity.status}`"
                    @click.stop="openActivityDetail(activity)"
                  >
                    <i :style="{ backgroundColor: categoryInfo(activity.category).color }"></i>
                    <span>{{ activity.startTime || 'Todo el día' }} · {{ activity.title }}</span>
                  </button>
                  <button
                    v-if="activitiesForDay(cell.dateKey).length > 3"
                    type="button"
                    class="more-activities"
                    @click.stop="openDayActivities(cell.dateKey)"
                  >
                    +{{ activitiesForDay(cell.dateKey).length - 3 }} más
                  </button>
                </div>
                <q-tooltip v-if="!activitiesForDay(cell.dateKey).length">Crear actividad</q-tooltip>
              </template>
            </article>
          </div>
        </section>

        <section v-else-if="viewMode === 'year'" class="months-grid">
          <article
            v-for="month in months"
            :key="month.index"
            class="month-card"
            :class="{ 'month-card--current': month.isCurrentMonth }"
          >
            <header class="month-header" @click="openMonth(month.index)">
              <div>
                <strong>{{ month.label }}</strong
                ><span v-if="month.isCurrentMonth">Mes actual</span>
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
                  @click="handleDayClick(cell.dateKey)"
                >
                  <span>{{ cell.day }}</span>
                  <i v-if="activitiesForDay(cell.dateKey).length" class="activity-count-dot">{{
                    activitiesForDay(cell.dateKey).length
                  }}</i>
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
        </section>

        <section v-else class="agenda-view">
          <header class="agenda-heading">
            <div>
              <strong>Agenda de {{ year }}</strong
              ><small>Lista cronológica de actividades</small>
            </div>
            <span>{{ agendaActivities.length }} resultados</span>
          </header>
          <div v-if="agendaActivities.length" class="agenda-list">
            <button
              v-for="activity in agendaActivities"
              :key="activity.id"
              type="button"
              class="agenda-card"
              @click="openActivityDetail(activity)"
            >
              <span class="agenda-date"
                ><b>{{ dayNumber(activity.date) }}</b
                ><small>{{ shortMonth(activity.date) }}</small></span
              >
              <span
                class="agenda-color"
                :style="{ backgroundColor: categoryInfo(activity.category).color }"
              ></span>
              <span class="agenda-copy">
                <b>{{ activity.title }}</b>
                <small
                  >{{ activityDateLabel(activity)
                  }}<template v-if="activity.location"> · {{ activity.location }}</template></small
                >
              </span>
              <span class="status-pill" :class="`status-pill--${activity.status}`">{{
                statusLabel(activity.status)
              }}</span>
              <q-icon name="chevron_right" />
            </button>
          </div>
          <div v-else class="agenda-empty">
            <q-icon name="event_busy" /><strong>No hay actividades con estos filtros</strong
            ><span>Prueba otro año, categoría o búsqueda.</span>
          </div>
        </section>
      </main>
    </div>

    <q-dialog v-model="activityDetailDialogOpen">
      <q-card v-if="selectedActivity" class="detail-dialog">
        <q-card-section class="dialog-topbar">
          <div>
            <q-icon name="visibility" /><span
              ><strong>Detalle de la actividad</strong
              ><small>Así se verá antes de presentarla</small></span
            >
          </div>
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>
        <q-card-section class="detail-content">
          <div
            class="presentation-preview"
            :style="presentationBackground(selectedActivity.imageUrl)"
          >
            <div class="presentation-overlay"></div>
            <div class="presentation-brand"><q-icon name="church" /> ICP Studio · Actividades</div>
            <div class="presentation-copy">
              <span
                class="presentation-category"
                :style="{ '--category-color': categoryInfo(selectedActivity.category).color }"
              >
                {{ categoryInfo(selectedActivity.category).label }}
              </span>
              <h2>{{ selectedActivity.title }}</h2>
              <p>{{ activityLongDateLabel(selectedActivity) }}</p>
              <small v-if="selectedActivity.location"
                ><q-icon name="location_on" /> {{ selectedActivity.location }}</small
              >
            </div>
          </div>
          <div class="detail-information">
            <div class="detail-status-row">
              <span class="status-pill" :class="`status-pill--${selectedActivity.status}`">{{
                statusLabel(selectedActivity.status)
              }}</span>
              <span>{{ categoryInfo(selectedActivity.category).label }}</span>
            </div>
            <p v-if="selectedActivity.description">{{ selectedActivity.description }}</p>
            <p v-else class="muted-copy">Esta actividad no tiene descripción.</p>
            <dl>
              <div>
                <dt>Fecha y hora</dt>
                <dd>{{ activityLongDateLabel(selectedActivity) }}</dd>
              </div>
              <div>
                <dt>Responsable</dt>
                <dd>{{ selectedActivity.responsible || 'Sin asignar' }}</dd>
              </div>
              <div>
                <dt>Lugar</dt>
                <dd>{{ selectedActivity.location || 'Sin especificar' }}</dd>
              </div>
            </dl>
          </div>
        </q-card-section>
        <q-card-actions align="between" class="dialog-actions">
          <q-btn
            flat
            no-caps
            color="blue-grey-3"
            icon="open_in_full"
            label="Vista previa grande"
            @click="presentationPreviewOpen = true"
          />
          <div>
            <q-btn v-close-popup flat no-caps color="blue-grey-3" label="Cerrar" />
            <q-btn
              unelevated
              no-caps
              color="red-6"
              icon="live_tv"
              label="Enviar a En vivo"
              :disable="selectedActivity.status === 'cancelled'"
              @click="sendActivityToLive(selectedActivity)"
            >
              <q-tooltip v-if="selectedActivity.status === 'cancelled'">
                Cambia el estado antes de presentar esta actividad.
              </q-tooltip>
            </q-btn>
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="edit"
              label="Editar"
              @click="editSelectedActivity"
            />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="presentationPreviewOpen" maximized>
      <q-card v-if="selectedActivity" class="fullscreen-preview-card">
        <q-btn
          v-close-popup
          round
          unelevated
          icon="close"
          class="fullscreen-close"
          aria-label="Cerrar presentación"
        />
        <div class="fullscreen-operator-actions">
          <span>
            <q-icon name="visibility" /> Vista previa del operador · Todavía no está En vivo
          </span>
          <q-btn
            unelevated
            no-caps
            color="red-6"
            icon="live_tv"
            label="Enviar a En vivo"
            :disable="selectedActivity.status === 'cancelled'"
            @click="sendActivityToLive(selectedActivity)"
          />
        </div>
        <div
          class="presentation-preview presentation-preview--fullscreen"
          :style="presentationBackground(selectedActivity.imageUrl)"
        >
          <div class="presentation-overlay"></div>
          <div class="presentation-brand"><q-icon name="church" /> ICP Studio · Actividades</div>
          <div class="presentation-copy">
            <span
              class="presentation-category"
              :style="{ '--category-color': categoryInfo(selectedActivity.category).color }"
              >{{ categoryInfo(selectedActivity.category).label }}</span
            >
            <h2>{{ selectedActivity.title }}</h2>
            <p>{{ activityLongDateLabel(selectedActivity) }}</p>
            <small v-if="selectedActivity.location"
              ><q-icon name="location_on" /> {{ selectedActivity.location }}</small
            >
          </div>
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="operatorPresentationOpen" maximized>
      <q-card v-if="presentedActivity" class="operator-console">
        <header class="operator-console-header">
          <div class="operator-console-title">
            <span class="operator-live-dot"></span>
            <div>
              <strong>Control de actividades · En vivo</strong>
              <small>Esta pantalla es únicamente para el operador.</small>
            </div>
          </div>
          <div class="operator-header-actions">
            <q-btn
              outline
              no-caps
              color="red-4"
              icon="tv_off"
              label="Limpiar En vivo"
              @click="stopActivityLive"
            />
            <q-btn
              flat
              round
              icon="close"
              aria-label="Cerrar control del operador"
              @click="operatorPresentationOpen = false"
            />
          </div>
        </header>

        <main class="operator-console-body">
          <section class="operator-current-panel">
            <div class="operator-panel-label">
              <span><i></i> Ahora En vivo</span>
              <small>{{ presentedActivityIndex + 1 }} de {{ presentableActivities.length }}</small>
            </div>
            <div
              class="presentation-preview operator-main-preview"
              :style="presentationBackground(presentedActivity.imageUrl)"
            >
              <div class="presentation-overlay"></div>
              <div class="presentation-brand">
                <q-icon name="church" /> ICP Studio · Actividades
              </div>
              <div class="presentation-copy">
                <span
                  class="presentation-category"
                  :style="{
                    '--category-color': categoryInfo(presentedActivity.category).color,
                  }"
                  >{{ categoryInfo(presentedActivity.category).label }}</span
                >
                <h2>{{ presentedActivity.title }}</h2>
                <p>{{ activityLongDateLabel(presentedActivity) }}</p>
                <small v-if="presentedActivity.location"
                  ><q-icon name="location_on" /> {{ presentedActivity.location }}</small
                >
              </div>
            </div>
            <div class="operator-current-metadata">
              <span class="status-pill" :class="`status-pill--${presentedActivity.status}`">
                {{ statusLabel(presentedActivity.status) }}
              </span>
              <span v-if="presentedActivity.responsible">
                <q-icon name="person" /> {{ presentedActivity.responsible }}
              </span>
              <span v-if="presentedActivity.location">
                <q-icon name="location_on" /> {{ presentedActivity.location }}
              </span>
            </div>
          </section>

          <aside class="operator-next-panel">
            <div class="operator-panel-label"><span>Siguiente actividad</span></div>
            <button
              v-if="nextPresentedActivity"
              type="button"
              class="operator-next-card"
              @click="sendActivityToLive(nextPresentedActivity, { openOperator: false })"
            >
              <div
                class="operator-next-image"
                :style="presentationBackground(nextPresentedActivity.imageUrl)"
              >
                <span>{{ dayNumber(nextPresentedActivity.date) }}</span>
                <small>{{ shortMonth(nextPresentedActivity.date) }}</small>
              </div>
              <div>
                <small>{{ categoryInfo(nextPresentedActivity.category).label }}</small>
                <strong>{{ nextPresentedActivity.title }}</strong>
                <span>{{ activityDateLabel(nextPresentedActivity) }}</span>
              </div>
              <q-icon name="arrow_forward" />
            </button>
            <div v-else class="operator-no-next">
              <q-icon name="event_available" />
              <strong>No hay otra actividad</strong>
              <span>Esta es la última actividad programada.</span>
            </div>

            <div class="operator-keyboard-help">
              <q-icon name="keyboard" />
              <div>
                <strong>Control con el teclado</strong>
                <span><kbd>←</kbd> Anterior <kbd>→</kbd> Siguiente</span>
              </div>
            </div>
            <p>
              La previsualización de la izquierda representa la actividad que están viendo los
              hermanos en las pantallas externas.
            </p>
          </aside>

          <section class="operator-timeline">
            <header>
              <div>
                <strong>Secuencia de actividades</strong>
                <small>Anteriores, actividad En vivo y próximas</small>
              </div>
              <span>Selecciona una tarjeta para enviarla inmediatamente.</span>
            </header>
            <div class="operator-timeline-track">
              <button
                v-for="activity in operatorTimelineActivities"
                :key="activity.id"
                type="button"
                class="operator-timeline-card"
                :class="{
                  'operator-timeline-card--live': activity.id === presentedActivity.id,
                  'operator-timeline-card--past':
                    presentableActivities.findIndex((item) => item.id === activity.id) <
                    presentedActivityIndex,
                }"
                @click="sendActivityToLive(activity, { openOperator: false, notify: false })"
              >
                <span class="timeline-card-state">{{ timelinePositionLabel(activity) }}</span>
                <span
                  class="timeline-card-color"
                  :style="{ backgroundColor: categoryInfo(activity.category).color }"
                ></span>
                <strong>{{ activity.title }}</strong>
                <small>{{ activityDateLabel(activity) }}</small>
                <q-icon :name="activity.id === presentedActivity.id ? 'sensors' : 'arrow_upward'" />
              </button>
            </div>
          </section>
        </main>

        <footer class="operator-console-footer">
          <q-btn
            outline
            no-caps
            color="blue-grey-3"
            icon="arrow_back"
            :label="previousPresentedActivity?.title ?? 'Actividad anterior'"
            :disable="!previousPresentedActivity"
            @click="movePresentedActivity(-1)"
          />
          <span>Usa las flechas del teclado para cambiar la actividad En vivo.</span>
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon-right="arrow_forward"
            :label="nextPresentedActivity?.title ?? 'Última actividad'"
            :disable="!nextPresentedActivity"
            @click="movePresentedActivity(1)"
          />
        </footer>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dayActivitiesDialogOpen">
      <q-card class="day-dialog">
        <q-card-section class="dialog-topbar">
          <div>
            <q-icon name="today" /><span
              ><strong>{{ selectedDayLabel }}</strong
              ><small>{{ selectedDayActivities.length }} actividades</small></span
            >
          </div>
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>
        <q-card-section class="day-dialog-list">
          <button
            v-for="activity in selectedDayActivities"
            :key="activity.id"
            type="button"
            @click="openActivityFromDay(activity)"
          >
            <i :style="{ backgroundColor: categoryInfo(activity.category).color }"></i>
            <span
              ><b>{{ activity.title }}</b
              ><small
                >{{ activity.allDay ? 'Todo el día' : activity.startTime }} ·
                {{ statusLabel(activity.status) }}</small
              ></span
            >
            <q-icon name="chevron_right" />
          </button>
        </q-card-section>
        <q-card-actions align="right" class="dialog-actions">
          <q-btn flat no-caps color="blue-grey-3" label="Cerrar" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="add"
            label="Agregar otra"
            @click="createFromSelectedDay"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="categoriesDialogOpen">
      <q-card class="categories-dialog">
        <q-card-section class="dialog-topbar">
          <div>
            <q-icon name="category" /><span
              ><strong>Administrar categorías</strong
              ><small>Agrega colores y organiza tu calendario</small></span
            >
          </div>
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>
        <q-card-section class="category-manager">
          <div class="new-category-row">
            <input v-model="newCategoryColor" type="color" aria-label="Color de la categoría" />
            <q-input
              v-model="newCategoryName"
              dark
              outlined
              dense
              label="Nueva categoría"
              maxlength="40"
              @keyup.enter="addCategory"
            />
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="add"
              label="Agregar"
              @click="addCategory"
            />
          </div>
          <div class="managed-category-list">
            <div v-for="category in categories" :key="category.id">
              <span
                class="managed-category-color"
                :style="{ backgroundColor: category.color }"
              ></span>
              <span
                ><b>{{ category.label }}</b
                ><small>{{ allCategoryCount(category.id) }} actividades</small></span
              >
              <q-btn
                flat
                round
                dense
                color="red-3"
                icon="delete_outline"
                @click="deleteCategory(category.id)"
              >
                <q-tooltip>Eliminar categoría</q-tooltip>
              </q-btn>
            </div>
          </div>
          <p class="category-help">
            <q-icon name="info_outline" /> Una categoría que ya tiene actividades no se puede
            eliminar hasta reasignarlas.
          </p>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="activityDialogOpen" persistent>
      <q-card class="activity-dialog">
        <q-card-section class="dialog-topbar">
          <div>
            <q-icon name="event" /><span
              ><strong>{{ editingActivityId ? 'Editar actividad' : 'Nueva actividad' }}</strong
              ><small>Las actividades nuevas comienzan como pendientes.</small></span
            >
          </div>
          <q-btn v-close-popup flat round dense icon="close" />
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
              ><template #prepend><q-icon name="title" /></template
            ></q-input>
            <div class="form-grid form-grid--dates">
              <q-input
                v-model="activityForm.date"
                dark
                outlined
                dense
                type="date"
                label="Comienza *"
                ><template #prepend><q-icon name="calendar_today" /></template
              ></q-input>
              <q-input
                v-model="activityForm.endDate"
                dark
                outlined
                dense
                type="date"
                label="Termina *"
                :min="activityForm.date"
                ><template #prepend><q-icon name="event_available" /></template
              ></q-input>
              <q-toggle v-model="activityForm.allDay" dark color="primary" label="Todo el día" />
            </div>
            <div v-if="!activityForm.allDay" class="form-grid">
              <q-input
                v-model="activityForm.startTime"
                dark
                outlined
                dense
                type="time"
                label="Inicia"
              />
              <q-input
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
                ><template #prepend><q-icon name="category" /></template
              ></q-select>
              <q-select
                v-model="activityForm.status"
                dark
                outlined
                dense
                emit-value
                map-options
                :options="statusOptions"
                label="Estado"
                ><template #prepend><q-icon name="task_alt" /></template
              ></q-select>
            </div>
            <div class="form-grid">
              <q-input v-model="activityForm.location" dark outlined dense label="Lugar"
                ><template #prepend><q-icon name="location_on" /></template
              ></q-input>
              <q-input v-model="activityForm.responsible" dark outlined dense label="Responsable"
                ><template #prepend><q-icon name="person" /></template
              ></q-input>
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
            <div class="form-preview" :style="presentationBackground(activityForm.imageUrl)">
              <div class="presentation-overlay"></div>
              <div class="form-preview-copy">
                <small>{{ categoryInfo(activityForm.category).label }}</small>
                <strong>{{ activityForm.title || 'Nombre de la actividad' }}</strong>
                <span>{{ activityForm.date ? formDateLabel : 'Selecciona una fecha' }}</span>
              </div>
            </div>
            <button type="button" class="image-picker" @click="chooseActivityImage">
              <q-icon name="add_photo_alternate" />
              <span>{{
                activityForm.imageUrl ? 'Cambiar imagen' : 'Agregar imagen de portada'
              }}</span>
            </button>
            <q-btn
              v-if="activityForm.imageUrl"
              flat
              dense
              no-caps
              color="red-3"
              icon="delete_outline"
              label="Quitar imagen"
              @click="activityForm.imageUrl = ''"
            />
            <div class="future-live-note">
              <q-icon name="live_tv" />
              <div>
                <strong>Vista lista para presentar</strong
                ><span>La portada 16:9 muestra cómo se verá esta actividad en pantalla.</span>
              </div>
            </div>
          </aside>
        </q-card-section>
        <q-separator dark />
        <q-card-actions align="between" class="dialog-actions">
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
            <q-btn v-close-popup flat no-caps color="blue-grey-4" label="Cancelar" /><q-btn
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
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { showAppNotification } from '../services/app-notification';
import type {
  CalendarActivity,
  CalendarActivityCategory,
  CalendarActivityCategoryDefinition,
  CalendarActivityStatus,
} from '../shared/calendar';
import type { ServicePresentationItem } from '../shared/presentation';
import { useCalendarActivitiesStore } from '../stores/calendar-activities';
import { usePresentationStore } from '../stores/presentation-store';

interface CalendarDay {
  day: number;
  dateKey: string;
  isToday: boolean;
}

interface ActivityForm {
  title: string;
  date: string;
  endDate: string;
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

type CalendarViewMode = 'month' | 'year' | 'agenda';

const router = useRouter();
const calendarStore = useCalendarActivitiesStore();
const presentationStore = usePresentationStore();
const { activities, categories } = storeToRefs(calendarStore);
const now = new Date();
const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
const year = ref(now.getFullYear());
const monthIndex = ref(now.getMonth());
const viewMode = ref<CalendarViewMode>('month');
const searchText = ref('');
const activeCategory = ref<string>('all');
const activityDialogOpen = ref(false);
const activityDetailDialogOpen = ref(false);
const presentationPreviewOpen = ref(false);
const operatorPresentationOpen = ref(false);
const dayActivitiesDialogOpen = ref(false);
const categoriesDialogOpen = ref(false);
const editingActivityId = ref<string | null>(null);
const selectedActivity = ref<CalendarActivity | null>(null);
const presentedActivityId = ref<string | null>(null);
const selectedDayKey = ref('');
const newCategoryName = ref('');
const newCategoryColor = ref('#ef6464');
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const fullWeekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
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
const viewOptions: Array<{ label: string; value: CalendarViewMode; icon: string }> = [
  { label: 'Mes', value: 'month', icon: 'calendar_view_month' },
  { label: 'Año', value: 'year', icon: 'calendar_view_week' },
  { label: 'Agenda', value: 'agenda', icon: 'view_agenda' },
];

const activityForm = reactive<ActivityForm>(emptyActivityForm(todayKey));
const categoryOptions = computed(() =>
  categories.value.map((category) => ({ label: category.label, value: category.id })),
);
const statusOptions: Array<{ label: string; value: CalendarActivityStatus }> = [
  { label: 'Pendiente', value: 'pending' },
  { label: 'Completada', value: 'completed' },
  { label: 'Cancelada', value: 'cancelled' },
];

const yearActivities = computed(() => {
  const yearStart = `${year.value}-01-01`;
  const yearEnd = `${year.value}-12-31`;
  return activities.value.filter(
    (activity) => activity.date <= yearEnd && activityEndDate(activity) >= yearStart,
  );
});
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
const pendingActivities = computed(
  () => yearActivities.value.filter((activity) => activity.status === 'pending').length,
);
const completedActivities = computed(
  () => yearActivities.value.filter((activity) => activity.status === 'completed').length,
);
const upcomingActivities = computed(() =>
  activities.value
    .filter((activity) => activityEndDate(activity) >= todayKey && activity.status !== 'cancelled')
    .sort(compareActivities)
    .slice(0, 6),
);
const nextActivity = computed(() => upcomingActivities.value[0] ?? null);
const agendaActivities = computed(() => [...filteredActivities.value].sort(compareActivities));
const presentableActivities = computed(() =>
  activities.value.filter((activity) => activity.status !== 'cancelled').sort(compareActivities),
);
const presentedActivityIndex = computed(() =>
  presentableActivities.value.findIndex((activity) => activity.id === presentedActivityId.value),
);
const presentedActivity = computed(() =>
  presentedActivityIndex.value >= 0
    ? (presentableActivities.value[presentedActivityIndex.value] ?? null)
    : null,
);
const previousPresentedActivity = computed(() =>
  presentedActivityIndex.value > 0
    ? (presentableActivities.value[presentedActivityIndex.value - 1] ?? null)
    : null,
);
const nextPresentedActivity = computed(() =>
  presentedActivityIndex.value >= 0
    ? (presentableActivities.value[presentedActivityIndex.value + 1] ?? null)
    : null,
);
const operatorTimelineActivities = computed(() => {
  if (presentedActivityIndex.value < 0) return [];
  const start = Math.max(0, presentedActivityIndex.value - 3);
  return presentableActivities.value.slice(start, presentedActivityIndex.value + 4);
});
const periodTitle = computed(() =>
  viewMode.value === 'month' ? `${monthNames[monthIndex.value]} ${year.value}` : `${year.value}`,
);
const formDateLabel = computed(() =>
  activityForm.date ? dateRangeLabel(activityForm.date, activityForm.endDate) : '',
);
const yearProgress = computed(() => {
  if (year.value < now.getFullYear()) return 1;
  if (year.value > now.getFullYear()) return 0;
  const start = new Date(year.value, 0, 1).getTime();
  const end = new Date(year.value + 1, 0, 1).getTime();
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
});
const months = computed(() => monthNames.map((label, index) => buildMonth(index, label)));
const currentMonth = computed(() => months.value[monthIndex.value] ?? months.value[0]!);
const selectedDayActivities = computed(() =>
  selectedDayKey.value ? activitiesForDay(selectedDayKey.value) : [],
);
const selectedDayLabel = computed(() =>
  selectedDayKey.value ? formatLongDate(selectedDayKey.value) : 'Actividades del día',
);

function buildMonth(index: number, label: string) {
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
    activityCount: filteredActivities.value.filter((activity) => {
      const monthStart = dateKey(year.value, index, 1);
      const monthEnd = dateKey(year.value, index, daysInMonth);
      return activity.date <= monthEnd && activityEndDate(activity) >= monthStart;
    }).length,
    isCurrentMonth: year.value === now.getFullYear() && index === now.getMonth(),
  };
}

function emptyActivityForm(selectedDate: string): ActivityForm {
  return {
    title: '',
    date: selectedDate,
    endDate: selectedDate,
    allDay: false,
    startTime: '09:00',
    endTime: '11:00',
    category: categories.value[0]?.id ?? 'worship',
    status: 'pending',
    location: '',
    responsible: '',
    description: '',
    imageUrl: '',
  };
}

function dateKey(selectedYear: number, selectedMonthIndex: number, day: number): string {
  return `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function compareActivities(first: CalendarActivity, second: CalendarActivity): number {
  return `${first.date}T${first.startTime}`.localeCompare(`${second.date}T${second.startTime}`);
}

function activityEndDate(activity: CalendarActivity): string {
  return activity.endDate || activity.date;
}

function categoryInfo(categoryId: CalendarActivityCategory): CalendarActivityCategoryDefinition {
  return (
    categories.value.find((category) => category.id === categoryId) ??
    categories.value[0] ?? { id: 'general', label: 'General', icon: 'event', color: '#ef6464' }
  );
}

function activitiesForDay(selectedDate: string): CalendarActivity[] {
  return filteredActivities.value
    .filter(
      (activity) => activity.date <= selectedDate && activityEndDate(activity) >= selectedDate,
    )
    .sort(compareActivities);
}

function categoryCount(categoryId: CalendarActivityCategory): number {
  return yearActivities.value.filter((activity) => activity.category === categoryId).length;
}

function allCategoryCount(categoryId: CalendarActivityCategory): number {
  return activities.value.filter((activity) => activity.category === categoryId).length;
}

function dayNumber(selectedDate: string): string {
  return selectedDate.slice(8, 10);
}
function shortMonth(selectedDate: string): string {
  return monthNames[Number(selectedDate.slice(5, 7)) - 1]?.slice(0, 3) ?? '';
}
function formatLongDate(selectedDate: string): string {
  const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(selectedYear ?? year.value, (selectedMonth ?? 1) - 1, selectedDay ?? 1));
}
function dateRangeLabel(startDate: string, endDate: string): string {
  const safeEndDate = endDate || startDate;
  if (safeEndDate === startDate) return formatLongDate(startDate);
  return `${formatLongDate(startDate)} – ${formatLongDate(safeEndDate)}`;
}
function activityDateLabel(activity: CalendarActivity): string {
  const formatter = new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const startLabel = formatter.format(new Date(`${activity.date}T12:00:00`));
  const endDate = activityEndDate(activity);
  const dateLabel =
    endDate === activity.date
      ? startLabel
      : `${startLabel} – ${formatter.format(new Date(`${endDate}T12:00:00`))}`;
  return activity.allDay ? dateLabel : `${dateLabel} · ${activity.startTime || 'Hora pendiente'}`;
}
function activityLongDateLabel(activity: CalendarActivity): string {
  const rangeLabel = dateRangeLabel(activity.date, activityEndDate(activity));
  return activity.allDay
    ? `${rangeLabel} · Todo el día`
    : `${rangeLabel} · ${activity.startTime || 'Hora pendiente'}${activity.endTime ? ` – ${activity.endTime}` : ''}`;
}
function statusLabel(status: CalendarActivityStatus): string {
  return { pending: 'Pendiente', completed: 'Completada', cancelled: 'Cancelada' }[status];
}
function timelinePositionLabel(activity: CalendarActivity): string {
  const activityIndex = presentableActivities.value.findIndex((item) => item.id === activity.id);
  if (activityIndex < presentedActivityIndex.value) return 'Anterior';
  if (activityIndex > presentedActivityIndex.value) return 'Siguiente';
  return 'En vivo';
}
function presentationBackground(imageUrl: string): Record<string, string> {
  return imageUrl ? { backgroundImage: `url("${imageUrl.replaceAll('"', '%22')}")` } : {};
}

function activityPresentationItem(activity: CalendarActivity): ServicePresentationItem {
  const existingItem = presentationStore.serviceItems.find(
    (item) => item.type === 'activity' && item.sourceId === activity.id,
  );
  return {
    id: existingItem?.id ?? `service-activity-${activity.id}`,
    sourceId: activity.id,
    type: 'activity',
    title: activity.title,
    footer: categoryInfo(activity.category).label,
    frames: [
      {
        id: `activity-frame-${activity.id}`,
        label: activity.title,
        text: activityLiveBody(activity),
      },
    ],
  };
}

function activityLiveBody(activity: CalendarActivity): string {
  return [
    activityLongDateLabel(activity),
    activity.location ? `Lugar: ${activity.location}` : '',
    activity.description,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function sendActivityToLive(
  activity: CalendarActivity,
  options: { openOperator?: boolean; notify?: boolean } = {},
): void {
  if (activity.status === 'cancelled') {
    showAppNotification(
      'Una actividad cancelada no se puede enviar a En vivo.',
      'warning',
      'event_busy',
    );
    return;
  }

  const item = activityPresentationItem(activity);
  const alreadyInService = presentationStore.serviceItems.some(
    (serviceItem) => serviceItem.id === item.id,
  );
  if (alreadyInService) presentationStore.updateServiceItem(item);
  else presentationStore.addToService(item);

  presentationStore.activateServiceItem(item.id);
  const category = categoryInfo(activity.category);
  window.icpStudio?.projection.setState({
    mode: 'activity',
    id: activity.id,
    title: activity.title,
    dateLabel: activityLongDateLabel(activity),
    location: activity.location,
    description: activity.description,
    imageUrl: activity.imageUrl,
    categoryLabel: category.label,
    categoryColor: category.color,
  });

  selectedActivity.value = activity;
  presentedActivityId.value = activity.id;
  if (options.openOperator ?? true) {
    activityDetailDialogOpen.value = false;
    presentationPreviewOpen.value = false;
    operatorPresentationOpen.value = true;
  }
  if (options.notify ?? true) {
    showAppNotification(`${activity.title} está ahora En vivo.`, 'positive', 'live_tv');
  }
}

function movePresentedActivity(direction: -1 | 1): void {
  const nextIndex = presentedActivityIndex.value + direction;
  const activity = presentableActivities.value[nextIndex];
  if (!activity) {
    showAppNotification(
      direction > 0 ? 'No hay otra actividad después de esta.' : 'Esta es la primera actividad.',
      'info',
      'event',
    );
    return;
  }
  sendActivityToLive(activity, { openOperator: false, notify: false });
}

function stopActivityLive(): void {
  presentationStore.clearLive();
  operatorPresentationOpen.value = false;
  presentedActivityId.value = null;
  showAppNotification('La salida En vivo quedó limpia.', 'info', 'tv_off');
}

function handleOperatorKeyboard(event: KeyboardEvent): void {
  if (!operatorPresentationOpen.value) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    movePresentedActivity(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    movePresentedActivity(1);
  }
}

function goToCurrentPeriod(): void {
  year.value = now.getFullYear();
  monthIndex.value = now.getMonth();
}
function previousPeriod(): void {
  if (viewMode.value !== 'month') {
    year.value -= 1;
    return;
  }
  if (monthIndex.value === 0) {
    monthIndex.value = 11;
    year.value -= 1;
  } else monthIndex.value -= 1;
}
function nextPeriod(): void {
  if (viewMode.value !== 'month') {
    year.value += 1;
    return;
  }
  if (monthIndex.value === 11) {
    monthIndex.value = 0;
    year.value += 1;
  } else monthIndex.value += 1;
}
function openMonth(index: number): void {
  monthIndex.value = index;
  viewMode.value = 'month';
}

function handleDayClick(selectedDate: string): void {
  const dayActivities = activitiesForDay(selectedDate);
  if (dayActivities.length === 0) openCreateActivity(selectedDate);
  else if (dayActivities.length === 1) openActivityDetail(dayActivities[0]!);
  else openDayActivities(selectedDate);
}
function openDayActivities(selectedDate: string): void {
  selectedDayKey.value = selectedDate;
  dayActivitiesDialogOpen.value = true;
}
function openActivityFromDay(activity: CalendarActivity): void {
  dayActivitiesDialogOpen.value = false;
  openActivityDetail(activity);
}
function createFromSelectedDay(): void {
  dayActivitiesDialogOpen.value = false;
  openCreateActivity(selectedDayKey.value);
}
function openActivityDetail(activity: CalendarActivity): void {
  selectedActivity.value = activity;
  activityDetailDialogOpen.value = true;
}
function editSelectedActivity(): void {
  if (!selectedActivity.value) return;
  activityDetailDialogOpen.value = false;
  openEditActivity(selectedActivity.value);
}

function openCreateActivity(
  selectedDate = dateKey(year.value, monthIndex.value, now.getDate()),
): void {
  editingActivityId.value = null;
  Object.assign(activityForm, emptyActivityForm(selectedDate));
  activityDialogOpen.value = true;
}
function openEditActivity(activity: CalendarActivity): void {
  editingActivityId.value = activity.id;
  Object.assign(activityForm, activity);
  activityDialogOpen.value = true;
}

async function chooseActivityImage(): Promise<void> {
  try {
    const images = (await window.icpStudio?.media.select('image')) ?? [];
    if (images[0]) activityForm.imageUrl = images[0].url;
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
  if (!title || !activityForm.date || !activityForm.endDate) {
    showAppNotification(
      'Escribe el nombre, la fecha de inicio y la fecha final.',
      'warning',
      'event_busy',
    );
    return;
  }
  if (activityForm.endDate < activityForm.date) {
    showAppNotification(
      'La fecha final no puede ser anterior a la fecha de inicio.',
      'warning',
      'date_range',
    );
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
    endDate: activityForm.endDate,
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
  monthIndex.value = Number(activity.date.slice(5, 7)) - 1;
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

function addCategory(): void {
  const created = calendarStore.addCategory(newCategoryName.value, newCategoryColor.value);
  if (!created) {
    showAppNotification('Escribe un nombre para la categoría.', 'warning', 'category');
    return;
  }
  newCategoryName.value = '';
  activityForm.category = created.id;
  showAppNotification('La categoría fue agregada.', 'positive', 'category');
}

function deleteCategory(categoryId: string): void {
  const result = calendarStore.removeCategory(categoryId);
  if (result === 'used') {
    showAppNotification(
      'Esta categoría tiene actividades. Reasígnalas antes de eliminarla.',
      'warning',
      'event_busy',
    );
    return;
  }
  if (result === 'last') {
    showAppNotification('Debe quedar al menos una categoría.', 'warning', 'category');
    return;
  }
  if (result !== 'removed') {
    showAppNotification('No fue posible eliminar la categoría.', 'negative', 'error');
    return;
  }
  if (activeCategory.value === categoryId) activeCategory.value = 'all';
  showAppNotification('La categoría fue eliminada.', 'positive', 'delete_outline');
}

onMounted(() => window.addEventListener('keydown', handleOperatorKeyboard));
onBeforeUnmount(() => window.removeEventListener('keydown', handleOperatorKeyboard));
</script>

<style scoped>
.calendar-page {
  min-height: 100%;
  padding: 20px;
  color: #e7eef7;
  background: radial-gradient(circle at 78% -15%, rgb(31 82 123 / 22%), transparent 34%), #0b121b;
}
button {
  font: inherit;
}
.calendar-header,
.calendar-heading,
.calendar-header-actions,
.calendar-summary,
.summary-card,
.calendar-toolbar,
.period-actions,
.dialog-topbar,
.dialog-topbar > div,
.dialog-actions > div {
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
  display: block;
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
.calendar-header-actions {
  gap: 8px;
}
.calendar-header-actions .q-btn {
  min-height: 39px;
  border-radius: 9px;
}
.live-control-button {
  box-shadow: 0 0 0 4px rgb(239 68 68 / 12%);
}
.calendar-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(145px, 0.72fr)) minmax(260px, 1.35fr);
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
.calendar-main {
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
.sidebar-section > header > div {
  display: flex;
  flex-direction: column;
}
.sidebar-section > header strong {
  color: #cdd8e5;
  font-size: 11px;
}
.sidebar-section > header small {
  color: #61758d;
  font-size: 8px;
}
.sidebar-count {
  display: grid;
  min-width: 20px;
  height: 20px;
  place-items: center;
  color: #93c5fd;
  background: #172a40;
  border-radius: 10px;
  font-size: 9px;
}
.category-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.category-filter {
  display: grid;
  width: 100%;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  color: #8495a9;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
}
.category-filter:hover,
.category-filter--active {
  color: #d9e6f4;
  background: #152336;
  border-color: #263d56;
}
.category-filter small {
  color: #657a91;
  font-size: 8px;
}
.category-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.category-dot--all {
  background: conic-gradient(#60a5fa, #a78bfa, #34d399, #fb7185);
}
.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.upcoming-card {
  display: grid;
  width: 100%;
  grid-template-columns: 35px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px;
  color: #9badc1;
  background: #111d2b;
  border: 1px solid #21344a;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}
.upcoming-card:hover {
  background: #17283b;
  border-color: #395574;
}
.upcoming-date {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #fecaca;
  background: #3b1f29;
  border-radius: 7px;
}
.upcoming-date b {
  font-size: 14px;
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
.upcoming-copy b {
  overflow: hidden;
  color: #cfdae7;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upcoming-copy small {
  overflow: hidden;
  margin-top: 3px;
  color: #64778d;
  font-size: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upcoming-empty,
.agenda-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  padding: 20px;
  color: #63778e;
  text-align: center;
}
.upcoming-empty .q-icon,
.agenda-empty .q-icon {
  font-size: 28px;
}
.calendar-main {
  padding: 12px;
  overflow: hidden;
}
.calendar-toolbar {
  justify-content: space-between;
  gap: 12px;
  padding: 2px 2px 12px;
}
.period-title {
  display: flex;
  min-width: 150px;
  flex-direction: column;
}
.period-title span {
  color: #627890;
  font-size: 8px;
  text-transform: uppercase;
}
.period-title strong {
  margin-top: 1px;
  color: #e2eaf4;
  font-size: 18px;
}
.period-actions {
  gap: 2px;
}
.view-switcher {
  display: flex;
  padding: 3px;
  background: #0b131d;
  border: 1px solid #24364b;
  border-radius: 9px;
}
.view-switcher button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  color: #71859b;
  background: transparent;
  border: 0;
  border-radius: 6px;
  font-size: 9px;
  cursor: pointer;
}
.view-switcher button.active {
  color: #dbeafe;
  background: #1d3854;
}
.year-progress-row {
  display: grid;
  grid-template-columns: auto minmax(80px, 1fr) auto;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
  color: #667b92;
  font-size: 8px;
}
.large-month {
  border: 1px solid #26384d;
  border-radius: 10px;
  overflow: hidden;
}
.large-month-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #111e2c;
  border-bottom: 1px solid #26384d;
}
.large-month-weekdays span {
  padding: 8px;
  color: #7890a7;
  font-size: 8px;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
}
.large-month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.large-day {
  position: relative;
  min-width: 0;
  min-height: 112px;
  padding: 7px;
  background: #0d1722;
  border-right: 1px solid #1f3042;
  border-bottom: 1px solid #1f3042;
  cursor: pointer;
}
.large-day:nth-child(7n) {
  border-right: 0;
}
.large-day:hover:not(.large-day--empty) {
  background: #122236;
}
.large-day--empty {
  cursor: default;
  opacity: 0.36;
}
.large-day--busy {
  background: linear-gradient(180deg, rgb(239 100 100 / 13%), transparent 42%), #101a27;
  box-shadow: inset 0 3px #ef6464;
}
.large-day--today {
  box-shadow: inset 0 0 0 2px #4e9fe0;
}
.large-day > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}
.large-day > header > span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: #9badc1;
  border-radius: 50%;
  font-size: 10px;
}
.large-day--today > header > span {
  color: white;
  background: #2d78b4;
  font-weight: 700;
}
.large-day > header small {
  display: grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  color: #fecaca;
  background: #702f3a;
  border-radius: 9px;
  font-size: 8px;
}
.day-activity-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.day-activity-chip,
.more-activities {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 5px;
  padding: 4px 5px;
  color: #cbd8e6;
  background: #172638;
  border: 1px solid #263b52;
  border-radius: 5px;
  text-align: left;
  cursor: pointer;
}
.day-activity-chip:hover {
  border-color: #54799f;
}
.day-activity-chip i {
  width: 4px;
  height: 14px;
  flex: 0 0 4px;
  border-radius: 3px;
}
.day-activity-chip span {
  overflow: hidden;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.day-activity-chip--completed {
  opacity: 0.65;
}
.day-activity-chip--completed span {
  text-decoration: line-through;
}
.day-activity-chip--cancelled {
  opacity: 0.45;
}
.more-activities {
  justify-content: center;
  color: #8fb4d5;
  background: transparent;
  border: 0;
  font-size: 8px;
}
.months-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 8px;
}
.month-card {
  min-width: 0;
  padding: 8px;
  background: #0d1722;
  border: 1px solid #223449;
  border-radius: 9px;
}
.month-card--current {
  border-color: #3d79a7;
  box-shadow: inset 0 2px #4594d0;
}
.month-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 7px;
  cursor: pointer;
}
.month-header > div {
  display: flex;
  flex-direction: column;
}
.month-header strong {
  color: #cdd9e6;
  font-size: 10px;
}
.month-header span {
  color: #60a5fa;
  font-size: 7px;
}
.month-header small {
  color: #61758c;
  font-size: 7px;
}
.month-weekdays,
.month-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.month-weekdays span {
  padding: 3px 0;
  color: #52677e;
  font-size: 7px;
  text-align: center;
}
.day-cell-wrapper {
  display: block;
  aspect-ratio: 1;
  padding: 1px;
}
.day-cell {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  color: #74879b;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  font-size: 8px;
  cursor: pointer;
}
.day-cell:hover {
  color: #dbeafe;
  background: #1a2b40;
}
.day-cell--busy {
  color: #fff;
  background: #612c37;
  border-color: #ef6464;
  font-weight: 700;
}
.day-cell--today {
  box-shadow: inset 0 0 0 1px #61aee8;
}
.activity-count-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  display: grid;
  min-width: 11px;
  height: 11px;
  place-items: center;
  color: white;
  background: #ef6464;
  border-radius: 6px;
  font-size: 6px;
  font-style: normal;
}
.agenda-view {
  min-height: 500px;
}
.agenda-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: #111e2c;
  border: 1px solid #26384d;
  border-radius: 9px;
}
.agenda-heading > div {
  display: flex;
  flex-direction: column;
}
.agenda-heading strong {
  font-size: 13px;
}
.agenda-heading small,
.agenda-heading > span {
  color: #6f849a;
  font-size: 8px;
}
.agenda-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 9px;
}
.agenda-card {
  display: grid;
  width: 100%;
  grid-template-columns: 46px 4px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  color: #9badc1;
  background: #101c29;
  border: 1px solid #24384e;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}
.agenda-card:hover {
  background: #15263a;
  border-color: #3e5e7d;
}
.agenda-date {
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #fecaca;
  background: #3d202b;
  border-radius: 7px;
}
.agenda-date b {
  font-size: 16px;
  line-height: 1;
}
.agenda-date small {
  font-size: 7px;
  text-transform: uppercase;
}
.agenda-color {
  width: 4px;
  height: 32px;
  border-radius: 3px;
}
.agenda-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.agenda-copy b {
  overflow: hidden;
  color: #d8e3ee;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agenda-copy small {
  margin-top: 3px;
  color: #6d8197;
  font-size: 8px;
}
.status-pill {
  display: inline-flex;
  width: fit-content;
  padding: 4px 7px;
  border-radius: 12px;
  font-size: 8px;
  font-weight: 700;
}
.status-pill--pending {
  color: #fde68a;
  background: #4a391d;
}
.status-pill--completed {
  color: #86efac;
  background: #183f2b;
}
.status-pill--cancelled {
  color: #fca5a5;
  background: #4d252c;
}
.detail-dialog,
.activity-dialog {
  width: min(900px, 94vw);
  max-width: 94vw;
  color: #e7eef7;
  background: #101925;
  border: 1px solid #304158;
  border-radius: 12px;
}
.day-dialog,
.categories-dialog {
  width: min(580px, 94vw);
  max-width: 94vw;
  color: #e7eef7;
  background: #101925;
  border: 1px solid #304158;
  border-radius: 12px;
}
.dialog-topbar {
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
}
.dialog-topbar > div {
  gap: 10px;
}
.dialog-topbar > div > .q-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: #6ee7b7;
  background: #14352f;
  border-radius: 9px;
  font-size: 20px;
}
.dialog-topbar span {
  display: flex;
  flex-direction: column;
}
.dialog-topbar strong {
  font-size: 13px;
}
.dialog-topbar small {
  margin-top: 2px;
  color: #788ba0;
  font-size: 8px;
}
.dialog-actions {
  flex-wrap: wrap;
  gap: 8px;
  padding: 9px 12px;
}
.dialog-actions > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}
.detail-content {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(230px, 0.7fr);
  gap: 16px;
}
.presentation-preview {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  background:
    radial-gradient(circle at 75% 30%, #304f73, transparent 35%),
    linear-gradient(135deg, #13283e, #08111c);
  background-position: center;
  background-size: cover;
  border: 1px solid #39516c;
  border-radius: 10px;
}
.presentation-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgb(4 11 19 / 90%) 0%,
    rgb(5 13 22 / 58%) 58%,
    rgb(5 13 22 / 25%)
  );
}
.presentation-brand {
  position: absolute;
  top: 7%;
  left: 6%;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #c7d9eb;
  font-size: clamp(7px, 1vw, 11px);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.presentation-copy {
  position: absolute;
  right: 6%;
  bottom: 10%;
  left: 6%;
}
.presentation-category {
  display: inline-flex;
  padding: 5px 9px;
  color: white;
  background: color-mix(in srgb, var(--category-color) 76%, #0b1622);
  border-left: 3px solid var(--category-color);
  border-radius: 4px;
  font-size: clamp(7px, 0.9vw, 10px);
  font-weight: 700;
  text-transform: uppercase;
}
.presentation-copy h2 {
  max-width: 88%;
  margin: 10px 0 4px;
  color: white;
  font-size: clamp(18px, 3vw, 36px);
  line-height: 1.05;
  text-shadow: 0 2px 12px #000;
}
.presentation-copy p {
  margin: 0;
  color: #d4e3f0;
  font-size: clamp(8px, 1.2vw, 14px);
  text-transform: capitalize;
}
.presentation-copy small {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 7px;
  color: #b9cada;
  font-size: clamp(7px, 1vw, 11px);
}
.detail-information {
  display: flex;
  flex-direction: column;
}
.detail-status-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.detail-status-row > span:last-child {
  color: #8193a7;
  font-size: 9px;
}
.detail-information > p {
  color: #aebdcb;
  font-size: 10px;
  line-height: 1.55;
  white-space: pre-wrap;
}
.muted-copy {
  color: #66798e !important;
  font-style: italic;
}
.detail-information dl {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: auto 0 0;
}
.detail-information dl div {
  padding: 8px;
  background: #0c1520;
  border: 1px solid #213247;
  border-radius: 7px;
}
.detail-information dt {
  color: #61758a;
  font-size: 7px;
  text-transform: uppercase;
}
.detail-information dd {
  margin: 2px 0 0;
  color: #c6d3e0;
  font-size: 9px;
  text-transform: capitalize;
}
.fullscreen-preview-card {
  position: relative;
  display: grid;
  min-height: 100%;
  place-items: center;
  padding: 4vw;
  background: #02060b;
}
.presentation-preview--fullscreen {
  width: min(100%, 177.78vh);
  max-height: 100vh;
  border: 0;
  border-radius: 0;
}
.presentation-preview--fullscreen .presentation-copy h2 {
  font-size: clamp(38px, 6vw, 90px);
}
.presentation-preview--fullscreen .presentation-copy p {
  font-size: clamp(18px, 2vw, 34px);
}
.presentation-preview--fullscreen .presentation-brand,
.presentation-preview--fullscreen .presentation-copy small {
  font-size: clamp(13px, 1.4vw, 22px);
}
.presentation-preview--fullscreen .presentation-category {
  font-size: clamp(12px, 1.2vw, 18px);
}
.fullscreen-close {
  position: fixed;
  z-index: 5;
  top: 16px;
  right: 16px;
  color: white;
  background: rgb(9 18 29 / 84%);
}
.fullscreen-operator-actions {
  position: fixed;
  z-index: 5;
  right: 72px;
  bottom: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  color: #a9bfd3;
  background: rgb(9 18 29 / 90%);
  border: 1px solid #344d67;
  border-radius: 10px;
  backdrop-filter: blur(10px);
}
.fullscreen-operator-actions > span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
}
.operator-console {
  display: grid;
  min-height: 100%;
  grid-template-rows: auto minmax(0, 1fr) auto;
  color: #e7eef7;
  background: radial-gradient(circle at 8% 0%, rgb(37 99 235 / 18%), transparent 30%), #08111b;
}
.operator-console-header,
.operator-console-footer,
.operator-console-title,
.operator-header-actions,
.operator-panel-label,
.operator-current-metadata {
  display: flex;
  align-items: center;
}
.operator-console-header {
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: #0d1824;
  border-bottom: 1px solid #26394e;
}
.operator-console-title {
  gap: 10px;
}
.operator-console-title > div {
  display: flex;
  flex-direction: column;
}
.operator-console-title strong {
  font-size: 14px;
}
.operator-console-title small {
  margin-top: 2px;
  color: #71869c;
  font-size: 8px;
}
.operator-live-dot {
  width: 10px;
  height: 10px;
  background: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 0 5px rgb(239 68 68 / 14%);
  animation: operator-live-pulse 1.8s ease-in-out infinite;
}
@keyframes operator-live-pulse {
  50% {
    box-shadow: 0 0 0 9px rgb(239 68 68 / 4%);
  }
}
.operator-header-actions {
  gap: 8px;
}
.operator-console-body {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(0, 1.7fr) minmax(270px, 0.7fr);
  gap: 16px;
  padding: 18px;
  overflow-y: auto;
}
.operator-current-panel,
.operator-next-panel {
  min-width: 0;
}
.operator-panel-label {
  min-height: 27px;
  justify-content: space-between;
  color: #8296ab;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.operator-panel-label > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.operator-panel-label i {
  width: 6px;
  height: 6px;
  background: #ef4444;
  border-radius: 50%;
}
.operator-main-preview {
  max-height: calc(100vh - 230px);
}
.operator-current-metadata {
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  color: #8498ac;
  font-size: 9px;
}
.operator-current-metadata > span:not(.status-pill) {
  display: flex;
  align-items: center;
  gap: 4px;
}
.operator-next-panel {
  display: flex;
  flex-direction: column;
}
.operator-next-card {
  display: grid;
  width: 100%;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px;
  color: #a9bbcc;
  background: #111f2e;
  border: 1px solid #2b4057;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
}
.operator-next-card:hover {
  background: #172b40;
  border-color: #4a7198;
}
.operator-next-image {
  display: flex;
  height: 58px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: white;
  background:
    linear-gradient(rgb(8 17 27 / 38%), rgb(8 17 27 / 74%)),
    linear-gradient(135deg, #3b5f86, #15283d);
  background-position: center;
  background-size: cover;
  border-radius: 7px;
}
.operator-next-image span {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}
.operator-next-image small {
  margin-top: 3px;
  font-size: 7px;
  text-transform: uppercase;
}
.operator-next-card > div:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.operator-next-card > div:nth-child(2) small {
  color: #60a5fa;
  font-size: 7px;
  text-transform: uppercase;
}
.operator-next-card > div:nth-child(2) strong {
  overflow: hidden;
  margin-top: 3px;
  color: #e0e9f2;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.operator-next-card > div:nth-child(2) span {
  margin-top: 3px;
  color: #778ba0;
  font-size: 8px;
}
.operator-no-next {
  display: flex;
  min-height: 135px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
  color: #71869a;
  background: #0d1824;
  border: 1px dashed #2a3e53;
  border-radius: 10px;
  text-align: center;
}
.operator-no-next .q-icon {
  font-size: 30px;
}
.operator-no-next strong {
  color: #aebdcc;
  font-size: 10px;
}
.operator-no-next span {
  font-size: 8px;
}
.operator-keyboard-help {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 11px;
  color: #91a7bb;
  background: #101c29;
  border: 1px solid #263a4f;
  border-radius: 9px;
}
.operator-keyboard-help > .q-icon {
  font-size: 24px;
}
.operator-keyboard-help > div {
  display: flex;
  flex-direction: column;
}
.operator-keyboard-help strong {
  font-size: 9px;
}
.operator-keyboard-help span {
  margin-top: 5px;
  color: #71879b;
  font-size: 8px;
}
.operator-keyboard-help kbd {
  display: inline-grid;
  min-width: 24px;
  height: 20px;
  margin: 0 3px;
  place-items: center;
  color: #dbeafe;
  background: #1d3146;
  border: 1px solid #3c5874;
  border-radius: 4px;
  box-shadow: 0 2px #0a111a;
}
.operator-next-panel > p {
  margin: auto 0 0;
  padding-top: 18px;
  color: #61768b;
  font-size: 8px;
  line-height: 1.5;
}
.operator-timeline {
  min-width: 0;
  grid-column: 1 / -1;
  padding-top: 3px;
}
.operator-timeline > header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.operator-timeline > header > div {
  display: flex;
  flex-direction: column;
}
.operator-timeline > header strong {
  color: #cdd9e5;
  font-size: 10px;
}
.operator-timeline > header small,
.operator-timeline > header > span {
  margin-top: 2px;
  color: #667c91;
  font-size: 8px;
}
.operator-timeline-track {
  display: grid;
  grid-auto-columns: minmax(175px, 1fr);
  grid-auto-flow: column;
  gap: 7px;
  padding: 2px 2px 7px;
  overflow-x: auto;
}
.operator-timeline-card {
  position: relative;
  display: grid;
  min-width: 0;
  grid-template-columns: 5px minmax(0, 1fr) auto;
  grid-template-rows: auto auto auto;
  column-gap: 8px;
  padding: 8px 9px;
  color: #8fa3b6;
  background: #0e1a27;
  border: 1px solid #273b50;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}
.operator-timeline-card:hover {
  background: #15283b;
  border-color: #456889;
}
.operator-timeline-card--live {
  background: linear-gradient(145deg, #16334b, #112235);
  border-color: #4b9ad5;
  box-shadow: inset 0 3px #38a3e6;
}
.operator-timeline-card--past {
  opacity: 0.62;
}
.timeline-card-state {
  grid-column: 2 / 3;
  color: #6d8296;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.operator-timeline-card--live .timeline-card-state {
  color: #7dd3fc;
}
.timeline-card-color {
  width: 5px;
  grid-column: 1;
  grid-row: 1 / 4;
  border-radius: 4px;
}
.operator-timeline-card strong {
  overflow: hidden;
  grid-column: 2 / 3;
  margin-top: 4px;
  color: #d6e1eb;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.operator-timeline-card small {
  overflow: hidden;
  grid-column: 2 / 3;
  margin-top: 3px;
  color: #71869a;
  font-size: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.operator-timeline-card > .q-icon {
  grid-column: 3;
  grid-row: 1 / 4;
  align-self: center;
  color: #6f879c;
}
.operator-timeline-card--live > .q-icon {
  color: #60a5fa;
}
.operator-console-footer {
  justify-content: space-between;
  gap: 14px;
  padding: 12px 18px;
  background: #0d1824;
  border-top: 1px solid #26394e;
}
.operator-console-footer > span {
  color: #687d92;
  font-size: 8px;
  text-align: center;
}
.operator-console-footer .q-btn {
  max-width: 34%;
}
.operator-console-footer :deep(.q-btn__content) {
  flex-wrap: nowrap;
}
.operator-console-footer :deep(.block) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.day-dialog-list {
  display: flex;
  max-height: 58vh;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}
.day-dialog-list button {
  display: grid;
  grid-template-columns: 5px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 9px;
  color: #9badc1;
  background: #111e2c;
  border: 1px solid #263a50;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}
.day-dialog-list button:hover {
  background: #17293c;
}
.day-dialog-list button > i {
  width: 5px;
  height: 32px;
  border-radius: 3px;
}
.day-dialog-list button > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.day-dialog-list b {
  overflow: hidden;
  color: #d5e0eb;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.day-dialog-list small {
  margin-top: 3px;
  color: #71849a;
  font-size: 8px;
}
.category-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.new-category-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.new-category-row input[type='color'] {
  width: 42px;
  height: 42px;
  padding: 3px;
  background: #0c1520;
  border: 1px solid #32465d;
  border-radius: 8px;
  cursor: pointer;
}
.managed-category-list {
  display: flex;
  max-height: 340px;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
}
.managed-category-list > div {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  background: #111e2c;
  border: 1px solid #263a50;
  border-radius: 7px;
}
.managed-category-color {
  width: 10px;
  height: 28px;
  border-radius: 4px;
}
.managed-category-list > div > span:nth-child(2) {
  display: flex;
  flex-direction: column;
}
.managed-category-list b {
  font-size: 10px;
}
.managed-category-list small {
  color: #6c8097;
  font-size: 8px;
}
.category-help {
  display: flex;
  gap: 5px;
  margin: 0;
  color: #71849a;
  font-size: 8px;
}
.activity-dialog-body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(230px, 0.65fr);
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
.form-grid--dates {
  grid-template-columns: repeat(2, minmax(145px, 1fr)) auto;
  align-items: center;
}
.form-preview {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  background:
    radial-gradient(circle at 75% 30%, #304f73, transparent 35%),
    linear-gradient(135deg, #13283e, #08111c);
  background-position: center;
  background-size: cover;
  border: 1px solid #30445c;
  border-radius: 9px;
}
.form-preview-copy {
  position: absolute;
  right: 8%;
  bottom: 10%;
  left: 8%;
  display: flex;
  flex-direction: column;
}
.form-preview-copy small {
  z-index: 1;
  color: #7dd3fc;
  font-size: 7px;
  text-transform: uppercase;
}
.form-preview-copy strong {
  z-index: 1;
  margin-top: 4px;
  color: white;
  font-size: 15px;
  line-height: 1.1;
}
.form-preview-copy span {
  z-index: 1;
  margin-top: 4px;
  color: #b9c9d8;
  font-size: 7px;
  text-transform: capitalize;
}
.image-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px;
  color: #a9bdd1;
  background: #101d2b;
  border: 1px dashed #3a5571;
  border-radius: 8px;
  cursor: pointer;
}
.image-picker:hover {
  color: #dbeafe;
  background: #16293d;
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
@media (max-width: 1260px) {
  .months-grid {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }
  .calendar-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .large-day {
    min-height: 100px;
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
    grid-column: 1/-1;
    margin: 0;
  }
  .sidebar-section + .sidebar-section {
    margin: 0;
    padding: 0;
    border: 0;
  }
  .months-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
  .large-month {
    overflow-x: auto;
  }
  .large-month-weekdays,
  .large-month-grid {
    min-width: 760px;
  }
  .detail-content,
  .activity-dialog-body {
    grid-template-columns: 1fr;
  }
  .operator-console-body {
    grid-template-columns: 1fr;
  }
  .operator-main-preview {
    max-height: none;
  }
  .operator-next-panel > p {
    margin-top: 12px;
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
  .calendar-header-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  }
  .calendar-summary,
  .months-grid,
  .calendar-sidebar,
  .form-grid,
  .form-grid--dates {
    grid-template-columns: 1fr;
  }
  .calendar-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .view-switcher {
    align-self: stretch;
  }
  .view-switcher button {
    flex: 1;
    justify-content: center;
  }
  .period-actions {
    align-self: flex-end;
  }
  .agenda-card {
    grid-template-columns: 40px 4px minmax(0, 1fr) auto;
  }
  .agenda-card .status-pill {
    display: none;
  }
  .new-category-row {
    grid-template-columns: 42px minmax(0, 1fr);
  }
  .new-category-row .q-btn {
    grid-column: 1/-1;
  }
  .form-grid--dates {
    align-items: stretch;
  }
  .operator-console-header {
    align-items: flex-start;
  }
  .operator-console-title small,
  .operator-console-footer > span {
    display: none;
  }
  .operator-header-actions .q-btn:first-child :deep(.block) {
    display: none;
  }
  .operator-console-body {
    padding: 10px;
  }
  .operator-console-footer {
    gap: 8px;
    padding: 9px 10px;
  }
  .operator-console-footer .q-btn {
    max-width: 49%;
  }
  .fullscreen-operator-actions {
    right: 14px;
    bottom: 14px;
    left: 14px;
  }
  .fullscreen-operator-actions > span {
    display: none;
  }
  .fullscreen-operator-actions .q-btn {
    width: 100%;
  }
}
</style>
