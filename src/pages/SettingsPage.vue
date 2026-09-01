<template>
  <div class="settings-page">
    <nav class="settings-navigation" aria-label="Categorías de configuración">
      <button
        v-for="item in navigationItems"
        :key="item.id"
        type="button"
        class="settings-navigation-item"
        :class="{ 'settings-navigation-item--active': activeSection === item.id }"
        @click="activeSection = item.id"
      >
        <q-icon :name="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <header class="settings-header">
      <p>Organiza cada área del sistema desde un solo lugar.</p>
    </header>

    <main class="settings-content">
      <section v-if="activeSection === 'general'" class="settings-section">
        <div class="section-heading">
          <q-icon name="tune" />
          <div>
            <h2>General</h2>
            <p>Define qué áreas aparecen en el espacio de trabajo.</p>
          </div>
        </div>

        <div class="general-settings-layout">
          <q-card flat class="settings-card general-panels-card">
            <q-card-section class="card-header">
              <div>
                <strong>Distribución del espacio</strong>
                <small>Arrastra las áreas para cambiar su posición.</small>
              </div>
              <q-icon name="dashboard_customize" size="23px" color="light-blue-4" />
            </q-card-section>
            <q-separator dark />
            <q-list>
              <q-item
                v-for="panel in orderedPanelOptions"
                :key="panel.id"
                class="workspace-setting-item"
                :class="{
                  'workspace-setting-item--dragging': draggingWorkspacePanelId === panel.id,
                }"
                draggable="true"
                @dragstart="startWorkspacePanelDrag($event, panel.id)"
                @dragend="stopWorkspacePanelDrag"
                @dragover.prevent
                @drop.prevent="dropWorkspacePanel(panel.id)"
              >
                <q-item-section avatar>
                  <div class="workspace-setting-leading">
                    <q-icon name="drag_indicator" class="workspace-setting-drag" />
                    <q-icon :name="panel.icon" color="blue-grey-4" />
                  </div>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ panel.label }}</q-item-label>
                  <q-item-label caption>{{ panel.description }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle
                    :model-value="workspaceSettings.visiblePanels[panel.id]"
                    color="primary"
                    @update:model-value="
                      workspaceSettings.setPanelVisible(panel.id, Boolean($event))
                    "
                  />
                </q-item-section>
              </q-item>
            </q-list>
            <q-separator dark />
            <q-card-section class="workspace-structure-summary">
              <div>
                <strong>Estructura del espacio</strong>
                <small>Selecciona cómo se distribuyen los paneles dobles y completos.</small>
              </div>
              <div class="workspace-preset-options">
                <button
                  v-for="option in workspaceLayoutOptions"
                  :key="option.value"
                  type="button"
                  class="workspace-preset-option"
                  :class="{
                    'workspace-preset-option--active':
                      workspaceSettings.layoutPreset === option.value,
                  }"
                  @click="workspaceSettings.setLayoutPreset(option.value)"
                >
                  <span class="workspace-structure-preview" aria-hidden="true">
                    <span
                      v-for="(capacity, columnIndex) in option.capacities"
                      :key="columnIndex"
                      :class="{ 'workspace-preview-column--split': capacity === 2 }"
                    >
                      <i></i><i v-if="capacity === 2"></i>
                    </span>
                  </span>
                  <span>{{ option.label }}</span>
                </button>
              </div>
            </q-card-section>
            <q-separator dark />
            <q-card-actions align="right">
              <q-btn
                flat
                no-caps
                color="primary"
                icon="restart_alt"
                label="Restaurar distribución"
                @click="workspaceSettings.resetWorkspace"
              />
            </q-card-actions>
          </q-card>

          <q-card flat class="settings-card navigation-settings-card">
            <q-card-section class="card-header">
              <div>
                <strong>Menú principal</strong>
                <small>Elige el lado y arrastra los módulos para ordenarlos.</small>
              </div>
              <q-icon name="view_sidebar" size="23px" color="light-blue-4" />
            </q-card-section>
            <q-separator dark />

            <q-card-section class="menu-side-setting">
              <span>Posición del menú</span>
              <div class="menu-side-options" role="radiogroup" aria-label="Posición del menú">
                <button
                  v-for="option in menuSideOptions"
                  :key="option.value"
                  type="button"
                  role="radio"
                  class="menu-side-option"
                  :class="{ 'menu-side-option--active': menuSide === option.value }"
                  :aria-checked="menuSide === option.value"
                  @click="updateMenuSide(option.value)"
                >
                  <span class="menu-side-option-main">
                    <q-icon :name="option.icon" />
                    <span>{{ option.label }}</span>
                  </span>
                  <q-icon
                    :name="menuSide === option.value ? 'check_circle' : 'radio_button_unchecked'"
                    class="menu-side-option-state"
                  />
                </button>
              </div>
            </q-card-section>

            <q-separator dark inset />

            <q-card-section class="menu-side-setting">
              <span>Posición de la barra principal</span>
              <div
                class="menu-side-options"
                role="radiogroup"
                aria-label="Posición de la barra principal"
              >
                <button
                  v-for="option in toolbarPositionOptions"
                  :key="option.value"
                  type="button"
                  role="radio"
                  class="menu-side-option"
                  :class="{ 'menu-side-option--active': toolbarPosition === option.value }"
                  :aria-checked="toolbarPosition === option.value"
                  @click="updateToolbarPosition(option.value)"
                >
                  <span class="menu-side-option-main">
                    <q-icon :name="option.icon" />
                    <span>{{ option.label }}</span>
                  </span>
                  <q-icon
                    :name="
                      toolbarPosition === option.value ? 'check_circle' : 'radio_button_unchecked'
                    "
                    class="menu-side-option-state"
                  />
                </button>
              </div>
            </q-card-section>

            <div class="navigation-order-list">
              <div
                v-for="item in orderedNavigationItems"
                :key="item.id"
                class="navigation-order-item"
                :class="{ 'navigation-order-item--dragging': draggingNavigationId === item.id }"
                draggable="true"
                @dragstart="startNavigationDrag($event, item.id)"
                @dragend="stopNavigationDrag"
                @dragover.prevent
                @drop.prevent="dropNavigationItem(item.id)"
              >
                <q-icon name="drag_indicator" class="navigation-order-handle" />
                <q-icon :name="item.icon" color="blue-grey-4" />
                <span>{{ item.label }}</span>
              </div>
            </div>

            <q-separator dark />
            <q-card-actions align="right">
              <q-btn
                flat
                dense
                no-caps
                color="blue-grey-4"
                icon="restart_alt"
                label="Restaurar menú"
                @click="navigationSettings.resetNavigation"
              />
            </q-card-actions>
          </q-card>
        </div>

        <q-card flat class="settings-card library-view-settings-card">
          <q-card-section class="card-header">
            <div>
              <strong>Vista de las bibliotecas</strong>
              <small>Elige cómo se organiza cada módulo en la computadora y el celular.</small>
            </div>
            <q-icon name="view_module" size="23px" color="light-blue-4" />
          </q-card-section>
          <q-separator dark />
          <div class="library-view-settings-list">
            <div v-for="module in libraryViewModules" :key="module.id" class="library-view-row">
              <span class="library-view-module">
                <q-icon :name="module.icon" />
                <span>{{ module.label }}</span>
              </span>
              <div class="library-view-options" role="radiogroup" :aria-label="module.label">
                <button
                  v-for="option in libraryViewOptions"
                  :key="option.value"
                  type="button"
                  role="radio"
                  class="library-view-option"
                  :class="{
                    'library-view-option--active': libraryViews[module.id] === option.value,
                  }"
                  :aria-checked="libraryViews[module.id] === option.value"
                  @click="libraryViewSettings.setView(module.id, option.value)"
                >
                  <q-icon :name="option.icon" />
                  <span>{{ option.label }}</span>
                </button>
              </div>
            </div>
          </div>
          <q-separator dark />
          <q-card-actions align="right">
            <q-btn
              flat
              dense
              no-caps
              color="blue-grey-4"
              icon="restart_alt"
              label="Restaurar vistas"
              @click="resetLibraryViews"
            />
          </q-card-actions>
        </q-card>

        <div class="general-subsection-heading">
          <q-icon name="view_list" />
          <div>
            <strong>Contenido activo</strong>
            <small>Personaliza las estrofas y los versículos del área técnica.</small>
          </div>
        </div>

        <div class="active-content-settings-layout">
          <q-card flat class="settings-card active-content-settings-card">
            <q-card-section class="theme-editor-grid">
              <label>
                <span>Color de selección</span>
                <input
                  type="color"
                  :value="activeContent.activeBackgroundColor"
                  @input="updateActiveContentColor('activeBackgroundColor', $event)"
                />
              </label>
              <label>
                <span>Color del borde activo</span>
                <input
                  type="color"
                  :value="activeContent.activeBorderColor"
                  @input="updateActiveContentColor('activeBorderColor', $event)"
                />
              </label>
              <label>
                <span>Texto activo</span>
                <input
                  type="color"
                  :value="activeContent.activeTextColor"
                  @input="updateActiveContentColor('activeTextColor', $event)"
                />
              </label>
              <label>
                <span>Texto inactivo</span>
                <input
                  type="color"
                  :value="activeContent.inactiveTextColor"
                  @input="updateActiveContentColor('inactiveTextColor', $event)"
                />
              </label>
              <label class="range-field">
                <span>Tamaño del texto: {{ activeContent.fontSize }} px</span>
                <q-slider
                  :model-value="activeContent.fontSize"
                  :min="9"
                  :max="18"
                  :step="1"
                  color="primary"
                  @update:model-value="
                    projectionSettings.updateActiveContent({ fontSize: Number($event) })
                  "
                />
              </label>
              <label class="range-field">
                <span>Líneas visibles: {{ activeContent.visibleLines }}</span>
                <q-slider
                  :model-value="activeContent.visibleLines"
                  :min="1"
                  :max="5"
                  :step="1"
                  color="primary"
                  @update:model-value="
                    projectionSettings.updateActiveContent({ visibleLines: Number($event) })
                  "
                />
              </label>
            </q-card-section>
            <q-separator dark />
            <q-card-actions align="right">
              <q-btn
                flat
                dense
                no-caps
                color="blue-grey-4"
                icon="restart_alt"
                label="Restaurar valores originales"
                @click="resetActiveContentSettings"
              />
            </q-card-actions>
          </q-card>

          <q-card flat class="settings-card active-content-preview-card">
            <strong>Vista previa</strong>
            <div
              class="active-content-preview-list"
              :style="{
                '--preview-active-background': activeContent.activeBackgroundColor,
                '--preview-active-border': activeContent.activeBorderColor,
                '--preview-active-text': activeContent.activeTextColor,
                '--preview-inactive-text': activeContent.inactiveTextColor,
                '--preview-font-size': `${activeContent.fontSize}px`,
                '--preview-lines': activeContent.visibleLines,
              }"
            >
              <div class="active-content-preview-row active-content-preview-row--active">
                1:1. En el principio creó Dios los cielos y la tierra.
              </div>
              <div class="active-content-preview-row">
                1:2. Y la tierra estaba desordenada y vacía, y las tinieblas estaban sobre la faz
                del abismo.
              </div>
            </div>
          </q-card>
        </div>
      </section>

      <section v-else-if="activeSection === 'screens'" class="settings-section">
        <div class="section-heading">
          <q-icon name="display_settings" />
          <div>
            <h2>Pantallas</h2>
            <p>Consulta los monitores que ICP Studio detecta automáticamente.</p>
          </div>
        </div>

        <q-card flat class="settings-card">
          <q-card-section class="card-header">
            <strong>Pantallas detectadas</strong>
            <q-chip dense color="blue-grey-9" text-color="blue-grey-2">{{
              displays.length
            }}</q-chip>
          </q-card-section>
          <q-separator dark />
          <q-list separator dark>
            <q-item v-for="display in displays" :key="display.id">
              <q-item-section avatar>
                <q-icon
                  :name="display.isPrimary ? 'laptop_mac' : 'connected_tv'"
                  :color="display.isPrimary ? 'blue-grey-4' : 'positive'"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ display.label }}</q-item-label>
                <q-item-label caption
                  >{{ display.bounds.width }} × {{ display.bounds.height }} · Escala
                  {{ display.scaleFactor }}</q-item-label
                >
              </q-item-section>
              <q-item-section side>
                <q-badge
                  :color="display.isPrimary ? 'blue-grey-7' : 'positive'"
                  :label="display.isPrimary ? 'Operador' : 'Proyección'"
                />
              </q-item-section>
            </q-item>
            <q-item v-if="displays.length === 0"
              ><q-item-section>No fue posible leer las pantallas.</q-item-section></q-item
            >
          </q-list>
        </q-card>
      </section>

      <section v-else-if="activeSection === 'bible'" class="settings-section">
        <div class="section-heading">
          <q-icon name="menu_book" />
          <div>
            <h2>Biblia</h2>
            <p>Selecciona la versión principal y administra las versiones instaladas.</p>
          </div>
        </div>

        <div class="settings-columns">
          <q-card flat class="settings-card">
            <q-card-section class="card-header">
              <div>
                <strong>Versiones instaladas</strong
                ><small>La predeterminada se utilizará en todas las búsquedas.</small>
              </div>
              <q-chip dense color="blue-grey-9" text-color="blue-grey-2">{{
                bibleVersions.length
              }}</q-chip>
            </q-card-section>
            <q-separator dark />
            <div v-if="loadingBibleVersions" class="loading-state">
              <q-spinner color="primary" size="30px" /><span>Cargando versiones...</span>
            </div>
            <q-list v-else separator dark>
              <q-item
                v-for="version in bibleVersions"
                :key="version.code"
                clickable
                @click="selectBibleVersion(version.code)"
              >
                <q-item-section avatar>
                  <q-radio
                    :model-value="preferredBibleVersionCode"
                    :val="version.code"
                    color="primary"
                    @update:model-value="selectBibleVersion(String($event))"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ version.name }}</q-item-label>
                  <q-item-label caption
                    >{{ version.shortName }} · {{ version.language.toUpperCase() }}</q-item-label
                  >
                </q-item-section>
                <q-item-section side>
                  <div class="version-actions">
                    <q-badge v-if="version.isBuiltin" color="blue-grey-8" label="Incluida" />
                    <q-btn
                      flat
                      round
                      dense
                      color="primary"
                      icon="download"
                      :loading="exportingBibleCode === version.code"
                      :aria-label="`Descargar ${version.name} en formato ICP Bible`"
                      @click.stop="downloadBibleVersion(version)"
                    >
                      <q-tooltip>Descargar como .icpbible</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="!version.isBuiltin"
                      flat
                      round
                      dense
                      color="red-4"
                      icon="delete_outline"
                      :loading="removingBibleCode === version.code"
                      :aria-label="`Eliminar ${version.name}`"
                      @click.stop="deleteBibleVersion(version)"
                    >
                      <q-tooltip>Eliminar versión importada</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-if="bibleError" class="settings-error">
              <q-icon name="error_outline" />{{ bibleError }}
            </div>
          </q-card>

          <q-card flat class="settings-card import-card">
            <q-icon name="upload_file" />
            <strong>Importar una versión</strong>
            <p>Podrás instalar paquetes de ICP Studio y Biblias provenientes del formato XMM.</p>
            <div class="format-list" aria-label="Formatos de importación admitidos">
              <q-chip dense outline color="primary" icon="inventory_2">.icpbible</q-chip>
              <q-chip dense outline color="primary" icon="code">.xmm</q-chip>
            </div>
            <q-btn
              outline
              no-caps
              color="primary"
              icon="add"
              label="Elegir archivo"
              :loading="importingBible"
              @click="chooseBibleFile"
            />
            <small>
              El nombre y el código se obtienen automáticamente del archivo seleccionado.
            </small>
          </q-card>
        </div>
      </section>

      <section v-else-if="activeSection === 'projection'" class="settings-section">
        <div class="section-heading">
          <q-icon name="palette" />
          <div>
            <h2>Temas</h2>
            <p>Configura el fondo, la tipografía y la distribución de la presentación final.</p>
          </div>
        </div>

        <div class="theme-settings-layout">
          <q-card flat class="settings-card theme-library-card">
            <q-card-section class="card-header">
              <div>
                <strong>Temas disponibles</strong>
                <small>El tema seleccionado se aplica inmediatamente.</small>
              </div>
              <q-btn
                flat
                round
                dense
                color="light-blue-4"
                icon="content_copy"
                @click="projectionSettings.duplicateActiveTheme"
              >
                <q-tooltip>Duplicar el tema seleccionado</q-tooltip>
              </q-btn>
            </q-card-section>
            <q-separator dark />
            <div class="theme-list">
              <button
                v-for="theme in themes"
                :key="theme.id"
                type="button"
                class="theme-option"
                :class="{ 'theme-option--active': activeThemeId === theme.id }"
                @click="projectionSettings.selectTheme(theme.id)"
              >
                <span class="theme-swatch" :style="themeSwatchStyle(theme)"></span>
                <span>
                  <strong>{{ theme.name }}</strong>
                  <small>{{ theme.isBuiltin ? 'Incluido' : 'Personalizado' }}</small>
                </span>
                <q-icon v-if="activeThemeId === theme.id" name="check_circle" />
              </button>
            </div>
            <q-separator dark />
            <q-card-actions align="between">
              <q-btn
                flat
                dense
                no-caps
                color="blue-grey-4"
                icon="restart_alt"
                label="Restaurar incluidos"
                @click="resetProjectionThemes"
              />
              <q-btn
                flat
                dense
                no-caps
                color="red-4"
                icon="delete_outline"
                label="Eliminar tema"
                :disable="activeTheme.isBuiltin"
                @click="deleteProjectionTheme"
              />
            </q-card-actions>
          </q-card>

          <div class="theme-customization-layout">
            <q-card flat class="settings-card theme-editor-card">
              <q-card-section class="theme-editor-grid">
                <q-input
                  :model-value="activeTheme.name"
                  dark
                  outlined
                  dense
                  label="Nombre del tema"
                  @update:model-value="
                    projectionSettings.updateActiveTheme({ name: String($event) })
                  "
                />

                <q-select
                  :model-value="activeTheme.backgroundType"
                  :options="backgroundTypeOptions"
                  dark
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Tipo de fondo"
                  @update:model-value="updateBackgroundType"
                />

                <label class="color-field">
                  <span>Color principal</span>
                  <input
                    type="color"
                    :value="activeTheme.backgroundColor"
                    @input="updateThemeColor('backgroundColor', $event)"
                  />
                  <code>{{ activeTheme.backgroundColor }}</code>
                </label>

                <label v-if="activeTheme.backgroundType === 'gradient'" class="color-field">
                  <span>Color del degradado</span>
                  <input
                    type="color"
                    :value="activeTheme.gradientColor"
                    @input="updateThemeColor('gradientColor', $event)"
                  />
                  <code>{{ activeTheme.gradientColor }}</code>
                </label>

                <div v-if="activeTheme.backgroundType === 'image'" class="image-background-field">
                  <q-btn
                    outline
                    dense
                    no-caps
                    color="light-blue-4"
                    icon="image"
                    label="Elegir imagen"
                    @click="chooseThemeBackground"
                  />
                  <small>{{
                    activeTheme.backgroundImageUrl
                      ? 'Imagen guardada localmente'
                      : 'Sin imagen seleccionada'
                  }}</small>
                </div>

                <label class="color-field">
                  <span>Color del texto</span>
                  <input
                    type="color"
                    :value="activeTheme.textColor"
                    @input="updateThemeColor('textColor', $event)"
                  />
                  <code>{{ activeTheme.textColor }}</code>
                </label>

                <label class="color-field">
                  <span>Color de referencia</span>
                  <input
                    type="color"
                    :value="activeTheme.footerColor"
                    @input="updateThemeColor('footerColor', $event)"
                  />
                  <code>{{ activeTheme.footerColor }}</code>
                </label>

                <q-select
                  :model-value="activeTheme.fontFamily"
                  :options="fontOptions"
                  dark
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Tipografía"
                  @update:model-value="updateFontFamily"
                />

                <q-select
                  :model-value="activeTheme.horizontalAlign"
                  :options="horizontalAlignOptions"
                  dark
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Alineación horizontal"
                  @update:model-value="updateHorizontalAlign"
                />

                <q-select
                  :model-value="activeTheme.verticalAlign"
                  :options="verticalAlignOptions"
                  dark
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Posición vertical"
                  @update:model-value="updateVerticalAlign"
                />

                <div class="slider-field">
                  <span>Tamaño del texto · {{ Math.round(activeTheme.fontScale * 100) }}%</span>
                  <q-slider
                    :model-value="activeTheme.fontScale"
                    :min="0.7"
                    :max="1.5"
                    :step="0.05"
                    color="primary"
                    @update:model-value="
                      projectionSettings.updateActiveTheme({ fontScale: Number($event) })
                    "
                  />
                </div>

                <div v-if="activeTheme.backgroundType === 'image'" class="slider-field">
                  <span
                    >Oscurecer imagen · {{ Math.round(activeTheme.overlayOpacity * 100) }}%</span
                  >
                  <q-slider
                    :model-value="activeTheme.overlayOpacity"
                    :min="0"
                    :max="0.85"
                    :step="0.05"
                    color="primary"
                    @update:model-value="
                      projectionSettings.updateActiveTheme({ overlayOpacity: Number($event) })
                    "
                  />
                </div>
              </q-card-section>
            </q-card>

            <q-card flat class="settings-card theme-preview-card">
              <div class="card-header theme-preview-heading">
                <div>
                  <strong>Vista previa</strong
                  ><small>Los cambios se guardan automáticamente.</small>
                </div>
                <q-badge color="positive" label="Tema activo" />
              </div>
              <div class="theme-preview" :style="[surfaceStyle, contentLayoutStyle]">
                <div class="theme-preview-text">Todo lo puedo en Cristo que me fortalece.</div>
                <small>Filipenses 4:13</small>
              </div>
            </q-card>
          </div>
        </div>
      </section>

      <section v-else-if="activeSection === 'music'" class="settings-section">
        <div class="section-heading">
          <q-icon name="graphic_eq" />
          <div>
            <h2>Música</h2>
            <p>Elige la animación que se mostrará mientras se reproduce una canción.</p>
          </div>
        </div>

        <div class="settings-columns music-settings-columns">
          <q-card flat class="settings-card">
            <q-card-section class="card-header">
              <div>
                <strong>Visualizador</strong><small>Selecciona un estilo de animación.</small>
              </div>
            </q-card-section>
            <div class="visualizer-options">
              <button
                v-for="option in visualizerOptions"
                :key="option.value"
                type="button"
                class="visualizer-option"
                :class="{ 'visualizer-option--active': audioVisualizer.type === option.value }"
                @click="projectionSettings.updateAudioVisualizer({ type: option.value })"
              >
                <q-icon :name="option.icon" />
                <span
                  ><strong>{{ option.label }}</strong
                  ><small>{{ option.description }}</small></span
                >
                <q-icon v-if="audioVisualizer.type === option.value" name="check_circle" />
              </button>
            </div>

            <q-separator dark />
            <q-card-section class="music-controls">
              <q-toggle
                :model-value="audioVisualizer.inheritThemeColors"
                color="primary"
                label="Usar los colores del tema activo"
                @update:model-value="
                  projectionSettings.updateAudioVisualizer({ inheritThemeColors: Boolean($event) })
                "
              />
              <q-toggle
                :model-value="audioVisualizer.showTitle"
                color="primary"
                label="Mostrar título de la canción"
                @update:model-value="
                  projectionSettings.updateAudioVisualizer({ showTitle: Boolean($event) })
                "
              />
              <div class="slider-field">
                <span>Sensibilidad · {{ Math.round(audioVisualizer.sensitivity * 100) }}%</span>
                <q-slider
                  :model-value="audioVisualizer.sensitivity"
                  :min="0.5"
                  :max="1.8"
                  :step="0.1"
                  color="primary"
                  @update:model-value="
                    projectionSettings.updateAudioVisualizer({ sensitivity: Number($event) })
                  "
                />
              </div>
              <div v-if="!audioVisualizer.inheritThemeColors" class="visualizer-color-row">
                <label class="color-field">
                  <span>Color principal</span>
                  <input
                    type="color"
                    :value="audioVisualizer.primaryColor"
                    @input="updateVisualizerColor('primaryColor', $event)"
                  />
                </label>
                <label class="color-field">
                  <span>Color secundario</span>
                  <input
                    type="color"
                    :value="audioVisualizer.secondaryColor"
                    @input="updateVisualizerColor('secondaryColor', $event)"
                  />
                </label>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat class="settings-card visualizer-preview-card" :style="surfaceStyle">
            <q-icon name="album" size="48px" />
            <AudioVisualizer
              :type="audioVisualizer.type"
              playing
              compact
              :primary-color="visualizerColors.primary"
              :secondary-color="visualizerColors.secondary"
              :sensitivity="audioVisualizer.sensitivity"
            />
            <strong v-if="audioVisualizer.showTitle">Canción de ejemplo</strong>
            <small>Vista previa del visualizador</small>
          </q-card>
        </div>
      </section>

      <section v-else-if="activeSection === 'remote'" class="settings-section">
        <div class="section-heading">
          <q-icon name="smartphone" />
          <div>
            <h2>Control remoto</h2>
            <p>Vincula un celular directamente con esta computadora mediante la red local.</p>
          </div>
        </div>

        <div class="remote-settings-layout">
          <q-card flat class="settings-card remote-connection-card">
            <q-card-section class="card-header">
              <div>
                <strong>Servidor local</strong>
                <small>No utiliza la nube ni necesita conexión a internet.</small>
              </div>
              <q-badge
                rounded
                :color="remoteStatus.running ? 'positive' : 'blue-grey-7'"
                :label="remoteStatus.running ? 'Activo' : 'Detenido'"
              />
            </q-card-section>
            <q-separator dark />

            <q-card-section class="remote-connection-body">
              <div class="remote-status-row">
                <span
                  class="remote-status-dot"
                  :class="{ 'remote-status-dot--active': remoteStatus.running }"
                ></span>
                <div>
                  <strong>{{
                    remoteStatus.running ? 'Listo para conectar' : 'Control apagado'
                  }}</strong>
                  <small v-if="remoteStatus.running">
                    {{ remoteStatus.connectedClients }}
                    {{
                      remoteStatus.connectedClients === 1
                        ? 'celular conectado'
                        : 'celulares conectados'
                    }}
                  </small>
                  <small v-else>Inicia el servidor para habilitar la dirección local.</small>
                </div>
              </div>

              <div v-if="activeRemoteUrl" class="remote-address">
                <q-icon name="wifi" />
                <code>{{ activeRemoteUrl }}</code>
                <q-btn
                  flat
                  round
                  dense
                  color="light-blue-4"
                  icon="content_copy"
                  @click="copyRemoteUrl"
                >
                  <q-tooltip>Copiar enlace</q-tooltip>
                </q-btn>
              </div>

              <div v-if="remoteStatus.addresses.length > 1" class="remote-address-options">
                <small>Si una dirección no abre, selecciona otra interfaz de red:</small>
                <button
                  v-for="(url, index) in remoteStatus.addresses"
                  :key="url"
                  type="button"
                  class="remote-address-option"
                  :class="{ 'remote-address-option--active': activeRemoteUrl === url }"
                  @click="selectedRemoteUrl = url"
                >
                  <q-icon :name="activeRemoteUrl === url ? 'check_circle' : 'lan'" />
                  <span>{{ url }}</span>
                  <small>{{ index === 0 ? 'Recomendada' : 'Alternativa' }}</small>
                </button>
              </div>

              <div v-if="remoteStatus.error" class="settings-error remote-error">
                <q-icon name="error_outline" />{{ remoteStatus.error }}
              </div>

              <div class="remote-actions">
                <q-btn
                  v-if="!remoteStatus.running"
                  unelevated
                  no-caps
                  color="primary"
                  icon="power_settings_new"
                  label="Iniciar control remoto"
                  :loading="changingRemoteState"
                  @click="startRemote"
                />
                <q-btn
                  v-else
                  outline
                  no-caps
                  color="blue-grey-4"
                  icon="stop_circle"
                  label="Detener control remoto"
                  :loading="changingRemoteState"
                  @click="stopRemote"
                />
              </div>
            </q-card-section>
          </q-card>

          <q-card flat class="settings-card remote-qr-card">
            <div v-if="remoteQrCode" class="remote-qr-frame">
              <img :src="remoteQrCode" alt="Código QR para abrir ICP Studio Remote" />
            </div>
            <div v-else class="remote-qr-placeholder">
              <q-icon name="qr_code_2" />
            </div>
            <strong>Escanea desde el celular</strong>
            <p v-if="activeRemoteUrl">
              Guarda esta dirección en favoritos. Podrás reutilizarla mientras ambos dispositivos
              estén en la misma red Wi-Fi.
            </p>
            <p v-else>Conecta la computadora a una red local para crear una dirección accesible.</p>
          </q-card>
        </div>
      </section>

      <section v-else class="settings-section">
        <div class="section-heading">
          <q-icon :name="activeNavigationItem.icon" />
          <div>
            <h2>{{ activeNavigationItem.label }}</h2>
            <p>{{ activeNavigationItem.description }}</p>
          </div>
        </div>
        <q-card flat class="settings-card planned-settings">
          <q-icon :name="activeNavigationItem.icon" />
          <strong>Configuración preparada</strong>
          <p>
            Aquí agregaremos las opciones de {{ activeNavigationItem.label.toLowerCase() }} cuando
            desarrollemos ese módulo.
          </p>
        </q-card>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import QRCode from 'qrcode';
