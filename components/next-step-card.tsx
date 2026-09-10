"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_STEPS, resolveCampaignPath } from "@/lib/campaign-path";
import { loadCampaignTools } from "@/lib/campaign-tools";
import { INGEST_APPLIED_EVENT } from "@/lib/storage";
import { EMPTY_CAMPAIGN_EVENT } from "@/lib/empty-campaign";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

export function NextStepCard({
  onScan,
  compact = false,
}: {
  onScan?: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const client = useIsClient();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(INGEST_APPLIED_EVENT, bump);
    window.addEventListener(EMPTY_CAMPAIGN_EVENT, bump);
    return () => {
      window.removeEventListener(INGEST_APPLIED_EVENT, bump);
      window.removeEventListener(EMPTY_CAMPAIGN_EVENT, bump);
    };
  }, []);

  const path = useMemo(() => (client ? resolveCampaignPath(loadCampaignTools()) : null), [client, tick]);
  if (!path) return null;

  const scanAction = path.current === "scan" && onScan;

  return (
    <section
      className={cn(
        "mb-5 rounded-[22px] border-2 border-[var(--ink)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5",
        compact && "mb-3 p-3",
      )}
      data-testid="next-step"
      data-step={path.current}
    >
      <p className="os-kicker">{t("path.here")}</p>
      <h2 className="os-title mt-1 text-2xl">
        {path.index + 1}/{CAMPAIGN_STEPS.length} · {t(path.key)}
      </h2>
      <p className="mt-2 text-sm text-muted">{t("path.lead")}</p>
      <div className="mt-4">
        {scanAction ? (
          <Button type="button" size="lg" variant="coral" className="btn-mobile-full font-black" onClick={onScan}>
            {t(path.cta)}
          </Button>
        ) : (
          <Button asChild size="lg" variant="coral" className="btn-mobile-full font-black">
            <LangLink href={path.href}>{t(path.cta)}</LangLink>
          </Button>
        )}
      </div>
    </section>
  );
}
