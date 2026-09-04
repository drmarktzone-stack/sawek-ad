"use client";

import { WandSparkles } from "lucide-react";
import { beginNewCampaign } from "@/lib/empty-campaign";
import { Button } from "@/components/ui/button";
import { LangLink } from "@/components/lang-link";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function NewCampaignCta({
  other = false,
  hint = false,
  size = "lg",
  className,
}: {
  other?: boolean;
  hint?: boolean;
  size?: "lg" | "default" | "sm";
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("flex flex-col", className)}>
      <Button asChild size={size}>
        <LangLink href="/" onClick={(e) => beginNewCampaign(e)}>
          <WandSparkles className="size-4" />
          {t(other ? "cta.newOther" : "cta.new")}
        </LangLink>
      </Button>
      {hint ? <p className="mt-2 max-w-md text-base text-muted">{t("cta.newHint")}</p> : null}
    </div>
  );
}
