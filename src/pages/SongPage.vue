<template>
  <q-page>
    <ModuleWorkspace
      title="Alabanzas"
      description="Busca, previsualiza y agrega alabanzas al servicio."
      icon="music_note"
    >
      <template #search>
        <div class="song-panel">
          <div class="song-toolbar">
            <q-input
              v-model="searchText"
              dark
              outlined
              dense
              clearable
              placeholder="Buscar alabanza por título o autor..."
              class="song-search"
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>

            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="add"
              aria-label="Crear nueva alabanza"
              class="song-toolbar-button"
              @click="openSongEditor"
            >
              <q-tooltip>Crear nueva alabanza</q-tooltip>
            </q-btn>

            <q-btn
              flat
              round
              dense
              size="sm"
              icon="playlist_add"
              color="primary"
              aria-label="Agregar alabanza seleccionada al servicio"
              class="song-toolbar-button"
              :disable="!selectedSong"
              @click="addSelectedSongToService"
            >
              <q-tooltip>Agregar al servicio</q-tooltip>
            </q-btn>

            <q-btn
              flat
              round
              dense
              size="sm"
              icon="present_to_all"
              color="primary"
              aria-label="Proyectar alabanza seleccionada ahora"
              class="song-toolbar-button"
              :disable="!selectedSong"
              @click="projectSelectedSong"
            >
              <q-tooltip>Agregar al servicio y proyectar ahora</q-tooltip>
            </q-btn>
          </div>

          <div v-if="filteredSongs.length" class="song-results">
            <button
              v-for="song in filteredSongs"
              :key="song.id"
              type="button"
              class="song-result"
              :class="{ 'song-result--active': selectedSong?.id === song.id }"
              @click="selectSong(song)"
              @dblclick="addSongFromList(song)"
            >
              <q-icon name="music_note" color="primary" />
              <span class="song-result-copy">
                <strong>{{ song.title }}</strong>
                <small>
                  {{ song.author || 'Autor no especificado' }} · {{ song.parts.length }} partes
                </small>
              </span>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="edit"
                color="blue-grey-4"
                aria-label="Editar alabanza"
                class="song-edit-button"
                @click.stop="editSong(song)"
                @dblclick.stop
              >
                <q-tooltip>Editar alabanza</q-tooltip>
              </q-btn>
              <q-icon name="chevron_right" />
            </button>
          </div>

          <div v-else class="empty-state">
            <q-icon name="queue_music" size="44px" />
            <strong>{{
              songs.length ? 'No encontramos coincidencias' : 'No hay alabanzas guardadas'
            }}</strong>
            <span>Crea una alabanza para comenzar tu biblioteca local.</span>
          </div>
        </div>
      </template>

      <template #preview>
        <div class="song-panel">
          <div class="panel-label">
            <span>Vista del operador</span>
            <span v-if="selectedSong"
              >{{ selectedPartPosition }} de {{ selectedSong.parts.length }}</span
            >
          </div>

          <div class="song-screen">
            <template v-if="selectedPart">
              <FittedTechnicalText :text="selectedPart.content" :min-size="10" :max-size="26" />
              <div class="song-screen-footer">{{ selectedSong?.title }}</div>
            </template>
            <template v-else>
              <q-icon name="preview" size="44px" />
              <span>Selecciona una alabanza para previsualizarla</span>
            </template>
          </div>

          <div v-if="selectedSong" class="part-list">
            <button
              v-for="(part, index) in selectedSong.parts"
              :key="part.id"
              type="button"
              class="part-item"
              :class="{ 'part-item--active': selectedPart?.id === part.id }"
              @click="selectedPartId = part.id"
            >
              <span>{{ index + 1 }}</span>
              <small>{{ partLabel(part.type) }}</small>
            </button>
          </div>
        </div>
      </template>

      <template #service>
        <div class="song-panel">
          <div class="panel-label">
            <span>Orden del servicio</span>
            <q-chip dense color="blue-grey-9" text-color="blue-grey-2">
              {{ serviceSongs.length }}
            </q-chip>
          </div>

          <div v-if="serviceSongs.length" class="service-list">
            <button
              v-for="(song, index) in serviceSongs"
              :key="song.id"
              type="button"
              class="service-item"
              :class="{ 'service-item--active': selectedServiceSongId === song.id }"
              @click="selectServiceSong(song)"
              @dblclick="activateServiceSong(song)"
            >
              <span class="position">{{ index + 1 }}</span>
              <strong>{{ song.title }}</strong>
              <q-icon name="music_note" color="blue-grey-5" />
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="close"
                @click.stop="removeServiceSong(song.id)"
                @dblclick.stop
              >
                <q-tooltip>Quitar del servicio</q-tooltip>
              </q-btn>
            </button>
          </div>

          <div v-else class="empty-state">
            <q-icon name="playlist_add" size="40px" />
            <strong>Servicio vacío</strong>
            <span>Agrega una alabanza desde el buscador.</span>
          </div>
        </div>
      </template>

      <template #live>
        <div
          ref="livePanel"
          class="song-panel"
          tabindex="0"
          @keydown.up.prevent="moveLivePart(-1)"
          @keydown.down.prevent="moveLivePart(1)"
        >
          <div class="live-header">
            <span><span class="live-dot"></span> En vivo</span>
            <div class="live-header-actions">
              <span v-if="liveSong && livePart"
                >{{ livePartPosition }} de {{ liveSong.parts.length }}</span
              >
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="delete_sweep"
                color="red-4"
                :disable="!liveSong"
                @click="clearLive"
              >
                <q-tooltip>Limpiar contenido en vivo</q-tooltip>
              </q-btn>
            </div>
          </div>

          <div class="song-screen song-screen--live">
            <template v-if="livePart">
              <FittedTechnicalText :text="livePart.content" :min-size="10" :max-size="26" />
              <div class="song-screen-footer">{{ liveSong?.title }}</div>
            </template>
            <template v-else>
              <q-icon name="live_tv" size="44px" />
              <span>Haz doble clic en una alabanza del servicio</span>
            </template>
          </div>

          <div v-if="liveSong" class="live-parts">
            <button
              v-for="(part, index) in liveSong.parts"
              :key="part.id"
              type="button"
              class="live-part"
              :class="{ 'live-part--active': livePart?.id === part.id }"
              @click="setLivePart(part)"
            >
              <span class="position">{{ index + 1 }}</span>
              <span>
                <strong>{{ partLabel(part.type) }}</strong>
                <small>{{ part.content }}</small>
              </span>
            </button>
          </div>
        </div>
      </template>
    </ModuleWorkspace>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import FittedTechnicalText from '../components/FittedTechnicalText.vue';
