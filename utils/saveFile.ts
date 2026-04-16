import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const SAVE_FILENAME = "vibecodesim-save.txt";

export const exportSaveShareNative = async (
  payload: string
): Promise<{ ok: true; fileUri: string } | { ok: false; error: string }> => {
  try {
    const base = FileSystem.cacheDirectory;
    if (!base) {
      return { ok: false, error: "Cache directory is not available." };
    }
    const path = `${base}${SAVE_FILENAME}`;
    await FileSystem.writeAsStringAsync(path, payload, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { ok: false, error: "Sharing is not available on this device." };
    }
    await Sharing.shareAsync(path, {
      mimeType: "text/plain",
      dialogTitle: "Export VibeCodSim save",
    });
    return { ok: true, fileUri: path };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Export failed.",
    };
  }
};

export const pickSaveFileText = async (): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> => {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "application/octet-stream", "*/*"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]?.uri) {
      return { ok: false, error: "Cancelled." };
    }
    const uri = res.assets[0].uri;
    const text = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Import failed.",
    };
  }
};
