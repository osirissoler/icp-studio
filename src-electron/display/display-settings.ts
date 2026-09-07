import { BrowserWindow, app, screen, type Display } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  ApplyDisplayConfigurationRequest,
  DisplayConfiguration,
  DisplayInfo,
  DisplayReference,
  DisplayStatus,
} from '../../src/shared/display';

const SETTINGS_FILENAME = 'display-settings.json';

let configuration: DisplayConfiguration = {
  mode: 'automatic',
  projectionDisplays: [],
  audioDisplay: null,
};

let loaded = false;

function settingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILENAME);
}

function displayReference(display: Display): DisplayReference {
  return {
    id: display.id,
    label: display.label || 'Pantalla',
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    },
    scaleFactor: display.scaleFactor,
  };
}

export function getConnectedDisplays(): DisplayInfo[] {
  const primaryDisplayId = screen.getPrimaryDisplay().id;

  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    label: display.label || `Pantalla ${index + 1}`,
    isPrimary: display.id === primaryDisplayId,
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    },
    scaleFactor: display.scaleFactor,
  }));
}

function validConfiguration(value: unknown): value is DisplayConfiguration {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DisplayConfiguration>;
  return (
    (candidate.mode === 'automatic' || candidate.mode === 'custom') &&
    Array.isArray(candidate.projectionDisplays) &&
    (candidate.audioDisplay === null || typeof candidate.audioDisplay === 'object')
  );
}

export async function loadDisplayConfiguration(): Promise<void> {
  if (loaded) {
    return;
  }

  loaded = true;

  try {
    const raw = await readFile(settingsPath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (validConfiguration(parsed)) {
      configuration = parsed;
    }
  } catch {
    // La primera ejecución usa la configuración automática predeterminada.
  }
}

async function persistConfiguration(): Promise<void> {
  await writeFile(settingsPath(), JSON.stringify(configuration, null, 2), 'utf-8');
}

function matchScore(reference: DisplayReference, display: Display): number {
  let score = 0;

  if (reference.id !== null && reference.id === display.id) score += 100;
  if (reference.label && reference.label === display.label) score += 35;
  if (reference.bounds.width === display.bounds.width) score += 18;
  if (reference.bounds.height === display.bounds.height) score += 18;
  if (reference.scaleFactor === display.scaleFactor) score += 12;
  if (reference.bounds.x === display.bounds.x) score += 8;
  if (reference.bounds.y === display.bounds.y) score += 8;

  return score;
}

function matchReference(
  reference: DisplayReference | null,
  candidates: Display[],
  usedIds = new Set<number>(),
): Display | null {
  if (!reference) {
    return null;
  }

  const ranked = candidates
    .filter((display) => !usedIds.has(display.id))
    .map((display) => ({ display, score: matchScore(reference, display) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0] && ranked[0].score >= 30 ? ranked[0].display : null;
}

export interface ResolvedProjectionTargets {
  displays: Display[];
  audioDisplayId: number | null;
  usesOperatorDisplay: boolean;
}

export function resolveProjectionTargets(): ResolvedProjectionTargets {
  const primary = screen.getPrimaryDisplay();
  const external = screen.getAllDisplays().filter((display) => display.id !== primary.id);

  let selected: Display[];

  if (configuration.mode === 'automatic') {
    selected = external;
  } else {
    const usedIds = new Set<number>();
    selected = [];

    for (const reference of configuration.projectionDisplays) {
      const matched = matchReference(reference, external, usedIds);
      if (matched) {
        usedIds.add(matched.id);
        selected.push(matched);
      }
    }
  }

  const usesOperatorDisplay = selected.length === 0 && external.length === 0;
  if (usesOperatorDisplay) {
    selected = [primary];
  }

  let audioDisplayId: number | null = null;
  if (!usesOperatorDisplay && selected.length > 0) {
    const matchedAudio = matchReference(configuration.audioDisplay, selected);
    audioDisplayId = matchedAudio?.id ?? selected[0]?.id ?? null;
  } else if (usesOperatorDisplay) {
    audioDisplayId = primary.id;
  }

  return { displays: selected, audioDisplayId, usesOperatorDisplay };
}

export function getDisplayStatus(): DisplayStatus {
  const resolved = resolveProjectionTargets();
  return {
    displays: getConnectedDisplays(),
    configuration,
    activeProjectionDisplayIds: resolved.displays.map((display) => display.id),
    audioDisplayId: resolved.audioDisplayId,
    usesOperatorDisplay: resolved.usesOperatorDisplay,
  };
}

export async function applyDisplayConfiguration(
  request: ApplyDisplayConfigurationRequest,
): Promise<DisplayStatus> {
  const primaryId = screen.getPrimaryDisplay().id;
  const external = screen.getAllDisplays().filter((display) => display.id !== primaryId);
  const selectedIds = new Set(
    Array.isArray(request.projectionDisplayIds)
      ? request.projectionDisplayIds.filter((id) => Number.isInteger(id))
      : [],
  );

  const selected = external.filter((display) => selectedIds.has(display.id));
  const audio =
    external.find(
      (display) => display.id === request.audioDisplayId && selected.some((item) => item.id === display.id),
    ) ?? selected[0] ?? null;

  configuration = {
    mode: request.mode === 'custom' ? 'custom' : 'automatic',
    projectionDisplays: selected.map(displayReference),
    audioDisplay: audio ? displayReference(audio) : null,
  };

  await persistConfiguration();
  return getDisplayStatus();
}

export async function identifyDisplays(): Promise<void> {
  const displays = screen.getAllDisplays();

  await Promise.all(
    displays.map(async (display, index) => {
      const identifyWindow = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        frame: false,
        transparent: false,
        resizable: false,
        movable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        backgroundColor: '#07111d',
        webPreferences: {
          contextIsolation: true,
          sandbox: true,
        },
      });

      const label = String(index + 1);
      const title = (display.label || `Pantalla ${index + 1}`).replace(/[<>&"']/g, '');
      const html = `<!doctype html><html><body style="margin:0;width:100vw;height:100vh;display:grid;place-items:center;background:#07111d;color:#fff;font-family:system-ui,sans-serif"><main style="text-align:center"><div style="font-size:min(42vw,420px);font-weight:900;line-height:.9">${label}</div><div style="margin-top:24px;font-size:32px">${title}</div></main></body></html>`;

      await identifyWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      identifyWindow.showInactive();

      setTimeout(() => {
        if (!identifyWindow.isDestroyed()) {
          identifyWindow.close();
        }
      }, 2500);
    }),
  );
}
