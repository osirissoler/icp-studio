export interface RefinedPitchNote {
  id: string;
  noteIndex: number;
  octave: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  confidence: number;
  cents: number;
}

interface PitchFrame {
  timeMs: number;
  midi: number;
  midiFloat: number;
  confidence: number;
  cents: number;
}

interface PitchEstimate {
  frequency: number;
  confidence: number;
}

const analysisSampleRate = 12000;
const windowSize = 1024;
const hopSize = 480;

const minimumFrequency = 65;
const maximumFrequency = 1050;

const rmsThreshold = 0.012;
const confidenceThreshold = 0.58;

export function refineRecordedMelody(audioBuffer: AudioBuffer): RefinedPitchNote[] {
  const mono = createMonoSignal(audioBuffer);

  const downsampled = downsampleSignal(mono, audioBuffer.sampleRate, analysisSampleRate);

  const frames = analyzeFrames(downsampled, analysisSampleRate);

  if (!frames.length) {
    return [];
  }

  const smoothed = smoothFrames(frames);

  return buildNotesFromFrames(smoothed);
}

function createMonoSignal(audioBuffer: AudioBuffer): Float32Array {
  const length = audioBuffer.length;

  const output = new Float32Array(length);

  const channels = audioBuffer.numberOfChannels;

  for (let channel = 0; channel < channels; channel += 1) {
    const data = audioBuffer.getChannelData(channel);

    for (let index = 0; index < length; index += 1) {
      output[index] = (output[index] ?? 0) + (data[index] ?? 0) / channels;
    }
  }

  return output;
}

function downsampleSignal(
  input: Float32Array,
  sourceRate: number,
  targetRate: number,
): Float32Array {
  if (sourceRate <= targetRate) {
    return input.slice();
  }

  const ratio = sourceRate / targetRate;

  const outputLength = Math.floor(input.length / ratio);

  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceStart = Math.floor(index * ratio);

    const sourceEnd = Math.min(input.length, Math.floor((index + 1) * ratio));

    let sum = 0;

    let count = 0;

    for (let sourceIndex = sourceStart; sourceIndex < sourceEnd; sourceIndex += 1) {
      sum += input[sourceIndex] ?? 0;

      count += 1;
    }

    output[index] = count ? sum / count : 0;
  }

  return output;
}

function analyzeFrames(signal: Float32Array, sampleRate: number): PitchFrame[] {
  const frames: PitchFrame[] = [];

  for (let start = 0; start + windowSize <= signal.length; start += hopSize) {
    const frame = signal.subarray(start, start + windowSize);

    const rms = calculateRms(frame);

    if (rms < rmsThreshold) {
      continue;
    }

    const estimate = detectPitchWithConfidence(frame, sampleRate);

    if (!estimate || estimate.confidence < confidenceThreshold) {
      continue;
    }

    const midiFloat = frequencyToMidiFloat(estimate.frequency);

    const midi = Math.round(midiFloat);

    const cents = (midiFloat - midi) * 100;

    frames.push({
      timeMs: (start / sampleRate) * 1000,

      midi,

      midiFloat,

      confidence: estimate.confidence,

      cents,
    });
  }

  return frames;
}

function detectPitchWithConfidence(frame: Float32Array, sampleRate: number): PitchEstimate | null {
  const minimumLag = Math.max(2, Math.floor(sampleRate / maximumFrequency));

  const maximumLag = Math.min(frame.length - 2, Math.ceil(sampleRate / minimumFrequency));

  let bestLag = -1;

  let bestCorrelation = -1;

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let numerator = 0;

    let leftEnergy = 0;

    let rightEnergy = 0;

    const usableLength = frame.length - lag;

    for (let index = 0; index < usableLength; index += 1) {
      const left = frame[index] ?? 0;

      const right = frame[index + lag] ?? 0;

      numerator += left * right;

      leftEnergy += left * left;

      rightEnergy += right * right;
    }

    const denominator = Math.sqrt(leftEnergy * rightEnergy);

    if (denominator <= 0) {
      continue;
    }

    const correlation = numerator / denominator;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;

      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorrelation < confidenceThreshold) {
    return null;
  }

  const refinedLag = refineLag(frame, bestLag);

  const frequency = sampleRate / refinedLag;

  if (!Number.isFinite(frequency) || frequency < minimumFrequency || frequency > maximumFrequency) {
    return null;
  }

  return {
    frequency,

    confidence: Math.max(0, Math.min(1, bestCorrelation)),
  };
}

function refineLag(frame: Float32Array, lag: number): number {
  if (lag <= 1 || lag >= frame.length - 2) {
    return lag;
  }

  const previous = correlationAtLag(frame, lag - 1);

  const current = correlationAtLag(frame, lag);

  const next = correlationAtLag(frame, lag + 1);

  const denominator = previous - 2 * current + next;

  if (Math.abs(denominator) < 0.000001) {
    return lag;
  }

  const offset = (0.5 * (previous - next)) / denominator;

  return lag + Math.max(-0.5, Math.min(0.5, offset));
}

function correlationAtLag(frame: Float32Array, lag: number): number {
  let numerator = 0;

  let leftEnergy = 0;

  let rightEnergy = 0;

  const usableLength = frame.length - lag;

  for (let index = 0; index < usableLength; index += 1) {
    const left = frame[index] ?? 0;

    const right = frame[index + lag] ?? 0;

    numerator += left * right;

    leftEnergy += left * left;

    rightEnergy += right * right;
  }

  const denominator = Math.sqrt(leftEnergy * rightEnergy);

  return denominator ? numerator / denominator : 0;
}

