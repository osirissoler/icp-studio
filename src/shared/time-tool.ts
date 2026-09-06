export type TimeToolMode = 'clock' | 'timer' | 'stopwatch' | 'metronome';

export type ClockDisplayStyle = 'digital' | 'analog';

export type MetronomeSoundStyle = 'classic' | 'wood' | 'digital';

export type MetronomeBeatUnit = 4 | 8;

export interface TimeToolPresentationData {
  id: string;
  title: string;
  mode: TimeToolMode;

  clockStyle: ClockDisplayStyle;

  use24Hour: boolean;
  showSeconds: boolean;
  showDate: boolean;
  showMilliseconds: boolean;

  durationMs: number;
  baseTimeMs: number;
  startedAt: number;

  running: boolean;
  completed: boolean;

  countdownSound: boolean;
  completionSound: boolean;
  soundVolume: number;

  backgroundColor: string;
  accentColor: string;
  textColor: string;

  displayScale: number;

  /*
   * Metrónomo.
   *
   * Son opcionales para mantener compatibilidad
   * con relojes, temporizadores y cronómetros
   * guardados anteriormente.
   */
  metronomeBpm?: number;
  metronomeBeatsPerMeasure?: number;
  metronomeBeatUnit?: MetronomeBeatUnit;
  metronomeAccentFirstBeat?: boolean;
  metronomeSoundEnabled?: boolean;
  metronomeSoundStyle?: MetronomeSoundStyle;
  metronomeShowBeat?: boolean;
  metronomeShowTempoName?: boolean;
}

export function currentTimeToolValue(tool: TimeToolPresentationData, now = Date.now()): number {
  if (tool.mode === 'clock') {
    return now;
  }

  if (!tool.running) {
    return Math.max(0, tool.baseTimeMs);
  }

  const elapsed = Math.max(0, now - tool.startedAt);

  if (tool.mode === 'timer') {
    return Math.max(0, tool.baseTimeMs - elapsed);
  }

  /*
   * Cronómetro y metrónomo utilizan
   * tiempo transcurrido creciente.
   *
   * En el metrónomo este tiempo permite
   * reconstruir exactamente:
   *
   * - tiempo actual,
   * - posición de la aguja,
   * - número de pulso,
   * - compás actual.
   */
  return Math.max(0, tool.baseTimeMs + elapsed);
}
