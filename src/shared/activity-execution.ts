import type { GameSessionScoringConfig, GameSessionTeam } from './game-session';
import type { GameHintConfig } from './game-hints';

export type ActivityType = 'hidden-image';

export interface ActivityExecutionContextBase {
  activityType: ActivityType;
  sourceActivityId: string;
  teams: GameSessionTeam[];
  scoring: GameSessionScoringConfig;
  hints: GameHintConfig;
}

export interface StandaloneActivityExecutionContext extends ActivityExecutionContextBase {
  executionMode: 'standalone';
}

export interface CareoActivityExecutionContext extends ActivityExecutionContextBase {
  executionMode: 'careo';
  careoId: string;
  careoActivityId: string;
}

export type ActivityExecutionContext =
  StandaloneActivityExecutionContext | CareoActivityExecutionContext;
