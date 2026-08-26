"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { MedicalNav } from "@/components/medical/medical-nav";
import { EthicsBanner, MarkerCount } from "@/components/medical/ethics-banner";
import { LandingView } from "@/components/medical/landing-view";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { uid } from "@/lib/utils";
import { SPECIALTIES, SERVICE_LIBRARY, specialtyLabel } from "@/lib/medical/specialties";
import { LANDING_SKINS, defaultTemplateFor } from "@/lib/medical/skins";
import { DEFAULT_HOURS, EMPTY_TREATMENT, type ClinicProfile, type LandingTemplateId, type MedicalCampaign, type MedicalSpecialty, type Treatment } from "@/lib/medical/types";
import { generateMedicalCampaign, blockFor, waLink, exportMedicalPack } from "@/lib/medical/generate";
import { buildPediatricDemoCampaign } from "@/lib/medical/demo";
import {
  loadClinic,
  saveClinic,
  loadMedCampaigns,
  upsertMedCampaign,
} from "@/lib/medical/storage";
import { LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MedicalDesk() {
  const { locale, t } = useI18n();
  const client = useIsClient();
  const [booted, setBooted] = useState(false);
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [campaigns, setCampaigns] = useState<MedicalCampaign[]>([]);
  const [treatment, setTreatment] = useState<Treatment>({ ...EMPTY_TREATMENT, id: uid("tx") });
  const [template, setTemplate] = useState<LandingTemplateId>("clinical-trust");
  const [packLang, setPackLang] = useState<Locale>("he");
  const [preview, setPreview] = useState<MedicalCampaign | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  if (client && !booted) {
    const c = loadClinic();
    const list = loadMedCampaigns();
    setClinic(c);
    setCampaigns(list);
    setPreview(list[0] ?? null);
    if (c) {
      setTemplate(defaultTemplateFor(c.specialty));
      setStep(c ? 2 : 1);
    }
    setBooted(true);
  }

  function loadDemo() {
    const { clinic: c, campaign } = buildPediatricDemoCampaign();
    saveClinic(c);
    upsertMedCampaign(campaign);
    setClinic(c);
    setTreatment(campaign.treatment);
    setTemplate(campaign.template);
    setCampaigns(loadMedCampaigns());
    setPreview(campaign);
    setStep(3);
  }

  function pickSpecialty(id: MedicalSpecialty) {
    const next: ClinicProfile = clinic
      ? { ...clinic, specialty: id }
      : {
          id: uid("clinic"),
          name: "",
          doctorName: "",
          specialty: id,
          whatsapp: "",
          address: "",
          city: "",
          disclaimer: "",
          hours: DEFAULT_HOURS.map((h) => ({ ...h })),
          slotMinutes: 20,
        };
    setClinic(next);
    setTemplate(defaultTemplateFor(id));
    setStep(2);
  }

  function saveProfile() {
    if (!clinic || !clinic.name.trim()) return;
    saveClinic(clinic);
    setStep(3);
  }

  function generate() {
    if (!clinic) return;
    const camp = generateMedicalCampaign(clinic, treatment, template);
    upsertMedCampaign(camp);
    setCampaigns(loadMedCampaigns());
    setPreview(camp);
  }

  function approve() {
    if (!preview) return;
    const next = { ...preview, approved: true };
    upsertMedCampaign(next);
    setPreview(next);
    setCampaigns(loadMedCampaigns());
  }

  const services = clinic ? SERVICE_LIBRARY[clinic.specialty] : [];
  const copy = preview ? blockFor(preview, packLang) : null;
  const landingUrl = preview && typeof window !== "undefined" ? `${window.location.origin}/lp/${preview.slug}` : "";

  const hourLabels: Record<string, Record<Locale, string>> = useMemo(
    () => ({
      sun: { he: "א׳", ar: "أحد", en: "Sun" },
      mon: { he: "ב׳", ar: "إثن", en: "Mon" },
      tue: { he: "ג׳", ar: "ثلث", en: "Tue" },
      wed: { he: "ד׳", ar: "أرب", en: "Wed" },
      thu: { he: "ה׳", ar: "خميس", en: "Thu" },
      fri: { he: "ו׳", ar: "جمعة", en: "Fri" },
      sat: { he: "ש׳", ar: "سبت", en: "Sat" },
    }),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ConquerHeadline subtitle={t("nav.medical")} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-zinc-400">{t("med.lead")}</p>
      <DepartmentRail />
      <MedicalNav />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" onClick={loadDemo}>
          {t("med.demo")}
        </Button>
        <div className="flex gap-2 text-xs font-semibold text-zinc-400">
          <span className={step >= 1 ? "text-omni-yellow" : ""}>1. {t("med.step.specialty")}</span>
          <span className={step >= 2 ? "text-omni-yellow" : ""}>2. {t("med.step.clinic")}</span>
          <span className={step >= 3 ? "text-omni-yellow" : ""}>3. {t("med.step.campaign")}</span>
        </div>
      </div>

      <EthicsBanner locale={locale} />

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-omni-yellow">{t("med.step.specialty")}</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SPECIALTIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickSpecialty(s.id)}
              className={cn(
                "rounded-2xl border p-4 text-start",
                clinic?.specialty === s.id ? "border-omni-yellow bg-omni-yellow/10" : "border-white/10 bg-omni-card",
              )}
            >
              <p className="font-black text-white">{s.label[locale]}</p>
              <p className="mt-1 text-xs text-zinc-400">{s.hint[locale]}</p>
            </button>
          ))}
        </div>
      </section>

      {clinic && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-omni-card p-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-omni-yellow">{t("med.step.clinic")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("med.clinic.name")}</Label>
              <Input value={clinic.name} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("med.clinic.doctor")}</Label>
              <Input value={clinic.doctorName} onChange={(e) => setClinic({ ...clinic, doctorName: e.target.value })} />
            </div>
            <div>
              <Label>{t("med.clinic.wa")}</Label>
              <Input value={clinic.whatsapp} onChange={(e) => setClinic({ ...clinic, whatsapp: e.target.value })} />
            </div>
            <div>
              <Label>{t("med.clinic.city")}</Label>
              <Input value={clinic.city} onChange={(e) => setClinic({ ...clinic, city: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("med.clinic.address")}</Label>
              <Input value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("med.clinic.disclaimer")}</Label>
              <Textarea value={clinic.disclaimer} onChange={(e) => setClinic({ ...clinic, disclaimer: e.target.value })} />
            </div>
            <div>
              <Label>{t("med.clinic.slot")}</Label>
              <Input
                type="number"
                value={clinic.slotMinutes}
                onChange={(e) => setClinic({ ...clinic, slotMinutes: Number(e.target.value) || 20 })}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {clinic.hours.map((h, i) => (
              <label key={h.day} className="flex items-center gap-2 rounded-xl border border-white/10 p-2 text-xs">
                <input
                  type="checkbox"
                  checked={!h.closed}
                  onChange={(e) => {
                    const hours = clinic.hours.slice();
                    hours[i] = { ...h, closed: !e.target.checked };
                    setClinic({ ...clinic, hours });
                  }}
                />
                <span className="w-8 font-bold">{hourLabels[h.day][locale]}</span>
                <Input
                  className="h-8"
                  value={h.open}
                  onChange={(e) => {
                    const hours = clinic.hours.slice();
                    hours[i] = { ...h, open: e.target.value };
                    setClinic({ ...clinic, hours });
                  }}
                />
                <Input
                  className="h-8"
                  value={h.close}
                  onChange={(e) => {
                    const hours = clinic.hours.slice();
                    hours[i] = { ...h, close: e.target.value };
                    setClinic({ ...clinic, hours });
                  }}
                />
              </label>
            ))}
          </div>
          <Button type="button" className="mt-4" onClick={saveProfile} disabled={!clinic.name.trim()}>
            {t("med.saveClinic")}
          </Button>
        </section>
      )}

      {clinic && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-omni-card p-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-omni-yellow">{t("med.step.campaign")}</h2>
          <p className="mb-3 text-xs text-zinc-500">
            {t("med.library")} · {specialtyLabel(clinic.specialty, locale)}
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setTreatment({ ...treatment, serviceId: s.id, name: s.name[locale] })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  treatment.serviceId === s.id ? "bg-omni-yellow text-black" : "border border-white/10",
                )}
              >
                {s.name[locale]}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>{t("med.tx.name")}</Label>
              <Input value={treatment.name} onChange={(e) => setTreatment({ ...treatment, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("med.tx.indication")}</Label>
              <Textarea value={treatment.indication} onChange={(e) => setTreatment({ ...treatment, indication: e.target.value })} />
            </div>
            <div>
              <Label>{t("med.tx.duration")}</Label>
              <Input value={treatment.duration} onChange={(e) => setTreatment({ ...treatment, duration: e.target.value })} />
            </div>
            <div>
              <Label>{t("med.tx.price")}</Label>
              <Input value={treatment.price} onChange={(e) => setTreatment({ ...treatment, price: e.target.value })} placeholder={t("med.tx.leaveEmpty")} />
            </div>
            <div>
              <Label>{t("med.tx.cost")}</Label>
              <Input value={treatment.cost} onChange={(e) => setTreatment({ ...treatment, cost: e.target.value })} />
            </div>
            <div>
              <Label>{t("med.tx.tech")}</Label>
              <Input value={treatment.technology} onChange={(e) => setTreatment({ ...treatment, technology: e.target.value })} placeholder={t("med.tx.leaveEmpty")} />
            </div>
            <div>
              <Label>{t("med.tx.rate")}</Label>
              <Input value={treatment.successRate} onChange={(e) => setTreatment({ ...treatment, successRate: e.target.value })} placeholder={t("med.tx.leaveEmpty")} />
            </div>
            <div>
              <Label>{t("med.tx.source")}</Label>
              <Input value={treatment.sourceUrl} onChange={(e) => setTreatment({ ...treatment, sourceUrl: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={treatment.consentBeforeAfter}
                onChange={(e) => setTreatment({ ...treatment, consentBeforeAfter: e.target.checked })}
              />
              {t("med.tx.consent")}
            </label>
            {treatment.consentBeforeAfter && (
              <>
                <div>
                  <Label>{t("med.tx.before")}</Label>
                  <Input value={treatment.beforeCaption} onChange={(e) => setTreatment({ ...treatment, beforeCaption: e.target.value })} />
                </div>
                <div>
                  <Label>{t("med.tx.after")}</Label>
                  <Input value={treatment.afterCaption} onChange={(e) => setTreatment({ ...treatment, afterCaption: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <p className="mt-4 mb-2 text-xs font-bold uppercase text-zinc-500">{t("med.templates")}</p>
          <div className="flex flex-wrap gap-2">
            {LANDING_SKINS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setTemplate(s.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-semibold",
                  template === s.id ? "border-omni-yellow" : "border-white/10",
                )}
                style={{ background: s.bg, color: s.ink }}
              >
                {s.name[locale]}
              </button>
            ))}
          </div>
          <Button type="button" className="mt-4" onClick={generate} disabled={!clinic.name.trim()}>
            {t("med.generate")}
          </Button>
        </section>
      )}

      {preview && copy && (
        <section className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-omni-card px-4 py-3">
            <div>
              <p className="font-black text-white">{preview.clinic.name}</p>
              <MarkerCount n={preview.markerCount} locale={locale} />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-full border border-white/10 p-0.5">
                {LOCALES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setPackLang(l.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      packLang === l.id ? "bg-omni-yellow text-black" : "text-zinc-300",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <Button type="button" size="sm" variant={preview.approved ? "dark" : "default"} onClick={approve}>
                {preview.approved ? t("med.approved") : t("med.approve")}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/lp/${preview.slug}`}>{t("med.openLp")}</Link>
              </Button>
              {landingUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="dark"
                  onClick={() => navigator.clipboard.writeText(landingUrl)}
                >
                  {t("med.copyLink")}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="dark"
                onClick={() => {
                  const blob = new Blob([exportMedicalPack(preview, packLang)], { type: "text/plain;charset=utf-8" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${preview.slug}-${packLang}.txt`;
                  a.click();
                }}
              >
                {t("med.export")}
              </Button>
              {waLink(preview.clinic.whatsapp, copy.whatsappScript) && (
                <Button asChild size="sm" variant="dark">
                  <a href={waLink(preview.clinic.whatsapp, copy.whatsappScript)} target="_blank" rel="noreferrer">
                    {t("med.wa")}
                  </a>
                </Button>
              )}
            </div>
          </div>
          <EthicsBanner locale={packLang} />
          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-omni-card p-4">
              <p className="text-xs font-black uppercase text-omni-yellow">{t("med.social")}</p>
              {copy.socialPosts.map((p) => (
                <pre key={p.platform} className="mt-2 whitespace-pre-wrap font-sans text-sm text-zinc-300">
                  {p.platform}: {p.body}
                </pre>
              ))}
            </article>
            <article className="rounded-2xl border border-white/10 bg-omni-card p-4">
              <p className="text-xs font-black uppercase text-omni-yellow">{t("med.waScript")}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{copy.whatsappScript}</p>
              <p className="mt-4 text-xs font-black uppercase text-omni-yellow">{t("med.voice")}</p>
              <p className="mt-2 text-sm text-zinc-400">{copy.voiceScript}</p>
            </article>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <LandingView campaign={preview} locale={packLang} />
          </div>
        </section>
      )}

      {campaigns.length > 1 && (
        <ul className="mt-8 space-y-2">
          {campaigns.map((c) => (
            <li key={c.id}>
              <button type="button" className="w-full rounded-xl border border-white/10 px-4 py-2 text-start text-sm" onClick={() => setPreview(c)}>
                {c.clinic.name} · {c.treatment.name} · {c.markerCount} markers
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
