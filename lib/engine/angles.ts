import type {
  AdVariant,
  AngleCopy,
  AngleId,
  AngleLocales,
  CampaignAngles,
  Intake,
  Locale,
  VariantKind,
} from "../types";

export const ANGLE_IDS: AngleId[] = ["pain", "benefit", "social_proof", "story"];

export const INCOMPLETE: Record<Locale, string> = {
  he: "[יש להשלים]",
  ar: "[يجب الاستكمال]",
  en: "[TO COMPLETE]",
};

/** Map 4 A/B angles onto existing campaign variant kinds. */
export const ANGLE_TO_KIND: Record<AngleId, VariantKind> = {
  pain: "emotional",
  benefit: "unique_advantage",
  social_proof: "direct_sales",
  story: "narrative",
};

const PROOF_RE =
  /דירוג|כוכב|ביקורות|עדות|ממליצ|review|rating|\bstars?\b|testimonial|تقييم|نجوم|شهادة|مراجعة|\b\d[\d,.\s]*\s*(לקוחות|customers?|clients?|reviews?|ביקורות|عملاء|زبائن)/i;

function asObj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asStringOrEmpty(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

export function incompleteCopy(locale: Locale): AngleCopy {
  const m = INCOMPLETE[locale];
  return { headline: m, copy: m, cta: m };
}

export function parseAngleCopy(v: unknown): AngleCopy | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const headline = asStringOrEmpty(o.headline);
  const copy = asStringOrEmpty(o.copy ?? o.body ?? o.primaryText);
  const cta = asStringOrEmpty(o.cta ?? o.CTA);
  if (!headline && !copy && !cta) return undefined;
  return { headline, copy, cta };
}

export function parseAngleLocales(v: unknown): AngleLocales | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const he = parseAngleCopy(o.he);
  const ar = parseAngleCopy(o.ar);
  const en = parseAngleCopy(o.en);
  if (!he && !ar && !en) return undefined;
  return {
    ...(he ? { he } : {}),
    ...(ar ? { ar } : {}),
    ...(en ? { en } : {}),
  };
}

export function parseCampaignAngles(v: unknown): CampaignAngles | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const out: CampaignAngles = {};
  for (const id of ANGLE_IDS) {
    const block = parseAngleLocales(o[id]);
    if (block) out[id] = block;
  }
  return Object.keys(out).length ? out : undefined;
}

export function hasSocialProofFacts(intake: Intake): boolean {
  const past = (intake.pastCreatives ?? [])
    .map((c) => `${c.headline} ${c.body} ${c.cta}`)
    .join(" ");
  const blob = [
    intake.pastResults,
    intake.pastAds,
    intake.description,
    intake.uniqueAdvantage,
    intake.channelNotes,
    past,
  ]
    .filter(Boolean)
    .join(" ");
  return PROOF_RE.test(blob);
}

export function sanitizeAngles(angles: CampaignAngles | undefined, intake: Intake): CampaignAngles | undefined {
  if (!angles) return undefined;
  const next: CampaignAngles = { ...angles };
  if (!hasSocialProofFacts(intake)) {
    next.social_proof = {
      he: incompleteCopy("he"),
      ar: incompleteCopy("ar"),
      en: incompleteCopy("en"),
    };
  }
  return next;
}

export function overlayAnglesOnVariants(
  variants: AdVariant[],
  angles: CampaignAngles | undefined,
): AdVariant[] {
  if (!angles) return variants;
  return variants.map((v) => {
    for (const id of ANGLE_IDS) {
      if (ANGLE_TO_KIND[id] !== v.kind) continue;
      const pack = angles[id]?.[v.locale];
      if (!pack) return v;
      return {
        ...v,
        headline: pack.headline || v.headline,
        primaryText: pack.copy || v.primaryText,
        cta: pack.cta || v.cta,
      };
    }
    return v;
  });
}

export function angleCopyText(pack: AngleCopy): string {
  return [pack.headline, pack.copy, pack.cta].filter(Boolean).join("\n");
}
