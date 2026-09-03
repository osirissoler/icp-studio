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
            aria-label="Volver"
            @click="goBack"
          />

          <div class="activity-icon">
            <q-icon name="image_search" />
          </div>

          <div class="header-copy">
            <h1>Imagen escondida</h1>
            <p>Crea actividades con imágenes, casillas, pistas y puntuación.</p>
          </div>
        </div>

        <q-btn
          v-if="viewMode === 'library'"
          unelevated
          no-caps
          icon="add"
          label="Nueva actividad"
          class="primary-button"
          @click="createActivity"
        />

        <div v-else-if="viewMode === 'editor'" class="header-actions">
          <q-btn flat no-caps label="Cancelar" class="cancel-button" @click="cancelActivity" />

          <q-btn
            unelevated
            no-caps
            icon="save"
            :label="editingId ? 'Guardar cambios' : 'Guardar'"
            class="primary-button"
            :loading="isSaving"
            @click="saveActivity"
          />
        </div>

        <div v-else-if="viewMode === 'setup'" class="header-actions">
          <q-btn
            flat
            no-caps
            icon="close"
            label="Cancelar"
            class="cancel-button"
            @click="cancelGameSetup"
          />

          <q-btn
            unelevated
            no-caps
            icon="play_arrow"
            label="Comenzar juego"
            class="primary-button"
            @click="startStandaloneGame"
          />
        </div>

        <div v-else class="header-actions">
          <q-badge v-if="isProjectionLive" color="positive" rounded class="live-badge">
            <span class="live-badge-dot" />
            EN VIVO
          </q-badge>

          <q-btn
            flat
            no-caps
            icon="close"
            label="Salir del juego"
            class="cancel-button"
            @click="closePlayMode"
          />

          <q-btn
            unelevated
            no-caps
            icon="cast"
            :label="isProjectionLive ? 'Actualizar en vivo' : 'Enviar en vivo'"
            class="primary-button"
            :loading="isSendingProjection"
            @click="sendPlayingStateToProjection(true)"
          />
        </div>
      </header>

      <!-- BIBLIOTECA -->
      <section v-if="viewMode === 'library'" class="library-area">
        <div v-if="isLoading" class="loading-state">
          <q-spinner size="34px" />
          <span>Cargando actividades...</span>
        </div>

        <div v-else-if="activities.length === 0" class="empty-state">
          <div class="empty-icon">
            <q-icon name="image_search" />
          </div>

          <h2>Imagen escondida</h2>

          <p>
            Todavía no tienes actividades guardadas. Cada actividad puede contener varias imágenes y
            cada imagen puede tener sus propias pistas.
          </p>

          <q-btn
            unelevated
            no-caps
            icon="add"
            label="Crear primera actividad"
            class="primary-button"
            @click="createActivity"
          />
        </div>

        <template v-else>
          <div class="library-heading">
            <div>
              <span class="eyebrow">ACTIVIDADES GUARDADAS</span>
              <h2>Mis actividades</h2>

              <p>
                {{ activities.length }}
                {{ activities.length === 1 ? 'actividad guardada' : 'actividades guardadas' }}
              </p>
            </div>
          </div>

          <div class="activity-grid">
            <article v-for="activity in activities" :key="activity.id" class="activity-card">
              <div class="activity-image">
                <img
                  v-if="getActivityPreviewUrl(activity)"
                  :src="getActivityPreviewUrl(activity)"
                  :alt="activity.title"
                />

                <div v-else class="activity-image-placeholder">
                  <q-icon name="image" />
                </div>

                <div class="activity-round-count">
                  <q-icon name="collections" />

                  <span>
                    {{ activity.rounds.length }}
                    {{ activity.rounds.length === 1 ? 'imagen' : 'imágenes' }}
                  </span>
                </div>
              </div>

              <div class="activity-card-content">
                <div class="activity-card-heading">
                  <div>
                    <h3>{{ activity.title }}</h3>
                    <span>Actualizada {{ formatDate(activity.updatedAt) }}</span>
                  </div>

                  <q-btn flat round dense icon="more_vert" class="more-button">
                    <q-menu dark>
                      <q-list dense style="min-width: 180px">
                        <q-item clickable v-close-popup @click="editActivity(activity)">
                          <q-item-section avatar>
                            <q-icon name="edit" />
                          </q-item-section>

                          <q-item-section>Editar</q-item-section>
                        </q-item>

                        <q-item clickable v-close-popup @click="duplicateActivity(activity)">
                          <q-item-section avatar>
                            <q-icon name="content_copy" />
                          </q-item-section>

                          <q-item-section>Duplicar actividad</q-item-section>
                        </q-item>

                        <q-separator dark />

                        <q-item
                          clickable
                          v-close-popup
                          class="delete-menu-item"
                          @click="deleteActivity(activity)"
                        >
                          <q-item-section avatar>
                            <q-icon name="delete_outline" />
                          </q-item-section>

                          <q-item-section>Eliminar</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>

                <div class="activity-info-row">
                  <div>
                    <q-icon name="collections" />
                    <span>{{ activity.rounds.length }} rondas</span>
                  </div>

                  <div>
                    <q-icon name="lightbulb" />
                    <span>{{ countActivityHints(activity) }} pistas</span>
                  </div>

                  <div v-if="activity.rounds[0]">
                    <q-icon name="grid_view" />
                    <span>
                      {{ activity.rounds[0].rows }}
                      ×
                      {{ activity.rounds[0].columns }}
                    </span>
                  </div>
                </div>

                <div class="activity-card-actions">
                  <q-btn
                    flat
                    no-caps
                    icon="edit"
                    label="Editar"
                    class="secondary-button"
                    @click="editActivity(activity)"
                  />

                  <q-btn
                    unelevated
                    no-caps
                    icon="play_arrow"
                    label="Abrir"
                    class="open-button"
                    @click="openActivity(activity)"
                  />
                </div>
              </div>
            </article>
          </div>
        </template>
      </section>

      <!-- EDITOR -->
      <section v-else-if="viewMode === 'editor'" class="creator-area">
        <aside class="configuration-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">
                {{ editingId ? 'EDITANDO ACTIVIDAD' : 'NUEVA ACTIVIDAD' }}
              </span>

              <h2>
                {{ editingId ? 'Editar Imagen escondida' : 'Configurar actividad' }}
              </h2>
            </div>

            <q-icon name="tune" />
          </div>

          <div class="form-section">
            <label class="field-label">Nombre de la actividad</label>

            <q-input
              v-model="form.title"
              dense
              outlined
              dark
              placeholder="Ej. Personajes del Antiguo Testamento"
              class="app-input"
            />
          </div>

          <div class="form-section rounds-section">
            <div class="section-title-row">
              <div>
                <label class="field-label">Imágenes de la actividad</label>

                <span class="field-help"> Cada imagen funciona como una ronda independiente. </span>
              </div>

              <q-btn
                unelevated
                dense
                no-caps
                icon="add"
                label="Agregar"
                class="add-round-button"
                @click="addRound"
              />
            </div>

            <div class="round-list">
              <button
                v-for="(round, index) in rounds"
                :key="round.id"
                type="button"
                class="round-item"
                :class="{ active: round.id === activeRoundId }"
                @click="selectRound(round.id)"
              >
                <div class="round-thumbnail">
                  <img
                    v-if="round.imageUrl"
                    :src="round.imageUrl"
                    :alt="round.answer || `Imagen ${index + 1}`"
                  />

                  <q-icon v-else name="image" />
                </div>

                <div class="round-copy">
                  <strong>Imagen {{ index + 1 }}</strong>
                  <span>{{ round.answer.trim() || 'Sin respuesta' }}</span>

                  <small>
                    {{ round.hints.length }}
                    {{ round.hints.length === 1 ? 'pista' : 'pistas' }}
                  </small>
                </div>

                <q-icon v-if="round.id === activeRoundId" name="chevron_right" />
              </button>
            </div>
          </div>

          <template v-if="activeRound">
            <div class="round-editor-heading">
              <div>
                <span class="eyebrow">CONFIGURACIÓN DE IMAGEN</span>
                <h3>Imagen {{ activeRoundNumber }}</h3>
              </div>

              <div class="round-editor-actions">
                <q-btn flat dense round icon="content_copy" @click="duplicateRound">
                  <q-tooltip>Duplicar imagen</q-tooltip>
                </q-btn>

                <q-btn
                  flat
                  dense
                  round
                  icon="delete_outline"
                  class="remove-image-button"
                  :disable="rounds.length <= 1"
                  @click="deleteRound"
                >
                  <q-tooltip>Eliminar imagen</q-tooltip>
                </q-btn>
              </div>
            </div>

            <div class="form-section">
              <label class="field-label">Respuesta</label>

              <q-input
                v-model="activeRound.answer"
                dense
                outlined
                dark
                placeholder="Ej. Daniel en el foso de los leones"
                class="app-input"
              />

              <span class="field-help"> La respuesta solo será visible para el operador. </span>
            </div>

            <div class="form-section">
              <label class="field-label">Referencia bíblica</label>

              <q-input
                v-model="activeRound.bibleReference"
                dense
                outlined
                dark
                placeholder="Ej. Daniel 6"
                class="app-input"
              />
            </div>

            <div class="form-section">
              <div class="field-heading">
                <div>
                  <label class="field-label">Imagen</label>

                  <span class="field-help"> Selecciona la imagen que será descubierta. </span>
                </div>

                <q-btn
                  v-if="activeRound.imageUrl"
                  flat
                  dense
                  round
                  icon="delete_outline"
                  class="remove-image-button"
                  @click="removeRoundImage"
                />
              </div>

              <label class="image-selector">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="file-input"
                  @change="handleImageSelected"
                />

                <q-icon :name="activeRound.imageUrl ? 'swap_horiz' : 'add_photo_alternate'" />

                <div>
                  <strong>
                    {{ activeRound.imageUrl ? 'Cambiar imagen' : 'Seleccionar imagen' }}
                  </strong>

                  <span>
                    {{ activeRound.imageName || 'JPG, PNG, WEBP u otra imagen compatible.' }}
                  </span>
                </div>
              </label>
            </div>

            <div class="form-section">
              <div class="section-title-row">
                <div>
                  <label class="field-label">Cuadrícula</label>

                  <span class="field-help"> Configura cuántas casillas cubrirán esta imagen. </span>
                </div>

                <q-badge class="grid-count"> {{ totalTiles }} casillas </q-badge>
              </div>

              <div class="grid-controls">
                <div class="number-control">
                  <span>Filas</span>

                  <div class="number-control-buttons">
                    <q-btn
                      flat
                      dense
                      round
                      icon="remove"
                      :disable="activeRound.rows <= MIN_GRID_SIZE"
                      @click="changeRows(-1)"
                    />

                    <strong>{{ activeRound.rows }}</strong>

                    <q-btn
                      flat
                      dense
                      round
                      icon="add"
                      :disable="activeRound.rows >= MAX_GRID_SIZE"
                      @click="changeRows(1)"
                    />
                  </div>
                </div>

                <div class="number-control">
                  <span>Columnas</span>

                  <div class="number-control-buttons">
                    <q-btn
                      flat
                      dense
                      round
                      icon="remove"
                      :disable="activeRound.columns <= MIN_GRID_SIZE"
                      @click="changeColumns(-1)"
                    />

                    <strong>{{ activeRound.columns }}</strong>

                    <q-btn
                      flat
                      dense
                      round
                      icon="add"
                      :disable="activeRound.columns >= MAX_GRID_SIZE"
                      @click="changeColumns(1)"
                    />
                  </div>
                </div>
              </div>

              <div class="grid-presets">
                <q-btn
                  v-for="preset in gridPresets"
                  :key="preset"
                  flat
                  dense
                  no-caps
                  :label="`${preset} × ${preset}`"
                  :class="[
                    'preset-button',
                    {
                      active: activeRound.rows === preset && activeRound.columns === preset,
                    },
                  ]"
                  @click="applyGridPreset(preset)"
                />
              </div>
            </div>

            <!-- PISTAS DE LA RONDA -->
            <div class="form-section hints-editor-section">
              <div class="section-title-row">
                <div>
                  <label class="field-label">
                    <q-icon name="lightbulb" />
                    Pistas
                  </label>

                  <span class="field-help"> Estas pistas podrán mostrarse durante el juego. </span>
                </div>

                <q-btn
                  unelevated
                  dense
                  no-caps
                  icon="add"
                  label="Agregar pista"
                  class="hint-add-button"
                  @click="addHint"
                />
              </div>

              <div v-if="activeRound.hints.length === 0" class="empty-hints">
                <q-icon name="lightbulb_outline" />
                <span>Esta imagen todavía no tiene pistas.</span>
              </div>

              <div v-else class="hint-editor-list">
                <div
                  v-for="(hint, hintIndex) in activeRound.hints"
                  :key="hint.id"
                  class="hint-editor-card"
                >
                  <div class="hint-editor-heading">
                    <strong>Pista {{ hintIndex + 1 }}</strong>

                    <q-btn
                      flat
                      dense
                      round
                      icon="delete_outline"
                      class="remove-image-button"
                      @click="deleteHint(hint.id)"
                    />
                  </div>

                  <q-input
                    v-model="hint.text"
                    outlined
                    dense
                    dark
                    autogrow
                    placeholder="Escribe la pista..."
                    class="app-input"
                  />

                  <div class="hint-cost-row">
                    <q-select
                      v-model="hint.costMode"
                      :options="hintCostOptions"
                      emit-value
                      map-options
                      dense
                      outlined
                      dark
                      label="Costo"
                      class="hint-cost-select"
                    />

                    <q-input
                      v-if="hint.costMode === 'custom'"
                      v-model.number="hint.customCost"
                      type="number"
                      min="0"
                      dense
                      outlined
                      dark
                      suffix="pts"
                      class="hint-custom-cost"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </aside>

        <!-- PREVISUALIZACIÓN -->
        <main class="preview-panel">
          <div class="preview-heading">
            <div>
              <span class="eyebrow">PREVISUALIZACIÓN</span>

              <h2>
                {{ form.title.trim() || 'Imagen escondida' }}
              </h2>

              <span v-if="activeRound" class="preview-round-label">
                Imagen {{ activeRoundNumber }} de {{ rounds.length }}
              </span>
            </div>

            <div class="preview-status">
              <q-icon name="visibility" />

              <span> {{ revealedCount }} / {{ totalTiles }} descubiertas </span>
            </div>
          </div>

          <div class="preview-round-navigation">
            <q-btn
              flat
              dense
              no-caps
              icon="chevron_left"
              label="Anterior"
              class="round-navigation-button"
              :disable="activeRoundIndex <= 0"
              @click="goToPreviousRound"
            />

            <div class="round-dots">
              <button
                v-for="(round, index) in rounds"
                :key="round.id"
                type="button"
                class="round-dot"
                :class="{ active: round.id === activeRoundId }"
                :aria-label="`Ir a imagen ${index + 1}`"
                @click="selectRound(round.id)"
              />
            </div>

            <q-btn
              flat
              dense
              no-caps
              icon-right="chevron_right"
              label="Siguiente"
              class="round-navigation-button"
              :disable="activeRoundIndex >= rounds.length - 1"
              @click="goToNextRound"
            />
          </div>

          <div class="game-preview">
            <div
              v-if="activeRound"
              class="image-stage"
              :class="{ 'without-image': !activeRound.imageUrl }"
              :style="gridStyle"
            >
              <img
                v-if="activeRound.imageUrl"
                :src="activeRound.imageUrl"
                alt=""
                class="hidden-image"
              />

              <div v-else class="image-placeholder">
                <q-icon name="image" />
                <strong>Selecciona una imagen</strong>
              </div>

              <button
                v-for="tile in tiles"
                :key="tile.id"
                type="button"
                class="cover-tile"
                :class="{ revealed: tile.revealed }"
                @click="toggleTile(tile.id)"
              >
                <span v-if="!tile.revealed">
                  {{ tile.id }}
                </span>
              </button>
            </div>
          </div>

          <div v-if="activeRound" class="preview-footer">
            <div class="operator-answer">
              <span>RESPUESTA DEL OPERADOR</span>

              <strong>
                {{ activeRound.answer.trim() || 'Sin respuesta definida' }}
              </strong>

              <small v-if="activeRound.bibleReference.trim()">
                {{ activeRound.bibleReference }}
              </small>
            </div>

            <div class="preview-actions">
              <q-btn
                flat
                no-caps
                icon="restart_alt"
                label="Cubrir"
                class="secondary-button"
                @click="resetTiles"
              />

              <q-btn
                flat
                no-caps
                icon="shuffle"
                label="Aleatoria"
                class="secondary-button"
                :disable="allTilesRevealed"
                @click="revealRandomTile"
              />

              <q-btn
                flat
                no-caps
                icon="visibility"
                label="Descubrir todas"
                class="secondary-button"
                @click="revealAllTiles"
              />
            </div>
          </div>
        </main>
      </section>

      <!-- CONFIGURAR SESIÓN -->
      <section v-else-if="viewMode === 'setup'" class="game-setup-area">
        <div class="game-setup-card">
          <div class="setup-heading">
            <div class="setup-icon">
              <q-icon name="sports_esports" />
            </div>

            <div>
              <span class="eyebrow">PREPARAR JUEGO</span>
              <h2>{{ setupActivity?.title }}</h2>
              <p>Configura cómo se jugará esta ejecución.</p>
            </div>
          </div>

          <div class="setup-section">
            <label class="field-label">Modo de juego</label>

            <div class="mode-selector">
              <button
                type="button"
                class="mode-card"
                :class="{ active: sessionSetup.mode === 'free' }"
                @click="sessionSetup.mode = 'free'"
              >
                <q-icon name="person" />

                <div>
                  <strong>Juego libre</strong>
                  <span>Sin equipos ni marcador.</span>
                </div>
              </button>

              <button
                type="button"
                class="mode-card"
                :class="{ active: sessionSetup.mode === 'teams' }"
                @click="sessionSetup.mode = 'teams'"
              >
                <q-icon name="groups" />

                <div>
                  <strong>Por equipos</strong>
                  <span>Equipos, marcador, puntos y pistas.</span>
                </div>
              </button>
            </div>
          </div>

          <template v-if="sessionSetup.mode === 'teams'">
            <div class="setup-section">
              <div class="section-title-row">
                <div>
                  <label class="field-label">Cantidad de equipos</label>
                  <span class="field-help"> Puedes usar entre 2 y 8 equipos. </span>
                </div>

                <div class="team-count-control">
                  <q-btn
                    flat
                    round
                    dense
                    icon="remove"
                    :disable="sessionSetup.teamCount <= MIN_TEAM_COUNT"
                    @click="changeTeamCount(-1)"
                  />

                  <strong>{{ sessionSetup.teamCount }}</strong>

                  <q-btn
                    flat
                    round
                    dense
                    icon="add"
                    :disable="sessionSetup.teamCount >= MAX_TEAM_COUNT"
                    @click="changeTeamCount(1)"
                  />
                </div>
              </div>
            </div>

            <div class="setup-section">
              <label class="field-label">Nombres de los equipos</label>

              <div class="team-name-grid">
                <q-input
                  v-for="(team, index) in sessionSetup.teams"
                  :key="team.id"
                  v-model="team.name"
                  dense
                  outlined
                  dark
                  :label="`Equipo ${index + 1}`"
                  class="app-input"
                />
              </div>
            </div>

            <div class="setup-section">
              <label class="field-label">Sistema de puntuación</label>

              <div class="score-mode-selector">
                <button
                  type="button"
                  class="score-mode-card"
                  :class="{ active: sessionSetup.scoringMode === 'none' }"
                  @click="sessionSetup.scoringMode = 'none'"
                >
                  <q-icon name="block" />

                  <div>
                    <strong>Sin puntuación</strong>
                    <span>Solo registra el equipo que acertó.</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="score-mode-card"
                  :class="{ active: sessionSetup.scoringMode === 'fixed' }"
                  @click="sessionSetup.scoringMode = 'fixed'"
                >
                  <q-icon name="stars" />

                  <div>
                    <strong>Fija</strong>
                    <span>Cada respuesta vale la misma cantidad.</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="score-mode-card"
                  :class="{
                    active: sessionSetup.scoringMode === 'decreasing',
                  }"
                  @click="sessionSetup.scoringMode = 'decreasing'"
                >
                  <q-icon name="trending_down" />

                  <div>
                    <strong>Decreciente</strong>
                    <span>Descubrir casillas reduce los puntos.</span>
                  </div>
                </button>
              </div>
            </div>

            <div v-if="sessionSetup.scoringMode !== 'none'" class="setup-section scoring-fields">
              <div>
                <label class="field-label">
                  {{
                    sessionSetup.scoringMode === 'fixed' ? 'Puntos por acierto' : 'Puntos máximos'
                  }}
                </label>

                <q-input
                  v-model.number="sessionSetup.basePoints"
                  dense
                  outlined
                  dark
                  type="number"
                  min="0"
                  suffix="pts"
                  class="app-input"
                />
              </div>

              <template v-if="sessionSetup.scoringMode === 'decreasing'">
                <div>
                  <label class="field-label"> Descuento por casilla </label>

                  <q-input
                    v-model.number="sessionSetup.deductionPerReveal"
                    dense
                    outlined
                    dark
                    type="number"
                    min="0"
                    suffix="pts"
                    class="app-input"
                  />
                </div>

                <div>
                  <label class="field-label"> Puntuación mínima </label>

                  <q-input
                    v-model.number="sessionSetup.minimumPoints"
                    dense
                    outlined
                    dark
                    type="number"
                    min="0"
                    suffix="pts"
                    class="app-input"
                  />
                </div>
              </template>
            </div>
          </template>

          <!-- CONFIGURACIÓN DE PISTAS -->
          <div v-if="activityHasHints" class="setup-section hint-setup-section">
            <div class="hint-section-heading">
              <div class="hint-section-icon">
                <q-icon name="lightbulb" />
              </div>

              <div>
                <label class="field-label">Sistema de pistas</label>

                <span class="field-help">
                  Define cómo podrán utilizarse las pistas durante este juego.
                </span>
              </div>
            </div>

            <div class="hint-mode-grid">
              <button
                type="button"
                class="hint-mode-card"
                :class="{ active: sessionSetup.hintMode === 'disabled' }"
                @click="sessionSetup.hintMode = 'disabled'"
              >
                <q-icon name="block" />
                <strong>Sin pistas</strong>
                <span>No se podrán solicitar pistas.</span>
              </button>

              <button
                type="button"
                class="hint-mode-card"
                :class="{ active: sessionSetup.hintMode === 'free' }"
                @click="sessionSetup.hintMode = 'free'"
              >
                <q-icon name="redeem" />
                <strong>Gratis</strong>
                <span>Todas las pistas son gratuitas.</span>
              </button>

              <button
                type="button"
                class="hint-mode-card"
                :class="{ active: sessionSetup.hintMode === 'paid' }"
                @click="sessionSetup.hintMode = 'paid'"
              >
                <q-icon name="paid" />
                <strong>Con costo</strong>
                <span>Las pistas descuentan puntos.</span>
              </button>

              <button
                type="button"
                class="hint-mode-card"
                :class="{ active: sessionSetup.hintMode === 'mixed' }"
                @click="sessionSetup.hintMode = 'mixed'"
              >
                <q-icon name="tune" />
                <strong>Mixto</strong>
                <span>Primero gratis y luego con costo.</span>
              </button>
            </div>

            <div
              v-if="sessionSetup.hintMode === 'paid' || sessionSetup.hintMode === 'mixed'"
              class="hint-settings-grid"
            >
              <div v-if="sessionSetup.hintMode === 'mixed'">
                <label class="field-label"> Pistas gratis por equipo </label>

                <q-input
                  v-model.number="sessionSetup.freeHintsPerTeam"
                  type="number"
                  min="0"
                  max="100"
                  dense
                  outlined
                  dark
                  class="app-input"
                />
              </div>

              <div>
                <label class="field-label"> Costo predeterminado </label>

                <q-input
                  v-model.number="sessionSetup.hintDefaultCost"
                  type="number"
                  min="0"
                  dense
                  outlined
                  dark
                  suffix="pts"
                  class="app-input"
                />
              </div>
            </div>

            <q-toggle
              v-if="sessionSetup.hintMode === 'paid' || sessionSetup.hintMode === 'mixed'"
              v-model="sessionSetup.allowNegativeScore"
              dark
              color="purple-5"
              label="Permitir comprar pistas aunque el equipo quede con puntuación negativa"
            />
          </div>

          <div class="setup-summary">
            <div>
              <q-icon name="collections" />
              <span>{{ setupActivity?.rounds.length ?? 0 }} imágenes</span>
            </div>

            <div>
              <q-icon :name="sessionSetup.mode === 'teams' ? 'groups' : 'person'" />

              <span>
                {{
                  sessionSetup.mode === 'teams'
                    ? `${sessionSetup.teamCount} equipos`
                    : 'Juego libre'
                }}
              </span>
            </div>

            <div v-if="activityHasHints">
              <q-icon name="lightbulb" />
              <span>{{ setupHintLabel }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- MODO OPERADOR -->
      <section v-else class="play-area" :class="{ 'play-area--teams': hasTeams }">
        <aside class="play-sidebar">
          <div class="play-sidebar-heading">
            <span class="eyebrow">MODO OPERADOR</span>

            <h2>{{ playingActivity?.title }}</h2>

            <p>
              Imagen {{ playingRoundIndex + 1 }}
              de
              {{ playingActivity?.rounds.length ?? 0 }}
            </p>
          </div>

          <div v-if="hasTeams" class="scoreboard">
            <div class="scoreboard-heading">
              <div>
                <span class="eyebrow">MARCADOR</span>
                <strong>Equipos</strong>
              </div>

              <q-btn flat round dense icon="restart_alt" @click="resetFullGame">
                <q-tooltip>Reiniciar juego completo</q-tooltip>
              </q-btn>
            </div>

            <button
              v-for="team in sessionTeams"
              :key="team.id"
              type="button"
              class="score-team"
              :class="{
                active: team.id === activeTeamId,
                winner: roundWinner?.teamId === team.id,
              }"
              @click="activeTeamId = team.id"
            >
              <div class="score-team-main">
                <span class="team-avatar">
                  {{ teamInitials(team.name) }}
                </span>

                <div>
                  <strong>{{ team.name }}</strong>

                  <small v-if="team.id === activeTeamId"> Equipo seleccionado </small>
                </div>
              </div>

              <span v-if="hasScoring" class="team-score">
                {{ team.score }}
              </span>

              <q-icon
                v-else-if="roundWinner?.teamId === team.id"
                name="emoji_events"
                class="team-winner-icon"
              />
            </button>
          </div>

          <div class="play-round-list">
            <button
              v-for="(round, index) in playingActivity?.rounds ?? []"
              :key="round.id"
              type="button"
              class="play-round-item"
              :class="{
                active: index === playingRoundIndex,
                completed: Boolean(roundResults[round.id]),
              }"
              @click="setPlayingRound(index)"
            >
              <span class="play-round-number">
                <q-icon v-if="roundResults[round.id]" name="check" />

                <template v-else>
                  {{ index + 1 }}
                </template>
              </span>

              <div>
                <strong>Imagen {{ index + 1 }}</strong>
                <small>{{ round.answer }}</small>
              </div>

              <q-icon v-if="index === playingRoundIndex" name="play_arrow" />
            </button>
          </div>

          <div v-if="playingRound" class="private-answer-card">
            <div class="private-label">
              <q-icon name="lock" />
              INFORMACIÓN DEL OPERADOR
            </div>

            <span>Respuesta</span>
            <strong>{{ playingRound.answer }}</strong>

            <template v-if="playingRound.bibleReference">
              <span>Referencia bíblica</span>
              <strong>{{ playingRound.bibleReference }}</strong>
            </template>
          </div>
        </aside>

        <main class="operator-workspace">
          <div class="operator-topbar">
            <div>
              <span class="eyebrow">CONTROL DEL JUEGO</span>
              <h2>Imagen {{ playingRoundIndex + 1 }}</h2>
            </div>

            <div class="operator-status-group">
              <div v-if="hasTeams && hasScoring" class="available-points">
                <span>
                  {{
                    sessionScoring.mode === 'decreasing'
                      ? 'PUNTOS DISPONIBLES'
                      : 'VALOR DE LA RONDA'
                  }}
                </span>

                <strong>{{ currentAwardPoints }}</strong>
              </div>

              <div class="operator-progress">
                <q-icon name="grid_view" />

                <strong>
                  {{ playingRevealedCount }}
                  /
                  {{ playingTiles.length }}
                </strong>

                <span>descubiertas</span>
              </div>
            </div>
          </div>

          <div v-if="hasTeams" class="active-team-bar">
            <div>
              <span class="active-team-label"> EQUIPO ACTUAL </span>

              <strong>
                {{ activeTeam?.name ?? 'Selecciona un equipo' }}
              </strong>

              <small v-if="hasScoring"> {{ activeTeam?.score ?? 0 }} puntos </small>
            </div>

            <div class="score-actions">
              <template v-if="hasScoring">
                <q-btn
                  flat
                  round
                  dense
                  icon="remove"
                  :disable="!activeTeam"
                  @click="adjustActiveTeamScore(-10)"
                />

                <span class="active-team-score">
                  {{ activeTeam?.score ?? 0 }}
                </span>

                <q-btn
                  flat
                  round
                  dense
                  icon="add"
                  :disable="!activeTeam"
                  @click="adjustActiveTeamScore(10)"
                />
              </template>

              <q-btn
                v-if="!roundWinner"
                unelevated
                no-caps
                icon="emoji_events"
                :label="awardButtonLabel"
                class="correct-answer-button"
                :disable="!activeTeam"
                @click="awardCurrentRound"
              />

              <q-btn
                v-else
                flat
                no-caps
                icon="undo"
                label="Quitar resultado"
                class="control-secondary"
                @click="undoCurrentRoundAward"
              />
            </div>
          </div>

          <!-- PISTAS DEL OPERADOR -->
          <div
            v-if="
              playingRound && playingRound.hints.length > 0 && sessionHintConfig.mode !== 'disabled'
            "
            class="operator-hints-panel"
          >
            <div class="operator-hints-heading">
              <div>
                <span class="eyebrow">PISTAS</span>
                <strong>Pistas de esta imagen</strong>
              </div>

              <div class="hint-heading-actions">
                <q-btn
                  v-if="currentPublicHint"
                  flat
                  dense
                  no-caps
                  icon="visibility_off"
                  label="Ocultar de pantalla"
                  class="control-secondary"
                  @click="hidePublicHint"
                />

                <q-btn
                  v-if="canUndoHint"
                  flat
                  dense
                  no-caps
                  icon="undo"
                  label="Deshacer última"
                  class="control-secondary"
                  @click="undoLastHintUsage"
                />
              </div>
            </div>

            <div class="operator-hint-list">
              <article
                v-for="(hint, index) in playingRound.hints"
                :key="hint.id"
                class="operator-hint-card"
                :class="{
                  used: isHintUsed(hint.id),
                  public: currentPublicHint === hint.text,
                }"
              >
                <div class="operator-hint-number">
                  <q-icon v-if="isHintUsed(hint.id)" name="check" />

                  <span v-else>
                    {{ index + 1 }}
                  </span>
                </div>

                <div class="operator-hint-copy">
                  <span>PISTA {{ index + 1 }}</span>
                  <strong>{{ hint.text }}</strong>

                  <small v-if="isHintUsed(hint.id)"> Utilizada </small>

                  <small v-else>
                    {{ getHintCostLabel(hint) }}
                  </small>
                </div>

                <q-btn
                  v-if="!isHintUsed(hint.id)"
                  unelevated
                  no-caps
                  icon="lightbulb"
                  :label="getHintActionLabel(hint)"
                  class="hint-use-button"
                  :disable="!canUseHintNow(hint)"
                  @click="useHint(hint)"
                />

                <q-btn
                  v-else
                  flat
                  no-caps
                  icon="visibility"
                  label="Mostrar"
                  class="control-secondary"
                  @click="showUsedHint(hint)"
                />
              </article>
            </div>

            <div v-if="currentPublicHint" class="current-public-hint">
              <q-icon name="cast" />

              <div>
                <span>PISTA MOSTRADA EN PANTALLA</span>
                <strong>{{ currentPublicHint }}</strong>
              </div>
            </div>
          </div>

          <div class="operator-stage-shell">
            <div v-if="playingRound" class="operator-image-stage" :style="playingGridStyle">
              <img :src="playingImageUrl" :alt="playingRound.answer" class="hidden-image" />

              <button
                v-for="tile in playingTiles"
                :key="tile.id"
                type="button"
                class="cover-tile operator-cover-tile"
                :class="{ revealed: tile.revealed }"
                @click="togglePlayingTile(tile.id)"
              >
                <span v-if="!tile.revealed">
                  {{ tile.id }}
                </span>
              </button>
            </div>
          </div>

          <div class="operator-controls">
            <div class="operator-control-group">
              <q-btn
                unelevated
                no-caps
                icon="shuffle"
                label="Descubrir aleatoria"
                class="control-primary"
                :disable="playingAllRevealed"
                @click="revealRandomPlayingTile"
              />

              <q-btn
                flat
                no-caps
                icon="visibility"
                label="Descubrir todas"
                class="control-secondary"
                :disable="playingAllRevealed"
                @click="revealAllPlayingTiles"
              />

              <q-btn
                flat
                no-caps
                icon="restart_alt"
                label="Cubrir todas"
                class="control-secondary"
                :disable="playingRevealedCount === 0"
                @click="resetPlayingTiles"
              />
            </div>

            <div class="operator-round-navigation">
              <q-btn
                flat
                no-caps
                icon="arrow_upward"
                label="Anterior"
                class="control-secondary"
                :disable="playingRoundIndex <= 0"
                @click="movePlayingRound(-1)"
              />

              <q-btn
                unelevated
                no-caps
                icon-right="arrow_downward"
                label="Siguiente"
                class="control-primary"
                :disable="playingRoundIndex >= (playingActivity?.rounds.length ?? 1) - 1"
                @click="movePlayingRound(1)"
              />
            </div>
          </div>
        </main>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

