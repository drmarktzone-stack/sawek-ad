import type { CampaignAngles, Intake, Locale } from "../types";
import { emptyIntake } from "./validate";
import { generateVariants } from "./copy";
import { spokenCta } from "./spoken";
import { INCOMPLETE, hasSocialProofFacts } from "./angles";
import type {
  GenerateBody,
  GenerateChannels,
  GenerateLang,
  GenerateLocales,
  GenerateOk,
  LocaleCopyBlock,
} from "./gemini-generate";

const MARKER_RE =
  /\[(?:יש להשלים|يجب الاستكمال|يجب إكمال|TO COMPLETE)(?::[^\]]*)?\]/gi;

function asObj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function str(v: unknown): string {
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function pick(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const hit = str(o[k]);
    if (hit) return hit;
  }
  return "";
}

function parseLabeledLines(blob: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of blob.split(/\n+/)) {
    const m = raw.match(/^\s*([A-Za-z_]+)\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const key = m[1]!.trim();
    const val = m[2]!.trim();
    if (key && val) out[key] = val;
  }
  return out;
}

function mergeIfEmpty(intake: Intake, key: keyof Intake, value: string) {
  if (!value) return;
  const cur = intake[key];
  if (typeof cur === "string" && !cur.trim()) {
    (intake as unknown as Record<string, unknown>)[key] = value;
  }
}

/** Map POST /api/generate facts (object, string, or labeled description) onto Intake. */
export function factsToIntake(body: {
  description?: unknown;
  audience?: unknown;
  facts?: unknown;
}): Intake {
  const intake = emptyIntake();
  const facts = body.facts;
  const labeled: Record<string, string> = {};

  if (typeof facts === "string" && facts.trim()) {
    Object.assign(labeled, parseLabeledLines(facts));
    if (!labeled.businessName && !labeled.description) intake.description = facts.trim();
  } else if (facts && typeof facts === "object" && !Array.isArray(facts)) {
    Object.assign(labeled, facts as Record<string, string>);
    const o = facts as Record<string, unknown>;
    intake.businessName = str(o.businessName) || intake.businessName;
    intake.category = str(o.category) || intake.category;
    intake.description = str(o.description) || str(o.facts) || intake.description;
    intake.location = str(o.location) || intake.location;
    intake.audience = str(o.audience) || intake.audience;
    intake.biggestProblem = str(o.biggestProblem) || intake.biggestProblem;
    intake.uniqueAdvantage = str(o.uniqueAdvantage) || intake.uniqueAdvantage;
    intake.mainGoal = str(o.mainGoal) || intake.mainGoal;
    intake.offer = str(o.offer) || intake.offer;
    intake.pastAds = str(o.pastAds) || intake.pastAds;
    intake.pastResults = str(o.pastResults) || intake.pastResults;
    intake.website = str(o.website) || intake.website;
    intake.whatsapp = str(o.whatsapp) || intake.whatsapp;
    intake.clinicHours = str(o.clinicHours) || intake.clinicHours;
    intake.brandTone = str(o.brandTone) || intake.brandTone;
    intake.brandPositioning = str(o.brandPositioning) || intake.brandPositioning;
  }

  if (typeof body.description === "string" && body.description.trim()) {
    Object.assign(labeled, parseLabeledLines(body.description));
    const extra = body.description.trim();
    intake.description = [intake.description, extra].filter(Boolean).join("\n");
  }
  if (typeof body.audience === "string" && body.audience.trim()) {
    intake.audience = body.audience.trim();
  }

  const o = { ...labeled, ...(asObj(facts) ?? {}) };
  const phone = pick(o, ["phone", "tel", "telephone", "whatsapp", "mobile"]);
  const city = pick(o, ["city", "town", "location"]);
  const hours = pick(o, ["hours", "clinicHours", "openingHours", "openHours"]);
  const website = pick(o, ["website", "url", "site"]);
  const offer = pick(o, ["offer", "promo", "deal"]);
  const name = pick(o, ["businessName", "name", "clinic"]);
  mergeIfEmpty(intake, "whatsapp", phone);
  mergeIfEmpty(intake, "location", city);
  mergeIfEmpty(intake, "clinicHours", hours);
  mergeIfEmpty(intake, "website", website);
  if (name) mergeIfEmpty(intake, "businessName", name);
  if (offer && (intake.offer === "no_offer" || !intake.offer.trim())) intake.offer = offer;
  if (phone && !intake.whatsapp.trim()) intake.whatsapp = phone;
  if (city && !intake.location.trim()) intake.location = city;
  if (hours && !intake.clinicHours.trim()) intake.clinicHours = hours;
  return intake;
}

