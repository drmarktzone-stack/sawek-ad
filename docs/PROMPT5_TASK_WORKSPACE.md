# SAWEK AD — Prompt 5 FINAL REPORT

**Repo:** `drmarktzone-stack/sawek-ad` only.  
**Live (pre-this-revision):** `https://sawek-ad-308665814452.me-west1.run.app`  
**Constraint:** no fork, no new app, no feature/content/language/integration removal.

This revision is **not** claimed live on Cloud Run until a human deploys it.

---

## 1. Root cause per problem

### Problem 1 — Marketing Task stays on the long home page

After URL scan confirm (`UrlIngest.confirm` → `applyIntakeToDraft`), the user remained on `/`. Home is a long marketing page (hero, function rail, stats, how-to, vs, pricing) with `WizardFlow` buried at `#studio`. Create Ad (`startBuild` → HITL) also executed on that same scroll. There was no dedicated task route. Context existed in the draft, but the **execution surface was the homepage**, so the user had to scroll forever to reach the ad tool.

### Problem 2 — Generator repeating itself (Day1/Day2/Day3)

Prompt 4 added families, fingerprints, and scoring, but **novelty was a label, not a gate**:

- `pickWinner` always took the highest total score. Novelty was only 12% of the score, so the same family could win every time.
- `exclude.families` reordered candidates; `pickWinner` ignored order.
- `noveltyAgainst` allowed the same family twice before “saturated”.
- `familyCopy` reused the same CTA (`spokenCta`) and often the same idea (`ideas[0]`).
- **Posting calendar Day 1 and Day 2 both used `piece(strong)` and `ideaIndex: 0`** — same headline and same CMO idea with a channel change. That is the Day1→A, Day2→A root cause.
- Gemini temperature 0.4 and no reject-before-show path.

A bigger prompt would not have fixed ranking, calendar wiring, or the missing novelty gate.

### Problem 3 — Google / YouTube Suggestions empty

- There was **no Google search-suggest fetch**. `google_ads_transparency` is explore-URL + grounding only (no examples).
- YouTube used `suggestqueries.google.com`. Hebrew-only queries were stripped to ASCII, then replaced with a hardcoded **`mediterranean restaurant advertising`** fallback — wrong business, and often empty.
- Blocked/empty states had no Retry, no alternate public URLs, and no query provenance.
- Query was `niche + category + offer + name`, not audience / market / objective.

### Problem 4 — Text over text on images

`AdVisual` always overlaid headline + CTA on photos with a dark gradient. No detection of existing text, logo, watermark, or UI. Scanned website photos (https assets from ingest) routinely already contain type. Live preview also printed the headline **on** the image **and** under it.

---

## 2. Files / components changed

**New**

- `app/task/ad/page.tsx` — dedicated Create Ad task route
- `components/task-workspace.tsx` — business understanding → detected task → one-click complete ad → result / research / next steps
- `lib/engine/task-context.ts` — scoped context (business key, history, facts)
- `lib/engine/ad-engine/diversity.ts` — Creative Diversity Engine + novelty gate
- `lib/engine/image-composition.ts` — text/logo band analysis + composition modes
- `lib/engine/search-suggest.ts` — query builder + suggest parse (no invented volumes)
- `scripts/check-prompt5.ts`
- `docs/PROMPT5_TASK_WORKSPACE.md` (this file)

**Updated (existing engines / UI)**

- `lib/engine/ad-engine/{candidates,complete-ad,fingerprint,index}.ts`
- `lib/engine/ad-research.ts`, `lib/engine/research-public.ts`
- `lib/engine/posting-calendar.ts` (Day1/2/3 distinct sources)
- `lib/scientist/market-engines.ts` (`google_suggest` = search_suggestion)
- `lib/types.ts`, `lib/i18n.ts`
- `components/{wizard-flow,url-ingest,ad-mockup,research-desk,result-view,header,function-rail}.tsx`
- `app/sitemap.ts`, `package.json`
- QA: `scripts/check-ad-engine.ts`, `check-ad-research.ts`, `check-vertex-stack.ts`

Unchanged on purpose: HITL five agents, six variants, CMO platforms, 7-day week + Pro 30-day, three demos, SawekSelfAD `/self`, Bit/bank, PayPal off, `/campaigns/[id]` result view, department routes.

---

## 3. Architecture changes

```
Website scan (header, any page)
  → ingest review (Business Truth A)
  → applyIntakeToDraft (this business only)
  → /task/ad  Task Workspace
       Business understanding (A)
       Campaign context (B)
       Marketing task detected: Create Ad
       Creative history C for THIS business key + owner
       Market D / AI E labeled, never facts
       One-click Complete Ad (F) after Novelty Gate + fact gate + image composition
Dashboard / home remain navigation. Home wizard still exists (zero regression);
Create Ad / scan now **execute** in the task workspace.
```

**Diversity:** `selectStrategicDirections` ranks families from intake + Market notes + unused history (problem / outcome / story / offer-led / educational / … + discovered). `noveltyGate` **rejects** high Jaccard / same-family consecutive / fingerprint collision **before** the package is shown. Exhausted directions → `noveltyStatus: unknown` + honest reason — no blind recycle of Day 1.

**Search:** `buildSearchQueries(business, industry, product, audience, market, objective)` → Google + YouTube suggest. Failures are `UNKNOWN` + reason + public alternate URLs + Retry.

**Images:** analyze → detect text/logo hints → `overlay_safe` | `safe_zone_*` | `separate_headline` | `image_only`. Collision → reject overlay. Original type is never deleted.

---

## 4. Tests executed

