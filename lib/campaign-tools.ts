import type { CampaignPack, HsoStudioState, Intake, OfferBlueprint, VoiceProfile } from "./types";
import { latestPack } from "./active-pack";
import { applyVoiceToIntake, normalizeVoice } from "./engine/voice";
import { applyOfferToIntake, normalizeOfferBlueprint, skipOfferBlueprint } from "./engine/offer-builder";
import { wantsEmptyCampaign } from "./empty-campaign";
import { loadDraft, saveDraft, upsertCampaign } from "./storage";

export type CampaignToolSnapshot = {
  intake: Intake;
  pack: CampaignPack | null;
};

export function loadCampaignTools(): CampaignToolSnapshot {
  const draft = loadDraft();
  const pack = wantsEmptyCampaign() ? null : latestPack();
  const intake = pack ? { ...pack.intake, ...draft.intake, voice: normalizeVoice(draft.intake.voice ?? pack.intake.voice) } : draft.intake;
  return {
    intake: {
      ...intake,
      voice: normalizeVoice(intake.voice),
      offerBlueprint: intake.offerBlueprint ?? pack?.offerBlueprint,
      offerSkipConfirmed: intake.offerSkipConfirmed ?? false,
    },
    pack,
  };
}

function writeSnapshot(intake: Intake, pack: CampaignPack | null, extra?: Partial<CampaignPack>): CampaignToolSnapshot {
  const draft = loadDraft();
  saveDraft({ ...draft, intake, hsoStudio: extra?.hsoStudio ?? draft.hsoStudio });
  if (!pack) return { intake, pack: null };
  const next: CampaignPack = {
    ...pack,
    intake,
    offerBlueprint: intake.offerBlueprint ?? pack.offerBlueprint,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
  upsertCampaign(next);
  return { intake, pack: next };
}

export function persistLockedVoice(voice: VoiceProfile): CampaignToolSnapshot {
  const { intake, pack } = loadCampaignTools();
  const nextIntake = applyVoiceToIntake(intake, { ...normalizeVoice(voice), locked: true, lockedAt: voice.lockedAt || new Date().toISOString() });
  return writeSnapshot(nextIntake, pack);
}

export function persistOfferBlueprint(offer: OfferBlueprint): CampaignToolSnapshot {
  const { intake, pack } = loadCampaignTools();
  const nextIntake = applyOfferToIntake(intake, normalizeOfferBlueprint(offer, offer.locale));
  return writeSnapshot(nextIntake, pack, { offerBlueprint: nextIntake.offerBlueprint });
}

export function persistHsoStudio(state: HsoStudioState): CampaignToolSnapshot {
  const { intake, pack } = loadCampaignTools();
  const draft = loadDraft();
  saveDraft({ ...draft, intake, hsoStudio: state });
  if (!pack) return { intake, pack: null };
  return writeSnapshot(intake, pack, { hsoStudio: state });
}

export function persistSkipOffer(locale: OfferBlueprint["locale"]): CampaignToolSnapshot {
  return persistOfferBlueprint(skipOfferBlueprint(locale));
}
