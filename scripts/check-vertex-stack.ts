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
import { shouldGroundGenerateMode, tierForGenerateMode } from "../lib/engine/gemini-generate";
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
if (!shouldGroundGenerateMode("strategy") || !shouldGroundGenerateMode("audit") || !shouldGroundGenerateMode("calendar")) {
  fail("strategy/audit/calendar must use Search Grounding");
}
if (!shouldGroundGenerateMode("ads") || !shouldGroundGenerateMode("angles")) fail("assemble/angles must use Search Grounding");

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
  "lib/engine/research-public.ts",
  "lib/brand-voice.ts",
  "app/api/generate/viral/route.ts",
  "app/api/brand-voice/route.ts",
];
for (const f of requiredFiles) {
  try {
    readFileSync(join(root, f), "utf8");
  } catch {
    fail(`missing ${f}`);
  }
}

const generateRoute = readFileSync(join(root, "app/api/generate/route.ts"), "utf8");
if (!generateRoute.includes("checkAiRateLimit") || !generateRoute.includes("useTemplates")) {
  fail("generate route must rate-limit Vertex and keep template overlays");
}
const imagenRoute = readFileSync(join(root, "app/api/imagen/route.ts"), "utf8");
if (!imagenRoute.includes("checkAiRateLimit")) fail("imagen route must rate-limit");
const translateRoute = readFileSync(join(root, "app/api/translate/route.ts"), "utf8");
if (!translateRoute.includes("checkAiRateLimit")) fail("translate route must rate-limit");
const proRoute = readFileSync(join(root, "app/api/generate/pro-desk/route.ts"), "utf8");
if (!proRoute.includes("proDeskRateLimitedBody")) fail("pro-desk must fail honest on rate limit");

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
if (!run.includes("/api/research")) fail("pipeline must call research API");
if (!run.includes("/api/imagen")) fail("pipeline must call Imagen for complete-ad stills");
if (!run.includes("/api/generate/variations")) fail("pipeline must call Flash variations");
if (!run.includes("/api/translate")) fail("pipeline must call Cloud Translation");
if (!run.includes("visualSource: \"imagen\"") && !run.includes('visualSource: "imagen"')) {
  fail("pipeline must persist Imagen visual on complete ad");
}
if (!run.includes("attachResearchAndSync") && !run.includes("applyResearchToPack")) {
  fail("pipeline must overlay research");
}

const vertexDoc = readFileSync(join(root, "docs/VERTEX_STACK.md"), "utf8");
if (vertexDoc.includes("Use it only for trends")) fail("VERTEX_STACK still limits grounding to trends");
if (!vertexDoc.includes("runMarketResearch")) fail("VERTEX_STACK missing research desk");

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
if (VIRAL_DESK_JOBS.calendar30.tier !== "pro" || !VIRAL_DESK_JOBS.calendar30.grounding) {
  fail("30-day calendar must be Pro + Search Grounding");
}
if (VIRAL_DESK_JOBS.trends.tier !== "pro" || !VIRAL_DESK_JOBS.trends.grounding) {
  fail("trends must be Pro + Search Grounding");
}
if (FIRESTORE_BRAND_VOICE_COLLECTION !== "brand_voices") fail("Firestore brand_voices collection id");

const gcpAi = readFileSync(join(root, "lib/gcp-ai.ts"), "utf8");
if (!gcpAi.includes("runViralDeskJob")) fail("gcp-ai must export runViralDeskJob");
if (!gcpAi.includes("completeGemini")) fail("gcp-ai must export completeGemini");
if (!gcpAi.includes("runImagen")) fail("gcp-ai must export runImagen");
if (!gcpAi.includes("translateTexts")) fail("gcp-ai must export translateTexts");
if (!gcpAi.includes("runMarketResearch")) fail("gcp-ai must export runMarketResearch");

const generateSrc = readFileSync(join(root, "lib/engine/gemini-generate.ts"), "utf8");
if (!generateSrc.includes("googleSearch")) fail("completeGemini must support Search Grounding");
if (!generateSrc.includes("grounding")) fail("completeGemini missing grounding option");
if (!generateSrc.includes("shouldGroundGenerateMode")) fail("generate modes must declare grounding");
if (!generateSrc.includes("grounding,")) fail("runGeminiGenerate must pass grounding");

const proJobs = readFileSync(join(root, "lib/engine/gemini-pro-jobs.ts"), "utf8");
if (!proJobs.includes("grounding: true")) fail("Pro desk must use Search Grounding");

const research = readFileSync(join(root, "lib/engine/ad-research.ts"), "utf8");
if (!research.includes("meta_ad_library")) fail("ad-research missing Meta Ad Library");
if (!research.includes("tiktok_creative_center")) fail("ad-research missing TikTok Creative Center");
if (!research.includes("google_ads_transparency")) fail("ad-research missing Google Ads Transparency");
if (!research.includes("pinterest_trends")) fail("ad-research missing Pinterest Trends");
if (!research.includes("youtube_suggest")) fail("ad-research missing YouTube suggest");
if (!research.includes("google_suggest")) fail("ad-research missing Google suggest");
if (!research.includes("linkedin_ad_library")) fail("ad-research missing LinkedIn Ad Library");
if (!research.includes("META_ADS_LIBRARY_TOKEN")) fail("ad-research must read META_ADS_LIBRARY_TOKEN");

try {
  readFileSync(join(root, "app/api/research/route.ts"), "utf8");
} catch {
  fail("missing app/api/research/route.ts");
}

if (!env.includes("META_ADS_LIBRARY_TOKEN")) fail(".env.example missing META_ADS_LIBRARY_TOKEN");
if (!i18n.includes("research.title")) fail("Hebrew research-desk copy");
if (!i18n.includes("מה רץ עכשיו בשוק")) fail("research title Hebrew");

const viral = readFileSync(join(root, "lib/engine/viral-desk.ts"), "utf8");
if (!viral.includes("notLiveMetrics")) fail("predictor must flag notLiveMetrics");
if (!viral.includes("gemini_pro_estimate")) fail("predictor must be labeled estimate");
if (!viral.includes("retentionCurve")) fail("predictor must return a retention curve");

const viralUi = readFileSync(join(root, "lib/engine/gemini-viral.ts"), "utf8");
if (!viralUi.includes("grounding: true")) fail("UI viral trends must use Search Grounding");
if (!viralUi.includes("runImagenMany")) fail("UI viral carousel must call Imagen 3");
if (!viralUi.includes('tier: "pro"')) fail("UI viral scripts/predict must use Pro");
if (!viralUi.includes('tier: "flash"')) fail("UI viral hooks must use Flash");

if (failures.length) {
  console.error("FAIL vertex stack\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS vertex stack: Pro/Flash/Imagen/Translation routing + 1.5→2.5 mapping + viral-desk callbook");
