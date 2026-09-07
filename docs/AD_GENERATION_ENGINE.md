# SAWEK AD — Ad Generation Engine

**Repo:** `drmarktzone-stack/sawek-ad` only.  
**Live (pre-this-revision):** `https://sawek-ad-308665814452.me-west1.run.app`  
**Constraint:** no rebuild/fork; no feature/content/campaign/history/language removal; SawekSelfAD untouched.

This document is the Phase 1 root-cause audit **and** the Phase 2–17 implementation + FINAL REPORT.

---

## 1. ROOT CAUSE

The Create Ad path (`cta.build` → `WizardFlow.startBuild` → `runAgents` → `assemblePack` / `orchestrateAssemble` → HITL `advanceHitl` → `runStrategic` + `overlayPackAgency` → result) did **not** have a single factual source of truth. Several pipes each treated “whatever text is nearby” as customer facts.

### Production path (traced)

1. **Create Ad click** — `components/wizard-flow.tsx` `startBuild` / `runAgents`. Draft may already be a leftover business (`loadDraft` merges previous intake).
2. **Campaign / business context** — current `Intake` (wizard + optional URL/document ingest).
3. **Business DNA** — `lib/scientist/engines.ts` `extractDna` / `ingestPack` after save or optimizer. Prior DNA traits were merged unconditionally, including inferences. Voice could be taken from `brief.coreMessage` (generated). `getWorkspaceByBusiness` fell through from customer storage into **demo** storage.
4. **Retrieved data** — intake fields + `pastCreatives` / `pastAds` from URL/Facebook ingest (`lib/url-ingest.ts`, `lib/document-ingest.ts`) + optional Supabase campaigns (owner-filtered after Phase 2).
5. **Previous campaigns / creatives** — stored on the same intake and then reused as:
   - social-proof “facts” (`hasSocialProofFacts` scanned `pastAds` + `pastCreatives`)
   - agency factory pieces (`buildAgency` copies past creative text into `pieces`)
   - Gemini-adjacent blobs if a caller stuffed `pastAds` into `facts`
6. **Market Intelligence** — `fetchResearch` / `fetchProDesk` (`lib/engine/run.ts`) concatenated **brief.coreMessage + heroIdeaId + intake** into one “facts” string. Research notes were attached beside CMO ideas (`applyResearchToPack`). Strategy models could treat competitor library copy as if it were this business.
7. **Prompts / context assembly** — `buildUserMessage` / `factsBlockFromBody` / `payloadFromIntake` / `factsFromIntake`. Layers were unlabeled. `description` could be appended onto existing description (`factsToIntake`), accumulating previous generation text.
8. **AI** — Vertex Pro/Flash via `/api/generate`, `/api/generate/pro-desk`, `/api/research`. Temperature 0.4. No novelty avoid-list. Failures already fell back to spoken templates (kept).
9. **Validation** — `inventsForbidden` (money/VIP/ROAS/CAC only). No gate for inherited discounts, testimonials, competitor offers, or previous-ad tokens. No regenerate-on-fail for a complete package.
10. **Result** — six spoken variants + CMO hero. Same `pickIdeas` ranking every time (`hashSalt(id + businessName)` only).
11. **Persistence** — pack → localStorage `omniad-campaigns` + optional `/api/campaigns` (owner). Scientist DNA updated from the pack. Generated copy could sit next to “know” traits.

### Exact mixing points

| Surface | What mixed | Layer violation |
|---|---|---|
| `pickIdeas` | Same 3–5 platforms every generation for a name+vertical | Novelty / repeats |
| `ideasForBrief` / `cmoPackFromBrief` | Existing idea ids reused on sync (correct) but new packs never rotated | Repeats |
| `hasSocialProofFacts` | Past ads treated as current testimonials | C → A |
| `factsFromIntake` (run.ts) | Generated `coreMessage` sent to Pro/research as a fact | F/E → A |
| `factsToIntake` | `pastAds` copied into intake used for copy | C → A |
| `buildUserMessage` | Unlabeled description + audience + facts | A/B/D mixed |
| `extractDna` | `brief.coreMessage`; prior traits of any kind | F/E → A |
| `getWorkspaceByBusiness` | Demo DNA fallback for customers | Demo → customer truth |
| `overlayCoachHeadline` | Coach proposals into headlines when problem unknown | E → A (partial; already guarded) |
| Agency `past_creative` pieces | Old ad text in the factory (labeled, but adjacent to live pieces) | C next to F |
| Draft `loadDraft` | Previous business fields if New Campaign was not clicked | Stale state |
| `canonicalDoctorName` | Clinic names rewritten toward demo doctor | Demo → customer (existing, unchanged) |
| Research notes on `cmoIdeas` | Market copy beside selected angles | D next to A (notes only; now not a fact source) |

