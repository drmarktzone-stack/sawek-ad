"use client";

import type { CampaignPack, Locale, SiteAuditItem } from "@/lib/types";
import { buildSiteAudit } from "@/lib/engine/site-audit";
import { buildPastCampaignAudit } from "@/lib/engine/past-campaign-audit";
import { useI18n } from "@/components/i18n-provider";

function AuditList({ items, locale }: { items: SiteAuditItem[]; locale: Locale }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((s) => (
        <li key={s.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <p className="text-sm text-zinc-100">{s.label[locale]}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{s.evidence[locale]}</p>
        </li>
      ))}
    </ul>
  );
}

export function SiteAuditPanel({ pack, locale }: { pack: CampaignPack; locale: Locale }) {
  const { t } = useI18n();
  const audit = pack.siteAudit ?? buildSiteAudit(pack.intake);
  const past = pack.pastCampaignAudit ?? buildPastCampaignAudit(pack.intake);
  if (!audit.strengths.length && !audit.weaknesses.length && !past) return null;
  return (
    <>
      {(audit.strengths.length || audit.weaknesses.length) ? (
        <section data-audit="site" className="mb-8 rounded-2xl border border-omni-yellow/25 bg-omni-card p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-omni-yellow">{t("audit.title")}</p>
          <p className="mt-1 text-xs text-zinc-500">{t("audit.lead")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">{t("audit.strengths")}</p>
              <AuditList items={audit.strengths} locale={locale} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-omni-red">{t("audit.weaknesses")}</p>
              <AuditList items={audit.weaknesses} locale={locale} />
            </div>
          </div>
        </section>
      ) : null}

      {past ? (
        <section data-audit="past-campaigns" className="mb-8 rounded-2xl border border-omni-yellow/25 bg-omni-card p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-omni-yellow">{t("audit.pastTitle")}</p>
          <p className="mt-1 text-xs text-zinc-500">{t("audit.pastLead")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">{t("audit.strengths")}</p>
              <AuditList items={past.strengths} locale={locale} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-omni-red">{t("audit.weaknesses")}</p>
              <AuditList items={past.weaknesses} locale={locale} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-omni-yellow">{t("audit.inferredAudience")}</p>
              <p className="mt-1 text-sm text-zinc-100">{past.inferredAudience[locale]}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-omni-yellow">{t("audit.recommendedAudience")}</p>
              <p className="mt-1 text-sm text-zinc-100">{past.recommendedAudience[locale]}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-omni-red">{t("audit.failedWhere")}</p>
              <ul className="mt-1 space-y-1">
                {past.failedWhere.map((s) => (
                  <li key={s.id} className="text-sm text-zinc-100">
                    {s.label[locale]}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
