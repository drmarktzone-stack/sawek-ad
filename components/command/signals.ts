"use client";

import { useEffect, useState } from "react";
import type { CampaignPack, Intake } from "@/lib/types";
import type { GrowthWorkspace } from "@/lib/scientist/types";
import { loadDraft, loadCampaigns, INGEST_APPLIED_EVENT } from "@/lib/storage";
import { EMPTY_CAMPAIGN_EVENT } from "@/lib/empty-campaign";
import { emptyIntake, validateIntake } from "@/lib/engine/validate";
import { getWorkspaceByBusiness } from "@/lib/scientist/store";
import { businessIdFromName } from "@/lib/scientist/engines";
import { loadCampaignTools } from "@/lib/campaign-tools";
import { useIsClient } from "@/lib/use-is-client";
import { useAuth } from "@/components/auth-provider";

export type CommandSignals = {
  ready: boolean;
  intake: Intake;
  pack: CampaignPack | null;
  campaigns: CampaignPack[];
  workspace: GrowthWorkspace | null;
  hasBusiness: boolean;
  businessName: string;
  campaignName: string;
  completeness: number | null;
};

export function readSignals(): Omit<CommandSignals, "ready"> {
  const draft = loadDraft();
  const { pack, intake: truth } = loadCampaignTools();
  const campaigns = loadCampaigns().filter((p) => !p.demoMeta);
  const intake = truth ?? draft.intake ?? emptyIntake();
  const businessName = intake.businessName?.trim() || pack?.name || "";
  const workspace = businessName
    ? getWorkspaceByBusiness(businessIdFromName(businessName)) ?? null
    : null;
  return {
    intake,
    pack,
    campaigns,
    workspace,
    hasBusiness: Boolean(businessName),
    businessName,
    campaignName: pack?.name || "",
    completeness: validateIntake(intake).completeness,
  };
}

export function useCommandSignals(): CommandSignals {
  const client = useIsClient();
  const { ready: authReady } = useAuth();
  const [state, setState] = useState<CommandSignals>({
    ready: false,
    intake: emptyIntake(),
    pack: null,
    campaigns: [],
    workspace: null,
    hasBusiness: false,
    businessName: "",
    campaignName: "",
    completeness: null,
  });

  useEffect(() => {
    if (!client || !authReady) return;
    const refresh = () => setState({ ready: true, ...readSignals() });
    refresh();
    window.addEventListener(INGEST_APPLIED_EVENT, refresh);
    window.addEventListener(EMPTY_CAMPAIGN_EVENT, refresh);
    return () => {
      window.removeEventListener(INGEST_APPLIED_EVENT, refresh);
      window.removeEventListener(EMPTY_CAMPAIGN_EVENT, refresh);
    };
  }, [client, authReady]);

  return state;
}
