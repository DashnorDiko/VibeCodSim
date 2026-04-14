import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUpgradeCost } from "../utils/scaling";
import { gameMechanics } from "../utils/mechanics";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Spark {
  id: string;
  x: number;
  y: number;
  value: number;
  expiresAt: number;
}

interface GameState {
  // Core resources
  neuralTokens: number;

  // Upgrade levels
  autoCoderLevel: number;
  serverLevel: number;
  keyboardLevel: number;

  // Hidden discovery upgrades
  aiPairLevel: number;       // Unlocks at 500 LoC — reduces strain per action
  gitAutopilotLevel: number; // Unlocks at 5,000 LoC — extra passive LoC/sec multiplier
  cloudBurstActive: boolean; // Unlocks at 50,000 LoC — temp 2x income boost
  cloudBurstCooldown: number;// timestamp when next burst is available (0 = ready)

  // Strain / burnout
  strainLevel: number;
  isBurnedOut: boolean;

  // Spark pickups
  activeSparks: Spark[];

  // Prestige currency
  energyDrinks: number;
  energyTechLevel: number;

  // Reboot (prestige reset)
  rebootCount: number;

  // Bonus word tap mechanic
  activeBonusWord: string | null;
  bonusWordExpiresAt: number | null;
  bonusWordPosition: { x: number; y: number } | null;

  // Game loop
  lastTickTime: number;

  // Offline earning result (used by toast, cleared after shown)
  offlineEarnedTokens: number;
  offlineEarnedSeconds: number;
}

interface GameActions {
  tapProgrammer: () => void;
  purchaseUpgrade: (type: "autoCoder" | "server" | "keyboard") => void;
  purchaseHiddenUpgrade: (type: "aiPair" | "gitAutopilot") => void;
  activateCloudBurst: () => void;
  triggerRandomBonusWord: () => void;
  claimBonusWord: () => void;
  masterTick: (timestamp: number) => void;
  collectSpark: (id: string) => void;
  purchaseEnergyUpgrade: () => void;
  reboot: () => void;
  clearOfflineToast: () => void;
}

