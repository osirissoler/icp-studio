import type { ScoreHarmonyRow, ScoreVoiceId } from './score-harmony-engine';

export interface PianoPlaybackCallbacks {
  onNoteChange?: (index: number | null) => void;
  onFinish?: () => void;
}

export class ScorePianoPlayer {
  private context: AudioContext | null = null;

  private oscillators: OscillatorNode[] = [];

  private gains: GainNode[] = [];

  private timers: ReturnType<typeof setTimeout>[] = [];

  async playVoice(
    rows: ScoreHarmonyRow[],
    voiceId: ScoreVoiceId,
    callbacks: PianoPlaybackCallbacks = {},
  ): Promise<void> {
    this.stop();

    const context = await this.prepareContext();

    const firstStart = rows[0]?.source.startMs ?? 0;

    const baseStart = context.currentTime + 0.08;

    let endMs = 0;

    rows.forEach((row, index) => {
      const voice = row.voices.find((item) => item.voiceId === voiceId);

      if (!voice) {
        return;
      }

      const relativeStart = row.source.startMs - firstStart;

      this.createPianoTone(
        context,
        voice.frequency,
        baseStart + relativeStart / 1000,
        Math.max(0.08, row.source.durationMs / 1000),
        voiceId === 'principal' ? 0.16 : 0.135,
      );

      this.timers.push(
        setTimeout(() => {
          callbacks.onNoteChange?.(index);
        }, relativeStart),
      );

      endMs = Math.max(endMs, relativeStart + row.source.durationMs);
    });

    this.timers.push(
      setTimeout(() => {
        callbacks.onNoteChange?.(null);
        callbacks.onFinish?.();
        this.stopNodesOnly();
      }, endMs + 180),
    );
  }

  async playAll(rows: ScoreHarmonyRow[], callbacks: PianoPlaybackCallbacks = {}): Promise<void> {
    this.stop();

    const context = await this.prepareContext();

    const firstStart = rows[0]?.source.startMs ?? 0;

    const baseStart = context.currentTime + 0.08;

    let endMs = 0;

    rows.forEach((row, index) => {
      const relativeStart = row.source.startMs - firstStart;

      row.voices.forEach((voice) => {
        this.createPianoTone(
          context,
          voice.frequency,
          baseStart + relativeStart / 1000,
          Math.max(0.08, row.source.durationMs / 1000),
          voice.voiceId === 'principal' ? 0.09 : 0.045,
        );
      });

      this.timers.push(
        setTimeout(() => {
          callbacks.onNoteChange?.(index);
        }, relativeStart),
      );

      endMs = Math.max(endMs, relativeStart + row.source.durationMs);
    });

    this.timers.push(
      setTimeout(() => {
        callbacks.onNoteChange?.(null);
        callbacks.onFinish?.();
        this.stopNodesOnly();
      }, endMs + 180),
    );
  }

  async playSingle(frequency: number, durationSeconds = 0.8): Promise<void> {
    this.stop();

    const context = await this.prepareContext();

    this.createPianoTone(context, frequency, context.currentTime + 0.03, durationSeconds, 0.17);

    this.timers.push(
      setTimeout(
        () => {
          this.stopNodesOnly();
        },
        durationSeconds * 1000 + 120,
      ),
    );
  }

  stop(): void {
    this.timers.forEach((timer) => {
      clearTimeout(timer);
    });

    this.timers = [];

    this.stopNodesOnly();
  }

  async destroy(): Promise<void> {
    this.stop();

    if (this.context) {
      await this.context.close();

      this.context = null;
    }
  }

  private async prepareContext(): Promise<AudioContext> {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext();
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  private createPianoTone(
    context: AudioContext,
    frequency: number,
    start: number,
    durationSeconds: number,
    volume: number,
  ): void {
    const duration = Math.max(0.08, durationSeconds);

    const end = start + duration;

    const partials = [
      {
        multiplier: 1,
        volume: 1,
        type: 'triangle' as OscillatorType,
      },
      {
        multiplier: 2,
        volume: 0.24,
        type: 'sine' as OscillatorType,
      },
      {
        multiplier: 3,
        volume: 0.08,
        type: 'sine' as OscillatorType,
      },
    ];

    partials.forEach((partial) => {
      const oscillator = context.createOscillator();

      const gain = context.createGain();

      const peak = Math.max(0.0001, volume * partial.volume);

      oscillator.type = partial.type;

      oscillator.frequency.setValueAtTime(frequency * partial.multiplier, start);

      gain.gain.setValueAtTime(0.0001, start);

      gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.009, duration * 0.12));

      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, peak * 0.42),
        start + Math.min(0.24, duration * 0.55),
      );

      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);

      gain.connect(context.destination);

      oscillator.start(start);

      oscillator.stop(end + 0.04);

      this.oscillators.push(oscillator);

      this.gains.push(gain);
    });
  }

  private stopNodesOnly(): void {
    this.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Puede haber terminado naturalmente.
      }

      oscillator.disconnect();
    });

    this.gains.forEach((gain) => {
      gain.disconnect();
    });

    this.oscillators = [];

    this.gains = [];
  }
}
