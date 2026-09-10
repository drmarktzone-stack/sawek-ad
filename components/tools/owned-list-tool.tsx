"use client";

import { useEffect, useState } from "react";
import { ToolsShell } from "@/components/tools/tools-shell";
import { NicheGateCard } from "@/components/niche-gate";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { loadCampaignTools } from "@/lib/campaign-tools";
import { charterAllowsCampaign } from "@/lib/operating-niche";
import {
  addCampaignLead,
  loadOwnedList,
  ownedListIsReady,
  saveOwnedList,
  type CampaignLead,
  type OwnedListState,
} from "@/lib/owned-list";
import { whatsappScript } from "@/lib/engine/spoken";
import type { Intake } from "@/lib/types";
import { useIsClient } from "@/lib/use-is-client";

export function OwnedListTool() {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [list, setList] = useState<OwnedListState | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [leadError, setLeadError] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  useEffect(() => {
    if (!client) return;
    const { intake: live } = loadCampaignTools();
    setIntake(live);
    setList(loadOwnedList(live.businessName));
  }, [client]);

  if (!client || !intake || !list) return null;

  if (!intake.businessName.trim()) {
    return (
      <ToolsShell kicker={t("journey.list")} title={t("list.title")} lead={t("list.lead")} testId="owned-list">
        <p className="text-sm font-bold text-navy">{t("list.needBusiness")}</p>
        <Button asChild className="mt-4">
          <LangLink href="/">{t("path.scanNow")}</LangLink>
        </Button>
      </ToolsShell>
    );
  }

  if (!charterAllowsCampaign(intake)) {
    return (
      <ToolsShell kicker={t("journey.list")} title={t("list.title")} lead={t("list.lead")} testId="owned-list">
        <NicheGateCard intake={intake} />
      </ToolsShell>
    );
  }

  const live = intake;
  const owned = list;
  const script = whatsappScript(live, locale);

  async function markReady() {
    const next = { ...owned, whatsappReady: true };
    saveOwnedList(live.businessName, next);
    setList(next);
    try {
      await navigator.clipboard.writeText(script);
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 1600);
    } catch {
      /* clipboard may be blocked */
    }
  }

  function saveLead() {
    if (!name.trim() && !phone.trim()) {
      setLeadError(true);
      return;
    }
    setLeadError(false);
    const next = addCampaignLead(live.businessName, { name, phone, note });
    setList(next);
    setName("");
    setPhone("");
    setNote("");
  }

  return (
    <ToolsShell kicker={t("journey.list")} title={t("list.title")} lead={t("list.lead")} testId="owned-list">
      <section className="rounded-[22px] border-2 border-[var(--ink)] bg-white p-4 sm:p-5">
        <p className="os-kicker">{t("list.wa")}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-navy" dir={locale === "en" ? "ltr" : "rtl"}>
          {script}
        </p>
        <Button
          type="button"
          variant={owned.whatsappReady ? "default" : "outline"}
          className="mt-4 font-black"
          data-testid="list-wa-ready"
          onClick={markReady}
        >
          {copiedWa ? t("tools.copied") : t("list.waReady")}
        </Button>
      </section>

      <section className="mt-5 rounded-[22px] border-2 border-[var(--ink)] bg-white p-4 sm:p-5">
        <p className="os-kicker">{t("list.add")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="lead-name">{t("list.name")}</Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="list-lead-name" />
          </div>
          <div>
            <Label htmlFor="lead-phone">{t("list.phone")}</Label>
            <Input id="lead-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="list-lead-phone" />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="lead-note">{t("list.note")}</Label>
          <Textarea id="lead-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button type="button" className="mt-4 font-black" data-testid="list-save-lead" onClick={saveLead}>
          {t("list.saveLead")}
        </Button>
        {leadError ? (
          <p className="mt-3 text-sm font-bold text-danger" data-testid="list-lead-need">
            {t("list.needLead")}
          </p>
        ) : null}
        {!ownedListIsReady(owned) ? <p className="mt-3 text-sm text-muted">{t("list.empty")}</p> : null}
      </section>

      {owned.leads.length ? (
        <section className="mt-5" data-testid="list-saved">
          <p className="os-kicker">
            {t("list.count")} · {owned.leads.length}
          </p>
          <ul className="mt-3 divide-y divide-[var(--line)] rounded-[22px] border-2 border-[var(--ink)] bg-white">
            {owned.leads.map((lead: CampaignLead) => (
              <li key={lead.id} className="px-4 py-3">
                <p className="font-black text-navy">{lead.name || lead.phone}</p>
                {lead.phone ? <p className="text-sm text-muted" dir="ltr">{lead.phone}</p> : null}
                {lead.note ? <p className="text-sm text-muted">{lead.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <LangLink href="/task/ad">{t("path.makeAd")}</LangLink>
        </Button>
        <Button asChild variant="outline">
          <LangLink href="/campaigns">{t("nav.campaigns")}</LangLink>
        </Button>
      </div>
    </ToolsShell>
  );
}
