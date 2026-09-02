"use client";

import type { CampaignPack, Locale, SiteAuditItem } from "@/lib/types";
import { buildSiteAudit } from "@/lib/engine/site-audit";
import { buildPastCampaignAudit } from "@/lib/engine/past-campaign-audit";
import { useI18n } from "@/components/i18n-provider";
import { hoursChips, clipEvidence } from "@/lib/hours-chips";
import { ImageOfferPicker } from "@/components/image-offer-picker";

function AuditList({
  items,
  locale,
  pack,
  onPack,
}: {
  items: SiteAuditItem[];
  locale: Locale;
  pack: CampaignPack;
  onPack?: (p: CampaignPack) => void;
}) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((s) => {
        const hours = s.id === "hours";
        const chips = hours ? hoursChips(pack.intake.clinicHours || "", locale, 3) : [];
        const evidence = hours ? t("audit.hoursFromScan") : clipEvidence(s.evidence[locale]);
        return (
          <li key={s.id} className="rounded-xl border border-navy/10 bg-background px-3 py-2.5">
            <p className="text-sm leading-relaxed text-foreground">{s.label[locale]}</p>
            {hours && chips.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-navy/15 bg-navy/10 px-2.5 py-1 text-[13px] font-semibold text-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{evidence}</p>
            )}
            {s.id === "no-photos" && onPack ? (
              <ImageOfferPicker pack={pack} locale={locale} onPack={onPack} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function SiteAuditPanel({
  pack,
  locale,
  onPack,
}: {
  pack: CampaignPack;
  locale: Locale;
  onPack?: (p: CampaignPack) => void;
}) {
  const { t } = useI18n();
  const audit = pack.siteAudit ?? buildSiteAudit(pack.intake);
  const past = pack.pastCampaignAudit ?? buildPastCampaignAudit(pack.intake);
  if (!audit.strengths.length && !audit.weaknesses.length && !past) return null;
  return (
    <>
      {(audit.strengths.length || audit.weaknesses.length) ? (
        <section data-audit="site" className="mb-8 rounded-2xl border border-omni-yellow/25 bg-white p-5">
          <p className="text-[13px] font-black uppercase tracking-[0.18em] text-omni-yellow">{t("audit.title")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("audit.lead")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-emerald-700">{t("audit.strengths")}</p>
              <AuditList items={audit.strengths} locale={locale} pack={pack} onPack={onPack} />
            </div>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-omni-red">{t("audit.weaknesses")}</p>
              <AuditList items={audit.weaknesses} locale={locale} pack={pack} onPack={onPack} />
            </div>
          </div>
        </section>
      ) : null}

      {past ? (
        <section data-audit="past-campaigns" className="mb-8 rounded-2xl border border-omni-yellow/25 bg-white p-5">
          <p className="text-[13px] font-black uppercase tracking-[0.18em] text-omni-yellow">{t("audit.pastTitle")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("audit.pastLead")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-emerald-700">{t("audit.strengths")}</p>
              <AuditList items={past.strengths} locale={locale} pack={pack} onPack={onPack} />
            </div>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-omni-red">{t("audit.weaknesses")}</p>
              <AuditList items={past.weaknesses} locale={locale} pack={pack} onPack={onPack} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-navy/10 bg-background px-3 py-2">
              <p className="text-[13px] font-bold uppercase tracking-wide text-omni-yellow">{t("audit.inferredAudience")}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{past.inferredAudience[locale]}</p>
            </div>
            <div className="rounded-xl border border-navy/10 bg-background px-3 py-2">
              <p className="text-[13px] font-bold uppercase tracking-wide text-omni-yellow">{t("audit.recommendedAudience")}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{past.recommendedAudience[locale]}</p>
            </div>
            <div className="rounded-xl border border-navy/10 bg-background px-3 py-2">
              <p className="text-[13px] font-bold uppercase tracking-wide text-omni-red">{t("audit.failedWhere")}</p>
              <ul className="mt-1 space-y-1">
                {past.failedWhere.map((s) => (
                  <li key={s.id} className="text-sm leading-relaxed text-foreground">
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
