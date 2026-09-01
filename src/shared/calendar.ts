export interface CalendarActivityCategoryDefinition {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const DEFAULT_CALENDAR_ACTIVITY_CATEGORIES: CalendarActivityCategoryDefinition[] = [
  { id: 'worship', label: 'Culto', icon: 'church', color: '#60a5fa' },
  { id: 'youth', label: 'Jóvenes', icon: 'groups', color: '#a78bfa' },
  { id: 'evangelism', label: 'Evangelismo', icon: 'campaign', color: '#34d399' },
  { id: 'teaching', label: 'Enseñanza', icon: 'menu_book', color: '#fbbf24' },
  { id: 'music', label: 'Música', icon: 'music_note', color: '#f472b6' },
  { id: 'meeting', label: 'Reunión', icon: 'diversity_3', color: '#22d3ee' },
  { id: 'special', label: 'Especial', icon: 'celebration', color: '#fb7185' },
];

export type CalendarActivityCategory = string;
export type CalendarActivityStatus = 'pending' | 'completed' | 'cancelled';

export interface CalendarActivity {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}
