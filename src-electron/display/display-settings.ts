import { BrowserWindow, app, screen, type Display } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  ActiveProjectionOutput,
  ApplyDisplayConfigurationRequest,
  DisplayConfiguration,
  DisplayInfo,
  DisplayReference,
  DisplayStatus,
  ProjectionOutputConfiguration,
  ProjectionOutputAssignmentRequest,
} from '../../src/shared/display';
import { registerProjectionOutputRouter } from '../projection/projection-output-router';

const SETTINGS_FILENAME = 'display-settings.json';

let configuration: DisplayConfiguration = {
  mode: 'automatic',
  independentProjectionEnabled: false,
  projectionDisplays: [],
  projectionOutputs: [],
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

function defaultOutputName(index: number): string {
  if (index === 0) return 'Principal';
  if (index === 1) return 'Retorno';
  if (index === 2) return 'Lobby';
  return `Área ${index + 1}`;
}

function createOutputId(): string {
  return `projection-area-${randomUUID()}`;
}

function uniqueOutputId(preferred: string | undefined, usedIds: Set<string>): string {
  const normalized = preferred?.trim() ?? '';
  if (normalized && !usedIds.has(normalized)) {
    usedIds.add(normalized);
    return normalized;
  }

  let generated = createOutputId();
  while (usedIds.has(generated)) {
    generated = createOutputId();
  }
  usedIds.add(generated);
  return generated;
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

interface StoredDisplayConfiguration {
  mode: 'automatic' | 'custom';
  independentProjectionEnabled?: boolean;
  projectionDisplays: DisplayReference[];
  projectionOutputs?: Array<{
    outputId: string;
    name: string;
    enabled?: boolean;
    display: DisplayReference | null;
  }>;
  audioDisplay: DisplayReference | null;
}

function validConfiguration(value: unknown): value is StoredDisplayConfiguration {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredDisplayConfiguration>;
  return (
    (candidate.mode === 'automatic' || candidate.mode === 'custom') &&
    (candidate.independentProjectionEnabled === undefined ||
      typeof candidate.independentProjectionEnabled === 'boolean') &&
    Array.isArray(candidate.projectionDisplays) &&
    (candidate.projectionOutputs === undefined || Array.isArray(candidate.projectionOutputs)) &&
    (candidate.audioDisplay === null || typeof candidate.audioDisplay === 'object')
  );
}

function normalizeConfiguration(value: StoredDisplayConfiguration): DisplayConfiguration {
  const storedOutputs = Array.isArray(value.projectionOutputs) ? value.projectionOutputs : [];
  const usedOutputIds = new Set<string>();
  const projectionOutputs: ProjectionOutputConfiguration[] = storedOutputs
    .filter(
      (output) =>
        output &&
        typeof output.outputId === 'string' &&
        typeof output.name === 'string' &&
        (output.display === null || typeof output.display === 'object'),
    )
    .map((output, index) => ({
      outputId: uniqueOutputId(output.outputId, usedOutputIds),
      name: output.name.trim() || defaultOutputName(index),
      enabled: output.enabled !== false,
      display: output.display,
    }));

  if (projectionOutputs.length === 0 && value.projectionDisplays.length > 0) {
    value.projectionDisplays.forEach((display, index) => {
      projectionOutputs.push({
        outputId: uniqueOutputId(undefined, usedOutputIds),
        name: defaultOutputName(index),
        enabled: true,
        display,
      });
    });
  }

  return {
    mode: value.mode,
    independentProjectionEnabled: value.independentProjectionEnabled === true,
    projectionDisplays: value.projectionDisplays,
    projectionOutputs,
    audioDisplay: value.audioDisplay,
  };
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
      configuration = normalizeConfiguration(parsed);
      await persistConfiguration();
    }
  } catch {
    // La primera ejecución usa modo espejo/automático.
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

function resolveConfiguredOutputs(selected: Display[]): ActiveProjectionOutput[] {
  if (!configuration.independentProjectionEnabled) {
    return [];
  }

  const usedDisplayIds = new Set<number>();
  const resolved: ActiveProjectionOutput[] = [];

  for (const output of configuration.projectionOutputs) {
    if (!output.enabled || !output.display) {
      continue;
    }

    const display = matchReference(output.display, selected, usedDisplayIds);
    if (!display) {
      continue;
    }

    usedDisplayIds.add(display.id);
    resolved.push({
      outputId: output.outputId,
      name: output.name,
      displayId: display.id,
    });
  }

  return resolved;
}

export interface ResolvedProjectionTargets {
  displays: Display[];
  outputs: ActiveProjectionOutput[];
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

  const outputs = resolveConfiguredOutputs(selected);

  let audioDisplayId: number | null = null;
  if (!usesOperatorDisplay && selected.length > 0) {
    const matchedAudio = matchReference(configuration.audioDisplay, selected);
    audioDisplayId = matchedAudio?.id ?? null;
  }

  return { displays: selected, outputs, audioDisplayId, usesOperatorDisplay };
}

export function getDisplayStatus(): DisplayStatus {
  const resolved = resolveProjectionTargets();
  return {
    displays: getConnectedDisplays(),
    configuration,
    activeProjectionDisplayIds: resolved.displays.map((display) => display.id),
    activeProjectionOutputs: resolved.outputs,
    audioDisplayId: resolved.audioDisplayId,
    usesOperatorDisplay: resolved.usesOperatorDisplay,
  };
}

function buildProjectionOutputs(
  request: ApplyDisplayConfigurationRequest,
  selected: Display[],
): ProjectionOutputConfiguration[] {
  const usedOutputIds = new Set<string>();

  if (!Array.isArray(request.projectionOutputs)) {
    if (request.outputNames) {
      return selected.map((display, index) => {
        const previous = configuration.projectionOutputs.find(
          (output) => output.display && matchScore(output.display, display) >= 30,
        );
        return {
          outputId: uniqueOutputId(previous?.outputId, usedOutputIds),
          name: request.outputNames?.[display.id]?.trim() || previous?.name || defaultOutputName(index),
          enabled: true,
          display: displayReference(display),
        };
      });
    }

    return configuration.projectionOutputs.map((output) => ({
      ...output,
      outputId: uniqueOutputId(output.outputId, usedOutputIds),
    }));
  }

  const usedDisplayIds = new Set<number>();

  return request.projectionOutputs.map(
    (output: ProjectionOutputAssignmentRequest, index): ProjectionOutputConfiguration => {
      const display =
        output.displayId === null || usedDisplayIds.has(output.displayId)
          ? null
          : selected.find((item) => item.id === output.displayId) ?? null;

      if (display) {
        usedDisplayIds.add(display.id);
      }

      const previous = output.outputId
        ? configuration.projectionOutputs.find((item) => item.outputId === output.outputId)
        : undefined;

      return {
        outputId: uniqueOutputId(previous?.outputId ?? output.outputId, usedOutputIds),
        name: output.name.trim().slice(0, 60) || previous?.name || defaultOutputName(index),
        enabled: output.enabled !== false,
        display: display ? displayReference(display) : null,
      };
    },
  );
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
    request.audioDisplayId === null
      ? null
      : external.find(
          (display) =>
            display.id === request.audioDisplayId && selected.some((item) => item.id === display.id),
        ) ?? null;

  configuration = {
    mode: request.mode === 'custom' ? 'custom' : 'automatic',
    independentProjectionEnabled: request.independentProjectionEnabled === true,
    projectionDisplays: selected.map(displayReference),
    projectionOutputs: buildProjectionOutputs(request, selected),
    audioDisplay: audio ? displayReference(audio) : null,
  };

  await persistConfiguration();
  return getDisplayStatus();
}

registerProjectionOutputRouter(resolveProjectionTargets);

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
