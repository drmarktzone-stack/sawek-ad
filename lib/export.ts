import type { CampaignPack, Locale } from "./types";
import { STRATEGY_META, VARIANT_META, t } from "./i18n";
import { dirFor } from "./i18n";

export function packToText(pack: CampaignPack, locale: Locale): string {
  const lines: string[] = [];
  lines.push(`Ilan — ${pack.name}`);
  lines.push(pack.createdAt);
  lines.push("");
  lines.push("=== INTAKE ===");
  lines.push(`${t(locale, "biz.name")}: ${pack.intake.businessName}`);
  lines.push(`${t(locale, "details.audience")}: ${pack.intake.audience}`);
  lines.push(`${t(locale, "details.problem")}: ${pack.intake.biggestProblem}`);
  lines.push(`${t(locale, "details.advantage")}: ${pack.intake.uniqueAdvantage}`);
  lines.push(`${t(locale, "details.goal")}: ${pack.intake.mainGoal}`);
  lines.push(`${t(locale, "details.offer")}: ${pack.intake.offer}`);
  lines.push("");
  lines.push("=== MISSING (not invented) ===");
  for (const m of pack.intakeReport.missing) {
    lines.push(`- ${m.label[locale]}: ${m.reason[locale]}`);
  }
  lines.push("");
  lines.push("=== ADS ===");
  for (const v of pack.variants.filter((x) => x.locale === locale)) {
    const label = VARIANT_META[v.kind]?.label[locale] ?? v.kind;
    lines.push(`-- ${label} --`);
    lines.push(v.headline);
    lines.push(v.primaryText);
    lines.push(`CTA: ${v.cta}`);
    lines.push("");
  }
  lines.push("=== MEDIA SCENARIO ===");
  lines.push(pack.media.worstCase[locale]);
  lines.push(pack.media.realistic[locale]);
  lines.push("");
  lines.push("=== STRATEGY ===");
  for (const block of pack.strategy) {
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
<title>${escapeHtml(pack.name)} — Ilan</title>
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
  <p>Ilan · אילן · إعلان</p>
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

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
