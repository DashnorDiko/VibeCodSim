/**
 * Dev-only logging. Strip in production builds if you add a bundler define.
 */
const ENABLED = typeof __DEV__ !== "undefined" && __DEV__;

export const debugLog = (tag: string, payload?: Record<string, unknown>) => {
  if (!ENABLED) return;
  // eslint-disable-next-line no-console
  console.log(`[VibeCodSim:${tag}]`, payload ?? "");
};
