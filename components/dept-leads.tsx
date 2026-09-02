"use client";

import Link from "next/link";
import type { CampaignPack, Locale } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Card, ProducedBy } from "@/components/department-shell";
import { Button } from "@/components/ui/button";

export function LeadsDeptView({ pack, packLang }: { pack: CampaignPack; packLang: Locale }) {
  const { t } = useI18n();
  const leads = pack.agency!.leads;
  const l = packLang;

  return (
    <div className="space-y-4">
      <ProducedBy agents={leads.producedBy} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t("dept.magnet")}>
          <p className="text-sm leading-relaxed text-foreground">{leads.magnet[l]}</p>
        </Card>
        <Card title={t("dept.booking")}>
          <p className="inline-block rounded-lg bg-omni-yellow px-3 py-1 text-sm font-black text-black">
            {leads.bookingCta[l]}
          </p>
        </Card>
      </div>
      <Card title={t("dept.form")}>
        <ul className="space-y-2">
          {leads.formFields.map((f) => (
            <li key={f.field[l]} className="flex items-center justify-between rounded-xl border border-navy/10 px-4 py-2 text-sm">
              <span className="text-foreground">{f.field[l]}</span>
              <span className="text-xs font-bold text-omni-yellow">
                {f.required ? t("dept.required") : t("dept.optional")}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t("dept.crm")}>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {leads.crm.map((stage) => (
            <li key={stage.stage[l]} className="rounded-xl border border-navy/10 p-4">
              <p className="font-black text-navy">{stage.stage[l]}</p>
              <p className="mt-2 text-xs text-muted">{stage.meaning[l]}</p>
            </li>
          ))}
        </ol>
      </Card>
      <Card title={t("dept.promo")}>
        <p className="text-sm text-foreground">{leads.promoCodes[l]}</p>
      </Card>
      <Card title={t("dept.retarget")}>
        <p className="text-sm text-foreground">{leads.retargeting[l]}</p>
      </Card>
      <Card title={t("dept.cadence")}>
        <ol className="space-y-2">
          {leads.cadence.map((c) => (
            <li key={`${c.day}-${c.channel[l]}`} className="flex flex-wrap gap-2 rounded-xl border border-navy/10 p-3 text-sm">
              <span className="font-black text-omni-yellow">D{c.day}</span>
              <span className="font-semibold text-navy">{c.channel[l]}</span>
              <span className="text-muted">{c.action[l]}</span>
            </li>
          ))}
        </ol>
      </Card>
      <div className="rounded-2xl border border-navy/10 bg-white p-5">
        <p className="text-sm text-muted">{t("dept.selfStay")}</p>
        <Button asChild className="mt-3" size="sm">
          <Link href="/self">{t("nav.self")}</Link>
        </Button>
      </div>
    </div>
  );
}
