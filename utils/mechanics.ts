// utils/mechanics.ts

const MAX_STRAIN = 100;
const STRAIN_DECAY_RATE = 2.5; // strain lost per second
const STRAIN_PER_KEYSTROKE = 1.2;

export const gameMechanics = {
  getNewStrain: (currentStrain: number): number => {
    return Math.min(MAX_STRAIN, currentStrain + STRAIN_PER_KEYSTROKE);
  },

  decayStrain: (currentStrain: number, deltaSeconds: number): number => {
    return Math.max(0, currentStrain - STRAIN_DECAY_RATE * deltaSeconds);
  },

  isBurnedOut: (strainLevel: number): boolean => {
    return strainLevel >= MAX_STRAIN;
  },

  rollForSpark: (strainLevel: number): boolean => {
    // Base 0.5% chance per second, scaled up based on how hard you're straining
    // E.g. at 0 strain, 0.5% chance
    // At 90 strain, 5% chance
    const baseChance = 0.005; 
    const strainMultiplier = 1 + (strainLevel / MAX_STRAIN) * 9; 
    const chance = baseChance * strainMultiplier;
    
    return Math.random() < chance;
  },

  getSparkReward: (neuralTokens: number): number => {
    // Gives 15% of current tokens, or at least 150
    return Math.max(150, Math.floor(neuralTokens * 0.15));
  }
};
