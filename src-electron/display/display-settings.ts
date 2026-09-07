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
  ProjectionOutputAssignmentRequest,
  ProjectionOutputConfiguration,
} from '../../src/shared/display';
import { registerProjectionOutputRouter } from '../projection/projection-output-router';

const SETTINGS_FILENAME = 'display-settings.json';

let configuration: DisplayConfiguration = {
  mode: 'automatic',
  independentProjectionEnabled: false,
  operatorDisplayProjectionEnabled: false,
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

interface StoredProjectionOutput {
  outputId: string;
  name: string;
  enabled?: boolean;
  display?: DisplayReference | null;
  displays?: DisplayReference[];
}

interface StoredDisplayConfiguration {
  mode: 'automatic' | 'custom';
  independentProjectionEnabled?: boolean;
  operatorDisplayProjectionEnabled?: boolean;
  projectionDisplays: DisplayReference[];
  projectionOutputs?: StoredProjectionOutput[];
  audioDisplay: DisplayReference | null;
}

function validConfiguration(value: unknown): value is StoredDisplayConfiguration {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredDisplayConfiguration>;
  return (
    (candidate.mode === 'automatic' || candidate.mode === 'custom') &&
    (candidate.independentProjectionEnabled === undefined || typeof candidate.independentProjectionEnabled === 'boolean') &&
    (candidate.operatorDisplayProjectionEnabled === undefined || typeof candidate.operatorDisplayProjectionEnabled === 'boolean') &&
    Array.isArray(candidate.projectionDisplays) &&
    (candidate.projectionOutputs === undefined || Array.isArray(candidate.projectionOutputs)) &&
    (candidate.audioDisplay === null || typeof candidate.audioDisplay === 'object')
  );
}

function normalizeConfiguration(value: StoredDisplayConfiguration): DisplayConfiguration {
  const usedOutputIds = new Set<string>();
  const storedOutputs = Array.isArray(value.projectionOutputs) ? value.projectionOutputs : [];
  const projectionOutputs: ProjectionOutputConfiguration[] = storedOutputs
    .filter((output) => output && typeof output.name === 'string')
    .map((output, index) => {
      let outputId = typeof output.outputId === 'string' ? output.outputId.trim() : '';
      if (!outputId || usedOutputIds.has(outputId)) outputId = createOutputId();
      usedOutputIds.add(outputId);

      const displays = Array.isArray(output.displays)
        ? output.displays.filter((display): display is DisplayReference => Boolean(display && typeof display === 'object'))
        : output.display
          ? [output.display]
          : [];

      return {
        outputId,
        name: output.name.trim() || defaultOutputName(index),
        enabled: output.enabled !== false,
        displays,
        display: displays[0] ?? null,
      };
    });

  if (projectionOutputs.length === 0 && value.projectionDisplays.length > 0) {
    value.projectionDisplays.forEach((display, index) => {
      projectionOutputs.push({
        outputId: createOutputId(),
        name: defaultOutputName(index),
        enabled: true,
        displays: [display],
        display,
      });
    });
  }

  return {
    mode: value.mode,
    independentProjectionEnabled: value.independentProjectionEnabled === true,
    operatorDisplayProjectionEnabled: value.operatorDisplayProjectionEnabled === true,
    projectionDisplays: value.projectionDisplays,
    projectionOutputs,
    audioDisplay: value.audioDisplay,
  };
}

export async function loadDisplayConfiguration(): Promise<void> {
  if (loaded) return;
  loaded = true;

  try {
    const raw = await readFile(settingsPath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (validConfiguration(parsed)) {
      configuration = normalizeConfiguration(parsed);
      await persistConfiguration();
    }
  } catch {
    // Primera ejecución: modo espejo/automático.
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

function matchReference(reference: DisplayReference | null, candidates: Display[], usedIds = new Set<number>()): Display | null {
  if (!reference) return null;
  const ranked = candidates
    .filter((display) => !usedIds.has(display.id))
    .map((display) => ({ display, score: matchScore(reference, display) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0] && ranked[0].score >= 30 ? ranked[0].display : null;
}

function resolveConfiguredOutputs(selected: Display[]): ActiveProjectionOutput[] {
  if (!configuration.independentProjectionEnabled) return [];

  const globallyUsedDisplayIds = new Set<number>();
  const resolved: ActiveProjectionOutput[] = [];

  for (const output of configuration.projectionOutputs) {
    if (!output.enabled) continue;

    const displayIds: number[] = [];
    for (const reference of output.displays) {
      const display = matchReference(reference, selected, globallyUsedDisplayIds);
      if (!display) continue;
      globallyUsedDisplayIds.add(display.id);
      displayIds.push(display.id);
    }

    if (displayIds.length === 0) continue;
    resolved.push({
      outputId: output.outputId,
      name: output.name,
      displayIds,
      displayId: displayIds[0]!,
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

  let selectedExternal: Display[];
  if (configuration.mode === 'automatic') {
    selectedExternal = external;
  } else {
    const usedIds = new Set<number>();
    selectedExternal = [];
    for (const reference of configuration.projectionDisplays) {
      const matched = matchReference(reference, external, usedIds);
      if (matched) {
        usedIds.add(matched.id);
        selectedExternal.push(matched);
      }
    }
  }

  const selected = configuration.operatorDisplayProjectionEnabled
    ? [primary, ...selectedExternal]
    : [...selectedExternal];

  const usesOperatorDisplay = configuration.operatorDisplayProjectionEnabled;
  if (selected.length === 0 && external.length === 0) {
    selected.push(primary);
  }

  const outputs = resolveConfiguredOutputs(selected);

  let audioDisplayId: number | null = null;
  if (selected.length > 0) {
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

function buildProjectionOutputs(request: ApplyDisplayConfigurationRequest, selected: Display[]): ProjectionOutputConfiguration[] {
  if (!Array.isArray(request.projectionOutputs)) {
    if (request.outputNames) {
      return selected.map((display, index) => {
        const reference = displayReference(display);
        return {
          outputId: createOutputId(),
          name: request.outputNames?.[display.id]?.trim() || defaultOutputName(index),
          enabled: true,
          displays: [reference],
          display: reference,
        };
      });
    }
    return configuration.projectionOutputs;
  }

  const globallyUsedDisplayIds = new Set<number>();
  return request.projectionOutputs.map((output: ProjectionOutputAssignmentRequest, index): ProjectionOutputConfiguration => {
    const previous = output.outputId
      ? configuration.projectionOutputs.find((item) => item.outputId === output.outputId)
      : undefined;

    const requestedDisplayIds = Array.isArray(output.displayIds)
      ? output.displayIds
      : output.displayId === null || output.displayId === undefined
        ? []
        : [output.displayId];

    const references: DisplayReference[] = [];
    for (const displayId of requestedDisplayIds) {
      if (globallyUsedDisplayIds.has(displayId)) continue;
      const display = selected.find((item) => item.id === displayId);
      if (!display) continue;
      globallyUsedDisplayIds.add(display.id);
      references.push(displayReference(display));
    }

    return {
      outputId: previous?.outputId ?? createOutputId(),
      name: output.name.trim().slice(0, 60) || previous?.name || defaultOutputName(index),
      enabled: output.enabled !== false,
      displays: references,
      display: references[0] ?? null,
    };
  });
}

export async function applyDisplayConfiguration(request: ApplyDisplayConfigurationRequest): Promise<DisplayStatus> {
  const primary = screen.getPrimaryDisplay();
  const external = screen.getAllDisplays().filter((display) => display.id !== primary.id);
  const selectedIds = new Set(
    Array.isArray(request.projectionDisplayIds)
      ? request.projectionDisplayIds.filter((id) => Number.isInteger(id))
      : [],
  );

  const selectedExternal = external.filter((display) => selectedIds.has(display.id));
  const operatorEnabled = request.operatorDisplayProjectionEnabled === true;
  const selected = operatorEnabled ? [primary, ...selectedExternal] : selectedExternal;
  const audio = request.audioDisplayId === null
    ? null
    : selected.find((display) => display.id === request.audioDisplayId) ?? null;

  configuration = {
    mode: request.mode === 'custom' ? 'custom' : 'automatic',
    independentProjectionEnabled: request.independentProjectionEnabled === true,
    operatorDisplayProjectionEnabled: operatorEnabled,
    projectionDisplays: selectedExternal.map(displayReference),
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
        webPreferences: { contextIsolation: true, sandbox: true },
      });

      const label = String(index + 1);
      const title = (display.label || `Pantalla ${index + 1}`).replace(/[<>&"']/g, '');
      const html = `<!doctype html><html><body style="margin:0;width:100vw;height:100vh;display:grid;place-items:center;background:#07111d;color:#fff;font-family:system-ui,sans-serif"><main style="text-align:center"><div style="font-size:min(42vw,420px);font-weight:900;line-height:.9">${label}</div><div style="margin-top:24px;font-size:32px">${title}</div></main></body></html>`;

      await identifyWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      identifyWindow.showInactive();

      setTimeout(() => {
        if (!identifyWindow.isDestroyed()) identifyWindow.close();
      }, 2500);
    }),
  );
}
