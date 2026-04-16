import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { gameMechanics } from "../utils/mechanics";
import {
  getTierUnlockRequirement,
  getUpgradeCost,
  getUpgradeUnlockRequirement,
  type UpgradeType,
  type BuyMultiplier,
  getBulkUpgradeInfo,
} from "../utils/scaling";
import { formatNumber } from "../utils/formatNumber";
import { debugLog } from "../utils/debug";
import type { GameNotification, GameState, MetaNodeDefinition, MilestoneDefinition } from "./gameTypes";
import { REBOOT_THRESHOLD, SAVE_THROTTLE_MS } from "./gameConstants";
import {
  SAVE_VERSION,
  STORAGE_KEY_LAST_ACTIVE,
  STORAGE_KEY_SAVE,
  STORAGE_KEY_SAVE_LEGACY_V2,
  STORAGE_KEY_SAVE_PREV,
  deserializeSave,
  serializePersistedSave,
} from "./save";
import {
  buildIncomeSnapshot,
  cloudBurstDurationMs,
  computeOfflinePassiveEarn,
  deriveEffectiveCloudBurstActive,
  deriveRuntimeFromPersisted,
  getMetaEffects,
} from "./economy";

export type {
  ActiveEvent,
  GameNotification,
  GameState,
  MetaNodeDefinition,
  MilestoneDefinition,
  Spark,
} from "./gameTypes";

interface GameActions {
  tapProgrammer: () => void;
  purchaseUpgrade: (
    type: "autoCoder" | "server" | "keyboard"
  ) => void;
  purchaseHiddenUpgrade: (
    type: "aiPair" | "gitAutopilot" | "ciPipeline" | "observability"
  ) => void;
  activateCloudBurst: () => void;
  triggerRandomBonusWord: () => void;
  claimBonusWord: () => void;
  masterTick: (timestamp: number) => void;
  collectSpark: (id: string) => void;
  purchaseTokenUpgrade: () => void;
  purchaseMetaNode: (nodeId: string) => void;
  respecMetaTree: () => void;
  claimMilestone: (milestoneId: string) => void;
  reboot: () => void;
  clearOfflineToast: () => void;
  dismissNotification: () => void;
  toggleAutoBuy: (type: string) => void;
  resetSave: () => void;
  exportSave: () => string;
  importSave: (encoded: string) => { ok: true } | { ok: false; error: string };
  setBuyMultiplier: (mult: BuyMultiplier) => void;
  setUseScientificNotation: (enabled: boolean) => void;
}

type GameStore = GameState & GameActions;

const BONUS_WORDS = [
  "function",
  "await",
  "async",
  "interface",
  "yield",
  "class",
  "useEffect",
  "const",
  "return",
  "catch",
  "deploy",
  "commit",
  "push",
  "refactor",
  "debug",
];

const BONUS_WORD_DURATION = 5000;
let lastPersistedAt = 0;

const META_NODE_DEFINITIONS: MetaNodeDefinition[] = [
  {
    id: "steadyHands",
    title: "Steady Hands",
    description: "10% less strain per tap",
    cost: 1,
    requires: [],
  },
  {
    id: "threadOptimizer",
    title: "Thread Optimizer",
    description: "+18% passive LoC/sec",
    cost: 2,
    requires: ["steadyHands"],
  },
  {
    id: "couponCompiler",
    title: "Coupon Compiler",
    description: "12% cheaper upgrades",
    cost: 2,
    requires: ["steadyHands"],
  },
  {
    id: "sparkMagnet",
    title: "Spark Magnet",
    description: "+25% spark chance, +30% spark rewards",
    cost: 3,
    requires: ["threadOptimizer"],
  },
  {
    id: "burstDaemon",
    title: "Burst Daemon",
    description: "Cloud Burst is 50% more effective (3x multi)",
    cost: 3,
    requires: ["threadOptimizer", "couponCompiler"],
  },
  {
    id: "architectMind",
    title: "Architect Mind",
    description: "15% global income boost",
    cost: 5,
    requires: ["sparkMagnet", "burstDaemon"],
  },
];

const META_NODE_BY_ID: Record<string, MetaNodeDefinition> =
  META_NODE_DEFINITIONS.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {} as Record<string, MetaNodeDefinition>);

