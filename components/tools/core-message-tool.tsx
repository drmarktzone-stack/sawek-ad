"use client";

import { useEffect, useState } from "react";
import { ToolsShell } from "@/components/tools/tools-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { loadCampaignTools, persistLockedVoice } from "@/lib/campaign-tools";
import { canLockCoreMessage, generateCoreMessage } from "@/lib/engine/core-message";
import { VOICE_DIALECTS, defaultDialectForLocale, normalizeVoice, voiceIsLocked } from "@/lib/engine/voice";
import type { Intake, VoiceDialect, VoiceProfile } from "@/lib/types";
import { useIsClient } from "@/lib/use-is-client";
import { cn, filled } from "@/lib/utils";

function inputFrom(intake: Intake): { niche: string; audience: string; dialect: VoiceDialect | ""; beliefs: string[]; neverSay: string } {
  const v = normalizeVoice(intake.voice);
  return {
    niche: v.niche || intake.category || "",
    audience: v.audience || intake.audience || "",
    dialect: v.dialect,
    beliefs: [v.beliefs[0] || "", v.beliefs[1] || "", v.beliefs[2] || ""],
    neverSay: v.neverSay || "",
  };
}

export function CoreMessageTool() {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [dialect, setDialect] = useState<VoiceDialect | "">("");
  const [beliefs, setBeliefs] = useState(["", "", ""]);
  const [neverSay, setNeverSay] = useState("");
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [need, setNeed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!client) return;
    const { intake } = loadCampaignTools();
    const next = inputFrom(intake);
    setNiche(next.niche);
    setAudience(next.audience);
    setDialect(next.dialect || (locale === "ar" ? defaultDialectForLocale("ar") : next.dialect));
    setBeliefs(next.beliefs);
    setNeverSay(next.neverSay);
    const existing = normalizeVoice(intake.voice);
    if (voiceIsLocked(existing)) setVoice(existing);
    setReady(true);
  }, [client]);

  function lock() {
    const input = { niche, audience, dialect, beliefs, neverSay };
    if (!canLockCoreMessage(input)) {
      setNeed(true);
      return;
    }
    setNeed(false);
    const { intake } = loadCampaignTools();
    const next = generateCoreMessage(input, { intake, locale });
    persistLockedVoice(next);
    setVoice(next);
    const id = intake.businessName.trim() || "draft";
    void fetch("/api/brand-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        businessName: intake.businessName,
        tone: next.personalVoice,
        do: next.beliefs.filter(Boolean),
        dont: next.neverSay ? [next.neverSay] : [],
        locales: { [locale]: { sample: next.coreMessage } },
        niche: next.niche,
        coreMessage: next.coreMessage,
        personalVoice: next.personalVoice,
        dialect: next.dialect,
      }),
    }).catch(() => undefined);
  }

  async function copyOut() {
    if (!voice) return;
    const text = [voice.coreMessage, voice.personalVoice].filter(Boolean).join("\n");
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
    <ToolsShell kicker={t("nav.voice")} title={t("voice.title")} lead={t("voice.lead")} testId="tool-core-message">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-4">
          <div>
            <Label htmlFor="cm-niche">{t("viral.niche")}</Label>
            <Input id="cm-niche" data-testid="cm-niche" value={niche} placeholder={t("viral.nichePh")} onChange={(e) => setNiche(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cm-audience">{t("voice.audience")}</Label>
            <Input id="cm-audience" data-testid="cm-audience" value={audience} placeholder={t("voice.audiencePh")} onChange={(e) => setAudience(e.target.value)} />
          </div>
          <div>
            <Label>{t("viral.dialect")}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {VOICE_DIALECTS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  data-testid={`cm-dialect-${d.id}`}
                  onClick={() => setDialect(d.id)}
                  className={cn(
                    "rounded-[12px] border px-3 py-2 text-start text-sm font-bold",
                    dialect === d.id ? "border-teal bg-teal text-white" : "border-[rgba(8,17,31,0.12)] bg-white text-navy",
                  )}
                >
                  <span className="block">{d.label[locale]}</span>
                  <span className={cn("mt-0.5 block text-xs font-medium", dialect === d.id ? "text-white/80" : "text-muted")}>
                    {d.hint[locale]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("voice.beliefs")}</Label>
            <div className="space-y-2">
              {beliefs.map((b, i) => (
                <Input
                  key={i}
                  data-testid={`cm-belief-${i}`}
                  value={b}
                  placeholder={t(`voice.beliefPh${i + 1}` as "voice.beliefPh1")}
                  onChange={(e) => setBeliefs((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                />
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="cm-never">{t("voice.never")}</Label>
            <Textarea id="cm-never" data-testid="cm-never" value={neverSay} placeholder={t("voice.neverPh")} className="min-h-20" onChange={(e) => setNeverSay(e.target.value)} />
          </div>
          <Button type="button" size="lg" className="w-full" data-testid="cm-lock" onClick={lock}>
            {t("voice.lock")}
          </Button>
          {need ? <p className="text-sm font-bold text-danger">{t("voice.need")}</p> : null}
        </div>

        <div className="space-y-3 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-4" data-testid="cm-output">
          {voice && filled(voice.coreMessage) ? (
            <>
              <p className="os-kicker">{t("voice.output")}</p>
              <p className="os-title text-2xl" data-testid="cm-core">{voice.coreMessage}</p>
              <p className="text-sm text-muted" data-testid="cm-personal">{voice.personalVoice}</p>
              <p className="text-sm font-bold text-teal">{t("tools.saved")}</p>
              <p className="text-sm text-navy">{t("voice.reuse")}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void copyOut()}>
                  {copied ? t("tools.copied") : t("tools.copy")}
                </Button>
                <Button asChild>
                  <LangLink href="/tools/offer">{t("tools.nextOffer")}</LangLink>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("voice.lead")}</p>
          )}
        </div>
      </div>
    </ToolsShell>
  );
}
