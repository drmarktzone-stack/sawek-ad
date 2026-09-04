"use client";

import { useAuth } from "@/components/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { canUse, type ProFeature } from "@/lib/plan";
import { cn } from "@/lib/utils";

const KEY: Record<ProFeature, "plan.vertex" | "plan.zip" | "plan.landing" | "plan.calendar" | "plan.limit.campaign" | "plan.proOnly"> = {
  vertex: "plan.vertex",
  zip: "plan.zip",
  landing: "plan.landing",
  calendar: "plan.calendar",
  extraCampaign: "plan.limit.campaign",
  extraBusiness: "plan.limit.campaign",
};

export function PlanGate({
  feature,
  children,
  className,
}: {
  feature: ProFeature;
  children?: React.ReactNode;
  className?: string;
}) {
  const { plan } = useAuth();
  const { t } = useI18n();
  if (canUse(plan, feature)) return <>{children}</>;
  return (
    <div className={cn("rounded-2xl border border-gold/40 bg-white p-4", className)}>
      <p className="text-sm font-black text-navy">{t("plan.proOnly")}</p>
      <p className="mt-1 text-sm text-muted">{t(KEY[feature])}</p>
      <LangLink href="/pricing" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-coral px-4 py-2 text-sm font-black text-white">
        {t("plan.upgrade")}
      </LangLink>
    </div>
  );
}
