export type TimeToolMode = 'clock' | 'timer' | 'stopwatch';
export type ClockDisplayStyle = 'digital' | 'analog';

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
}

export function currentTimeToolValue(tool: TimeToolPresentationData, now = Date.now()): number {
  if (tool.mode === 'clock') return now;
  if (!tool.running) return Math.max(0, tool.baseTimeMs);
  const elapsed = Math.max(0, now - tool.startedAt);
  return tool.mode === 'timer'
    ? Math.max(0, tool.baseTimeMs - elapsed)
    : Math.max(0, tool.baseTimeMs + elapsed);
}
