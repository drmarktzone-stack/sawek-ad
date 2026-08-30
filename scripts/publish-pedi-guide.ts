import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { generateStrategy } from "../lib/engine/strategy";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import { produceAd } from "../lib/engine/produce-ad";
import type { CampaignPack, Intake, MediaAssetMeta } from "../lib/types";

const ROOT = process.cwd();
const PEDI_ID = "e3e112bd-d36a-4a10-8b5f-fccf4edfd83d";
const DUMP = join(ROOT, "public/packs/pedi-guide-e3e112bd.json");
const OUT = join(ROOT, "public/packs/published.json");

function stubIntake(): Intake {
  const intake = emptyIntake();
  intake.type = "product";
  intake.depth = "quick";
  intake.operatingModel = "paid";
  intake.businessName = "pedi-guide";
  intake.category = "MedicalOrganization";
  intake.description =
    "AI-powered pediatric health platform with 21 smart tools for child health. Content by Dr. Samer Abu Mukh, pediatrician. An AI doctor and verified medical information.";
  intake.website = "https://www.pedi-guide.com";
  intake.audience = "parents";
  intake.audienceCustom = false;
  intake.biggestProblem = "ילד עם חום ב־3 בלילה ולא בטוחים מה לעשות?";
  intake.problemCustom = true;
  intake.uniqueAdvantage =
    "רופא AI, מחשבון אקמול וכלים בדוקים להורים. בעברית. לא מחליף רופא — עוזר להבין מתי לפנות עכשיו.";
  intake.advantageCustom = true;
  intake.mainGoal = "installs";
  intake.goalCustom = false;
  intake.offer = "no_offer";
  intake.channelNotes = "facebook+instagram";
  return intake;
}

function asPack(raw: unknown): CampaignPack | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.intake && typeof obj.intake === "object") return raw as CampaignPack;
  if (obj.pack && typeof obj.pack === "object") return asPack(obj.pack);
  if (Array.isArray(raw)) {
    const hit = raw.find((x) => x && typeof x === "object" && (x as CampaignPack).id === PEDI_ID);
    return hit ? asPack(hit) : asPack(raw[0]);
  }
  return null;
}

function ogAssets(pack: CampaignPack | null, intake: Intake): MediaAssetMeta[] {
  const existing = (pack?.intake?.mediaAssets ?? intake.mediaAssets ?? []).filter(Boolean);
  const withSrc = existing.filter((a) => a.publicSrc);
  if (withSrc.length) return existing;
  const ogLocal = join(ROOT, "public/pedi-guide/og.jpg");
  if (existsSync(ogLocal)) {
    return [
      {
        id: "pedi-og",
        kind: "image",
        mime: "image/jpeg",
        name: "og.jpg",
        size: 0,
        label: "other",
        note: "og:image",
        createdAt: new Date().toISOString(),
        publicSrc: "/pedi-guide/og.jpg",
      },
    ];
  }
  return existing;
}

function buildPack(intake: Intake, id: string, extras?: Partial<CampaignPack>): CampaignPack {
  const report = validateIntake(intake);
  const diagnosis = {
    ...diagnose(intake, report),
    approved: true as const,
    approvedAt: extras?.diagnosis?.approvedAt ?? new Date().toISOString(),
  };
  const variants = generateVariants(intake);
  const strategy = generateStrategy(intake, diagnosis);
  const media = generateMedia(intake);
  const optimizer = generateOptimizer(intake, media);
  const pack = assemblePack(intake, {
    report,
    diagnosis,
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
  const produced =
    extras?.producedAds && extras.producedAds.length
      ? extras.producedAds
      : [produceAd(intake, "lifestyle", "", "he")];
  return {
    ...pack,
    id,
    createdAt: extras?.createdAt ?? pack.createdAt,
    updatedAt: new Date().toISOString(),
    name: extras?.name || intake.businessName || pack.name,
    saved: true,
    planActivated: extras?.planActivated ?? true,
    producedAds: produced,
  };
}

function main() {
  let dumped: CampaignPack | null = null;
  if (existsSync(DUMP)) {
    dumped = asPack(JSON.parse(readFileSync(DUMP, "utf8")));
    console.log("dump found", DUMP, dumped ? `id=${dumped.id}` : "unparsed");
  } else {
    console.log("dump missing — publishing stub from intake facts");
  }

  const baseIntake = dumped?.intake ? { ...stubIntake(), ...dumped.intake } : stubIntake();
  const assets = ogAssets(dumped, baseIntake);
  const intake: Intake = { ...baseIntake, mediaAssets: assets.length ? assets : baseIntake.mediaAssets };
  // Always regenerate spoken variants after the engine fix.
  const pack = buildPack(intake, dumped?.id || PEDI_ID, dumped ?? undefined);

  mkdirSync(join(ROOT, "public/packs"), { recursive: true });
  let published: CampaignPack[] = [];
  if (existsSync(OUT)) {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    published = Array.isArray(prev) ? prev : [];
  }
  const next = [pack, ...published.filter((p) => p.id !== pack.id)];
  writeFileSync(OUT, JSON.stringify(next, null, 2), "utf8");

  const he = pack.variants.find((v) => v.locale === "he" && v.kind === "strong_offer");
  const srcs = pack.intake.mediaAssets.map((m) => m.publicSrc).filter(Boolean);
  console.log(`PACK ${pack.id} name=${pack.name}`);
  console.log(`  H1 ${he?.headline}`);
  console.log(`  body ${he?.primaryText?.replace(/\s+/g, " ").slice(0, 220)}`);
  console.log(`  publicSrc ${srcs.join(" ") || "(none)"}`);
  console.log(`wrote ${OUT} packs=${next.length} ids=${next.map((p) => p.id).join(",")}`);
}

main();
