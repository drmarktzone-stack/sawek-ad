import type { CampaignPack, Intake } from "./types";
import { loadCampaignTools, type CampaignToolSnapshot } from "./campaign-tools";
import { wizardReady } from "./engine/validate";
import { offerBlueprintIsSaved } from "./engine/offer-builder";
import { voiceIsLocked } from "./engine/voice";

/** Canonical campaign path — the only journey Home / Command / nav should push. */
export const CAMPAIGN_STEPS = [
  { id: "scan", href: "/", key: "journey.scan" as const, cta: "path.scanNow" as const },
  { id: "truth", href: "/#studio", key: "journey.truth" as const, cta: "path.fillTruth" as const },
  { id: "diagnosis", href: "/task/ad", key: "journey.diagnosis" as const, cta: "path.approveDiagnosis" as const },
  { id: "message", href: "/tools/core-message", key: "journey.message" as const, cta: "path.lockVoice" as const },
  { id: "offer", href: "/tools/offer", key: "journey.offer" as const, cta: "path.saveOffer" as const },
  { id: "create", href: "/task/ad", key: "journey.create" as const, cta: "path.makeAd" as const },
  { id: "variants", href: "/tools/hso", key: "journey.variants" as const, cta: "path.makeVariants" as const },
  { id: "export", href: "/campaigns", key: "journey.export" as const, cta: "path.openExport" as const },
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
};

/** Orphan desks that strand users — hide from nav and bounce to the live path. */
export const DEAD_JOURNEY_HREFS = [
  "/growth",
  "/lab",
  "/discovery",
  "/strategy",
  "/media",
  "/leads",
] as const;

function stepDone(intake: Intake, pack: CampaignPack | null): PathDone {
  const hasScan = Boolean(intake.website?.trim() || intake.businessName.trim());
  const hasTruth = wizardReady(intake);
  const diagApproved = Boolean(pack?.diagnosis?.approved && pack.diagnosis.hypotheses?.length);
  const locked = voiceIsLocked(intake.voice);
  const offerOk =
    offerBlueprintIsSaved(intake.offerBlueprint ?? pack?.offerBlueprint) ||
    Boolean(intake.offerSkipConfirmed || intake.offerBlueprint?.skipped);
  const hasCreate = Boolean(pack?.completeAd);
  const hasVariants = Boolean(
    pack?.hsoStudio?.variants.length ||
      pack?.flashVariations?.variations.length ||
      pack?.viral?.scripts?.scripts.length,
  );
  return {
    scan: hasScan,
    truth: hasTruth,
    diagnosis: diagApproved,
    message: locked,
    offer: offerOk,
    create: hasCreate,
    variants: hasVariants,
    export: Boolean(pack?.saved && hasCreate),
  };
}

export function resolveCampaignPath(snap?: CampaignToolSnapshot): CampaignPathState {
  const { intake, pack } = snap ?? loadCampaignTools();
  const done = stepDone(intake, pack);
  const order = CAMPAIGN_STEPS;
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
  };
}

export function campaignStepById(id: PathStepId) {
  return CAMPAIGN_STEPS.find((s) => s.id === id) ?? CAMPAIGN_STEPS[0];
}