import AudioVisualizer from '../components/AudioVisualizer.vue';
import { showAppNotification } from '../services/app-notification';
import {
  clearPreferredBibleVersion,
  getPreferredBibleVersion,
  setPreferredBibleVersion,
} from '../services/bible-settings';
import type { BibleTransferResult, BibleVersion } from '../shared/bible';
import type { DisplayInfo } from '../shared/display';
import type { LibraryViewMode, LibraryViewModule } from '../shared/library-view';
import type { RemoteServerStatus } from '../shared/remote';
import type {
  ActiveContentSettings,
  AudioVisualizerType,
  ProjectionTheme,
  ThemeBackgroundType,
  ThemeHorizontalAlign,
  ThemeVerticalAlign,
} from '../shared/theme';
import type { WorkspaceLayoutPreset, WorkspacePanelId } from '../shared/workspace';
import type { MenuSide, NavigationItemId, ToolbarPosition } from '../shared/navigation';
import { useNavigationSettingsStore } from '../stores/navigation-settings';
import { useLibraryViewSettingsStore } from '../stores/library-view-settings';
import { useProjectionSettingsStore } from '../stores/projection-settings';
import { useWorkspaceSettingsStore } from '../stores/workspace-settings';

type SettingsSectionId =
  'general' | 'screens' | 'bible' | 'songs' | 'music' | 'projection' | 'remote';

