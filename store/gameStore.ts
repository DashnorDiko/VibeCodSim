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

interface MetaEffects {
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

interface GameState {
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

  // Stats
  totalTaps: number;
  totalSparksCollected: number;
  totalBonusWordsClaimed: number;
  highestCombo: number;
  totalTimePlayed: number;

  // Achievements
  achievements: string[];

  // Random events
  activeEvent: ActiveEvent | null;
  lastEventTime: number;

  // Auto-buy
  autoBuyEnabled: Record<string, boolean>;

  lastTickTime: number;
  offlineEarnedLoc: number;
  offlineEarnedSeconds: number;

  buyMultiplier: BuyMultiplier;
  useScientificNotation: boolean;
}

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

const SAVE_VERSION = 2;
const STORAGE_KEY_LAST_ACTIVE = "vibecodesim_last_active";
const STORAGE_KEY_SAVE = "vibecodesim_save_v2";

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
const MAX_OFFLINE_SECONDS = 4 * 60 * 60;
const CLOUD_BURST_DURATION = 30;
const CLOUD_BURST_COOLDOWN = 45;
const REBOOT_THRESHOLD = 1_000_000;
const SAVE_THROTTLE_MS = 1200;
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
    requires: ["couponCompiler"],
  },
  {
    id: "architectMind",
    title: "Architect Mind",
    description: "15% global income boost",
    cost: 5,
    requires: ["sparkMagnet", "burstDaemon"],
  },
  {
    id: "test",
    title: "ti qr tailwindit",
    description: "test",
    cost: 69,
    requires: ["architectMind"],
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

const getPrestigeMultiplier = (tokenTechLevel: number, rebootPrestigeLevel: number): number => {
  const shopBonus = tokenTechLevel * 0.2 * (1 / (1 + tokenTechLevel * 0.05));
  const rebootBonus = rebootPrestigeLevel * 0.15 * (1 / (1 + rebootPrestigeLevel * 0.03));
  return 1 + shopBonus + rebootBonus;
};

const getTokenTechCost = (level: number): number => {
  return Math.floor(5 * Math.pow(2.5, level));
};

const makeNotification = (title: string, message: string): GameNotification => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title,
  message,
});

const getMetaEffects = (state: Pick<GameState, "unlockedMetaNodes">): MetaEffects => {
  const has = (id: string) => state.unlockedMetaNodes.includes(id);
  return {
    tapMultiplier: has("architectMind") ? 1.15 : 1,
    passiveMultiplier: (has("threadOptimizer") ? 1.18 : 1) * (has("architectMind") ? 1.15 : 1),
    costDiscount: has("couponCompiler") ? 0.12 : 0,
    sparkChanceMultiplier: has("sparkMagnet") ? 1.25 : 1,
    sparkRewardMultiplier: has("sparkMagnet") ? 1.3 : 1,
    strainMultiplier: has("steadyHands") ? 0.9 : 1,
    cloudBurstMultiplierBonus: has("burstDaemon") ? 1 : 0,
  };
};

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

