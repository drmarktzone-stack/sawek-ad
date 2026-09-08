/**
 * Smart image composition — detect existing text/logo and refuse overlay collisions.
 * Deterministic pixel heuristics. Vision is optional enrichment, never required.
 */
import type {
  ImageBandAnalysis,
  ImageCompositionDecision,
  ImageCompositionMode,
  MediaAssetMeta,
} from "../types";

export interface PixelBuffer {
  width: number;
  height: number;
  /** RGBA packed. */
  data: Uint8Array | Uint8ClampedArray;
}

const TEXT_EDGE = 0.11;
const LOGO_CORNER = 0.16;

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function bandRange(height: number, id: ImageBandAnalysis["id"]): { y0: number; y1: number } {
  if (id === "top") return { y0: 0, y1: Math.max(1, Math.floor(height * 0.28)) };
  if (id === "bottom") return { y0: Math.floor(height * 0.68), y1: height };
  return { y0: Math.floor(height * 0.28), y1: Math.floor(height * 0.68) };
}

function analyzeBand(buf: PixelBuffer, id: ImageBandAnalysis["id"]): ImageBandAnalysis {
  const { width, height, data } = buf;
  const { y0, y1 } = bandRange(height, id);
  let edges = 0;
  let samples = 0;
  let sum = 0;
  let sumSq = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 1; x < width; x++) {
      const i = (y * width + x) * 4;
      const p = (y * width + (x - 1)) * 4;
      const a = luma(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      const b = luma(data[p] ?? 0, data[p + 1] ?? 0, data[p + 2] ?? 0);
      if (Math.abs(a - b) > 38) edges += 1;
      sum += a;
      sumSq += a * a;
      samples += 1;
    }
  }
  const edgeDensity = samples ? edges / samples : 0;
  const mean = samples ? sum / samples : 0;
  const variance = samples ? Math.max(0, sumSq / samples - mean * mean) : 0;
  const contrast = Math.sqrt(variance) / 255;
  const likelyText = edgeDensity >= TEXT_EDGE && contrast >= 0.08;
  return {
    id,
    edgeDensity,
    contrast,
    likelyText,
    likelyFace: false,
    likelyLogo: false,
  };
}

