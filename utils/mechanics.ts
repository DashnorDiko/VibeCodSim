const MAX_STRAIN = 100;
const STRAIN_DECAY_RATE = 4; // strain lost per second
const STRAIN_PER_KEYSTROKE = 1.2;
const BASE_SPARK_CHANCE_PER_SECOND = 0.0045;

export const gameMechanics = {
  maxStrain: MAX_STRAIN,
  strainPerKeystroke: STRAIN_PER_KEYSTROKE,
  strainDecayRate: STRAIN_DECAY_RATE,

  getNewStrain: (currentStrain: number, multiplier = 1): number => {
    return Math.min(
      MAX_STRAIN,
      currentStrain + STRAIN_PER_KEYSTROKE * Math.max(0.05, multiplier)
    );
  },

  decayStrain: (currentStrain: number, deltaSeconds: number): number => {
    return Math.max(0, currentStrain - STRAIN_DECAY_RATE * deltaSeconds);
  },

  isBurnedOut: (strainLevel: number): boolean => {
    return strainLevel >= MAX_STRAIN;
  },

  rollForSpark: (
    strainLevel: number,
    deltaSeconds: number,
    sparkChanceMultiplier = 1
  ): boolean => {
    // Time-normalized probability to avoid framerate dependency.
    const strainMultiplier = 1 + (strainLevel / MAX_STRAIN) * 9;
    const chancePerSecond =
      BASE_SPARK_CHANCE_PER_SECOND * strainMultiplier * sparkChanceMultiplier;
    const safeDelta = Math.max(0, Math.min(2, deltaSeconds));
    const frameChance = 1 - Math.pow(1 - Math.min(0.95, chancePerSecond), safeDelta);
    return Math.random() < frameChance;
  },

  rollForBonusWord: (deltaSeconds: number): boolean => {
    const chancePerSecond = 0.035;
    const safeDelta = Math.max(0, Math.min(2, deltaSeconds));
    const frameChance = 1 - Math.pow(1 - chancePerSecond, safeDelta);
    return Math.random() < frameChance;
  },

  getSparkReward: (
    neuralTokens: number,
    rewardMultiplier = 1
  ): number => {
    const base = Math.max(150, Math.floor(neuralTokens * 0.15));
    return Math.max(150, Math.floor(base * rewardMultiplier));
  },
};
