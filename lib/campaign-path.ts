import type { CampaignPack, Intake } from "./types";
import { loadCampaignTools, type CampaignToolSnapshot } from "./campaign-tools";
import { wizardReady } from "./engine/validate";
import { offerBlueprintIsSaved } from "./engine/offer-builder";
import { charterAllowsCampaign } from "./operating-niche";
import { ownedListIsReady, loadOwnedList } from "./owned-list";

/** Canonical campaign path — scan, then the 4 Mohtawak pillars. */
export const CAMPAIGN_STEPS = [
  { id: "scan", href: "/", key: "journey.scan" as const, cta: "path.scanNow" as const },
  { id: "client", href: "/#studio", key: "journey.client" as const, cta: "path.lockClient" as const },
  { id: "offer", href: "/tools/offer", key: "journey.offer" as const, cta: "path.saveOffer" as const },
  { id: "trust", href: "/task/ad", key: "journey.trust" as const, cta: "path.makeAd" as const },
  { id: "list", href: "/tools/list", key: "journey.list" as const, cta: "path.captureList" as const },
] as const;

export type PathStepId = (typeof CAMPAIGN_STEPS)[number]["id"];

export type PathDone = Record<PathStepId, boolean>;

export type CampaignPathState = {
  current: PathStepId;
  href: string;
  cta: (typeof CAMPAIGN_STEPS)[number]["cta"];
  key: (typeof CAMPAIGN_STEPS)[number]["key"];
  done: PathDone;
  index: number;
  intake: Intake;
  pack: CampaignPack | null;
  gated: boolean;
};

/** Orphan desks that strand users — hide from nav and bounce to the live path. */
export const DEAD_JOURNEY_HREFS = [
  "/growth",
  "/lab",
  "/discovery",
  "/strategy",
  "/media",
  "/leads",
  "/self",
  "/studio",
] as const;

function stepDone(intake: Intake, pack: CampaignPack | null): PathDone {
  const hasScan = Boolean(intake.website?.trim() || intake.businessName.trim());
  const hasClient = wizardReady(intake) && Boolean(intake.audience.trim());
  const offerOk =
    offerBlueprintIsSaved(intake.offerBlueprint ?? pack?.offerBlueprint) ||
    Boolean(intake.offerSkipConfirmed || intake.offerBlueprint?.skipped);
  const hasTrust = Boolean(
    pack?.completeAd ||
      pack?.viral?.scripts?.scripts.length ||
      pack?.hsoStudio?.variants.length,
  );
  const hasList = ownedListIsReady(loadOwnedList(intake.businessName));
  return {
    scan: hasScan,
    client: hasClient,
    offer: offerOk,
    trust: hasTrust,
    list: hasList,
  };
}

export function resolveCampaignPath(snap?: CampaignToolSnapshot): CampaignPathState {
  const { intake, pack } = snap ?? loadCampaignTools();
  const gated = Boolean(
    (intake.businessName.trim() || intake.website.trim()) && !charterAllowsCampaign(intake),
  );
  const done = stepDone(intake, pack);
  const order = CAMPAIGN_STEPS;
  if (gated) {
    const scan = order[0];
    return {
      current: "scan",
      href: scan.href,
      cta: scan.cta,
      key: scan.key,
      done,
      index: 0,
      intake,
      pack,
      gated: true,
    };
  }
  const current = order.find((s) => !done[s.id]) ?? order[order.length - 1];
  return {
    current: current.id,
    href: current.href,
    cta: current.cta,
    key: current.key,
    done,
    index: order.findIndex((s) => s.id === current.id),
    intake,
    pack,
    gated: false,
  };
}

export function campaignStepById(id: PathStepId) {
  return CAMPAIGN_STEPS.find((s) => s.id === id) ?? CAMPAIGN_STEPS[0];
}
