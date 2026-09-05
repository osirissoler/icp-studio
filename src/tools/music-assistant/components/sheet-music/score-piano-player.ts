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

  private playbackToken = 0;

  async playVoice(
    rows: ScoreHarmonyRow[],
    voiceId: ScoreVoiceId,
    callbacks: PianoPlaybackCallbacks = {},
  ): Promise<void> {
    this.stop();

    if (!rows.length) {
      callbacks.onFinish?.();

      return;
    }

    const context = await this.prepareContext();

    const token = ++this.playbackToken;

    const firstStart = rows[0]?.source.startMs ?? 0;

    rows.forEach((row, index) => {
      const relativeStart = Math.max(0, row.source.startMs - firstStart);

      this.scheduleTimer(relativeStart, () => {
        if (token !== this.playbackToken) {
          return;
        }

        const voice = row.voices.find((item) => item.voiceId === voiceId);

        if (!voice) {
          return;
        }

        callbacks.onNoteChange?.(index);

        this.createPianoTone(
          context,
          voice.frequency,
          context.currentTime + 0.015,
          Math.max(0.08, row.source.durationMs / 1000),
          voiceId === 'principal' ? 0.16 : 0.135,
        );
      });
    });

    const endMs = this.calculateEndMs(rows, firstStart);

    this.scheduleTimer(endMs + 180, () => {
      if (token !== this.playbackToken) {
        return;
      }

      callbacks.onNoteChange?.(null);

      callbacks.onFinish?.();

      this.stopNodesOnly();
    });
  }

  async playAll(rows: ScoreHarmonyRow[], callbacks: PianoPlaybackCallbacks = {}): Promise<void> {
    this.stop();

    if (!rows.length) {
      callbacks.onFinish?.();

      return;
    }

    const context = await this.prepareContext();

    const token = ++this.playbackToken;

    const firstStart = rows[0]?.source.startMs ?? 0;

    rows.forEach((row, index) => {
      const relativeStart = Math.max(0, row.source.startMs - firstStart);

      this.scheduleTimer(relativeStart, () => {
        if (token !== this.playbackToken) {
          return;
        }

        callbacks.onNoteChange?.(index);

        const principal = row.voices.find((voice) => voice.voiceId === 'principal');

        const harmonies = row.voices.filter((voice) => voice.voiceId !== 'principal');

        if (principal) {
          this.createPianoTone(
            context,
            principal.frequency,
            context.currentTime + 0.015,
            Math.max(0.08, row.source.durationMs / 1000),
            0.13,
          );
        }

        harmonies.forEach((voice) => {
          this.createPianoTone(
            context,
            voice.frequency,
            context.currentTime + 0.015,
            Math.max(0.08, row.source.durationMs / 1000),
            0.052,
          );
        });
      });
    });

    const endMs = this.calculateEndMs(rows, firstStart);

    this.scheduleTimer(endMs + 220, () => {
      if (token !== this.playbackToken) {
        return;
      }

      callbacks.onNoteChange?.(null);

      callbacks.onFinish?.();

      this.stopNodesOnly();
    });
  }

  async playSingle(frequency: number, durationSeconds = 0.8): Promise<void> {
    this.stop();

    const context = await this.prepareContext();

    const token = ++this.playbackToken;

    this.createPianoTone(context, frequency, context.currentTime + 0.03, durationSeconds, 0.17);

    this.scheduleTimer(durationSeconds * 1000 + 120, () => {
      if (token !== this.playbackToken) {
        return;
      }

      this.stopNodesOnly();
    });
  }

  stop(): void {
    this.playbackToken += 1;

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

  private scheduleTimer(delayMs: number, callback: () => void): void {
    const timer = setTimeout(callback, Math.max(0, Math.round(delayMs)));

    this.timers.push(timer);
  }

  private calculateEndMs(rows: ScoreHarmonyRow[], firstStart: number): number {
    return rows.reduce((maximum, row) => {
      const relativeStart = Math.max(0, row.source.startMs - firstStart);

      return Math.max(maximum, relativeStart + row.source.durationMs);
    }, 0);
  }

  private createPianoTone(
    context: AudioContext,
    frequency: number,
    start: number,
    durationSeconds: number,
    volume: number,
  ): void {
    if (!Number.isFinite(frequency) || frequency <= 0) {
      return;
    }

    const duration = Math.max(0.08, durationSeconds);

    const safeFrequency = Math.min(Math.max(frequency, 20), 16000);

    const end = start + duration;

    const partials = [
      {
        multiplier: 1,
        volume: 1,
        type: 'triangle' as OscillatorType,
      },
      {
        multiplier: 2,
        volume: 0.22,
        type: 'sine' as OscillatorType,
      },
      {
        multiplier: 3,
        volume: 0.07,
        type: 'sine' as OscillatorType,
      },
    ];

    partials.forEach((partial) => {
      const oscillator = context.createOscillator();

      const gain = context.createGain();

      const partialFrequency = Math.min(safeFrequency * partial.multiplier, 18000);

      const peak = Math.max(0.0001, volume * partial.volume);

      oscillator.type = partial.type;

      oscillator.frequency.setValueAtTime(partialFrequency, start);

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

      oscillator.onended = () => {
        this.removeOscillator(oscillator);

        this.removeGain(gain);

        try {
          oscillator.disconnect();
        } catch {
          // Ya estaba desconectado.
        }

        try {
          gain.disconnect();
        } catch {
          // Ya estaba desconectado.
        }
      };

      this.oscillators.push(oscillator);

      this.gains.push(gain);
    });
  }

  private removeOscillator(oscillator: OscillatorNode): void {
    const index = this.oscillators.indexOf(oscillator);

    if (index >= 0) {
      this.oscillators.splice(index, 1);
    }
  }

  private removeGain(gain: GainNode): void {
    const index = this.gains.indexOf(gain);

    if (index >= 0) {
      this.gains.splice(index, 1);
    }
  }

  private stopNodesOnly(): void {
    const oscillators = [...this.oscillators];

    const gains = [...this.gains];

    this.oscillators = [];

    this.gains = [];

    oscillators.forEach((oscillator) => {
      try {
        oscillator.onended = null;

        oscillator.stop();
      } catch {
        // Puede haber terminado naturalmente.
      }

      try {
        oscillator.disconnect();
      } catch {
        // Puede estar desconectado.
      }
    });

    gains.forEach((gain) => {
      try {
        gain.disconnect();
      } catch {
        // Puede estar desconectado.
      }
    });
  }
}