function cornerLogoHint(buf: PixelBuffer): boolean {
  const { width, height, data } = buf;
  const cw = Math.max(4, Math.floor(width * 0.18));
  const ch = Math.max(4, Math.floor(height * 0.18));
  const corners: Array<{ x0: number; y0: number }> = [
    { x0: 0, y0: 0 },
    { x0: width - cw, y0: 0 },
    { x0: 0, y0: height - ch },
    { x0: width - cw, y0: height - ch },
  ];
  for (const c of corners) {
    let edges = 0;
    let n = 0;
    for (let y = c.y0; y < c.y0 + ch && y < height; y++) {
      for (let x = c.x0 + 1; x < c.x0 + cw && x < width; x++) {
        const i = (y * width + x) * 4;
        const p = (y * width + (x - 1)) * 4;
        const a = luma(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
        const b = luma(data[p] ?? 0, data[p + 1] ?? 0, data[p + 2] ?? 0);
        if (Math.abs(a - b) > 42) edges += 1;
        n += 1;
      }
    }
    if (n && edges / n >= LOGO_CORNER) return true;
  }
  return false;
}

export function analyzePixelBuffer(buf: PixelBuffer): {
  bands: ImageBandAnalysis[];
  hasExistingText: boolean;
  hasLogo: boolean;
} {
  const top = analyzeBand(buf, "top");
  const middle = analyzeBand(buf, "middle");
  const bottom = analyzeBand(buf, "bottom");
  const logo = cornerLogoHint(buf);
  if (logo) top.likelyLogo = true;
  return {
    bands: [top, middle, bottom],
    hasExistingText: top.likelyText || middle.likelyText || bottom.likelyText,
    hasLogo: logo,
  };
}

export function decideComposition(input: {
  asset?: Pick<MediaAssetMeta, "label" | "note" | "name" | "mime" | "publicSrc">;
  pixels?: PixelBuffer;
  userAskedToEditImage?: boolean;
}): ImageCompositionDecision {
  const asset = input.asset;
  const label = asset?.label || "";
  const note = `${asset?.note || ""} ${asset?.name || ""}`.toLowerCase();
  const isLogo = label === "logo" || /logo|watermark|wordmark/.test(note);
  const isScanPhoto = Boolean(asset?.publicSrc && /^https?:\/\//i.test(asset.publicSrc) && !note.startsWith("offer:"));
  const isGraphic = /offer:graphic|image\/svg/.test(`${note} ${asset?.mime || ""}`);
  const faceHint = label === "doctor" || /face|portrait|רופא/.test(note);
  const productHint = label === "interior" || label === "exterior" || /product|חלל|חזית/.test(note);

  let bands: ImageBandAnalysis[] = [];
  let hasExistingText = isLogo;
  let hasLogo = isLogo;
  let source: ImageCompositionDecision["source"] = "heuristic";

  if (input.pixels && input.pixels.width >= 8 && input.pixels.height >= 8) {
    const px = analyzePixelBuffer(input.pixels);
    bands = px.bands;
    hasExistingText = hasExistingText || px.hasExistingText;
    hasLogo = hasLogo || px.hasLogo;
    source = "pixels";
  }

  const safeBands = bands.filter((b) => !b.likelyText && !b.likelyLogo).map((b) => b.id);
  const textBottom = bands.find((b) => b.id === "bottom")?.likelyText === true;
  const textTop = bands.find((b) => b.id === "top")?.likelyText === true;
  const textMid = bands.find((b) => b.id === "middle")?.likelyText === true;

  if (isLogo && !input.userAskedToEditImage) {
    return {
      mode: "separate_headline",
      collision: true,
      hasExistingText: true,
      hasLogo: true,
      hasFaceHint: faceHint,
      hasProductHint: productHint,
      safeBands: [],
      reason: "Existing logo/watermark — do not overlay new type. Option B: image + separate headline.",
      source,
    };
  }

  if (hasExistingText && textBottom && textTop) {
    return {
      mode: "separate_headline",
      collision: true,
      hasExistingText: true,
      hasLogo,
      hasFaceHint: faceHint,
      hasProductHint: productHint,
      safeBands,
      reason: "Text occupies multiple bands — overlay rejected. Option B: image + separate headline.",
      source,
    };
  }

  if (hasExistingText && (textBottom || textMid) && !textTop && safeBands.includes("top")) {
    return {
      mode: "safe_zone_top",
      collision: false,
      hasExistingText: true,
      hasLogo,
      hasFaceHint: faceHint,
      hasProductHint: productHint,
      safeBands,
      reason: "Existing type in lower frame — Option C: headline in top safe zone only.",
      source,
    };
  }

  if (hasExistingText && textTop && !textBottom && safeBands.includes("bottom")) {
    return {
      mode: "safe_zone_bottom",
      collision: false,
      hasExistingText: true,
      hasLogo,
      hasFaceHint: faceHint,
      hasProductHint: productHint,
      safeBands,
      reason: "Existing type in upper frame — Option C: headline in bottom safe zone only.",
      source,
    };
  }

  if (hasExistingText || (isScanPhoto && source === "heuristic")) {
    return {
      mode: "separate_headline",
      collision: true,
      hasExistingText: hasExistingText || isScanPhoto,
      hasLogo,
      hasFaceHint: faceHint,
      hasProductHint: productHint,
      safeBands,
      reason: isScanPhoto && !hasExistingText
        ? "Scanned photo may already contain type — default Option B until pixels confirm a clean band."
        : "Existing type detected — overlay rejected. Option B: image + separate headline.",
      source: hasExistingText ? source : "heuristic",
    };
  }

  if (isGraphic || (!hasExistingText && !hasLogo)) {
    return {
      mode: "overlay_safe",
      collision: false,
      hasExistingText: false,
      hasLogo: false,
      hasFaceHint: faceHint,
      hasProductHint: productHint,
      safeBands: safeBands.length ? safeBands : ["bottom"],
      reason: "No existing type/logo in frame — overlay allowed in negative space.",
      source,
    };
  }

  return {
    mode: "image_only",
    collision: true,
    hasExistingText,
    hasLogo,
    hasFaceHint: faceHint,
    hasProductHint: productHint,
    safeBands,
    reason: "No clean band for overlay — Option A: image without new text.",
    source,
  };
}

export function compositionCollides(decision: ImageCompositionDecision, overlayRequested: boolean): boolean {
  if (!overlayRequested) return false;
  if (decision.mode === "image_only" || decision.mode === "separate_headline") return decision.hasExistingText || decision.hasLogo;
  return decision.collision;
}

export function treatmentLabel(mode: ImageCompositionMode): { he: string; ar: string; en: string } {
  if (mode === "image_only") {
    return { he: "תמונה בלי שכבת טקסט", ar: "صورة بلا طبقة نص", en: "Image without text overlay" };
  }
  if (mode === "separate_headline") {
    return { he: "תמונה + כותרת נפרדת", ar: "صورة + عنوان منفصل", en: "Image + separate headline area" };
  }
  if (mode === "safe_zone_top") {
    return { he: "כותרת באזור בטוח עליון", ar: "عنوان في المنطقة الآمنة العليا", en: "Headline in top safe zone" };
  }
  if (mode === "safe_zone_bottom") {
    return { he: "כותרת באזור בטוח תחתון", ar: "عنوان في المنطقة الآمنة السفلى", en: "Headline in bottom safe zone" };
  }
  return { he: "שכבת טקסט על אזור נקי", ar: "طبقة نص على مساحة نظيفة", en: "Overlay on clean negative space" };
}

/** Synthetic helpers for QA. */
export function solidBuffer(width: number, height: number, rgb: [number, number, number]): PixelBuffer {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

/** High-frequency stripes in one band — looks like typography to the edge detector. */
export function textBandBuffer(width: number, height: number, band: "top" | "bottom"): PixelBuffer {
  const buf = solidBuffer(width, height, [30, 36, 48]);
  const { y0, y1 } = bandRange(height, band);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < width; x++) {
      const on = x % 3 === 0 || y % 4 === 0;
      const i = (y * width + x) * 4;
      const v = on ? 240 : 20;
      buf.data[i] = v;
      buf.data[i + 1] = v;
      buf.data[i + 2] = v;
    }
  }
  return buf;
}
