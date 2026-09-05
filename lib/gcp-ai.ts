/**
 * Stable Google Cloud AI facade for SAWEK AD.
 * The viral-desk PR should import from here — not from Vertex internals.
 *
 *   import { completeGemini, runImagen, translateTexts, runViralDeskJob } from "@/lib/gcp-ai";
 *
 * Tiers: Pro = deep / predictor / calendar / scripts / trends.
 *        Flash = hooks + burst variations.
 *        Imagen = stills + carousels (real bytes only).
 *        Translation = HE ↔ AR ↔ EN neural MT.
 * Never invent ROAS or live platform metrics.
 */
export {
  VERTEX_MODEL_MAPPING,
  VERTEX_GEMINI_PRO_MODELS,
  VERTEX_GEMINI_FLASH_MODELS,
  VERTEX_IMAGEN_MODELS,
  modelsForTier,
  defaultModelForTier,
  publicGcpStackStatus,
  publicGeminiStatus,
  vertexProject,
  vertexLocation,
  vertexAccessToken,
  type GeminiTier,
  type GcpStackStatus,
} from "./vertex";

export {
  completeGemini,
  runGeminiGenerate,
  tierForGenerateMode,
  factsToIntake,
  bodyHasFacts,
  type GenerateBody,
  type GenerateMode,
} from "./engine/gemini-generate";

export { runFlashVariations, type VariationsResult } from "./engine/gemini-variations";
export { runProDesk, type ProDeskInsights } from "./engine/gemini-pro-jobs";
export { runImagen, runImagenMany, buildImagenPrompt, type ImagenResult, type ImagenFacts } from "./imagen";
export { translateTexts, localizeTriple, type TranslateResult } from "./translate";
export {
  VIRAL_DESK_JOBS,
  runViralDeskJob,
  type ViralDeskJob,
  type ViralDeskResult,
  type HookRetentionEstimate,
} from "./engine/viral-desk";
export {
  loadBrandVoice,
  saveBrandVoice,
  getBrandVoiceStore,
  setBrandVoiceStore,
  FIRESTORE_BRAND_VOICE_COLLECTION,
  type BrandVoice,
  type BrandVoiceStore,
} from "./brand-voice";