import {
  adjustGameTeamScore,
  applyRoundResultToTeams,
  awardGameRound,
  calculateRoundPoints,
  normalizeGameScoringConfig,
  removeRoundResultFromTeams,
  resetGameTeamsScore,
  type GameRoundResult,
  type GameScoreMode,
  type GameSessionScoringConfig,
  type GameSessionTeam,
} from '../shared/game-session';

import {
  applyGameHintCost,
  canUseGameHint,
  countGameHintsUsedByTeam,
  createGameHintUsage,
  hasGameHintBeenUsedInRound,
  normalizeGameHint,
  normalizeGameHintConfig,
  resolveGameHintCost,
  restoreGameHintCost,
  type GameHint,
  type GameHintConfig,
  type GameHintCostMode,
  type GameHintMode,
  type GameHintUsage,
} from '../shared/game-hints';

import { createHiddenImageProjectionUrl } from '../shared/hidden-image-projection';

type ViewMode = 'library' | 'editor' | 'setup' | 'play';

type StandaloneMode = 'free' | 'teams';

interface HiddenImageTile {
  id: number;
  revealed: boolean;
}

interface HiddenImageStoredRound {
  id: string;
  answer: string;
  bibleReference: string;
  rows: number;
  columns: number;
  imageName: string;
  imageBlob: Blob;
  hints: GameHint[];
}

