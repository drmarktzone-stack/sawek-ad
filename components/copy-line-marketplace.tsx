"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { CampaignPack, CopyLineKind, CopyLineOption, CopyLinePool, Locale } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { applyCopyLinesToPack } from "@/lib/engine/copy-line-pool";
import { syncCampaign } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const KINDS: CopyLineKind[] = ["hook", "headline", "primaryText", "cta"];

function factsFromPack(pack: CampaignPack) {
  const i = pack.intake;
  return {
    businessName: i.businessName,
    category: i.category,
    description: i.description,
    audience: i.audience,
    uniqueAdvantage: i.uniqueAdvantage,
    biggestProblem: i.biggestProblem,
    offer: i.offer,
    location: i.location,
    website: i.website,
    whatsapp: i.whatsapp,
    clinicHours: i.clinicHours,
    niche: i.voice?.niche,
    mainGoal: i.mainGoal,
    operatingModel: i.operatingModel,
    kupaFileBy: i.kupaFileBy,
    kupaMemberFrom: i.kupaMemberFrom,
  };
}

function kindLabel(kind: CopyLineKind, t: (k: string) => string): string {
  if (kind === "hook") return t("lines.kindHook");
  if (kind === "headline") return t("lines.kindHeadline");
  if (kind === "primaryText") return t("lines.kindBody");
  return t("lines.kindCta");
}

export function CopyLineMarketplace({
  pack,
  locale,
  onPack,
  compact,
}: {
  pack: CampaignPack;
  locale: Locale;
  onPack?: (p: CampaignPack) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const pool = pack.copyLines?.locale === locale ? pack.copyLines : pack.copyLines;
  const selected = useMemo(() => new Set(pool?.selectedIds ?? []), [pool?.selectedIds]);

  const fetchedKeyRef = useRef("");

  useEffect(() => {
    if (!onPack || !pack.id) return;
    const key = `${pack.id}:${locale}:${pack.research?.fetched ? "r" : "n"}`;
    if (fetchedKeyRef.current === key && (pack.copyLines?.options.length ?? 0) >= 12 && pack.copyLines?.locale === locale) {
      return;
    }
    let cancelled = false;
    setBusy(true);
    const facts = factsFromPack(pack);
    fetch("/api/copy-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facts,
        description: facts,
        audience: pack.intake.audience,
        locale,
        research: pack.research,
      }),
    })
      .then((r) => r.json())
      .then((data: CopyLinePool & { ok?: boolean }) => {
        if (cancelled || !data?.options?.length) return;
        fetchedKeyRef.current = key;
        const prev = pack.copyLines;
        let pool: CopyLinePool = data;
        if (prev?.selectedIds.length && prev.locale === locale) {
          const byText = new Map(data.options.map((o) => [o.text, o.id]));
          const mapped = prev.selectedIds
            .map((id) => {
              const old = prev.options.find((o) => o.id === id);
              return old ? byText.get(old.text) : undefined;
            })
            .filter((id): id is string => Boolean(id));
          if (mapped.length >= 4) {
            const primaryMapped = prev.primaryIds
              .map((id) => {
                const old = prev.options.find((o) => o.id === id);
                return old ? byText.get(old.text) : undefined;
              })
              .filter((id): id is string => Boolean(id));
            pool = { ...data, selectedIds: mapped, primaryIds: primaryMapped.length ? primaryMapped : data.primaryIds };
          }
        }
        const next = applyCopyLinesToPack(pack, pool);
        onPack(next);
        void syncCampaign(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // Network once per campaign+locale+research; regenerate is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id, locale, pack.research?.fetched]);

  function commit(nextPool: CopyLinePool) {
    if (!onPack) return;
    const next = applyCopyLinesToPack(pack, nextPool);
    onPack(next);
    void syncCampaign(next);
  }

  function toggle(opt: CopyLineOption) {
    if (!pool || !onPack) return;
    const ids = new Set(pool.selectedIds);
    if (ids.has(opt.id)) ids.delete(opt.id);
    else ids.add(opt.id);
    const selectedIds = [...ids];
    const primaryIds = pool.primaryIds.filter((id) => ids.has(id));
    if (opt.kind === "headline" && ids.has(opt.id) && !primaryIds.includes(opt.id)) primaryIds.unshift(opt.id);
    if (opt.kind === "cta" && ids.has(opt.id) && !primaryIds.includes(opt.id)) primaryIds.push(opt.id);
    commit({ ...pool, selectedIds, primaryIds: primaryIds.slice(0, 3) });
  }

  function setPrimary(opt: CopyLineOption) {
    if (!pool || !onPack) return;
    const selectedIds = pool.selectedIds.includes(opt.id) ? pool.selectedIds : [...pool.selectedIds, opt.id];
    const rest = pool.primaryIds.filter((id) => {
      const o = pool.options.find((x) => x.id === id);
      return o && o.kind !== opt.kind;
    });
    commit({ ...pool, selectedIds, primaryIds: [opt.id, ...rest].slice(0, 3) });
  }

  async function regenerate() {
    if (!onPack) return;
    setBusy(true);
    try {
      const facts = factsFromPack(pack);
      const exclude = (pool?.options ?? []).map((o) => o.text);
      const res = await fetch("/api/copy-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facts,
          description: facts,
          audience: pack.intake.audience,
          locale,
          research: pack.research,
          exclude,
          retry: true,
        }),
      });
      const data = (await res.json()) as CopyLinePool;
      if (data?.options?.length) {
        const next = applyCopyLinesToPack(pack, data);
        onPack(next);
        void syncCampaign(next);
      }
    } finally {
      setBusy(false);
    }
  }

  const options = pool?.options ?? [];
  const grouped = KINDS.map((kind) => ({ kind, rows: options.filter((o) => o.kind === kind) })).filter((g) => g.rows.length);

  return (
    <section
      data-testid="copy-line-marketplace"
      className={cn("agency-board mt-4 p-5 sm:p-7", compact && "mt-3 p-4")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-black uppercase tracking-[0.18em] text-teal">{t("lines.kicker")}</p>
          <h2 className="mt-1 text-xl font-black text-navy sm:text-2xl">{t("lines.title")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("lines.lead")}</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void regenerate()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {t("lines.regenerate")}
        </Button>
      </div>
      {busy && !options.length ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-navy">
          <Loader2 className="size-4 animate-spin text-teal" />
          {t("lines.loading")}
        </p>
      ) : null}
      {pool?.grounded ? <p className="mt-2 text-[11px] font-bold text-teal">{t("lines.grounded")}</p> : null}
      <div className="mt-4 space-y-4">
        {grouped.map((g) => (
          <div key={g.kind}>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-muted">{kindLabel(g.kind, t)}</p>
            <div className="flex flex-wrap gap-2">
              {g.rows.map((opt) => {
                const on = selected.has(opt.id);
                const primary = pool?.primaryIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt)}
                    onDoubleClick={() => setPrimary(opt)}
                    className={cn(
                      "max-w-full rounded-full border px-3 py-1.5 text-start text-[13px] font-semibold leading-snug transition",
                      on
                        ? "border-teal bg-teal/10 text-navy ring-1 ring-teal/40"
                        : "border-[rgba(8,17,31,0.12)] bg-white text-navy hover:border-teal/50",
                    )}
                  >
                    {primary ? <span className="me-1 text-teal">★</span> : null}
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted">{t("lines.hint")}</p>
    </section>
  );
}
