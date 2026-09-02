"use client";

import { useState } from "react";
import type { AppointmentStatus, MedicalAppointment } from "@/lib/medical/types";
import { loadAppointments, loadClinic, saveAppointments } from "@/lib/medical/storage";
import { waLink } from "@/lib/medical/generate";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { MedicalNav } from "@/components/medical/medical-nav";
import { EthicsBanner } from "@/components/medical/ethics-banner";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";

export function MedicalAppointments() {
  const { locale, t } = useI18n();
  const client = useIsClient();
  const [list, setList] = useState<MedicalAppointment[]>([]);
  const [booted, setBooted] = useState(false);

  if (client && !booted) {
    setList(loadAppointments());
    setBooted(true);
  }

  function loadDemo() {
    startPediatricDemoFlow(locale);
  }

  const clinic = client ? loadClinic() : null;
  const now = Date.now();
  const upcoming = list.filter((a) => new Date(a.startsAt).getTime() >= now - 36e5 && a.status !== "cancelled");
  const pendingN = upcoming.filter((a) => (a.status ?? "pending") === "pending").length;
  const pastN = list.filter((a) => new Date(a.startsAt).getTime() < now - 36e5).length;

  function setStatus(id: string, status: AppointmentStatus) {
    const next = list.map((a) => (a.id === id ? { ...a, status } : a));
    saveAppointments(next);
    setList(next);
  }

  const statusLabel: Record<AppointmentStatus, string> = {
    pending: t("med.appts.status.pending"),
    confirmed: t("med.appts.status.confirmed"),
    cancelled: t("med.appts.status.cancelled"),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ConquerHeadline subtitle={t("med.nav.appts")} />
      <DepartmentRail />
      <MedicalNav />
      <EthicsBanner locale={locale} />
      <p className="mt-4 text-sm text-muted">{t("med.appts.lead")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: t("med.appts.upcoming"), value: upcoming.length },
          { label: t("med.appts.pending"), value: pendingN },
          { label: t("med.appts.past"), value: pastN },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-navy/10 bg-white p-4 text-center">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-3xl font-black text-omni-yellow">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button
          type="button"
          data-demo="pediatric"
          className="h-auto max-w-full whitespace-normal py-2 text-start"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            loadDemo();
          }}
        >
          {t("med.demo")}
        </Button>
      </div>
      {clinic && (
        <p className="mt-4 text-xs text-muted">
          {t("med.clinic.slot")}: {clinic.slotMinutes} · {clinic.name}
        </p>
      )}
      {list.length === 0 && <p className="mt-8 text-center text-muted">{t("med.appts.empty")}</p>}
      <ul className="mt-6 space-y-3">
        {list.map((a) => {
          const wa = clinic
            ? waLink(
                clinic.whatsapp,
                locale === "he"
                  ? `תזכורת: תור ב${clinic.name} ב-${new Date(a.startsAt).toLocaleString("he-IL")}. ${a.reminderPlan}`
                  : locale === "ar"
                    ? `تذكير: موعد في ${clinic.name}. ${a.reminderPlan}`
                    : `Reminder: visit at ${clinic.name} on ${new Date(a.startsAt).toLocaleString("en-GB")}. ${a.reminderPlan}`,
              )
            : "";
          return (
            <li key={a.id} className="rounded-2xl border border-navy/10 bg-white p-4">
              <p className="font-black text-navy">{a.name}</p>
              <p className="text-sm text-muted">{a.phone}</p>
              <p className="mt-1 text-sm text-omni-yellow">{new Date(a.startsAt).toLocaleString()}</p>
              <p className="mt-1 text-xs font-bold text-omni-red">{statusLabel[a.status ?? "pending"]}</p>
              <p className="mt-2 text-xs text-muted">{a.reminderPlan}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {wa && (
                  <Button asChild size="sm" variant="outline">
                    <a href={wa} target="_blank" rel="noreferrer">
                      {t("med.waRemind")}
                    </a>
                  </Button>
                )}
                {(a.status ?? "pending") !== "confirmed" && (
                  <Button type="button" size="sm" onClick={() => setStatus(a.id, "confirmed")}>
                    {t("med.appts.confirm")}
                  </Button>
                )}
                {(a.status ?? "pending") !== "cancelled" && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setStatus(a.id, "cancelled")}>
                    {t("med.appts.cancel")}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const next = list.filter((x) => x.id !== a.id);
                    saveAppointments(next);
                    setList(next);
                  }}
                >
                  {t("campaigns.delete")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
