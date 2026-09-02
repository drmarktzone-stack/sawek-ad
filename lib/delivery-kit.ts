import type { CampaignPack, Locale } from "./types";
import { channelFields, nodeToPngBlob } from "./channel-copy";

const KIT_ATTR = "data-kit-png";
const KIT_WIDTH_ATTR = "data-kit-width";

function slugFile(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "card";
}

function fieldBlock(label: string, value: string): string {
  return `${label}\n${(value ?? "").trim()}\n`;
}

/** Pack text only. Never invents prices, ROAS, patient counts, or cure claims. */
export function buildCopyTxt(pack: CampaignPack, locale: Locale, landingUrl: string): string {
  const f = channelFields(pack, locale);
  const ar = locale === "ar";
  const labels = ar
    ? {
        headline: "العنوان",
        body: "النص",
        cta: "النداء",
        wa: "واتساب",
        number: "رقم واتساب",
        landing: "صفحة الهبوط",
      }
    : {
        headline: "כותרת",
        body: "גוף",
        cta: "CTA",
        wa: "וואטסאפ",
        number: "מספר וואטסאפ",
        landing: "דף נחיתה",
      };
  const parts = [
    fieldBlock(labels.headline, f.headline),
    fieldBlock(labels.body, f.body),
    fieldBlock(labels.cta, f.cta),
    fieldBlock(labels.wa, f.waScript),
  ];
  const waNum = (pack.intake.whatsapp ?? "").trim();
  if (waNum) parts.push(fieldBlock(labels.number, waNum));
  parts.push(fieldBlock(labels.landing, landingUrl));
  return parts.join("\n").trimEnd() + "\n";
}

export function publicLandingPath(packId: string): string {
  return `/lp/${packId}`;
}

export async function resolvePublicBaseUrl(): Promise<string> {
  let env = "";
  try {
    const res = await fetch("/api/public-config", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { appBaseUrl?: string };
      env = String(data.appBaseUrl ?? "").trim().replace(/\/$/, "");
    }
  } catch {
    /* fall through to origin */
  }
  if (env) return env;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

function collectKitNodes(): { id: string; node: HTMLElement; width: number }[] {
  if (typeof document === "undefined") return [];
  const seen = new Set<string>();
  const out: { id: string; node: HTMLElement; width: number }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(`[${KIT_ATTR}]`)) {
    const id = slugFile((el.getAttribute(KIT_ATTR) || "").trim());
    if (!id || seen.has(id)) continue;
    if (el.offsetWidth < 8 || el.offsetHeight < 8) continue;
    seen.add(id);
    const width = Number(el.getAttribute(KIT_WIDTH_ATTR) || "1080") || 1080;
    out.push({ id, node: el, width });
  }
  return out;
}

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadDeliveryKit(pack: CampaignPack): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const nodes = collectKitNodes();
  for (const item of nodes) {
    const blob = await nodeToPngBlob(item.node, item.width);
    if (blob) zip.file(`${item.id}.png`, blob);
  }
  const base = await resolvePublicBaseUrl();
  const path = publicLandingPath(pack.id);
  const landingUrl = base ? `${base}${path}` : path;
  zip.file("copy-he.txt", buildCopyTxt(pack, "he", landingUrl));
  zip.file("copy-ar.txt", buildCopyTxt(pack, "ar", landingUrl));
  zip.file("landing.txt", `${path}\n${landingUrl}\n`);
  const out = await zip.generateAsync({ type: "blob" });
  const safe = slugFile(pack.id);
  triggerDownload(out, `sawek-kit-${safe}.zip`);
  return true;
}