import ModuleWorkspace from '../components/ModuleWorkspace.vue';
import { usePresentationStore } from '../stores/presentation-store';
import {
  getSongs,
  initializeSongLibrary,
  SONG_LIBRARY_STORAGE_KEY,
} from '../services/song-library';
import {
  SONG_PART_TYPE_OPTIONS,
  type Song,
  type SongPart,
  type SongPartType,
} from '../shared/song';
import { showAppNotification } from '../services/app-notification';

const presentationStore = usePresentationStore();

const songs = ref<Song[]>([]);
const searchText = ref('');
const selectedSong = ref<Song | null>(null);
const selectedPartId = ref<string | null>(null);
const serviceSongs = ref<Song[]>([]);
const selectedServiceSongId = ref<string | null>(null);
const liveSong = ref<Song | null>(null);
const livePart = ref<SongPart | null>(null);
const livePanel = ref<HTMLElement | null>(null);

const normalizedSearch = computed(() => normalize(searchText.value));
const filteredSongs = computed(() => {
  const term = normalizedSearch.value;

  return term
    ? songs.value.filter(
        (song) => normalize(song.title).includes(term) || normalize(song.author).includes(term),
      )
    : songs.value;
});
const selectedPart = computed(
  () =>
    selectedSong.value?.parts.find((part) => part.id === selectedPartId.value) ??
    selectedSong.value?.parts[0] ??
    null,
);
const selectedPartPosition = computed(() => {
  if (!selectedSong.value || !selectedPart.value) return 0;
  return selectedSong.value.parts.findIndex((part) => part.id === selectedPart.value?.id) + 1;
});
const livePartPosition = computed(() => {
  if (!liveSong.value || !livePart.value) return 0;
  return liveSong.value.parts.findIndex((part) => part.id === livePart.value?.id) + 1;
});

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function partLabel(type: SongPartType): string {
  return SONG_PART_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Parte';
}

