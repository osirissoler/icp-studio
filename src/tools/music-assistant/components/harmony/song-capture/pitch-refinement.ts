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

const analysisSampleRate = 16000;

const windowSize = 2048;
const hopSize = 256;

const minimumFrequency = 65;
const maximumFrequency = 1100;

const yinThreshold = 0.12;
const fallbackThreshold = 0.22;

const minimumFrameConfidence = 0.68;

const minimumNoteDurationMs = 115;
const maximumFrameGapMs = 80;
const sameNoteMergeGapMs = 145;

export function refineRecordedMelody(audioBuffer: AudioBuffer): RefinedPitchNote[] {
  const mono = createMonoSignal(audioBuffer);

  const normalized = normalizeSignal(mono);

  const downsampled = resampleSignal(normalized, audioBuffer.sampleRate, analysisSampleRate);

  const noiseFloor = estimateNoiseFloor(downsampled);

  const frames = analyzeFrames(downsampled, analysisSampleRate, noiseFloor);

  if (!frames.length) {
    return [];
  }

  const octaveCorrected = correctOctaveErrors(frames);

  const smoothed = smoothPitchTrack(octaveCorrected);

  const continuityCorrected = stabilizePitchContinuity(smoothed);

  const notes = buildNotesFromFrames(continuityCorrected);

  return cleanupNotes(notes);
}

function createMonoSignal(audioBuffer: AudioBuffer): Float32Array {
  const output = new Float32Array(audioBuffer.length);

  const channelCount = Math.max(1, audioBuffer.numberOfChannels);

  for (let channel = 0; channel < channelCount; channel += 1) {
    const source = audioBuffer.getChannelData(channel);

    for (let index = 0; index < source.length; index += 1) {
      output[index] = (output[index] ?? 0) + (source[index] ?? 0) / channelCount;
    }
  }

  return output;
}

function normalizeSignal(input: Float32Array): Float32Array {
  let peak = 0;

  for (let index = 0; index < input.length; index += 1) {
    peak = Math.max(peak, Math.abs(input[index] ?? 0));
  }

  if (peak <= 0.00001 || peak >= 0.92) {
    return input.slice();
  }

  const gain = Math.min(4, 0.92 / peak);

  const output = new Float32Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    output[index] = (input[index] ?? 0) * gain;
  }

  return output;
}

function resampleSignal(input: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (Math.abs(sourceRate - targetRate) < 1) {
    return input.slice();
  }

  const ratio = sourceRate / targetRate;

  const outputLength = Math.max(1, Math.floor(input.length / ratio));

  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = index * ratio;

    const leftIndex = Math.floor(sourcePosition);

    const rightIndex = Math.min(leftIndex + 1, input.length - 1);

    const fraction = sourcePosition - leftIndex;

    const left = input[leftIndex] ?? 0;

    const right = input[rightIndex] ?? left;

    output[index] = left + (right - left) * fraction;
  }

  return output;
}

function estimateNoiseFloor(signal: Float32Array): number {
  const blockSize = 512;

  const levels: number[] = [];

  for (let start = 0; start + blockSize <= signal.length; start += blockSize) {
    levels.push(calculateRms(signal.subarray(start, start + blockSize)));
  }

  if (!levels.length) {
    return 0.008;
  }

  levels.sort((left, right) => left - right);

  const sampleCount = Math.max(1, Math.floor(levels.length * 0.2));

  const quietest = levels.slice(0, sampleCount);

  const average = quietest.reduce((sum, value) => sum + value, 0) / quietest.length;

  return Math.max(0.003, Math.min(0.035, average));
}