const buildIncomeSnapshot = (
  state: GameState,
  includeCloudBurst: boolean
): { passivePerSecond: number; tapPower: number; incomeMultiplier: number } => {
  const meta = getMetaEffects(state);
  const prestigeMultiplier = getPrestigeMultiplier(state.tokenTechLevel, state.rebootPrestigeLevel);
  const gitBonus = 1 + state.gitAutopilotLevel * 0.1;
  const ciBonus = 1 + state.ciPipelineLevel * 0.2;
  const obsBonus = 1 + state.observabilityLevel * 0.35;
  const cloudMultiplier = includeCloudBurst ? (2 + meta.cloudBurstMultiplierBonus) : 1;

  const passivePerSecond =
    (state.serverLevel * 0.5 + state.autoCoderLevel * 0.3 + state.keyboardLevel * 0.18) *
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

const isMilestoneComplete = (state: GameState, milestone: MilestoneDefinition): boolean => {
  if (milestone.lifetimeLoc && state.lifetimeLoc < milestone.lifetimeLoc) {
    return false;
  }
  if (milestone.rebootCount && state.rebootCount < milestone.rebootCount) {
    return false;
  }
  return true;
};

const getPersistedState = (state: GameState) => {
  return {
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
  };
};

const persistSnapshot = async (state: GameState) => {
  const now = Date.now();
  if (now - lastPersistedAt < SAVE_THROTTLE_MS) return;
  const saveState = getPersistedState(state);
  await AsyncStorage.multiSet([
    [STORAGE_KEY_SAVE, JSON.stringify(saveState)],
    [STORAGE_KEY_LAST_ACTIVE, now.toString()],
  ]);
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

const clampNum = (v: unknown, min: number, max: number, fallback: number): number => {
  if (typeof v !== "number" || !isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
};

const validateSave = (raw: Record<string, unknown>): Partial<GameState> => {
  const MAX_SAFE = 1e18;
  return {
    locCount: clampNum(raw.locCount ?? raw.neuralTokens, 0, MAX_SAFE, 0),
    lifetimeLoc: clampNum(raw.lifetimeLoc ?? raw.lifetimeTokens, 0, MAX_SAFE, 0),
    autoCoderLevel: clampNum(raw.autoCoderLevel, 0, 999, 0),
    serverLevel: clampNum(raw.serverLevel, 0, 999, 0),
    keyboardLevel: clampNum(raw.keyboardLevel, 0, 999, 0),
    aiPairLevel: clampNum(raw.aiPairLevel, 0, 999, 0),
    gitAutopilotLevel: clampNum(raw.gitAutopilotLevel, 0, 999, 0),
    ciPipelineLevel: clampNum(raw.ciPipelineLevel, 0, 999, 0),
    observabilityLevel: clampNum(raw.observabilityLevel, 0, 999, 0),
    cloudBurstCooldown: clampNum(raw.cloudBurstCooldown, 0, MAX_SAFE, 0),
    cloudBurstEndsAt: clampNum(raw.cloudBurstEndsAt, 0, MAX_SAFE, 0),
    strainLevel: clampNum(raw.strainLevel, 0, 100, 0),
    isBurnedOut: typeof raw.isBurnedOut === "boolean" ? raw.isBurnedOut : false,
    tokens: clampNum(raw.tokens ?? raw.energyDrinks, 0, MAX_SAFE, 0),
    tokenTechLevel: clampNum(raw.tokenTechLevel ?? raw.energyTechLevel, 0, 20, 0),
    rebootPrestigeLevel: clampNum(raw.rebootPrestigeLevel, 0, 999, 0),
    rebootCount: clampNum(raw.rebootCount, 0, 999, 0),
    architecturePoints: clampNum(raw.architecturePoints, 0, MAX_SAFE, 0),
    unlockedMetaNodes: Array.isArray(raw.unlockedMetaNodes) ? raw.unlockedMetaNodes.filter((v): v is string => typeof v === "string") : [],
    milestoneClaims: Array.isArray(raw.milestoneClaims) ? raw.milestoneClaims.filter((v): v is string => typeof v === "string") : [],
    comboCount: clampNum(raw.comboCount, 0, 9999, 0),
    lastTapTime: clampNum(raw.lastTapTime, 0, MAX_SAFE, 0),
    totalTaps: clampNum(raw.totalTaps, 0, MAX_SAFE, 0),
    totalSparksCollected: clampNum(raw.totalSparksCollected, 0, MAX_SAFE, 0),
    totalBonusWordsClaimed: clampNum(raw.totalBonusWordsClaimed, 0, MAX_SAFE, 0),
    highestCombo: clampNum(raw.highestCombo, 0, 9999, 0),
    totalTimePlayed: clampNum(raw.totalTimePlayed, 0, MAX_SAFE, 0),
    achievements: Array.isArray(raw.achievements) ? raw.achievements.filter((v): v is string => typeof v === "string") : [],
    lastEventTime: clampNum(raw.lastEventTime, 0, MAX_SAFE, 0),
    autoBuyEnabled: (typeof raw.autoBuyEnabled === "object" && raw.autoBuyEnabled !== null) ? raw.autoBuyEnabled as Record<string, boolean> : {},
    buyMultiplier: [1, 10, 100, "MAX"].includes(raw.buyMultiplier as any) ? (raw.buyMultiplier as BuyMultiplier) : 1,
    useScientificNotation: typeof raw.useScientificNotation === "boolean" ? raw.useScientificNotation : false,
  };
};

const bootHydration = async (
  now: number,
  set: (partial: Partial<GameState>) => void,
  get: () => GameStore
) => {
  try {
    const [[, saveRaw], [, lastActiveRaw]] = await AsyncStorage.multiGet([
      STORAGE_KEY_SAVE,
      STORAGE_KEY_LAST_ACTIVE,
    ]);

    if (saveRaw) {
      const raw = JSON.parse(saveRaw) as Record<string, unknown>;
      set(validateSave(raw));
    }

    const liveState = get();
    const lastActive = lastActiveRaw ? parseInt(lastActiveRaw, 10) : 0;
    const gapSeconds = lastActive
      ? Math.min(MAX_OFFLINE_SECONDS, (Date.now() - lastActive) / 1000)
      : 0;

    const effectiveBurstActive = liveState.cloudBurstActive;
    const snapshot = buildIncomeSnapshot(
      { ...liveState, cloudBurstActive: effectiveBurstActive },
      effectiveBurstActive
    );
    const offlineEarned =
      gapSeconds > 5 ? snapshot.passivePerSecond * gapSeconds : 0;

    set({
      locCount: liveState.locCount + offlineEarned,
      lifetimeLoc: liveState.lifetimeLoc + offlineEarned,
      offlineEarnedLoc: offlineEarned,
      offlineEarnedSeconds: gapSeconds,
      locPerSecond: snapshot.passivePerSecond,
      tapPower: snapshot.tapPower,
      incomeMultiplier: snapshot.incomeMultiplier,
      cloudBurstActive: effectiveBurstActive,
      hasHydrated: true,
      hydrationStarted: false,
      lastTickTime: now,
    });

    await persistSnapshot(get());
  } catch {
    set({
      hasHydrated: true,
      hydrationStarted: false,
      lastTickTime: now,
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
    let burstStillActive = state.cloudBurstActive;
    let newTokens = state.tokens;
    if (burstStillActive) {
      const drain = newTokens * 0.01 * deltaSeconds;
      newTokens = Math.max(0, newTokens - drain);
      if (newTokens < 0.01) {
        newTokens = 0;
        burstStillActive = false;
      }
    }
    const income = buildIncomeSnapshot(state, burstStillActive);
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
    let eventSparkMult = 1;
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
    if (newEvent?.id === "bug_swarm") { eventStrainMult = 2; eventSparkMult = 3; }

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
    const burstStillActive = state.cloudBurstActive;
    const income = buildIncomeSnapshot(state, burstStillActive);
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
    const burstStillActive = state.cloudBurstActive;
    const income = buildIncomeSnapshot(state, burstStillActive);
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
    if (state.cloudBurstActive) {
      set({ cloudBurstActive: false });
      void persistSnapshot(get());
      return;
    }

    if (state.tokens < 1) return;
    set({ cloudBurstActive: true });
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
    void AsyncStorage.multiRemove([STORAGE_KEY_SAVE, STORAGE_KEY_LAST_ACTIVE]);
  },

  exportSave: (): string => {
    const state = get();
    const save = getPersistedState(state);
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
    if (typeof record.saveVersion !== "number") {
      return { ok: false, error: "Save version missing or invalid." };
    }

    const now = Date.now();

    // Apply validated persisted fields first.
    set(validateSave(record));

    // Recompute derived/runtime fields and clear ephemeral UI/gameplay fields.
    const liveState = get();
    const effectiveBurstActive =
      liveState.cloudBurstEndsAt > 0 && now < liveState.cloudBurstEndsAt;
    const snapshot = buildIncomeSnapshot(
      { ...liveState, cloudBurstActive: effectiveBurstActive },
      effectiveBurstActive
    );

    set({
      locPerSecond: snapshot.passivePerSecond,
      tapPower: snapshot.tapPower,
      incomeMultiplier: snapshot.incomeMultiplier,
      cloudBurstActive: effectiveBurstActive,
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
        const saveState = getPersistedState(state);
        await AsyncStorage.multiSet([
          [STORAGE_KEY_SAVE, JSON.stringify(saveState)],
          [STORAGE_KEY_LAST_ACTIVE, now.toString()],
        ]);
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