const props = withDefaults(defineProps<{ initialSection?: SettingsSectionId }>(), {
  initialSection: 'general',
});
interface NavigationItem {
  id: SettingsSectionId;
  label: string;
  icon: string;
  description: string;
}
interface PanelOption {
  id: WorkspacePanelId;
  label: string;
  description: string;
  icon: string;
}

const navigationItems: NavigationItem[] = [
  { id: 'general', label: 'General', icon: 'tune', description: 'Opciones generales del sistema.' },
  {
    id: 'screens',
    label: 'Pantallas',
    icon: 'display_settings',
    description: 'Monitores y salidas de proyección.',
  },
  {
    id: 'bible',
    label: 'Biblia',
    icon: 'menu_book',
    description: 'Versiones y presentación bíblica.',
  },
  {
    id: 'songs',
    label: 'Alabanzas',
    icon: 'music_note',
    description: 'Texto, orden y formato de las alabanzas.',
  },
  {
    id: 'music',
    label: 'Música',
    icon: 'audio_file',
    description: 'Reproducción y archivos de audio.',
  },
  {
    id: 'projection',
    label: 'Temas',
    icon: 'palette',
    description: 'Fondos, tipografía y apariencia de la presentación.',
  },
  {
    id: 'remote',
    label: 'Control remoto',
    icon: 'smartphone',
    description: 'Acceso móvil y código QR.',
  },
];