const MILESTONES: MilestoneDefinition[] = [
  {
    id: "m_first_50k",
    title: "Hello Production",
    description: "Reach 50,000 total generated LoC",
    lifetimeLoc: 50_000,
    rewardTokens: 3,
    rewardArchitecturePoints: 1,
  },
  {
    id: "m_first_reboot",
    title: "Version 2",
    description: "Perform your first reboot",
    rebootCount: 1,
    rewardArchitecturePoints: 2,
  },
  {
    id: "m_scale_1m",
    title: "Scaled Systems",
    description: "Reach 1,000,000 total generated LoC",
    lifetimeLoc: 1_000_000,
    rewardLoc: 15_000,
    rewardArchitecturePoints: 2,
  },
  {
    id: "m_scale_10m",
    title: "Planetary Deploy",
    description: "Reach 10,000,000 total generated LoC",
    lifetimeLoc: 10_000_000,
    rewardLoc: 250_000,
    rewardTokens: 25,
    rewardArchitecturePoints: 4,
  },
  {
    id: "m_reboot_5",
    title: "Ops Veteran",
    description: "Reach reboot count 5",
    rebootCount: 5,
    rewardArchitecturePoints: 6,
  },
  {
    id: "m_scale_50m",
    title: "Galactic Coder",
    description: "Reach 50,000,000 total generated LoC",
    lifetimeLoc: 50_000_000,
    rewardLoc: 1_000_000,
    rewardArchitecturePoints: 5,
  },
  {
    id: "m_scale_100m",
    title: "Cosmic Deploy",
    description: "Reach 100,000,000 total generated LoC",
    lifetimeLoc: 100_000_000,
    rewardLoc: 5_000_000,
    rewardTokens: 50,
    rewardArchitecturePoints: 8,
  },
  {
    id: "m_scale_1b",
    title: "Universal Runtime",
    description: "Reach 1,000,000,000 total generated LoC",
    lifetimeLoc: 1_000_000_000,
    rewardLoc: 50_000_000,
    rewardArchitecturePoints: 15,
  },
  {
    id: "m_reboot_10",
    title: "Serial Reboater",
    description: "Reach reboot count 10",
    rebootCount: 10,
    rewardArchitecturePoints: 10,
  },
  {
    id: "m_reboot_25",
    title: "Reboot Addict",
    description: "Reach reboot count 25",
    rebootCount: 25,
    rewardArchitecturePoints: 20,
  },
];

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: "economy" | "tapping" | "upgrades" | "meta" | "secret";
  check: (state: GameState) => boolean;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: "a_first_100", title: "Hello World", description: "Earn 100 LoC", category: "economy", check: (s) => s.lifetimeLoc >= 100 },
  { id: "a_first_1k", title: "Junior Dev", description: "Earn 1,000 LoC", category: "economy", check: (s) => s.lifetimeLoc >= 1_000 },
  { id: "a_first_10k", title: "Mid-Level", description: "Earn 10,000 LoC", category: "economy", check: (s) => s.lifetimeLoc >= 10_000 },
  { id: "a_first_100k", title: "Senior Engineer", description: "Earn 100,000 LoC", category: "economy", check: (s) => s.lifetimeLoc >= 100_000 },
  { id: "a_millionaire", title: "Millionaire", description: "Earn 1,000,000 LoC", category: "economy", check: (s) => s.lifetimeLoc >= 1_000_000 },
  { id: "a_billionaire", title: "Billionaire", description: "Earn 1,000,000,000 LoC", category: "economy", check: (s) => s.lifetimeLoc >= 1_000_000_000 },
  { id: "a_100_taps", title: "Keyboard Warrior", description: "Tap 100 times", category: "tapping", check: (s) => s.totalTaps >= 100 },
  { id: "a_1k_taps", title: "Carpal Tunnel", description: "Tap 1,000 times", category: "tapping", check: (s) => s.totalTaps >= 1_000 },
  { id: "a_10k_taps", title: "Mechanical Madness", description: "Tap 10,000 times", category: "tapping", check: (s) => s.totalTaps >= 10_000 },
  { id: "a_combo_10", title: "Getting Warmed Up", description: "Reach a 10 combo", category: "tapping", check: (s) => s.highestCombo >= 10 },
  { id: "a_combo_25", title: "On Fire", description: "Reach a 25 combo", category: "tapping", check: (s) => s.highestCombo >= 25 },
  { id: "a_combo_50", title: "Unstoppable", description: "Reach a 50 combo", category: "tapping", check: (s) => s.highestCombo >= 50 },
  { id: "a_burnout_5", title: "Burnout Survivor", description: "Recover from burnout 5 times", category: "tapping", check: (s) => s.totalTaps >= 500 && s.rebootCount >= 0 },
  { id: "a_first_server", title: "Infra Team", description: "Buy your first server", category: "upgrades", check: (s) => s.serverLevel >= 1 },
  { id: "a_all_pkg_5", title: "Package Manager", description: "All packages at lv 5+", category: "upgrades", check: (s) => s.autoCoderLevel >= 5 && s.serverLevel >= 5 && s.keyboardLevel >= 5 },
  { id: "a_all_pkg_10", title: "Dependency Hell", description: "All packages at lv 10+", category: "upgrades", check: (s) => s.autoCoderLevel >= 10 && s.serverLevel >= 10 && s.keyboardLevel >= 10 },
  { id: "a_first_advanced", title: "Advanced User", description: "Unlock any advanced module", category: "upgrades", check: (s) => s.aiPairLevel >= 1 || s.gitAutopilotLevel >= 1 },
  { id: "a_first_meta", title: "Architect Apprentice", description: "Unlock first meta node", category: "meta", check: (s) => s.unlockedMetaNodes.length >= 1 },
  { id: "a_full_tree", title: "Grand Architect", description: "Unlock all meta nodes", category: "meta", check: (s) => s.unlockedMetaNodes.length >= 6 },
  { id: "a_respec_3", title: "Indecisive", description: "Respec the meta tree 3 times", category: "meta", check: (s) => s.totalTaps >= 0 },
  { id: "a_first_reboot", title: "Reborn", description: "Perform your first reboot", category: "meta", check: (s) => s.rebootCount >= 1 },
  { id: "a_10_reboots", title: "Groundhog Day", description: "Reboot 10 times", category: "meta", check: (s) => s.rebootCount >= 10 },
  { id: "a_5_sparks", title: "Spark Collector", description: "Collect 5 sparks", category: "secret", check: (s) => s.totalSparksCollected >= 5 },
  { id: "a_50_sparks", title: "Spark Hunter", description: "Collect 50 sparks", category: "secret", check: (s) => s.totalSparksCollected >= 50 },
  { id: "a_10_bonus", title: "Wordsmith", description: "Claim 10 bonus words", category: "secret", check: (s) => s.totalBonusWordsClaimed >= 10 },
];

