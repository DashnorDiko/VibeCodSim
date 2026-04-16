import type { BuyMultiplier } from "../utils/scaling";
import type { GameState } from "./gameTypes";
import { SAVE_VERSION } from "./gameConstants";

/** Shape written by `serializePersistedSave` / read from disk. */
export interface PersistedSaveCurrent {
  saveVersion: number;
  locCount: number;
  lifetimeLoc: number;
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
  tokens: number;
  tokenTechLevel: number;
  rebootPrestigeLevel: number;
  rebootCount: number;
  architecturePoints: number;
  unlockedMetaNodes: string[];
  milestoneClaims: string[];
  totalTaps: number;
  totalSparksCollected: number;
  totalBonusWordsClaimed: number;
  highestCombo: number;
  totalTimePlayed: number;
  achievements: string[];
  lastEventTime: number;
  autoBuyEnabled: Record<string, boolean>;
  buyMultiplier: BuyMultiplier;
  useScientificNotation: boolean;
}

const clampNum = (v: unknown, min: number, max: number, fallback: number): number => {
  if (typeof v !== "number" || !isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
};

const MAX_SAFE = 1e18;

/**
 * Normalizes arbitrary JSON into persisted fields (partial GameState).
 * Supports legacy keys (neuralTokens, energyDrinks, etc.).
 */
export const parsePersistedFields = (
  raw: Record<string, unknown>
): Partial<GameState> => {
  return {
    saveVersion:
      typeof raw.saveVersion === "number" && isFinite(raw.saveVersion)
        ? Math.floor(raw.saveVersion)
        : 2,
    locCount: clampNum(raw.locCount ?? raw.neuralTokens, 0, MAX_SAFE, 0),
    lifetimeLoc: clampNum(raw.lifetimeLoc ?? raw.lifetimeTokens, 0, MAX_SAFE, 0),
    autoCoderLevel: clampNum(raw.autoCoderLevel, 0, 999, 0),
    serverLevel: clampNum(raw.serverLevel, 0, 999, 0),
    keyboardLevel: clampNum(raw.keyboardLevel, 0, 999, 0),
    aiPairLevel: clampNum(raw.aiPairLevel, 0, 999, 0),
    gitAutopilotLevel: clampNum(raw.gitAutopilotLevel, 0, 999, 0),
    ciPipelineLevel: clampNum(raw.ciPipelineLevel, 0, 999, 0),
    observabilityLevel: clampNum(raw.observabilityLevel, 0, 999, 0),
    cloudBurstActive:
      typeof raw.cloudBurstActive === "boolean" ? raw.cloudBurstActive : false,
    cloudBurstCooldown: clampNum(raw.cloudBurstCooldown, 0, MAX_SAFE, 0),
    cloudBurstEndsAt: clampNum(raw.cloudBurstEndsAt, 0, MAX_SAFE, 0),
    strainLevel: clampNum(raw.strainLevel, 0, 100, 0),
    isBurnedOut: typeof raw.isBurnedOut === "boolean" ? raw.isBurnedOut : false,
    tokens: clampNum(raw.tokens ?? raw.energyDrinks, 0, MAX_SAFE, 0),
    tokenTechLevel: clampNum(raw.tokenTechLevel ?? raw.energyTechLevel, 0, 20, 0),
    rebootPrestigeLevel: clampNum(raw.rebootPrestigeLevel, 0, 999, 0),
    rebootCount: clampNum(raw.rebootCount, 0, 999, 0),
    architecturePoints: clampNum(raw.architecturePoints, 0, MAX_SAFE, 0),
    unlockedMetaNodes: Array.isArray(raw.unlockedMetaNodes)
      ? raw.unlockedMetaNodes.filter((v): v is string => typeof v === "string")
      : [],
    milestoneClaims: Array.isArray(raw.milestoneClaims)
      ? raw.milestoneClaims.filter((v): v is string => typeof v === "string")
      : [],
    comboCount: clampNum(raw.comboCount, 0, 9999, 0),
    lastTapTime: clampNum(raw.lastTapTime, 0, MAX_SAFE, 0),
    totalTaps: clampNum(raw.totalTaps, 0, MAX_SAFE, 0),
    totalSparksCollected: clampNum(raw.totalSparksCollected, 0, MAX_SAFE, 0),
    totalBonusWordsClaimed: clampNum(raw.totalBonusWordsClaimed, 0, MAX_SAFE, 0),
    highestCombo: clampNum(raw.highestCombo, 0, 9999, 0),
    totalTimePlayed: clampNum(raw.totalTimePlayed, 0, MAX_SAFE, 0),
    achievements: Array.isArray(raw.achievements)
      ? raw.achievements.filter((v): v is string => typeof v === "string")
      : [],
    lastEventTime: clampNum(raw.lastEventTime, 0, MAX_SAFE, 0),
    autoBuyEnabled:
      typeof raw.autoBuyEnabled === "object" && raw.autoBuyEnabled !== null
        ? (raw.autoBuyEnabled as Record<string, boolean>)
        : {},
    buyMultiplier: [1, 10, 100, "MAX"].includes(raw.buyMultiplier as BuyMultiplier)
      ? (raw.buyMultiplier as BuyMultiplier)
      : 1,
    useScientificNotation:
      typeof raw.useScientificNotation === "boolean"
        ? raw.useScientificNotation
        : false,
  };
};

export type DeserializeResult =
  | { ok: true; fields: Partial<GameState> }
  | { ok: false; error: string };

/**
 * Version gate + field parse. Allows v2 and v3; maps v2 → current shape.
 */
export const deserializeSave = (raw: Record<string, unknown>): DeserializeResult => {
  let v = raw.saveVersion;
  if (typeof v !== "number" || !isFinite(v)) {
    v = 2;
  }
  const vn = v as number;
  if (vn < 2) {
    return { ok: false, error: `Save is too old (version ${vn}).` };
  }
  if (vn > SAVE_VERSION) {
    return {
      ok: false,
      error: `Save is from a newer game (version ${vn}). Update the app.`,
    };
  }

  const fields = parsePersistedFields(raw);
  fields.saveVersion = SAVE_VERSION;
  return { ok: true, fields };
};

export const serializePersistedSave = (
  state: GameState
): PersistedSaveCurrent => ({
  saveVersion: SAVE_VERSION,
  locCount: state.locCount,
  lifetimeLoc: state.lifetimeLoc,
  autoCoderLevel: state.autoCoderLevel,
  serverLevel: state.serverLevel,
  keyboardLevel: state.keyboardLevel,
  aiPairLevel: state.aiPairLevel,
  gitAutopilotLevel: state.gitAutopilotLevel,
  ciPipelineLevel: state.ciPipelineLevel,
  observabilityLevel: state.observabilityLevel,
  cloudBurstActive: state.cloudBurstActive,
  cloudBurstCooldown: state.cloudBurstCooldown,
  cloudBurstEndsAt: state.cloudBurstEndsAt,
  strainLevel: state.strainLevel,
  isBurnedOut: state.isBurnedOut,
  comboCount: state.comboCount,
  lastTapTime: state.lastTapTime,
  tokens: state.tokens,
  tokenTechLevel: state.tokenTechLevel,
  rebootPrestigeLevel: state.rebootPrestigeLevel,
  rebootCount: state.rebootCount,
  architecturePoints: state.architecturePoints,
  unlockedMetaNodes: state.unlockedMetaNodes,
  milestoneClaims: state.milestoneClaims,
  totalTaps: state.totalTaps,
  totalSparksCollected: state.totalSparksCollected,
  totalBonusWordsClaimed: state.totalBonusWordsClaimed,
  highestCombo: state.highestCombo,
  totalTimePlayed: state.totalTimePlayed,
  achievements: state.achievements,
  lastEventTime: state.lastEventTime,
  autoBuyEnabled: state.autoBuyEnabled,
  buyMultiplier: state.buyMultiplier,
  useScientificNotation: state.useScientificNotation,
});