interface HiddenImageRoundDraft {
  id: string;
  answer: string;
  bibleReference: string;
  rows: number;
  columns: number;
  imageName: string;
  imageBlob: Blob | null;
  imageUrl: string;
  hints: GameHint[];
}

interface HiddenImageActivity {
  id: string;
  title: string;
  rounds: HiddenImageStoredRound[];
  createdAt: string;
  updatedAt: string;
}

interface LegacyHiddenImageRound {
  id?: string;
  answer?: string;
  bibleReference?: string;
  rows?: number;
  columns?: number;
  imageName?: string;
  imageBlob?: Blob;
  hints?: GameHint[];
}

interface LegacyHiddenImageActivity {
  id: string;
  title: string;
  answer?: string;
  bibleReference?: string;
  rows?: number;
  columns?: number;
  imageName?: string;
  imageBlob?: Blob;
  rounds?: LegacyHiddenImageRound[];
  createdAt?: string;
  updatedAt?: string;
}

interface HiddenImageForm {
  title: string;
}

interface GameSetupTeam {
  id: string;
  name: string;
}

interface StandaloneSessionSetup {
  mode: StandaloneMode;
  teamCount: number;
  teams: GameSetupTeam[];

  scoringMode: GameScoreMode;
  basePoints: number;
  deductionPerReveal: number;
  minimumPoints: number;

