"use client";

import { SocialConnectStrip } from "@/components/publish-to-social";
import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";

export default function SocialSettingsPage() {
  const { t, locale } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10" dir={locale === "en" ? "ltr" : "rtl"}>
      <ConquerHeadline subtitle={t("social.settingsTitle")} />
      <p className="mb-6 text-center text-sm text-muted">{t("social.settingsLead")}</p>
      <SocialConnectStrip />
    </div>
  );
}
