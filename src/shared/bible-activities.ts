export type BibleActivityType =
  | 'crossword'
  | 'character'
  | 'order-phrase'
  | 'complete-phrase'
  | 'true-false'
  | 'who-said-it'
  | 'hidden-image';

export interface BibleActivityDefinition {
  type: BibleActivityType;
  label: string;
  icon: string;
  color: string;
  description: string;
  route: string;
}

export interface BibleActivityRound {
  id: string;
  prompt: string;
  answer: string;
  bibleReference: string;
  hint: string;
  explanation: string;
}

export interface BibleActivityRecord {
  id: string;
  type: Exclude<BibleActivityType, 'hidden-image'>;
  title: string;
  rounds: BibleActivityRound[];
  createdAt: string;
  updatedAt: string;
}

export interface CareoActivityEntry {
  id: string;
  activityType: BibleActivityType;
  sourceActivityId: string;
  title: string;
}

export interface BibleCareo {
  id: string;
  title: string;
  teamNames: string[];
  initialScore: number;
  pointsPerCorrect: number;
  activities: CareoActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

export const BIBLE_ACTIVITY_DEFINITIONS: BibleActivityDefinition[] = [
  {
    type: 'crossword',
    label: 'Crucigrama',
    icon: 'grid_on',
    color: '#a78bfa',
    description: 'Crea palabras y pistas bíblicas para resolver por rondas.',
    route: '/actividades/crucigrama',
  },
  {
    type: 'character',
    label: 'Identifica el personaje',
    icon: 'person_search',
    color: '#f59e0b',
    description: 'Presenta pistas hasta que identifiquen el personaje bíblico.',
    route: '/actividades/identifica-personaje',
  },
  {
    type: 'order-phrase',
    label: 'Organiza la frase',
    icon: 'reorder',
    color: '#34d399',
    description: 'Desordena palabras de un texto para reconstruir la frase correcta.',
    route: '/actividades/organiza-frase',
  },
  {
    type: 'complete-phrase',
    label: 'Completa la frase',
    icon: 'edit_note',
    color: '#f472b6',
    description: 'Oculta una palabra o parte de una frase bíblica para completarla.',
    route: '/actividades/completa-frase',
  },
  {
    type: 'true-false',
    label: 'Verdadero o falso',
    icon: 'rule',
    color: '#22d3ee',
    description: 'Crea afirmaciones bíblicas y revela si son verdaderas o falsas.',
    route: '/actividades/verdadero-falso',
  },
  {
    type: 'who-said-it',
    label: '¿Quién dijo esto?',
    icon: 'record_voice_over',
    color: '#fb7185',
    description: 'Presenta una cita bíblica para identificar quién la dijo.',
    route: '/actividades/quien-dijo-esto',
  },
  {
    type: 'hidden-image',
    label: 'Imagen escondida',
    icon: 'image_search',
    color: '#c084fc',
    description: 'Descubre una imagen por casillas, pistas y puntuación.',
    route: '/actividades/imagen-escondida',
  },
];

export function getBibleActivityDefinition(type: BibleActivityType): BibleActivityDefinition {
  return BIBLE_ACTIVITY_DEFINITIONS.find((definition) => definition.type === type) ?? BIBLE_ACTIVITY_DEFINITIONS[0]!;
}
