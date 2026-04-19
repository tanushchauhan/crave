export type AdGeneratedImage = {
  contentType?: string;
  url?: string;
  data?: string;
  s3Key?: string;
};

export type AdDesign = {
  style: string;
  caption: string;
  hashtags: string[];
  images: AdGeneratedImage[];
};

export type AdGenerateMeta = Record<string, unknown>;

export type AdGenerateResponse = {
  designs: AdDesign[];
  meta?: AdGenerateMeta;
};

export function slideSrc(img: AdGeneratedImage): string | null {
  if (typeof img.url === "string" && img.url.length) return img.url;
  if (typeof img.data === "string" && img.data.length) {
    const raw = img.data.trim();
    if (/^data:/i.test(raw)) return raw;
    return `data:image/png;base64,${raw}`;
  }
  return null;
}
