import type { OpticalBinaryImage, OpticalDetectedNote, OpticalStaff } from './optical-score-types';

interface NoteCandidate {
  x: number;
  y: number;
  confidence: number;
  hasStem: boolean;
  filledRatio: number;
}

const TREBLE_BOTTOM_LINE_MIDI = 64;

export function detectNotesForStaff(
  image: OpticalBinaryImage,
  staff: OpticalStaff,
): OpticalDetectedNote[] {
  const candidates = scanNoteCandidates(image, staff);

  const filtered = suppressNearbyCandidates(candidates, staff.spacing);

  return filtered
    .sort((left, right) => left.x - right.x)
    .map((candidate, index) => createDetectedNote(candidate, staff, index));
}

function scanNoteCandidates(image: OpticalBinaryImage, staff: OpticalStaff): NoteCandidate[] {
  const candidates: NoteCandidate[] = [];

  const spacing = staff.spacing;

  const startX = Math.max(staff.left, Math.round(staff.left + spacing * 5.5));

  const endX = Math.min(image.width - 1, staff.right);

  const topY = Math.max(0, Math.round(staff.top - spacing * 3));

  const bottomY = Math.min(image.height - 1, Math.round(staff.bottom + spacing * 3));

  const halfWidth = Math.max(3, Math.round(spacing * 0.72));

  const halfHeight = Math.max(2, Math.round(spacing * 0.46));

  const stepX = Math.max(2, Math.round(spacing * 0.18));

  const halfStep = spacing / 2;

  const pitchPositions: number[] = [];

  for (let y = staff.bottom + spacing * 3; y >= staff.top - spacing * 3; y -= halfStep) {
    if (y >= topY && y <= bottomY) {
      pitchPositions.push(y);
    }
  }

  for (let x = startX; x <= endX; x += stepX) {
    pitchPositions.forEach((y) => {
      const density = ellipseInkDensity(image, x, y, halfWidth, halfHeight);

      if (density < 0.25) {
        return;
      }

      const stem = detectStem(image, x, y, spacing);

      const centerDensity = rectangleInkDensity(
        image,
        Math.round(x - halfWidth * 0.45),
        Math.round(y - halfHeight * 0.45),
        Math.round(x + halfWidth * 0.45),
        Math.round(y + halfHeight * 0.45),
      );

      const horizontalMass = horizontalInkMass(image, x, y, halfWidth, halfHeight);

      if (horizontalMass < 0.3) {
        return;
      }

      const confidence = Math.min(1, density * 0.55 + horizontalMass * 0.3 + (stem ? 0.15 : 0));

      if (!stem && density < 0.37) {
        return;
      }

      candidates.push({
        x,
        y,
        confidence,
        hasStem: stem,
        filledRatio: centerDensity,
      });
    });
  }

  return candidates;
}

function ellipseInkDensity(
  image: OpticalBinaryImage,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
): number {
  let black = 0;
  let samples = 0;

  const minX = Math.max(0, Math.round(centerX - radiusX));

  const maxX = Math.min(image.width - 1, Math.round(centerX + radiusX));

  const minY = Math.max(0, Math.round(centerY - radiusY));

  const maxY = Math.min(image.height - 1, Math.round(centerY + radiusY));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const normalizedX = (x - centerX) / radiusX;

      const normalizedY = (y - centerY) / radiusY;

      if (normalizedX * normalizedX + normalizedY * normalizedY > 1) {
        continue;
      }

      black += image.pixels[y * image.width + x] ?? 0;

      samples += 1;
    }
  }

  return samples > 0 ? black / samples : 0;
}

function horizontalInkMass(
  image: OpticalBinaryImage,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
): number {
  let bestDensity = 0;

  const minY = Math.max(0, Math.round(centerY - radiusY));

  const maxY = Math.min(image.height - 1, Math.round(centerY + radiusY));

  for (let y = minY; y <= maxY; y += 1) {
    let black = 0;
    let samples = 0;

    for (
      let x = Math.max(0, Math.round(centerX - radiusX));
      x <= Math.min(image.width - 1, Math.round(centerX + radiusX));
      x += 1
    ) {
      black += image.pixels[y * image.width + x] ?? 0;

      samples += 1;
    }

    const density = samples > 0 ? black / samples : 0;

    bestDensity = Math.max(bestDensity, density);
  }

  return bestDensity;
}

