"use client";

import Link from "next/link";
import { useState } from "react";
import type { CampaignPack } from "@/lib/types";
import { deleteCampaign, loadCampaigns } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { useIsClient } from "@/lib/use-is-client";

export function CampaignsList() {
  const { t } = useI18n();
  const client = useIsClient();
  const [list, setList] = useState<CampaignPack[]>([]);
  const [booted, setBooted] = useState(false);

  if (client && !booted) {
    setList(loadCampaigns());
    setBooted(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ConquerHeadline subtitle={t("nav.campaigns")} />
      {list.length === 0 && (
        <p className="text-center text-zinc-400">{t("campaigns.empty")}</p>
      )}
      <ul className="space-y-3">
        {list.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-omni-card p-4"
          >
            <div>
              <p className="font-bold text-white">{c.name}</p>
              <p className="text-xs text-zinc-500">
                {c.createdAt.slice(0, 16).replace("T", " ")} · {c.intake.type} · {c.intake.depth}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link href={`/campaigns/${c.id}`}>{t("campaigns.open")}</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setList(deleteCampaign(c.id))}
              >
                {t("campaigns.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center">
        <Button asChild>
          <Link href="/">{t("cta.new")}</Link>
        </Button>
      </div>
    </div>
  );
}