  hintMode: GameHintMode;
  freeHintsPerTeam: number;
  hintDefaultCost: number;
  allowNegativeScore: boolean;
}

const DB_NAME = 'icp-studio';
const DB_VERSION = 1;
const STORE_NAME = 'hidden-image-activities';

const MIN_GRID_SIZE = 2;
const MAX_GRID_SIZE = 8;
const MIN_TEAM_COUNT = 2;
const MAX_TEAM_COUNT = 8;

const router = useRouter();
const $q = useQuasar();

const viewMode = ref<ViewMode>('library');

const isLoading = ref(true);
const isSaving = ref(false);
const isProjectionLive = ref(false);
const isSendingProjection = ref(false);

const editingId = ref<string | null>(null);

const activeRoundId = ref('');

const activities = ref<HiddenImageActivity[]>([]);

const rounds = ref<HiddenImageRoundDraft[]>([]);

const tiles = ref<HiddenImageTile[]>([]);

const fileInput = ref<HTMLInputElement | null>(null);

const previewUrls = new Map<string, string>();

const projectionDataUrls = new Map<string, string>();

let projectionSequence = 0;

const gridPresets = [2, 3, 4, 5, 6];

const hintCostOptions: Array<{
  label: string;
  value: GameHintCostMode;
}> = [
  {
    label: 'Costo predeterminado',
    value: 'default',
  },
  {
    label: 'Gratis',
    value: 'free',
  },
  {
    label: 'Costo personalizado',
    value: 'custom',
  },
];

const form = reactive<HiddenImageForm>({
  title: '',
});

const setupActivity = ref<HiddenImageActivity | null>(null);

const sessionSetup = reactive<StandaloneSessionSetup>({
  mode: 'free',
  teamCount: 2,
  teams: [],

  scoringMode: 'fixed',
  basePoints: 100,
  deductionPerReveal: 5,
  minimumPoints: 20,

  hintMode: 'free',
  freeHintsPerTeam: 1,
  hintDefaultCost: 10,
  allowNegativeScore: false,
});

const playingActivity = ref<HiddenImageActivity | null>(null);

const playingRoundIndex = ref(0);

const playingTiles = ref<HiddenImageTile[]>([]);

const playingImageUrl = ref('');

const sessionMode = ref<StandaloneMode>('free');

const sessionTeams = ref<GameSessionTeam[]>([]);

const activeTeamId = ref('');

const sessionScoring = ref<GameSessionScoringConfig>({
  mode: 'none',
  basePoints: 0,
  deductionPerReveal: 0,
  minimumPoints: 0,
});

const sessionHintConfig = ref<GameHintConfig>({
  mode: 'disabled',
  freeHintsPerTeam: 0,
  defaultCost: 0,
  allowNegativeScore: false,
});

const roundResults = reactive<Record<string, GameRoundResult>>({});

const roundRevealCounts = reactive<Record<string, number>>({});

const hintUsages = ref<GameHintUsage[]>([]);

const publicHintByRound = reactive<Record<string, string>>({});

const activeRoundIndex = computed(() =>
  rounds.value.findIndex((round) => round.id === activeRoundId.value),
);

const activeRound = computed<HiddenImageRoundDraft | null>(() => {
  const index = activeRoundIndex.value;

  if (index < 0) {
    return null;
  }

  return rounds.value[index] ?? null;
});

const activeRoundNumber = computed(() =>
  activeRoundIndex.value >= 0 ? activeRoundIndex.value + 1 : 0,
);

const totalTiles = computed(() => {
  if (!activeRound.value) {
    return 0;
  }

  return activeRound.value.rows * activeRound.value.columns;
});

const revealedCount = computed(() => tiles.value.filter((tile) => tile.revealed).length);

const allTilesRevealed = computed(
  () => tiles.value.length > 0 && revealedCount.value === tiles.value.length,
);

const gridStyle = computed(() => ({
  '--hidden-image-rows': String(activeRound.value?.rows ?? 4),

  '--hidden-image-columns': String(activeRound.value?.columns ?? 4),
}));

const playingRound = computed<HiddenImageStoredRound | null>(() => {
  return playingActivity.value?.rounds[playingRoundIndex.value] ?? null;
});

const playingRevealedCount = computed(
  () => playingTiles.value.filter((tile) => tile.revealed).length,
);

const playingAllRevealed = computed(
  () => playingTiles.value.length > 0 && playingRevealedCount.value === playingTiles.value.length,
);

const playingGridStyle = computed(() => ({
  '--hidden-image-rows': String(playingRound.value?.rows ?? 4),

  '--hidden-image-columns': String(playingRound.value?.columns ?? 4),
}));

const hasTeams = computed(
  () => sessionMode.value === 'teams' && sessionTeams.value.length >= MIN_TEAM_COUNT,
);

const hasScoring = computed(() => hasTeams.value && sessionScoring.value.mode !== 'none');

const activeTeam = computed<GameSessionTeam | null>(() => {
  return sessionTeams.value.find((team) => team.id === activeTeamId.value) ?? null;
});

const roundWinner = computed<GameRoundResult | null>(() => {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return null;
  }

  return roundResults[roundId] ?? null;
});

const normalizedSetupScoring = computed(() =>
  normalizeGameScoringConfig({
    mode: sessionSetup.scoringMode,

    basePoints: Number(sessionSetup.basePoints),

    deductionPerReveal: Number(sessionSetup.deductionPerReveal),

    minimumPoints: Number(sessionSetup.minimumPoints),
  }),
);

const normalizedSetupHints = computed(() =>
  normalizeGameHintConfig({
    mode: sessionSetup.hintMode,

    freeHintsPerTeam: Number(sessionSetup.freeHintsPerTeam),

    defaultCost: Number(sessionSetup.hintDefaultCost),

    allowNegativeScore: sessionSetup.allowNegativeScore,
  }),
);

const scoringRevealedCount = computed(() => {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return 0;
  }

  return roundRevealCounts[roundId] ?? 0;
});

const currentAwardPoints = computed(() =>
  calculateRoundPoints({
    scoring: sessionScoring.value,

    revealedCount: scoringRevealedCount.value,
  }),
);

const activityHasHints = computed(() => {
  return Boolean(setupActivity.value?.rounds.some((round) => round.hints.length > 0));
});

const currentPublicHint = computed(() => {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return '';
  }

  return publicHintByRound[roundId] ?? '';
});

const canUndoHint = computed(() => {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return false;
  }

  return hintUsages.value.some((usage) => usage.roundId === roundId);
});

const setupHintLabel = computed(() => {
  switch (sessionSetup.hintMode) {
    case 'disabled':
      return 'Pistas desactivadas';

    case 'free':
      return 'Pistas gratis';

    case 'paid':
      return `Pistas a ${normalizedSetupHints.value.defaultCost} pts`;

    case 'mixed':
      return `${normalizedSetupHints.value.freeHintsPerTeam} gratis por equipo`;

    default:
      return 'Pistas';
  }
});

const awardButtonLabel = computed(() => {
  if (!hasScoring.value) {
    return 'Marcar acierto';
  }

  return `Acierto +${currentAwardPoints.value}`;
});

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `hidden-image-` + `${Date.now()}-` + Math.random().toString(36).slice(2);
}

function createIndexedDbError(message: string, error: DOMException | null): Error {
  return error ? new Error(`${message}: ${error.message}`) : new Error(message);
}

function createEmptyRound(): HiddenImageRoundDraft {
  return {
    id: createId(),
    answer: '',
    bibleReference: '',
    rows: 4,
    columns: 4,
    imageName: '',
    imageBlob: null,
    imageUrl: '',
    hints: [],
  };
}

function createDefaultSetupTeams(count: number): GameSetupTeam[] {
  return Array.from(
    {
      length: count,
    },
    (_, index) => ({
      id: createId(),
      name: `Equipo ${index + 1}`,
    }),
  );
}

function resetSessionSetup(): void {
  sessionSetup.mode = 'free';

  sessionSetup.teamCount = 2;

  sessionSetup.teams = createDefaultSetupTeams(2);

  sessionSetup.scoringMode = 'fixed';

  sessionSetup.basePoints = 100;

  sessionSetup.deductionPerReveal = 5;

  sessionSetup.minimumPoints = 20;

  sessionSetup.hintMode = 'free';

  sessionSetup.freeHintsPerTeam = 1;

  sessionSetup.hintDefaultCost = 10;

  sessionSetup.allowNegativeScore = false;
}

function clampGridValue(value: number): number {
  return Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, Math.round(value)));
}

function normalizeStoredHints(hints?: GameHint[]): GameHint[] {
  if (!Array.isArray(hints)) {
    return [];
  }

  return hints
    .map((hint) =>
      normalizeGameHint({
        id: hint.id || createId(),

        text: hint.text || '',

        costMode: hint.costMode || 'default',

        customCost: Number(hint.customCost) || 0,
      }),
    )
    .filter((hint) => Boolean(hint.text));
}

