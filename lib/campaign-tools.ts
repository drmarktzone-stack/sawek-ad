import type { CampaignPack, HsoStudioState, Intake, OfferBlueprint, ViralDeskState, VoiceProfile } from "./types";
import { latestPack } from "./active-pack";
import { applyVoiceToIntake, normalizeVoice } from "./engine/voice";
import { applyOfferToIntake, normalizeOfferBlueprint, skipOfferBlueprint } from "./engine/offer-builder";
import { wantsEmptyCampaign } from "./empty-campaign";
import { getCampaign, loadDraft, saveDraft, upsertCampaign } from "./storage";
import { businessKey } from "./engine/ad-engine/sources";
import { intakeIsClinicDemo } from "./clinic-leak";

export type CampaignToolSnapshot = {
  intake: Intake;
  pack: CampaignPack | null;
  viral?: ViralDeskState;
};

function sameBusiness(a: string, b: string): boolean {
  const ka = businessKey(a);
  const kb = businessKey(b);
  return Boolean(ka && kb && ka === kb);
}

function attachViral(pack: CampaignPack | null, viral?: ViralDeskState): CampaignPack | null {
  if (!pack) return null;
  const next = viral ?? pack.viral;
  if (!next || pack.viral === next) return pack;
  return { ...pack, viral: next };
}

/** One Business Truth: draft intake + the pack for THIS business only. */
export function loadCampaignTools(): CampaignToolSnapshot {
  const draft = loadDraft();
  if (wantsEmptyCampaign()) return { intake: draft.intake, pack: null, viral: draft.viral };

  const byId = draft.packId ? getCampaign(draft.packId) ?? null : null;
  const latest = latestPack();
  let pack = byId || latest;

  const draftName = draft.intake.businessName.trim();
  if (pack && !draftName) {
    pack = null;
  }
  if (pack && draftName && !sameBusiness(pack.intake.businessName, draftName)) {
    pack = null;
  }
  if (pack && intakeIsClinicDemo(pack.intake) && !intakeIsClinicDemo(draft.intake)) {
    pack = null;
  }

  const viral = pack?.viral ?? draft.viral;
  pack = attachViral(pack, viral);

  const intake = pack
    ? { ...pack.intake, ...draft.intake, voice: normalizeVoice(draft.intake.voice ?? pack.intake.voice) }
    : draft.intake;
  return {
    intake: {
      ...intake,
      voice: normalizeVoice(intake.voice),
      offerBlueprint: intake.offerBlueprint ?? pack?.offerBlueprint,
      offerSkipConfirmed: intake.offerSkipConfirmed ?? false,
    },
    pack,
    viral,
  };
}

function writeSnapshot(intake: Intake, pack: CampaignPack | null, extra?: Partial<CampaignPack>): CampaignToolSnapshot {
  const draft = loadDraft();
  const viral = extra?.viral ?? pack?.viral ?? draft.viral;
  saveDraft({
    ...draft,
    intake,
    packId: pack?.id ?? draft.packId,
    hsoStudio: extra?.hsoStudio ?? draft.hsoStudio,
    viral,
  });
  if (!pack) return { intake, pack: null, viral };
  const next: CampaignPack = {
    ...pack,
    intake,
    offerBlueprint: intake.offerBlueprint ?? pack.offerBlueprint,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
  upsertCampaign(next);
  return { intake, pack: next, viral: next.viral };
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
  if (!pack) return { intake, pack: null, viral: draft.viral };
  return writeSnapshot(intake, pack, { hsoStudio: state });
}

export function persistSkipOffer(locale: OfferBlueprint["locale"]): CampaignToolSnapshot {
  return persistOfferBlueprint(skipOfferBlueprint(locale));
}

export function persistViral(viral: ViralDeskState): CampaignToolSnapshot {
  const { intake, pack, viral: existing } = loadCampaignTools();
  const merged: ViralDeskState = { idea: "", ...existing, ...viral };
  return writeSnapshot(intake, pack, { viral: merged });
}
