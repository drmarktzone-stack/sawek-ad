"use client";

import { useEffect, useState } from "react";
import type { CampaignPack, Intake } from "@/lib/types";
import type { GrowthWorkspace } from "@/lib/scientist/types";
import { loadDraft, loadCampaigns } from "@/lib/storage";
import { loadCampaignTools } from "@/lib/campaign-tools";
import { getPrimaryWorkspace, loadScientistWorkspaces } from "@/lib/scientist/store";
import { emptyIntake } from "@/lib/engine/validate";
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
  const workspace = getPrimaryWorkspace() ?? loadScientistWorkspaces()[0] ?? null;
  const intake = truth ?? draft.intake ?? emptyIntake();
  const businessName = intake.businessName?.trim() || pack?.name || "";
  return {
    intake,
    pack,
    campaigns,
    workspace,
    hasBusiness: Boolean(businessName),
    businessName,
    campaignName: pack?.name || "",
    completeness: pack?.intakeReport.completeness ?? null,
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
    setState({ ready: true, ...readSignals() });
  }, [client, authReady]);

  return state;
}
