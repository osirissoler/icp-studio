import type {
  BibleActivityRecord,
  BibleActivityType,
  BibleCareo,
} from '../shared/bible-activities';

const ACTIVITY_KEY = 'icp-studio:bible-activities:v1';
const CAREO_KEY = 'icp-studio:bible-careos:v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function createBibleActivityId(prefix = 'activity'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getBibleActivities(type?: Exclude<BibleActivityType, 'hidden-image'>): BibleActivityRecord[] {
  const activities = readJson<BibleActivityRecord[]>(ACTIVITY_KEY, []);
  const filtered = type ? activities.filter((activity) => activity.type === type) : activities;
  return [...filtered].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getBibleActivity(id: string): BibleActivityRecord | null {
  return getBibleActivities().find((activity) => activity.id === id) ?? null;
}

export function saveBibleActivity(activity: BibleActivityRecord): void {
  const activities = getBibleActivities();
  const index = activities.findIndex((entry) => entry.id === activity.id);
  if (index >= 0) activities[index] = activity;
  else activities.unshift(activity);
  writeJson(ACTIVITY_KEY, activities);
}

export function deleteBibleActivity(id: string): boolean {
  const activities = getBibleActivities();
  const next = activities.filter((activity) => activity.id !== id);
  if (next.length === activities.length) return false;
  writeJson(ACTIVITY_KEY, next);

  const careos = getBibleCareos().map((careo) => ({
    ...careo,
    activities: careo.activities.filter((activity) => activity.sourceActivityId !== id),
  }));
  writeJson(CAREO_KEY, careos);
  return true;
}

export function getBibleCareos(): BibleCareo[] {
  return readJson<BibleCareo[]>(CAREO_KEY, []).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getBibleCareo(id: string): BibleCareo | null {
  return getBibleCareos().find((careo) => careo.id === id) ?? null;
}

export function saveBibleCareo(careo: BibleCareo): void {
  const careos = getBibleCareos();
  const index = careos.findIndex((entry) => entry.id === careo.id);
  if (index >= 0) careos[index] = careo;
  else careos.unshift(careo);
  writeJson(CAREO_KEY, careos);
}

export function deleteBibleCareo(id: string): boolean {
  const careos = getBibleCareos();
  const next = careos.filter((careo) => careo.id !== id);
  if (next.length === careos.length) return false;
  writeJson(CAREO_KEY, next);
  return true;
}
