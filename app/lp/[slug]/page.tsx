"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { CampaignPack } from "@/lib/types";
import type { MedicalCampaign } from "@/lib/medical/types";
import { campaignBySlug } from "@/lib/medical/storage";
import { getCampaignMerged } from "@/lib/published-packs";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";
import { LandingView } from "@/components/medical/landing-view";
import { PackLandingScreen } from "@/components/channel-pack";
import { LanguageToggle } from "@/components/header";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export default function PublicLandingPage() {
  const params = useParams<{ slug: string }>();
  const { locale, t } = useI18n();
  const [camp, setCamp] = useState<MedicalCampaign | null | undefined>(undefined);
  const [pack, setPack] = useState<CampaignPack | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setCamp(undefined);
    setPack(undefined);
    const medical = campaignBySlug(params.slug) ?? null;
    setCamp(medical);
    if (medical) {
      setPack(null);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const found = await getCampaignMerged(params.slug);
      if (!cancelled) setPack(found ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  if (camp === undefined || (camp === null && pack === undefined)) {
    return <p className="p-10 text-center text-zinc-500">…</p>;
  }

  if (camp) {
    return (
      <>
        <div className="fixed top-3 end-3 z-50">
          <LanguageToggle />
        </div>
        <LandingView campaign={camp} locale={locale} publicMode />
      </>
    );
  }

  if (pack) {
    return (
      <>
        <div className="fixed top-3 end-3 z-50">
          <LanguageToggle />
        </div>
        <PackLandingScreen pack={pack} locale={locale} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-zinc-300">{t("med.cred.empty")}</p>
      <Button
        type="button"
        data-demo="pediatric"
        className="mt-4 h-auto max-w-full whitespace-normal py-2"
        onClick={() => startPediatricDemoFlow(locale)}
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
