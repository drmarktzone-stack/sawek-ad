import type { CampaignPack, Locale } from "./types";
import { STRATEGY_META, VARIANT_META, t } from "./i18n";
import { dirFor } from "./i18n";
import { ensureAgency } from "./engine/agency";

export function packToText(pack: CampaignPack, locale: Locale): string {
  const p = ensureAgency(pack);
  const a = p.agency!;
  const lines: string[] = [];
  lines.push(`SAWEK AD — ${p.name}`);
  lines.push(p.createdAt);
  lines.push("");
  lines.push("=== INTAKE ===");
  lines.push(`${t(locale, "biz.name")}: ${p.intake.businessName}`);
  lines.push(`${t(locale, "details.audience")}: ${p.intake.audience}`);
  lines.push(`${t(locale, "details.problem")}: ${p.intake.biggestProblem}`);
  lines.push(`${t(locale, "details.advantage")}: ${p.intake.uniqueAdvantage}`);
  lines.push(`${t(locale, "details.goal")}: ${p.intake.mainGoal}`);
  lines.push(`${t(locale, "details.offer")}: ${p.intake.offer}`);
  lines.push(`${t(locale, "biz.hours")}: ${p.intake.clinicHours || "—"}`);
  lines.push(`${t(locale, "details.kupaFile")}: ${p.intake.kupaFileBy || "—"}`);
  lines.push(`${t(locale, "details.kupaMember")}: ${p.intake.kupaMemberFrom || "—"}`);
  lines.push("");
  lines.push("=== MISSING (not invented) ===");
  for (const m of p.intakeReport.missing) {
    lines.push(`- ${m.label[locale]}: ${m.reason[locale]}`);
  }
  lines.push("");
  lines.push("=== DISCOVERY ===");
  lines.push(a.discovery.icp[locale]);
  lines.push(a.discovery.competitorsMissing[locale]);
  for (const persona of a.discovery.personas) {
    lines.push(`# ${persona.name[locale]}`);
    lines.push(persona.jtbd[locale]);
  }
  for (const b of a.discovery.battlecards) {
    lines.push(`# ${b.name}`);
    lines.push(`S ${b.strength[locale]}`);
    lines.push(`W ${b.weakness[locale]}`);
    lines.push(`O ${b.opportunity[locale]}`);
    lines.push(`T ${b.threat[locale]}`);
  }
  lines.push("");
  lines.push("=== STRATEGY ===");
  lines.push(a.strategy.positioning[locale]);
  lines.push(a.strategy.hormozi[locale]);
  lines.push(`TOF ${a.strategy.funnel.tof[locale]}`);
  lines.push(`MOF ${a.strategy.funnel.mof[locale]}`);
  lines.push(`BOF ${a.strategy.funnel.bof[locale]}`);
  for (const w of a.strategy.calendar) {
    lines.push(`Week ${w.week}: ${w.theme[locale]} — ${w.action[locale]}`);
  }
  lines.push("");
  lines.push("=== ADS ===");
  for (const v of p.variants.filter((x) => x.locale === locale)) {
    const label = VARIANT_META[v.kind]?.label[locale] ?? v.kind;
    lines.push(`-- ${label} --`);
    lines.push(v.headline);
    lines.push(v.primaryText);
    lines.push(`CTA: ${v.cta}`);
    lines.push("");
  }
  lines.push("=== CREATIVE FACTORY ===");
  for (const piece of a.creative.pieces.filter((x) => x.locale === locale)) {
    lines.push(`-- ${piece.format}: ${piece.title} --`);
    lines.push(piece.body);
    lines.push("");
  }
  lines.push("=== MEDIA SCENARIO ===");
  lines.push(p.media.worstCase[locale]);
  lines.push(p.media.realistic[locale]);
  for (const ch of p.media.split) {
    lines.push(`${ch.channel} ${ch.budgetSharePercent}% — ${ch.role[locale]}`);
  }
  lines.push(a.mediaExtra.planOnly[locale]);
  lines.push("");
  lines.push("=== LEADS & PROMO ===");
  lines.push(a.leads.magnet[locale]);
  lines.push(a.leads.promoCodes[locale]);
  for (const c of a.leads.cadence) {
    lines.push(`D${c.day} ${c.channel[locale]}: ${c.action[locale]}`);
  }
  lines.push("");
  lines.push("=== STRATEGY ACCORDIONS ===");
  for (const block of p.strategy) {
    const meta = STRATEGY_META.find((s) => s.id === block.id);
    lines.push(`# ${meta?.label[locale] ?? block.id}`);
    for (const it of block.items) {
      lines.push(`## ${it.title[locale]}`);
      lines.push(it.body[locale]);
      lines.push("");
    }
  }
  return lines.join("\n");
}

