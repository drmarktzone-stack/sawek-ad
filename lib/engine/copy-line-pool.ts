/**
 * Local hook/headline/CTA pool + apply to campaign packs.
 * Client-safe: no Vertex / Gemini imports.
 */
import type {
  AdVariant,
  CampaignPack,
  CopyLineKind,
  CopyLineOption,
  CopyLinePool,
  CopyLineSource,
  Intake,
  Locale,
  MarketResearch,
} from "../types";
import { uid } from "../utils";
import { detectVertical, isBakery, isPediatrics, isPlasticAestheticClinic, visitCta } from "../vertical";
import { inventsForbidden } from "./coach";
import {
  clalitContamination,
  copyFactsFromIntake,
  ctaMonoculture,
  customerCopyHasLeak,
  gateCustomerAd,
  hasBannedNonsense,
  identicalShare,
  isCannedClinicSlogan,
  isStrategyLabelLine,
  localeScriptBleed,
  templateLoopHits,
} from "../copy-purity";
import { arabicRegisterBleed, effectiveDialect } from "./voice";
import { clipAtWord } from "./spoken";
import { ctasFor, hooksFor } from "../creative-bank";
import { attachCompleteAd } from "./ad-engine/complete-ad";
import { buildAgency } from "./agency";

export const COPY_LINE_MIN = 12;

const TOKEN_RE = /[\w\u0590-\u05ff\u0600-\u06ff]+/g;

export function normLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function lineKey(s: string): string {
  return normLine(s).toLowerCase();
}

function tokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const t of String(s || "").toLowerCase().match(TOKEN_RE) || []) {
    if (t.length >= 3) out.add(t);
  }
  return out;
}

