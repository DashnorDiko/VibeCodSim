/**
 * Shared game state / domain types (used by gameStore, economy, save schema).
 */

import type { BuyMultiplier } from "../utils/scaling";

export interface Spark {
  id: string;
  x: number;
  y: number;
  value: number;
  expiresAt: number;
}

export interface MetaNodeDefinition {
  id: string;
  title: string;
  description: string;
  cost: number;
  requires: string[];
}

export interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  lifetimeLoc?: number;
  rebootCount?: number;
  rewardLoc?: number;
  rewardTokens?: number;
  rewardArchitecturePoints?: number;
}

export interface GameNotification {
  id: string;
  title: string;
  message: string;
}

export interface MetaEffects {
  tapMultiplier: number;
  passiveMultiplier: number;
  costDiscount: number;
  sparkChanceMultiplier: number;
  sparkRewardMultiplier: number;
  strainMultiplier: number;
  cloudBurstMultiplierBonus: number;
}

export interface ActiveEvent {
  id: string;
  title: string;
  description: string;
  endsAt: number;
  duration: number;
}

export interface GameState {
  saveVersion: number;
  hasHydrated: boolean;
  hydrationStarted: boolean;

  locCount: number;
  lifetimeLoc: number;
  locPerSecond: number;
  tapPower: number;
  incomeMultiplier: number;

  autoCoderLevel: number;
  serverLevel: number;
  keyboardLevel: number;
  aiPairLevel: number;
  gitAutopilotLevel: number;
  ciPipelineLevel: number;
  observabilityLevel: number;

  cloudBurstActive: boolean;
  cloudBurstCooldown: number;
  cloudBurstEndsAt: number;

  strainLevel: number;
  isBurnedOut: boolean;
  comboCount: number;
  lastTapTime: number;
  activeSparks: Spark[];

  tokens: number;
  tokenTechLevel: number;
  rebootPrestigeLevel: number;
  rebootCount: number;

  architecturePoints: number;
  unlockedMetaNodes: string[];
  milestoneClaims: string[];

  activeBonusWord: string | null;
  bonusWordExpiresAt: number | null;
  bonusWordPosition: { x: number; y: number } | null;

  activeNotification: GameNotification | null;

  totalTaps: number;
  totalSparksCollected: number;
  totalBonusWordsClaimed: number;
  highestCombo: number;
  totalTimePlayed: number;

  achievements: string[];

  activeEvent: ActiveEvent | null;
  lastEventTime: number;

  autoBuyEnabled: Record<string, boolean>;

  lastTickTime: number;
  offlineEarnedLoc: number;
  offlineEarnedSeconds: number;

  buyMultiplier: BuyMultiplier;
  useScientificNotation: boolean;
}