const EVENT_DEFINITIONS = [
  { id: "code_rush", title: "Code Rush", description: "3x tap power for 15s!", duration: 15 },
  { id: "bug_swarm", title: "Bug Swarm", description: "2x strain but 3x sparks for 20s!", duration: 20 },
  { id: "refactor_window", title: "Refactor Window", description: "50% off all upgrades for 20s!", duration: 20 },
  { id: "coffee_break", title: "Coffee Break", description: "Strain fully reset!", duration: 1 },
];

const EVENT_INTERVAL_MIN = 120;
const EVENT_INTERVAL_MAX = 300;

const getTokenTechCost = (level: number): number => {
  return Math.floor(5 * Math.pow(2.5, level));
};

const makeNotification = (title: string, message: string): GameNotification => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title,
  message,
});

const getUpgradeLevel = (state: GameState, type: UpgradeType): number => {
  if (type === "autoCoder") return state.autoCoderLevel;
  if (type === "server") return state.serverLevel;
  if (type === "keyboard") return state.keyboardLevel;
  if (type === "aiPair") return state.aiPairLevel;
  if (type === "gitAutopilot") return state.gitAutopilotLevel;
  if (type === "ciPipeline") return state.ciPipelineLevel;
  if (type === "observability") return state.observabilityLevel;
  return 0;
};

const getUpgradeCostMultiplier = (type: UpgradeType): number => {
  if (type === "server") return 1.4;
  if (type === "keyboard") return 1.2;
  if (type === "aiPair") return 1.5;
  if (type === "gitAutopilot") return 5;
  if (type === "ciPipeline") return 6.5;
  if (type === "observability") return 8;
  return 1;
};

const isUpgradeUnlocked = (state: GameState, type: UpgradeType): boolean => {
  const requirements = getUpgradeUnlockRequirement(type);
  if (requirements.lifetimeLoc && state.lifetimeLoc < requirements.lifetimeLoc) {
    return false;
  }
  if (requirements.rebootCount && state.rebootCount < requirements.rebootCount) {
    return false;
  }
  if (type === "ciPipeline" && !state.milestoneClaims.includes("m_first_reboot")) {
    return false;
  }
  if (type === "observability" && !state.milestoneClaims.includes("m_scale_1m")) {
    return false;
  }
  return true;
};

const isMilestoneComplete = (state: GameState, milestone: MilestoneDefinition): boolean => {
  if (milestone.lifetimeLoc && state.lifetimeLoc < milestone.lifetimeLoc) {
    return false;
  }
  if (milestone.rebootCount && state.rebootCount < milestone.rebootCount) {
    return false;
  }
  return true;
};

const persistSnapshot = async (state: GameState) => {
  const now = Date.now();
  if (now - lastPersistedAt < SAVE_THROTTLE_MS) return;
  const saveState = serializePersistedSave(state);
  const encoded = JSON.stringify(saveState);
  let prev: string | null = null;
  try {
    prev = await AsyncStorage.getItem(STORAGE_KEY_SAVE);
  } catch {
    prev = null;
  }
  const entries: [string, string][] = [
    [STORAGE_KEY_SAVE, encoded],
    [STORAGE_KEY_LAST_ACTIVE, now.toString()],
  ];
  if (prev) {
    entries.push([STORAGE_KEY_SAVE_PREV, prev]);
  }
  await AsyncStorage.multiSet(entries);
  lastPersistedAt = now;
};

const defaultState: GameState = {
  saveVersion: SAVE_VERSION,
  hasHydrated: false,
  hydrationStarted: false,

  locCount: 0,
  lifetimeLoc: 0,
  locPerSecond: 0,
  tapPower: 1,
  incomeMultiplier: 1,

  autoCoderLevel: 0,
  serverLevel: 0,
  keyboardLevel: 0,
  aiPairLevel: 0,
  gitAutopilotLevel: 0,
  ciPipelineLevel: 0,
  observabilityLevel: 0,

  cloudBurstActive: false,
  cloudBurstCooldown: 0,
  cloudBurstEndsAt: 0,

  strainLevel: 0,
  isBurnedOut: false,
  comboCount: 0,
  lastTapTime: 0,
  activeSparks: [],

  tokens: 0,
  tokenTechLevel: 0,
  rebootPrestigeLevel: 0,
  rebootCount: 0,

  architecturePoints: 0,
  unlockedMetaNodes: [],
  milestoneClaims: [],

  activeBonusWord: null,
  bonusWordExpiresAt: null,
  bonusWordPosition: null,

  activeNotification: null,

  totalTaps: 0,
  totalSparksCollected: 0,
  totalBonusWordsClaimed: 0,
  highestCombo: 0,
  totalTimePlayed: 0,

  achievements: [],

  activeEvent: null,
  lastEventTime: 0,

  autoBuyEnabled: {},

  lastTickTime: 0,
  offlineEarnedLoc: 0,
  offlineEarnedSeconds: 0,

  buyMultiplier: 1,
  useScientificNotation: false,
};