const panelOptions: PanelOption[] = [
  {
    id: 'search',
    label: 'Búsqueda y contenido',
    description: 'Biblioteca y herramientas del módulo.',
    icon: 'search',
  },
  {
    id: 'upcomingActivities',
    label: 'Próximas actividades',
    description: 'Actividades pendientes desde hoy hasta finalizar el año.',
    icon: 'event_upcoming',
  },
  {
    id: 'preview',
    label: 'Previsualización',
    description: 'Vista privada antes de presentar.',
    icon: 'preview',
  },
  {
    id: 'service',
    label: 'Servicio',
    description: 'Contenido preparado y organizado.',
    icon: 'playlist_play',
  },
  {
    id: 'live',
    label: 'En vivo',
    description: 'Contenido y controles de proyección.',
    icon: 'sensors',
  },
  {
    id: 'monitors',
    label: 'Monitores',
    description: 'Salidas de proyección activas.',
    icon: 'display_settings',
  },
];

const workspaceLayoutOptions: Array<{
  label: string;
  value: WorkspaceLayoutPreset;
  capacities: [number, number, number, number];
}> = Array.from({ length: 16 }, (_, mask) => {
  const columnNames = ['primera', 'segunda', 'tercera', 'cuarta'];
  const modes = columnNames.map((_, index) => (mask & (1 << index) ? 'split' : 'single'));
  const dividedColumns = columnNames.filter((_, index) => modes[index] === 'split');
  const label =
    dividedColumns.length === 0
      ? 'Todas completas'
      : dividedColumns.length === 4
        ? 'Todas divididas'
        : `Dividida: ${dividedColumns.join(', ')}`;

  return {
    label,
    value: modes.join('-') as WorkspaceLayoutPreset,
    capacities: modes.map((mode) => (mode === 'split' ? 2 : 1)) as [number, number, number, number],
  };
}).filter((option) => option.capacities.filter((capacity) => capacity === 2).length === 2);

