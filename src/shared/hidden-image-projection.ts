export interface HiddenImageProjectionPayload {
  activityId: string;
  roundId: string;
  title: string;
  roundIndex: number;
  roundCount: number;
  rows: number;
  columns: number;
  imageDataUrl: string;
  revealedTileIds: number[];
}

const HIDDEN_IMAGE_HOST = 'library';
const HIDDEN_IMAGE_PATH = '/__hidden-image__';

function clampGridSize(value: number): number {
  return Math.min(8, Math.max(2, Math.round(value)));
}

function clampRoundIndex(value: number, roundCount: number): number {
  return Math.min(Math.max(0, roundCount - 1), Math.max(0, Math.round(value)));
}

export function createHiddenImageProjectionUrl(payload: HiddenImageProjectionPayload): string {
  const rows = clampGridSize(payload.rows);
  const columns = clampGridSize(payload.columns);
  const roundCount = Math.max(1, Math.round(payload.roundCount));
  const roundIndex = clampRoundIndex(payload.roundIndex, roundCount);
  const totalTiles = rows * columns;

  const revealedTileIds = Array.from(
    new Set(
      payload.revealedTileIds
        .filter((tileId) => Number.isInteger(tileId) && tileId >= 1 && tileId <= totalTiles)
        .sort((a, b) => a - b),
    ),
  );

  const url = new URL(`icp-media://${HIDDEN_IMAGE_HOST}${HIDDEN_IMAGE_PATH}`);

  url.searchParams.set('v', '1');
  url.searchParams.set('activity', payload.activityId.slice(0, 200));
  url.searchParams.set('round', payload.roundId.slice(0, 200));
  url.searchParams.set('title', payload.title.slice(0, 300));
  url.searchParams.set('index', String(roundIndex));
  url.searchParams.set('count', String(roundCount));
  url.searchParams.set('rows', String(rows));
  url.searchParams.set('columns', String(columns));
  url.searchParams.set('revealed', revealedTileIds.join(','));
  url.searchParams.set('image', payload.imageDataUrl);

  return url.toString();
}

export function parseHiddenImageProjectionUrl(value: string): HiddenImageProjectionPayload | null {
  if (!value.startsWith('icp-media://library/__hidden-image__')) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== 'icp-media:' ||
      url.hostname !== HIDDEN_IMAGE_HOST ||
      url.pathname !== HIDDEN_IMAGE_PATH
    ) {
      return null;
    }

    const activityId = url.searchParams.get('activity') ?? '';
    const roundId = url.searchParams.get('round') ?? '';
    const title = url.searchParams.get('title') ?? '';
    const imageDataUrl = url.searchParams.get('image') ?? '';

    const rows = clampGridSize(Number(url.searchParams.get('rows') ?? 4));

    const columns = clampGridSize(Number(url.searchParams.get('columns') ?? 4));

    const roundCount = Math.max(1, Math.round(Number(url.searchParams.get('count') ?? 1)));

    const roundIndex = clampRoundIndex(Number(url.searchParams.get('index') ?? 0), roundCount);

    if (!activityId || !roundId || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(imageDataUrl)) {
      return null;
    }

    const totalTiles = rows * columns;

    const revealedTileIds = Array.from(
      new Set(
        (url.searchParams.get('revealed') ?? '')
          .split(',')
          .map((value) => Number(value))
          .filter((tileId) => Number.isInteger(tileId) && tileId >= 1 && tileId <= totalTiles),
      ),
    ).sort((a, b) => a - b);

    return {
      activityId,
      roundId,
      title,
      roundIndex,
      roundCount,
      rows,
      columns,
      imageDataUrl,
      revealedTileIds,
    };
  } catch {
    return null;
  }
}