function smoothFrames(frames: PitchFrame[]): PitchFrame[] {
  if (frames.length < 3) {
    return frames;
  }

  return frames.map((frame, index) => {
    const neighborhood = frames.slice(Math.max(0, index - 2), Math.min(frames.length, index + 3));

    const nearby = neighborhood.filter((item) => Math.abs(item.timeMs - frame.timeMs) <= 120);

    if (!nearby.length) {
      return frame;
    }

    const midiValues = nearby.map((item) => item.midi).sort((a, b) => a - b);

    const medianMidi = midiValues[Math.floor(midiValues.length / 2)] ?? frame.midi;

    const compatible = nearby.filter((item) => Math.abs(item.midi - medianMidi) <= 1);

    const totalWeight = compatible.reduce((sum, item) => sum + item.confidence, 0);

    if (totalWeight <= 0) {
      return {
        ...frame,

        midi: medianMidi,
      };
    }

    const weightedMidiFloat =
      compatible.reduce((sum, item) => sum + item.midiFloat * item.confidence, 0) / totalWeight;

    const roundedMidi = Math.round(weightedMidiFloat);

    return {
      ...frame,

      midi: roundedMidi,

      midiFloat: weightedMidiFloat,

      cents: (weightedMidiFloat - roundedMidi) * 100,

      confidence: compatible.reduce((sum, item) => sum + item.confidence, 0) / compatible.length,
    };
  });
}

function buildNotesFromFrames(frames: PitchFrame[]): RefinedPitchNote[] {
  if (!frames.length) {
    return [];
  }

  const frameDurationMs = (hopSize / analysisSampleRate) * 1000;

  const notes: RefinedPitchNote[] = [];

  let currentFrames: PitchFrame[] = [];

  let currentMidi: number | null = null;

  function finishCurrent(): void {
    if (currentMidi === null || !currentFrames.length) {
      currentFrames = [];

      currentMidi = null;

      return;
    }

    const first = currentFrames[0]!;

    const last = currentFrames[currentFrames.length - 1]!;

    const startedAt = Math.max(0, first.timeMs);

    const endedAt = last.timeMs + frameDurationMs;

    const durationMs = endedAt - startedAt;

    if (durationMs >= 120) {
      const confidence =
        currentFrames.reduce((sum, frame) => sum + frame.confidence, 0) / currentFrames.length;

      const cents =
        currentFrames.reduce((sum, frame) => sum + frame.cents, 0) / currentFrames.length;

      const noteIndex = normalizeNote(currentMidi);

      const octave = Math.floor(currentMidi / 12) - 1;

      const previous = notes[notes.length - 1];

      if (
        previous &&
        previous.noteIndex === noteIndex &&
        previous.octave === octave &&
        startedAt - previous.endedAt < 150
      ) {
        const oldDuration = previous.durationMs;

        const newDuration = endedAt - previous.startedAt;

        previous.confidence =
          (previous.confidence * oldDuration + confidence * durationMs) /
          (oldDuration + durationMs);

        previous.cents =
          (previous.cents * oldDuration + cents * durationMs) / (oldDuration + durationMs);

        previous.endedAt = endedAt;

        previous.durationMs = newDuration;
      } else {
        notes.push({
          id: makeId(),

          noteIndex,

          octave,

          startedAt,

          endedAt,

          durationMs,

          confidence,

          cents,
        });
      }
    }

    currentFrames = [];

    currentMidi = null;
  }

  frames.forEach((frame) => {
    if (currentMidi === null) {
      currentMidi = frame.midi;

      currentFrames = [frame];

      return;
    }

    const previousFrame = currentFrames[currentFrames.length - 1];

    const gap = previousFrame ? frame.timeMs - previousFrame.timeMs : 0;

    const samePitch = frame.midi === currentMidi;

    const octaveError = Math.abs(frame.midi - currentMidi) === 12 && frame.confidence < 0.72;

    if (gap <= 130 && (samePitch || octaveError)) {
      currentFrames.push(
        octaveError
          ? {
              ...frame,

              midi: currentMidi,

              midiFloat: currentMidi + frame.cents / 100,
            }
          : frame,
      );

      return;
    }

    finishCurrent();

    currentMidi = frame.midi;

    currentFrames = [frame];
  });

  finishCurrent();

  return removeShortPitchGlitches(notes);
}

function removeShortPitchGlitches(notes: RefinedPitchNote[]): RefinedPitchNote[] {
  if (notes.length < 3) {
    return notes;
  }

  const result = notes.map((note) => ({
    ...note,
  }));

  for (let index = 1; index < result.length - 1; index += 1) {
    const previous = result[index - 1];

    const current = result[index];

    const next = result[index + 1];

    if (!previous || !current || !next) {
      continue;
    }

    const sameSurroundingPitch =
      previous.noteIndex === next.noteIndex && previous.octave === next.octave;

    if (sameSurroundingPitch && current.durationMs < 190 && current.confidence < 0.72) {
      previous.endedAt = next.endedAt;

      previous.durationMs = previous.endedAt - previous.startedAt;

      previous.confidence = Math.max(previous.confidence, next.confidence);

      result.splice(index, 2);

      index -= 1;
    }
  }

  return result;
}

function calculateRms(frame: Float32Array): number {
  let sum = 0;

  for (let index = 0; index < frame.length; index += 1) {
    const value = frame[index] ?? 0;

    sum += value * value;
  }

  return Math.sqrt(sum / frame.length);
}

function frequencyToMidiFloat(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

function normalizeNote(value: number): number {
  return ((value % 12) + 12) % 12;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
