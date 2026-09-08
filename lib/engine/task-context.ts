/**
 * Task workspace context — one business + one campaign, no cross-contamination.
 */
import type { CampaignPack, CoachReport, CreativeFingerprint, Intake, MarketResearch } from "../types";
import { coachIntake } from "./coach";
import { businessKey, separateSources } from "./ad-engine/sources";
import { loadCreativeHistory, scopeFromPack } from "./ad-engine/memory";
import { decideComposition } from "./image-composition";
import { pickHero } from "../media-assets";

export type MarketingTaskId = "create_ad";

export interface TaskWorkspaceContext {
  task: MarketingTaskId;
  businessId: string;
  intake: Intake;
  pack?: CampaignPack;
  coach: CoachReport;
  history: CreativeFingerprint[];
  research?: MarketResearch;
  facts: {
    name: string;
    category: string;
    offer: string;
    audience: string;
    objective: string;
    location: string;
    website: string;
    advantage: string;
    problem: string;
    assets: number;
  };
  imageComposition?: ReturnType<typeof decideComposition>;
  empty: boolean;
}

export function detectMarketingTask(_intake: Intake): MarketingTaskId {
  return "create_ad";
}

export function buildTaskContext(input: {
  intake: Intake;
  pack?: CampaignPack | null;
  ownerId?: string;
  clientId?: string;
}): TaskWorkspaceContext {
  const intake = input.intake;
  const empty = !intake.businessName.trim() && !intake.website.trim() && !intake.description.trim();
  const pack = input.pack || undefined;
  const businessId = businessKey(intake.businessName || intake.website || pack?.intake.businessName || "");
  const history =
    !empty && businessId && businessId !== "unnamed-business"
      ? loadCreativeHistory({
          businessId,
          ownerId: input.ownerId || pack?.ownerId,
          clientId: input.clientId || pack?.clientId,
          sample: Boolean(pack?.demoMeta?.sample),
        })
      : [];
  const hero = pickHero(intake.mediaAssets);
  const imageComposition = hero
    ? decideComposition({ asset: hero })
    : undefined;
  return {
    task: detectMarketingTask(intake),
    businessId,
    intake,
    pack,
    coach: pack?.coach ?? coachIntake(intake),
    history,
    research: pack?.research,
    facts: {
      name: intake.businessName.trim(),
      category: intake.category.trim(),
      offer: intake.offer.trim(),
      audience: intake.audience.trim(),
      objective: intake.mainGoal.trim(),
      location: intake.location.trim(),
      website: intake.website.trim(),
      advantage: intake.uniqueAdvantage.trim(),
      problem: intake.biggestProblem.trim(),
      assets: intake.mediaAssets?.length ?? 0,
    },
    imageComposition,
    empty,
  };
}

export function contextBelongsToBusiness(ctx: TaskWorkspaceContext, name: string): boolean {
  return ctx.businessId === businessKey(name);
}

export function layersForTask(ctx: TaskWorkspaceContext) {
  return separateSources(ctx.intake, {
    pack: ctx.pack,
    research: ctx.research,
    fingerprints: ctx.history,
  });
}

export { businessKey, scopeFromPack };
