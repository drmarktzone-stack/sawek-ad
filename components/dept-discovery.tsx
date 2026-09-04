"use client";

import type { CampaignPack, Locale } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Card, ProducedBy } from "@/components/department-shell";

export function DiscoveryDeptView({ pack, packLang }: { pack: CampaignPack; packLang: Locale }) {
  const { t } = useI18n();
  const d = pack.agency!.discovery;
  const l = packLang;

  return (
    <div className="space-y-4">
      <ProducedBy agents={d.producedBy} />
      <Card title={t("dept.audit")}>
        <dl className="space-y-3">
          {d.audit.map((row) => (
            <div key={row.title[l]}>
              <dt className="text-xs font-bold text-muted">{row.title[l]}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-foreground">{row.body[l]}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card title={t("dept.icp")}>
        <p className="text-sm leading-relaxed text-foreground">{d.icp[l]}</p>
      </Card>
      <Card title={t("dept.personas")}>
        <div className="grid gap-3 md:grid-cols-3">
          {d.personas.map((p) => (
            <article key={p.name[l]} className="rounded-xl border border-navy/10 p-4">
              <p className="font-black text-navy">{p.name[l]}</p>
              <p className="mt-2 text-sm text-muted">
                <span className="text-gold">JTBD. </span>
                {p.jtbd[l]}
              </p>
              <p className="mt-2 text-xs text-muted">{p.given[l]}</p>
              <p className="mt-1 text-xs text-muted">{p.unknown[l]}</p>
            </article>
          ))}
        </div>
      </Card>
      <Card title={t("dept.swot")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["S", d.swot.strength],
              ["W", d.swot.weakness],
              ["O", d.swot.opportunity],
              ["T", d.swot.threat],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-navy/10 p-4">
              <p className="text-xs font-black text-gold">{k}</p>
              <p className="mt-1 text-sm text-foreground">{v[l]}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title={t("dept.battlecards")}>
        <p className="mb-3 text-sm text-muted">{d.competitorsMissing[l]}</p>
        {d.battlecards.length === 0 ? (
          <p className="text-sm text-muted">{t("review.competitorsEmpty")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {d.battlecards.map((b) => (
              <article key={b.competitorId} className="rounded-xl border border-navy/10 p-4">
                <p className="font-black text-navy">{b.name}</p>
                {b.notes && <p className="mt-1 text-xs text-muted">{b.notes}</p>}
                <ul className="mt-3 space-y-1 text-sm text-muted">
                  <li>
                    <strong className="text-gold">S. </strong>
                    {b.strength[l]}
                  </li>
                  <li>
                    <strong className="text-gold">W. </strong>
                    {b.weakness[l]}
                  </li>
                  <li>
                    <strong className="text-gold">O. </strong>
                    {b.opportunity[l]}
                  </li>
                  <li>
                    <strong className="text-gold">T. </strong>
                    {b.threat[l]}
                  </li>
                </ul>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
