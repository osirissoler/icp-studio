export interface RecordedVoiceNote {
  startedAt: number;
  endedAt: number;
  sourceMidi: number;
  targetMidi: number;
}

export interface RecordedVoiceRenderOptions {
  grainMs?: number;
  overlap?: number;
  edgePaddingMs?: number;
}

const defaultGrainMs = 42;
const defaultOverlap = 0.72;
const defaultEdgePaddingMs = 28;

export function renderRecordedVoice(
  context: AudioContext,
  sourceBuffer: AudioBuffer,
  notes: RecordedVoiceNote[],
  options: RecordedVoiceRenderOptions = {},
): AudioBuffer {
  const grainMs = options.grainMs ?? defaultGrainMs;
  const overlap = clamp(options.overlap ?? defaultOverlap, 0.25, 0.9);
  const edgePaddingMs = options.edgePaddingMs ?? defaultEdgePaddingMs;

  const output = context.createBuffer(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate,
  );

  if (!notes.length) {
    return output;
  }

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
    const input = sourceBuffer.getChannelData(channel);
    const destination = output.getChannelData(channel);

    renderChannel(
      input,
      destination,
      sourceBuffer.sampleRate,
      notes,
      grainMs,
      overlap,
      edgePaddingMs,
    );
  }

  return output;
}

function renderChannel(
  input: Float32Array,
  destination: Float32Array,
  sampleRate: number,
  notes: RecordedVoiceNote[],
  grainMs: number,
  overlap: number,
  edgePaddingMs: number,
): void {
  const weights = new Float32Array(destination.length);

  notes.forEach((note) => {
    renderNoteSegment(
      input,
      destination,
      weights,
      sampleRate,
      note,
      grainMs,
      overlap,
      edgePaddingMs,
    );
  });

  for (let index = 0; index < destination.length; index += 1) {
    const weight = weights[index] ?? 0;

    if (weight > 0.0001) {
      destination[index] = (destination[index] ?? 0) / weight;
    }
  }
}

function renderNoteSegment(
  input: Float32Array,
  destination: Float32Array,
  weights: Float32Array,
  sampleRate: number,
  note: RecordedVoiceNote,
  grainMs: number,
  overlap: number,
  edgePaddingMs: number,
): void {
  const pitchDifference = note.targetMidi - note.sourceMidi;
  const pitchRatio = Math.pow(2, pitchDifference / 12);

  const paddingSamples = millisecondsToSamples(edgePaddingMs, sampleRate);

  const noteStart = millisecondsToSamples(note.startedAt, sampleRate);
  const noteEnd = millisecondsToSamples(note.endedAt, sampleRate);

  const segmentStart = clampInteger(noteStart - paddingSamples, 0, input.length - 1);
  const segmentEnd = clampInteger(noteEnd + paddingSamples, segmentStart + 1, input.length);

  const grainSize = Math.max(64, millisecondsToSamples(grainMs, sampleRate));

  const hopSize = Math.max(16, Math.round(grainSize * (1 - overlap)));

  const segmentLength = segmentEnd - segmentStart;

  if (segmentLength <= 0) {
    return;
  }

  if (Math.abs(pitchDifference) < 0.03) {
    copyOriginalSegment(
      input,
      destination,
      weights,
      segmentStart,
      segmentEnd,
      noteStart,
      noteEnd,
      paddingSamples,
    );

    return;
  }

  for (let grainOffset = 0; grainOffset < segmentLength; grainOffset += hopSize) {
    const outputGrainStart = segmentStart + grainOffset;

    for (let grainIndex = 0; grainIndex < grainSize; grainIndex += 1) {
      const outputIndex = outputGrainStart + grainIndex;

      if (
        outputIndex < segmentStart ||
        outputIndex >= segmentEnd ||
        outputIndex >= destination.length
      ) {
        continue;
      }

      const sourcePosition = segmentStart + grainOffset + grainIndex * pitchRatio;

      if (sourcePosition < segmentStart || sourcePosition >= segmentEnd - 1) {
        continue;
      }

      const sample = interpolateSample(input, sourcePosition);

      const grainWindow = hannWindow(grainIndex, grainSize);

      const edgeWindow = calculateSegmentEdgeWindow(
        outputIndex,
        noteStart,
        noteEnd,
        paddingSamples,
      );

      const weight = grainWindow * edgeWindow;

      destination[outputIndex] = (destination[outputIndex] ?? 0) + sample * weight;

      weights[outputIndex] = (weights[outputIndex] ?? 0) + weight;
    }
  }
}

function copyOriginalSegment(
  input: Float32Array,
  destination: Float32Array,
  weights: Float32Array,
  segmentStart: number,
  segmentEnd: number,
  noteStart: number,
  noteEnd: number,
  paddingSamples: number,
): void {
  for (let index = segmentStart; index < segmentEnd; index += 1) {
    const edgeWindow = calculateSegmentEdgeWindow(index, noteStart, noteEnd, paddingSamples);

    destination[index] = (destination[index] ?? 0) + (input[index] ?? 0) * edgeWindow;

    weights[index] = (weights[index] ?? 0) + edgeWindow;
  }
}

function calculateSegmentEdgeWindow(
  index: number,
  noteStart: number,
  noteEnd: number,
  paddingSamples: number,
): number {
  if (paddingSamples <= 0) {
    return 1;
  }

  if (index < noteStart) {
    return clamp((index - (noteStart - paddingSamples)) / paddingSamples, 0, 1);
  }

  if (index > noteEnd) {
    return clamp((noteEnd + paddingSamples - index) / paddingSamples, 0, 1);
  }

  return 1;
}

function hannWindow(index: number, length: number): number {
  if (length <= 1) {
    return 1;
  }

  return 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (length - 1));
}

function interpolateSample(input: Float32Array, position: number): number {
  const leftIndex = Math.floor(position);
  const rightIndex = Math.min(leftIndex + 1, input.length - 1);

  const fraction = position - leftIndex;

  const left = input[leftIndex] ?? 0;
  const right = input[rightIndex] ?? left;

  return left + (right - left) * fraction;
}

function millisecondsToSamples(milliseconds: number, sampleRate: number): number {
  return Math.round((milliseconds / 1000) * sampleRate);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.round(clamp(value, minimum, maximum));
}
