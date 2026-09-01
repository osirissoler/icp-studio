<template>
  <section
    class="activity-projection"
    :class="{
      'activity-projection--compact': compact,
      'activity-projection--image-only': !activity.showOverlayText,
    }"
    :style="activityBackground"
  >
    <template v-if="activity.showOverlayText">
      <div class="activity-backdrop"></div>
      <header class="activity-brand">
        <span><q-icon name="church" /> ICP Studio</span>
        <small>Próxima actividad</small>
      </header>
      <div class="activity-content">
        <span class="activity-category" :style="{ '--activity-color': activity.categoryColor }">
          {{ activity.categoryLabel }}
        </span>
        <h1>{{ activity.title }}</h1>
        <p class="activity-date"><q-icon name="calendar_month" /> {{ activity.dateLabel }}</p>
        <p v-if="activity.location" class="activity-location">
          <q-icon name="location_on" /> {{ activity.location }}
        </p>
        <p
          v-if="activity.showDescriptionOnImage && activity.description"
          class="activity-description"
        >
          {{ activity.description }}
        </p>
      </div>
      <footer class="activity-footer">
        <span>Te esperamos</span>
        <i :style="{ backgroundColor: activity.categoryColor }"></i>
      </footer>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ActivityPresentationData } from '../shared/presentation';

const props = withDefaults(
  defineProps<{
    activity: ActivityPresentationData;
    compact?: boolean;
  }>(),
  { compact: false },
);

const activityBackground = computed<Record<string, string>>(() =>
  props.activity.imageUrl
    ? { backgroundImage: `url("${props.activity.imageUrl.replaceAll('"', '%22')}")` }
    : {},
);
</script>

<style scoped>
.activity-projection {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  align-items: stretch;
  justify-content: space-between;
  flex-direction: column;
  padding: clamp(36px, 5vw, 90px) clamp(46px, 7vw, 130px);
  color: white;
  background:
    radial-gradient(circle at 78% 25%, #315b83, transparent 35%),
    linear-gradient(135deg, #10243a, #050b12);
  background-position: center;
  background-size: cover;
  text-align: left;
}

.activity-projection--image-only {
  padding: 0;
  background-color: #000;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.activity-backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgb(3 9 16 / 94%) 0%, rgb(5 13 22 / 76%) 48%, rgb(5 13 22 / 22%)),
    linear-gradient(0deg, rgb(2 7 12 / 62%), transparent 45%);
}

.activity-brand,
.activity-content,
.activity-footer {
  position: relative;
  z-index: 1;
}

.activity-brand,
.activity-footer,
.activity-brand > span {
  display: flex;
  align-items: center;
}

.activity-brand {
  justify-content: space-between;
  color: #d7e6f4;
  font-size: clamp(14px, 1.3vw, 24px);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.activity-brand > span {
  gap: 9px;
}

.activity-brand small {
  color: #94aabd;
  font-size: 0.68em;
  letter-spacing: 0.16em;
}

.activity-content {
  width: min(78vw, 1350px);
  margin: auto 0;
}

.activity-category {
  display: inline-flex;
  padding: clamp(7px, 0.7vw, 12px) clamp(12px, 1.2vw, 22px);
  color: white;
  background: color-mix(in srgb, var(--activity-color) 68%, rgb(8 18 30 / 88%));
  border-left: clamp(4px, 0.45vw, 8px) solid var(--activity-color);
  border-radius: 6px;
  font-size: clamp(12px, 1.15vw, 21px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.activity-content h1 {
  max-width: 95%;
  margin: clamp(16px, 2.2vw, 38px) 0 clamp(13px, 1.4vw, 25px);
  color: #fff;
  font-size: clamp(44px, 6.7vw, 120px);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.035em;
  text-wrap: balance;
  text-shadow: 0 5px 24px rgb(0 0 0 / 65%);
}

.activity-date,
.activity-location {
  display: flex;
  align-items: center;
  gap: clamp(8px, 0.8vw, 14px);
  margin: 0;
  color: #e0ebf5;
  font-size: clamp(20px, 2vw, 38px);
  font-weight: 600;
  line-height: 1.25;
  text-transform: capitalize;
  text-shadow: 0 2px 12px #000;
}

.activity-location {
  margin-top: clamp(8px, 0.8vw, 14px);
  color: #c3d4e2;
  font-size: clamp(17px, 1.6vw, 30px);
}

.activity-description {
  display: -webkit-box;
  max-width: min(68vw, 1150px);
  margin: clamp(15px, 1.5vw, 28px) 0 0;
  overflow: hidden;
  color: #bacbd9;
  font-size: clamp(15px, 1.35vw, 25px);
  font-weight: 400;
  line-height: 1.45;
  text-wrap: pretty;
  white-space: pre-line;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.activity-footer {
  justify-content: flex-end;
  gap: 13px;
  color: #a9bac9;
  font-size: clamp(13px, 1.1vw, 20px);
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.activity-footer i {
  width: clamp(32px, 3vw, 55px);
  height: 3px;
  border-radius: 2px;
}

.activity-projection--compact {
  padding: 7% 8%;
}

.activity-projection--compact .activity-brand {
  justify-content: flex-end;
  font-size: clamp(7px, 1.2vw, 11px);
}

.activity-projection--compact .activity-brand > span {
  display: none;
}

.activity-projection--compact .activity-category {
  padding: 4px 7px;
  border-left-width: 3px;
  font-size: clamp(6px, 0.9vw, 9px);
}

.activity-projection--compact .activity-content {
  width: 92%;
}

.activity-projection--compact .activity-content h1 {
  margin: 7px 0 4px;
  font-size: clamp(16px, 3.2vw, 30px);
}

.activity-projection--compact .activity-date {
  gap: 4px;
  font-size: clamp(7px, 1.2vw, 11px);
}

.activity-projection--compact .activity-location,
.activity-projection--compact .activity-description {
  margin-top: 4px;
  font-size: clamp(6px, 0.9vw, 9px);
}

.activity-projection--compact .activity-description {
  max-width: 82%;
  -webkit-line-clamp: 2;
}

.activity-projection--compact .activity-footer {
  gap: 6px;
  font-size: clamp(6px, 0.8vw, 8px);
}

.activity-projection--compact.activity-projection--image-only {
  padding: 0;
}
</style>
