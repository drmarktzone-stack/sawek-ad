"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { CampaignPack, Locale } from "@/lib/types";
import { getCampaignMerged } from "@/lib/published-packs";
import { ensureAgency } from "@/lib/engine/agency";
import { MediaDeptView } from "@/components/dept-media";
import { DepartmentRail, PackLangToggle } from "@/components/department-shell";
import { ConquerHeadline } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { markEmptyCampaign } from "@/lib/empty-campaign";

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const [pack, setPack] = useState<CampaignPack | null | undefined>(undefined);
  const [packLang, setPackLang] = useState<Locale>(locale);

  useEffect(() => {
    let cancelled = false;
    setPack(undefined);
    (async () => {
      const found = await getCampaignMerged(params.id);
      if (!cancelled) setPack(found ? ensureAgency(found) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    setPackLang(locale);
  }, [locale]);

  if (pack === undefined) {
    return <p className="p-10 text-center text-muted">…</p>;
  }
  if (!pack) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted">{t("campaigns.empty")}</p>
        <LangLink href="/" onClick={() => markEmptyCampaign()} className="mt-4 inline-block text-omni-yellow">
          {t("cta.new")}
        </LangLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ConquerHeadline subtitle={t("plan.title")} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-muted">{t("plan.lead")}</p>
      <DepartmentRail />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="dark">
          <LangLink href={`/campaigns/${pack.id}`}>{t("plan.openPack")}</LangLink>
        </Button>
        <PackLangToggle value={packLang} onChange={setPackLang} />
      </div>
      <MediaDeptView pack={pack} packLang={packLang} />
    </div>
  );
}
