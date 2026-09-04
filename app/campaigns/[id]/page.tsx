"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { CampaignPack } from "@/lib/types";
import { getCampaignMerged } from "@/lib/published-packs";
import { ensureAgency } from "@/lib/engine/agency";
import { ResultView } from "@/components/result-view";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { markEmptyCampaign } from "@/lib/empty-campaign";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const { t } = useI18n();
  const [pack, setPack] = useState<CampaignPack | null | undefined>(undefined);

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

  if (pack === undefined) {
    return <p className="p-10 text-center text-muted">…</p>;
  }
  if (!pack) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted">{t("campaigns.empty")}</p>
        <LangLink href="/" onClick={() => markEmptyCampaign()} className="mt-4 inline-block text-gold">
          {t("cta.new")}
        </LangLink>
      </div>
    );
  }
  return <ResultView pack={pack} onChange={setPack} />;
}
