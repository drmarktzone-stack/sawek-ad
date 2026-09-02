/**
 * Dry-run the clinic URL through ingest + applyIngestReview (same path as the UI),
 * then serialize the applied intake into lib/demo-snapshot.json.
 * Does not hand-write ad copy. Re-run after ingest/engine fixes.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { ingestUrl } from "../lib/url-ingest";
import { applyIngestReview, rowsFromExtracted } from "../lib/document-ingest";
import { emptyIntake } from "../lib/engine/validate";
import { generateVariants } from "../lib/engine/copy";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateStrategy } from "../lib/engine/strategy";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import type { IngestedDocument } from "../lib/types";

const SOURCE = "https://drsamerped.ai.studio";

async function main() {
  const r = await ingestUrl(SOURCE);
  if (!r.ok) {
    console.error(r);
    process.exit(1);
  }
  const doc: IngestedDocument = {
    id: "doc-clinic-scan",
    name: r.url,
    mime: "text/html",
    size: (r.text || "").length,
    kind: "url",
    tags: ["identity"],
    excerpt: (r.text || "").slice(0, 800),
    createdAt: new Date().toISOString(),
  };
  const intake = applyIngestReview(emptyIntake(), rowsFromExtracted(r.fields, false), doc, []);
  const snap = {
    businessName: intake.businessName,
    category: intake.category,
    description: intake.description,
    location: intake.location,
    website: intake.website || SOURCE,
    whatsapp: intake.whatsapp,
    clinicHours: intake.clinicHours,
    audience: intake.audience,
    biggestProblem: intake.biggestProblem,
    uniqueAdvantage: intake.uniqueAdvantage,
    mainGoal: intake.mainGoal,
    channelNotes: intake.channelNotes,
    landingLines: intake.landingLines,
    sourceUrl: SOURCE,
  };
  const outPath = join(process.cwd(), "lib/demo-snapshot.json");
  writeFileSync(outPath, `${JSON.stringify(snap, null, 2)}\n`);
  const report = validateIntake(intake);
  const diagnosis = { ...diagnose(intake, report), approved: true, approvedAt: new Date().toISOString() };
  const variants = generateVariants(intake);
  const media = generateMedia(intake);
  assemblePack(intake, {
    report,
    diagnosis,
    variants,
    strategy: generateStrategy(intake, diagnosis),
    media,
    optimizer: generateOptimizer(intake, media),
    agentStatus: {
      intake: "complete",
      diagnostic: "approved",
      strategic: "approved",
      media: "approved",
      optimizer: "complete",
    },
    id: "demo-samer-clinic",
  });
  console.log("wrote", outPath);
  console.log("INGEST_FIELDS", JSON.stringify({
    filled: Object.fromEntries(Object.entries(snap).filter(([,v]) => String(v||"").trim())),
    emptyKeys: ["kupaFileBy","kupaMemberFrom","brandTone","brandPositioning","whatsappTemplates","photos"].filter(Boolean),
  }, null, 2));
  for (const loc of ["he","ar"] as const) {
    const ads = variants.filter((v) => v.locale === loc);
    console.log("\nLOCALE", loc, "name", loc==="he" ? "from description" : snap.businessName);
    for (const ad of ads) console.log(" ", ad.kind, ad.headline, "|", ad.cta);
  }
}

void main();