export function serializeFactsBlock(intake: Intake): string {
  const rows: Array<[string, string]> = [
    ["businessName", intake.businessName],
    ["category", intake.category],
    ["description", intake.description],
    ["phone", intake.whatsapp],
    ["city", intake.location],
    ["location", intake.location],
    ["website", intake.website],
    ["offer", intake.offer],
    ["hours", intake.clinicHours],
    ["audience", intake.audience],
    ["biggestProblem", intake.biggestProblem],
    ["uniqueAdvantage", intake.uniqueAdvantage],
    ["mainGoal", intake.mainGoal],
  ];
  return rows
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join("\n");
}

export function bodyHasFacts(body: GenerateBody): boolean {
  const intake = factsToIntake(body);
  return Boolean(
    intake.businessName.trim() ||
      intake.description.trim().length > 2 ||
      intake.website.trim() ||
      intake.whatsapp.trim() ||
      intake.location.trim() ||
      intake.clinicHours.trim() ||
      (intake.offer.trim() && intake.offer !== "no_offer") ||
      intake.audience.trim().length > 2,
  );
}

export function isMarkerWall(text: string): boolean {
  const stripped = text.replace(MARKER_RE, "").replace(/\s+/g, "").trim();
  return !stripped;
}

export function countIncompleteMarkers(...chunks: string[]): number {
  let n = 0;
  for (const c of chunks) {
    const m = c.match(MARKER_RE);
    if (m) n += m.length;
  }
  return n;
}

function kindOrder(): Array<"strong_offer" | "very_short" | "emotional" | "narrative" | "direct_sales" | "unique_advantage"> {
  return ["strong_offer", "very_short", "emotional", "narrative", "direct_sales", "unique_advantage"];
}

function localeBlock(intake: Intake, locale: Locale): LocaleCopyBlock {
  const variants = generateVariants(intake).filter((v) => v.locale === locale);
  const order = kindOrder();
  const headlines = order
    .map((k) => variants.find((v) => v.kind === k)?.headline.trim() ?? "")
    .filter(Boolean);
  const strong = variants.find((v) => v.kind === "strong_offer") ?? variants[0];
  return {
    headlines: headlines.length ? headlines : [intake.businessName || INCOMPLETE[locale]],
    copy: strong?.primaryText?.trim() || "",
    cta: strong?.cta?.trim() || spokenCta(intake, locale),
  };
}

function channelCopy(block: LocaleCopyBlock, locale: Locale, intake: Intake) {
  const headline = block.headlines[0] || intake.businessName;
  return {
    headline,
    body: block.copy,
    cta: block.cta || spokenCta(intake, locale),
  };
}

function channelsFromLocales(intake: Intake, locales: GenerateLocales): GenerateChannels {
  const scriptFor = (loc: GenerateLang, block?: LocaleCopyBlock) => {
    if (!block) return undefined;
    const bits = [block.headlines[0], block.copy, block.cta].filter(Boolean).join(" — ");
    return bits ? { script: bits } : undefined;
  };
  const landingFor = (loc: GenerateLang, block?: LocaleCopyBlock) => {
    if (!block) return undefined;
    return { title: block.headlines[0] || intake.businessName, body: block.copy };
  };
  return {
    facebook: {
      ...(locales.he ? { he: channelCopy(locales.he, "he", intake) } : {}),
      ...(locales.ar ? { ar: channelCopy(locales.ar, "ar", intake) } : {}),
      ...(locales.en ? { en: channelCopy(locales.en, "en", intake) } : {}),
    },
    instagram: {
      ...(locales.he ? { he: channelCopy(locales.he, "he", intake) } : {}),
      ...(locales.ar ? { ar: channelCopy(locales.ar, "ar", intake) } : {}),
      ...(locales.en ? { en: channelCopy(locales.en, "en", intake) } : {}),
    },
    reels: {
      ...(locales.he ? { he: scriptFor("he", locales.he) } : {}),
      ...(locales.ar ? { ar: scriptFor("ar", locales.ar) } : {}),
      ...(locales.en ? { en: scriptFor("en", locales.en) } : {}),
    },
    tiktok: {
      ...(locales.he ? { he: scriptFor("he", locales.he) } : {}),
      ...(locales.ar ? { ar: scriptFor("ar", locales.ar) } : {}),
      ...(locales.en ? { en: scriptFor("en", locales.en) } : {}),
    },
    whatsapp: {
      ...(locales.he ? { he: scriptFor("he", locales.he) } : {}),
      ...(locales.ar ? { ar: scriptFor("ar", locales.ar) } : {}),
      ...(locales.en ? { en: scriptFor("en", locales.en) } : {}),
    },
    landing: {
      ...(locales.he ? { he: landingFor("he", locales.he) } : {}),
      ...(locales.ar ? { ar: landingFor("ar", locales.ar) } : {}),
      ...(locales.en ? { en: landingFor("en", locales.en) } : {}),
    },
  };
}

