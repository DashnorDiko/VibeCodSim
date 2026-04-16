/**
 * Save I/O surface — schema + storage keys (persistence helpers live in gameStore).
 */
export {
  deserializeSave,
  serializePersistedSave,
  type DeserializeResult,
  type PersistedSaveCurrent,
} from "./saveSchema";
export {
  SAVE_VERSION,
  STORAGE_KEY_LAST_ACTIVE,
  STORAGE_KEY_SAVE,
  STORAGE_KEY_SAVE_LEGACY_V2,
  STORAGE_KEY_SAVE_PREV,
} from "./gameConstants";