type GameStore = GameState & GameActions;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BONUS_WORDS = [
  "function", "await", "async", "interface", "yield",
  "class", "useEffect", "const", "return", "catch",
  "deploy", "commit", "push", "refactor", "debug",
];
const BONUS_WORD_DURATION = 5000; // 5 seconds to tap
const MAX_OFFLINE_SECONDS = 4 * 60 * 60; // cap at 4 hours
const CLOUD_BURST_DURATION = 30; // seconds of active 2x boost
const CLOUD_BURST_COOLDOWN = 3 * 60; // 3 min cooldown in seconds
const REBOOT_THRESHOLD = 1_000_000;
const STORAGE_KEY = "vibecodesim_last_active";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: prestige multiplier with soft cap
// ─────────────────────────────────────────────────────────────────────────────
const getPrestigeMultiplier = (energyTechLevel: number): number => {
  // +20% per level with diminishing returns — never goes infinite
  return 1 + (energyTechLevel * 0.2) * (1 / (1 + energyTechLevel * 0.05));
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: energy tech upgrade cost (starts at 5 Cans, scales by 2.5x per level)
// ─────────────────────────────────────────────────────────────────────────────
const getEnergyTechCost = (level: number): number => {
  return Math.floor(5 * Math.pow(2.5, level));
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  // --- Initial State ---
  neuralTokens: 0,
  autoCoderLevel: 0,
  serverLevel: 0,
  keyboardLevel: 0,
  aiPairLevel: 0,
  gitAutopilotLevel: 0,
  cloudBurstActive: false,
  cloudBurstCooldown: 0,
  strainLevel: 0,
  isBurnedOut: false,
  activeSparks: [],
  lastTickTime: 0,
  energyDrinks: 0,
  energyTechLevel: 0,
  rebootCount: 0,
  activeBonusWord: null,
  bonusWordExpiresAt: null,
  bonusWordPosition: null,
  offlineEarnedTokens: 0,
  offlineEarnedSeconds: 0,

  // ─────────────────────────────────────────────────────────────────────────
  // masterTick — main game loop
  // ─────────────────────────────────────────────────────────────────────────
  masterTick: (timestamp: number) => {
    const state = get();

    // First tick — handle offline progress
    if (state.lastTickTime === 0) {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (raw) {
          const lastActive = parseInt(raw, 10);
          const gapMs = Date.now() - lastActive;
          const gapSeconds = Math.min(MAX_OFFLINE_SECONDS, gapMs / 1000);

          if (gapSeconds > 5 && state.serverLevel > 0) {
            const prestigeMultiplier = getPrestigeMultiplier(state.energyTechLevel);
            const gitBonus = 1 + state.gitAutopilotLevel * 0.1;
            const offlineEarned =
              state.serverLevel * 0.5 * prestigeMultiplier * gitBonus * gapSeconds;

            set({
              neuralTokens: state.neuralTokens + offlineEarned,
              offlineEarnedTokens: offlineEarned,
              offlineEarnedSeconds: gapSeconds,
              lastTickTime: timestamp,
            });
            return;
          }
        }
        set({ lastTickTime: timestamp });
      });
      return;
    }

    const deltaSeconds = (timestamp - state.lastTickTime) / 1000;

    const prestigeMultiplier = getPrestigeMultiplier(state.energyTechLevel);
    const gitBonus = 1 + state.gitAutopilotLevel * 0.1;
    const cloudMultiplier = state.cloudBurstActive ? 2 : 1;

    // Server passive generation
    let earnedTokens =
      state.serverLevel > 0
        ? state.serverLevel * 0.5 * prestigeMultiplier * gitBonus * cloudMultiplier * deltaSeconds
        : 0;

    // Strain decay
    let newStrain = gameMechanics.decayStrain(state.strainLevel, deltaSeconds);
    let newIsBurnedOut = state.isBurnedOut;
    let newSparks = [...state.activeSparks];

    // Burnout recovery → consolation spark
    if (newIsBurnedOut && newStrain === 0) {
      newIsBurnedOut = false;
      const consolationSpark: Spark = {
        id: "consolation-" + Math.random().toString(36).substr(2, 9),
        x: 50,
        y: 50,
        value: gameMechanics.getSparkReward(state.neuralTokens),
        expiresAt: timestamp + 10000,
      };
      newSparks = [...newSparks, consolationSpark];
    }

    // Spark expiration (after consolation insert)
    newSparks = newSparks.filter((s) => s.expiresAt > timestamp);

    // Roll for new Spark
    if (gameMechanics.rollForSpark(newStrain) && newSparks.length < 3) {
      const spark: Spark = {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.floor(Math.random() * 75) + 10,
        y: Math.floor(Math.random() * 75) + 10,
        value: gameMechanics.getSparkReward(state.neuralTokens),
        expiresAt: timestamp + 8000,
      };
      newSparks.push(spark);
    }

    // Cloud Burst auto-deactivate
    let newCloudBurstActive = state.cloudBurstActive;
    if (
      state.cloudBurstActive &&
      state.cloudBurstCooldown > 0 &&
      timestamp >= state.cloudBurstCooldown - CLOUD_BURST_COOLDOWN * 1000
    ) {
      newCloudBurstActive = false;
    }

    // Bonus word tap expiry
    let newBonusWord = state.activeBonusWord;
    let newBonusWordExpiresAt = state.bonusWordExpiresAt;
    let newBonusWordPosition = state.bonusWordPosition;

    if (newBonusWord && newBonusWordExpiresAt && timestamp > newBonusWordExpiresAt) {
      // Expired — clear it
      newBonusWord = null;
      newBonusWordExpiresAt = null;
      newBonusWordPosition = null;
    } else if (!newBonusWord && Math.random() < 0.04 * deltaSeconds) {
      // Random roll for new bonus word (~4% per second)
      newBonusWord = BONUS_WORDS[Math.floor(Math.random() * BONUS_WORDS.length)];
      newBonusWordExpiresAt = timestamp + BONUS_WORD_DURATION;
      newBonusWordPosition = {
        x: Math.floor(Math.random() * 60) + 15,
        y: Math.floor(Math.random() * 60) + 15,
      };
    }

    // Persist last active timestamp every tick for offline calc
    AsyncStorage.setItem(STORAGE_KEY, Date.now().toString());

    set({
      neuralTokens: state.neuralTokens + earnedTokens,
      strainLevel: newStrain,
      isBurnedOut: newIsBurnedOut,
      activeSparks: newSparks,
      activeBonusWord: newBonusWord,
      bonusWordExpiresAt: newBonusWordExpiresAt,
      bonusWordPosition: newBonusWordPosition,
      cloudBurstActive: newCloudBurstActive,
      lastTickTime: timestamp,
    });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  collectSpark: (id: string) => {
    const state = get();
    const spark = state.activeSparks.find((s) => s.id === id);
    if (spark) {
      set({
        energyDrinks: state.energyDrinks + spark.value,
        activeSparks: state.activeSparks.filter((s) => s.id !== id),
      });
    }
  },

  tapProgrammer: () => {
    const state = get();
    if (state.isBurnedOut) return;

    const prestigeMultiplier = getPrestigeMultiplier(state.energyTechLevel);
    const cloudMultiplier = state.cloudBurstActive ? 2 : 1;
    const clickPower =
      (1 + state.autoCoderLevel * 0.5) * prestigeMultiplier * cloudMultiplier;

    // AI Pair reduces strain by 15% per level
    const strainReduction = 1 - state.aiPairLevel * 0.15;
    const effectiveStrain = Math.max(0.2, strainReduction);
    const newStrain = Math.min(
      100,
      state.strainLevel + 1.2 * effectiveStrain
    );

    set({
      neuralTokens: state.neuralTokens + clickPower,
      strainLevel: newStrain,
      isBurnedOut: gameMechanics.isBurnedOut(newStrain),
    });
  },

  claimBonusWord: () => {
    const state = get();
    if (!state.activeBonusWord) return;

    const prestigeMultiplier = getPrestigeMultiplier(state.energyTechLevel);
    const cloudMultiplier = state.cloudBurstActive ? 2 : 1;
    const bonus =
      Math.max(50, Math.floor(state.neuralTokens * 0.15)) *
      prestigeMultiplier *
      cloudMultiplier;

    set({
      neuralTokens: state.neuralTokens + bonus,
      activeBonusWord: null,
      bonusWordExpiresAt: null,
      bonusWordPosition: null,
    });
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
    let currentLevel = 0;

    if (type === "autoCoder") currentLevel = state.autoCoderLevel;
    if (type === "server") currentLevel = state.serverLevel;
    if (type === "keyboard") currentLevel = state.keyboardLevel;

    const cost =
      getUpgradeCost(currentLevel) *
      (type === "server" ? 2 : type === "keyboard" ? 1.5 : 1);

    if (state.neuralTokens < cost) return;

    if (type === "autoCoder") set({ neuralTokens: state.neuralTokens - cost, autoCoderLevel: currentLevel + 1 });
    if (type === "server") set({ neuralTokens: state.neuralTokens - cost, serverLevel: currentLevel + 1 });
    if (type === "keyboard") set({ neuralTokens: state.neuralTokens - cost, keyboardLevel: currentLevel + 1 });
  },

  purchaseHiddenUpgrade: (type) => {
    const state = get();

    if (type === "aiPair") {
      const cost = getUpgradeCost(state.aiPairLevel) * 3;
      if (state.neuralTokens < cost) return;
      set({ neuralTokens: state.neuralTokens - cost, aiPairLevel: state.aiPairLevel + 1 });
    }

    if (type === "gitAutopilot") {
      const cost = getUpgradeCost(state.gitAutopilotLevel) * 5;
      if (state.neuralTokens < cost) return;
      set({ neuralTokens: state.neuralTokens - cost, gitAutopilotLevel: state.gitAutopilotLevel + 1 });
    }
  },

  activateCloudBurst: () => {
    const state = get();
    const now = Date.now();
    // Cost: 1 energy drink
    if (state.energyDrinks < 1) return;
    if (state.cloudBurstCooldown > now) return; // still on cooldown

    set({
      energyDrinks: state.energyDrinks - 1,
      cloudBurstActive: true,
      cloudBurstCooldown: now + CLOUD_BURST_COOLDOWN * 1000,
    });

    // Auto-deactivate after duration
    setTimeout(() => {
      set({ cloudBurstActive: false });
    }, CLOUD_BURST_DURATION * 1000);
  },

  purchaseEnergyUpgrade: () => {
    const state = get();
    if (state.energyTechLevel >= 20) return; // hard cap
    const cost = getEnergyTechCost(state.energyTechLevel);
    if (state.energyDrinks < cost) return;

    set({
      energyDrinks: state.energyDrinks - cost,
      energyTechLevel: state.energyTechLevel + 1,
    });
  },

  reboot: () => {
    const state = get();
    if (state.neuralTokens < REBOOT_THRESHOLD) return;

    set({
      // Reset core progress
      neuralTokens: 0,
      autoCoderLevel: 0,
      serverLevel: 0,
      keyboardLevel: 0,
      aiPairLevel: 0,
      gitAutopilotLevel: 0,
      strainLevel: 0,
      isBurnedOut: false,
      activeSparks: [],
      activeBonusWord: null,
      bonusWordExpiresAt: null,
      bonusWordPosition: null,
      cloudBurstActive: false,
      // Preserve prestige — and grant +1 tech level for the reset
      energyTechLevel: state.energyTechLevel + 1,
      // Preserve energy drinks (partial carry)
      energyDrinks: Math.floor(state.energyDrinks * 0.5),
      // Increment reboot counter
      rebootCount: state.rebootCount + 1,
    });
  },

  clearOfflineToast: () => {
    set({ offlineEarnedTokens: 0, offlineEarnedSeconds: 0 });
  },
}));

// Export constants needed by UI components
export { REBOOT_THRESHOLD, getEnergyTechCost };
