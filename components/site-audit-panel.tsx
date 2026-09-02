"use client";

import type { CampaignPack, Locale } from "@/lib/types";
import { buildSiteAudit } from "@/lib/engine/site-audit";
import { useI18n } from "@/components/i18n-provider";

export function SiteAuditPanel({ pack, locale }: { pack: CampaignPack; locale: Locale }) {
  const { t } = useI18n();
  const audit = pack.siteAudit ?? buildSiteAudit(pack.intake);
  if (!audit.strengths.length && !audit.weaknesses.length) return null;
  return (
    <section data-audit="site" className="mb-8 rounded-2xl border border-omni-yellow/25 bg-omni-card p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-omni-yellow">{t("audit.title")}</p>
      <p className="mt-1 text-xs text-zinc-500">{t("audit.lead")}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">{t("audit.strengths")}</p>
          <ul className="mt-2 space-y-2">
            {audit.strengths.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-sm text-zinc-100">{s.label[locale]}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{s.evidence[locale]}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-omni-red">{t("audit.weaknesses")}</p>
          <ul className="mt-2 space-y-2">
            {audit.weaknesses.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-sm text-zinc-100">{s.label[locale]}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{s.evidence[locale]}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
