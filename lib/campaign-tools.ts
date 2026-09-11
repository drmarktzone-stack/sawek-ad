import type { CampaignPack, HsoStudioState, Intake, OfferBlueprint, ViralDeskState, VoiceProfile } from "./types";
import { latestPack } from "./active-pack";
import { applyVoiceToIntake, normalizeVoice } from "./engine/voice";
import { applyOfferToIntake, normalizeOfferBlueprint, skipOfferBlueprint } from "./engine/offer-builder";
import { wantsEmptyCampaign } from "./empty-campaign";
import { getCampaign, loadDraft, saveDraft, upsertCampaign, type DraftState } from "./storage";
import { businessKey } from "./engine/ad-engine/sources";
import { intakeIsClinicDemo } from "./clinic-leak";
import { packHasDiagnosis } from "./engine/hitl";
import { sanitizePastedUrl } from "./url-clean";

export type CampaignToolSnapshot = {
  intake: Intake;
  pack: CampaignPack | null;
  viral?: ViralDeskState;
};

function sameBusiness(a: string, b: string): boolean {
  const ka = businessKey(a);
  const kb = businessKey(b);
  return Boolean(ka && kb && ka === kb && ka !== "unnamed-business");
}

function sameWebsite(a?: string, b?: string): boolean {
  const na = sanitizePastedUrl(String(a || "")).replace(/\/+$/, "").toLowerCase();
  const nb = sanitizePastedUrl(String(b || "")).replace(/\/+$/, "").toLowerCase();
  return Boolean(na && nb && (na === nb || na.endsWith(nb) || nb.endsWith(na)));
}

/** Keep the in-flight pack across locale name rewrites (RAM Dental vs Arabic). */
export function packBelongsToDraft(pack: CampaignPack, draft: Pick<DraftState, "intake" | "packId">): boolean {
  if (intakeIsClinicDemo(pack.intake) && !intakeIsClinicDemo(draft.intake)) return false;
  if (draft.packId && pack.id === draft.packId) return true;
  if (sameBusiness(pack.intake.businessName, draft.intake.businessName)) return true;
  if (sameWebsite(pack.intake.website, draft.intake.website)) return true;
  return false;
}

function preferPacked(a: CampaignPack | null, b: CampaignPack | null): CampaignPack | null {
  if (a && packHasDiagnosis(a)) return a;
  if (b && packHasDiagnosis(b)) return b;
  return a || b;
}

function attachViral(pack: CampaignPack | null, viral?: ViralDeskState): CampaignPack | null {
  if (!pack) return null;
  const next = viral ?? pack.viral;
  if (!next || pack.viral === next) return pack;
  return { ...pack, viral: next };
}

/**
 * Restore an in-flight campaign after remount. Draft.pack is the diagnosis
 * snapshot when the campaigns list quota dropped the row.
 */
export function restoreLivePack(): CampaignPack | null {
  const tools = loadCampaignTools();
  if (tools.pack) return tools.pack;
  const draft = loadDraft();
  if (draft.pack && packBelongsToDraft(draft.pack, draft)) return draft.pack;
  if (!draft.packId) return null;
  const byId = getCampaign(draft.packId);
  if (!byId) return null;
  if (intakeIsClinicDemo(byId.intake) && !intakeIsClinicDemo(draft.intake)) return null;
  return byId;
}

/** One Business Truth: draft intake + the pack for THIS business only. */
export function loadCampaignTools(): CampaignToolSnapshot {
  const draft = loadDraft();
  if (wantsEmptyCampaign()) return { intake: draft.intake, pack: null, viral: draft.viral };

  const byId = draft.packId ? getCampaign(draft.packId) ?? null : null;
  const latest = latestPack();
  const draftPack = draft.pack ?? null;
  const named = Boolean(draft.intake.businessName.trim());

  const pick = (p: CampaignPack | null): CampaignPack | null => {
    if (!p) return null;
    if (!named) return null;
    if (!packBelongsToDraft(p, draft)) return null;
    return p;
  };

  let pack = preferPacked(pick(byId), preferPacked(pick(draftPack), pick(latest)));

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
    pack: pack ?? undefined,
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
  const merged: ViralDeskState = { ...existing, ...viral, idea: viral.idea ?? existing?.idea ?? "" };
  return writeSnapshot(intake, pack, { viral: merged });
}