const menuSideOptions: Array<{ label: string; value: MenuSide; icon: string }> = [
  { label: 'Izquierda', value: 'left', icon: 'west' },
  { label: 'Derecha', value: 'right', icon: 'east' },
];

const toolbarPositionOptions: Array<{
  label: string;
  value: ToolbarPosition;
  icon: string;
}> = [
  { label: 'Arriba', value: 'top', icon: 'vertical_align_top' },
  { label: 'Abajo', value: 'bottom', icon: 'vertical_align_bottom' },
];

const libraryViewModules: Array<{
  id: LibraryViewModule;
  label: string;
  icon: string;
}> = [
  { id: 'song', label: 'Alabanzas', icon: 'music_note' },
  { id: 'audio', label: 'Música', icon: 'audio_file' },
  { id: 'image', label: 'Imágenes', icon: 'image' },
  { id: 'video', label: 'Videos', icon: 'movie' },
  { id: 'document', label: 'Documentos', icon: 'description' },
];

const libraryViewOptions: Array<{
  label: string;
  value: LibraryViewMode;
  icon: string;
}> = [
  { label: 'Cuadrícula', value: 'grid', icon: 'grid_view' },
  { label: 'Lista', value: 'list', icon: 'view_list' },
  { label: 'Detalles', value: 'details', icon: 'view_agenda' },
];

const workspaceSettings = useWorkspaceSettingsStore();
const navigationSettings = useNavigationSettingsStore();
const libraryViewSettings = useLibraryViewSettingsStore();
const { views: libraryViews } = storeToRefs(libraryViewSettings);
const {
  side: menuSide,
  orderedItems: orderedNavigationItems,
  toolbarPosition,
} = storeToRefs(navigationSettings);
const projectionSettings = useProjectionSettingsStore();
const {
  themes,
  activeThemeId,
  activeTheme,
  audioVisualizer,
  activeContent,
  visualizerColors,
  surfaceStyle,
  contentLayoutStyle,
} = storeToRefs(projectionSettings);
const activeSection = ref<SettingsSectionId>(props.initialSection);
const draggingNavigationId = ref<NavigationItemId | null>(null);
const draggingWorkspacePanelId = ref<WorkspacePanelId | null>(null);
const displays = ref<DisplayInfo[]>([]);
const bibleVersions = ref<BibleVersion[]>([]);
const preferredBibleVersionCode = ref<string | null>(null);
const loadingBibleVersions = ref(true);
const bibleError = ref('');
const importingBible = ref(false);
const exportingBibleCode = ref<string | null>(null);
const removingBibleCode = ref<string | null>(null);
let unsubscribeDisplays: (() => void) | undefined;
let unsubscribeRemoteStatus: (() => void) | undefined;
const remoteStatus = ref<RemoteServerStatus>({
  running: false,
  port: null,
  addresses: [],
  primaryUrl: null,
  connectedClients: 0,
  error: null,
});
const remoteQrCode = ref('');
const changingRemoteState = ref(false);
const selectedRemoteUrl = ref<string | null>(null);
const activeRemoteUrl = computed(() =>
  selectedRemoteUrl.value && remoteStatus.value.addresses.includes(selectedRemoteUrl.value)
    ? selectedRemoteUrl.value
    : remoteStatus.value.primaryUrl,
);

watch(
  () => props.initialSection,
  (section) => {
    activeSection.value = section;
  },
);

