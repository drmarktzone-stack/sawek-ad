import type { CampaignPack, Locale, SiteAudit, StrategyBlock } from "../types";
import { inventsForbidden } from "./coach";

export type ProDeskInsights = NonNullable<CampaignPack["proDesk"]>;

export function overlayProOnAgency(pack: CampaignPack, desk: ProDeskInsights): CampaignPack {
  if (desk.down || !pack.agency) {
    return { ...pack, proDesk: desk };
  }
  let strategy = pack.strategy;
  if (desk.strategy && strategy.length) {
    const extra: StrategyBlock = {
      id: "pro_cmo",
      items: [
        {
          title: { he: "CMO · Vertex Pro", ar: "CMO · Vertex Pro", en: "CMO · Vertex Pro" },
          body: desk.strategy,
        },
        ...(desk.psychology
          ? [{ title: { he: "פסיכולוגיית קנייה · Pro", ar: "سيكولوجيا الشراء · Pro", en: "Buying psychology · Pro" }, body: desk.psychology }]
          : []),
        ...(desk.audience
          ? [{ title: { he: "ניתוח קהל · Pro", ar: "تحليل الجمهور · Pro", en: "Audience analysis · Pro" }, body: desk.audience }]
          : []),
      ],
    };
    strategy = [extra, ...strategy];
  }
  let siteAudit: SiteAudit | undefined = pack.siteAudit;
  if (desk.audit?.length && siteAudit) {
    siteAudit = {
      ...siteAudit,
      strengths: [
        ...siteAudit.strengths,
        ...desk.audit.slice(0, 2).map((label, i) => ({
          id: `pro-insight-${i + 1}`,
          kind: "strength" as const,
          label,
          evidence: {
            he: "Vertex Gemini Pro · מתוך העובדות שסופקו",
            ar: "Vertex Gemini Pro · من الوقائع المعطاة",
            en: "Vertex Gemini Pro · from supplied facts",
          },
        })),
      ],
    };
  }
  let agency = pack.agency;
  if (desk.calendarWeeks?.length && agency.strategy.calendar?.length) {
    const cal = agency.strategy.calendar.map((w) => {
      const hit = desk.calendarWeeks?.find((d) => d.week === w.week) ?? desk.calendarWeeks?.[w.week - 1];
      if (!hit) return w;
      return {
        ...w,
        theme: hit.theme,
        action: hit.action,
      };
    });
    agency = { ...agency, strategy: { ...agency.strategy, calendar: cal } };
  }
  if (desk.scripts?.length && agency.creative.pieces.length) {
    const pieces = agency.creative.pieces.map((p) => {
      if (p.format !== "reels" && p.format !== "whatsapp") return p;
      const loc = p.locale as Locale;
      const script = desk.scripts?.find((s) =>
        p.format === "whatsapp" ? s.channel.includes("whats") : s.channel.includes("reel") || s.channel.includes("tik"),
      );
      const body = script?.[loc];
      if (!body?.trim()) return p;
      if (inventsForbidden(body, pack.intake)) return p;
      return { ...p, body };
    });
    agency = { ...agency, creative: { ...agency.creative, pieces } };
  }
  return { ...pack, strategy, siteAudit, agency, proDesk: desk };
}