function analyzeFrames(signal: Float32Array, sampleRate: number, noiseFloor: number): PitchFrame[] {
  const frames: PitchFrame[] = [];

  const minimumRms = Math.max(0.006, noiseFloor * 2.2);

  for (let start = 0; start + windowSize <= signal.length; start += hopSize) {
    const frame = signal.subarray(start, start + windowSize);

    const rms = calculateRms(frame);

    if (rms < minimumRms) {
      continue;
    }

    const estimate = detectPitchYin(frame, sampleRate);

    if (!estimate || estimate.confidence < minimumFrameConfidence) {
      continue;
    }

    const midiFloat = frequencyToMidiFloat(estimate.frequency);

    if (!Number.isFinite(midiFloat)) {
      continue;
    }

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

function detectPitchYin(frame: Float32Array, sampleRate: number): PitchEstimate | null {
  const minimumLag = Math.max(2, Math.floor(sampleRate / maximumFrequency));

  const maximumLag = Math.min(
    Math.floor(frame.length / 2),
    Math.ceil(sampleRate / minimumFrequency),
  );

  if (maximumLag <= minimumLag) {
    return null;
  }

  const difference = new Float32Array(maximumLag + 1);

  for (let tau = 1; tau <= maximumLag; tau += 1) {
    let sum = 0;

    const usableLength = frame.length - tau;

    for (let index = 0; index < usableLength; index += 1) {
      const delta = (frame[index] ?? 0) - (frame[index + tau] ?? 0);

      sum += delta * delta;
    }

    difference[tau] = sum;
  }

  const cmnd = new Float32Array(maximumLag + 1);

  cmnd[0] = 1;

  let runningSum = 0;

  for (let tau = 1; tau <= maximumLag; tau += 1) {
    runningSum += difference[tau] ?? 0;

    cmnd[tau] = runningSum > 0 ? ((difference[tau] ?? 0) * tau) / runningSum : 1;
  }

  let selectedLag = -1;

  for (let tau = minimumLag; tau <= maximumLag; tau += 1) {
    const value = cmnd[tau] ?? 1;

    if (value < yinThreshold) {
      selectedLag = tau;

      while (
        selectedLag + 1 <= maximumLag &&
        (cmnd[selectedLag + 1] ?? 1) < (cmnd[selectedLag] ?? 1)
      ) {
        selectedLag += 1;
      }

      break;
    }
  }

  if (selectedLag < 0) {
    let bestValue = Number.POSITIVE_INFINITY;

    for (let tau = minimumLag; tau <= maximumLag; tau += 1) {
      const value = cmnd[tau] ?? 1;

      if (value < bestValue) {
        bestValue = value;
        selectedLag = tau;
      }
    }

    if (selectedLag < 0 || bestValue > fallbackThreshold) {
      return null;
    }
  }

  const refinedLag = refineYinLag(cmnd, selectedLag);

  if (refinedLag <= 0) {
    return null;
  }

  const frequency = sampleRate / refinedLag;

  if (!Number.isFinite(frequency) || frequency < minimumFrequency || frequency > maximumFrequency) {
    return null;
  }

  const selectedValue = cmnd[selectedLag] ?? 1;

  const confidence = Math.max(0, Math.min(1, 1 - selectedValue));

  return {
    frequency,
    confidence,
  };
}

function refineYinLag(cmnd: Float32Array, lag: number): number {
  if (lag <= 1 || lag >= cmnd.length - 1) {
    return lag;
  }

  const left = cmnd[lag - 1] ?? 1;

  const center = cmnd[lag] ?? 1;

  const right = cmnd[lag + 1] ?? 1;

  const denominator = left - 2 * center + right;

  if (Math.abs(denominator) < 0.0000001) {
    return lag;
  }

  const offset = (0.5 * (left - right)) / denominator;

  return lag + Math.max(-0.5, Math.min(0.5, offset));
}

function correctOctaveErrors(frames: PitchFrame[]): PitchFrame[] {
  if (frames.length < 2) {
    return frames;
  }

  const output = frames.map((frame) => ({
    ...frame,
  }));

  for (let index = 1; index < output.length; index += 1) {
    const previous = output[index - 1];

    const current = output[index];

    if (!previous || !current) {
      continue;
    }

    const timeGap = current.timeMs - previous.timeMs;

    if (timeGap > maximumFrameGapMs * 2) {
      continue;
    }

    const difference = current.midi - previous.midi;

    if (Math.abs(Math.abs(difference) - 12) <= 1 && current.confidence < 0.92) {
      const correctedMidiFloat = current.midiFloat - Math.sign(difference) * 12;

      const correctedMidi = Math.round(correctedMidiFloat);

      current.midiFloat = correctedMidiFloat;

      current.midi = correctedMidi;

      current.cents = (correctedMidiFloat - correctedMidi) * 100;
    }
  }

  return output;
}

function smoothPitchTrack(frames: PitchFrame[]): PitchFrame[] {
  if (frames.length < 3) {
    return frames;
  }

  return frames.map((frame) => {
    const nearby = frames.filter((candidate) => Math.abs(candidate.timeMs - frame.timeMs) <= 55);

    if (nearby.length < 2) {
      return frame;
    }

    const values = nearby.map((item) => item.midiFloat).sort((left, right) => left - right);

    const median = values[Math.floor(values.length / 2)] ?? frame.midiFloat;

    const compatible = nearby.filter((item) => Math.abs(item.midiFloat - median) <= 0.85);

    if (!compatible.length) {
      return frame;
    }

    const weightTotal = compatible.reduce((sum, item) => sum + item.confidence, 0);

    if (weightTotal <= 0) {
      return frame;
    }

    const weightedMidi =
      compatible.reduce((sum, item) => sum + item.midiFloat * item.confidence, 0) / weightTotal;

    const rounded = Math.round(weightedMidi);

    return {
      ...frame,

      midi: rounded,

      midiFloat: weightedMidi,

      cents: (weightedMidi - rounded) * 100,

      confidence: compatible.reduce((sum, item) => sum + item.confidence, 0) / compatible.length,
    };
  });
}

function stabilizePitchContinuity(frames: PitchFrame[]): PitchFrame[] {
  if (frames.length < 3) {
    return frames;
  }

  const output = frames.map((frame) => ({
    ...frame,
  }));

  for (let index = 1; index < output.length - 1; index += 1) {
    const previous = output[index - 1];

    const current = output[index];

    const next = output[index + 1];

    if (!previous || !current || !next) {
      continue;
    }

    const nearbyInTime =
      current.timeMs - previous.timeMs <= maximumFrameGapMs &&
      next.timeMs - current.timeMs <= maximumFrameGapMs;

    if (!nearbyInTime) {
      continue;
    }

    const surroundingAgreement = Math.abs(previous.midi - next.midi) <= 1;

    const currentDisagreement = Math.abs(current.midi - previous.midi) >= 2;

    if (surroundingAgreement && currentDisagreement && current.confidence < 0.9) {
      const targetFloat = (previous.midiFloat + next.midiFloat) / 2;

      const targetMidi = Math.round(targetFloat);

      current.midi = targetMidi;

      current.midiFloat = targetFloat;

      current.cents = (targetFloat - targetMidi) * 100;
    }
  }

  return output;
}

function buildNotesFromFrames(frames: PitchFrame[]): RefinedPitchNote[] {
  if (!frames.length) {
    return [];
  }

  const frameStepMs = (hopSize / analysisSampleRate) * 1000;

  const notes: RefinedPitchNote[] = [];

  let group: PitchFrame[] = [];

  let groupMidi: number | null = null;

  function finishGroup(): void {
    if (groupMidi === null || !group.length) {
      group = [];
      groupMidi = null;

      return;
    }

    const first = group[0]!;

    const last = group[group.length - 1]!;

    const startedAt = Math.max(0, first.timeMs);

    const endedAt = last.timeMs + frameStepMs;

    const durationMs = endedAt - startedAt;

    if (durationMs < minimumNoteDurationMs) {
      group = [];
      groupMidi = null;

      return;
    }

    const confidence = group.reduce((sum, frame) => sum + frame.confidence, 0) / group.length;

    const totalWeight = group.reduce((sum, frame) => sum + frame.confidence, 0);

    const averageMidiFloat =
      totalWeight > 0
        ? group.reduce((sum, frame) => sum + frame.midiFloat * frame.confidence, 0) / totalWeight
        : groupMidi;

    const roundedMidi = Math.round(averageMidiFloat);

    const cents = (averageMidiFloat - roundedMidi) * 100;

    appendOrMergeNote(notes, {
      id: makeId(),

      noteIndex: normalizeNote(roundedMidi),

      octave: Math.floor(roundedMidi / 12) - 1,

      startedAt,
      endedAt,
      durationMs,
      confidence,
      cents,
    });

    group = [];
    groupMidi = null;
  }

  for (const frame of frames) {
    if (groupMidi === null) {
      groupMidi = frame.midi;

      group = [frame];

      continue;
    }

    const previous = group[group.length - 1];

    const gap = previous ? frame.timeMs - previous.timeMs : 0;

    const samePitch = frame.midi === groupMidi;

    const vibratoNeighbor =
      Math.abs(frame.midi - groupMidi) === 1 && Math.abs(frame.midiFloat - groupMidi) < 0.65;

    if (gap <= maximumFrameGapMs && (samePitch || vibratoNeighbor)) {
      group.push(frame);

      continue;
    }

    finishGroup();

    groupMidi = frame.midi;

    group = [frame];
  }

  finishGroup();

  return notes;
}

function appendOrMergeNote(notes: RefinedPitchNote[], note: RefinedPitchNote): void {
  const previous = notes[notes.length - 1];

  if (
    previous &&
    previous.noteIndex === note.noteIndex &&
    previous.octave === note.octave &&
    note.startedAt - previous.endedAt <= sameNoteMergeGapMs
  ) {
    const previousDuration = previous.durationMs;

    const totalDuration = previousDuration + note.durationMs;

    previous.confidence =
      (previous.confidence * previousDuration + note.confidence * note.durationMs) / totalDuration;

    previous.cents =
      (previous.cents * previousDuration + note.cents * note.durationMs) / totalDuration;

    previous.endedAt = note.endedAt;

    previous.durationMs = previous.endedAt - previous.startedAt;

    return;
  }

  notes.push(note);
}

function cleanupNotes(notes: RefinedPitchNote[]): RefinedPitchNote[] {
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

    const sameSurrounding =
      previous.noteIndex === next.noteIndex && previous.octave === next.octave;

    const suspiciousMiddle = current.durationMs < 180 && current.confidence < 0.84;

    if (sameSurrounding && suspiciousMiddle) {
      const combinedDuration = previous.durationMs + current.durationMs + next.durationMs;

      previous.confidence =
        (previous.confidence * previous.durationMs +
          current.confidence * current.durationMs +
          next.confidence * next.durationMs) /
        combinedDuration;

      previous.cents =
        (previous.cents * previous.durationMs + next.cents * next.durationMs) /
        (previous.durationMs + next.durationMs);

      previous.endedAt = next.endedAt;

      previous.durationMs = previous.endedAt - previous.startedAt;

      result.splice(index, 2);

      index -= 1;
    }
  }

  return result;
}

function calculateRms(frame: Float32Array): number {
  if (!frame.length) {
    return 0;
  }

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