function applySongs(nextSongs: Song[]): void {
  songs.value = nextSongs;

  if (selectedSong.value) {
    selectedSong.value = songs.value.find((song) => song.id === selectedSong.value?.id) ?? null;
  }

  serviceSongs.value = serviceSongs.value.map(
    (serviceSong) => songs.value.find((song) => song.id === serviceSong.id) ?? serviceSong,
  );

  for (const serviceItem of presentationStore.serviceItems) {
    if (serviceItem.type !== 'song') {
      continue;
    }

    const updatedSong = songs.value.find((song) => song.id === serviceItem.sourceId);

    if (!updatedSong) {
      continue;
    }

    presentationStore.updateServiceItem({
      ...serviceItem,
      title: updatedSong.title,
      footer: updatedSong.title,
      frames: updatedSong.parts.map((part, index) => ({
        id: part.id,
        label: `${index + 1} · ${partLabel(part.type)}`,
        text: part.content,
      })),
    });
  }

  if (liveSong.value) {
    const updatedLiveSong = songs.value.find((song) => song.id === liveSong.value?.id);

    if (updatedLiveSong) {
      const currentPartId = livePart.value?.id;
      liveSong.value = updatedLiveSong;
      livePart.value =
        updatedLiveSong.parts.find((part) => part.id === currentPartId) ??
        updatedLiveSong.parts[0] ??
        null;
    }
  }
}

function loadSongs(): void {
  applySongs(getSongs());
}

async function initializeSongs(): Promise<void> {
  try {
    applySongs(await initializeSongLibrary());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No fue posible cargar las alabanzas predefinidas.';

    showAppNotification(message, 'negative', 'error_outline');
    loadSongs();
  }
}

function openSongEditor(): void {
  window.icpStudio?.windows.openSongEditor();
}

function editSong(song: Song): void {
  window.icpStudio?.windows.openSongEditor(song.id);
}

function selectSong(song: Song): void {
  selectedSong.value = song;
  selectedPartId.value = song.parts[0]?.id ?? null;
}

function addSongFromList(song: Song): void {
  selectSong(song);
  addSelectedSongToService();
}

function addSelectedSongToService(): void {
  const song = selectedSong.value;
  if (!song) return;

  const wasAdded = presentationStore.addToService({
    id: `service-song-${song.id}`,
    sourceId: song.id,
    type: 'song',
    title: song.title,
    footer: song.title,
    frames: song.parts.map((part, index) => ({
      id: part.id,
      label: `${index + 1} · ${partLabel(part.type)}`,
      text: part.content,
    })),
  });

  if (!wasAdded) {
    return;
  }

  serviceSongs.value = [...serviceSongs.value, song];
  selectedServiceSongId.value = song.id;
}

function projectSelectedSong(): void {
  const song = selectedSong.value;
  if (!song) return;

  const presentationId = `service-song-${song.id}`;
  const alreadyInService = presentationStore.serviceItems.some(
    (item) => item.id === presentationId,
  );

  if (!alreadyInService) {
    addSelectedSongToService();
  }

  presentationStore.activateServiceItem(presentationId);
}

function selectServiceSong(song: Song): void {
  selectedServiceSongId.value = song.id;
  selectSong(song);
}

function activateServiceSong(song: Song): void {
  selectedServiceSongId.value = song.id;
  liveSong.value = song;
  const firstPart = song.parts[0];
  if (firstPart) setLivePart(firstPart);
  void nextTick(() => livePanel.value?.focus());
}

function removeServiceSong(songId: string): void {
  serviceSongs.value = serviceSongs.value.filter((song) => song.id !== songId);
  if (selectedServiceSongId.value === songId) selectedServiceSongId.value = null;
}