This is why generations **repeated the same idea**, **inherited a previous ad’s discount/testimonial**, and **could treat Market Intelligence as Business Truth**. A bigger prompt alone would not have fixed retrieval, DNA merge, or deterministic idea ranking.

---

## 2. ARCHITECTURE

```
Create Ad
  → Intake (A) + Campaign context (B)
  → load creative fingerprints for THIS owner + business only (C)
  → pickIdeas(exclude used ids) + CampaignBrief
  → spoken variants / agency / CMO (existing engines, preserved)
  → Internal candidates (15 families) scored in code
  → Validation gate (strip / next candidate)
  → CompleteAdPackage (F) attached to CampaignPack
  → record fingerprint (C) — never DNA
  → HITL overlay (Gemini) uses labeled A/B/D; safeText drops invented claims
  → syncPackEngines refreshes complete ad without rotating the hero
```

Deterministic code owns: source split, claim detection, fingerprints, scoring, isolation, metrics, validation.  
AI owns: language/creative overlay when Vertex is up. Templates always work.

No extra Vertex fan-out (no 15 model calls). Cache of Gemini channel overlays unchanged.

---

## 3. SOURCE SEPARATION

| Layer | Module | May influence |
|---|---|---|
| **A Business Truth** | `buildBusinessTruth` / intake user fields + `pastResults` | Copy, offer, proof, DNA `know` |
| **B Campaign Context** | type, depth, goal, vertical, named competitors | Angle choice, media plan |
| **C Creative History** | fingerprints + raw past ads (structure only) | Novelty / exclusion — **never facts** |
| **D Market Intelligence** | research notes, competitor observations | Strategy families `market_gap` / `discovered` only, and only with a citation |
| **E AI Insights** | diagnosis hypotheses, brief core message | Labeled `think` / INFERENCE |
| **F Generated Content** | `completeAd`, variants | Shown to the user; **never written to DNA/intake** |

`buildUserMessage` and `factsFromIntake` now label layers. `factsToIntake` no longer copies `pastAds`.

---

## 4. NOVELTY

`lib/engine/ad-engine/fingerprint.ts` hashes angle / hook / problem / promise / offer / proof / trigger / framing / CTA / structure / visual / format / family.

`pickIdeas(..., { excludeIds })` skips saturated idea ids when a later generation of the **same** business runs.

Internal candidates cover: problem-led, transformation, proof, educational, authority, objection, comparison, demo, contrarian, emotional, social-proof, curiosity, reframing, market-gap, discovered.

Scores (0–100): relevance, objective, audience, evidence, novelty, clarity, persuasion, platform, factual safety, saturation, market opportunity. Highest safe candidate wins. The user is not asked to pick from 10.

Demos do **not** record fingerprints (published packs stay stable).

---

## 5. ONE-CLICK

On `assemblePack` / first Create Ad click the pack already contains `completeAd`:

strategic concept, why, audience, angle, hook, headline, copy, offer/proof **only if verified**, CTA, visual, format, platform, language (HE+AR+EN), optional image prompt, compliance/fact status, novelty status, expandable metadata.

HITL 5-agent UI is **kept**. The complete ad is visible on the diagnosis desk and on the result page — not a step-by-step assembly of 10 cards.

Existing six variants, CMO strip, calendar, viral, research, departments: unchanged deliverables.

---

## 6. VALIDATION

`runValidationGate` (deterministic):

- invented price / discount / guarantee / stat / testimonial / cert / scarcity / deadline / performance
- tokens that exist in previous ads or competitor notes but **not** in Business Truth
- named competitor offers
- vertical leak (`contradictsVertical`)
- HE/AR script presence
- completeness (headline, copy, CTA, concept, hook)
- market used without evidence

Fail → strip or next candidate (up to 4 attempts). Failed output is not the featured complete ad (`validation.passed` + repair). Gemini `safeText` also drops invented commercial claims.

---

## 7. MEMORY

`sawek-creative-history` (local) + in-process store for Node QA.

Scoped by `businessId` + optional `ownerId` / `clientId`. Demo records never written. Cross-business and cross-owner reads are rejected.

Fingerprints are **GENERATED CREATIVE HISTORY**. `extractDna` no longer reads `brief.coreMessage`. Prior DNA merge keeps only `know` + `user_input` / `observed_metric` for the **same** `businessId`. `ingestPack` does not fall back to demo workspaces.

---

## 8. MARKET INTELLIGENCE

Research still runs once and attaches notes (`attachResearchAndSync` still must not change the hero id — existing orchestrator contract).

