import { ref } from 'vue';
import { defineStore } from 'pinia';
import {
  DEFAULT_CALENDAR_ACTIVITY_CATEGORIES,
  type CalendarActivity,
  type CalendarActivityCategoryDefinition,
  type CalendarActivityStatus,
} from '../shared/calendar';

const ACTIVITIES_STORAGE_KEY = 'icp-studio-calendar-activities';
const CATEGORIES_STORAGE_KEY = 'icp-studio-calendar-categories';

function cloneDefaultCategories(): CalendarActivityCategoryDefinition[] {
  return DEFAULT_CALENDAR_ACTIVITY_CATEGORIES.map((category) => ({ ...category }));
}

function normalizedStatus(value: unknown): CalendarActivityStatus {
  if (value === 'completed' || value === 'cancelled') return value;
  return 'pending';
}

function loadActivities(): CalendarActivity[] {
  try {
    const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (activity): activity is CalendarActivity =>
          typeof activity === 'object' &&
          activity !== null &&
          typeof (activity as CalendarActivity).id === 'string' &&
          typeof (activity as CalendarActivity).title === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test((activity as CalendarActivity).date),
      )
      .map((activity) => ({
        ...activity,
        endDate:
          typeof activity.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(activity.endDate)
            ? activity.endDate
            : activity.date,
        showOverlayText: activity.showOverlayText !== false,
        showDescriptionOnImage: activity.showDescriptionOnImage === true,
        status: normalizedStatus(activity.status),
      }));
  } catch {
    return [];
  }
}

function loadCategories(): CalendarActivityCategoryDefinition[] {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!stored) return cloneDefaultCategories();
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return cloneDefaultCategories();
    const storedCategories = parsed.filter(
      (category): category is CalendarActivityCategoryDefinition =>
        typeof category === 'object' &&
        category !== null &&
        typeof (category as CalendarActivityCategoryDefinition).id === 'string' &&
        typeof (category as CalendarActivityCategoryDefinition).label === 'string' &&
        typeof (category as CalendarActivityCategoryDefinition).icon === 'string' &&
        typeof (category as CalendarActivityCategoryDefinition).color === 'string',
    );
    return storedCategories.length ? storedCategories : cloneDefaultCategories();
  } catch {
    return cloneDefaultCategories();
  }
}

export const useCalendarActivitiesStore = defineStore('calendar-activities', () => {
  const activities = ref<CalendarActivity[]>(loadActivities());
  const categories = ref<CalendarActivityCategoryDefinition[]>(loadCategories());

  function persistActivities(nextActivities: CalendarActivity[]): boolean {
    try {
      localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(nextActivities));
      activities.value = nextActivities;
      return true;
    } catch {
      return false;
    }
  }

  function persistCategories(nextCategories: CalendarActivityCategoryDefinition[]): boolean {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories));
      categories.value = nextCategories;
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
    return persistActivities(nextActivities);
  }

  function removeActivity(activityId: string): boolean {
    return persistActivities(activities.value.filter((activity) => activity.id !== activityId));
  }

  function addCategory(label: string, color: string): CalendarActivityCategoryDefinition | null {
    const normalizedLabel = label.trim();
    if (!normalizedLabel) return null;
    const category: CalendarActivityCategoryDefinition = {
      id: `custom-${crypto.randomUUID()}`,
      label: normalizedLabel,
      icon: 'event',
      color,
    };
    return persistCategories([...categories.value, category]) ? category : null;
  }

  function removeCategory(categoryId: string): 'removed' | 'used' | 'last' | 'missing' {
    if (!categories.value.some((category) => category.id === categoryId)) return 'missing';
    if (categories.value.length <= 1) return 'last';
    if (activities.value.some((activity) => activity.category === categoryId)) return 'used';
    return persistCategories(categories.value.filter((category) => category.id !== categoryId))
      ? 'removed'
      : 'missing';
  }

  return {
    activities,
    categories,
    saveActivity,
    removeActivity,
    addCategory,
    removeCategory,
  };
});
