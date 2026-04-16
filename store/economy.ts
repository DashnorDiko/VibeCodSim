import type { GameState, MetaEffects } from "./gameTypes";
import {
  CLOUD_BURST_DURATION_SEC,
  MAX_OFFLINE_SECONDS,
  OFFLINE_EARN_MIN_GAP_SECONDS,
} from "./gameConstants";

const getPrestigeMultiplier = (
  tokenTechLevel: number,
  rebootPrestigeLevel: number
): number => {
  const shopBonus =
    tokenTechLevel * 0.2 * (1 / (1 + tokenTechLevel * 0.05));
  const rebootBonus =
    rebootPrestigeLevel * 0.15 * (1 / (1 + rebootPrestigeLevel * 0.03));
  const raw = 1 + shopBonus + rebootBonus;
  return Math.min(100, raw);
};

const getMetaEffects = (
  state: Pick<GameState, "unlockedMetaNodes">
): MetaEffects => {
  const has = (id: string) => state.unlockedMetaNodes.includes(id);
  return {
    tapMultiplier: has("architectMind") ? 1.15 : 1,
    passiveMultiplier:
      (has("threadOptimizer") ? 1.18 : 1) * (has("architectMind") ? 1.15 : 1),
    costDiscount: has("couponCompiler") ? 0.12 : 0,
    sparkChanceMultiplier: has("sparkMagnet") ? 1.25 : 1,
    sparkRewardMultiplier: has("sparkMagnet") ? 1.3 : 1,
    strainMultiplier: has("steadyHands") ? 0.9 : 1,
    cloudBurstMultiplierBonus: has("burstDaemon") ? 1 : 0,
  };
};

/** Same formula as passive/tap income — single source of truth for UI + store. */
export const getCloudBurstIncomeMultiplier = (meta: MetaEffects): number =>
  2 + meta.cloudBurstMultiplierBonus;

export const getCloudBurstIncomeMultiplierFromNodes = (
  unlockedMetaNodes: string[]
): number => getCloudBurstIncomeMultiplier(getMetaEffects({ unlockedMetaNodes }));

export const buildIncomeSnapshot = (
  state: GameState,
  includeCloudBurst: boolean
): { passivePerSecond: number; tapPower: number; incomeMultiplier: number } => {
  const meta = getMetaEffects(state);
  const prestigeMultiplier = getPrestigeMultiplier(
    state.tokenTechLevel,
    state.rebootPrestigeLevel
  );
  const gitBonus = 1 + state.gitAutopilotLevel * 0.1;
  const ciBonus = 1 + state.ciPipelineLevel * 0.2;
  const obsBonus = 1 + state.observabilityLevel * 0.35;
  const cloudMultiplier = includeCloudBurst
    ? getCloudBurstIncomeMultiplier(meta)
    : 1;

  const passivePerSecond =
    (state.serverLevel * 0.5 +
      state.autoCoderLevel * 0.3 +
      state.keyboardLevel * 0.18) *
    prestigeMultiplier *
    gitBonus *
    ciBonus *
    obsBonus *
    meta.passiveMultiplier *
    cloudMultiplier;

  const tapPower =
    (1 + state.autoCoderLevel * 0.5 + state.keyboardLevel * 0.08) *
    prestigeMultiplier *
    obsBonus *
    meta.tapMultiplier *
    cloudMultiplier;

  return {
    passivePerSecond,
    tapPower,
    incomeMultiplier:
      prestigeMultiplier *
      gitBonus *
      ciBonus *
      obsBonus *
      meta.passiveMultiplier *
      cloudMultiplier,
  };
};

/**
 * Burst is active only when flagged on, end timestamp exists, and time is before end.
 * Legacy saves may have active=true but endsAt=0 — treat as inactive.
 */
export const deriveEffectiveCloudBurstActive = (
  state: Pick<GameState, "cloudBurstActive" | "cloudBurstEndsAt">,
  nowMs: number
): boolean =>
  state.cloudBurstActive &&
  state.cloudBurstEndsAt > 0 &&
  nowMs < state.cloudBurstEndsAt;

export interface RuntimeDerivation {
  cloudBurstActive: boolean;
  locPerSecond: number;
  tapPower: number;
  incomeMultiplier: number;
}

export const deriveRuntimeFromPersisted = (
  state: GameState,
  nowMs: number
): RuntimeDerivation => {
  const burst = deriveEffectiveCloudBurstActive(state, nowMs);
  const snap = buildIncomeSnapshot({ ...state, cloudBurstActive: burst }, burst);
  return {
    cloudBurstActive: burst,
    locPerSecond: snap.passivePerSecond,
    tapPower: snap.tapPower,
    incomeMultiplier: snap.incomeMultiplier,
  };
};

/** Matches masterTick token drain: dT/dt = -0.01*T (continuous approximation). */
export const applyOfflineBurstTokenDrain = (
  tokens: number,
  burstSeconds: number
): number => {
  if (burstSeconds <= 0 || tokens <= 0) return tokens;
  return Math.max(0, tokens * Math.exp(-0.01 * burstSeconds));
};

export interface OfflinePassiveResult {
  locEarned: number;
  gapSeconds: number;
  burstSegmentSeconds: number;
  tokensAfter: number;
}

/**
 * Passive LoC only. Uses persisted burst fields as they were when the player left (≈ lastActive).
 */
export const computeOfflinePassiveEarn = (
  state: GameState,
  lastActiveMs: number,
  nowMs: number
): OfflinePassiveResult => {
  const gapMs = Math.max(0, nowMs - lastActiveMs);
  const cappedWindowMs = Math.min(gapMs, MAX_OFFLINE_SECONDS * 1000);
  const gapSeconds = cappedWindowMs / 1000;

  if (gapSeconds <= OFFLINE_EARN_MIN_GAP_SECONDS) {
    return {
      locEarned: 0,
      gapSeconds,
      burstSegmentSeconds: 0,
      tokensAfter: state.tokens,
    };
  }

  const windowEndMs = lastActiveMs + cappedWindowMs;

  const burstOnAtLeave =
    state.cloudBurstActive &&
    state.cloudBurstEndsAt > lastActiveMs &&
    lastActiveMs < state.cloudBurstEndsAt;

  let burstSegmentMs = 0;
  if (burstOnAtLeave) {
    const burstEnd = Math.min(windowEndMs, state.cloudBurstEndsAt);
    burstSegmentMs = Math.max(0, burstEnd - lastActiveMs);
  }

  const burstSeconds = burstSegmentMs / 1000;
  const totalSeconds = gapSeconds;
  const normalSeconds = Math.max(0, totalSeconds - burstSeconds);

  const burstSnap = buildIncomeSnapshot(state, true);
  const normalSnap = buildIncomeSnapshot(state, false);

  const locEarned =
    burstSnap.passivePerSecond * burstSeconds +
    normalSnap.passivePerSecond * normalSeconds;

  const tokensAfter = applyOfflineBurstTokenDrain(state.tokens, burstSeconds);

  return {
    locEarned,
    gapSeconds,
    burstSegmentSeconds: burstSeconds,
    tokensAfter,
  };
};

export { getMetaEffects, getPrestigeMultiplier };

export const cloudBurstDurationMs = (): number =>
  CLOUD_BURST_DURATION_SEC * 1000;
