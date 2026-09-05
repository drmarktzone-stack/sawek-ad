/**
 * Static proof that Pro / Flash / Imagen / Translation are wired
 * with the 1.5 → current-model mapping. Does not invent live metrics.
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  VERTEX_GEMINI_FLASH_MODELS,
  VERTEX_GEMINI_PRO_MODELS,
  VERTEX_IMAGEN_MODELS,
  VERTEX_MODEL_MAPPING,
  defaultModelForTier,
  modelsForTier,
} from "../lib/vertex";
import { tierForGenerateMode } from "../lib/engine/gemini-generate";
import { VIRAL_DESK_JOBS } from "../lib/engine/viral-desk";
import { FIRESTORE_BRAND_VOICE_COLLECTION } from "../lib/brand-voice";

const root = process.cwd();
const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

if (VERTEX_MODEL_MAPPING.requestedPro !== "gemini-1.5-pro") fail("requested Pro mapping");
if (VERTEX_MODEL_MAPPING.requestedFlash !== "gemini-1.5-flash") fail("requested Flash mapping");
if (VERTEX_MODEL_MAPPING.livePro !== "gemini-2.5-pro") fail(`live Pro ${VERTEX_MODEL_MAPPING.livePro}`);
if (VERTEX_MODEL_MAPPING.liveFlash !== "gemini-2.5-flash") fail(`live Flash ${VERTEX_MODEL_MAPPING.liveFlash}`);
if (VERTEX_MODEL_MAPPING.liveImagen !== "imagen-3.0-generate-001") fail("live Imagen");
if (VERTEX_MODEL_MAPPING.translation !== "cloud-translation-v3") fail("translation id");

if (!VERTEX_GEMINI_PRO_MODELS.includes("gemini-2.5-pro")) fail("PRO list missing gemini-2.5-pro");
if (!VERTEX_GEMINI_FLASH_MODELS.includes("gemini-2.5-flash")) fail("FLASH list missing gemini-2.5-flash");
if (!VERTEX_IMAGEN_MODELS.includes("imagen-3.0-generate-001")) fail("Imagen 3 missing");

if (defaultModelForTier("pro") !== "gemini-2.5-pro") fail("defaultModelForTier pro");
if (defaultModelForTier("flash") !== "gemini-2.5-flash") fail("defaultModelForTier flash");
if (!modelsForTier("pro", "vertex").includes("gemini-2.5-pro")) fail("modelsForTier pro");
if (!modelsForTier("flash", "vertex").includes("gemini-2.5-flash")) fail("modelsForTier flash");

if (tierForGenerateMode("variations") !== "flash") fail("variations must be flash");
if (tierForGenerateMode("channels") !== "flash") fail("channels must be flash");
if (tierForGenerateMode("angles") !== "flash") fail("angles must be flash");
if (tierForGenerateMode("ads") !== "pro") fail("ads must be pro");
if (tierForGenerateMode("strategy") !== "pro") fail("strategy must be pro");
if (tierForGenerateMode("audit") !== "pro") fail("audit must be pro");
if (tierForGenerateMode("calendar") !== "pro") fail("calendar must be pro");
if (tierForGenerateMode("scripts") !== "pro") fail("scripts must be pro");
if (tierForGenerateMode("scan") !== "pro") fail("scan must be pro");

const requiredFiles = [
  "lib/translate.ts",
  "lib/imagen-store.ts",
  "lib/engine/gemini-variations.ts",
  "lib/engine/gemini-pro-jobs.ts",
  "app/api/generate/variations/route.ts",
  "app/api/generate/pro-desk/route.ts",
  "app/api/translate/route.ts",
  "app/api/imagen/[id]/route.ts",
  "app/status/page.tsx",
  "docs/VERTEX_STACK.md",
  "lib/gcp-ai.ts",
  "lib/engine/viral-desk.ts",
  "lib/brand-voice.ts",
  "app/api/generate/viral/route.ts",
];
for (const f of requiredFiles) {
  try {
    readFileSync(join(root, f), "utf8");
  } catch {
    fail(`missing ${f}`);
  }
}

const generate = readFileSync(join(root, "lib/engine/gemini-generate.ts"), "utf8");
if (!generate.includes('tier: tierForGenerateMode(mode)')) fail("generate route missing tier");
if (!generate.includes('tier: "pro"')) fail("vision/score missing pro tier");

const imagen = readFileSync(join(root, "lib/imagen.ts"), "utf8");
if (!imagen.includes("VERTEX_IMAGEN_MODELS")) fail("imagen.ts must use VERTEX_IMAGEN_MODELS");
if (!imagen.includes("recordImagenOutcome")) fail("imagen.ts must record outcomes");
if (!imagen.includes("storeImagenImage")) fail("imagen.ts must store stills");
if (/ok:\s*true[\s\S]{0,80}svg/i.test(imagen)) fail("imagen must not mark SVG junk as ok");

const translate = readFileSync(join(root, "lib/translate.ts"), "utf8");
if (!translate.includes("translation.googleapis.com/v3")) fail("Cloud Translation v3 URL missing");
if (!translate.includes("recordTranslationOutcome")) fail("translation outcomes missing");

const run = readFileSync(join(root, "lib/engine/run.ts"), "utf8");
if (!run.includes("/api/generate/pro-desk")) fail("pipeline must call Pro desk API");
if (!run.includes("overlayProOnAgency")) fail("pipeline must overlay Pro desk");

const env = readFileSync(join(root, ".env.example"), "utf8");
if (!env.includes("GOOGLE_CLOUD_PROJECT=project-8fd8a005-ae6d-4139-ab4")) fail(".env.example project");
if (!env.includes("gemini-2.5-pro")) fail(".env.example mapping");

const i18n = readFileSync(join(root, "lib/i18n.ts"), "utf8");
if (!i18n.includes("gcp.flashDown")) fail("Hebrew Flash-down copy");
if (!i18n.includes("gcp.proDown")) fail("Hebrew Pro-down copy");
if (!i18n.includes("gcp.translationDown")) fail("Hebrew Translation-down copy");

if (VIRAL_DESK_JOBS.scripts.tier !== "pro") fail("viral scripts must be Pro");
if (VIRAL_DESK_JOBS.hooks.tier !== "flash") fail("viral hooks must be Flash");
if (VIRAL_DESK_JOBS.predict.tier !== "pro") fail("hook/retention predictor must be Pro");
if (VIRAL_DESK_JOBS.rewrite.tier !== "pro") fail("video rewrite must be Pro");
if (VIRAL_DESK_JOBS.carousel.tier !== "imagen") fail("carousel must be Imagen");
if (VIRAL_DESK_JOBS.calendar30.tier !== "pro") fail("30-day calendar must be Pro");
if (VIRAL_DESK_JOBS.trends.tier !== "pro" || !VIRAL_DESK_JOBS.trends.grounding) {
  fail("trends must be Pro + Search Grounding");
}
if (FIRESTORE_BRAND_VOICE_COLLECTION !== "brand_voices") fail("Firestore brand_voices collection id");

const gcpAi = readFileSync(join(root, "lib/gcp-ai.ts"), "utf8");
if (!gcpAi.includes("runViralDeskJob")) fail("gcp-ai must export runViralDeskJob");
if (!gcpAi.includes("completeGemini")) fail("gcp-ai must export completeGemini");
if (!gcpAi.includes("runImagen")) fail("gcp-ai must export runImagen");
if (!gcpAi.includes("translateTexts")) fail("gcp-ai must export translateTexts");

const generateSrc = readFileSync(join(root, "lib/engine/gemini-generate.ts"), "utf8");
if (!generateSrc.includes("googleSearch")) fail("completeGemini must support Search Grounding");
if (!generateSrc.includes("grounding")) fail("completeGemini missing grounding option");

const viral = readFileSync(join(root, "lib/engine/viral-desk.ts"), "utf8");
if (!viral.includes("notLiveMetrics")) fail("predictor must flag notLiveMetrics");
if (!viral.includes("gemini_pro_estimate")) fail("predictor must be labeled estimate");

if (failures.length) {
  console.error("FAIL vertex stack\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS vertex stack: Pro/Flash/Imagen/Translation routing + 1.5→2.5 mapping + viral-desk callbook");
