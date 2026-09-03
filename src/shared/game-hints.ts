export type GameHintMode = 'disabled' | 'free' | 'paid' | 'mixed';

export type GameHintCostMode = 'default' | 'free' | 'custom';

export interface GameHint {
  id: string;
  text: string;
  costMode: GameHintCostMode;
  customCost: number;
}

export interface GameHintConfig {
  /**
   * disabled:
   * no se permiten pistas.
   *
   * free:
   * todas las pistas son gratuitas.
   *
   * paid:
   * todas las pistas tienen costo.
   *
   * mixed:
   * cada equipo puede tener una cantidad de pistas gratis
   * y luego pagar por las siguientes.
   */
  mode: GameHintMode;

  /**
   * Cantidad de pistas gratuitas disponibles para
   * cada equipo durante la sesión.
   *
   * Principalmente usado en modo mixed.
   */
  freeHintsPerTeam: number;

  /**
   * Costo predeterminado de una pista.
   */
  defaultCost: number;

  /**
   * Permite comprar una pista aunque el equipo
   * no tenga puntos suficientes.
   *
   * Ejemplo:
   * marcador = 5
   * pista = 10
   * resultado = -5
   */
  allowNegativeScore: boolean;
}

export interface GameHintUsage {
  id: string;
  hintId: string;
  roundId: string;
  teamId: string;
  teamName: string;
  text: string;
  cost: number;
  wasFree: boolean;
  usedAt: string;
}

export interface ResolveHintCostInput {
  hint: GameHint;
  config: GameHintConfig;
  usedHintsByTeam: number;
}

export interface CanUseHintInput {
  hint: GameHint;
  config: GameHintConfig;
  usedHintsByTeam: number;
  teamScore: number;
}

export interface GameHintAvailability {
  allowed: boolean;
  cost: number;
  wasFree: boolean;
  reason: 'available' | 'disabled' | 'insufficient-score';
}

const MAX_HINT_COST = 1_000_000;
const MAX_FREE_HINTS = 100;

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeGameHintConfig(config: GameHintConfig): GameHintConfig {
  const mode: GameHintMode =
    config.mode === 'free' || config.mode === 'paid' || config.mode === 'mixed'
      ? config.mode
      : 'disabled';

  return {
    mode,

    freeHintsPerTeam: clampInteger(config.freeHintsPerTeam, 0, MAX_FREE_HINTS),

    defaultCost: clampInteger(config.defaultCost, 0, MAX_HINT_COST),

    allowNegativeScore: Boolean(config.allowNegativeScore),
  };
}

export function normalizeGameHint(hint: GameHint): GameHint {
  const costMode: GameHintCostMode =
    hint.costMode === 'free' || hint.costMode === 'custom' ? hint.costMode : 'default';

  return {
    id: hint.id,
    text: hint.text.trim(),
    costMode,

    customCost: clampInteger(hint.customCost, 0, MAX_HINT_COST),
  };
}

export function resolveGameHintCost(input: ResolveHintCostInput): {
  cost: number;
  wasFree: boolean;
} {
  const config = normalizeGameHintConfig(input.config);

  const hint = normalizeGameHint(input.hint);

  const usedHintsByTeam = clampInteger(input.usedHintsByTeam, 0, Number.MAX_SAFE_INTEGER);

  if (config.mode === 'disabled') {
    return {
      cost: 0,
      wasFree: true,
    };
  }

  if (config.mode === 'free') {
    return {
      cost: 0,
      wasFree: true,
    };
  }

  /**
   * Una pista marcada explícitamente como gratuita
   * siempre será gratis.
   */
  if (hint.costMode === 'free') {
    return {
      cost: 0,
      wasFree: true,
    };
  }

  /**
   * En modo mixto cada equipo puede recibir
   * X pistas gratuitas antes de comenzar a pagar.
   */
  if (config.mode === 'mixed' && usedHintsByTeam < config.freeHintsPerTeam) {
    return {
      cost: 0,
      wasFree: true,
    };
  }

  /**
   * La pista puede definir su propio costo.
   */
  if (hint.costMode === 'custom') {
    return {
      cost: hint.customCost,
      wasFree: hint.customCost === 0,
    };
  }

  return {
    cost: config.defaultCost,
    wasFree: config.defaultCost === 0,
  };
}

export function canUseGameHint(input: CanUseHintInput): GameHintAvailability {
  const config = normalizeGameHintConfig(input.config);

  if (config.mode === 'disabled') {
    return {
      allowed: false,
      cost: 0,
      wasFree: false,
      reason: 'disabled',
    };
  }

  const resolved = resolveGameHintCost({
    hint: input.hint,
    config,
    usedHintsByTeam: input.usedHintsByTeam,
  });

  if (resolved.cost > 0 && !config.allowNegativeScore && input.teamScore < resolved.cost) {
    return {
      allowed: false,
      cost: resolved.cost,
      wasFree: false,
      reason: 'insufficient-score',
    };
  }

  return {
    allowed: true,
    cost: resolved.cost,
    wasFree: resolved.wasFree,
    reason: 'available',
  };
}

export function countGameHintsUsedByTeam(usages: GameHintUsage[], teamId: string): number {
  return usages.filter((usage) => usage.teamId === teamId).length;
}

export function countFreeGameHintsUsedByTeam(usages: GameHintUsage[], teamId: string): number {
  return usages.filter((usage) => usage.teamId === teamId && usage.wasFree).length;
}

export function hasGameHintBeenUsedInRound(
  usages: GameHintUsage[],
  roundId: string,
  hintId: string,
): boolean {
  return usages.some((usage) => usage.roundId === roundId && usage.hintId === hintId);
}

export function createGameHintUsage(input: {
  id: string;
  hint: GameHint;
  roundId: string;
  teamId: string;
  teamName: string;
  cost: number;
  wasFree: boolean;
}): GameHintUsage {
  const hint = normalizeGameHint(input.hint);

  return {
    id: input.id,
    hintId: hint.id,
    roundId: input.roundId,
    teamId: input.teamId,
    teamName: input.teamName,
    text: hint.text,

    cost: clampInteger(input.cost, 0, MAX_HINT_COST),

    wasFree: Boolean(input.wasFree),

    usedAt: new Date().toISOString(),
  };
}

export function applyGameHintCost(currentScore: number, cost: number): number {
  const safeScore = Number.isFinite(currentScore) ? Math.round(currentScore) : 0;

  const safeCost = clampInteger(cost, 0, MAX_HINT_COST);

  return safeScore - safeCost;
}

export function restoreGameHintCost(currentScore: number, cost: number): number {
  const safeScore = Number.isFinite(currentScore) ? Math.round(currentScore) : 0;

  const safeCost = clampInteger(cost, 0, MAX_HINT_COST);

  return safeScore + safeCost;
}