Notes may boost `market_gap` / `discovered` scores **only when notes exist**. Competitor prices/discounts are scanned as foreign tokens and stripped if they appear in copy. No auto-injection of competitor offers into customer facts. No invented credentials, medical claims, or stats.

Performance: still observed/calculated from **entered** numbers only (`scientist` engines). Missing → UNKNOWN. No fake significance.

---

## 9. TEST RESULTS

Automated in this VM (`npm run check:ad-engine` plus existing engine scripts):

| Scenario | Expected | Status |
|---|---|---|
| 5 consecutive generations, same bakery | ≥3 distinct families/hashes | **PASS** — families `authority, emotional, problem_led, contrarian, curiosity`; 5 distinct hashes |
| Fake 50% + “דנה אמרה” in previous ads | Not in complete ad; not social-proof facts | **PASS** |
| Competitor “לחם הזהב / 30%” | Not inherited | **PASS** |
| Missing price/offer/proof | Not invented | **PASS** |
| Cross-business clinic vs café | Zero fact leak | **PASS** |
| HE / AR / EN | Scripts present on complete ad | **PASS** |
| Empty intake | No invented complete ad | **PASS** |
| Partial intake | Ad without invented offer/proof | **PASS** |
| Validation fail | Repair / reject invented discount | **PASS** (`gateRepaired: true`, `gateOk: false` while 50% remains unrepaired in the raw candidate — winner path strips/rejects) |
| Generated → DNA | Discount/testimonial not `know` | **PASS** |
| Prompt layers | A/C/D labeled; no `pastAds:` facts | **PASS** |
| Orchestrator clinic hero `street_trust` + no restaurant leak | Unchanged contract | **PASS** (`check:orchestrator`) |
| Scientist evidence-only DNA | Unchanged contract | **PASS** (`check:scientist`) |
| Empty campaign wipe | Unchanged contract | **PASS** (`check:empty-campaign`) |
| Pedi-Guide / product / research / vertical / vertex stack | No copy regression | **PASS** |

`check:baqa-ar` still fails on **pre-existing** `DEMO_LABEL.ar` (“عرض — حملة جاهزة” does not include `أبو مخ`). This revision did not touch `lib/demo.ts`.

Manual / environment-limited:

| Scenario | Status |
|---|---|
| Mobile ~390 + desktop result page | PENDING browser pass on this branch |
| Vertex / research / performance down | **PASS (code)** — complete ad is template-scored; Gemini overlay no-ops |
| Live Cloud Run revision after deploy | **UNKNOWN** — this PR is not that revision |
| Signed-in two-account isolation of fingerprints | **PASS (code)** — `ownerId` scope; live two-account **UNKNOWN** |
| RTL chrome HE/AR | **PASS (code)** — complete ad `dir` follows pack language; chrome already RTL |

---

## 10. REGRESSIONS

Intentionally unchanged:

- HITL five agents, six variants, CMO platforms, 7-day week, Pro 30-day calendar
- Three published demos; demo fingerprints not recorded
- SawekSelfAD / `/self`
- Bit/bank, PayPal off, no live ad buying, no fake ROAS
- Owner-scoped `/api/campaigns*`
- `attachResearchAndSync` must not change hero id

Risks watched in QA: `check:orchestrator`, `check:scientist`, `check:empty-campaign`, `check:pedi-copy`, `check:cmo-product`, `check:ad-engine`.

---

## 11. PRODUCTION STATUS

**PARTIAL**

- **PASS (this VM, automated):** source split, novelty across 5 generations, no previous-ad / competitor inheritance, no invented offer/proof, cross-business isolation, HE/AR/EN scripts, empty/partial, validation repair, DNA not overwritten, existing orchestrator/scientist/empty-campaign/product paths.
- **NOT claimed:** live Cloud Run revision (not deployed from this PR), two-account fingerprint isolation on hosted Supabase, Vertex-on-production overlay of the complete ad.
- **Browser UI** of the one-click card is verified on the local app in this session when the walkthrough exists below; otherwise treat UI as code-complete only.

Do not treat production as PASS until a human or agent confirms the deployed revision.

---

## Files (this revision)

- `lib/engine/ad-engine/*` — sources, facts, fingerprint, memory, candidates, validate, complete-ad
- Wired: `campaign-orchestrator`, `campaign-brief`, `cmo-ideas`, `run`, `gemini-generate`, `gemini-enrich`, `angles`, scientist DNA/store
- UI: `components/complete-ad-card.tsx`, result view, wizard HITL preview
- QA: `scripts/check-ad-engine.ts` (`npm run check:ad-engine`)
