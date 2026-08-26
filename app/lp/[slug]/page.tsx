"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { MedicalCampaign } from "@/lib/medical/types";
import { campaignBySlug, saveClinic, upsertMedCampaign } from "@/lib/medical/storage";
import { buildPediatricDemoCampaign } from "@/lib/medical/demo";
import { LandingView } from "@/components/medical/landing-view";
import { LanguageToggle } from "@/components/header";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";

export default function PublicLandingPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { locale, t } = useI18n();
  const client = useIsClient();
  const [camp, setCamp] = useState<MedicalCampaign | null | undefined>(undefined);

  if (client && camp === undefined) {
    setCamp(campaignBySlug(params.slug) ?? null);
  }

  if (camp === undefined) return <p className="p-10 text-center text-zinc-500">…</p>;

  if (!camp) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-zinc-300">{t("med.cred.empty")}</p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => {
            const { clinic, campaign } = buildPediatricDemoCampaign();
            saveClinic(clinic);
            upsertMedCampaign(campaign);
            router.push(`/lp/${campaign.slug}`);
          }}
        >
          {t("med.demo")}
        </Button>
        <p className="mt-4">
          <Link href="/medical" className="text-omni-yellow">
            {t("nav.medical")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-3 end-3 z-50">
        <LanguageToggle />
      </div>
      <LandingView campaign={camp} locale={locale} publicMode />
    </>
  );
}
