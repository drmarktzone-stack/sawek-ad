# SAWEK AD — Verde Clear rebuild

**Repo:** `drmarktzone-stack/sawek-ad`  
**Base:** `main` @ PR #27 (single-page required intake + Palestinian dialect + copy quality gate)  
**Constraint:** presentation + journey + orchestration hardening. No Business Truth contamination. No fake ROAS. Clinic demo only via Demo. Existing APIs kept.

This revision is **not** claimed live on Cloud Run until a human deploys it.

---

## What changed

Desk Noir (ink chrome + ivory paper) is gone. The product is now **Verde Clear**: soft mint / pale sage ground, white cards, deep forest ink, lime CTAs — the Prada / Super-Pharm luxury-ad mood.

| Layer | Before | After |
| --- | --- | --- |
| Tokens | `#08111F` chrome, ivory canvas, teal-only accent | mint `#E6F0E4`, white surfaces, forest `#154734`, lime `#C8E04A` |
| Header / dock / footer / scan | Dark navy slabs | Light glass / white / mint |
| Home | Dark hero + tool salad | Calm Command Center + human journey rail |
| Create Complete Ad | Dark task slab + text wall | Light hero action + agency-grade package (hook / copy / lime CTA / visual first; why collapsed) |
| Journey | Campaign → Offer → Ads → Content → Track | Scan → Truth → Message → Offer → Complete ad → Visual → Variants → Export |

Non-negotiables preserved:

- Scan-truth isolation (chrome does not write Business Truth)
- Copy quality gate + Palestinian `ar` dialect lock
- Single-page required intake with red empties
- Clinic demo only via Demo click
- No invented ROAS / metrics
- Working APIs restyled, not deleted

## GCP $300 pack — live wiring

Documented in `docs/VERTEX_STACK.md`. Create Complete Ad now runs **one** orchestration path:

```
intake facts
  → CampaignBrief (campaign-brief + campaign-orchestrator)
  → copy quality gate + dialect lock
  → Gemini 2.5 Pro  (strategy / complete ad / diagnosis / calendars / scripts + Search Grounding)
  → Gemini 2.5 Flash (channel pieces / HSO / short variants)
  → Imagen 3         (still persisted as data URL + /api/imagen/:id on the complete-ad package)
  → Cloud Translation HE↔AR↔EN
  → public ad intel (Meta Ad Library / TikTok Creative Center / Google Transparency) as strategy patterns only
```

Create Complete Ad (`overlayPackAgency`) now fires the $300 pack in one path:

- Gemini 2.5 Pro (`/api/generate/pro-desk`, Search Grounding)
- Gemini 2.5 Flash (`overlayAgencyPieces` + `/api/generate/variations` persisted on `flashVariations`)
- Imagen 3 (`/api/imagen` → `completeAd.visualSrc`)
- Cloud Translation (`/api/translate` fills weak HE/AR/EN slots; does **not** overwrite good Palestinian copy)
- Public ad intel (`/api/research`) as strategy only

Honest `completeAd.metadata.gcp` badges show which services actually returned. Templates stay intake-driven when a Google API is down. This Cloud Agent VM has **no ADC** — local overlay will record templates. Cloud Run `/api/gemini-status` reports `hasAdc: true`.

Live Cloud Run probes (2026-09-09, **before** this PR is deployed):

- Flash `/api/generate/variations` — fired (`gemini-3.5-flash`, 8 Meshhdawi variants, facts only)
- Pro desk `/api/generate/pro-desk` — fired via AI Studio fallback (`gemini-3.1-flash-lite`, `grounded: false`), not Vertex Pro
- Cloud Translation — `vertex_denied` (enable the API / grant `roles/cloudtranslate.user` on the Cloud Run SA)
- Imagen — was `plan_required` from `proxy.ts`. That paywall is removed here so one still can fire after deploy. Rate limits stay.

No empty SVG counted as success.

## Human flow

```
SCAN (/)
  → UNDERSTAND / Truth (/#studio + /task/ad summary)
  → CORE MESSAGE (/tools/core-message)
  → OFFER (/tools/offer)
  → CREATE COMPLETE AD / HSO (/task/ad · /tools/hso)
  → VISUAL Imagen (/studio + complete-ad still)
  → VARIANTS Flash (/tools/hso · studio)
  → EXPORT (/campaigns)
```

Single-page required facts stay on one surface (red while empty). After facts: **Offer → Create** is the hero path (header, dock, home CTA).

## Screens / locales

Verified locally on `next dev` (see test results below):

| Viewport | Locale | Expectation |
| --- | --- | --- |
| ~1440 desktop | AR RTL (Palestinian) | Light mint Command Center, journey rail RTL |
| 390 mobile | AR RTL | Light dock + lime CTA; no horizontal overflow |
| 390 mobile | HE RTL | Same chrome, Hebrew copy |
| ~1440 desktop | EN LTR | Layout mirrors LTR |

Required screenshots for the PR: home AR, intake red fields, complete-ad result.

## Tests

```
npx tsx scripts/check-copy-quality.ts
npx tsx scripts/check-wizard-intake.ts
npx tsx scripts/check-ad-engine.ts
npx tsx scripts/check-prompt5.ts
npx tsx scripts/check-clinic-isolation.ts
npx tsx scripts/check-sprint1-tools.ts
npx tsx scripts/check-vertex-stack.ts
npx tsx scripts/check-orchestrator.ts
```

**Automated (PASS on this revision):**
`check-copy-quality`, `check-wizard-intake`, `check-ad-engine`, `check-prompt5`, `check-clinic-isolation`, `check-sprint1-tools`, `check-vertex-stack`, `check-orchestrator`, `check-scan-truth`.

## Not in this PR

- Cloud Run deploy (human)
- SawekSelfAD
- OmniAd / AdBrain / OptiBrain source repos
- Fake live Meta/TikTok metrics