watch(
  activeRemoteUrl,
  async (url) => {
    remoteQrCode.value = url
      ? await QRCode.toDataURL(url, {
          width: 290,
          margin: 2,
          color: { dark: '#0b1420', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })
      : '';
  },
  { immediate: true },
);

const orderedPanelOptions = computed(() =>
  workspaceSettings.panelOrder
    .map((panelId) => panelOptions.find((panel) => panel.id === panelId))
    .filter((panel): panel is PanelOption => panel !== undefined),
);

const backgroundTypeOptions: Array<{ label: string; value: ThemeBackgroundType }> = [
  { label: 'Color sólido', value: 'solid' },
  { label: 'Degradado', value: 'gradient' },
  { label: 'Imagen', value: 'image' },
];
const fontOptions = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, Times New Roman, serif' },
  { label: 'Trebuchet', value: 'Trebuchet MS, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];
const horizontalAlignOptions: Array<{ label: string; value: ThemeHorizontalAlign }> = [
  { label: 'Izquierda', value: 'left' },
  { label: 'Centro', value: 'center' },
  { label: 'Derecha', value: 'right' },
];
const verticalAlignOptions: Array<{ label: string; value: ThemeVerticalAlign }> = [
  { label: 'Arriba', value: 'top' },
  { label: 'Centro', value: 'center' },
  { label: 'Abajo', value: 'bottom' },
];
const visualizerOptions: Array<{
  label: string;
  value: AudioVisualizerType;
  icon: string;
  description: string;
}> = [
  { label: 'Barras', value: 'bars', icon: 'equalizer', description: 'Barras verticales clásicas.' },
  { label: 'Ondas', value: 'wave', icon: 'waves', description: 'Movimiento suave y continuo.' },
  {
    label: 'Círculos',
    value: 'circle',
    icon: 'motion_photos_on',
    description: 'Anillos que pulsan con la música.',
  },
  {
    label: 'Espectro',
    value: 'spectrum',
    icon: 'graphic_eq',
    description: 'Barras con variaciones de color.',
  },
];

const activeNavigationItem = computed(
  () => navigationItems.find((item) => item.id === activeSection.value) ?? navigationItems[0]!,
);

function themeSwatchStyle(theme: ProjectionTheme): Record<string, string> {
  if (theme.backgroundType === 'image' && theme.backgroundImageUrl) {
    return {
      backgroundColor: theme.backgroundColor,
      backgroundImage: `linear-gradient(rgb(0 0 0 / ${theme.overlayOpacity}), rgb(0 0 0 / ${theme.overlayOpacity})), url("${theme.backgroundImageUrl}")`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    };
  }
  return {
    background:
      theme.backgroundType === 'gradient'
        ? `linear-gradient(135deg, ${theme.backgroundColor}, ${theme.gradientColor})`
        : theme.backgroundColor,
  };
}

function colorFromEvent(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function updateThemeColor(
  field: 'backgroundColor' | 'gradientColor' | 'textColor' | 'footerColor',
  event: Event,
): void {
  projectionSettings.updateActiveTheme({ [field]: colorFromEvent(event) });
}

function updateActiveContentColor(
  field: keyof Pick<
    ActiveContentSettings,
    'activeBackgroundColor' | 'activeBorderColor' | 'activeTextColor' | 'inactiveTextColor'
  >,
  event: Event,
): void {
  projectionSettings.updateActiveContent({ [field]: colorFromEvent(event) });
}

function resetActiveContentSettings(): void {
  projectionSettings.resetActiveContent();
  showAppNotification(
    'La apariencia del contenido activo volvió a sus valores originales.',
    'positive',
    'restart_alt',
  );
}

function resetLibraryViews(): void {
  libraryViewSettings.resetViews();
  showAppNotification(
    'Las vistas de las bibliotecas fueron restauradas.',
    'positive',
    'view_module',
  );
}

function updateVisualizerColor(field: 'primaryColor' | 'secondaryColor', event: Event): void {
  projectionSettings.updateAudioVisualizer({ [field]: colorFromEvent(event) });
}

function updateBackgroundType(value: unknown): void {
  projectionSettings.updateActiveTheme({ backgroundType: value as ThemeBackgroundType });
}

function updateFontFamily(value: unknown): void {
  projectionSettings.updateActiveTheme({ fontFamily: String(value) });
}

function updateHorizontalAlign(value: unknown): void {
  projectionSettings.updateActiveTheme({ horizontalAlign: value as ThemeHorizontalAlign });
}

function updateVerticalAlign(value: unknown): void {
  projectionSettings.updateActiveTheme({ verticalAlign: value as ThemeVerticalAlign });
}

async function chooseThemeBackground(): Promise<void> {
  try {
    const imported = (await window.icpStudio?.media.select('image')) ?? [];
    const image = imported[0];
    if (!image) return;
    projectionSettings.updateActiveTheme({
      backgroundType: 'image',
      backgroundImageUrl: image.url,
    });
    showAppNotification('La imagen de fondo fue guardada en ICP Studio.', 'positive', 'image');
  } catch (error) {
    showAppNotification(
      error instanceof Error ? error.message : 'No fue posible guardar la imagen de fondo.',
      'negative',
      'error_outline',
    );
  }
}

function deleteProjectionTheme(): void {
  if (!window.confirm(`¿Quieres eliminar el tema “${activeTheme.value.name}”?`)) return;
  projectionSettings.deleteActiveTheme();
}

function resetProjectionThemes(): void {
  if (!window.confirm('¿Quieres restaurar los temas incluidos y eliminar los personalizados?'))
    return;
  projectionSettings.resetThemes();
}

function updateMenuSide(value: MenuSide): void {
  navigationSettings.setSide(value);
}

function updateToolbarPosition(value: ToolbarPosition): void {
  navigationSettings.setToolbarPosition(value);
}

function startNavigationDrag(event: DragEvent, itemId: NavigationItemId): void {
  draggingNavigationId.value = itemId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
  }
}

function stopNavigationDrag(): void {
  draggingNavigationId.value = null;
}

function dropNavigationItem(targetId: NavigationItemId): void {
  const sourceId = draggingNavigationId.value;
  if (sourceId) navigationSettings.moveItem(sourceId, targetId);
  stopNavigationDrag();
}

function startWorkspacePanelDrag(event: DragEvent, panelId: WorkspacePanelId): void {
  draggingWorkspacePanelId.value = panelId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', panelId);
  }
}

function stopWorkspacePanelDrag(): void {
  draggingWorkspacePanelId.value = null;
}

function dropWorkspacePanel(targetId: WorkspacePanelId): void {
  const sourceId = draggingWorkspacePanelId.value;
  if (sourceId) workspaceSettings.movePanel(sourceId, targetId);
  stopWorkspacePanelDrag();
}

function selectBibleVersion(versionCode: string): void {
  preferredBibleVersionCode.value = versionCode;
  setPreferredBibleVersion(versionCode);
  window.icpStudio?.bible.setPreferredVersion(versionCode);
  const version = bibleVersions.value.find((item) => item.code === versionCode);
  showAppNotification(
    `${version?.name ?? versionCode} es ahora la versión bíblica predeterminada.`,
    'positive',
    'menu_book',
  );
}

async function loadBibleVersions(): Promise<void> {
  loadingBibleVersions.value = true;
  bibleError.value = '';
  try {
    bibleVersions.value = (await window.icpStudio?.bible.getVersions()) ?? [];
    preferredBibleVersionCode.value = getPreferredBibleVersion(bibleVersions.value);
  } catch (error) {
    bibleError.value =
      error instanceof Error ? error.message : 'No fue posible leer las versiones.';
  } finally {
    loadingBibleVersions.value = false;
  }
}

function transferMessage(result: BibleTransferResult): string {
  const details = [`${result.books ?? 0} libros`, `${result.verses ?? 0} versículos`];
  if (result.omittedVerses) details.push(`${result.omittedVerses} omitidos por el archivo`);
  return `${result.version?.name ?? 'La Biblia'} fue importada: ${details.join(', ')}.`;
}

async function chooseBibleFile(): Promise<void> {
  importingBible.value = true;
  bibleError.value = '';
  try {
    const result = await window.icpStudio?.bible.importVersion();
    if (!result || result.canceled) return;
    await loadBibleVersions();
    showAppNotification(transferMessage(result), 'positive', 'library_add_check');
  } catch (error) {
    bibleError.value =
      error instanceof Error ? error.message : 'No fue posible importar la Biblia.';
    showAppNotification(bibleError.value, 'negative', 'error_outline');
  } finally {
    importingBible.value = false;
  }
}

async function downloadBibleVersion(version: BibleVersion): Promise<void> {
  exportingBibleCode.value = version.code;
  bibleError.value = '';
  try {
    const result = await window.icpStudio?.bible.exportVersion(version.code);
    if (!result || result.canceled) return;
    showAppNotification(
      `${version.name} fue guardada como archivo ICP Bible.`,
      'positive',
      'download_done',
    );
  } catch (error) {
    bibleError.value =
      error instanceof Error ? error.message : 'No fue posible descargar la Biblia.';
    showAppNotification(bibleError.value, 'negative', 'error_outline');
  } finally {
    exportingBibleCode.value = null;
  }
}

async function deleteBibleVersion(version: BibleVersion): Promise<void> {
  if (!window.confirm(`¿Quieres eliminar la versión "${version.name}" de ICP Studio?`)) return;
  removingBibleCode.value = version.code;
  bibleError.value = '';
  try {
    await window.icpStudio?.bible.removeVersion(version.code);
    if (preferredBibleVersionCode.value === version.code) {
      clearPreferredBibleVersion();
    }
    await loadBibleVersions();
    showAppNotification(`${version.name} fue eliminada.`, 'positive', 'delete_outline');
  } catch (error) {
    bibleError.value =
      error instanceof Error ? error.message : 'No fue posible eliminar la Biblia.';
    showAppNotification(bibleError.value, 'negative', 'error_outline');
  } finally {
    removingBibleCode.value = null;
  }
}

async function startRemote(): Promise<void> {
  changingRemoteState.value = true;
  try {
    remoteStatus.value = (await window.icpStudio?.remote.start()) ?? remoteStatus.value;
  } finally {
    changingRemoteState.value = false;
  }
}

async function stopRemote(): Promise<void> {
  changingRemoteState.value = true;
  try {
    remoteStatus.value = (await window.icpStudio?.remote.stop()) ?? remoteStatus.value;
  } finally {
    changingRemoteState.value = false;
  }
}

async function copyRemoteUrl(): Promise<void> {
  const url = activeRemoteUrl.value;
  if (!url) return;

  await navigator.clipboard.writeText(url);
  showAppNotification('Enlace del control remoto copiado.', 'positive', 'content_copy');
}

onMounted(async () => {
  displays.value = (await window.icpStudio?.displays.list()) ?? [];
  unsubscribeDisplays = window.icpStudio?.displays.onChanged((nextDisplays) => {
    displays.value = nextDisplays;
  });
  remoteStatus.value = (await window.icpStudio?.remote.status()) ?? remoteStatus.value;
  unsubscribeRemoteStatus = window.icpStudio?.remote.onStatusChanged((status) => {
    remoteStatus.value = status;
  });
  await loadBibleVersions();
});

onBeforeUnmount(() => {
  unsubscribeDisplays?.();
  unsubscribeRemoteStatus?.();
});
</script>

<style scoped>
.settings-page {
  width: 100%;
  min-height: 100%;
  padding: 22px;
  color: #e8eef6;
  background: #0c131d;
}
.section-heading h2 {
  margin: 0;
}
.settings-header p,
.section-heading p,
.import-card p,
.planned-settings p {
  margin: 5px 0 0;
  color: #8492a6;
}
.settings-navigation {
  display: flex;
  gap: 5px;
  margin: 0 0 12px;
  padding: 4px;
  overflow-x: auto;
  background: #101a27;
  border: 1px solid #263448;
  border-radius: 10px;
}
.settings-navigation-item {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  font-size: 13px;
  color: #8492a6;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}
.settings-navigation-item:hover {
  color: #dbeafe;
  background: #162438;
}
.settings-navigation-item--active {
  color: #bfdbfe;
  background: #173252;
}
.settings-content {
  width: 100%;
  max-width: none;
}
.settings-header {
  margin: 0 0 16px;
}
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-heading > .q-icon {
  color: #60a5fa;
  font-size: 29px;
}
.section-heading h2 {
  font-size: 21px;
}
.settings-columns {
  display: grid;
  grid-template-columns: minmax(380px, 1.4fr) minmax(270px, 0.8fr);
  gap: 16px;
}
.settings-card {
  color: #dbe5f1;
  background: #111b28;
  border: 1px solid #263448;
  border-radius: 10px;
}
.general-settings-layout {
  display: grid;
  grid-template-columns: minmax(440px, 0.9fr) minmax(380px, 1.1fr);
  gap: 16px;
  align-items: start;
}

.general-subsection-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.general-subsection-heading > .q-icon {
  color: #60a5fa;
  font-size: 24px;
}

.general-subsection-heading > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.general-subsection-heading small {
  color: #8492a6;
}

.general-panels-card,
.navigation-settings-card {
  width: 100%;
  min-width: 0;
}

.library-view-settings-card {
  width: 100%;
}

.library-view-settings-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1px 16px;
  padding: 8px 14px;
}

.library-view-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #202e40;
}