function normalizeActivity(rawActivity: LegacyHiddenImageActivity): HiddenImageActivity {
  const now = new Date().toISOString();

  if (Array.isArray(rawActivity.rounds) && rawActivity.rounds.length > 0) {
    return {
      id: rawActivity.id,

      title: rawActivity.title || 'Imagen escondida',

      rounds: rawActivity.rounds
        .filter(
          (
            round,
          ): round is LegacyHiddenImageRound & {
            imageBlob: Blob;
          } => round.imageBlob instanceof Blob,
        )
        .map((round) => ({
          id: round.id || createId(),

          answer: round.answer || '',

          bibleReference: round.bibleReference || '',

          rows: clampGridValue(round.rows || 4),

          columns: clampGridValue(round.columns || 4),

          imageName: round.imageName || 'imagen',

          imageBlob: round.imageBlob,

          hints: normalizeStoredHints(round.hints),
        })),

      createdAt: rawActivity.createdAt || now,

      updatedAt: rawActivity.updatedAt || now,
    };
  }

  if (rawActivity.imageBlob instanceof Blob) {
    return {
      id: rawActivity.id,

      title: rawActivity.title || 'Imagen escondida',

      rounds: [
        {
          id: createId(),

          answer: rawActivity.answer || '',

          bibleReference: rawActivity.bibleReference || '',

          rows: clampGridValue(rawActivity.rows || 4),

          columns: clampGridValue(rawActivity.columns || 4),

          imageName: rawActivity.imageName || 'imagen',

          imageBlob: rawActivity.imageBlob,

          hints: [],
        },
      ],

      createdAt: rawActivity.createdAt || now,

      updatedAt: rawActivity.updatedAt || now,
    };
  }

  return {
    id: rawActivity.id,

    title: rawActivity.title || 'Imagen escondida',

    rounds: [],

    createdAt: rawActivity.createdAt || now,

    updatedAt: rawActivity.updatedAt || now,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () =>
      reject(createIndexedDbError('No se pudo abrir la base de datos', request.error));
  });
}

async function loadActivities(): Promise<void> {
  isLoading.value = true;

  try {
    const database = await openDatabase();

    const records = await new Promise<LegacyHiddenImageActivity[]>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');

      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => resolve(request.result as LegacyHiddenImageActivity[]);

      request.onerror = () =>
        reject(createIndexedDbError('No se pudieron leer las actividades', request.error));
    });

    activities.value = records
      .map(normalizeActivity)
      .filter((activity) => activity.rounds.length > 0)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    rebuildPreviewUrls();

    database.close();
  } catch (error) {
    console.error(error);

    $q.notify({
      type: 'negative',
      icon: 'error',
      message: 'No se pudieron cargar las actividades.',
      position: 'top',
    });
  } finally {
    isLoading.value = false;
  }
}

async function persistActivity(activity: HiddenImageActivity): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');

      transaction.objectStore(STORE_NAME).put(activity);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(createIndexedDbError('No se pudo guardar la actividad', transaction.error));

      transaction.onabort = () =>
        reject(createIndexedDbError('Se canceló el guardado', transaction.error));
    });
  } finally {
    database.close();
  }
}

async function removePersistedActivity(id: string): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');

      transaction.objectStore(STORE_NAME).delete(id);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(createIndexedDbError('No se pudo eliminar la actividad', transaction.error));
    });
  } finally {
    database.close();
  }
}

function goBack(): void {
  if (viewMode.value === 'editor') {
    cancelActivity();
    return;
  }

  if (viewMode.value === 'setup') {
    cancelGameSetup();
    return;
  }

  if (viewMode.value === 'play') {
    closePlayMode();
    return;
  }

  void router.push('/actividades');
}

function createActivity(): void {
  editingId.value = null;

  resetEditor();

  const round = createEmptyRound();

  rounds.value = [round];

  activeRoundId.value = round.id;

  rebuildTiles();

  viewMode.value = 'editor';
}

function cancelActivity(): void {
  viewMode.value = 'library';

  editingId.value = null;

  resetEditor();
}

function resetEditor(): void {
  form.title = '';

  revokeRoundUrls();

  rounds.value = [];

  activeRoundId.value = '';

  tiles.value = [];

  resetFileInput();
}

function addRound(): void {
  const round = createEmptyRound();

  rounds.value.push(round);

  activeRoundId.value = round.id;

  rebuildTiles();
  resetFileInput();
}

function selectRound(roundId: string): void {
  if (activeRoundId.value === roundId) {
    return;
  }

  activeRoundId.value = roundId;

  rebuildTiles();
  resetFileInput();
}

function duplicateRound(): void {
  const source = activeRound.value;

  if (!source) {
    return;
  }

  const duplicate: HiddenImageRoundDraft = {
    id: createId(),

    answer: source.answer,

    bibleReference: source.bibleReference,

    rows: source.rows,

    columns: source.columns,

    imageName: source.imageName,

    imageBlob: source.imageBlob,

    imageUrl: source.imageBlob ? URL.createObjectURL(source.imageBlob) : '',

    hints: source.hints.map((hint) => ({
      ...hint,
      id: createId(),
    })),
  };

  rounds.value.splice(activeRoundIndex.value + 1, 0, duplicate);

  activeRoundId.value = duplicate.id;

  rebuildTiles();
}

function deleteRound(): void {
  if (rounds.value.length <= 1) {
    return;
  }

  const index = activeRoundIndex.value;

  if (index < 0) {
    return;
  }

  const round = rounds.value[index];

  if (round?.imageUrl) {
    URL.revokeObjectURL(round.imageUrl);
  }

  rounds.value.splice(index, 1);

  const next = rounds.value[Math.min(index, rounds.value.length - 1)];

  activeRoundId.value = next?.id ?? '';

  rebuildTiles();
}

function goToPreviousRound(): void {
  const round = rounds.value[activeRoundIndex.value - 1];

  if (round) {
    selectRound(round.id);
  }
}

function goToNextRound(): void {
  const round = rounds.value[activeRoundIndex.value + 1];

  if (round) {
    selectRound(round.id);
  }
}

function addHint(): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  round.hints.push({
    id: createId(),
    text: '',
    costMode: 'default',
    customCost: 10,
  });
}

function deleteHint(hintId: string): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  round.hints = round.hints.filter((hint) => hint.id !== hintId);
}

function handleImageSelected(event: Event): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  const target = event.target as HTMLInputElement;

  const file = target.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    notifyWarning('Selecciona un archivo de imagen válido.');

    target.value = '';

    return;
  }

  if (round.imageUrl) {
    URL.revokeObjectURL(round.imageUrl);
  }

  round.imageBlob = file;

  round.imageName = file.name;

  round.imageUrl = URL.createObjectURL(file);

  resetTiles();
}

function removeRoundImage(): void {
  const round = activeRound.value;

  if (!round) {
    return;
  }

  if (round.imageUrl) {
    URL.revokeObjectURL(round.imageUrl);
  }

  round.imageBlob = null;

  round.imageName = '';

  round.imageUrl = '';

  resetFileInput();
  resetTiles();
}