| Script | What |
|---|---|
| `npm run check:prompt5` | Tests 1–10 (diversity, days, 30%, A vs B, images, queries, HE/AR/EN, workspace, one-click) |
| `npm run check:ad-engine` | Prompt 4 contracts + 5 unique families + Day1/2/3 |
| `npm run check:ad-research` | 7 sources including `google_suggest` |
| `npm run check:orchestrator` | Clinic hero `street_trust`, no restaurant leak |
| `npm run check:market-intel` | Market DNA / NBE / YouTube suggest kind |
| `npm run check:scientist` | DNA evidence-only |
| `npm run check:empty-campaign` | Empty wipe |
| `npm run check:product-path` | Thin scan / café |
| `npm run check:cmo-product` | Clinic + olive catalogs |
| `npm run check:url-ingest` | Scan fields / SSRF |
| `npm run check:vertex-stack` | Grounding + google_suggest string |

---

## 5. Test results

| # | Scenario | Result |
|---|---|---|
| 1 | Same bakery, 5 consecutive Complete Ads | **PASS** — `problem_led, authority, story, educational, emotional` |
| 2 | Day1/2/3 no recycle | **PASS** — distinct headlines + distinct idea names |
| 3 | Fake 30% + competitor “לחם הזהב” | **PASS** — not in complete ad |
| 4 | Business A clinic vs B café | **PASS** — zero fact leak; distinct workspace keys |
| 5 | Image with text band | **PASS** — `separate_headline`, overlay rejected |
| 6 | Clean image / logo | **PASS** — clean `overlay_safe`; logo never overlay |
| 7 | Google/YouTube query | **PASS (code)** — queries from bakery facts; parser drops fake metrics; no restaurant fallback. Live suggest HTTP from Cloud Run: **UNKNOWN until probed** |
| 8 | HE / AR / EN | **PASS** |
| 9 | Mobile 390px | Exercised in browser QA on `/task/ad` (see artifacts) |
| 10 | Existing workflows | **PASS** — orchestrator / empty campaign / CMO / ingest / scientist |

---

## 6. Screens / routes changed

| Route | Role |
|---|---|
| **`/task/ad` (new)** | Dedicated Create Ad workspace |
| `/` | Unchanged marketing home + wizard (still works). Scan/build now **navigate** to `/task/ad` |
| `/dashboard` | Unchanged navigation/home for saved work |
| `/campaigns/[id]` | Unchanged full result pack |
| Header | Scan still global; added Task workspace nav link |
| Function rail | Marketing extra link → `/task/ad` |

---

## 7. Google / YouTube source status

| Source | What the code does | Honest status |
|---|---|---|
| **Google search suggest** (`google_suggest`) | Official-adjacent autocomplete JSON (`suggestqueries.google.com` / `clients1.google.com`, `client=firefox`). Rows stored as **search suggestions**, not ads, not volumes | Working when the endpoint returns JSON. If blocked/empty: `UNKNOWN` + reason + Google Search / Trends URLs + Retry |
| **YouTube search suggest** (`youtube_suggest`) | Same family with `ds=yt`. Multiple fact-based queries (never restaurant fallback) | Same as Google. Prior empty root cause (ASCII wipe → generic restaurant query) **removed** |
| Google Ads Transparency | Unchanged: explore URL + grounding. Not a suggest API | `grounded` / explore-only |
| Invented CPC / volume / “trending #1” | Forbidden | Never stored |

---

## 8. Image text detection status

| Layer | Status |
|---|---|
| Asset heuristics (logo label, scan https photo, SVG/graphic) | **Shipped** |
| Pixel band edge-density (top / middle / bottom + corners) | **Shipped** (used in QA buffers; client uses heuristics + optional decision on the pack) |
| Full OCR / Gemini Vision on every poster | **Not required** — Vision API already exists (`/api/vision`) but is not a blocker; we do not invent detections |
| Overlay collision | **Reject / recompose** to Option A (`image_only`) or B (`separate_headline`) or C (safe zone) |
| Delete/cover original type | **Never**, unless the user explicitly asks to edit the image (`userAskedToEditImage`) |

---

## 9. Creative diversity status

| Piece | Status |
|---|---|
| Strategic directions from DNA / audience / objective / market / unused history | **Shipped** (`selectStrategicDirections`) |
| Families include story + offer-led (plus existing 15) | **Shipped** |
| Novelty gate before show | **Shipped** |
| Consecutive same family blocked | **Shipped** |
| Exhausted → UNKNOWN + ask for new fact, no Day1 recycle | **Shipped** |
| Calendar Day1/2/3 distinct variant + idea | **Shipped** |
| Vertex still overlay-only when up | Unchanged |

---

## 10. Remaining limitations

- Unofficial Google/YouTube suggest endpoints may be **blocked from some Cloud Run egress**. UI then shows UNKNOWN + public search URLs + Retry — not blank fake rows.
- Pixel OCR is heuristic, not a commercial text detector. Scan photos default to **no overlay** until a clean band is proven.
- Consecutive Complete Ads rotate **strategy family**. They still share verified Business Truth (name, place) — that is required, not contamination.
- Hosted Cloud Run revision is **UNKNOWN** until this PR is deployed.
- Two-account fingerprint isolation on live Supabase is **UNKNOWN** (code is owner-scoped).

---

## 11. Production readiness

**78 / 100 — PARTIAL, ready to deploy with honest gaps**

- **PASS in this VM:** diversity, isolation, calendar days, image composition unit tests, research source wiring, task route, HE/AR/EN, existing engine contracts.
- **Not claimed:** live suggest JSON on the current Cloud Run host; Vision-grade OCR; post-deploy human click-through on production.

Do not treat production as PASS until this revision is deployed and a human confirms `/task/ad` after a real scan.
