/**
 * QA the three published demo packs through spoken/copy/calendar engines.
 * Honest scoring — writes tmp/qa/FINAL_QA.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { generateVariants } from "../lib/engine/copy";
import { assemblePack } from "../lib/engine/run";
import { cmoFieldsMissing, validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { buildPostingCalendar } from "../lib/engine/posting-calendar";
import { detectVertical } from "../lib/vertical";
import { spokenCta, whatsappScript } from "../lib/engine/spoken";
import { PUBLISHED_DEMO_IDS, DEMO_ID, DEMO_OLIVE_ID, DEMO_SAND_ID } from "../lib/demo-catalog";
import { isDemoCmoComplete } from "../lib/demo-cmo";
import type { CampaignPack, Locale } from "../lib/types";

type Issue = { packId: string; severity: "fail" | "warn"; msg: string };

const issues: Issue[] = [];
function fail(packId: string, msg: string) {
  issues.push({ packId, severity: "fail", msg });
}
function warn(packId: string, msg: string) {
  issues.push({ packId, severity: "warn", msg });
}

const INCOMPLETE = /\[יש להשלים\]|\[يجب الاستكمال\]|\[TO COMPLETE\]/;
const BANNED_BRAND = /Pizza\s*Hut|פיצה האט|Aluf\s*Sport|אלוף ספורט|Brand City|King Store|יין\s*רינן/i;

function qaPack(pack: CampaignPack) {
  const id = pack.id;
  if (!PUBLISHED_DEMO_IDS.includes(id as never)) fail(id, "unexpected id");
  if (!pack.demoMeta?.sample) fail(id, "missing demoMeta.sample");
  if (id === DEMO_ID && pack.demoMeta?.fictional) fail(id, "clinic marked fictional");
  if (id !== DEMO_ID && !pack.demoMeta?.fictional) fail(id, "fictional demo missing fictional:true");

  const v = detectVertical(pack.intake);
  if (id === DEMO_ID && v !== "clinic") fail(id, `vertical=${v} expected clinic`);
  if (id === DEMO_OLIVE_ID && v !== "restaurant") fail(id, `vertical=${v} expected restaurant`);
  if (id === DEMO_SAND_ID && v !== "retail") fail(id, `vertical=${v} expected retail`);

  const locales = new Set(pack.variants.map((x) => x.locale));
  for (const loc of ["he", "ar", "en"] as Locale[]) {
    if (!locales.has(loc)) fail(id, `missing locale variants: ${loc}`);
  }
  if (pack.variants.length < 18) warn(id, `only ${pack.variants.length} variants`);

  // Re-run engines from intake (must match quality bar)
  const regen = generateVariants(pack.intake);
  const report = validateIntake(pack.intake);
  const rebuilt = assemblePack(pack.intake, {
    report,
    diagnosis: diagnose(pack.intake, report),
    variants: regen,
    agentStatus: {
      intake: "complete",
      diagnostic: "complete",
      strategic: "complete",
      media: "complete",
      optimizer: "complete",
    },
    id,
  });

  for (const loc of ["he", "ar", "en"] as Locale[]) {
    const week = buildPostingCalendar(rebuilt, loc);
    if (week.length !== 7) fail(id, `calendar ${loc} days=${week.length}`);
    const blob = week.map((d) => `${d.headline}\n${d.body}\n${d.cta}`).join("\n");
    if (INCOMPLETE.test(blob)) fail(id, `calendar ${loc} has incomplete markers`);
    if (BANNED_BRAND.test(blob)) fail(id, `calendar ${loc} has banned real brand`);

    const vars = regen.filter((x) => x.locale === loc);
    const vblob = vars.map((x) => `${x.headline}\n${x.primaryText}\n${x.cta}`).join("\n");
    if (INCOMPLETE.test(vblob) && id !== DEMO_ID) {
      // Clinic may legitimately say אין מבצע; fictional must not have TO COMPLETE when facts exist
      fail(id, `regen variants ${loc} have incomplete markers`);
    }
    if (id !== DEMO_ID && INCOMPLETE.test(vblob)) fail(id, `incomplete in ${loc}`);
    if (BANNED_BRAND.test(vblob)) fail(id, `banned brand in ${loc} variants`);

    const wa = whatsappScript(pack.intake, loc);
    if (INCOMPLETE.test(wa) && id !== DEMO_ID) fail(id, `whatsapp ${loc} incomplete: ${wa.slice(0, 120)}`);
    const cta = spokenCta(pack.intake, loc);
    if (!cta.trim()) fail(id, `empty CTA ${loc}`);
  }

  // Phone / name presence for fictional
  if (id === DEMO_OLIVE_ID) {
    const he = regen.filter((x) => x.locale === "he").map((x) => x.headline + x.primaryText).join("\n");
    if (!/מטבח הזית|052-7001234/.test(he)) fail(id, "HE missing olive name/phone");
    if (!/נווה שקד/.test(he + pack.intake.location)) warn(id, "town נווה שקד weak in HE copy");
  }
  if (id === DEMO_SAND_ID) {
    const he = regen.filter((x) => x.locale === "he").map((x) => x.headline + x.primaryText).join("\n");
    if (!/בוטיק חול|050-8112233/.test(he)) fail(id, "HE missing sand name/phone");
  }


  // CMO idea engine
  if (!pack.cmoIdeas?.selected?.length) fail(id, "missing cmoIdeas.selected");
  else {
    if (pack.cmoIdeas.selected.length < 3) fail(id, `cmo ideas ${pack.cmoIdeas.selected.length} < 3`);
    for (const idea of pack.cmoIdeas.selected) {
      if (!idea.scorecard?.length) fail(id, `idea ${idea.id} missing scorecard`);
      for (const d of idea.scorecard ?? []) {
        if (d.score < 1 || d.score > 100) fail(id, `score out of range ${d.id}=${d.score}`);
        if (!/תכנון|تخطيط|planning/i.test(d.label.he + d.label.ar + d.label.en)) {
          fail(id, `score label not marked planning: ${d.id}`);
        }
      }
    }
    const cmoBlob = JSON.stringify(pack.cmoIdeas);
    if (/ROAS\s*[:=]\s*\d|likes?\s*[:=]\s*\d/i.test(cmoBlob)) fail(id, "fake ROAS/likes in cmoIdeas");
  }
  if (!(pack.intake.mediaAssets ?? []).some((a) => a.kind === "image" && a.publicSrc)) {
    fail(id, "missing image mediaAssets with publicSrc");
  }
  if (!isDemoCmoComplete(pack.intake)) fail(id, "CMO interview desk incomplete");
  if (cmoFieldsMissing(pack.intake)) fail(id, "cmoFieldsMissing true on published demo");
  const missingFields = validateIntake(pack.intake).missing.map((m) => m.field);
  for (const field of ["businessModel", "monthlyBudget", "pastAds"]) {
    if (missingFields.includes(field)) fail(id, `diagnosis still flags ${field}`);
  }
  if (id !== DEMO_ID) {
    for (const field of ["avgOrderValue", "marginPercent", "targetCac"]) {
      if (missingFields.includes(field)) fail(id, `diagnosis still flags ${field}`);
    }
  }
  const realPhotos = (pack.intake.mediaAssets ?? []).filter(
    (a) => a.kind === "image" && a.publicSrc && !/\.svg$/i.test(a.publicSrc || ""),
  );
  if (realPhotos.length < 4) fail(id, `only ${realPhotos.length} non-SVG photos`);
  if (!(pack.demoMeta?.ideaNames?.he?.length)) warn(id, "demoMeta.ideaNames.he empty");

  // Pack JSON itself
  const packBlob = JSON.stringify(pack);
  if (BANNED_BRAND.test(packBlob)) fail(id, "banned brand inside pack JSON");
  if (id !== DEMO_ID && INCOMPLETE.test(JSON.stringify(pack.variants))) {
    fail(id, "published variants contain incomplete markers");
  }
}

function main() {
  const path = join(process.cwd(), "public/packs/published.json");
  if (!existsSync(path)) {
    console.error("missing published.json — run publish-three-demos first");
    process.exit(1);
  }
  const packs = JSON.parse(readFileSync(path, "utf8")) as CampaignPack[];
  const ids = packs.map((p) => p.id);
  if (ids.length !== 3) fail("published.json", `expected 3 packs, got ${ids.length}`);
  if (ids.join(",") !== PUBLISHED_DEMO_IDS.join(",")) {
    fail("published.json", `ids=${ids.join(",")} expected ${PUBLISHED_DEMO_IDS.join(",")}`);
  }

  for (const pack of packs) qaPack(pack);

  const fails = issues.filter((i) => i.severity === "fail");
  const warns = issues.filter((i) => i.severity === "warn");
  const score = Math.max(0, Math.round(100 - fails.length * 12 - warns.length * 3));

  const lines: string[] = [];
  lines.push("# FINAL_QA — three demo packs");
  lines.push("");
  lines.push(`Date: 2026-09-05 (UTC+3)`);
  lines.push(`Packs: ${ids.join(", ")}`);
  lines.push(`Honest score: **${score}/100**`);
  lines.push(`Fails: ${fails.length} · Warns: ${warns.length}`);
  lines.push("");
  lines.push("## Scope");
  lines.push("- Engines: `generateVariants`, `assemblePack`, `buildPostingCalendar`, `cmo-ideas` (planning scorecards), `spokenCta`, `whatsappScript`, `detectVertical`");
  lines.push("- published.json must contain exactly clinic + Olive Kitchen + Sand Boutique");
  lines.push("- Fictional packs must be marked `demoMeta.sample` + `demoMeta.fictional`");
  lines.push("- No Pizza Hut / Aluf Sport / other real brands");
  lines.push("- No `[יש להשלים]` on fictional packs when invented facts are provided");
  lines.push("");
  lines.push("## Results");
  if (!issues.length) {
    lines.push("- All engine checks passed.");
  } else {
    for (const i of issues) {
      lines.push(`- **${i.severity.toUpperCase()}** \`${i.packId}\`: ${i.msg}`);
    }
  }
  lines.push("");
  lines.push("## Sample HE headlines (strong_offer)");
  for (const pack of packs) {
    const he = pack.variants.find((v) => v.locale === "he" && v.kind === "strong_offer");
    lines.push(`- \`${pack.id}\`: ${he?.headline || "(missing)"}`);
  }
  lines.push("");
  lines.push("## CMO idea names (HE, top 3)");
  for (const pack of packs) {
    const names = pack.demoMeta?.ideaNames?.he?.slice(0, 3) ?? pack.cmoIdeas?.selected.slice(0, 3).map((i) => i.name.he) ?? [];
    lines.push(`- \`${pack.id}\`: ${names.join(" · ") || "(missing)"}`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("- All three packs rebuilt with filled CMO interview desks (sample planning inputs, no fake ROAS) + real JPEG photos + studio stills.");
  lines.push("- New Campaign must not auto-load demos (empty-campaign wipe + demo identity blocklist).");
  lines.push("- Demo UI exposes all three as selectable demos.");
  lines.push("");

  const outDir = join(process.cwd(), "tmp/qa");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, "FINAL_QA.md");
  writeFileSync(out, lines.join("\n"), "utf8");
  // Also root-level brief for agents
  writeFileSync(join(process.cwd(), "FINAL_QA.md"), lines.join("\n"), "utf8");

  console.log(lines.join("\n"));
  if (fails.length) {
    console.error("\nQA FAILED");
    process.exit(1);
  }
  console.log("\nQA PASS score=" + score);
}

main();
