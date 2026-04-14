const BASE_COST = 15;
const SCALING_FACTOR = 1.15;

/**
 * Returns the cost of the next upgrade at the given level.
 * Uses standard idle-game exponential scaling: baseCost * scalingFactor^level
 *
 * Level 0 → 15, Level 1 → 17, Level 5 → 30, Level 10 → 60, Level 20 → 245
 */
export const getUpgradeCost = (level: number): number => {
  return Math.floor(BASE_COST * Math.pow(SCALING_FACTOR, level));
};
