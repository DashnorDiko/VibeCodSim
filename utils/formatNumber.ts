/**
 * Formats a number into a human-readable abbreviated string with rounded values.
 *
 * Examples:
 *   3.7       → "3.70"
 *   999       → "999"
 *   1500      → "1.50K"
 *   1_200_000 → "1.20M"
 *   1e9       → "1.00B"
 *   1e12      → "1.00T"
 */
const SUFFIXES: [number, string][] = [
  [1e15, "Qa"],
  [1e12, "T"],
  [1e9,  "B"],
  [1e6,  "M"],
  [1e3,  "K"],
];

export const formatNumber = (n: number): string => {
  if (!isFinite(n) || isNaN(n)) return "0";

  const abs = Math.abs(n);

  if (abs < 10) {
    return n.toFixed(2);
  }

  if (abs < 1000) {
    return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1);
  }

  for (const [threshold, suffix] of SUFFIXES) {
    if (abs >= threshold) {
      const val = n / threshold;
      return `${val.toFixed(2)}${suffix}`;
    }
  }

  // Fallback (should be unreachable due to the 1e3 suffix threshold).
  return n.toFixed(0);
};
