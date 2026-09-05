# SAWEK AD — Google Cloud AI stack ($300 pack)

Owner asked for **Gemini 1.5 Pro** and **Gemini 1.5 Flash**. Those publishers are **retired on Vertex AI**. This repo maps them to the current Pro / Flash models in GCP project `project-8fd8a005-ae6d-4139-ab4`.

| Requested | Live on Vertex | Role |
|---|---|---|
| `gemini-1.5-pro` | `gemini-2.5-pro` (fallback `gemini-2.0-pro`) | CMO strategy, site-audit insights, long-form calendars, script packs, deep ad copy, vision/score |
| `gemini-1.5-flash` | `gemini-2.5-flash` (fallback `gemini-2.0-flash`) | Burst variations, short Meta / WhatsApp / Google Ads, channel overlay |
| Imagen 3 | `imagen-3.0-generate-001` (then fast / Imagen 4 alias) | HD banner / ad stills, stored and served at `/api/imagen/:id` |
| Cloud Translation | v3 `projects/{id}:translateText` (v2 fallback) | HE ↔ AR ↔ EN pack + variation localization — neural MT, not string replace |

Code constants: `VERTEX_MODEL_MAPPING`, `VERTEX_GEMINI_PRO_MODELS`, `VERTEX_GEMINI_FLASH_MODELS`, `VERTEX_IMAGEN_MODELS` in `lib/vertex.ts`.

## Routing

- `tierForGenerateMode("ads"|"strategy"|"audit"|"calendar"|"scripts"|"scan")` → **pro**
- `tierForGenerateMode("variations"|"channels"|"angles")` → **flash**
- `POST /api/generate` uses that map.
- `POST /api/generate/variations` is the dedicated Flash path.
- `POST /api/translate` is Cloud Translation only.
- `POST /api/imagen` calls Imagen 3; success requires real image bytes (no empty SVG as ok).
- `GET /api/gemini-status` returns all four services + the 1.5 → 2.5 mapping.
- UI: `/status`

## Credentials

Prefer **ADC** already on Cloud Run (`K_SERVICE` + metadata). Optional local `GOOGLE_APPLICATION_CREDENTIALS`. Do not put passwords in the repo. `GEMINI_API_KEY` is AI Studio fallback only.

Required IAM on the Cloud Run SA (same $300 pack):

- `roles/aiplatform.user` (Gemini + Imagen)
- `roles/cloudtranslate.user` (Translation)

## Honest downtime

Hebrew / Arabic / English copy in `lib/i18n.ts` (`gcp.note.*`, `gcp.flashDown`, `gcp.proDown`, `audit.imagenDown`) tells the user when a Google API is down. Templates stay intake-driven. No fake ROAS.

## Viral-desk callbook (Mohtawak-style — next PR)

Import **only** from `@/lib/gcp-ai`. Do not reach into `lib/vertex.ts` internals.

```ts
import {
  completeGemini,          // Pro / Flash (+ optional Search Grounding)
  runFlashVariations,      // Flash burst
  runProDesk,              // Pro CMO overlay
  runImagen, runImagenMany,// Imagen 3 stills / carousels
  translateTexts,          // Cloud Translation HE↔AR↔EN
  runViralDeskJob,         // typed Mohtawak jobs
  loadBrandVoice, saveBrandVoice, FIRESTORE_BRAND_VOICE_COLLECTION,
} from "@/lib/gcp-ai";
```

| Job | Call | Tier | Notes |
|---|---|---|---|
| 7 viral scripts | `runViralDeskJob("scripts", body)` or `POST /api/generate/viral` | Pro | HE/AR/EN, facts only |
| Hooks | `runViralDeskJob("hooks", body)` | Flash | Short openers |
| Hook / retention predictor | `runViralDeskJob("predict", body)` | Pro | `{ kind: "gemini_pro_estimate", notLiveMetrics: true }` — **not** live views/CTR/ROAS |
| Video rewrite | `runViralDeskJob("rewrite", { …, script })` | Pro | |
| Imagen carousel | `runViralDeskJob("carousel", { …, slides: 5 })` | Imagen 3 | Real bytes; no empty SVG |
| 30-day calendar | `runViralDeskJob("calendar30", body)` | Pro | Planning only |
| Trends | `runViralDeskJob("trends", body)` | Pro + `completeGemini({ grounding: true })` | Search Grounding; cite URLs; no invented views |
| Brand voice | `saveBrandVoice` / `loadBrandVoice` | store | In-memory now. Next PR: Firestore collection `brand_voices` via `setBrandVoiceStore` |

`completeGemini({ grounding: true })` sends Vertex `tools: [{ googleSearch: {} }]`. Use it only for trends.

**Forbidden in the viral-desk UI:** fake ROAS, invented likes/views/watch-time, live Meta/TikTok/YouTube API numbers. Predictor scores stay labeled as Gemini Pro estimates.
