import type { OpticalBinaryImage, OpticalStaff } from './optical-score-types';

interface RowCandidate {
  y: number;
  density: number;
}

interface StaffGroup {
  lines: [number, number, number, number, number];
  spacing: number;
}

export function detectStaves(image: OpticalBinaryImage, pageNumber: number): OpticalStaff[] {
  const rowCandidates = findHorizontalLineRows(image);

  const clusteredRows = clusterAdjacentRows(rowCandidates);

  const groups = findStaffGroups(clusteredRows);

  return groups.map((group, index) => {
    const bounds = detectStaffHorizontalBounds(image, group.lines, group.spacing);

    return {
      id: `staff-${pageNumber}-${index + 1}`,
      pageNumber,
      lines: group.lines,
      spacing: group.spacing,
      top: group.lines[0],
      bottom: group.lines[4],
      left: bounds.left,
      right: bounds.right,
    };
  });
}

function findHorizontalLineRows(image: OpticalBinaryImage): RowCandidate[] {
  const result: RowCandidate[] = [];

  const minimumDensity = 0.22;

  for (let y = 0; y < image.height; y += 1) {
    let blackPixels = 0;

    const rowOffset = y * image.width;

    for (let x = 0; x < image.width; x += 1) {
      blackPixels += image.pixels[rowOffset + x] ?? 0;
    }

    const density = blackPixels / image.width;

    if (density >= minimumDensity) {
      result.push({
        y,
        density,
      });
    }
  }

  return result;
}

function clusterAdjacentRows(rows: RowCandidate[]): number[] {
  if (!rows.length) {
    return [];
  }

  const clusters: RowCandidate[][] = [];

  let currentCluster: RowCandidate[] = [rows[0]!];

  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const current = rows[index]!;

    if (current.y - previous.y <= 2) {
      currentCluster.push(current);
    } else {
      clusters.push(currentCluster);

      currentCluster = [current];
    }
  }

  clusters.push(currentCluster);

  return clusters.map((cluster) => {
    const weightedTotal = cluster.reduce((total, row) => total + row.y * row.density, 0);

    const densityTotal = cluster.reduce((total, row) => total + row.density, 0);

    return Math.round(weightedTotal / Math.max(0.0001, densityTotal));
  });
}

function findStaffGroups(rows: number[]): StaffGroup[] {
  const result: StaffGroup[] = [];

  if (rows.length < 5) {
    return result;
  }

  for (let startIndex = 0; startIndex <= rows.length - 5; startIndex += 1) {
    const candidate = rows.slice(startIndex, startIndex + 5);

    if (candidate.length !== 5) {
      continue;
    }

    const distances = [
      candidate[1]! - candidate[0]!,
      candidate[2]! - candidate[1]!,
      candidate[3]! - candidate[2]!,
      candidate[4]! - candidate[3]!,
    ];

    const averageSpacing =
      distances.reduce((total, distance) => total + distance, 0) / distances.length;

    if (averageSpacing < 5 || averageSpacing > 60) {
      continue;
    }

    const maximumDeviation = Math.max(
      ...distances.map((distance) => Math.abs(distance - averageSpacing)),
    );

    if (maximumDeviation > averageSpacing * 0.28) {
      continue;
    }

    const group: StaffGroup = {
      lines: [candidate[0]!, candidate[1]!, candidate[2]!, candidate[3]!, candidate[4]!],
      spacing: averageSpacing,
    };

    const alreadyExists = result.some(
      (existing) => Math.abs(existing.lines[0] - group.lines[0]) < averageSpacing * 2,
    );

    if (!alreadyExists) {
      result.push(group);
    }
  }

  return result;
}

function detectStaffHorizontalBounds(
  image: OpticalBinaryImage,
  lines: [number, number, number, number, number],
  spacing: number,
): {
  left: number;
  right: number;
} {
  const columnScores = new Float32Array(image.width);

  const lineRadius = Math.max(1, Math.round(spacing * 0.12));

  for (let x = 0; x < image.width; x += 1) {
    let black = 0;
    let samples = 0;

    lines.forEach((lineY) => {
      for (let offset = -lineRadius; offset <= lineRadius; offset += 1) {
        const y = lineY + offset;

        if (y < 0 || y >= image.height) {
          continue;
        }

        black += image.pixels[y * image.width + x] ?? 0;

        samples += 1;
      }
    });

    columnScores[x] = samples > 0 ? black / samples : 0;
  }

  const activeColumns: number[] = [];

  for (let x = 0; x < columnScores.length; x += 1) {
    if ((columnScores[x] ?? 0) >= 0.32) {
      activeColumns.push(x);
    }
  }

  if (!activeColumns.length) {
    return {
      left: 0,
      right: image.width - 1,
    };
  }

  return {
    left: Math.max(0, activeColumns[0]! - Math.round(spacing)),
    right: Math.min(
      image.width - 1,
      activeColumns[activeColumns.length - 1]! + Math.round(spacing),
    ),
  };
}
