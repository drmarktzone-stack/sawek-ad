/**
 * One-click complete ad: score internal candidates, validate, persist fingerprint.
 * Generated content never becomes Business Truth.
 */
import type { CampaignPack, CmoIdea, CompleteAdPackage, Intake, Locale } from "../../types";
import { pickIdeas } from "../cmo-ideas";
import { detectVertical } from "../../vertical";
import { classifyOffer, classifyProof, factStatusForAd } from "./facts";
import { buildFingerprint, excludeFromHistory, noveltyAgainst } from "./fingerprint";
import { loadCreativeHistory, recordCreativeFingerprint, scopeFromPack } from "./memory";
import { buildCandidates, familyForIdeaId, pickWinner, STRATEGY_FAMILIES } from "./candidates";
import { separateSources } from "./sources";
import { runValidationGate } from "./validate";

const MAX_ATTEMPTS = 4;

export function attachCompleteAd(pack: CampaignPack, opts?: { rotate?: boolean }): CampaignPack {
  const built = buildCompleteAd(pack, opts);
  if (!built) return pack;
  return { ...pack, completeAd: built, updatedAt: new Date().toISOString() };
}

export function buildCompleteAd(pack: CampaignPack, opts?: { rotate?: boolean }): CompleteAdPackage | null {
  const intake = pack.intake;
  if (!intake.businessName.trim() && !intake.description.trim() && !intake.website.trim()) {
    return null;
  }
  const scope = scopeFromPack(pack);
  const history = pack.demoMeta?.sample ? [] : loadCreativeHistory(scope);
  const layers = separateSources(intake, {
    pack,
    research: pack.research,
    fingerprints: history,
    vertical: pack.brief?.vertical || detectVertical(intake),
  });
  const exclude = opts?.rotate === false ? { ids: [], families: [] } : excludeFromHistory(history);
  const ideas: CmoIdea[] = pack.cmoIdeas?.selected?.length
    ? pack.cmoIdeas.selected
    : pickIdeas(intake, "he", { excludeIds: exclude.ids });

  let candidates = buildCandidates(intake, layers, ideas, history);
  if (opts?.rotate !== false && exclude.families.length) {
    const unused = candidates.filter((c) => !exclude.families.includes(c.family));
    if (unused.length) candidates = [...unused, ...candidates.filter((c) => exclude.families.includes(c.family))];
  }

  let attempts = 0;
  let repaired = false;
  const failures: string[] = [];
  let winner = pickWinner(candidates);
  let locales = winner?.locales;
  let gate = winner && locales
    ? runValidationGate({
        intake,
        locales,
        layers,
        marketUsed: winner.family === "market_gap" || winner.family === "discovered",
        marketEvidence: layers.marketIntel.notes[0] ? `${layers.marketIntel.notes[0].title} ${layers.marketIntel.notes[0].sourceUrl || ""}` : undefined,
      })
    : undefined;

  while (winner && gate && !gate.ok && attempts < MAX_ATTEMPTS) {
    attempts += 1;
    failures.push(...gate.failures);
    if (gate.repaired) {
      locales = gate.locales;
      repaired = true;
      gate = runValidationGate({
        intake,
        locales,
        layers,
        marketUsed: winner.family === "market_gap" || winner.family === "discovered",
        marketEvidence: layers.marketIntel.notes[0] ? `${layers.marketIntel.notes[0].title} ${layers.marketIntel.notes[0].sourceUrl || ""}` : undefined,
      });
      if (gate.ok) break;
    }
    candidates = candidates.filter((c) => c.family !== winner!.family);
    winner = pickWinner(candidates);
    locales = winner?.locales;
    if (!winner || !locales) break;
    gate = runValidationGate({
      intake,
      locales,
      layers,
      marketUsed: winner.family === "market_gap" || winner.family === "discovered",
      marketEvidence: layers.marketIntel.notes[0] ? `${layers.marketIntel.notes[0].title} ${layers.marketIntel.notes[0].sourceUrl || ""}` : undefined,
    });
  }

  if (!winner || !locales || !gate) return pack.completeAd ?? null;
  if (!gate.ok) {
    locales = gate.locales;
    repaired = true;
  }
  const finalLocales = gate.locales;
  const blob = `${finalLocales.he.headline} ${finalLocales.he.copy}`;
  const fingerprint = buildFingerprint({
    businessName: intake.businessName,
    family: winner.family,
    ideaId: winner.idea?.id || pack.brief?.heroIdeaId,
    locale: finalLocales.en,
    ownerId: pack.ownerId,
    clientId: pack.clientId,
    campaignId: pack.id,
  });
  const novelty = noveltyAgainst(fingerprint, history);
  const marketUsed = (winner.family === "market_gap" || winner.family === "discovered") && layers.marketIntel.notes.length > 0;
  const passed = gate.ok;
  if (passed && !pack.demoMeta?.sample) {
    recordCreativeFingerprint(scope, fingerprint);
  }

  const complete: CompleteAdPackage = {
    family: winner.family,
    locales: finalLocales,
    language: "he",
    factStatus: factStatusForAd(blob, layers.businessTruth, intake),
    noveltyStatus: novelty.status,
    compliance: {
      ok: passed,
      notes: [
        `offer:${classifyOffer(layers.businessTruth)}`,
        `proof:${classifyProof(layers.businessTruth)}`,
        ...gate.failures.slice(0, 6),
      ],
    },
    fingerprint,
    validation: { passed, repaired: repaired || gate.repaired, attempts, failures: [...new Set(failures.concat(gate.failures))] },
    marketUsed,
    ...(marketUsed && layers.marketIntel.notes[0]
      ? { marketEvidence: `${layers.marketIntel.notes[0].title}${layers.marketIntel.notes[0].sourceUrl ? ` · ${layers.marketIntel.notes[0].sourceUrl}` : ""}` }
      : {}),
    metadata: {
      scores: winner.scores,
      candidateFamilies: STRATEGY_FAMILIES.slice(),
      sourceLayers: [
        "business_truth",
        "campaign_context",
        "creative_history",
        "market_intelligence",
        "ai_insights",
        "generated_content",
      ],
    },
  };
  return complete;
}

export function overlayCompleteOnFeatured(
  variants: CampaignPack["variants"],
  complete: CompleteAdPackage,
): CampaignPack["variants"] {
  if (!complete.validation.passed && complete.compliance.ok === false && complete.validation.failures.length > 4) {
    return variants;
  }
  return variants.map((v) => {
    if (v.kind !== "strong_offer") return v;
    const loc = complete.locales[v.locale as Locale];
    if (!loc) return v;
    return {
      ...v,
      headline: loc.headline || v.headline,
      primaryText: loc.copy || v.primaryText,
      cta: loc.cta || v.cta,
    };
  });
}

export function heroFamilyOf(pack: CampaignPack): string {
  return pack.completeAd?.family || familyForIdeaId(pack.brief?.heroIdeaId);
}

export { STRATEGY_FAMILIES, familyForIdeaId };