function resetFileInput(): void {
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function createTiles(count: number): HiddenImageTile[] {
  return Array.from(
    {
      length: count,
    },
    (_, index) => ({
      id: index + 1,
      revealed: false,
    }),
  );
}

function rebuildTiles(): void {
  const round = activeRound.value;

  if (!round) {
    tiles.value = [];
    return;
  }

  tiles.value = createTiles(round.rows * round.columns);
}

function toggleTile(tileId: number): void {
  const tile = tiles.value.find((item) => item.id === tileId);

  if (tile) {
    tile.revealed = !tile.revealed;
  }
}

function resetTiles(): void {
  tiles.value.forEach((tile) => {
    tile.revealed = false;
  });
}

function revealAllTiles(): void {
  tiles.value.forEach((tile) => {
    tile.revealed = true;
  });
}

function revealRandomFromTiles(target: HiddenImageTile[]): void {
  const hidden = target.filter((tile) => !tile.revealed);

  const tile = hidden[Math.floor(Math.random() * hidden.length)];

  if (tile) {
    tile.revealed = true;
  }
}

function revealRandomTile(): void {
  revealRandomFromTiles(tiles.value);
}

function changeRows(change: number): void {
  if (!activeRound.value) {
    return;
  }

  activeRound.value.rows = clampGridValue(activeRound.value.rows + change);

  rebuildTiles();
}

function changeColumns(change: number): void {
  if (!activeRound.value) {
    return;
  }

  activeRound.value.columns = clampGridValue(activeRound.value.columns + change);

  rebuildTiles();
}

function applyGridPreset(size: number): void {
  if (!activeRound.value) {
    return;
  }

  const value = clampGridValue(size);

  activeRound.value.rows = value;

  activeRound.value.columns = value;

  rebuildTiles();
}

function validateActivity(): boolean {
  if (!form.title.trim()) {
    notifyWarning('Escribe un nombre para la actividad.');

    return false;
  }

  for (let index = 0; index < rounds.value.length; index += 1) {
    const round = rounds.value[index];

    if (!round) {
      continue;
    }

    if (!round.imageBlob) {
      activeRoundId.value = round.id;

      notifyWarning(`Selecciona una imagen para la ronda ${index + 1}.`);

      return false;
    }

    if (!round.answer.trim()) {
      activeRoundId.value = round.id;

      notifyWarning(`Escribe la respuesta de la ronda ${index + 1}.`);

      return false;
    }

    for (let hintIndex = 0; hintIndex < round.hints.length; hintIndex += 1) {
      const hint = round.hints[hintIndex];

      if (!hint?.text.trim()) {
        activeRoundId.value = round.id;

        notifyWarning(`Escribe el texto de la pista ${hintIndex + 1} de la ronda ${index + 1}.`);

        return false;
      }
    }
  }

  return true;
}

async function saveActivity(): Promise<void> {
  if (!validateActivity()) {
    return;
  }

  isSaving.value = true;

  try {
    const now = new Date().toISOString();

    const existing = editingId.value
      ? activities.value.find((activity) => activity.id === editingId.value)
      : null;

    const storedRounds: HiddenImageStoredRound[] = rounds.value.map((round) => {
      if (!round.imageBlob) {
        throw new Error('La ronda no contiene imagen.');
      }

      return {
        id: round.id,

        answer: round.answer.trim(),

        bibleReference: round.bibleReference.trim(),

        rows: round.rows,

        columns: round.columns,

        imageName: round.imageName || 'imagen',

        imageBlob: round.imageBlob,

        hints: round.hints.map((hint) => normalizeGameHint(hint)),
      };
    });

    const activity: HiddenImageActivity = {
      id: editingId.value ?? createId(),

      title: form.title.trim(),

      rounds: storedRounds,

      createdAt: existing?.createdAt ?? now,

      updatedAt: now,
    };

    await persistActivity(activity);

    await loadActivities();

    viewMode.value = 'library';

    editingId.value = null;

    resetEditor();

    $q.notify({
      type: 'positive',
      icon: 'check_circle',

      message: existing
        ? 'Actividad actualizada correctamente.'
        : 'Actividad guardada correctamente.',

      position: 'top',
      timeout: 1800,
    });
  } catch (error) {
    console.error(error);

    $q.notify({
      type: 'negative',
      icon: 'error',

      message: 'No se pudo guardar la actividad.',

      position: 'top',
    });
  } finally {
    isSaving.value = false;
  }
}

function editActivity(activity: HiddenImageActivity): void {
  resetEditor();

  editingId.value = activity.id;

  form.title = activity.title;

  rounds.value = activity.rounds.map((round) => ({
    id: round.id,

    answer: round.answer,

    bibleReference: round.bibleReference,

    rows: round.rows,

    columns: round.columns,

    imageName: round.imageName,

    imageBlob: round.imageBlob,

    imageUrl: URL.createObjectURL(round.imageBlob),

    hints: round.hints.map((hint) => ({
      ...hint,
    })),
  }));

  if (rounds.value.length === 0) {
    rounds.value = [createEmptyRound()];
  }

  activeRoundId.value = rounds.value[0]?.id ?? '';

  rebuildTiles();

  viewMode.value = 'editor';
}

function openActivity(activity: HiddenImageActivity): void {
  setupActivity.value = activity;

  resetSessionSetup();
  resetGameSession();

  viewMode.value = 'setup';
}

function cancelGameSetup(): void {
  setupActivity.value = null;

  resetSessionSetup();

  viewMode.value = 'library';
}

function changeTeamCount(change: number): void {
  const nextCount = Math.min(
    MAX_TEAM_COUNT,
    Math.max(MIN_TEAM_COUNT, sessionSetup.teamCount + change),
  );

  if (nextCount === sessionSetup.teamCount) {
    return;
  }

  sessionSetup.teamCount = nextCount;

  while (sessionSetup.teams.length < nextCount) {
    const index = sessionSetup.teams.length;

    sessionSetup.teams.push({
      id: createId(),

      name: `Equipo ${index + 1}`,
    });
  }

  if (sessionSetup.teams.length > nextCount) {
    sessionSetup.teams = sessionSetup.teams.slice(0, nextCount);
  }
}

function validateSessionSetup(): boolean {
  if (!setupActivity.value) {
    return false;
  }

  if (sessionSetup.mode === 'teams') {
    for (let index = 0; index < sessionSetup.teams.length; index += 1) {
      if (!sessionSetup.teams[index]?.name.trim()) {
        notifyWarning(`Escribe el nombre del equipo ${index + 1}.`);

        return false;
      }
    }
  }

  return true;
}

function startStandaloneGame(): void {
  const activity = setupActivity.value;

  if (!activity || !validateSessionSetup()) {
    return;
  }

  resetGameSession();

  playingActivity.value = activity;

  playingRoundIndex.value = 0;

  sessionMode.value = sessionSetup.mode;

  if (sessionSetup.mode === 'teams') {
    sessionTeams.value = sessionSetup.teams.map((team, index) => ({
      id: team.id,

      name: team.name.trim() || `Equipo ${index + 1}`,

      score: 0,
    }));

    activeTeamId.value = sessionTeams.value[0]?.id ?? '';

    sessionScoring.value = normalizedSetupScoring.value;
  } else {
    sessionTeams.value = [];

    activeTeamId.value = '';

    sessionScoring.value = {
      mode: 'none',
      basePoints: 0,
      deductionPerReveal: 0,
      minimumPoints: 0,
    };
  }

  sessionHintConfig.value = normalizedSetupHints.value;

  projectionDataUrls.clear();

  projectionSequence += 1;

  preparePlayingRound();

  setupActivity.value = null;

  viewMode.value = 'play';
}

function resetGameSession(): void {
  cleanupPlayingImageUrl();

  playingActivity.value = null;

  playingRoundIndex.value = 0;

  playingTiles.value = [];

  sessionMode.value = 'free';

  sessionTeams.value = [];

  activeTeamId.value = '';

  sessionScoring.value = {
    mode: 'none',
    basePoints: 0,
    deductionPerReveal: 0,
    minimumPoints: 0,
  };

  sessionHintConfig.value = {
    mode: 'disabled',
    freeHintsPerTeam: 0,
    defaultCost: 0,
    allowNegativeScore: false,
  };

  Object.keys(roundResults).forEach((key) => {
    delete roundResults[key];
  });

  Object.keys(roundRevealCounts).forEach((key) => {
    delete roundRevealCounts[key];
  });

  Object.keys(publicHintByRound).forEach((key) => {
    delete publicHintByRound[key];
  });

  hintUsages.value = [];

  isProjectionLive.value = false;

  isSendingProjection.value = false;

  projectionDataUrls.clear();

  projectionSequence += 1;
}

function closePlayMode(): void {
  if (isProjectionLive.value) {
    window.icpStudio?.projection.setState({
      mode: 'blank',
    });
  }

  resetGameSession();

  viewMode.value = 'library';
}

function preparePlayingRound(): void {
  cleanupPlayingImageUrl();

  const round = playingRound.value;

  if (!round) {
    playingTiles.value = [];
    return;
  }

  playingImageUrl.value = URL.createObjectURL(round.imageBlob);

  playingTiles.value = createTiles(round.rows * round.columns);
}

function setPlayingRound(index: number): void {
  if (!playingActivity.value?.rounds[index]) {
    return;
  }

  playingRoundIndex.value = index;

  preparePlayingRound();

  syncProjectionIfLive();
}

function movePlayingRound(direction: -1 | 1): void {
  const activity = playingActivity.value;

  if (!activity) {
    return;
  }

  const next = Math.min(
    activity.rounds.length - 1,

    Math.max(0, playingRoundIndex.value + direction),
  );

  if (next !== playingRoundIndex.value) {
    setPlayingRound(next);
  }
}

function updateCurrentRoundRevealCount(): void {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return;
  }

  roundRevealCounts[roundId] = Math.max(
    roundRevealCounts[roundId] ?? 0,

    playingRevealedCount.value,
  );
}

function togglePlayingTile(tileId: number): void {
  const tile = playingTiles.value.find((item) => item.id === tileId);

  if (!tile) {
    return;
  }

  tile.revealed = !tile.revealed;

  updateCurrentRoundRevealCount();

  syncProjectionIfLive();
}

function resetPlayingTiles(): void {
  playingTiles.value.forEach((tile) => {
    tile.revealed = false;
  });

  syncProjectionIfLive();
}

function revealAllPlayingTiles(): void {
  playingTiles.value.forEach((tile) => {
    tile.revealed = true;
  });

  updateCurrentRoundRevealCount();

  syncProjectionIfLive();
}

function revealRandomPlayingTile(): void {
  revealRandomFromTiles(playingTiles.value);

  updateCurrentRoundRevealCount();

  syncProjectionIfLive();
}

function adjustActiveTeamScore(amount: number): void {
  const team = activeTeam.value;

  if (!team) {
    return;
  }

  sessionTeams.value = adjustGameTeamScore(sessionTeams.value, team.id, amount);
}

function awardCurrentRound(): void {
  const round = playingRound.value;

  const team = activeTeam.value;

  if (!round || !team || roundResults[round.id]) {
    return;
  }

  const result = awardGameRound({
    roundId: round.id,

    team,

    scoring: sessionScoring.value,

    revealedCount: scoringRevealedCount.value,
  });

  sessionTeams.value = applyRoundResultToTeams(sessionTeams.value, result);

  roundResults[round.id] = result;

  revealAllPlayingTiles();

  $q.notify({
    type: 'positive',
    icon: 'emoji_events',

    message:
      result.points > 0
        ? `${team.name} ganó ${result.points} puntos.`
        : `${team.name} acertó la ronda.`,

    position: 'top',
  });
}

function undoCurrentRoundAward(): void {
  const round = playingRound.value;

  if (!round) {
    return;
  }

  const result = roundResults[round.id];

  if (!result) {
    return;
  }

  sessionTeams.value = removeRoundResultFromTeams(sessionTeams.value, result);

  delete roundResults[round.id];
}

function isHintUsed(hintId: string): boolean {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return false;
  }

  return hasGameHintBeenUsedInRound(hintUsages.value, roundId, hintId);
}

function getHintAvailability(hint: GameHint) {
  const team = activeTeam.value;

  return canUseGameHint({
    hint,

    config: sessionHintConfig.value,

    usedHintsByTeam: team ? countGameHintsUsedByTeam(hintUsages.value, team.id) : 0,

    teamScore: team?.score ?? 0,
  });
}

function canUseHintNow(hint: GameHint): boolean {
  if (isHintUsed(hint.id)) {
    return false;
  }

  if (sessionHintConfig.value.mode === 'disabled') {
    return false;
  }

  if (!hasTeams.value) {
    return true;
  }

  if (!activeTeam.value) {
    return false;
  }

  return getHintAvailability(hint).allowed;
}

function getHintCostLabel(hint: GameHint): string {
  if (sessionHintConfig.value.mode === 'free' || !hasTeams.value) {
    return 'Gratis';
  }

  const team = activeTeam.value;

  const resolved = resolveGameHintCost({
    hint,

    config: sessionHintConfig.value,

    usedHintsByTeam: team ? countGameHintsUsedByTeam(hintUsages.value, team.id) : 0,
  });

  return resolved.cost === 0 ? 'Gratis' : `Costo: ${resolved.cost} puntos`;
}

function getHintActionLabel(hint: GameHint): string {
  return getHintCostLabel(hint) === 'Gratis' ? 'Mostrar' : 'Comprar';
}

function useHint(hint: GameHint): void {
  const round = playingRound.value;

  if (!round || isHintUsed(hint.id)) {
    return;
  }

  if (!hasTeams.value) {
    publicHintByRound[round.id] = hint.text;

    syncProjectionIfLive();

    return;
  }

  const team = activeTeam.value;

  if (!team) {
    notifyWarning('Selecciona el equipo que está solicitando la pista.');

    return;
  }

  const availability = canUseGameHint({
    hint,

    config: sessionHintConfig.value,

    usedHintsByTeam: countGameHintsUsedByTeam(hintUsages.value, team.id),

    teamScore: team.score,
  });

  if (!availability.allowed) {
    if (availability.reason === 'insufficient-score') {
      notifyWarning(`${team.name} no tiene puntos suficientes para comprar esta pista.`);
    }

    return;
  }

  if (availability.cost > 0) {
    sessionTeams.value = sessionTeams.value.map((currentTeam) =>
      currentTeam.id === team.id
        ? {
            ...currentTeam,

            score: applyGameHintCost(currentTeam.score, availability.cost),
          }
        : currentTeam,
    );
  }

  const usage = createGameHintUsage({
    id: createId(),

    hint,

    roundId: round.id,

    teamId: team.id,

    teamName: team.name,

    cost: availability.cost,

    wasFree: availability.wasFree,
  });

  hintUsages.value.push(usage);

  publicHintByRound[round.id] = hint.text;

  syncProjectionIfLive();

  $q.notify({
    type: availability.cost > 0 ? 'warning' : 'info',

    icon: 'lightbulb',

    message:
      availability.cost > 0
        ? `${team.name} compró una pista por ${availability.cost} puntos.`
        : `${team.name} utilizó una pista gratis.`,

    position: 'top',
    timeout: 1800,
  });
}

function showUsedHint(hint: GameHint): void {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return;
  }

  publicHintByRound[roundId] = hint.text;

  syncProjectionIfLive();
}

function hidePublicHint(): void {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return;
  }

  publicHintByRound[roundId] = '';

  syncProjectionIfLive();
}

function undoLastHintUsage(): void {
  const roundId = playingRound.value?.id;

  if (!roundId) {
    return;
  }

  const found = [...hintUsages.value]
    .map((usage, usageIndex) => ({
      usage,
      usageIndex,
    }))
    .reverse()
    .find(({ usage }) => usage.roundId === roundId);

  if (!found) {
    return;
  }

  const usage = hintUsages.value[found.usageIndex];

  if (!usage) {
    return;
  }

  if (usage.cost > 0) {
    sessionTeams.value = sessionTeams.value.map((team) =>
      team.id === usage.teamId
        ? {
            ...team,

            score: restoreGameHintCost(team.score, usage.cost),
          }
        : team,
    );
  }

  hintUsages.value.splice(found.usageIndex, 1);

  publicHintByRound[roundId] = '';

  syncProjectionIfLive();

  $q.notify({
    type: 'info',
    icon: 'undo',

    message: 'Uso de pista deshecho.',

    position: 'top',
  });
}

