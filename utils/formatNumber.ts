import { useGameStore } from "../store/gameStore";

/**
 * Formats a number into a human-readable abbreviated string with rounded values.
 *
 * Examples:
 *   3.7       → "4"
 *   999       → "999"
 *   1500      → "1.5K"
 *   1_200_000 → "1.2M"
 *   1e9       → "1B"
 *   1e12      → "1T"
 */
const SUFFIXES: [number, string][] = [
  [1e33, "Dc"],
  [1e30, "No"],
  [1e27, "Oc"],
  [1e24, "Sp"],
  [1e21, "Sx"],
  [1e18, "Qi"],
  [1e15, "Qa"],
  [1e12, "T"],
  [1e9,  "B"],
  [1e6,  "M"],
  [1e3,  "K"],
];

export const formatNumber = (n: number): string => {
  if (!isFinite(n) || isNaN(n)) return "0";

  const abs = Math.abs(n);
  const useScientific = useGameStore.getState().useScientificNotation;

  if (abs >= 1e36 || (useScientific && abs >= 100)) {
    return n.toExponential(2).replace("+", "");
  }

  for (const [threshold, suffix] of SUFFIXES) {
    if (abs >= threshold) {
      const val = n / threshold;
      const s = val.toFixed(1);
      return (s.endsWith(".0") ? Math.round(val).toString() : s) + suffix;
    }
  }

  return Math.round(n).toString();
};
