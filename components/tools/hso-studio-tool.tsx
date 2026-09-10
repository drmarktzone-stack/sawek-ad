"use client";

import { useEffect, useState } from "react";
import { ToolsShell } from "@/components/tools/tools-shell";
import { CharterOnly } from "@/components/niche-gate";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { loadCampaignTools, persistHsoStudio } from "@/lib/campaign-tools";
import { canGenerateHso, generateHsoStudio } from "@/lib/engine/hso-studio";
import { offerBlueprintIsSaved } from "@/lib/engine/offer-builder";
import type { HsoPlatform, HsoStudioState, Intake } from "@/lib/types";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

const PLATFORMS: HsoPlatform[] = ["meta", "tiktok", "google"];

export function HsoStudioTool() {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const [platform, setPlatform] = useState<HsoPlatform>("meta");
  const [state, setState] = useState<HsoStudioState | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState("");
  const [ready, setReady] = useState(false);
  const [hasOffer, setHasOffer] = useState(false);
  const [intake, setIntake] = useState<Intake | null>(null);

  useEffect(() => {
    if (!client) return;
    const { intake: live, pack } = loadCampaignTools();
    setIntake(live);
    const offer = pack?.offerBlueprint ?? live.offerBlueprint;
    setHasOffer(offerBlueprintIsSaved(offer) || Boolean(live.offerSkipConfirmed || offer?.skipped));
    if (pack?.hsoStudio?.variants.length) setState(pack.hsoStudio);
    setReady(true);
  }, [client]);

  function generate() {
    const { intake, pack } = loadCampaignTools();
    if (!canGenerateHso(intake, pack)) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    const next = generateHsoStudio(intake, platform, locale);
    persistHsoStudio(next);
    setState(next);
  }

  async function copyVariant(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      /* ignore */
    }
  }

  if (!ready) return null;

  return (
    <ToolsShell kicker={t("nav.hso")} title={t("hso.title")} lead={t("hso.lead")} testId="tool-hso">
      <CharterOnly intake={intake}>
      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-4">
        <p className="os-kicker">{t("hso.platform")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`hso-platform-${p}`}
              onClick={() => setPlatform(p)}
              className={cn(
                "rounded-[12px] border px-4 py-2 text-sm font-black",
                platform === p ? "border-teal bg-teal text-white" : "border-navy/15 bg-white text-navy",
              )}
            >
              {t(`hso.${p}`)}
            </button>
          ))}
        </div>
        <Button type="button" size="lg" className="mt-4 w-full sm:w-auto" data-testid="hso-generate" onClick={generate} disabled={!hasOffer}>
          {t("hso.generate")}
        </Button>
        {!hasOffer || blocked ? (
          <p className="mt-3 text-sm font-bold text-danger" data-testid="hso-need-offer">
            {t("hso.needOffer")}{" "}
            <LangLink href="/tools/offer" className="underline">
              {t("nav.offerTool")}
            </LangLink>
          </p>
        ) : null}
      </div>

      {state?.variants.length ? (
        <div className="mt-5 space-y-3" data-testid="hso-output">
          <p className="os-kicker">
            {t("hso.count")}: {state.variants.length} · {state.platform}
          </p>
          {state.variants.map((v, i) => {
            const blob = [v.hook, v.story, v.offer, v.cta, v.format].join("\n");
            return (
              <article key={v.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-4" data-testid={`hso-card-${i}`}>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-teal">{v.format}</p>
                <p className="mt-2 text-sm"><span className="font-black">{t("hso.hook")}: </span>{v.hook}</p>
                <p className="mt-1 text-sm"><span className="font-black">{t("hso.story")}: </span>{v.story}</p>
                <p className="mt-1 text-sm"><span className="font-black">{t("hso.offer")}: </span>{v.offer} · {v.cta}</p>
                <p className="mt-1 text-xs text-muted">{t("hso.format")}: {v.format}</p>
                <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => void copyVariant(v.id, blob)}>
                  {copied === v.id ? t("tools.copied") : t("tools.copy")}
                </Button>
              </article>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <LangLink href="/task/ad">{t("tools.nextAd")}</LangLink>
            </Button>
            <Button asChild variant="outline">
              <LangLink href="/viral">{t("tools.nextContent")}</LangLink>
            </Button>
          </div>
        </div>
      ) : null}
      </CharterOnly>
    </ToolsShell>
  );
}
