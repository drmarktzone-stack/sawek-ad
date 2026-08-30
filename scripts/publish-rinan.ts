import { mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { extractFieldsFromText, type IngestFieldId } from "../lib/document-ingest";
import { emptyIntake } from "../lib/engine/validate";
import {
  assemblePack,
  runIntakeAndDiagnosis,
  runMedia,
  runOptimizerStage,
  runStrategic,
} from "../lib/engine/run";
import { ADVANTAGE_CHIPS, AUDIENCE_CHIPS, GOAL_CHIPS, type ChipOption } from "../lib/chips";
import type { AgentId, AgentStatus, CampaignPack, Intake, MediaAssetLabel, MediaAssetMeta } from "../lib/types";

const ROOT = process.cwd();
const HE_ID = "69101bfd-562d-4837-af0b-781ac60574c9";
const AR_ID = "dbe6d893-40ee-49dc-b363-a2bf694a9c23";

const POOL_FILES: { file: string; label: MediaAssetLabel }[] = [
  { file: "pool1.jpg", label: "exterior" },
  { file: "pool2.jpg", label: "interior" },
  { file: "pool3.jpg", label: "interior" },
  { file: "pool4.jpg", label: "exterior" },
  { file: "pool5.jpg", label: "interior" },
];

function matchChip(value: string, chips: ChipOption[]): { id: string; custom: boolean } {
  const v = value.trim();
  if (!v) return { id: "", custom: false };
  const hit = chips.find(
    (c) => c.id === v || Object.values(c.label).some((lab) => lab.toLowerCase() === v.toLowerCase()),
  );
  if (hit && !hit.custom) return { id: hit.id, custom: false };
  return { id: v, custom: true };
}

/** Hydro + HMO line from the facts file — not invented copy. */
function hydroAdvantageFromFacts(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hmo = lines.find((l) => /קופת חולים|صناديق المرضى|הפניית|تحويل فيزيو/i.test(l));
  const hydro = lines.find((l) => /^הידרותרפ|^هيدروثيرابي/i.test(l));
  const hit = hmo || hydro;
  if (!hit) return "";
  return hit.replace(/^[^:]{0,40}:\s*/, "").trim();
}

function poolAssets(): MediaAssetMeta[] {
  const now = new Date().toISOString();
  return POOL_FILES.map((f) => {
    const abs = join(ROOT, "public/rinan", f.file);
    const st = statSync(abs);
    return {
      id: `rinan-${f.file.replace(".jpg", "")}`,
      kind: "image" as const,
      mime: "image/jpeg",
      name: f.file,
      size: st.size,
      label: f.label,
      note: f.label,
      createdAt: now,
      publicSrc: `/rinan/${f.file}`,
    };
  });
}

function intakeFromFacts(text: string, filename: string): Intake {
  const extracted = extractFieldsFromText(text, filename);
  const take = (k: IngestFieldId) => String(extracted[k] || "").trim();
  const intake = emptyIntake();
  intake.type = "service";
  intake.depth = "deep";
  intake.operatingModel = "paid";
  intake.offer = "no_offer";
  intake.offerCustom = false;

  if (take("businessName")) intake.businessName = take("businessName");
  if (take("location")) intake.location = take("location");
  if (take("whatsapp")) intake.whatsapp = take("whatsapp");
  if (take("clinicHours")) intake.clinicHours = take("clinicHours");
  if (take("website")) intake.website = take("website");
  if (take("category")) intake.category = take("category");
  if (take("description")) intake.description = take("description");
  else if (take("category")) intake.description = take("category");
  if (take("brandTone")) intake.brandTone = take("brandTone");
  if (take("brandPositioning")) intake.brandPositioning = take("brandPositioning");
  if (take("channelNotes")) intake.channelNotes = take("channelNotes");
  if (take("whatsappTemplates")) intake.whatsappTemplates = take("whatsappTemplates");
  if (take("landingLines")) intake.landingLines = take("landingLines");
  if (take("kupaFileBy")) intake.kupaFileBy = take("kupaFileBy");
  if (take("kupaMemberFrom")) intake.kupaMemberFrom = take("kupaMemberFrom");

  const aud = take("audience");
  if (aud) {
    const m = matchChip(aud, AUDIENCE_CHIPS);
    intake.audience = m.id;
    intake.audienceCustom = m.custom;
  } else {
    intake.audience = "local_families";
    intake.audienceCustom = false;
  }

  intake.biggestProblem = "unknown";
  intake.problemCustom = false;

  const goal = take("mainGoal");
  if (goal) {
    const m = matchChip(goal, GOAL_CHIPS);
    intake.mainGoal = m.id;
    intake.goalCustom = m.custom;
  } else {
    intake.mainGoal = "bookings";
    intake.goalCustom = false;
  }

  const adv = take("uniqueAdvantage");
  if (adv) {
    const m = matchChip(adv, ADVANTAGE_CHIPS);
    intake.uniqueAdvantage = m.id;
    intake.advantageCustom = m.custom;
  } else {
    const hydro = hydroAdvantageFromFacts(text);
    if (hydro) {
      intake.uniqueAdvantage = hydro;
      intake.advantageCustom = true;
    }
  }

  intake.mediaAssets = poolAssets();
  return intake;
}

function noopStatus(_id: AgentId, _status: AgentStatus) {
  /* script — no UI */
}

async function buildPack(text: string, filename: string, id: string): Promise<CampaignPack> {
  const intake = intakeFromFacts(text, filename);
  const { report, diagnosis } = await runIntakeAndDiagnosis(intake, noopStatus);
  const { variants, strategy } = await runStrategic(intake, diagnosis, noopStatus);
  const { media } = await runMedia(intake, noopStatus);
  const { optimizer } = await runOptimizerStage(intake, media, noopStatus);
  const pack = assemblePack(intake, {
    report,
    diagnosis: { ...diagnosis, approved: true, approvedAt: new Date().toISOString() },
    variants,
    strategy,
    media,
    optimizer,
    agentStatus: {
      intake: "complete",
      diagnostic: "approved",
      strategic: "approved",
      media: "approved",
      optimizer: "complete",
    },
    id,
  });
  return { ...pack, id, saved: true };
}

async function main() {
  const heText = readFileSync("/workspace/rinan/facts-he.txt", "utf8");
  const arText = readFileSync("/workspace/rinan/facts-ar.txt", "utf8");
  const he = await buildPack(heText, "facts-he.txt", HE_ID);
  const ar = await buildPack(arText, "facts-ar.txt", AR_ID);
  const packs: CampaignPack[] = [he, ar];
  const outDir = join(ROOT, "public/packs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "published.json");
  writeFileSync(outPath, JSON.stringify(packs, null, 2), "utf8");

  for (const p of packs) {
    const h1s = p.variants.filter((v) => v.kind === "strong_offer").map((v) => `${v.locale}:${v.headline}`);
    const srcs = p.intake.mediaAssets.map((m) => m.publicSrc).filter(Boolean);
    console.log(`PACK ${p.id} name=${p.name}`);
    console.log(`  H1 ${h1s.join(" | ")}`);
    console.log(`  publicSrc ${srcs.join(" ")}`);
  }
  console.log(`wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
