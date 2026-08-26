"use client";

import { useState } from "react";
import type { MedicalAppointment } from "@/lib/medical/types";
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
    startPediatricDemoFlow();
  }

  const clinic = client ? loadClinic() : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ConquerHeadline subtitle={t("med.nav.appts")} />
      <DepartmentRail />
      <MedicalNav />
      <EthicsBanner locale={locale} />
      <p className="mt-4 text-sm text-zinc-400">{t("med.appts.lead")}</p>
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
        <p className="mt-4 text-xs text-zinc-500">
          {t("med.clinic.slot")}: {clinic.slotMinutes} · {clinic.name}
        </p>
      )}
      {list.length === 0 && <p className="mt-8 text-center text-zinc-400">{t("med.appts.empty")}</p>}
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
            <li key={a.id} className="rounded-2xl border border-white/10 bg-omni-card p-4">
              <p className="font-black text-white">{a.name}</p>
              <p className="text-sm text-zinc-400">{a.phone}</p>
              <p className="mt-1 text-sm text-omni-yellow">{new Date(a.startsAt).toLocaleString()}</p>
              <p className="mt-2 text-xs text-zinc-500">{a.reminderPlan}</p>
              <div className="mt-3 flex gap-2">
                {wa && (
                  <Button asChild size="sm" variant="outline">
                    <a href={wa} target="_blank" rel="noreferrer">
                      {t("med.waRemind")}
                    </a>
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