function resetFullGame(): void {
  const confirmed = window.confirm('¿Reiniciar marcador, resultados, casillas y pistas?');

  if (!confirmed) {
    return;
  }

  sessionTeams.value = resetGameTeamsScore(sessionTeams.value);

  Object.keys(roundResults).forEach((key) => {
    delete roundResults[key];
  });

  Object.keys(roundRevealCounts).forEach((key) => {
    delete roundRevealCounts[key];
  });

  Object.keys(publicHintByRound).forEach((key) => {
    delete publicHintByRound[key];
  });

  hintUsages.value = [];

  playingRoundIndex.value = 0;

  activeTeamId.value = sessionTeams.value[0]?.id ?? '';

  preparePlayingRound();

  syncProjectionIfLive();

  $q.notify({
    type: 'info',
    icon: 'restart_alt',

    message: 'Juego reiniciado.',

    position: 'top',
  });
}

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() ?? '?';
  }

  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo convertir la imagen.'));
      }
    };

    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));

    reader.readAsDataURL(blob);
  });
}

async function getProjectionDataUrl(round: HiddenImageStoredRound): Promise<string> {
  const cached = projectionDataUrls.get(round.id);

  if (cached) {
    return cached;
  }

  const dataUrl = await blobToDataUrl(round.imageBlob);

  projectionDataUrls.set(round.id, dataUrl);

  return dataUrl;
}

function syncProjectionIfLive(): void {
  if (!isProjectionLive.value) {
    return;
  }

  void sendPlayingStateToProjection(false);
}

async function sendPlayingStateToProjection(showNotification = true): Promise<void> {
  const activity = playingActivity.value;

  const round = playingRound.value;

  if (!activity || !round) {
    return;
  }

  if (!window.icpStudio?.projection) {
    $q.notify({
      type: 'negative',
      icon: 'error',

      message: 'La salida de proyección no está disponible.',

      position: 'top',
    });

    return;
  }

  const currentSequence = ++projectionSequence;

  if (showNotification) {
    isSendingProjection.value = true;
  }

  try {
    const imageDataUrl = await getProjectionDataUrl(round);

    if (
      currentSequence !== projectionSequence ||
      viewMode.value !== 'play' ||
      playingRound.value?.id !== round.id
    ) {
      return;
    }

    const revealedTileIds = playingTiles.value
      .filter((tile) => tile.revealed)
      .map((tile) => tile.id);

    const url = createHiddenImageProjectionUrl({
      activityId: activity.id,

      roundId: round.id,

      title: activity.title,

      roundIndex: playingRoundIndex.value,

      roundCount: activity.rounds.length,

      rows: round.rows,

      columns: round.columns,

      imageDataUrl,

      revealedTileIds,

      activeHint: publicHintByRound[round.id] ?? '',
    });

    window.icpStudio.projection.setState({
      mode: 'media',

      mediaType: 'image',

      url,

      name: activity.title,
    });

    isProjectionLive.value = true;

    if (showNotification) {
      $q.notify({
        type: 'positive',
        icon: 'cast',

        message: 'Imagen escondida enviada en vivo.',

        position: 'top',
      });
    }
  } catch (error) {
    console.error(error);

    if (showNotification) {
      $q.notify({
        type: 'negative',
        icon: 'error',

        message: 'No se pudo enviar la actividad a las pantallas.',

        position: 'top',
      });
    }
  } finally {
    if (showNotification && currentSequence === projectionSequence) {
      isSendingProjection.value = false;
    }
  }
}

function cleanupPlayingImageUrl(): void {
  if (playingImageUrl.value) {
    URL.revokeObjectURL(playingImageUrl.value);

    playingImageUrl.value = '';
  }
}

async function duplicateActivity(activity: HiddenImageActivity): Promise<void> {
  try {
    const now = new Date().toISOString();

    const duplicate: HiddenImageActivity = {
      id: createId(),

      title: `${activity.title} - copia`,

      rounds: activity.rounds.map((round) => ({
        ...round,

        id: createId(),

        hints: round.hints.map((hint) => ({
          ...hint,

          id: createId(),
        })),
      })),

      createdAt: now,
      updatedAt: now,
    };

    await persistActivity(duplicate);

    await loadActivities();

    $q.notify({
      type: 'positive',
      icon: 'content_copy',

      message: 'Actividad duplicada.',

      position: 'top',
    });
  } catch (error) {
    console.error(error);

    $q.notify({
      type: 'negative',

      message: 'No se pudo duplicar la actividad.',

      position: 'top',
    });
  }
}

async function deleteActivity(activity: HiddenImageActivity): Promise<void> {
  const confirmed = window.confirm(
    `¿Eliminar "${activity.title}"?\n\nEsta acción no se puede deshacer.`,
  );

  if (!confirmed) {
    return;
  }

  try {
    await removePersistedActivity(activity.id);

    await loadActivities();

    $q.notify({
      type: 'positive',
      icon: 'delete',

      message: 'Actividad eliminada.',

      position: 'top',
    });
  } catch (error) {
    console.error(error);

    $q.notify({
      type: 'negative',

      message: 'No se pudo eliminar la actividad.',

      position: 'top',
    });
  }
}

function countActivityHints(activity: HiddenImageActivity): number {
  return activity.rounds.reduce(
    (total, round) => total + round.hints.length,

    0,
  );
}

function notifyWarning(message: string): void {
  $q.notify({
    type: 'warning',
    icon: 'warning',
    message,
    position: 'top',
  });
}

function rebuildPreviewUrls(): void {
  revokePreviewUrls();

  activities.value.forEach((activity) => {
    const firstRound = activity.rounds[0];

    if (firstRound) {
      previewUrls.set(
        activity.id,

        URL.createObjectURL(firstRound.imageBlob),
      );
    }
  });
}

function getActivityPreviewUrl(activity: HiddenImageActivity): string {
  return previewUrls.get(activity.id) ?? '';
}

function revokePreviewUrls(): void {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));

  previewUrls.clear();
}

function revokeRoundUrls(): void {
  rounds.value.forEach((round) => {
    if (round.imageUrl) {
      URL.revokeObjectURL(round.imageUrl);
    }
  });
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}

onMounted(() => {
  resetSessionSetup();

  void loadActivities();
});

onBeforeUnmount(() => {
  if (isProjectionLive.value) {
    window.icpStudio?.projection.setState({
      mode: 'blank',
    });
  }

  projectionSequence += 1;

  projectionDataUrls.clear();

  cleanupPlayingImageUrl();

  revokeRoundUrls();

  revokePreviewUrls();
});
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

.header-left,
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left {
  min-width: 0;
}

.back-button,
.more-button {
  color: #8fa2b8;
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

.header-copy h1 {
  margin: 0;
  color: #edf4fb;
  font-size: 17px;
}

.header-copy p {
  margin: 4px 0 0;
  color: #8191a5;
  font-size: 11px;
}

.primary-button,
.control-primary {
  min-height: 38px;
  padding: 0 14px;
  color: #fff;
  background: #2563eb;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
}

.cancel-button {
  color: #91a2b6;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.live-badge-dot {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 999px;
  box-shadow: 0 0 8px currentcolor;
}

.library-area {
  flex: 1;
  padding: 20px;
}

.loading-state,
.empty-state {
  display: flex;
  min-height: 430px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #718399;
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
  border-radius: 22px;
}

.empty-icon .q-icon {
  font-size: 42px;
}

.empty-state h2 {
  margin: 0;
  color: #edf4fb;
}

.empty-state p {
  max-width: 520px;
  margin: 10px 0 22px;
  line-height: 1.6;
}

.eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #65778d;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.11em;
}

.library-heading h2,
.panel-heading h2,
.preview-heading h2,
.operator-topbar h2,
.play-sidebar-heading h2,
.game-setup-card h2 {
  margin: 0;
  color: #e7eef7;
  font-size: 15px;
}

.library-heading p,
.play-sidebar-heading p,
.setup-heading p {
  margin: 4px 0 0;
  color: #718399;
  font-size: 10px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.activity-card {
  overflow: hidden;
  background: #0d1825;
  border: 1px solid #25384c;
  border-radius: 13px;
}

.activity-image {
  position: relative;
  height: 160px;
  overflow: hidden;
  background: #050b12;
}

.activity-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-image-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #53677d;
}

.activity-image-placeholder .q-icon {
  font-size: 42px;
}

.activity-round-count {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  background: rgb(3 8 14 / 86%);
  border-radius: 7px;
  font-size: 9px;
}

.activity-card-content {
  padding: 13px;
}

.activity-card-heading,
.panel-heading,
.preview-heading,
.field-heading,
.section-title-row,
.round-editor-heading,
.operator-topbar,
.scoreboard-heading,
.operator-hints-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.activity-card-heading h3 {
  margin: 0;
  color: #e4edf7;
  font-size: 13px;
}

.activity-card-heading span {
  color: #73869c;
  font-size: 9px;
}

.activity-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  color: #6f8197;
}

.activity-info-row > div {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
}

.activity-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 14px;
}

.secondary-button,
.control-secondary {
  min-height: 32px;
  padding: 0 10px;
  color: #8fa3ba;
  background: #101e2c;
  border: 1px solid #283c51;
  border-radius: 8px;
  font-size: 9px;
}

.open-button {
  min-height: 32px;
  padding: 0 12px;
  color: #fff;
  background: #2563eb;
  border-radius: 8px;
  font-size: 9px;
}

.delete-menu-item,
.remove-image-button {
  color: #ff7b84;
}

.creator-area {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(340px, 410px) minmax(0, 1fr);
}

.configuration-panel {
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding: 18px;
  background: #0a1420;
  border-right: 1px solid #25364a;
}

.form-section {
  padding: 16px 0;
  border-top: 1px solid #1e2e40;
}

.field-label {
  display: block;
  margin-bottom: 7px;
  color: #b9c7d7;
  font-size: 11px;
  font-weight: 650;
}

.field-help {
  display: block;
  margin-top: 6px;
  color: #68798d;
  font-size: 9px;
}

.app-input :deep(.q-field__control) {
  background: #0d1926;
}

.round-list,
.play-round-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.round-item,
.play-round-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 8px;
  color: inherit;
  text-align: left;
  background: #0d1926;
  border: 1px solid #26394e;
  border-radius: 9px;
  cursor: pointer;
}

.round-item.active,
.play-round-item.active {
  background: rgb(192 132 252 / 10%);
  border-color: rgb(192 132 252 / 45%);
}

.play-round-item.completed:not(.active) {
  border-color: rgb(34 197 94 / 35%);
}

.round-thumbnail {
  display: grid;
  width: 52px;
  height: 36px;
  overflow: hidden;
  place-items: center;
  background: #07101a;
  border-radius: 6px;
}

.round-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.round-copy,
.play-round-item > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.round-copy strong,
.play-round-item strong {
  color: #cedae7;
  font-size: 10px;
}

