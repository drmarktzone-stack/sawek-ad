"use client";

import { useEffect, useState } from "react";
import { ToolsShell } from "@/components/tools/tools-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { loadCampaignTools, persistOfferBlueprint, persistSkipOffer } from "@/lib/campaign-tools";
import {
  canBuildOffer,
  generateOfferBlueprint,
  normalizeOfferBlueprint,
  offerBlueprintIsSaved,
  type OfferBuilderInput,
} from "@/lib/engine/offer-builder";
import type { OfferBlueprint } from "@/lib/types";
import { useIsClient } from "@/lib/use-is-client";

const emptyInput = (): OfferBuilderInput => ({
  dreamOutcome: "",
  proof: "",
  timeToResult: "",
  customerEffort: "",
  price: "",
  objections: "",
  guaranteeReal: false,
});

export function OfferBuilderTool() {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const [input, setInput] = useState<OfferBuilderInput>(emptyInput);
  const [offer, setOffer] = useState<OfferBlueprint | null>(null);
  const [need, setNeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!client) return;
    const { intake, pack } = loadCampaignTools();
    const existing = normalizeOfferBlueprint(intake.offerBlueprint ?? pack?.offerBlueprint, locale);
    if (offerBlueprintIsSaved(existing) || existing.skipped) setOffer(existing);
    setInput({
      dreamOutcome: existing.dreamOutcome,
      proof: existing.proof,
      timeToResult: existing.timeToResult,
      customerEffort: existing.customerEffort,
      price: existing.price,
      objections: existing.objections,
      guaranteeReal: existing.guaranteeReal,
    });
    setReady(true);
  }, [client, locale]);

  function patch(p: Partial<OfferBuilderInput>) {
    setInput((prev) => ({ ...prev, ...p }));
  }

  function build() {
    if (!canBuildOffer(input)) {
      setNeed(true);
      return;
    }
    setNeed(false);
    const { intake } = loadCampaignTools();
    const next = generateOfferBlueprint(input, { intake, locale });
    persistOfferBlueprint(next);
    setOffer(next);
  }

  function skip() {
    const next = persistSkipOffer(locale);
    setOffer(next.intake.offerBlueprint ?? null);
  }

  async function copyOut() {
    if (!offer) return;
    const text = [offer.headline, ...offer.valueStack, offer.guarantee, ...offer.hooks].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  if (!ready) return null;

  return (
    <ToolsShell kicker={t("nav.offerTool")} title={t("offer.title")} lead={t("offer.lead")} testId="tool-offer">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-4">
          <div>
            <Label htmlFor="ob-dream">{t("offer.dream")}</Label>
            <Input id="ob-dream" data-testid="ob-dream" value={input.dreamOutcome} placeholder={t("offer.dreamPh")} onChange={(e) => patch({ dreamOutcome: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ob-proof">{t("offer.proof")}</Label>
            <Input id="ob-proof" data-testid="ob-proof" value={input.proof} placeholder={t("offer.proofPh")} onChange={(e) => patch({ proof: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ob-time">{t("offer.time")}</Label>
            <Input id="ob-time" data-testid="ob-time" value={input.timeToResult} placeholder={t("offer.timePh")} onChange={(e) => patch({ timeToResult: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ob-effort">{t("offer.effort")}</Label>
            <Input id="ob-effort" data-testid="ob-effort" value={input.customerEffort} placeholder={t("offer.effortPh")} onChange={(e) => patch({ customerEffort: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ob-price">{t("offer.price")}</Label>
            <Input id="ob-price" data-testid="ob-price" value={input.price} placeholder={t("offer.pricePh")} onChange={(e) => patch({ price: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ob-obj">{t("offer.objections")}</Label>
            <Textarea id="ob-obj" data-testid="ob-obj" value={input.objections} placeholder={t("offer.objectionsPh")} className="min-h-20" onChange={(e) => patch({ objections: e.target.value })} />
          </div>
          <label className="flex items-start gap-2 text-sm font-bold text-navy">
            <input
              type="checkbox"
              data-testid="ob-guarantee-real"
              className="mt-1 size-4"
              checked={input.guaranteeReal}
              onChange={(e) => patch({ guaranteeReal: e.target.checked })}
            />
            {t("offer.guaranteeReal")}
          </label>
          <Button type="button" size="lg" className="w-full" data-testid="ob-build" onClick={build}>
            {t("offer.build")}
          </Button>
          {need ? <p className="text-sm font-bold text-danger">{t("offer.need")}</p> : null}
          <p className="text-xs text-muted">{t("offer.skipWarn")}</p>
          <Button type="button" variant="outline" className="w-full" data-testid="ob-skip" onClick={skip}>
            {t("offer.skip")}
          </Button>
        </div>

        <div className="space-y-3 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-4" data-testid="ob-output">
          {offer && offerBlueprintIsSaved(offer) ? (
            <>
              <p className="os-kicker">{t("offer.headline")}</p>
              <p className="os-title text-2xl" data-testid="ob-headline">{offer.headline}</p>
              <p className="os-kicker mt-4">{t("offer.stack")}</p>
              <ul className="list-disc ps-5 text-sm text-navy" data-testid="ob-stack">
                {offer.valueStack.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
              <p className="os-kicker mt-4">{t("offer.guarantee")}</p>
              <p className="text-sm" data-testid="ob-guarantee">
                {offer.guaranteeReal && offer.guarantee ? offer.guarantee : t("offer.noGuarantee")}
              </p>
              <p className="os-kicker mt-4">{t("offer.hooks")}</p>
              <ol className="list-decimal ps-5 text-sm font-semibold text-navy" data-testid="ob-hooks">
                {offer.hooks.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ol>
              <p className="text-sm font-bold text-teal">{t("tools.saved")}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void copyOut()}>
                  {copied ? t("tools.copied") : t("tools.copy")}
                </Button>
                <Button asChild>
                  <LangLink href="/tools/hso">{t("tools.nextHso")}</LangLink>
                </Button>
              </div>
            </>
          ) : offer?.skipped ? (
            <div>
              <p className="text-sm font-bold text-navy">{t("offer.skip")}</p>
              <p className="mt-2 text-sm text-muted">{t("offer.skipWarn")}</p>
              <Button asChild className="mt-4">
                <LangLink href="/tools/hso">{t("tools.nextHso")}</LangLink>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">{t("offer.lead")}</p>
          )}
        </div>
      </div>
    </ToolsShell>
  );
}
