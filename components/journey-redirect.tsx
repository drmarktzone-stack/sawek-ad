"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { OsLoading, OsPage } from "@/components/command/primitives";
import { resolveCampaignPath } from "@/lib/campaign-path";
import { withLang } from "@/lib/locale-url";

/** Dead / orphan routes bounce onto the one campaign path. */
export function JourneyRedirect() {
  const router = useRouter();
  const { locale, t } = useI18n();

  useEffect(() => {
    const path = resolveCampaignPath();
    router.replace(withLang(path.href, locale));
  }, [router, locale]);

  return (
    <OsPage>
      <p className="os-kicker">{t("path.here")}</p>
      <p className="mt-2 max-w-xl text-sm text-muted">{t("path.lead")}</p>
      <OsLoading />
    </OsPage>
  );
}