.library-view-module {
  display: flex;
  min-width: 112px;
  align-items: center;
  gap: 8px;
  color: #c5d1df;
  font-size: 11px;
}

.library-view-module > .q-icon {
  color: #93c5fd;
  font-size: 19px;
}

.library-view-options {
  display: flex;
  min-width: 0;
  gap: 4px;
}

.library-view-option {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  color: #7f90a5;
  background: #0d1723;
  border: 1px solid #293b50;
  border-radius: 7px;
  font-size: 9px;
  cursor: pointer;
}

.library-view-option:hover,
.library-view-option--active {
  color: #dbeafe;
  background: #17314f;
  border-color: #4384c4;
}

.workspace-setting-item {
  cursor: grab;
  transition:
    opacity 130ms ease,
    background-color 130ms ease;
}

.workspace-setting-item:hover {
  background: #142033;
}

.workspace-setting-item--dragging {
  opacity: 0.4;
}

.workspace-setting-leading {
  display: flex;
  align-items: center;
  gap: 7px;
}

.workspace-setting-drag {
  color: #526176;
}

.stacked-column-setting {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stacked-column-setting > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stacked-column-setting small {
  color: #8492a6;
  font-size: 11px;
}

.workspace-structure-summary {
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 18px;
}

.workspace-structure-summary > div:first-child {
  display: flex;
  flex-direction: column;
}

.workspace-structure-summary strong {
  color: #dbe7f2;
  font-size: 12px;
}

.workspace-structure-summary small {
  max-width: 360px;
  margin-top: 4px;
  color: #71869a;
  font-size: 9px;
  line-height: 1.45;
}

.workspace-preset-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.workspace-preset-option {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  padding: 9px;
  color: #8fa2b5;
  background: #0d1723;
  border: 1px solid #2a4055;
  border-radius: 9px;
  font-size: 9px;
  cursor: pointer;
}

.workspace-preset-option:hover,
.workspace-preset-option--active {
  color: #dbeafe;
  background: #142b45;
  border-color: #4384c4;
}

.workspace-structure-preview {
  display: grid;
  width: 100%;
  max-width: 148px;
  height: 56px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
  padding: 6px;
  background: #0b1520;
  border: 1px solid #2a4055;
  border-radius: 9px;
}

.workspace-structure-preview > span {
  display: block;
  min-width: 0;
}

.workspace-structure-preview > .workspace-preview-column--split {
  display: grid;
  grid-template-rows: 1fr 0.45fr;
  gap: 4px;
}

.workspace-structure-preview i {
  display: block;
  min-height: 0;
  background: linear-gradient(145deg, #234866, #172b3e);
  border: 1px solid #3b6382;
  border-radius: 4px;
}

.workspace-structure-preview > span:not(.workspace-preview-column--split) i {
  height: 100%;
  background: linear-gradient(145deg, #1e5279, #17334b);
}

.stacked-position-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.stacked-position-option {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  padding: 9px 6px 7px;
  color: #8f9eb0;
  background: #0d1723;
  border: 1px solid #2c3d52;
  border-radius: 8px;
  font-size: 10px;
  cursor: pointer;
}

.stacked-position-option:hover,
.stacked-position-option--active {
  color: #bfdbfe;
  background: #142b45;
  border-color: #3b82c4;
}

.workspace-layout-preview {
  display: grid;
  width: 62px;
  height: 34px;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
}

.workspace-layout-column {
  display: grid;
  min-width: 0;
  grid-template-rows: 1fr;
  gap: 3px;
}

.workspace-layout-column--stacked {
  grid-template-rows: repeat(2, 1fr);
}

.workspace-layout-column i {
  display: block;
  min-height: 0;
  background: #52657c;
  border-radius: 2px;
}

.stacked-position-option--active .workspace-layout-column i {
  background: #60a5fa;
}

.menu-side-setting {
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 12px;
  color: #a9b6c6;
  font-size: 12px;
}

.menu-side-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.menu-side-option {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  color: #9eacbd;
  background: #0d1723;
  border: 1px solid #2c3d52;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition:
    color 140ms ease,
    background-color 140ms ease,
    border-color 140ms ease;
}

.menu-side-option:hover {
  color: #dbeafe;
  background: #14243a;
  border-color: #45678e;
}

.menu-side-option--active {
  color: #bfdbfe;
  background: #173252;
  border-color: #3b82c4;
}

.menu-side-option-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.menu-side-option-main > .q-icon {
  flex: 0 0 auto;
  font-size: 22px;
}

.menu-side-option-main > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-side-option-state {
  color: #60a5fa;
  font-size: 17px;
}

.navigation-order-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 12px 12px;
}

.navigation-order-item {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 9px;
  padding: 6px 9px;
  color: #c7d2df;
  background: #0d1723;
  border: 1px solid #293a50;
  border-radius: 7px;
  cursor: grab;
  transition:
    opacity 130ms ease,
    border-color 130ms ease,
    transform 130ms ease;
}

.navigation-order-item:hover {
  border-color: #45678e;
  transform: translateY(-1px);
}

.navigation-order-item--dragging {
  opacity: 0.4;
}

.navigation-order-handle {
  color: #5c6c80;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-header > div {
  display: flex;
  flex-direction: column;
}
.card-header small,
.import-card small,
:deep(.q-item__label--caption) {
  color: #8492a6;
}
.version-actions,
.format-list {
  display: flex;
  align-items: center;
  gap: 6px;
}
.loading-state,
.settings-error,
.import-card,
.planned-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px;
}
.import-card,
.planned-settings {
  min-height: 240px;
  flex-direction: column;
  text-align: center;
}
.import-card > .q-icon,
.planned-settings > .q-icon {
  color: #60a5fa;
  font-size: 46px;
}
.settings-error {
  color: #fca5a5;
}
code {
  color: #93c5fd;
}

.theme-settings-layout {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.theme-customization-layout {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(520px, 1.45fr) minmax(300px, 0.78fr);
  gap: 16px;
  align-items: start;
}

.theme-library-card,
.theme-editor-card,
.theme-preview-card {
  min-width: 0;
}

.visualizer-options {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
}

.theme-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 7px;
  padding: 8px;
}

.theme-option,
.visualizer-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 7px;
  color: #b9c6d5;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}

.theme-option:hover,
.theme-option--active,
.visualizer-option:hover,
.visualizer-option--active {
  background: #15263b;
  border-color: #3b6ea8;
}

.theme-option > span:nth-child(2),
.visualizer-option > span {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.theme-option small,
.visualizer-option small,
.image-background-field small,
.visualizer-preview-card small {
  color: #8492a6;
}

.theme-option > .q-icon:last-child,
.visualizer-option > .q-icon:last-child {
  color: #60a5fa;
}

.theme-swatch {
  width: 44px;
  height: 30px;
  flex: 0 0 44px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 6px;
}

.theme-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.color-field,
.slider-field,
.image-background-field {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  color: #9cabbc;
  background: #0d1723;
  border: 1px solid #314055;
  border-radius: 6px;
  font-size: 11px;
}

.color-field span,
.slider-field span {
  flex: 1;
}

.color-field input {
  width: 30px;
  height: 25px;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.color-field code {
  font-size: 9px;
}

.slider-field {
  align-items: stretch;
  flex-direction: column;
  gap: 2px;
}

.image-background-field {
  justify-content: space-between;
}

.theme-preview-card {
  position: sticky;
  top: 0;
  padding: 10px;
}

.theme-preview-heading {
  padding: 3px 2px 10px;
}

.theme-preview {
  position: relative;
  display: flex;
  aspect-ratio: 16 / 9;
  min-height: 190px;
  flex-direction: column;
  padding: clamp(22px, 5vw, 58px);
  overflow: hidden;
  border: 1px solid #34465d;
  border-radius: 9px;
}

@media (max-width: 1180px) {
  .theme-customization-layout {
    grid-template-columns: minmax(440px, 1.35fr) minmax(280px, 0.75fr);
  }

  .theme-preview-card {
    position: sticky;
  }
}

.theme-preview-text {
  max-width: 90%;
  color: var(--projection-text-color);
  font-size: calc(clamp(22px, 3.2vw, 46px) * var(--projection-font-scale));
  font-weight: var(--projection-font-weight);
  line-height: 1.2;
}

.theme-preview small {
  position: absolute;
  bottom: 14px;
  left: 16px;
  color: var(--projection-footer-color);
}

.music-settings-columns {
  grid-template-columns: minmax(390px, 1fr) minmax(300px, 0.8fr);
}

.visualizer-option > .q-icon:first-child {
  color: #93c5fd;
  font-size: 24px;
}

.music-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.visualizer-color-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.visualizer-preview-card {
  display: flex;
  min-height: 330px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  text-align: center;
}

.visualizer-preview-card > .q-icon {
  color: var(--projection-text-color);
  opacity: 0.65;
}

.active-content-settings-layout {
  display: grid;
  align-items: start;
  grid-template-columns: minmax(320px, 0.8fr) minmax(360px, 1.2fr);
  gap: 14px;
}

.active-content-preview-card {
  padding: 16px;
}

.active-content-preview-list {
  display: grid;
  gap: 7px;
  margin-top: 14px;
}

.active-content-preview-row {
  display: -webkit-box;
  padding: 10px;
  overflow: hidden;
  color: var(--preview-inactive-text);
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: var(--preview-font-size);
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--preview-lines);
}

.active-content-preview-row--active {
  color: var(--preview-active-text);
  background: var(--preview-active-background);
  border-color: var(--preview-active-border);
}

.remote-settings-layout {
  display: grid;
  grid-template-columns: minmax(420px, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
  align-items: stretch;
}

.remote-connection-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.remote-status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.remote-status-row > div {
  display: flex;
  flex-direction: column;
}

.remote-status-row small,
.remote-qr-card p {
  color: #8492a6;
}

.remote-status-dot {
  width: 12px;
  height: 12px;
  flex: 0 0 12px;
  background: #64748b;
  border-radius: 50%;
  box-shadow: 0 0 0 5px rgb(100 116 139 / 12%);
}

.remote-status-dot--active {
  background: #35d07f;
  box-shadow: 0 0 0 5px rgb(53 208 127 / 14%);
}

.remote-address {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #0d1723;
  border: 1px solid #2d4058;
  border-radius: 8px;
}

.remote-address > .q-icon {
  color: #60a5fa;
}

.remote-address code {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remote-address-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.remote-address-options > small {
  color: #8492a6;
}

.remote-address-option {
  display: grid;
  min-width: 0;
  align-items: center;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 7px;
  padding: 7px 9px;
  color: #91a2b7;
  background: #0d1723;
  border: 1px solid #293b50;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
}

.remote-address-option span {
  overflow: hidden;
  font-family: monospace;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remote-address-option small {
  color: #65778c;
  font-size: 8px;
}

.remote-address-option--active {
  color: #dbeafe;
  background: #15304c;
  border-color: #4384c4;
}

.remote-error {
  justify-content: flex-start;
  padding: 0;
}

.remote-actions {
  display: flex;
  justify-content: flex-start;
}

.remote-qr-card {
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.remote-qr-card p {
  max-width: 330px;
  margin: 0;
}

.remote-qr-frame {
  display: grid;
  width: min(230px, 70%);
  aspect-ratio: 1;
  margin-bottom: 4px;
  padding: 10px;
  place-items: center;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgb(0 0 0 / 28%);
}

.remote-qr-frame img {
  display: block;
  width: 100%;
  height: 100%;
}

.remote-qr-placeholder {
  display: grid;
  width: 180px;
  aspect-ratio: 1;
  place-items: center;
  color: #52657c;
  background: #0d1723;
  border: 1px dashed #34506f;
  border-radius: 14px;
}

.remote-qr-placeholder .q-icon {
  font-size: 88px;
}

@media (max-width: 850px) {
  .settings-columns,
  .theme-customization-layout,
  .active-content-settings-layout,
  .remote-settings-layout {
    grid-template-columns: 1fr;
  }

  .theme-editor-grid {
    grid-template-columns: 1fr;
  }

  .theme-preview-card {
    grid-column: auto;
  }

  .general-settings-layout {
    grid-template-columns: 1fr;
  }

  .library-view-settings-list {
    grid-template-columns: 1fr;
  }

  .library-view-row {
    align-items: stretch;
    flex-direction: column;
  }

  .library-view-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  .library-view-option {
    justify-content: center;
  }
}
</style>