function detectStem(
  image: OpticalBinaryImage,
  centerX: number,
  centerY: number,
  spacing: number,
): boolean {
  const possibleXValues = [
    Math.round(centerX - spacing * 0.62),
    Math.round(centerX - spacing * 0.48),
    Math.round(centerX + spacing * 0.48),
    Math.round(centerX + spacing * 0.62),
  ];

  const verticalRadius = Math.round(spacing * 2.2);

  return possibleXValues.some((x) => {
    if (x < 0 || x >= image.width) {
      return false;
    }

    let longestRun = 0;

    let currentRun = 0;

    for (
      let y = Math.max(0, centerY - verticalRadius);
      y <= Math.min(image.height - 1, centerY + verticalRadius);
      y += 1
    ) {
      const isBlack = (image.pixels[y * image.width + x] ?? 0) === 1;

      if (isBlack) {
        currentRun += 1;

        longestRun = Math.max(longestRun, currentRun);
      } else {
        currentRun = 0;
      }
    }

    return longestRun >= spacing * 1.45;
  });
}

function rectangleInkDensity(
  image: OpticalBinaryImage,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): number {
  const left = Math.max(0, minX);
  const top = Math.max(0, minY);

  const right = Math.min(image.width - 1, maxX);

  const bottom = Math.min(image.height - 1, maxY);

  let black = 0;
  let samples = 0;

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      black += image.pixels[y * image.width + x] ?? 0;

      samples += 1;
    }
  }

  return samples > 0 ? black / samples : 0;
}

function suppressNearbyCandidates(candidates: NoteCandidate[], spacing: number): NoteCandidate[] {
  const sorted = [...candidates].sort((left, right) => right.confidence - left.confidence);

  const accepted: NoteCandidate[] = [];

  sorted.forEach((candidate) => {
    const tooClose = accepted.some((existing) => {
      const distanceX = Math.abs(candidate.x - existing.x);

      const distanceY = Math.abs(candidate.y - existing.y);

      return distanceX < spacing * 1.15 && distanceY < spacing * 0.85;
    });

    if (!tooClose) {
      accepted.push(candidate);
    }
  });

  return accepted;
}

function createDetectedNote(
  candidate: NoteCandidate,
  staff: OpticalStaff,
  index: number,
): OpticalDetectedNote {
  const halfStep = staff.spacing / 2;

  const stepsFromBottomLine = Math.round((staff.bottom - candidate.y) / halfStep);

  const diatonicIndex = midiToDiatonicIndex(TREBLE_BOTTOM_LINE_MIDI) + stepsFromBottomLine;

  const midi = diatonicIndexToMidi(diatonicIndex);

  const noteIndex = ((midi % 12) + 12) % 12;

  const octave = Math.floor(midi / 12) - 1;

  return {
    id: `${staff.id}-note-${index + 1}`,
    pageNumber: staff.pageNumber,
    staffId: staff.id,
    x: candidate.x,
    y: candidate.y,
    noteIndex,
    octave,
    midi,
    durationBeats: estimateDuration(candidate),
    confidence: candidate.confidence,
  };
}

function estimateDuration(candidate: NoteCandidate): number {
  if (!candidate.hasStem) {
    return 4;
  }

  if (candidate.filledRatio < 0.28) {
    return 2;
  }

  return 1;
}

function midiToDiatonicIndex(midi: number): number {
  const noteIndex = ((midi % 12) + 12) % 12;

  const octave = Math.floor(midi / 12) - 1;

  const scalePositionBySemitone: Record<number, number> = {
    0: 0,
    2: 1,
    4: 2,
    5: 3,
    7: 4,
    9: 5,
    11: 6,
  };

  return octave * 7 + (scalePositionBySemitone[noteIndex] ?? 0);
}

function diatonicIndexToMidi(diatonicIndex: number): number {
  const scale = [0, 2, 4, 5, 7, 9, 11];

  const octave = Math.floor(diatonicIndex / 7);

  const degree = ((diatonicIndex % 7) + 7) % 7;

  return (octave + 1) * 12 + (scale[degree] ?? 0);
}
