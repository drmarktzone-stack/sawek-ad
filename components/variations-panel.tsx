"use client";

import { useState } from "react";
import { Copy, FlaskConical, Languages, Loader2 } from "lucide-react";
import type { CampaignPack, Locale } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VariationCopy = { headline: string; body: string; cta: string };
type Variation = {
  id: string;
  channel: "meta" | "google" | "whatsapp" | "story";
  kind: string;
  he?: VariationCopy;
  ar?: VariationCopy;
  en?: VariationCopy;
};

type VariationsRes = {
  ok?: boolean;
  reason?: string;
  variations?: Variation[];
  model?: string;
  tier?: string;
  localized?: boolean;
  translationDown?: boolean;
};

function factsFromPack(pack: CampaignPack): string {
  const i = pack.intake;
  return [
    i.businessName && `businessName: ${i.businessName}`,
    i.category && `category: ${i.category}`,
    i.description && `description: ${i.description}`,
    i.audience && `audience: ${i.audience}`,
    i.uniqueAdvantage && `uniqueAdvantage: ${i.uniqueAdvantage}`,
    i.biggestProblem && `biggestProblem: ${i.biggestProblem}`,
    i.offer && `offer: ${i.offer}`,
    i.location && `location: ${i.location}`,
    i.whatsapp && `whatsapp: ${i.whatsapp}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function VariationsPanel({
  pack,
  locale,
  onPack,
}: {
  pack: CampaignPack;
  locale: Locale;
  onPack?: (p: CampaignPack) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [down, setDown] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const list = pack.flashVariations?.variations ?? [];

  async function run() {
    setBusy(true);
    setDown("");
    try {
      const res = await fetch("/api/generate/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: factsFromPack(pack),
          audience: pack.intake.audience,
          language: locale,
          mode: "variations",
          facts: factsFromPack(pack),
          count: 12,
        }),
      });
      const data = (await res.json()) as VariationsRes;
      if (!data?.ok || !data.variations?.length) {
        setDown(data?.reason === "quota" ? t("gcp.flashQuota") : t("gcp.flashDown"));
        return;
      }
      const next: CampaignPack = {
        ...pack,
        flashVariations: {
          variations: data.variations,
          model: data.model,
          localized: data.localized,
          translationDown: data.translationDown,
        },
        updatedAt: new Date().toISOString(),
      };
      onPack?.(next);
      if (data.translationDown) setDown(t("gcp.translationDown"));
    } catch {
      setDown(t("gcp.flashDown"));
    } finally {
      setBusy(false);
    }
  }

  async function localizePack() {
    if (!list.length) return;
    setLocBusy(true);
    setDown("");
    try {
      const nextVars: Variation[] = [];
      for (const v of list) {
        const src = v[locale] || v.he || v.en || v.ar;
        if (!src) {
          nextVars.push(v);
          continue;
        }
        const [h, b, c] = await Promise.all(
          (["headline", "body", "cta"] as const).map(async (field) => {
            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                he: field === "headline" || locale === "he" ? src[field] : v.he?.[field],
                ar: field === "headline" || locale === "ar" ? (locale === "ar" ? src[field] : v.ar?.[field]) : v.ar?.[field],
                en: field === "headline" || locale === "en" ? (locale === "en" ? src[field] : v.en?.[field]) : v.en?.[field],
                [locale]: src[field],
                source: locale,
              }),
            });
            return (await res.json()) as { he?: string; ar?: string; en?: string; reason?: string };
          }),
        );
        if (h.reason && b.reason && c.reason) {
          setDown(t("gcp.translationDown"));
          nextVars.push(v);
          continue;
        }
        nextVars.push({
          ...v,
          he: { headline: h.he || v.he?.headline || "", body: b.he || v.he?.body || "", cta: c.he || v.he?.cta || "" },
          ar: { headline: h.ar || v.ar?.headline || "", body: b.ar || v.ar?.body || "", cta: c.ar || v.ar?.cta || "" },
          en: { headline: h.en || v.en?.headline || "", body: b.en || v.en?.body || "", cta: c.en || v.en?.cta || "" },
        });
      }
      onPack?.({
        ...pack,
        flashVariations: { ...(pack.flashVariations || { variations: nextVars }), variations: nextVars, localized: true },
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setDown(t("gcp.translationDown"));
    } finally {
      setLocBusy(false);
    }
  }

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  }

  const channelLabel: Record<Variation["channel"], string> = {
    meta: t("var.ch.meta"),
    google: t("var.ch.google"),
    whatsapp: t("var.ch.whatsapp"),
    story: t("var.ch.story"),
  };

  return (
    <section data-gcp="variations" className="mb-8 rounded-2xl border border-gold/25 bg-white p-5">
      <p className="text-[13px] font-black uppercase tracking-[0.18em] text-gold">{t("var.title")}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{t("var.lead")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void run()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
          {busy ? t("var.working") : t("var.generate")}
        </Button>
        <Button type="button" variant="outline" onClick={() => void localizePack()} disabled={locBusy || !list.length}>
          {locBusy ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
          {t("var.localize")}
        </Button>
        {pack.flashVariations?.model ? (
          <span className="text-[12px] font-semibold text-muted">
            Flash · {pack.flashVariations.model}
          </span>
        ) : null}
      </div>
      {down ? <p className="mt-3 text-sm font-semibold text-gold">{down}</p> : null}
      {list.length ? (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {list.map((v) => {
            const copyBlock = v[locale] || v.he || v.en || v.ar;
            if (!copyBlock) return null;
            const blob = [copyBlock.headline, copyBlock.body, copyBlock.cta].filter(Boolean).join("\n");
            return (
              <li key={v.id} className="rounded-xl border border-navy/10 bg-background px-3 py-2.5">
                <p className="text-[11px] font-black uppercase tracking-wide text-teal">
                  {channelLabel[v.channel]} · {v.kind}
                </p>
                <p className="mt-1 text-sm font-black text-navy">{copyBlock.headline}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{copyBlock.body}</p>
                <p className="mt-1 text-sm font-semibold text-teal">{copyBlock.cta}</p>
                <button
                  type="button"
                  className={cn("mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-muted hover:text-navy")}
                  onClick={() => void copy(v.id, blob)}
                >
                  <Copy className="size-3.5" />
                  {copied === v.id ? t("var.copied") : t("var.copy")}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
