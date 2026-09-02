"use client";

import type { CampaignPack, Locale } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Card, ProducedBy } from "@/components/department-shell";

export function StrategyDeptView({ pack, packLang }: { pack: CampaignPack; packLang: Locale }) {
  const { t } = useI18n();
  const s = pack.agency!.strategy;
  const l = packLang;
  const stack = [
    ["stack.leadMagnet", s.offerStack.leadMagnet],
    ["stack.tripwire", s.offerStack.tripwire],
    ["stack.core", s.offerStack.core],
    ["stack.upsell", s.offerStack.upsell],
    ["stack.continuity", s.offerStack.continuity],
  ] as const;

  return (
    <div className="space-y-4">
      <ProducedBy agents={s.producedBy} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t("dept.positioning")}>
          <p className="text-sm leading-relaxed text-foreground">{s.positioning[l]}</p>
        </Card>
        <Card title={t("dept.mechanism")}>
          <p className="text-sm leading-relaxed text-foreground">{s.uniqueMechanism[l]}</p>
        </Card>
      </div>
      <Card title={t("dept.hormozi")}>
        <p className="text-sm leading-relaxed text-foreground">{s.hormozi[l]}</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="AIDA">
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <strong className="text-omni-yellow">A. </strong>
              {s.aida.attention[l]}
            </li>
            <li>
              <strong className="text-omni-yellow">I. </strong>
              {s.aida.interest[l]}
            </li>
            <li>
              <strong className="text-omni-yellow">D. </strong>
              {s.aida.desire[l]}
            </li>
            <li>
              <strong className="text-omni-yellow">A. </strong>
              {s.aida.action[l]}
            </li>
          </ul>
        </Card>
        <Card title="PAS">
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <strong className="text-omni-yellow">P. </strong>
              {s.pas.problem[l]}
            </li>
            <li>
              <strong className="text-omni-yellow">A. </strong>
              {s.pas.agitate[l]}
            </li>
            <li>
              <strong className="text-omni-yellow">S. </strong>
              {s.pas.solution[l]}
            </li>
          </ul>
        </Card>
        <Card title="Hook–Story–Offer">
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <strong className="text-omni-yellow">H. </strong>
              {s.hso.hook[l]}
            </li>
            <li>
              <strong className="text-omni-yellow">S. </strong>
              {s.hso.story[l]}
            </li>
            <li>
              <strong className="text-omni-yellow">O. </strong>
              {s.hso.offer[l]}
            </li>
          </ul>
        </Card>
      </div>
      <Card title={t("dept.offerStack")}>
        <ol className="space-y-3">
          {stack.map(([key, body]) => (
            <li key={key} className="rounded-xl border border-navy/10 p-3">
            <p className="text-xs font-black uppercase text-omni-yellow">{t(key)}</p>
              <p className="mt-1 text-sm text-foreground">{body[l]}</p>
            </li>
          ))}
        </ol>
      </Card>
      <Card title={t("dept.funnel")}>
        <div className="grid gap-3 md:grid-cols-3">
          {(["tof", "mof", "bof"] as const).map((k) => (
            <div key={k} className="rounded-xl border border-navy/10 p-4">
              <p className="text-xs font-black uppercase text-omni-yellow">{k}</p>
              <p className="mt-2 text-sm text-foreground">{s.funnel[k][l]}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title={t("dept.calendar")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {s.calendar.map((w) => (
            <div key={w.week} className="rounded-xl border border-navy/10 p-3">
              <p className="text-xs font-black text-omni-yellow">
                {t("dept.week")} {w.week}
              </p>
              <p className="mt-1 text-sm font-semibold text-navy">{w.theme[l]}</p>
              <p className="mt-1 text-xs text-muted">{w.action[l]}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
