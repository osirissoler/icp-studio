export type GameExecutionMode = 'standalone' | 'careo';

export type GameScoreMode = 'none' | 'fixed' | 'decreasing';

export interface GameSessionTeam {
  id: string;
  name: string;
  score: number;
}

export interface GameRoundResult {
  roundId: string;
  teamId: string;
  teamName: string;
  points: number;
  revealedCount: number;
  awardedAt: string;
}

export interface GameSessionScoringConfig {
  mode: GameScoreMode;

  /**
   * Valor base de una respuesta correcta.
   *
   * En modo fixed:
   * siempre se entrega este valor.
   *
   * En modo decreasing:
   * este es el valor máximo disponible antes de
   * descubrir casillas.
   */
  basePoints: number;

  /**
   * Cantidad de puntos que se descuentan por cada
   * elemento descubierto.
   *
   * Solo se usa en modo decreasing.
   */
  deductionPerReveal: number;

  /**
   * Puntuación mínima posible cuando el modo es
   * decreasing.
   */
  minimumPoints: number;
}

export interface GameSessionConfig {
  executionMode: GameExecutionMode;
  scoring: GameSessionScoringConfig;
  teams: GameSessionTeam[];
}

export interface GameSessionState {
  executionMode: GameExecutionMode;
  scoring: GameSessionScoringConfig;
  teams: GameSessionTeam[];
  activeTeamId: string;
  roundResults: Record<string, GameRoundResult>;
}

export interface CalculateRoundPointsInput {
  scoring: GameSessionScoringConfig;
  revealedCount: number;
}

export interface AwardRoundInput {
  roundId: string;
  team: GameSessionTeam;
  scoring: GameSessionScoringConfig;
  revealedCount: number;
}

const MAX_POINTS = 1_000_000;

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeGameScoringConfig(
  scoring: GameSessionScoringConfig,
): GameSessionScoringConfig {
  const basePoints = clampInteger(scoring.basePoints, 0, MAX_POINTS);

  const deductionPerReveal = clampInteger(scoring.deductionPerReveal, 0, MAX_POINTS);

  const minimumPoints = clampInteger(scoring.minimumPoints, 0, basePoints);

  return {
    mode: scoring.mode === 'fixed' || scoring.mode === 'decreasing' ? scoring.mode : 'none',

    basePoints,
    deductionPerReveal,
    minimumPoints,
  };
}

export function calculateRoundPoints(input: CalculateRoundPointsInput): number {
  const scoring = normalizeGameScoringConfig(input.scoring);

  const revealedCount = Math.max(
    0,
    Math.round(Number.isFinite(input.revealedCount) ? input.revealedCount : 0),
  );

  if (scoring.mode === 'none') {
    return 0;
  }

  if (scoring.mode === 'fixed') {
    return scoring.basePoints;
  }

  const calculatedPoints = scoring.basePoints - revealedCount * scoring.deductionPerReveal;

  return Math.max(scoring.minimumPoints, calculatedPoints);
}

export function createGameSessionState(config: GameSessionConfig): GameSessionState {
  const teams = config.teams.map((team) => ({
    id: team.id,
    name: team.name.trim(),
    score: Number.isFinite(team.score) ? Math.round(team.score) : 0,
  }));

  return {
    executionMode: config.executionMode === 'careo' ? 'careo' : 'standalone',

    scoring: normalizeGameScoringConfig(config.scoring),

    teams,

    activeTeamId: teams[0]?.id ?? '',

    roundResults: {},
  };
}

export function awardGameRound(input: AwardRoundInput): GameRoundResult {
  const points = calculateRoundPoints({
    scoring: input.scoring,
    revealedCount: input.revealedCount,
  });

  return {
    roundId: input.roundId,
    teamId: input.team.id,
    teamName: input.team.name,
    points,
    revealedCount: Math.max(0, Math.round(input.revealedCount)),
    awardedAt: new Date().toISOString(),
  };
}

export function applyRoundResultToTeams(
  teams: GameSessionTeam[],
  result: GameRoundResult,
): GameSessionTeam[] {
  return teams.map((team) => {
    if (team.id !== result.teamId) {
      return team;
    }

    return {
      ...team,
      score: team.score + result.points,
    };
  });
}

export function removeRoundResultFromTeams(
  teams: GameSessionTeam[],
  result: GameRoundResult,
): GameSessionTeam[] {
  return teams.map((team) => {
    if (team.id !== result.teamId) {
      return team;
    }

    return {
      ...team,
      score: team.score - result.points,
    };
  });
}

export function adjustGameTeamScore(
  teams: GameSessionTeam[],
  teamId: string,
  amount: number,
): GameSessionTeam[] {
  if (!Number.isFinite(amount)) {
    return teams;
  }

  const adjustment = Math.round(amount);

  return teams.map((team) => {
    if (team.id !== teamId) {
      return team;
    }

    return {
      ...team,
      score: team.score + adjustment,
    };
  });
}

export function resetGameTeamsScore(teams: GameSessionTeam[]): GameSessionTeam[] {
  return teams.map((team) => ({
    ...team,
    score: 0,
  }));
}
