/**
 * Rebuild published.json with exactly 3 demos built by app engines:
 * 1) demo-samer-clinic — real clinic facts/snapshot + studio stills
 * 2) demo-olive-kitchen — rich fictional intake → HE/AR/EN + calendar + images
 * 3) demo-sand-boutique — rich fictional intake → HE/AR/EN + calendar + images
 *
 * Attaches CMO idea packs (planning scorecards — never ROAS).
 * Writes SVG studio stills under public/packs/assets/.
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { assemblePack } from "../lib/engine/run";
import { generateVariants } from "../lib/engine/copy";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateStrategy } from "../lib/engine/strategy";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import { buildPostingCalendar } from "../lib/engine/posting-calendar";
import { buildCmoIdeasPack, ideaNamesForLocale, platformCount } from "../lib/engine/cmo-ideas";
import { demoIntake, DEMO_ID } from "../lib/demo";
import {
  catalogIntake,
  demoMetaFor,
  DEMO_OLIVE_ID,
  DEMO_SAND_ID,
  PUBLISHED_DEMO_IDS,
  oliveKitchenIntake,
  sandBoutiqueIntake,
  type DemoPackId,
} from "../lib/demo-catalog";
import { studioStillsForIntake } from "../lib/studio-stills";
import { isDemoCmoComplete } from "../lib/demo-cmo";
import { demoPhotoManifest } from "../lib/demo-assets";
import type { CampaignPack, Intake, Locale, MediaAssetMeta } from "../lib/types";
import { detectVertical } from "../lib/vertical";
import { uid } from "../lib/utils";
import type { DemoAssetId } from "../lib/demo-assets";

function enrichFictional(intake: Intake, kind: "olive" | "sand"): Intake {
  if (kind === "olive") {
    return {
      ...intake,
      brandTone:
        intake.brandTone ||
        "חם, ביתי, ים-תיכוני — בלי סלוגני רשת. שמן זית, קרמיקה, ישיבה בחוץ.",
      brandPositioning:
        intake.brandPositioning ||
        "מסעדת שכונה משפחתית בנווה שקד — טקס שולחן רגוע, לא משלוחים מהירים.",
      depth: "deep",
    };
  }
  return {
    ...intake,
    brandTone:
      intake.brandTone ||
      "רגוע, פשתן, חול — ייעוץ אישי בלי רעש קניון. אלגנטיות יומיומית.",
    brandPositioning:
      intake.brandPositioning ||
      "בוטיק נשי שקט בעין ברק — מתלה אחד מדויק עדיף על קטלוג מנופח.",
    depth: "deep",
  };
}

function attachStudioAssets(intake: Intake, packId: DemoPackId): Intake {
  const stills = studioStillsForIntake(intake).slice(0, 4);
  const outDir = join(process.cwd(), "public/packs/assets", packId);
  mkdirSync(outDir, { recursive: true });
  const assets: MediaAssetMeta[] = stills.map((still, idx) => {
    const file = `still-${idx + 1}.svg`;
    const abs = join(outDir, file);
    // dataUrl is data:image/svg+xml;charset=utf-8,ENCODED
    const raw = still.dataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, "");
    const svg = decodeURIComponent(raw);
    writeFileSync(abs, svg, "utf8");
    const publicSrc = `/packs/assets/${packId}/${file}`;
    return {
      id: uid("asset"),
      kind: "image",
      mime: "image/svg+xml",
      name: still.name.en,
      size: svg.length,
      label: idx === 0 ? "exterior" : "interior",
      note: `offer:studio:${still.id}`,
      createdAt: new Date().toISOString(),
      publicSrc,
    };
  });
  const existing = intake.mediaAssets ?? [];
  return { ...intake, mediaAssets: [...existing, ...assets] };
}

function buildFromIntake(intake: Intake, id: DemoPackId): CampaignPack {
  const withAssets = attachStudioAssets(intake, id);
  const report = validateIntake(withAssets);
  const diagnosis = {
    ...diagnose(withAssets, report),
    approved: true,
    approvedAt: new Date().toISOString(),
  };
  const variants = generateVariants(withAssets);
  const media = generateMedia(withAssets);
  const pack = assemblePack(withAssets, {
    report,
    diagnosis,
    variants,
    strategy: generateStrategy(withAssets, diagnosis),
    media,
    optimizer: generateOptimizer(withAssets, media),
    agentStatus: {
      intake: "complete",
      diagnostic: "approved",
      strategic: "approved",
      media: "approved",
      optimizer: "complete",
    },
    id,
  });
  const cmo = pack.cmoIdeas ?? buildCmoIdeasPack(withAssets, "he");
  const meta = demoMetaFor(id);
  return {
    ...pack,
    id,
    saved: true,
    planActivated: true,
    name: withAssets.businessName || pack.name,
    cmoIdeas: cmo,
    demoMeta: {
      ...meta,
      ideaNames: {
        he: ideaNamesForLocale(withAssets, "he"),
        ar: ideaNamesForLocale(withAssets, "ar"),
        en: ideaNamesForLocale(withAssets, "en"),
      },
    },
  };
}

function incompleteCount(pack: CampaignPack): number {
  const blob = JSON.stringify(pack.variants) + JSON.stringify(pack.agency ?? {}) + JSON.stringify(pack.cmoIdeas ?? {});
  return (blob.match(/\[יש להשלים\]|\[يجب الاستكمال\]|\[TO COMPLETE\]/g) || []).length;
}

function assertNoFakePerf(pack: CampaignPack) {
  const blob = JSON.stringify(pack.cmoIdeas ?? {});
  if (/\bROAS\s*[:=]\s*\d/i.test(blob)) {
    throw new Error(`${pack.id}: fake ROAS number in cmoIdeas`);
  }
  // Labels may mention "not ROAS" — that is fine. Ban performance claims.
  if (/ROAS\s+\d|CAC\s*=\s*\d|likes?\s*[:=]\s*\d/i.test(blob)) {
    throw new Error(`${pack.id}: performance metric invented in cmoIdeas`);
  }
}

function main() {
  // Platform catalog sanity
  for (const v of ["clinic", "restaurant", "retail"] as const) {
    const n = platformCount(v);
    if (n < 8 || n > 12) {
      console.error("platform count out of range", v, n);
      process.exit(1);
    }
  }

  const clinicIntake = demoIntake("he"); // real facts only
  const oliveIntake = enrichFictional(oliveKitchenIntake("he"), "olive");
  const sandIntake = enrichFictional(sandBoutiqueIntake("he"), "sand");

  // Also ensure AR/EN name variants exist via generateVariants from HE intake
  // (spoken engine localizes). Catalog intakes are locale-specific for display fields;
  // engines produce all three locales from whichever intake language is primary.
  void catalogIntake; // keep import used for API symmetry

  const clinic = buildFromIntake(clinicIntake, DEMO_ID);
  const olive = buildFromIntake(oliveIntake, DEMO_OLIVE_ID);
  const sand = buildFromIntake(sandIntake, DEMO_SAND_ID);

  const packs = [clinic, olive, sand];
  const ids = packs.map((p) => p.id);
  if (ids.join(",") !== PUBLISHED_DEMO_IDS.join(",")) {
    console.error("ID order mismatch", ids, PUBLISHED_DEMO_IDS);
    process.exit(1);
  }

  for (const pack of packs) {
    if (detectVertical(pack.intake) === "restaurant" && pack.id !== DEMO_OLIVE_ID) {
      console.error("unexpected restaurant", pack.id);
      process.exit(1);
    }
    for (const loc of ["he", "ar", "en"] as Locale[]) {
      const week = buildPostingCalendar(pack, loc);
      if (week.length !== 7) {
        console.error("calendar length", pack.id, loc, week.length);
        process.exit(1);
      }
      if (!week.every((d) => d.ideaName)) {
        console.error("calendar missing ideaName", pack.id, loc);
        process.exit(1);
      }
    }
    const n = incompleteCount(pack);
    if (pack.id !== DEMO_ID && n > 0) {
      console.error("incomplete markers on fictional", pack.id, n);
      process.exit(1);
    }
    assertNoFakePerf(pack);
    if (!pack.cmoIdeas?.selected?.length) {
      console.error("missing cmo ideas", pack.id);
      process.exit(1);
    }
    if (!isDemoCmoComplete(pack.intake)) {
      console.error("CMO desk incomplete", pack.id, {
        businessModel: pack.intake.businessModel?.slice(0, 40),
        budget: pack.intake.monthlyBudget,
        pastAds: pack.intake.pastAds?.slice(0, 40),
      });
      process.exit(1);
    }
    const photos = (pack.intake.mediaAssets ?? []).filter(
      (a) => a.kind === "image" && a.publicSrc && !/\.svg$/i.test(a.publicSrc),
    );
    if (photos.length < 4) {
      console.error("need ≥4 real photos", pack.id, photos.length);
      process.exit(1);
    }
    for (const row of demoPhotoManifest(pack.id as DemoAssetId)) {
      const abs = join(process.cwd(), "public/packs/assets", pack.id, row.file);
      if (!existsSync(abs) || statSync(abs).size < 8000) {
        console.error("missing or tiny photo file", abs);
        process.exit(1);
      }
    }
    const heIdeas = pack.demoMeta?.ideaNames?.he ?? [];
    console.log(
      "PACK",
      pack.id,
      "variants",
      pack.variants.length,
      "incompleteMarkers",
      n,
      "ideas",
      heIdeas.slice(0, 3).join(" | "),
      "assets",
      (pack.intake.mediaAssets ?? []).length,
    );
    const he = pack.variants.find((v) => v.locale === "he" && v.kind === "strong_offer");
    console.log("  HE headline:", he?.headline);
    console.log("  HE cta:", he?.cta);
  }

  const banned = /Pizza\s*Hut|פיצה האט|Aluf\s*Sport|אלוף ספורט/i;
  const all = JSON.stringify(packs);
  if (banned.test(all)) {
    console.error("banned brand leaked into packs");
    process.exit(1);
  }

  const outDir = join(process.cwd(), "public/packs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "published.json");
  writeFileSync(outPath, JSON.stringify(packs, null, 2), "utf8");
  console.log("WROTE", outPath, "ids=" + ids.join(","));
  // confirm asset files exist
  for (const id of ids) {
    const dir = join(outDir, "assets", id);
    if (!existsSync(dir)) {
      console.error("missing assets dir", dir);
      process.exit(1);
    }
  }
}

main();