const tryParseSaveRecord = (
  json: string | null
): Record<string, unknown> | null => {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as unknown;
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
};

const bootHydration = async (
  now: number,
  set: (partial: Partial<GameState>) => void,
  get: () => GameStore
) => {
  const t0 = typeof __DEV__ !== "undefined" && __DEV__ ? performance.now() : 0;
  debugLog("hydrationStart", { now });

  try {
    const [[, saveRaw], [, prevRaw], [, lastActiveRaw], [, legacyRaw]] =
      await AsyncStorage.multiGet([
        STORAGE_KEY_SAVE,
        STORAGE_KEY_SAVE_PREV,
        STORAGE_KEY_LAST_ACTIVE,
        STORAGE_KEY_SAVE_LEGACY_V2,
      ]);

    const loadFields = (json: string | null): Partial<GameState> | null => {
      const raw = tryParseSaveRecord(json);
      if (!raw) return null;
      const des = deserializeSave(raw);
      return des.ok ? des.fields : null;
    };

    const primaryFields = loadFields(saveRaw);
    let loadedFields: Partial<GameState> | null = primaryFields;
    let loadedFromPrev = false;
    let loadedFromLegacy = false;
    if (!loadedFields && prevRaw) {
      loadedFields = loadFields(prevRaw);
      if (loadedFields) loadedFromPrev = true;
    }
    if (!loadedFields && legacyRaw) {
      loadedFields = loadFields(legacyRaw);
      if (loadedFields) loadedFromLegacy = true;
    }

    if (loadedFields) {
      set(loadedFields);
    }

    const primaryLoadFailed = saveRaw != null && primaryFields === null;
    if (primaryLoadFailed && loadedFromPrev) {
      set({
        activeNotification: makeNotification(
          "Save recovered",
          "Primary save was unreadable — loaded rolling backup."
        ),
      });
    } else if (
      !loadedFields &&
      (saveRaw != null || prevRaw != null || legacyRaw != null)
    ) {
      set({
        activeNotification: makeNotification(
          "Save issue",
          "Save data was unreadable — starting fresh."
        ),
      });
    }

    const liveState = get();
    const lastActiveMs = lastActiveRaw ? parseInt(lastActiveRaw, 10) : Date.now();
    const nowMs = Date.now();

    const offline = computeOfflinePassiveEarn(liveState, lastActiveMs, nowMs);
    const withOffline: GameState = {
      ...liveState,
      locCount: liveState.locCount + offline.locEarned,
      lifetimeLoc: liveState.lifetimeLoc + offline.locEarned,
      tokens: offline.tokensAfter,
      offlineEarnedLoc: offline.locEarned,
      offlineEarnedSeconds: offline.gapSeconds,
    };

    const runtime = deriveRuntimeFromPersisted(withOffline, nowMs);

    debugLog("hydrationDerivedBurst", {
      cloudBurstActive: runtime.cloudBurstActive,
      endsAt: withOffline.cloudBurstEndsAt,
    });

    set({
      ...withOffline,
      locPerSecond: runtime.locPerSecond,
      tapPower: runtime.tapPower,
      incomeMultiplier: runtime.incomeMultiplier,
      cloudBurstActive: runtime.cloudBurstActive,
      cloudBurstEndsAt: runtime.cloudBurstActive
        ? withOffline.cloudBurstEndsAt
        : 0,
      hasHydrated: true,
      hydrationStarted: false,
      lastTickTime: now,
    });

    if (loadedFromLegacy) {
      await AsyncStorage.removeItem(STORAGE_KEY_SAVE_LEGACY_V2);
    }

    await persistSnapshot(get());

    if (t0) {
      debugLog("hydrationEnd", {
        ms: Number((performance.now() - t0).toFixed(3)),
        offlineGapSec: offline.gapSeconds,
        offlineEarnedLoc: offline.locEarned,
        burstSegSec: offline.burstSegmentSeconds,
      });
    }
  } catch {
    set({
      hasHydrated: true,
      hydrationStarted: false,
      lastTickTime: now,
      activeNotification: makeNotification(
        "Save issue",
        "Could not load save — starting fresh."
      ),
    });
  }
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultState,

  masterTick: (timestamp: number) => {
    const state = get();
    if (!state.hasHydrated) {
      if (!state.hydrationStarted) {
        set({ hydrationStarted: true });
        void bootHydration(timestamp, set, get);
      }
      return;
    }

    if (state.lastTickTime === 0) {
      set({ lastTickTime: timestamp });
      return;
    }

    const deltaSeconds = Math.max(0, Math.min(1.5, (timestamp - state.lastTickTime) / 1000));
    const meta = getMetaEffects(state);
    // e ndryshova ket karllikun e bona si toggle se spo punote sic ishte bo me perpara
    let burstStillActive = deriveEffectiveCloudBurstActive(state, timestamp);
    let newEndsAt = burstStillActive ? state.cloudBurstEndsAt : 0;
    let newTokens = state.tokens;
    if (burstStillActive) {
      const drain = newTokens * 0.01 * deltaSeconds;
      newTokens = Math.max(0, newTokens - drain);
      if (newTokens < 0.01) {
        newTokens = 0;
        burstStillActive = false;
        newEndsAt = 0;
      }
    }
    const income = buildIncomeSnapshot(
      { ...state, cloudBurstActive: burstStillActive },
      burstStillActive
    );
    const earnedTokens = income.passivePerSecond * deltaSeconds;

    let newStrain = gameMechanics.decayStrain(state.strainLevel, deltaSeconds);
    let newIsBurnedOut = state.isBurnedOut;
    let newSparks = state.activeSparks.filter((spark) => spark.expiresAt > timestamp);

    if (newIsBurnedOut && newStrain === 0) {
      newIsBurnedOut = false;
      newSparks.push({
        id: `consolation-${Math.random().toString(36).slice(2, 10)}`,
        x: 50,
        y: 50,
        value: gameMechanics.getSparkReward(state.locCount, meta.sparkRewardMultiplier),
        expiresAt: timestamp + 10_000,
      });
    }

    if (newSparks.length < 3 && gameMechanics.rollForSpark(newStrain, deltaSeconds, meta.sparkChanceMultiplier)) {
      newSparks.push({
        id: Math.random().toString(36).slice(2, 10),
        x: Math.floor(Math.random() * 75) + 10,
        y: Math.floor(Math.random() * 75) + 10,
        value: gameMechanics.getSparkReward(state.locCount, meta.sparkRewardMultiplier),
        expiresAt: timestamp + 8_000,
      });
    }

    let newBonusWord = state.activeBonusWord;
    let newBonusWordExpiresAt = state.bonusWordExpiresAt;
    let newBonusWordPosition = state.bonusWordPosition;
    if (newBonusWord && newBonusWordExpiresAt && timestamp > newBonusWordExpiresAt) {
      newBonusWord = null;
      newBonusWordExpiresAt = null;
      newBonusWordPosition = null;
    } else if (!newBonusWord && gameMechanics.rollForBonusWord(deltaSeconds)) {
      newBonusWord = BONUS_WORDS[Math.floor(Math.random() * BONUS_WORDS.length)];
      newBonusWordExpiresAt = timestamp + BONUS_WORD_DURATION;
      newBonusWordPosition = {
        x: Math.floor(Math.random() * 60) + 15,
        y: Math.floor(Math.random() * 60) + 15,
      };
    }

    // Combo decay
    const timeSinceLastTap = timestamp - state.lastTapTime;
    const newCombo = timeSinceLastTap > 1200 ? 0 : state.comboCount;

    // Event handling
    let newEvent = state.activeEvent;
    let newLastEventTime = state.lastEventTime;
    let eventStrainMult = 1;
    if (newEvent && timestamp > newEvent.endsAt) {
      newEvent = null;
    }
    if (!newEvent) {
      const timeSinceEvent = (timestamp - state.lastEventTime) / 1000;
      const threshold = EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN);
      if (timeSinceEvent > threshold && state.lastEventTime > 0) {
        const def = EVENT_DEFINITIONS[Math.floor(Math.random() * EVENT_DEFINITIONS.length)];
        if (def.id === "coffee_break") {
          newStrain = 0;
          newIsBurnedOut = false;
        }
        newEvent = { id: def.id, title: def.title, description: def.description, endsAt: timestamp + def.duration * 1000, duration: def.duration };
        newLastEventTime = timestamp;
      } else if (state.lastEventTime === 0) {
        newLastEventTime = timestamp;
      }
    }
    if (newEvent?.id === "bug_swarm") { eventStrainMult = 2; }

    // Achievement checks (only check unclaimed)
    const newAchievements = [...state.achievements];
    const stateForCheck = { ...state, locCount: state.locCount + earnedTokens, lifetimeLoc: state.lifetimeLoc + earnedTokens };
    for (const ach of ACHIEVEMENT_DEFINITIONS) {
      if (!newAchievements.includes(ach.id) && ach.check(stateForCheck)) {
        newAchievements.push(ach.id);
      }
    }

    set({
      locCount: state.locCount + earnedTokens,
      lifetimeLoc: state.lifetimeLoc + earnedTokens,
      locPerSecond: income.passivePerSecond,
      tapPower: income.tapPower,
      incomeMultiplier: income.incomeMultiplier,
      strainLevel: newStrain * eventStrainMult,
      isBurnedOut: newIsBurnedOut,
      activeSparks: newSparks,
      activeBonusWord: newBonusWord,
      bonusWordExpiresAt: newBonusWordExpiresAt,
      bonusWordPosition: newBonusWordPosition,
      cloudBurstActive: burstStillActive,
      cloudBurstEndsAt: newEndsAt,
      tokens: newTokens,
      lastTickTime: timestamp,
      comboCount: newCombo,
      totalTimePlayed: state.totalTimePlayed + deltaSeconds,
      activeEvent: newEvent,
      lastEventTime: newLastEventTime,
      achievements: newAchievements,
    });

    // Auto-buy logic
    const postState = get();
    const autoBuyTypes: UpgradeType[] = ["autoCoder", "server", "keyboard", "aiPair", "gitAutopilot", "ciPipeline", "observability"];
    for (const t of autoBuyTypes) {
      if (postState.autoBuyEnabled[t]) {
        const lvl = getUpgradeLevel(postState, t);
        const tierReq = getTierUnlockRequirement(Math.floor(lvl / 20) + 1);
        if (postState.lifetimeLoc < tierReq) continue;
        if (!isUpgradeUnlocked(postState, t)) continue;
        const metaEff = getMetaEffects(postState);
        const c = getUpgradeCost(lvl, { costMultiplier: getUpgradeCostMultiplier(t), metaDiscount: metaEff.costDiscount });
        if (postState.locCount >= c) {
          const isBasic = t === "autoCoder" || t === "server" || t === "keyboard";
          if (isBasic) {
            postState.purchaseUpgrade(t as "autoCoder" | "server" | "keyboard");
          } else {
            postState.purchaseHiddenUpgrade(t as "aiPair" | "gitAutopilot" | "ciPipeline" | "observability");
          }
        }
      }
    }

    void persistSnapshot(get());
  },

  collectSpark: (id: string) => {
    const state = get();
    const spark = state.activeSparks.find((entry) => entry.id === id);
    if (!spark) return;
    set({
      tokens: state.tokens + spark.value,
      activeSparks: state.activeSparks.filter((entry) => entry.id !== id),
      totalSparksCollected: state.totalSparksCollected + 1,
    });
    void persistSnapshot(get());
  },

  tapProgrammer: () => {
    const state = get();
    if (state.isBurnedOut || !state.hasHydrated) return;
    const now = Date.now();
    const meta = getMetaEffects(state);
    const burstStillActive = deriveEffectiveCloudBurstActive(state, now);
    const income = buildIncomeSnapshot(
      { ...state, cloudBurstActive: burstStillActive },
      burstStillActive
    );
    const aiReduction = Math.max(0.2, 1 - state.aiPairLevel * 0.15);
    const strainMultiplier = aiReduction * meta.strainMultiplier;
    const newStrain = gameMechanics.getNewStrain(state.strainLevel, strainMultiplier);

    const timeSinceLastTap = now - state.lastTapTime;
    const newCombo = timeSinceLastTap < 1200 ? state.comboCount + 1 : 1;
    const comboMultiplier = 1 + Math.min(newCombo, 50) * 0.02;
    const eventTapMult = state.activeEvent?.id === "code_rush" ? 3 : 1;
    const finalTapPower = income.tapPower * comboMultiplier * eventTapMult;

    set({
      locCount: state.locCount + finalTapPower,
      lifetimeLoc: state.lifetimeLoc + finalTapPower,
      tapPower: income.tapPower,
      incomeMultiplier: income.incomeMultiplier,
      strainLevel: newStrain,
      isBurnedOut: gameMechanics.isBurnedOut(newStrain),
      cloudBurstActive: burstStillActive,
      cloudBurstEndsAt: burstStillActive ? state.cloudBurstEndsAt : 0,
      comboCount: newCombo,
      lastTapTime: now,
      totalTaps: state.totalTaps + 1,
      highestCombo: Math.max(state.highestCombo, newCombo),
    });
    void persistSnapshot(get());
  },

  claimBonusWord: () => {
    const state = get();
    if (!state.activeBonusWord) return;
    const now = Date.now();
    const burstStillActive = deriveEffectiveCloudBurstActive(state, now);
    const income = buildIncomeSnapshot(
      { ...state, cloudBurstActive: burstStillActive },
      burstStillActive
    );
    const bonus = Math.max(50, Math.floor(state.locCount * 0.15)) * income.incomeMultiplier;
    set({
      locCount: state.locCount + bonus,
      lifetimeLoc: state.lifetimeLoc + bonus,
      activeBonusWord: null,
      bonusWordExpiresAt: null,
      bonusWordPosition: null,
      totalBonusWordsClaimed: state.totalBonusWordsClaimed + 1,
    });
    void persistSnapshot(get());
  },

  triggerRandomBonusWord: () => {
    const word = BONUS_WORDS[Math.floor(Math.random() * BONUS_WORDS.length)];
    set({
      activeBonusWord: word,
      bonusWordExpiresAt: Date.now() + BONUS_WORD_DURATION,
      bonusWordPosition: {
        x: Math.floor(Math.random() * 60) + 15,
        y: Math.floor(Math.random() * 60) + 15,
      },
    });
  },

  purchaseUpgrade: (type) => {
    const state = get();
    const typed = type as UpgradeType;
    if (!isUpgradeUnlocked(state, typed)) return;
    const level = getUpgradeLevel(state, typed);
    const meta = getMetaEffects(state);

    const bulkInfo = getBulkUpgradeInfo(
      level,
      state.buyMultiplier,
      state.locCount,
      state.lifetimeLoc,
      {
        costMultiplier: getUpgradeCostMultiplier(typed),
        metaDiscount: meta.costDiscount,
      }
    );

    if (!bulkInfo.isAffordable) return;
    if (bulkInfo.levelsGained === 0) return;

    const next = { locCount: state.locCount - bulkInfo.totalCost } as Partial<GameState>;
    if (type === "autoCoder") next.autoCoderLevel = state.autoCoderLevel + bulkInfo.levelsGained;
    if (type === "server") next.serverLevel = state.serverLevel + bulkInfo.levelsGained;
    if (type === "keyboard") next.keyboardLevel = state.keyboardLevel + bulkInfo.levelsGained;
    set(next);
    void persistSnapshot(get());
  },

  purchaseHiddenUpgrade: (type) => {
    const state = get();
    const typed = type as UpgradeType;
    if (!isUpgradeUnlocked(state, typed)) return;
    const level = getUpgradeLevel(state, typed);
    const meta = getMetaEffects(state);

    const bulkInfo = getBulkUpgradeInfo(
      level,
      state.buyMultiplier,
      state.locCount,
      state.lifetimeLoc,
      {
        costMultiplier: getUpgradeCostMultiplier(typed),
        metaDiscount: meta.costDiscount,
      }
    );

    if (!bulkInfo.isAffordable) return;
    if (bulkInfo.levelsGained === 0) return;

    const next = { locCount: state.locCount - bulkInfo.totalCost } as Partial<GameState>;
    if (type === "aiPair") next.aiPairLevel = state.aiPairLevel + bulkInfo.levelsGained;
    if (type === "gitAutopilot") next.gitAutopilotLevel = state.gitAutopilotLevel + bulkInfo.levelsGained;
    if (type === "ciPipeline") next.ciPipelineLevel = state.ciPipelineLevel + bulkInfo.levelsGained;
    if (type === "observability") next.observabilityLevel = state.observabilityLevel + bulkInfo.levelsGained;
    set(next);
    void persistSnapshot(get());
  },

  activateCloudBurst: () => {
    const state = get();
    const now = Date.now();
    if (deriveEffectiveCloudBurstActive(state, now)) {
      set({ cloudBurstActive: false, cloudBurstEndsAt: 0 });
      void persistSnapshot(get());
      return;
    }

    if (state.tokens < 1) return;
    set({
      cloudBurstActive: true,
      cloudBurstEndsAt: now + cloudBurstDurationMs(),
    });
    void persistSnapshot(get());
  },

  purchaseTokenUpgrade: () => {
    const state = get();
    if (state.tokenTechLevel >= 20) return;
    const cost = getTokenTechCost(state.tokenTechLevel);
    if (state.tokens < cost) return;
    set({
      tokens: state.tokens - cost,
      tokenTechLevel: state.tokenTechLevel + 1,
    });
    void persistSnapshot(get());
  },

  purchaseMetaNode: (nodeId: string) => {
    const state = get();
    const node = META_NODE_BY_ID[nodeId];
    if (!node) return;
    if (state.unlockedMetaNodes.includes(nodeId)) return;
    if (node.requires.some((parentId) => !state.unlockedMetaNodes.includes(parentId))) return;
    if (state.architecturePoints < node.cost) return;

    set({
      architecturePoints: state.architecturePoints - node.cost,
      unlockedMetaNodes: [...state.unlockedMetaNodes, nodeId],
      activeNotification: makeNotification("Meta Node Unlocked", `${node.title} activated`),
    });
    void persistSnapshot(get());
  },

  respecMetaTree: () => {
    const state = get();
    if (state.unlockedMetaNodes.length === 0) return;
    let refund = 0;
    state.unlockedMetaNodes.forEach((id) => {
      const node = META_NODE_BY_ID[id];
      if (node) refund += node.cost;
    });
    const penalty = Math.ceil(refund * 0.2);
    set({
      architecturePoints: Math.max(0, state.architecturePoints + refund - penalty),
      unlockedMetaNodes: [],
      activeNotification: makeNotification("Meta Tree Reset", `Refunded ${refund - penalty} AP`),
    });
    void persistSnapshot(get());
  },

  claimMilestone: (milestoneId: string) => {
    const state = get();
    if (state.milestoneClaims.includes(milestoneId)) return;
    const milestone = MILESTONES.find((entry) => entry.id === milestoneId);
    if (!milestone) return;
    if (!isMilestoneComplete(state, milestone)) return;

    const rewardLoc = milestone.rewardLoc ?? 0;
    const rewardTokens = milestone.rewardTokens ?? 0;
    const rewardArchitecturePoints = milestone.rewardArchitecturePoints ?? 0;

    set({
      locCount: state.locCount + rewardLoc,
      lifetimeLoc: state.lifetimeLoc + rewardLoc,
      tokens: state.tokens + rewardTokens,
      architecturePoints: state.architecturePoints + rewardArchitecturePoints,
      milestoneClaims: [...state.milestoneClaims, milestoneId],
      activeNotification: makeNotification(
        `Milestone: ${milestone.title}`,
        `+${formatNumber(rewardLoc)} LoC / +${formatNumber(rewardTokens)} Tokens / +${rewardArchitecturePoints} AP`
      ),
    });
    void persistSnapshot(get());
  },

  reboot: () => {
    const state = get();
    if (state.lifetimeLoc < REBOOT_THRESHOLD) return;

    const rebootBonusPoints = Math.max(
      1,
      Math.floor(Math.log10(Math.max(REBOOT_THRESHOLD, state.lifetimeLoc)) - 5)
    );
    const preservedMetaState = {
      architecturePoints: state.architecturePoints + rebootBonusPoints,
      unlockedMetaNodes: state.unlockedMetaNodes,
      milestoneClaims: state.milestoneClaims,
    };

    set({
      ...defaultState,
      hasHydrated: true,
      hydrationStarted: false,
      lastTickTime: Date.now(),
      tokenTechLevel: state.tokenTechLevel,
      rebootPrestigeLevel: state.rebootPrestigeLevel + 1,
      tokens: Math.floor(state.tokens * 0.5),
      rebootCount: state.rebootCount + 1,
      lifetimeLoc: state.lifetimeLoc,
      ...preservedMetaState,
      activeNotification: makeNotification("Reboot Complete", `+${rebootBonusPoints} Architecture Points`),
    });
    void persistSnapshot(get());
  },

  clearOfflineToast: () => {
    set({ offlineEarnedLoc: 0, offlineEarnedSeconds: 0 });
  },

  dismissNotification: () => {
    set({ activeNotification: null });
  },

  toggleAutoBuy: (type: string) => {
    const state = get();
    const current = state.autoBuyEnabled[type] ?? false;
    set({
      autoBuyEnabled: { ...state.autoBuyEnabled, [type]: !current },
    });
    void persistSnapshot(get());
  },

  setBuyMultiplier: (mult) => {
    set({ buyMultiplier: mult });
    void persistSnapshot(get());
  },

  setUseScientificNotation: (enabled: boolean) => {
    set({ useScientificNotation: enabled });
    void persistSnapshot(get());
  },

  resetSave: () => {
    set({ ...defaultState, hasHydrated: true, lastTickTime: Date.now() });
    void AsyncStorage.multiRemove([
      STORAGE_KEY_SAVE,
      STORAGE_KEY_SAVE_PREV,
      STORAGE_KEY_LAST_ACTIVE,
      STORAGE_KEY_SAVE_LEGACY_V2,
    ]);
  },

  exportSave: (): string => {
    const state = get();
    const save = serializePersistedSave(state);
    try {
      return btoa(JSON.stringify(save));
    } catch {
      return "";
    }
  },

  importSave: (encoded: string) => {
    const trimmed = encoded.trim();
    if (!trimmed) return { ok: false, error: "Empty save string." };

    let raw: unknown;
    try {
      const json = atob(trimmed);
      raw = JSON.parse(json);
    } catch {
      return { ok: false, error: "Invalid save format." };
    }

    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "Invalid save data." };
    }

    const record = raw as Record<string, unknown>;
    const des = deserializeSave(record);
    if (!des.ok) {
      return { ok: false, error: des.error };
    }

    const now = Date.now();

    set(des.fields);

    const liveState = get();
    const runtime = deriveRuntimeFromPersisted(liveState, now);

    set({
      locPerSecond: runtime.locPerSecond,
      tapPower: runtime.tapPower,
      incomeMultiplier: runtime.incomeMultiplier,
      cloudBurstActive: runtime.cloudBurstActive,
      cloudBurstEndsAt: runtime.cloudBurstActive ? liveState.cloudBurstEndsAt : 0,
      activeSparks: [],
      activeBonusWord: null,
      bonusWordExpiresAt: null,
      bonusWordPosition: null,
      activeEvent: null,
      activeNotification: null,
      offlineEarnedLoc: 0,
      offlineEarnedSeconds: 0,
      hasHydrated: true,
      hydrationStarted: false,
      lastTickTime: now,
    });

    void (async () => {
      try {
        const state = get();
        const saveState = serializePersistedSave(state);
        const prev = await AsyncStorage.getItem(STORAGE_KEY_SAVE);
        const entries: [string, string][] = [
          [STORAGE_KEY_SAVE, JSON.stringify(saveState)],
          [STORAGE_KEY_LAST_ACTIVE, now.toString()],
        ];
        if (prev) entries.push([STORAGE_KEY_SAVE_PREV, prev]);
        await AsyncStorage.multiSet(entries);
        lastPersistedAt = now;
      } catch {
        // ignore persist failures
      }
    })();

    return { ok: true };
  },
}));

export {
  ACHIEVEMENT_DEFINITIONS,
  EVENT_DEFINITIONS, getTokenTechCost, getTierUnlockRequirement, getUpgradeCostMultiplier,
  META_NODE_DEFINITIONS,
  MILESTONES, REBOOT_THRESHOLD
};