function setLivePart(part: SongPart): void {
  livePart.value = part;
  window.icpStudio?.projection.setState({
    mode: 'content',
    title: '',
    body: part.content,
    footer: liveSong.value?.title ?? '',
  });
}

function moveLivePart(direction: -1 | 1): void {
  const parts = liveSong.value?.parts ?? [];
  if (!parts.length) return;

  const index = livePart.value ? parts.findIndex((part) => part.id === livePart.value?.id) : -1;
  const nextIndex = index < 0 ? 0 : Math.min(parts.length - 1, Math.max(0, index + direction));
  const part = parts[nextIndex];
  if (part) setLivePart(part);
}

function clearLive(): void {
  liveSong.value = null;
  livePart.value = null;
  window.icpStudio?.projection.setState({ mode: 'blank' });
}

function handleStorage(event: StorageEvent): void {
  if (event.key === SONG_LIBRARY_STORAGE_KEY) loadSongs();
}

onMounted(() => {
  void initializeSongs();
  window.addEventListener('focus', loadSongs);
  window.addEventListener('storage', handleStorage);
});

onBeforeUnmount(() => {
  window.removeEventListener('focus', loadSongs);
  window.removeEventListener('storage', handleStorage);
});
</script>

<style scoped>
.song-panel {
  display: flex;
  min-height: 100%;
  flex: 1;
  flex-direction: column;
  outline: none;
}

.song-toolbar,
.panel-label,
.live-header,
.live-header-actions {
  display: flex;
  align-items: center;
}

.song-toolbar {
  gap: 6px;
}

.song-search {
  min-width: 0;
  flex: 1;
}

.song-toolbar-button {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  color: #93c5fd;
  background: #13243a;
  border: 1px solid #2d4665;
  border-radius: 7px;
}

.song-toolbar-button:hover {
  background: #193253;
  border-color: #4b83c5;
}

.song-edit-button {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  color: #9aabc0;
  background: transparent;
}

.song-edit-button:hover {
  color: #bfdbfe;
  background: #1a2b40;
}

.song-results,
.service-list,
.live-parts {
  min-height: 0;
  margin-top: 10px;
  overflow-y: auto;
}

.song-result,
.service-item,
.live-part {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  padding: 7px;
  color: #bdc8d6;
  background: #0d1621;
  border: 1px solid #26364b;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
}

.song-result:hover,
.song-result--active,
.service-item:hover,
.service-item--active,
.live-part:hover,
.live-part--active {
  background: #12243a;
  border-color: #3b82f6;
}

.song-result-copy,
.live-part > span:last-child {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.song-result-copy small,
.live-part small {
  overflow: hidden;
  color: #8492a6;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-label,
.live-header {
  justify-content: space-between;
  margin-bottom: 9px;
  color: #8492a6;
  font-size: 10px;
}

.live-header-actions {
  gap: 6px;
}

.live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  background: #f05252;
  border-radius: 50%;
}

.song-screen {
  position: relative;
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 18px 18px 28px;
  color: #65748a;
  background: radial-gradient(circle at center, rgb(35 55 79 / 55%), transparent 62%), #05080d;
  border: 1px solid #293649;
  border-radius: 8px;
  text-align: center;
}

.song-screen--live {
  flex: 0 1 48%;
}

.song-screen-footer {
  position: absolute;
  bottom: 9px;
  left: 11px;
  color: rgb(216 226 242 / 68%);
  font-size: 8px;
}

.part-list {
  display: flex;
  gap: 5px;
  margin-top: 8px;
  overflow-x: auto;
}

.part-item {
  display: flex;
  min-width: 54px;
  flex-direction: column;
  padding: 5px;
  color: #8492a6;
  background: #0d1621;
  border: 1px solid #26364b;
  border-radius: 6px;
  cursor: pointer;
}

.part-item--active {
  color: #dce6f2;
  border-color: #3b82f6;
}

.position {
  display: flex;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  background: #172d49;
  border-radius: 5px;
  font-size: 10px;
}

.service-item strong {
  min-width: 0;
  flex: 1;
}

.live-parts {
  flex: 1;
}

.empty-state {
  display: flex;
  min-height: 180px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #66758a;
  text-align: center;
  font-size: 11px;
}
</style>