.round-copy span,
.round-copy small,
.play-round-item small {
  overflow: hidden;
  color: #71849a;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-round-button,
.hint-add-button {
  color: #fff;
  background: #6d28d9;
}

.file-input {
  display: none;
}

.image-selector {
  display: flex;
  min-height: 76px;
  align-items: center;
  gap: 12px;
  padding: 13px;
  background: #0d1926;
  border: 1px dashed #36506d;
  border-radius: 10px;
  cursor: pointer;
}

.image-selector > .q-icon {
  color: #c084fc;
  font-size: 26px;
}

.image-selector div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.image-selector span {
  color: #718399;
  font-size: 9px;
}

.grid-controls {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 12px;
}

.number-control {
  padding: 10px;
  background: #0d1926;
  border: 1px solid #26394e;
  border-radius: 9px;
}

.number-control-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.grid-presets,
.preview-actions,
.operator-control-group,
.operator-round-navigation {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.grid-presets {
  margin-top: 10px;
}

.preset-button {
  color: #778a9f;
  background: #101d2b;
  border: 1px solid #25384c;
}

.preset-button.active {
  color: #d7b8ff;
  border-color: #c084fc;
}

.grid-count {
  color: #d8b4fe;
  background: rgb(168 85 247 / 15%);
}

.hints-editor-section {
  margin-top: 4px;
}

.empty-hints {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 14px;
  color: #718399;
  background: #0d1926;
  border: 1px dashed #31465c;
  border-radius: 9px;
  font-size: 10px;
}

.hint-editor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.hint-editor-card {
  padding: 12px;
  background: #0d1926;
  border: 1px solid #2b4055;
  border-radius: 10px;
}

.hint-editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.hint-editor-heading strong {
  color: #e9d5ff;
  font-size: 10px;
}

.hint-cost-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px;
  gap: 8px;
  margin-top: 8px;
}

.hint-cost-select {
  min-width: 0;
}

.preview-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 18px;
  background: #08111c;
}

.preview-status,
.operator-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #718399;
  font-size: 9px;
}

.preview-round-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
}

.round-dots {
  display: flex;
  gap: 6px;
}

.round-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  background: #34485f;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.round-dot.active {
  width: 20px;
  background: #c084fc;
}

.game-preview,
.operator-stage-shell {
  display: grid;
  min-height: 320px;
  flex: 1;
  place-items: center;
  padding: 18px;
  background: #050b12;
  border: 1px solid #213247;
  border-radius: 12px;
}

.image-stage,
.operator-image-stage {
  position: relative;
  display: grid;
  width: min(100%, 900px);
  aspect-ratio: 16 / 9;
  overflow: hidden;
  grid-template-columns: repeat(var(--hidden-image-columns), minmax(0, 1fr));
  grid-template-rows: repeat(var(--hidden-image-rows), minmax(0, 1fr));
  background: #101c29;
  border: 1px solid #344b64;
  border-radius: 10px;
}

.hidden-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #050a10;
}

.image-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #60748b;
}

.cover-tile {
  position: relative;
  z-index: 2;
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  padding: 0;
  color: #9db0c5;
  background: linear-gradient(145deg, #1b2b3d, #0f1b28);
  border: 1px solid #344b64;
  cursor: pointer;
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.cover-tile:hover:not(.revealed) {
  background: linear-gradient(145deg, #243b53, #14283a);
}

.cover-tile.revealed {
  opacity: 0;
  pointer-events: none;
}

.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 14px;
  padding: 12px 14px;
  background: #0c1723;
  border: 1px solid #213247;
  border-radius: 10px;
}

.operator-answer {
  display: flex;
  flex-direction: column;
}

.operator-answer span {
  color: #60748b;
  font-size: 8px;
}

.operator-answer strong {
  color: #dce7f4;
  font-size: 11px;
}

.operator-answer small {
  color: #c084fc;
}

/* SETUP */

.game-setup-area {
  display: grid;
  flex: 1;
  place-items: start center;
  padding: 28px;
  overflow-y: auto;
  background: #08111c;
}

.game-setup-card {
  width: min(100%, 880px);
  padding: 22px;
  background: #0c1723;
  border: 1px solid #28394c;
  border-radius: 14px;
}

.setup-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
}

.setup-icon {
  display: grid;
  width: 50px;
  height: 50px;
  flex: 0 0 auto;
  place-items: center;
  color: #c084fc;
  background: rgb(192 132 252 / 12%);
  border-radius: 13px;
}

.setup-icon .q-icon {
  font-size: 28px;
}

.setup-section {
  padding: 18px 0;
  border-top: 1px solid #203044;
}

.mode-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.mode-card,
.score-mode-card,
.hint-mode-card {
  color: #8fa2b8;
  text-align: left;
  background: #0b1622;
  border: 1px solid #273a4e;
  border-radius: 11px;
  cursor: pointer;
}

.mode-card {
  display: flex;
  min-height: 84px;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.mode-card.active,
.score-mode-card.active,
.hint-mode-card.active {
  color: #e9d5ff;
  background: rgb(192 132 252 / 9%);
  border-color: #a855f7;
}

.mode-card .q-icon {
  font-size: 27px;
}

.mode-card div {
  display: flex;
  flex-direction: column;
}

.mode-card strong,
.score-mode-card strong,
.hint-mode-card strong {
  color: #dbe7f3;
  font-size: 10px;
}

.mode-card span,
.score-mode-card span,
.hint-mode-card span {
  margin-top: 3px;
  color: #74869a;
  font-size: 9px;
}

.team-count-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.team-name-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.score-mode-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.score-mode-card {
  display: flex;
  min-height: 104px;
  align-items: flex-start;
  gap: 10px;
  padding: 13px;
}

.score-mode-card div {
  display: flex;
  flex-direction: column;
}

.score-mode-card .q-icon {
  font-size: 22px;
}

.scoring-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.hint-section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.hint-section-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: #facc15;
  background: rgb(250 204 21 / 10%);
  border: 1px solid rgb(250 204 21 / 22%);
  border-radius: 10px;
}

.hint-mode-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.hint-mode-card {
  display: flex;
  min-height: 110px;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px;
}

.hint-mode-card .q-icon {
  margin-bottom: 8px;
  font-size: 22px;
}

.hint-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.setup-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid #203044;
}

.setup-summary > div {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  color: #8fa2b8;
  background: #0a1520;
  border: 1px solid #27394d;
  border-radius: 8px;
  font-size: 9px;
}

/* PLAY */

.play-area {
  display: grid;
  flex: 1;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 0;
}

.play-sidebar {
  overflow-y: auto;
  padding: 16px;
  background: #09131e;
  border-right: 1px solid #24364a;
}

.play-sidebar-heading {
  padding-bottom: 14px;
  border-bottom: 1px solid #203044;
}

.scoreboard {
  margin-top: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid #203044;
}

.scoreboard-heading {
  align-items: center;
  margin-bottom: 8px;
}

.scoreboard-heading > div {
  display: flex;
  flex-direction: column;
}

.score-team {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding: 8px;
  color: inherit;
  background: #0d1926;
  border: 1px solid #26394e;
  border-radius: 9px;
  cursor: pointer;
}

.score-team.active {
  background: rgb(59 130 246 / 10%);
  border-color: #3b82f6;
}

.score-team.winner {
  border-color: #22c55e;
}

.score-team-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.score-team-main > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  text-align: left;
}

.score-team-main small {
  color: #718399;
  font-size: 8px;
}

.team-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  color: #dbeafe;
  background: #172a3d;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
}

.team-score {
  color: #fff;
  font-size: 18px;
  font-weight: 800;
}

.team-winner-icon {
  color: #facc15;
}

.play-round-number {
  display: grid;
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
  place-items: center;
  background: #162638;
  border-radius: 7px;
  font-size: 9px;
}

.private-answer-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 14px;
  padding: 12px;
  background: rgb(192 132 252 / 7%);
  border: 1px solid rgb(192 132 252 / 25%);
  border-radius: 10px;
}

.private-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  color: #c084fc;
  font-size: 8px;
  font-weight: 700;
}

.private-answer-card > span {
  color: #718399;
  font-size: 8px;
}

.private-answer-card > strong {
  margin-bottom: 7px;
  color: #e9d5ff;
  font-size: 10px;
}

.operator-workspace {
  min-width: 0;
  overflow-y: auto;
  padding: 16px;
  background: #08111c;
}

.operator-topbar {
  align-items: center;
  margin-bottom: 12px;
}

.operator-status-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.available-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 7px 11px;
  background: rgb(34 197 94 / 7%);
  border: 1px solid rgb(34 197 94 / 22%);
  border-radius: 8px;
}

.available-points span {
  color: #6f8b77;
  font-size: 7px;
  font-weight: 700;
}

.available-points strong {
  color: #4ade80;
  font-size: 18px;
}

.active-team-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #0c1723;
  border: 1px solid #283b50;
  border-radius: 10px;
}

.active-team-bar > div:first-child {
  display: flex;
  flex-direction: column;
}

.active-team-label {
  color: #60748b;
  font-size: 8px;
}

.active-team-bar strong {
  color: #dbeafe;
}

.active-team-bar small {
  color: #718399;
}

.score-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.active-team-score {
  min-width: 45px;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  text-align: center;
}

.correct-answer-button {
  color: #fff;
  background: #16a34a;
}

.operator-hints-panel {
  margin-bottom: 12px;
  padding: 12px;
  background: #0c1723;
  border: 1px solid rgb(250 204 21 / 20%);
  border-radius: 11px;
}

.operator-hints-heading {
  align-items: center;
  margin-bottom: 10px;
}

.operator-hints-heading > div:first-child {
  display: flex;
  flex-direction: column;
}

.operator-hints-heading strong {
  color: #fde68a;
  font-size: 11px;
}

.hint-heading-actions {
  display: flex;
  gap: 6px;
}

.operator-hint-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.operator-hint-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  background: #0a141f;
  border: 1px solid #283b4e;
  border-radius: 9px;
}

.operator-hint-card.used {
  border-color: rgb(34 197 94 / 28%);
}

.operator-hint-card.public {
  background: rgb(250 204 21 / 7%);
  border-color: rgb(250 204 21 / 45%);
}

.operator-hint-number {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  color: #facc15;
  background: rgb(250 204 21 / 10%);
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
}

.operator-hint-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.operator-hint-copy > span {
  color: #8b7d47;
  font-size: 7px;
  font-weight: 700;
}

.operator-hint-copy strong {
  color: #dce7f4;
  font-size: 10px;
  line-height: 1.35;
}

.operator-hint-copy small {
  margin-top: 3px;
  color: #718399;
  font-size: 8px;
}

.hint-use-button {
  flex: 0 0 auto;
  color: #111827;
  background: #facc15;
  font-size: 8px;
  font-weight: 700;
}

.current-public-hint {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 10px;
  padding: 9px 11px;
  color: #facc15;
  background: rgb(250 204 21 / 7%);
  border: 1px solid rgb(250 204 21 / 22%);
  border-radius: 8px;
}

.current-public-hint > div {
  display: flex;
  flex-direction: column;
}

.current-public-hint span {
  font-size: 7px;
  font-weight: 700;
}

.current-public-hint strong {
  color: #fef3c7;
  font-size: 10px;
}

.operator-stage-shell {
  min-height: 400px;
}

.operator-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

@media (max-width: 1100px) {
  .creator-area {
    grid-template-columns: 350px minmax(0, 1fr);
  }

  .hint-mode-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .play-area {
    grid-template-columns: 240px minmax(0, 1fr);
  }
}

@media (max-width: 850px) {
  .creator-area,
  .play-area {
    display: block;
  }

  .configuration-panel,
  .play-sidebar {
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid #25364a;
  }

  .score-mode-selector,
  .scoring-fields,
  .team-name-grid,
  .hint-settings-grid {
    grid-template-columns: 1fr;
  }

  .preview-footer,
  .active-team-bar,
  .operator-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
