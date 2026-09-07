/**
 * Split AI roles. Deterministic metrics live in engines.ts.
 * Vertex is optional reasoning / generation only — never a source of truth.
 */

export type AiRole = "extraction" | "reasoning" | "scoring" | "learning" | "generation" | "validation";

export const AI_ROLE_RULES: Record<AiRole, string> = {
  extraction: "Code extracts facts from intake, optimizer runs, and user-entered experiments. Models do not invent fields.",
  reasoning: "Optional Vertex Pro may interpret gaps. Output is labeled think / ai_interpretation. Never marked true.",
  scoring: "Planning scores and CPA/delta math run in code. No model-assigned ROAS or p-values.",
  learning: "DNA updates and NBA recompute from observed evidence in applyLearning().",
  generation: "Existing /api/generate templates + Vertex overlays. Failures stay honest.",
  validation: "forbiddenScientistClaims() + refuse-to-guess on missing numbers.",
};

export function roleForScientistField(field: string): AiRole {
  if (/score|cpa|delta|total|funnel/.test(field)) return "scoring";
  if (/dna|nba|learning|market/.test(field)) return "learning";
  if (/hypothesis|opportunity|audience|pattern/.test(field)) return "reasoning";
  if (/copy|variant|script/.test(field)) return "generation";
  if (/valid|forbidden/.test(field)) return "validation";
  return "extraction";
}
