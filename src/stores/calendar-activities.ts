import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { CalendarActivity } from '../shared/calendar';

const STORAGE_KEY = 'icp-studio-calendar-activities';

function loadActivities(): CalendarActivity[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (activity): activity is CalendarActivity =>
        typeof activity === 'object' &&
        activity !== null &&
        typeof (activity as CalendarActivity).id === 'string' &&
        typeof (activity as CalendarActivity).title === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test((activity as CalendarActivity).date),
    );
  } catch {
    return [];
  }
}

export const useCalendarActivitiesStore = defineStore('calendar-activities', () => {
  const activities = ref<CalendarActivity[]>(loadActivities());

  function persist(nextActivities: CalendarActivity[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextActivities));
      activities.value = nextActivities;
      return true;
    } catch {
      return false;
    }
  }

  function saveActivity(activity: CalendarActivity): boolean {
    const index = activities.value.findIndex((item) => item.id === activity.id);
    const nextActivities = [...activities.value];
    if (index >= 0) nextActivities[index] = activity;
    else nextActivities.push(activity);
    return persist(nextActivities);
  }

  function removeActivity(activityId: string): boolean {
    return persist(activities.value.filter((activity) => activity.id !== activityId));
  }

  return {
    activities,
    saveActivity,
    removeActivity,
  };
});
