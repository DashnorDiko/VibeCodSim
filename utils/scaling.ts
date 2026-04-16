const BASE_COST = 10;
const BASE_SCALING_FACTOR = 1.15;
const SOFTCAP_LEVEL = 30;
const SOFTCAP_SCALING_FACTOR = 1.2;
const HARD_SOFTCAP_LEVEL = 70;
const HARD_SOFTCAP_SCALING_FACTOR = 1.24;

export type UpgradeType =
  | "autoCoder"
  | "server"
  | "keyboard"
  | "aiPair"
  | "gitAutopilot"
  | "cloudBurst"
  | "ciPipeline"
  | "observability";

export interface UpgradeCostOptions {
  costMultiplier?: number;
  metaDiscount?: number; // 0.1 => 10% discount
}

const getBaseTierMultiplier = (tier: number): number => {
  if (tier <= 1) return 1;
  // Every tier doubles the baseline cost pressure.
  return Math.pow(2, tier - 1);
};

/**
 * Returns the cost of the next upgrade level.
 * Includes tier pressure and late-level softcaps to prevent runaway scaling.
 */
export const getUpgradeCost = (
  level: number,
  options: UpgradeCostOptions = {}
): number => {
  const { costMultiplier = 1, metaDiscount = 0 } = options;
  const safeLevel = Math.max(0, Math.floor(level));
  const tier = getUpgradeTier(safeLevel);

  let baseCost = BASE_COST * getBaseTierMultiplier(tier);

  if (safeLevel <= SOFTCAP_LEVEL) {
    baseCost *= Math.pow(BASE_SCALING_FACTOR, safeLevel);
  } else if (safeLevel <= HARD_SOFTCAP_LEVEL) {
    const firstBand = Math.pow(BASE_SCALING_FACTOR, SOFTCAP_LEVEL);
    const secondBand = Math.pow(
      SOFTCAP_SCALING_FACTOR,
      safeLevel - SOFTCAP_LEVEL
    );
    baseCost *= firstBand * secondBand;
  } else {
    const firstBand = Math.pow(BASE_SCALING_FACTOR, SOFTCAP_LEVEL);
    const secondBand = Math.pow(
      SOFTCAP_SCALING_FACTOR,
      HARD_SOFTCAP_LEVEL - SOFTCAP_LEVEL
    );
    const thirdBand = Math.pow(
      HARD_SOFTCAP_SCALING_FACTOR,
      safeLevel - HARD_SOFTCAP_LEVEL
    );
    baseCost *= firstBand * secondBand * thirdBand;
  }

  const discounted = baseCost * costMultiplier * (1 - Math.min(0.5, Math.max(0, metaDiscount)));
  return Math.max(1, Math.floor(discounted));
};

export const getUpgradeTier = (level: number): number => {
  return 1 + Math.floor(Math.max(0, level) / 20);
};

export const getUpgradeTierLabel = (level: number): string => {
  const tier = getUpgradeTier(level);
  return `T${tier}`;
};

export const getTierUnlockRequirement = (tier: number): number => {
  const safeTier = Math.max(1, Math.floor(tier));
  if (safeTier <= 1) return 0;
  return Math.floor(50_000 * Math.pow(5, safeTier - 2));
};

export const getUpgradeUnlockRequirement = (
  type: UpgradeType
): { lifetimeLoc?: number; rebootCount?: number } => {
  if (type === "aiPair") return { lifetimeLoc: 500 };
  if (type === "gitAutopilot") return { lifetimeLoc: 5_000 };
  if (type === "cloudBurst") return { lifetimeLoc: 50_000 };
  if (type === "ciPipeline") return { lifetimeLoc: 250_000, rebootCount: 1 };
  if (type === "observability") return { lifetimeLoc: 1_000_000, rebootCount: 2 };
  return {};
};

export type BuyMultiplier = 1 | 10 | 100 | "MAX";

export interface BulkPurchaseInfo {
  totalCost: number;
  levelsGained: number;
  isAffordable: boolean;
  isTierLocked: boolean; // true edhe nqs do kapej tier lock psh te upgrade i 3 nqs po ben 10x
  nextSingleCost: number;
}

export const getBulkUpgradeInfo = (
  currentLevel: number,
  targetAmount: BuyMultiplier,
  availableTokens: number,
  lifetimeLoc: number,
  options: UpgradeCostOptions = {}
): BulkPurchaseInfo => {
  let totalCost = 0;
  let levelsGained = 0;
  let simulatedLevel = currentLevel;
  let isTierLocked = false;
  
  const maxIterations = targetAmount === "MAX" ? 10_000 : targetAmount;

  for (let i = 0; i < maxIterations; i++) {
    const tierReq = getTierUnlockRequirement(Math.floor(simulatedLevel / 20) + 1);
    if (lifetimeLoc < tierReq) {
      if (levelsGained === 0) isTierLocked = true;
      break;
    }

    const nextCost = getUpgradeCost(simulatedLevel, options);
    
    if (targetAmount === "MAX" && totalCost + nextCost > availableTokens) {
      break;
    }

    totalCost += nextCost;
    simulatedLevel++;
    levelsGained++;
  }

  if (levelsGained === 0) {
    totalCost = getUpgradeCost(currentLevel, options);
  }

  let isAffordable = false;
  if (targetAmount === "MAX") {
    isAffordable = levelsGained > 0;
  } else {
    isAffordable = levelsGained > 0 && availableTokens >= totalCost;
  }

  const nextSingleCost = getUpgradeCost(currentLevel + levelsGained, options);

  return {
    totalCost,
    levelsGained,
    isAffordable,
    isTierLocked,
    nextSingleCost,
  };
};
