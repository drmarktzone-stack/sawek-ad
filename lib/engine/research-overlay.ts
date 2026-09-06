import type { CampaignPack, GroundedNote, MarketResearch, SiteAudit } from "../types";
import { inventsForbidden } from "./coach";

/** Fold honest market research into CMO ideas, site audit, and pack.research. */
export function applyResearchToPack(pack: CampaignPack, research: MarketResearch): CampaignPack {
  const notes = (research.notes ?? []).filter((n) => !inventsForbidden(`${n.title.en} ${n.note.en} ${n.sourceUrl ?? ""}`, pack.intake));
  let cmoIdeas = pack.cmoIdeas;
  if (cmoIdeas && notes.length) {
    cmoIdeas = { ...cmoIdeas, groundedNotes: notes.slice(0, 6) };
  }
  let siteAudit: SiteAudit | undefined = pack.siteAudit;
  if (siteAudit && notes.length) {
    siteAudit = { ...siteAudit, groundedNotes: notes.slice(0, 4) };
  }
  return { ...pack, research, ...(cmoIdeas ? { cmoIdeas } : {}), ...(siteAudit ? { siteAudit } : {}) };
}

export function researchNotesForCalendar(pack: CampaignPack): GroundedNote[] {
  const fromPack = pack.research?.notes ?? [];
  const fromIdeas = pack.cmoIdeas?.groundedNotes ?? [];
  const seen = new Set<string>();
  const out: GroundedNote[] = [];
  for (const n of [...fromPack, ...fromIdeas]) {
    const key = `${n.title.en}|${n.sourceUrl ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}
