"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { CampaignPack, Locale } from "@/lib/types";
import { loadCampaigns } from "@/lib/storage";
import { ensureAgency } from "@/lib/engine/agency";
import { MediaDeptView } from "@/components/dept-media";
import { DepartmentRail, PackLangToggle } from "@/components/department-shell";
import { ConquerHeadline } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { LangLink } from "@/components/lang-link";
import { markEmptyCampaign } from "@/lib/empty-campaign";

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const client = useIsClient();
  const [pack, setPack] = useState<CampaignPack | null | undefined>(undefined);
  const [packLang, setPackLang] = useState<Locale>(locale);

  if (client && pack === undefined) {
    const found = loadCampaigns().find((c) => c.id === params.id);
    setPack(found ? ensureAgency(found) : null);
  }

  useEffect(() => {
    setPackLang(locale);
  }, [locale]);

  if (pack === undefined) {
    return <p className="p-10 text-center text-zinc-500">…</p>;
  }
  if (!pack) {
    return (
      <div className="p-10 text-center">
        <p className="text-zinc-400">{t("campaigns.empty")}</p>
        <LangLink href="/" onClick={() => markEmptyCampaign()} className="mt-4 inline-block text-omni-yellow">
          {t("cta.new")}
        </LangLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ConquerHeadline subtitle={t("plan.title")} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-zinc-400">{t("plan.lead")}</p>
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
