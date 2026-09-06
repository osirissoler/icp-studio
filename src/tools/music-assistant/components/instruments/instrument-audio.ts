let audioContext: AudioContext | null = null;

interface ActiveVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
  midi: number;
}

const activeVoices = new Map<string, ActiveVoice>();

function context(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }

  return audioContext;
}

export function midiToInstrumentFrequency(midi: number, referenceA = 440): number {
  return referenceA * Math.pow(2, (midi - 69) / 12);
}

export function startInstrumentNote(voiceId: string, midi: number, volume = 0.2): void {
  stopInstrumentVoice(voiceId);

  const audio = context();

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = 'triangle';

  oscillator.frequency.setValueAtTime(midiToInstrumentFrequency(midi), audio.currentTime);

  gain.gain.setValueAtTime(0.0001, audio.currentTime);

  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), audio.currentTime + 0.018);

  oscillator.connect(gain);
  gain.connect(audio.destination);

  activeVoices.set(voiceId, {
    oscillator,
    gain,
    midi,
  });

  oscillator.start();
}

export function stopInstrumentVoice(voiceId: string): void {
  const voice = activeVoices.get(voiceId);

  if (!voice || !audioContext) {
    return;
  }

  const now = audioContext.currentTime;

  try {
    voice.gain.gain.cancelScheduledValues(now);

    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);

    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    voice.oscillator.stop(now + 0.09);
  } catch {
    // La voz puede haber terminado antes.
  }

  activeVoices.delete(voiceId);
}

export function playInstrumentNote(midi: number, duration = 1.4, volume = 0.22): void {
  const voiceId = `oneshot-${midi}-${Date.now()}-${Math.random()}`;

  startInstrumentNote(voiceId, midi, volume);

  window.setTimeout(() => {
    stopInstrumentVoice(voiceId);
  }, duration * 1000);
}

export function playInstrumentChord(midis: number[], duration = 1.8): void {
  stopAllInstrumentNotes();

  midis.forEach((midi, index) => {
    window.setTimeout(() => {
      playInstrumentNote(midi, duration, Math.max(0.09, 0.19 - index * 0.012));
    }, index * 22);
  });
}

export function stopInstrumentNote(midi: number): void {
  Array.from(activeVoices.entries()).forEach(([voiceId, voice]) => {
    if (voice.midi === midi) {
      stopInstrumentVoice(voiceId);
    }
  });
}

export function stopAllInstrumentNotes(): void {
  Array.from(activeVoices.keys()).forEach((voiceId) => {
    stopInstrumentVoice(voiceId);
  });
}

export function closeInstrumentAudio(): void {
  stopAllInstrumentNotes();

  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
}
