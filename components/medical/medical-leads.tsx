"use client";

import { useState } from "react";
import Link from "next/link";
import type { LeadStatus, MedicalLead } from "@/lib/medical/types";
import { loadLeads, loadMedCampaigns, saveLeads, loadAppointments, saveAppointments } from "@/lib/medical/storage";
import { blockFor, waLink } from "@/lib/medical/generate";
import { uid } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { MedicalNav } from "@/components/medical/medical-nav";
import { EthicsBanner } from "@/components/medical/ethics-banner";
import { buildPediatricDemoCampaign } from "@/lib/medical/demo";
import { saveClinic, upsertMedCampaign } from "@/lib/medical/storage";

const FILTER_KEY = {
  all: "med.filter.all",
  new: "med.filter.new",
  "in-progress": "med.filter.in-progress",
  closed: "med.filter.closed",
} as const;

export function MedicalLeads() {
  const { locale, t } = useI18n();
  const client = useIsClient();
  const [leads, setLeads] = useState<MedicalLead[]>([]);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [booted, setBooted] = useState(false);

  if (client && !booted) {
    setLeads(loadLeads());
    setBooted(true);
  }

  function loadDemo() {
    const { clinic, campaign } = buildPediatricDemoCampaign();
    saveClinic(clinic);
    upsertMedCampaign(campaign);
    const sample: MedicalLead = {
      id: uid("lead"),
      campaignId: campaign.id,
      slug: campaign.slug,
      name: locale === "he" ? "הורה לדוגמה" : locale === "ar" ? "ولي أمر تجريبي" : "Demo parent",
      phone: "0501234567",
      message: "",
      status: "new",
      createdAt: new Date().toISOString(),
    };
    const next = [sample, ...loadLeads().filter((l) => l.id !== sample.id)];
    saveLeads(next);
    setLeads(next);
  }

  const shown = leads.filter((l) => filter === "all" || l.status === filter);
  const camps = client ? loadMedCampaigns() : [];

  function setStatus(id: string, status: LeadStatus) {
    const next = leads.map((l) => (l.id === id ? { ...l, status } : l));
    saveLeads(next);
    setLeads(next);
  }

  function toAppt(lead: MedicalLead) {
    const camp = camps.find((c) => c.id === lead.campaignId);
    const when = new Date(lead.createdAt);
    when.setUTCDate(when.getUTCDate() + 1);
    const appt = {
      id: uid("appt"),
      leadId: lead.id,
      campaignId: lead.campaignId,
      name: lead.name,
      phone: lead.phone,
      startsAt: when.toISOString(),
      durationMin: camp?.clinic.slotMinutes ?? 20,
      notes: lead.message,
      reminderPlan:
        locale === "he"
          ? "תזכורת וואטסאפ 24ש׳ לפני — קישור wa.me, לא שליחה חיה."
          : locale === "ar"
            ? "تذكير واتساب قبل 24 ساعة — رابط لا إرسال حي."
            : "WhatsApp reminder 24h prior — wa.me link, no live send.",
    };
    saveAppointments([appt, ...loadAppointments()]);
    const next = leads.map((l) => (l.id === lead.id ? { ...l, appointmentId: appt.id, status: "in-progress" as const } : l));
    saveLeads(next);
    setLeads(next);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ConquerHeadline subtitle={t("med.nav.leads")} />
      <DepartmentRail />
      <MedicalNav />
      <EthicsBanner locale={locale} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={loadDemo}>
          {t("med.demo")}
        </Button>
        {(["all", "new", "in-progress", "closed"] as const).map((f) => (
          <Button key={f} type="button" size="sm" variant={filter === f ? "default" : "dark"} onClick={() => setFilter(f)}>
            {f === "all" ? t("med.filter.all") : t(FILTER_KEY[f])}
          </Button>
        ))}
      </div>
      {shown.length === 0 && <p className="mt-8 text-center text-zinc-400">{t("med.leads.empty")}</p>}
      <ul className="mt-6 space-y-3">
        {shown.map((lead) => {
          const camp = camps.find((c) => c.id === lead.campaignId);
          const copy = camp ? blockFor(camp, locale) : null;
          const wa = camp && copy ? waLink(camp.clinic.whatsapp, copy.whatsappScript) : "";
          return (
            <li key={lead.id} className="rounded-2xl border border-white/10 bg-omni-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">{lead.name}</p>
                  <p className="text-sm text-zinc-400">{lead.phone}</p>
                  {lead.message && <p className="mt-1 text-sm text-zinc-300">{lead.message}</p>}
                  <p className="mt-1 text-[11px] text-zinc-500">{lead.createdAt.slice(0, 16).replace("T", " ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["new", "in-progress", "closed"] as const).map((st) => (
                    <Button key={st} type="button" size="sm" variant={lead.status === st ? "default" : "ghost"} onClick={() => setStatus(lead.id, st)}>
                      {t(FILTER_KEY[st])}
                    </Button>
                  ))}
                  {wa && (
                    <Button asChild size="sm" variant="outline">
                      <a href={wa} target="_blank" rel="noreferrer">
                        {t("med.wa")}
                      </a>
                    </Button>
                  )}
                  {camp && (
                    <Button asChild size="sm" variant="dark">
                      <Link href={`/lp/${camp.slug}`}>{t("med.openLp")}</Link>
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="dark" onClick={() => toAppt(lead)}>
                    {t("med.toAppt")}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
