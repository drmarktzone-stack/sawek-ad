/**
 * Rebuild published.json with exactly 3 demos:
 * 1) demo-samer-clinic — keep existing real clinic pack (or rebuild from snapshot)
 * 2) demo-olive-kitchen — fictional Mediterranean restaurant
 * 3) demo-sand-boutique — fictional clothing boutique
 *
 * Copy via spoken/fact engines (generateVariants + assemblePack). No Gemini required.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { assemblePack } from "../lib/engine/run";
import { generateVariants } from "../lib/engine/copy";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateStrategy } from "../lib/engine/strategy";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import { buildPostingCalendar } from "../lib/engine/posting-calendar";
import { demoIntake, DEMO_ID } from "../lib/demo";
import {
  catalogIntake,
  demoMetaFor,
  DEMO_OLIVE_ID,
  DEMO_SAND_ID,
  PUBLISHED_DEMO_IDS,
  type DemoPackId,
} from "../lib/demo-catalog";
import type { CampaignPack, Intake, Locale } from "../lib/types";

function buildFromIntake(intake: Intake, id: DemoPackId): CampaignPack {
  const report = validateIntake(intake);
  const diagnosis = {
    ...diagnose(intake, report),
    approved: true,
    approvedAt: new Date().toISOString(),
  };
  const variants = generateVariants(intake);
  const media = generateMedia(intake);
  const pack = assemblePack(intake, {
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
    id,
  });
  return {
    ...pack,
    id,
    saved: true,
    planActivated: true,
    name: intake.businessName || pack.name,
    demoMeta: demoMetaFor(id),
  };
}

function loadExistingClinic(): CampaignPack | null {
  const path = join(process.cwd(), "public/packs/published.json");
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as CampaignPack[];
    const clinic = Array.isArray(raw) ? raw.find((p) => p.id === DEMO_ID) : null;
    return clinic ?? null;
  } catch {
    return null;
  }
}

function incompleteCount(pack: CampaignPack): number {
  const blob = JSON.stringify(pack.variants) + JSON.stringify(pack.agency ?? {});
  return (blob.match(/\[יש להשלים\]|\[يجب الاستكمال\]|\[TO COMPLETE\]/g) || []).length;
}

function main() {
  const existing = loadExistingClinic();
  const clinic: CampaignPack = existing
    ? {
        ...existing,
        id: DEMO_ID,
        demoMeta: demoMetaFor(DEMO_ID),
      }
    : buildFromIntake(demoIntake("he"), DEMO_ID);

  const olive = buildFromIntake(catalogIntake(DEMO_OLIVE_ID, "he")!, DEMO_OLIVE_ID);
  const sand = buildFromIntake(catalogIntake(DEMO_SAND_ID, "he")!, DEMO_SAND_ID);

  const packs = [clinic, olive, sand];
  const ids = packs.map((p) => p.id);
  if (ids.join(",") !== PUBLISHED_DEMO_IDS.join(",")) {
    console.error("ID order mismatch", ids, PUBLISHED_DEMO_IDS);
    process.exit(1);
  }

  // Calendar sample smoke (engines) — not stored separately; agency has 13-week calendar.
  for (const pack of packs) {
    for (const loc of ["he", "ar", "en"] as Locale[]) {
      const week = buildPostingCalendar(pack, loc);
      if (week.length !== 7) {
        console.error("calendar length", pack.id, loc, week.length);
        process.exit(1);
      }
    }
    const n = incompleteCount(pack);
    console.log("PACK", pack.id, "variants", pack.variants.length, "incompleteMarkers", n, "fictional", pack.demoMeta?.fictional);
    const he = pack.variants.find((v) => v.locale === "he" && v.kind === "strong_offer");
    console.log("  HE headline:", he?.headline);
    console.log("  HE cta:", he?.cta);
  }

  const outDir = join(process.cwd(), "public/packs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "published.json");
  writeFileSync(outPath, JSON.stringify(packs, null, 2), "utf8");
  console.log("WROTE", outPath, "ids=" + ids.join(","));
}

main();
