import * as DocumentPicker from "expo-document-picker";

export type PickedReceipt = {
    uri: string;
    name: string;
    mimeType?: string | null;
};

/**
 * Pick receipt or order screenshot (images + PDFs).
 * Expo does not ship `expo-file-picker`; `expo-document-picker` is the supported API for files.
 */
export async function pickReceiptDocument(): Promise<PickedReceipt | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return null;
    const a = result.assets[0]!;
    return {
        uri: a.uri,
        name: a.name ?? "receipt",
        mimeType: a.mimeType,
    };
}
