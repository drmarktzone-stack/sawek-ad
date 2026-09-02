"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import type { CampaignAngles, Locale } from "@/lib/types";
import { ANGLE_IDS, angleCopyText, INCOMPLETE } from "@/lib/engine/angles";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

const KEYS = {
  pain: "lab.angle.pain",
  benefit: "lab.angle.benefit",
  social_proof: "lab.angle.social_proof",
  story: "lab.angle.story",
} as const;

export function AnglesStrip({
  angles,
  locale,
}: {
  angles?: CampaignAngles;
  locale: Locale;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);
  if (!angles) return null;

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-black text-navy">{t("result.angles")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ANGLE_IDS.map((id) => {
          const pack = angles[id]?.[locale] ?? angles[id]?.he;
          const incomplete = !pack || pack.headline === INCOMPLETE[locale] || pack.copy === INCOMPLETE[locale];
          const text = pack ? angleCopyText(pack) : INCOMPLETE[locale];
          return (
            <article
              key={id}
              className="flex flex-col rounded-2xl border border-omni-yellow/25 bg-white p-4"
            >
              <p className="text-sm font-black uppercase tracking-[0.18em] text-omni-yellow">
                {t(KEYS[id])}
              </p>
              {incomplete && id === "social_proof" && (
                <p className="mt-1 text-sm text-muted">{t("lab.noProof")}</p>
              )}
              <h3 className="mt-2 text-sm font-black text-navy">{pack?.headline || INCOMPLETE[locale]}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{pack?.copy || INCOMPLETE[locale]}</p>
              <p className="mt-2 text-xs font-bold text-omni-yellow">{pack?.cta || INCOMPLETE[locale]}</p>
              <Button
                type="button"
                size="sm"
                variant="dark"
                className="mt-3"
                onClick={() => void copy(id, text)}
              >
                <Copy className="size-3.5" />
                {copied === id ? t("lab.copied") : t("lab.copy")}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
