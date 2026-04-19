/**
 * Shapes accepted by crave-b2b-chat Lambda (OpenAI-style user content parts).
 * @see infra/aws/lambdas/b2b-chat/index.mjs
 */

export type UserTextPart = { type: "text"; text: string };

export type UserImagePart = {
  type: "image_url";
  image_url: { url: string };
};

export type UserFilePart = {
  type: "file";
  file: { filename: string; file_data: string };
};

export type UserContentPart = UserTextPart | UserImagePart | UserFilePart;

/** Lambda caps (decoded bytes). */
export const MAX_IMAGE_BYTES = 5_000_000;
export const MAX_PDF_BYTES = 4_500_000;

export const ASK_DRAFT_STORAGE_KEY = "crave_b2b_ask_draft";

/**
 * Collapse `data:image/jpeg;charset=UTF-8;base64,...` → `data:image/jpeg;base64,...`
 * so Lambdas and Bedrock see a consistent header (matches infra b2b-chat decodeDataUrl).
 */
export function normalizeImageDataUrl(dataUrl: string): string {
  const s = dataUrl.replace(/\s/g, "");
  const low = s.toLowerCase();
  const idx = low.indexOf(";base64,");
  if (idx === -1) return s;
  const header = s.slice(0, idx);
  const b64 = s.slice(idx + ";base64,".length);
  const m = header.match(/^data:(.+)$/i);
  if (!m) return s;
  const mime = m[1].split(";")[0].trim().toLowerCase();
  return `data:${mime};base64,${b64}`;
}

export function isAllowedImageDataUrl(url: string): boolean {
  const n = normalizeImageDataUrl(url);
  return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(n);
}

/**
 * Bedrock Converse `document.name`: alphanumeric, whitespace, hyphen, (), [] only;
 * no consecutive whitespace. (Dots/underscores etc. are not allowed.)
 */
export function sanitizeBedrockPdfDocumentName(name: string): string {
  let s = String(name ?? "").trim();
  if (!s) s = "upload";
  s = s.replace(/[^a-zA-Z0-9 \-\(\)\[\]]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!s) s = "upload";
  return s.slice(0, 80);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function approxBytesFromBase64(b64: string): number {
  const len = b64.replace(/\s/g, "").length;
  return Math.floor((len * 3) / 4);
}

function approxBytesFromDataUrl(dataUrl: string): number {
  const idx = dataUrl.indexOf("base64,");
  if (idx === -1) return dataUrl.length;
  return approxBytesFromBase64(dataUrl.slice(idx + 7));
}

/**
 * Turn browser File(s) into Lambda-safe parts (data URL images, base64 PDF file parts).
 */
export async function filesToUserParts(files: File[]): Promise<UserContentPart[]> {
  const parts: UserContentPart[] = [];
  for (const file of files) {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      const buf = new Uint8Array(await file.arrayBuffer());
      if (buf.byteLength > MAX_PDF_BYTES) {
        throw new Error(
          `“${file.name}” is too large (max ~${Math.round(MAX_PDF_BYTES / 1_000_000)}MB for PDF).`,
        );
      }
      parts.push({
        type: "file",
        file: {
          filename: file.name.slice(0, 200) || "upload.pdf",
          file_data: uint8ToBase64(buf),
        },
      });
      continue;
    }
    if (!file.type.startsWith("image/")) {
      throw new Error(`“${file.name}” is not a supported image or PDF.`);
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        if (typeof r.result === "string") resolve(r.result);
        else reject(new Error("Could not read image."));
      };
      r.onerror = () => reject(new Error("Could not read image."));
      r.readAsDataURL(file);
    });
    const approx = approxBytesFromDataUrl(dataUrl);
    if (approx > MAX_IMAGE_BYTES) {
      throw new Error(
        `“${file.name}” is too large after encoding (max ~${Math.round(MAX_IMAGE_BYTES / 1_000_000)}MB for images).`,
      );
    }
    parts.push({
      type: "image_url",
      image_url: { url: normalizeImageDataUrl(dataUrl) },
    });
  }
  return parts;
}

export type ApiChatMessage = {
  role: "user" | "assistant";
  content: string | UserContentPart[];
};

/** One user turn for the API: attachments first, then optional text (Lambda / UX). */
export function buildInitialUserTurn(
  text: string,
  fileParts: UserContentPart[],
): ApiChatMessage {
  const t = text.trim();
  const textParts: UserTextPart[] = t ? [{ type: "text" as const, text: t }] : [];
  if (fileParts.length === 0) {
    return { role: "user", content: t };
  }
  return { role: "user", content: [...fileParts, ...textParts] };
}