function anglesFromIntake(intake: Intake): CampaignAngles {
  const he = localeBlock(intake, "he");
  const ar = localeBlock(intake, "ar");
  const en = localeBlock(intake, "en");
  const pack = (loc: Locale, headline: string, copy: string) => ({
    headline,
    copy,
    cta: spokenCta(intake, loc),
  });
  const proof = hasSocialProofFacts(intake);
  return {
    pain: {
      he: pack("he", he.headlines[2] || he.headlines[0] || "", he.copy),
      ar: pack("ar", ar.headlines[2] || ar.headlines[0] || "", ar.copy),
      en: pack("en", en.headlines[2] || en.headlines[0] || "", en.copy),
    },
    benefit: {
      he: pack("he", he.headlines[5] || he.headlines[0] || "", he.copy),
      ar: pack("ar", ar.headlines[5] || ar.headlines[0] || "", ar.copy),
      en: pack("en", en.headlines[5] || en.headlines[0] || "", en.copy),
    },
    social_proof: proof
      ? {
          he: pack("he", he.headlines[4] || he.headlines[0] || "", he.copy),
          ar: pack("ar", ar.headlines[4] || ar.headlines[0] || "", ar.copy),
          en: pack("en", en.headlines[4] || en.headlines[0] || "", en.copy),
        }
      : {
          he: { headline: INCOMPLETE.he, copy: INCOMPLETE.he, cta: INCOMPLETE.he },
          ar: { headline: INCOMPLETE.ar, copy: INCOMPLETE.ar, cta: INCOMPLETE.ar },
          en: { headline: INCOMPLETE.en, copy: INCOMPLETE.en, cta: INCOMPLETE.en },
        },
    story: {
      he: pack("he", he.headlines[3] || he.headlines[0] || "", he.copy),
      ar: pack("ar", ar.headlines[3] || ar.headlines[0] || "", ar.copy),
      en: pack("en", en.headlines[3] || en.headlines[0] || "", en.copy),
    },
  };
}

/** High-quality local fill from facts — never empty markers when the field exists. */
export function templateFillFromFacts(body: GenerateBody): GenerateOk {
  const intake = factsToIntake(body);
  const locales: GenerateLocales = {
    he: localeBlock(intake, "he"),
    ar: localeBlock(intake, "ar"),
    en: localeBlock(intake, "en"),
  };
  const he = locales.he!;
  return {
    ok: true,
    text: "",
    headlines: he.headlines,
    copy: he.copy,
    cta: he.cta,
    locales,
    channels: channelsFromLocales(intake, locales),
    angles: anglesFromIntake(intake),
  };
}

function hydrateText(raw: string | undefined, fallback: string): string {
  const s = (raw ?? "").trim();
  if (!s || isMarkerWall(s)) return fallback;
  const cleaned = s.replace(MARKER_RE, "").replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function hydrateLocale(block: LocaleCopyBlock | undefined, fallback: LocaleCopyBlock): LocaleCopyBlock {
  const headlines = (block?.headlines?.length ? block.headlines : fallback.headlines).map((h, i) =>
    hydrateText(h, fallback.headlines[i] || fallback.headlines[0] || ""),
  );
  return {
    headlines: headlines.filter(Boolean),
    copy: hydrateText(block?.copy, fallback.copy),
    cta: hydrateText(block?.cta, fallback.cta),
  };
}

/** After Gemini: fill marker holes from facts. Keep model prose when it used the facts. */
export function hydrateCopyFromFacts(result: GenerateOk, body: GenerateBody): GenerateOk {
  const filled = templateFillFromFacts(body);
  const locales: GenerateLocales = {
    he: hydrateLocale(result.locales?.he, filled.locales?.he ?? { headlines: [], copy: "", cta: "" }),
    ar: hydrateLocale(result.locales?.ar, filled.locales?.ar ?? { headlines: [], copy: "", cta: "" }),
    en: hydrateLocale(result.locales?.en, filled.locales?.en ?? { headlines: [], copy: "", cta: "" }),
  };
  const he = locales.he!;
  const hasLocales = Boolean(result.locales?.he || result.locales?.ar || result.locales?.en);
  if (!hasLocales && !result.headlines?.length && !result.copy && !result.cta) {
    return filled;
  }
  return {
    ok: true,
    text: result.text,
    headlines: he.headlines,
    copy: he.copy,
    cta: he.cta,
    locales,
    channels: result.channels ?? filled.channels,
    angles: result.angles ?? filled.angles,
    ...(result.brand ? { brand: result.brand } : {}),
  };
}

export const FACT_USE_RULE =
  "LABELED FACTS below are source of truth. If a fact is present you MUST use that exact value in headlines, body, and CTAs for every language. Never write [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE] for a field that was provided. Only mark incomplete for fields that are truly absent. Recreate per language — do not literal-translate.";
