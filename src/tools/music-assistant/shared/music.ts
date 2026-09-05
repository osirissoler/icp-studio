export type MusicalMode =
  'reference' | 'detect' | 'harmony' | 'score' | 'piano' | 'guitar' | 'tuner';

export interface ModeDefinition {
  id: MusicalMode;
  label: string;
  icon: string;
  color: string;
  description: string;
  longDescription: string;
  features: string[];
}

export interface NoteDefinition {
  value: number;
  label: string;
  international: string;
}

export interface PitchInformation {
  frequency: number;
  midi: number;
  noteIndex: number;
  octave: number;
  cents: number;
  targetFrequency: number;
}

export const notes: NoteDefinition[] = [
  { value: 0, label: 'Do', international: 'C' },
  { value: 1, label: 'Do♯', international: 'C♯' },
  { value: 2, label: 'Re', international: 'D' },
  { value: 3, label: 'Re♯', international: 'D♯' },
  { value: 4, label: 'Mi', international: 'E' },
  { value: 5, label: 'Fa', international: 'F' },
  { value: 6, label: 'Fa♯', international: 'F♯' },
  { value: 7, label: 'Sol', international: 'G' },
  { value: 8, label: 'Sol♯', international: 'G♯' },
  { value: 9, label: 'La', international: 'A' },
  { value: 10, label: 'La♯', international: 'A♯' },
  { value: 11, label: 'Si', international: 'B' },
];

export const octaves = [2, 3, 4, 5];

export const modes: ModeDefinition[] = [
  {
    id: 'reference',
    label: 'Nota de referencia',
    icon: 'graphic_eq',
    color: '#f472b6',
    description: 'Escucha una nota para comenzar.',
    longDescription: '',
    features: [],
  },
  {
    id: 'detect',
    label: 'Detectar mi nota',
    icon: 'mic',
    color: '#60a5fa',
    description: 'Canta y descubre qué nota estás dando.',
    longDescription: '',
    features: [],
  },
  {
    id: 'harmony',
    label: 'Voces y armonía',
    icon: 'groups',
    color: '#a78bfa',
    description: 'Busca referencias para distintas voces.',
    longDescription:
      'Partiendo de una nota o tonalidad podremos preparar referencias para voz principal, segunda voz, tenor, barítono y bajo.',
    features: [
      'Elegir nota principal',
      'Generar referencias de otras voces',
      'Escuchar cada voz por separado',
      'Escuchar varias voces juntas',
      'Guardar configuraciones para reutilizarlas',
    ],
  },
  {
    id: 'score',
    label: 'Leer partitura',
    icon: 'queue_music',
    color: '#22d3ee',
    description: 'Interpreta una partitura y tócala en piano.',
    longDescription:
      'Importa una partitura, interpreta sus notas, compases, silencios y tiempos y genera referencias de piano para la melodía y sus armonías.',
    features: [
      'Importar MusicXML',
      'Interpretar notas y silencios',
      'Detectar compás y tempo',
      'Construir línea de tiempo musical',
      'Generar varias voces de armonía',
      'Reproducir cada voz en piano',
    ],
  },
  {
    id: 'piano',
    label: 'Piano',
    icon: 'piano',
    color: '#34d399',
    description: 'Teclado visual de referencia.',
    longDescription:
      'Tendremos un piano virtual para buscar notas, visualizar escalas y comprender dónde se encuentran las referencias musicales.',
    features: [
      'Teclado virtual interactivo',
      'Reproducción de cada tecla',
      'Resaltar notas seleccionadas',
      'Mostrar escalas y acordes',
      'Conectar notas con el asistente de voces',
    ],
  },
  {
    id: 'guitar',
    label: 'Guitarra',
    icon: 'music_note',
    color: '#fbbf24',
    description: 'Encuentra notas sobre el diapasón.',
    longDescription:
      'La guitarra de referencia mostrará visualmente dónde se encuentra cada nota y cómo se relaciona con tonalidades y acordes.',
    features: [
      'Diapasón visual',
      'Mostrar ubicación de una nota',
      'Mostrar varias posiciones de la misma nota',
      'Visualizar acordes',
      'Relacionar guitarra y piano',
    ],
  },
  {
    id: 'tuner',
    label: 'Afinador',
    icon: 'tune',
    color: '#fb7185',
    description: 'Comprueba afinación en tiempo real.',
    longDescription:
      'El afinador utilizará el micrófono para indicar qué tan cerca estás de la nota correcta mientras cantas.',
    features: [
      'Afinación mediante micrófono',
      'Medidor visual de desviación',
      'Nombre de nota en tiempo real',
      'Frecuencia detectada',
      'Referencia sonora de la nota objetivo',
    ],
  },
];

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToPitchInformation(frequency: number): PitchInformation {
  const exactMidi = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(exactMidi);

  const targetFrequency = midiToFrequency(midi);
  const cents = 1200 * Math.log2(frequency / targetFrequency);

  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;

  return {
    frequency,
    midi,
    noteIndex,
    octave,
    cents,
    targetFrequency,
  };
}

export function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const size = buffer.length;

  let rms = 0;

  for (let index = 0; index < size; index += 1) {
    const sample = buffer[index] ?? 0;
    rms += sample * sample;
  }

  rms = Math.sqrt(rms / size);

  if (rms < 0.01) {
    return -1;
  }

  const correlations = new Float32Array(size);

  for (let lag = 0; lag < size; lag += 1) {
    let correlation = 0;

    for (let index = 0; index < size - lag; index += 1) {
      correlation += (buffer[index] ?? 0) * (buffer[index + lag] ?? 0);
    }

    correlations[lag] = correlation;
  }

  let dip = 0;

  while (dip + 1 < correlations.length && (correlations[dip] ?? 0) > (correlations[dip + 1] ?? 0)) {
    dip += 1;
  }

  let maxValue = -1;
  let maxIndex = -1;

  for (let index = dip; index < correlations.length; index += 1) {
    const value = correlations[index] ?? 0;

    if (value > maxValue) {
      maxValue = value;
      maxIndex = index;
    }
  }

  if (maxIndex <= 0) {
    return -1;
  }

  let period = maxIndex;

  const left = correlations[maxIndex - 1] ?? 0;
  const center = correlations[maxIndex] ?? 0;
  const right = correlations[maxIndex + 1] ?? 0;

  const denominator = 2 * (2 * center - left - right);

  if (denominator !== 0) {
    period += (right - left) / denominator;
  }

  const frequency = sampleRate / period;

  if (!Number.isFinite(frequency) || frequency < 60 || frequency > 1200) {
    return -1;
  }

  return frequency;
}

export function calculateInputLevel(buffer: Float32Array): number {
  let sum = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    const sample = buffer[index] ?? 0;
    sum += sample * sample;
  }

  const rms = Math.sqrt(sum / buffer.length);

  return Math.min(1, rms * 8);
}