export function copyAllAds(pack: CampaignPack, locale: Locale): string {
  return pack.variants
    .filter((v) => v.locale === locale)
    .map((v) => {
      const label = VARIANT_META[v.kind]?.label[locale] ?? v.kind;
      return `${label}\n${v.headline}\n${v.primaryText}\n${v.cta}`;
    })
    .join("\n\n————\n\n");
}

export function downloadTxt(pack: CampaignPack, locale: Locale) {
  const blob = new Blob([packToText(pack, locale)], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${pack.name.replace(/\s+/g, "-")}-${locale}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function printPdf(pack: CampaignPack, locale: Locale) {
  const dir = dirFor(locale);
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(pack.name)} — SAWEK AD</title>
<style>
  body { font-family: Heebo, Cairo, Arial, sans-serif; background:#111; color:#f4f4f4; padding:32px; max-width:800px; margin:0 auto; }
  h1 { color:#f5c518; }
  h2 { border-bottom:2px solid #ff2a2a; padding-bottom:6px; }
  .ad { background:#1a1a1a; padding:16px; margin:12px 0; border-radius:12px; }
  .cta { background:#f5c518; color:#111; display:inline-block; padding:6px 12px; border-radius:8px; font-weight:700; }
  @media print { body { background:#fff; color:#111; } .ad { border:1px solid #ccc; } }
</style>
</head>
<body>
  <p>SAWEK AD · סאווק · ساويك</p>
  <h1>${escapeHtml(pack.name)}</h1>
  <p>${escapeHtml(pack.media.worstCase[locale])}</p>
  <p>${escapeHtml(pack.media.realistic[locale])}</p>
  <h2>${escapeHtml(t(locale, "result.adsReady"))}</h2>
  ${pack.variants
    .filter((v) => v.locale === locale)
    .map((v) => {
      const label = VARIANT_META[v.kind]?.label[locale] ?? v.kind;
      return `<div class="ad"><strong>${escapeHtml(label)}</strong><h3>${escapeHtml(v.headline)}</h3><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(v.primaryText)}</pre><span class="cta">${escapeHtml(v.cta)}</span></div>`;
    })
    .join("")}
  <h2>${escapeHtml(t(locale, "truth.layer"))}</h2>
  <ul>${pack.intakeReport.missing.map((m) => `<li>${escapeHtml(m.label[locale])} — ${escapeHtml(m.reason[locale])}</li>`).join("")}</ul>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export function printBible(pack: CampaignPack, locale: Locale) {
  const p = ensureAgency(pack);
  const a = p.agency!;
  const dir = dirFor(locale);
  const section = (title: string, body: string) =>
    `<h2>${escapeHtml(title)}</h2><div class="ad">${body}</div>`;
  const para = (s: string) => `<p>${escapeHtml(s)}</p>`;
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(p.name)} — SAWEK AD bible</title>
<style>
  body { font-family: Heebo, Cairo, Arial, sans-serif; background:#111; color:#f4f4f4; padding:32px; max-width:860px; margin:0 auto; }
  h1 { color:#ffe500; }
  h2 { border-bottom:2px solid #ff1a1a; padding-bottom:6px; color:#ffe500; }
  .ad { background:#1a1a1a; padding:16px; margin:12px 0; border-radius:12px; }
  .cta { background:#ffe500; color:#111; display:inline-block; padding:6px 12px; border-radius:8px; font-weight:700; }
  pre { white-space: pre-wrap; font-family: inherit; }
  @media print { body { background:#fff; color:#111; } .ad { border:1px solid #ccc; } }
</style>
</head>
<body>
  <p>SAWEK AD · סאווק · ساويك — campaign bible (PLAN only)</p>
  <h1>${escapeHtml(p.name)}</h1>
  <p>${escapeHtml(t(locale, "result.score"))}: ${p.intakeReport.completeness}/100</p>
  ${section(t(locale, "nav.discovery"), [
    para(a.discovery.icp[locale]),
    para(a.discovery.competitorsMissing[locale]),
    ...a.discovery.personas.map((x) => `<h3>${escapeHtml(x.name[locale])}</h3>${para(x.jtbd[locale])}${para(x.given[locale])}`),
    ...a.discovery.battlecards.map(
      (b) =>
        `<h3>${escapeHtml(b.name)}</h3>${para("S " + b.strength[locale])}${para("W " + b.weakness[locale])}${para("O " + b.opportunity[locale])}${para("T " + b.threat[locale])}`,
    ),
  ].join(""))}
  ${section(t(locale, "nav.strategy"), [
    para(a.strategy.positioning[locale]),
    para(a.strategy.uniqueMechanism[locale]),
    para(a.strategy.hormozi[locale]),
    para("AIDA A " + a.strategy.aida.attention[locale]),
    para("PAS " + a.strategy.pas.problem[locale]),
    para("HSO " + a.strategy.hso.hook[locale]),
    para(a.strategy.offerStack.leadMagnet[locale]),
    para(a.strategy.funnel.tof[locale]),
    para(a.strategy.funnel.mof[locale]),
    para(a.strategy.funnel.bof[locale]),
    ...a.strategy.calendar.map((w) => para(`W${w.week} ${w.theme[locale]} — ${w.action[locale]}`)),
  ].join(""))}
  ${section(t(locale, "nav.creative"), [
    ...a.creative.hooks.map((h) => para(`${h.angle[locale]}: ${h.hook[locale]}`)),
    ...a.creative.pieces
      .filter((x) => x.locale === locale)
      .map((x) => `<h3>${escapeHtml(x.format)} — ${escapeHtml(x.title)}</h3><pre>${escapeHtml(x.body)}</pre>`),
  ].join(""))}
  ${section(t(locale, "nav.media"), [
    para(a.mediaExtra.planOnly[locale]),
    ...p.media.split.map(
      (ch) =>
        para(
          `${ch.channel} ${ch.budgetSharePercent}% ${ch.monthlyBudget != null ? ch.monthlyBudget + "₪" : ""} — ${ch.role[locale]}`,
        ),
    ),
    para(a.mediaExtra.audiences[locale]),
    para(a.mediaExtra.frequency[locale]),
    ...p.optimizer.killRules.map((r) => para("KILL " + r[locale])),
    para(p.media.worstCase[locale]),
    para(p.media.realistic[locale]),
  ].join(""))}
  ${section(t(locale, "nav.leads"), [
    para(a.leads.magnet[locale]),
    para(a.leads.bookingCta[locale]),
    para(a.leads.promoCodes[locale]),
    para(a.leads.retargeting[locale]),
    ...a.leads.cadence.map((c) => para(`D${c.day} ${c.channel[locale]}: ${c.action[locale]}`)),
  ].join(""))}
  <h2>${escapeHtml(t(locale, "result.adsReady"))}</h2>
  ${p.variants
    .filter((v) => v.locale === locale)
    .map((v) => {
      const label = VARIANT_META[v.kind]?.label[locale] ?? v.kind;
      return `<div class="ad"><strong>${escapeHtml(label)}</strong><h3>${escapeHtml(v.headline)}</h3><pre>${escapeHtml(v.primaryText)}</pre><span class="cta">${escapeHtml(v.cta)}</span></div>`;
    })
    .join("")}
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