function jaccard(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export function tooSimilar(a: string, b: string): boolean {
  const aa = normLine(a);
  const bb = normLine(b);
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  return jaccard(aa, bb) >= 0.72;
}

export function ctaOptionsFor(intake: Intake, locale: Locale): string[] {
  const v = detectVertical(intake);
  const bank = ctasFor(v, locale);
  const out: string[] = [];
  const push = (s: string) => {
    const t = normLine(s);
    if (!t || t.length < 2) return;
    if (hasBannedNonsense(t) || customerCopyHasLeak(t) || isStrategyLabelLine(t)) return;
    if (out.some((x) => tooSimilar(x, t))) return;
    out.push(t);
  };

  if (locale === "ar") {
    if (isPediatrics(intake)) {
      push("جيبوه عالعيادة");
      push("تعوا اليوم — جت أولاً");
      push("واتساب (مش للطوارئ)");
      if (intake.website.trim()) push("للموقع");
      if (intake.clinicHours.trim()) push("اسألوا عن الدوام");
      push("جتوا حسب الدور");
    } else if (v === "clinic") {
      push("تعوا عالعيادة");
      if (intake.whatsapp.trim()) push("واتساب للموعد");
      if (intake.website.trim()) push("للموقع");
      push("احكوا معنا");
    } else if (isBakery(intake)) {
      push("تعوا ع المخبز");
      push("خدوا خبز هاليوم");
      if (intake.website.trim()) push("للموقع");
      if (intake.whatsapp.trim()) push("واتساب");
    } else {
      for (const c of bank) push(c);
      if (intake.website.trim()) push("للموقع");
      if (intake.whatsapp.trim()) push("واتساب");
      push("تعوا زورونا");
    }
  } else if (locale === "he") {
    if (isPediatrics(intake)) {
      push("הגיעו למרפאה");
      push("קבלה לפי סדר הגעה");
      push("וואטסאפ (לא לחירום)");
      if (intake.website.trim()) push("לאתר");
      if (intake.clinicHours.trim()) push("שאלו על השעות");
    } else {
      for (const c of bank) push(c);
      if (intake.website.trim()) push("לאתר");
      if (intake.whatsapp.trim()) push("וואטסאפ");
    }
  } else {
    if (isPediatrics(intake)) {
      push("Come to the clinic");
      push("Walk in today");
      push("WhatsApp (not ER)");
      if (intake.website.trim()) push("Visit the site");
    } else {
      for (const c of bank) push(c);
      if (intake.website.trim()) push("Visit the site");
      if (intake.whatsapp.trim()) push("WhatsApp");
    }
  }
  if (!out.length) push(visitCta(intake, locale));
  return out.slice(0, 8);
}

function factHooks(intake: Intake, locale: Locale): string[] {
  const name = intake.businessName.trim();
  const loc = intake.location.trim();
  const adv = intake.uniqueAdvantage.trim();
  const cat = intake.category.trim();
  const hours = intake.clinicHours.trim();
  const problem = intake.biggestProblem.trim();
  const out: string[] = [];
  const push = (s: string) => {
    const t = clipAtWord(normLine(s), 72);
    if (!t || t.length < 4) return;
    if (hasBannedNonsense(t) || customerCopyHasLeak(t) || isStrategyLabelLine(t)) return;
    if (isCannedClinicSlogan(t, intake) && !isPediatrics(intake)) return;
    if (out.some((x) => tooSimilar(x, t))) return;
    out.push(t);
  };

  if (problem && problem.length >= 6 && !/^(unknown|custom)$/i.test(problem)) push(problem);

  if (locale === "ar") {
    if (name && loc) push(`${name} — ${clipAtWord(loc, 28)}`);
    if (adv && adv.length >= 6) push(adv);
    if (isPediatrics(intake)) {
      push(name ? `${name} — جت أولاً بدون مواعيد` : "جت أولاً بدون مواعيد");
      if (loc) push(`${clipAtWord(loc, 36)} — عيادة أطفال`);
      push("لما الولد بيمرض — وين بتروحوا اليوم");
      if (hours) push("الدوام مكتوب — تعوا حسب الساعات");
    } else if (isPlasticAestheticClinic(intake)) {
      push(name ? `${name} — جراحة تجميل من العيادة` : "جراحة تجميل من العيادة");
      if (loc) push(`${name} ب${clipAtWord(loc, 24)}`);
    } else if (isBakery(intake)) {
      push(name ? `${name} — خبز طازج هاليوم` : "خبز طازج هاليوم");
      if (loc) push(`تعوا ع ${clipAtWord(loc, 28)}`);
    } else {
      if (name && cat) push(`${name} — ${clipAtWord(cat, 28)}`);
      if (name) push(name);
    }
    if (intake.whatsapp.trim()) {
      const wa = intake.whatsapp.trim().split(/\s*[·|,;]\s*/)[0];
      push(`واتساب ${wa}`);
    }
    if (intake.website.trim()) push(`${name || cat || "المحل"} — للموقع`);
  } else if (locale === "he") {
    if (name && loc) push(`${name} — ${clipAtWord(loc, 28)}`);
    if (adv && adv.length >= 6) push(adv);
    if (isPediatrics(intake)) {
      push(name ? `${name} — לפי סדר הגעה` : "לפי סדר הגעה, בלי תור");
      push("כשהילד חולה — לאן הולכים היום");
    } else if (isBakery(intake)) {
      push(name ? `${name} — לחם חם מהתנור` : "לחם חם מהתנור");
    } else if (name) push(name);
  } else {
    if (name && loc) push(`${name} — ${clipAtWord(loc, 28)}`);
    if (adv && adv.length >= 6) push(adv);
    if (isPediatrics(intake)) {
      push(name ? `${name} — walk-in, no appointment` : "Walk in today");
      push("When a child is sick — know where to go today");
    } else if (isBakery(intake)) {
      push(name ? `${name} — fresh bread today` : "Fresh bread today");
    } else if (name) push(name);
  }

  for (const h of hooksFor(detectVertical(intake), locale, intake)) {
    push(h);
  }
  return out.slice(0, 10);
}

function factBodies(intake: Intake, locale: Locale): string[] {
  const facts = copyFactsFromIntake(intake);
  const adv = intake.uniqueAdvantage.trim();
  const loc = facts.location;
  const phone = facts.phone;
  const site = facts.website;
  const hours = intake.clinicHours.trim();
  const name = intake.businessName.trim();
  const problem = intake.biggestProblem.trim();
  const out: string[] = [];
  const push = (s: string) => {
    const t = normLine(s);
    if (!t || t.length < 8) return;
    if (hasBannedNonsense(t) || customerCopyHasLeak(t)) return;
    if (clalitContamination(t, intake)) return;
    if (out.some((x) => tooSimilar(x, t))) return;
    out.push(t);
  };

  if (locale === "ar") {
    if (name && loc) push(`${name} ب${loc}.`);
    if (problem && !/^(unknown|custom)$/i.test(problem)) push(problem);
    if (adv) push(adv);
    if (hours) push(`الدوام: ${clipAtWord(hours, 80)}`);
    if (phone) push(`واتساب ${phone}${isPediatrics(intake) || detectVertical(intake) === "clinic" ? " — مش للطوارئ" : ""}.`);
    if (site) push(site);
    if (isPediatrics(intake)) {
      push("جت أولاً بدون مواعيد — مش حاجة تحجزوا دور.");
    }
  } else if (locale === "he") {
    if (name && loc) push(`${name} ב${loc}.`);
    if (problem && !/^(unknown|custom)$/i.test(problem)) push(problem);
    if (adv) push(adv);
    if (hours) push(`שעות: ${clipAtWord(hours, 80)}`);
    if (phone) push(`וואטסאפ ${phone}.`);
    if (site) push(site);
  } else {
    if (name && loc) push(`${name} in ${loc}.`);
    if (problem && !/^(unknown|custom)$/i.test(problem)) push(problem);
    if (adv) push(adv);
    if (hours) push(`Hours: ${clipAtWord(hours, 80)}`);
    if (phone) push(`WhatsApp ${phone}.`);
    if (site) push(site);
  }
  return out.slice(0, 6);
}

export function lineOk(text: string, intake: Intake, locale: Locale, opts?: { requireBusiness?: boolean }): boolean {
  const t = normLine(text);
  if (t.length < 2 || t.length > 280) return false;
  if (customerCopyHasLeak(t) || hasBannedNonsense(t) || isStrategyLabelLine(t)) return false;
  if (localeScriptBleed(t, locale)) return false;
  if (locale === "ar" && arabicRegisterBleed(t, effectiveDialect(intake, locale), locale)) return false;
  if (clalitContamination(t, intake)) return false;
  if (inventsForbidden(t, intake)) return false;
  if (isCannedClinicSlogan(t, intake) && !isPediatrics(intake)) return false;
  if (/\b(ROAS|CAC|CPA|CTR)\b/i.test(t)) return false;
  if (foreignPlaceLeak(t, intake)) return false;
  if (opts?.requireBusiness && !groundedInThisBusiness(t, intake)) return false;
  return true;
}

const FOREIGN_PLACE =
  /الدار البيضاء|الرباط|مراكش|طنجة|سبتة|القاهرة|دبي|عمّان|عمان(?!\s)|بيروت|تونس|الجزائر|istanbul|casablanca|rabat|marrakech|tangier|ceuta/i;

export function foreignPlaceLeak(text: string, intake: Intake): boolean {
  if (!FOREIGN_PLACE.test(text)) return false;
  const blob = `${intake.location} ${intake.description} ${intake.businessName}`.toLowerCase();
  const hits = text.match(FOREIGN_PLACE);
  if (!hits) return false;
  return !hits.some((h) => blob.includes(h.toLowerCase()));
}

export function groundedInThisBusiness(text: string, intake: Intake): boolean {
  const src = String(text || "").toLowerCase();
  if (!src.trim()) return false;
  const bits = [
    intake.businessName,
    intake.location,
    intake.uniqueAdvantage,
    intake.whatsapp.split(/\s*[·|,;]\s*/)[0],
    intake.website.replace(/^https?:\/\//i, "").split("/")[0],
    intake.clinicHours.slice(0, 24),
  ]
    .map((s) => String(s || "").trim().toLowerCase())
    .filter((s) => s.length >= 4);
  return bits.some((b) => src.includes(b.slice(0, Math.min(14, b.length))));
}

export function makeOption(
  kind: CopyLineKind,
  text: string,
  locale: Locale,
  source: CopyLineSource,
  i: number,
  sourceUrl?: string,
): CopyLineOption {
  return {
    id: `line-${kind}-${source}-${i}-${uid("x").slice(-6)}`,
    kind,
    text: normLine(text),
    locale,
    source,
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

export function copyBatchQuality(options: CopyLineOption[], intake: Intake): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const texts = options.map((o) => o.text);
  if (options.length < COPY_LINE_MIN) reasons.push(`pool < ${COPY_LINE_MIN}`);
  const headlines = options.filter((o) => o.kind === "headline" || o.kind === "hook").map((o) => o.text);
  if (templateLoopHits(headlines).length && new Set(headlines.map(lineKey)).size < Math.min(3, headlines.length)) {
    reasons.push("headline-loop");
  }
  const ctas = options.filter((o) => o.kind === "cta").map((o) => o.text);
  if (ctas.length >= 2 && ctaMonoculture(ctas)) reasons.push("cta-monoculture");
  for (const t of texts) {
    if (hasBannedNonsense(t) || customerCopyHasLeak(t)) {
      reasons.push("banned-nonsense");
      break;
    }
    if (clalitContamination(t, intake)) {
      reasons.push("clalit-contamination");
      break;
    }
  }
  const unique = new Set(texts.map(lineKey));
  if (unique.size < Math.min(COPY_LINE_MIN, texts.length)) reasons.push("duplicate-lines");
  return { ok: reasons.length === 0, reasons };
}

export function researchSnippets(research: MarketResearch | undefined, locale: Locale): Array<{ text: string; url?: string }> {
  if (!research) return [];
  const out: Array<{ text: string; url?: string }> = [];
  for (const n of research.notes ?? []) {
    const title = n.title[locale] || n.title.en || n.title.he || "";
    const note = n.note[locale] || n.note.en || "";
    const t = normLine(`${title} — ${note}`.replace(/^ — /, ""));
    if (t.length >= 8) out.push({ text: clipAtWord(t, 90), url: n.sourceUrl });
  }
  for (const src of research.sources ?? []) {
    for (const ex of src.examples ?? []) {
      const title = ex.title[locale] || ex.title.en || "";
      const snip = ex.snippet[locale] || ex.snippet.en || "";
      const t = normLine(title || snip);
      if (t.length >= 8) out.push({ text: clipAtWord(t, 90), url: ex.url });
    }
  }
  return out.slice(0, 8);
}

export function buildLocalCopyLinePool(
  intake: Intake,
  locale: Locale,
  opts?: { research?: MarketResearch; exclude?: string[] },
): CopyLinePool {
  const exclude = new Set((opts?.exclude ?? []).map(lineKey));
  const options: CopyLineOption[] = [];
  const seen = new Set<string>();
  const add = (kind: CopyLineKind, text: string, source: CopyLineSource, url?: string) => {
    const t = normLine(text);
    if (!t || exclude.has(lineKey(t)) || seen.has(lineKey(t))) return;
    if (!lineOk(t, intake, locale)) return;
    if ((source === "research" || source === "gemini") && kind !== "cta" && !groundedInThisBusiness(t, intake)) return;
    if ([...seen].some((k) => tooSimilar(k, t))) return;
    seen.add(lineKey(t));
    options.push(makeOption(kind, t, locale, source, options.length, url));
  };

  for (const h of factHooks(intake, locale)) add("headline", h, "facts");
  const hooks = factHooks(intake, locale);
  for (let i = 0; i < hooks.length; i++) {
    if (i % 2 === 0) add("hook", hooks[i]!, "facts");
  }
  for (const b of factBodies(intake, locale)) add("primaryText", b, "facts");
  for (const c of ctaOptionsFor(intake, locale)) add("cta", c, "facts");

  for (const snip of researchSnippets(opts?.research, locale)) {
    if (!lineOk(snip.text, intake, locale, { requireBusiness: true })) continue;
    add("hook", snip.text, "research", snip.url);
  }

  const selectedIds = pickDiverseSelection(options);
  const primaryIds = pickPrimaryIds(options, selectedIds);
  return {
    locale,
    options,
    selectedIds,
    primaryIds,
    generatedAt: new Date().toISOString(),
    batchId: uid("batch"),
    grounded: Boolean(opts?.research?.grounded || opts?.research?.fetched),
    sources: (opts?.research?.notes ?? [])
      .filter((n) => n.sourceUrl)
      .slice(0, 6)
      .map((n) => ({ url: n.sourceUrl!, title: n.title[locale] || n.title.en })),
  };
}

export function pickDiverseSelection(options: CopyLineOption[]): string[] {
  const byKind: Record<CopyLineKind, CopyLineOption[]> = {
    hook: [],
    headline: [],
    primaryText: [],
    cta: [],
  };
  for (const o of options) byKind[o.kind].push(o);
  const ids: string[] = [];
  const take = (list: CopyLineOption[], n: number) => {
    const used: string[] = [];
    for (const o of list) {
      if (used.some((u) => tooSimilar(u, o.text))) continue;
      ids.push(o.id);
      used.push(o.text);
      if (used.length >= n) break;
    }
  };
  take(byKind.headline, 4);
  take(byKind.hook, 3);
  take(byKind.primaryText, 3);
  take(byKind.cta, 4);
  if (ids.length < 8) {
    for (const o of options) {
      if (!ids.includes(o.id)) ids.push(o.id);
      if (ids.length >= COPY_LINE_MIN) break;
    }
  }
  return ids;
}

export function pickPrimaryIds(options: CopyLineOption[], selectedIds: string[]): string[] {
  const selected = options.filter((o) => selectedIds.includes(o.id));
  const headline = selected.find((o) => o.kind === "headline") ?? selected.find((o) => o.kind === "hook");
  const cta = selected.find((o) => o.kind === "cta");
  const body = selected.find((o) => o.kind === "primaryText");
  return [headline?.id, cta?.id, body?.id].filter((x): x is string => Boolean(x));
}

export function applyCopyLinesToPack(pack: CampaignPack, pool?: CopyLinePool): CampaignPack {
  const copyLines = pool ?? pack.copyLines;
  if (!copyLines?.options.length) return pack;
  const locale = copyLines.locale;
  const selected = copyLines.options.filter((o) => copyLines.selectedIds.includes(o.id));
  const usable = selected.length >= 4 ? selected : copyLines.options;
  const headlines = usable.filter((o) => o.kind === "headline" || o.kind === "hook").map((o) => o.text);
  const bodies = usable.filter((o) => o.kind === "primaryText").map((o) => o.text);
  const ctas = usable.filter((o) => o.kind === "cta").map((o) => o.text);
  const headlinePool = headlines.length ? headlines : copyLines.options.filter((o) => o.kind === "headline").map((o) => o.text);
  const ctaPool = ctas.length ? ctas : ctaOptionsFor(pack.intake, locale);
  const bodyPool = bodies.length ? bodies : factBodies(pack.intake, locale);

  const usedH: string[] = [];
  const usedC: string[] = [];
  const variants: AdVariant[] = pack.variants.map((v, i) => {
    if (v.locale !== locale) return v;
    let headline = v.headline;
    let cta = v.cta;
    let body = v.primaryText;
    if (!lineOk(headline, pack.intake, locale) || usedH.some((u) => tooSimilar(u, headline))) {
      headline = pickUnused(headlinePool, usedH, v.headline) || headline;
    }
    if (!lineOk(cta, pack.intake, locale) || usedC.some((u) => tooSimilar(u, cta))) {
      cta = pickUnused(ctaPool, usedC, v.cta) || cta;
    }
    if (!lineOk(body, pack.intake, locale)) {
      body = bodyPool[i % Math.max(1, bodyPool.length)] || body;
    }
    const gated = gateCustomerAd({ headline, body, cta }, pack.intake, locale);
    headline = gated.headline;
    cta = gated.cta;
    usedH.push(headline);
    usedC.push(cta);
    return { ...v, headline, primaryText: gated.body, cta };
  });

  const repaired = diversifyLocaleBatch(variants, pack.intake, locale);
  let next: CampaignPack = {
    ...pack,
    variants: repaired,
    copyLines,
    updatedAt: new Date().toISOString(),
  };
  next = { ...next, agency: buildAgency(next) };
  next = attachCompleteAd(next, { rotate: false });
  if (next.completeAd?.locales[locale]) {
    const primaryH =
      copyLines.options.find((o) => copyLines.primaryIds.includes(o.id) && (o.kind === "headline" || o.kind === "hook"))?.text ||
      headlinePool[0];
    const primaryC =
      copyLines.options.find((o) => copyLines.primaryIds.includes(o.id) && o.kind === "cta")?.text || ctaPool[0];
    const primaryB =
      copyLines.options.find((o) => copyLines.primaryIds.includes(o.id) && o.kind === "primaryText")?.text || bodyPool[0];
    const loc = next.completeAd.locales[locale];
    const gated = gateCustomerAd(
      { headline: primaryH || loc.headline, body: primaryB || loc.copy, cta: primaryC || loc.cta },
      pack.intake,
      locale,
    );
    next = {
      ...next,
      completeAd: {
        ...next.completeAd,
        locales: {
          ...next.completeAd.locales,
          [locale]: {
            ...loc,
            headline: gated.headline,
            copy: gated.body,
            cta: gated.cta,
            hook: gated.headline,
          },
        },
      },
    };
  }
  return next;
}

function pickUnused(pool: string[], used: string[], fallback: string): string {
  const hit = pool.find((p) => p && !used.some((u) => tooSimilar(u, p)));
  return hit || pool.find((p) => p && p !== fallback) || fallback;
}

export function diversifyLocaleBatch(variants: AdVariant[], intake: Intake, locale: Locale): AdVariant[] {
  const idxs = variants.map((v, i) => (v.locale === locale ? i : -1)).filter((i) => i >= 0);
  if (idxs.length < 2) return variants;
  const out = [...variants];
  const ctas = idxs.map((i) => out[i]!.cta);
  const heads = idxs.map((i) => out[i]!.headline);
  const ctaBank = ctaOptionsFor(intake, locale);
  const headBank = factHooks(intake, locale);

  if (ctaMonoculture(ctas)) {
    const used: string[] = [];
    for (const i of idxs) {
      const nextCta = ctaBank.find((c) => !used.some((u) => tooSimilar(u, c))) || ctaBank[used.length % Math.max(1, ctaBank.length)] || out[i]!.cta;
      const gated = gateCustomerAd(
        { headline: out[i]!.headline, body: out[i]!.primaryText, cta: nextCta },
        intake,
        locale,
      );
      out[i] = { ...out[i]!, cta: gated.cta, headline: gated.headline, primaryText: gated.body };
      used.push(out[i]!.cta);
    }
  }

  if (identicalShare(heads) >= 0.5 || (templateLoopHits(heads).length && new Set(heads.map(lineKey)).size < 2)) {
    const used: string[] = [];
    for (const i of idxs) {
      const nextH = headBank.find((h) => !used.some((u) => tooSimilar(u, h))) || headBank[used.length % Math.max(1, headBank.length)] || out[i]!.headline;
      const gated = gateCustomerAd(
        { headline: nextH, body: out[i]!.primaryText, cta: out[i]!.cta },
        intake,
        locale,
      );
      out[i] = { ...out[i]!, headline: gated.headline, primaryText: gated.body, cta: gated.cta };
      used.push(out[i]!.headline);
    }
  }

  return out;
}

export function attachLocalCopyLines(pack: CampaignPack, locale?: Locale): CampaignPack {
  const preferred: Locale =
    locale ||
    (pack.intake.voice?.dialect?.startsWith("ar") || !pack.intake.voice?.dialect ? "ar" : "he");
  let next = pack;
  let shown: CopyLinePool | undefined;
  const order: Locale[] = (["he", "en", "ar"] as Locale[]).filter((l) => l !== preferred).concat(preferred);
  for (const loc of order) {
    const pool = buildLocalCopyLinePool(pack.intake, loc, { research: pack.research });
    next = applyCopyLinesToPack(next, pool);
    if (loc === preferred) shown = next.copyLines;
  }
  return { ...next, copyLines: shown || next.copyLines, updatedAt: new Date().toISOString() };
}

