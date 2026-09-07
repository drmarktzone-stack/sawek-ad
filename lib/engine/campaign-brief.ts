/**
 * CampaignBrief — one set of facts, vertical, voice, geo, offer, gaps, and
 * the chosen CMO angles. Downstream engines must read this, not re-invent.
 */
import type {
  CampaignBrief,
  CampaignFacts,
  CampaignVertical,
  CmoIdea,
  Intake,
  Locale,
  MarketResearch,
  Tri,
} from "../types";
import { filled } from "../utils";
import { isNoOffer } from "../no-offer";
import { detectVertical } from "../vertical";
import { voiceFromIntake } from "./voice";
import { gapCompensation, pickIdeas } from "./cmo-ideas";
import { researchGeo } from "./research-public";
import { topicQueriesFor } from "../stock-images";

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const br = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("،"), cut.lastIndexOf(","));
  return (br > max * 0.4 ? cut.slice(0, br) : cut).trim();
}

export function factsFromIntake(intake: Intake): CampaignFacts {
  return {
    name: intake.businessName.trim(),
    category: intake.category.trim(),
    description: intake.description.trim(),
    location: intake.location.trim(),
    website: intake.website.trim(),
    whatsapp: intake.whatsapp.trim(),
    hours: intake.clinicHours.trim(),
    audience: intake.audience.trim(),
    problem: intake.biggestProblem.trim(),
    advantage: intake.uniqueAdvantage.trim(),
    goal: intake.mainGoal.trim(),
    offer: intake.offer.trim(),
    offerIsNone: isNoOffer(intake.offer),
    operatingModel: intake.operatingModel,
    brandTone: (intake.voice?.personalVoice || intake.brandTone || "").trim(),
  };
}

export function viralIdeaFromHero(hero: CmoIdea | undefined, facts: CampaignFacts): Tri {
  if (hero) {
    return L(
      clip(`${hero.name.he} — ${hero.hook.he}`, 180),
      clip(`${hero.name.ar} — ${hero.hook.ar}`, 180),
      clip(`${hero.name.en} — ${hero.hook.en}`, 180),
    );
  }
  const name = facts.name || "—";
  return L(
    clip(`${name}${facts.problem ? ` — ${facts.problem}` : facts.advantage ? ` — ${facts.advantage}` : ""}`, 180),
    clip(`${name}${facts.problem ? ` — ${facts.problem}` : facts.advantage ? ` — ${facts.advantage}` : ""}`, 180),
    clip(`${name}${facts.problem ? ` — ${facts.problem}` : facts.advantage ? ` — ${facts.advantage}` : ""}`, 180),
  );
}

export function coreMessageFromHero(hero: CmoIdea | undefined, facts: CampaignFacts, voiceCore: string): Tri {
  if (voiceCore.trim()) {
    const v = clip(voiceCore, 160);
    return L(v, v, v);
  }
  return viralIdeaFromHero(hero, facts);
}

export function imageQueriesFromFacts(
  vertical: CampaignVertical,
  facts: CampaignFacts,
  hero?: CmoIdea,
): string[] {
  const q = [hero?.name.en, hero?.hook.en, facts.advantage, facts.category, facts.description]
    .filter(Boolean)
    .join(" ");
  return topicQueriesFor({
    vertical,
    category: facts.category,
    location: facts.location,
    description: facts.description,
    offer: facts.offerIsNone ? "" : facts.offer,
    q,
  }).slice(0, 12);
}

export function ideasForBrief(
  intake: Intake,
  existing?: CmoIdea[],
  opts?: { excludeIds?: string[] },
): CmoIdea[] {
  if (existing && existing.length >= 3) return existing.slice(0, 5);
  return pickIdeas(intake, "he", { excludeIds: opts?.excludeIds });
}

export function buildCampaignBrief(
  intake: Intake,
  opts?: { research?: MarketResearch; ideas?: CmoIdea[]; excludeIds?: string[] },
): CampaignBrief {
  const facts = factsFromIntake(intake);
  const vertical = detectVertical(intake) as CampaignVertical;
  const voice = voiceFromIntake(intake);
  const ideas = ideasForBrief(intake, opts?.ideas, { excludeIds: opts?.excludeIds });
  const hero = ideas[0];
  const research = opts?.research;
  return {
    asOf: new Date().toISOString(),
    vertical,
    geo: researchGeo(intake),
    facts,
    voice,
    gaps: gapCompensation(intake),
    heroIdeaId: hero?.id || "",
    angleIds: ideas.map((i) => i.id),
    coreMessage: coreMessageFromHero(hero, facts, voice.coreMessage),
    viralIdea: viralIdeaFromHero(hero, facts),
    imageQueries: imageQueriesFromFacts(vertical, facts, hero),
    researchAttached: Boolean(research?.fetched && (research.notes?.length || research.grounded)),
  };
}

export function briefHasFacts(brief: CampaignBrief): boolean {
  return Boolean(brief.facts.name || brief.facts.whatsapp || brief.facts.website);
}

export function localeViralIdea(brief: CampaignBrief, locale: Locale): string {
  return brief.viralIdea[locale] || brief.viralIdea.he || brief.coreMessage[locale] || brief.facts.name;
}

export function filledContact(intake: Intake): boolean {
  return filled(intake.businessName) && (filled(intake.whatsapp) || filled(intake.website));
}

const RESTAURANT_LEAK =
  /pizza|פיצה|بيتزا|pepperoni|olive table ritual|שולחן הזית|hummus platter|חומוס טעימות|mezze tasting|טעימות זוגית|grill steam reel|אדים מעל הגריל|delivery deal|מבצע משלוחים/i;

const CLINIC_LEAK =
  /הילד חולה|sick child|pediatric walk-in|מרפאת ילדים|רופא ילדים|عيادة أطفال|קופת חולים כללית|HMO coverage as promo|סדר הגעה למרפאה/i;

const RETAIL_SAFE_LEAK = /pizza|פיצה|הילד חולה|olive table ritual|טעימות זוגית/i;

export function verticalLeakRe(vertical: CampaignVertical | string): RegExp | null {
  if (vertical === "clinic" || vertical === "product") return RESTAURANT_LEAK;
  if (vertical === "restaurant") return CLINIC_LEAK;
  if (vertical === "retail") return RETAIL_SAFE_LEAK;
  return RESTAURANT_LEAK;
}

export function contradictsVertical(text: string, vertical: CampaignVertical | string): boolean {
  const re = verticalLeakRe(vertical);
  return Boolean(re && text && re.test(text));
}
