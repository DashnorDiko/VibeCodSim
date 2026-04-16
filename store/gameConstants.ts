export const MAX_OFFLINE_SECONDS = 4 * 60 * 60;
export const OFFLINE_EARN_MIN_GAP_SECONDS = 5;
/** Wall-clock burst length while active (matches UI copy). */
export const CLOUD_BURST_DURATION_SEC = 30;
export const CLOUD_BURST_COOLDOWN_SEC = 45;
export const REBOOT_THRESHOLD = 1_000_000;
export const SAVE_THROTTLE_MS = 1200;

/** Persisted schema — bump when breaking on-disk format. */
export const SAVE_VERSION = 3;

export const STORAGE_KEY_LAST_ACTIVE = "vibecodesim_last_active";
export const STORAGE_KEY_SAVE = "vibecodesim_save_v3";
export const STORAGE_KEY_SAVE_PREV = "vibecodesim_save_v3_prev";
/** Legacy v2 bucket (read once for migration). */
export const STORAGE_KEY_SAVE_LEGACY_V2 = "vibecodesim_save_v2";
