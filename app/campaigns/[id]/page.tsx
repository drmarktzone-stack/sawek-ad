"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { CampaignPack } from "@/lib/types";
import { loadCampaigns } from "@/lib/storage";
import { ResultView } from "@/components/result-view";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const { t } = useI18n();
  const client = useIsClient();
  const [pack, setPack] = useState<CampaignPack | null | undefined>(undefined);

  if (client && pack === undefined) {
    setPack(loadCampaigns().find((c) => c.id === params.id) ?? null);
  }

  if (pack === undefined) {
    return <p className="p-10 text-center text-zinc-500">…</p>;
  }
  if (!pack) {
    return (
      <div className="p-10 text-center">
        <p className="text-zinc-400">{t("campaigns.empty")}</p>
        <Link href="/" className="mt-4 inline-block text-omni-yellow">
          {t("cta.new")}
        </Link>
      </div>
    );
  }
  return <ResultView pack={pack} onChange={setPack} />;
}
