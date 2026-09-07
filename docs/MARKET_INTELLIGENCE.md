# SAWEK AD — Market Intelligence FINAL REPORT

Scope: this repo only (`drmarktzone-stack/sawek-ad`). Extends Phase 2 Growth Scientist (`/growth`, Business DNA, experiments, learning, NBA). Live host at time of writing: `https://sawek-ad-308665814452.me-west1.run.app`. SawekSelfAD was not opened. This revision is **not** claimed live on Cloud Run until a human deploys it.

---

## 1. What was implemented

An integrated **Market Intelligence & Creative Discovery** layer on the existing scientist loop — not a second app and not a parallel workspace.

Loop now implemented in code:

`BUSINESS DNA + MARKET DNA + HISTORICAL RESULTS → OPPORTUNITIES → HYPOTHESES → EXPERIMENTS → LEARNING → NEXT BEST ACTION / NEXT BEST EXPERIMENT`

Shipped in this PR:

| Piece | Where |
|---|---|
| Market entities (source, scan, ad/creative, pattern, signal, Market DNA, competitor insight, opportunity, recommended experiment) | `lib/scientist/market-types.ts` inside `GrowthWorkspace.market` |
| Official/public source adapters | Reuses `runMarketResearch` (`lib/engine/ad-research.ts`) + Google Trends explore URL |
| Claim labels `OBSERVED FACT \| INFERENCE \| ESTIMATE \| UNKNOWN` | Every external row |
| Creative structure + pattern clustering | `lib/scientist/market-patterns.ts` (deterministic; no copying ads) |
| Persistent evolving Market DNA | Merged across scans; kept through `applyLearning` / pack re-ingest |
| Competitor gap vs Business DNA vs experiment history | `competitorInsightsFromDna` |
| Opportunity + Next Best Experiment | Ranked by evidence count / untested / category match — **not** an AI win score |
| Turn NBE into existing experiment | `adoptMarketExperiment` → `recordExperiment` |
| Scan Now + Watch This Market | `/growth` + `/growth/market` controls (region / language / industry / objective / lookback / competitor category) |
| Auto-scan | After `/growth` boot when business context exists and last scan is older than 6 hours, or Market Watch is due |
| Optional Cloud Scheduler tick | `POST /api/scientist/market/cron` (Bearer `MARKET_WATCH_SECRET`) |
| Cost controls | Shared `/api/research` rate bucket, 10-minute research cache, 30-minute scan identity, no extra Gemini call beyond existing grounded research, no BigQuery/Pub/Sub/embeddings |
| UX | Decision cards: happening / observed competitors / repeating patterns / what's new / relevant-untested / what to test next. HE / AR / EN, RTL, mobile rail |
| Tests | `npm run check:market-intel` + existing `check:scientist` |

Not implemented (and not claimed): live ad buying, invented ROAS, login-wall ingest, a hosted Cloud Scheduler job (env secret optional), vector search, multimodal vision on login-walled snapshots.

---

## 2. Which market sources are actually working

Probed from this Cloud Agent VM on 2026-09-08. Hosted Cloud Run revision behavior is **UNKNOWN** until this PR is deployed.

| Source | What the code does | Observed from this VM | Status we store |
|---|---|---|---|
| **YouTube search suggest** | Official public suggest endpoint | HTTP 200, JSON suggestions | `ok` + `OBSERVED_FACT` as **search suggestions**, not ads |
| **Meta Ad Library (Graph `ads_archive`)** | Official API **only if** `META_ADS_LIBRARY_TOKEN` is set | Token **unset** here. Untokened call → OAuthException | `no_token` + public explore URL. Rows become `OBSERVED_FACT` only when the API returns them |
| **TikTok Creative Center** | Official page URLs (`period` 7 or 30). Unofficial radar is attempted then discarded | Radar HTTP 200 body `code:40101 no permission` | `blocked` / unavailable. **No invented views** |
| **Google Ads Transparency** | Official explore URL + Search Grounding only. **No HTML scrape** | HTML 200 (2.5MB). Not parsed | `grounded` if Gemini cites it, else explore-only |
| **Pinterest Trends** | Official explore URL + grounding. No paid seat | Not independently scraped | `empty` / `grounded` |
| **LinkedIn Ad Library** | Official explore URL. Usually login-walled | Not fetched as JSON | `blocked` unless grounding cites a public URL |
| **Gemini Search Grounding** | Existing Vertex `completeGemini({ grounding: true })` inside `runMarketResearch` | ADC / project **unset in this shell**. Live Vertex on hosted Run: **UNKNOWN** | `grounded` or `empty`. Notes labeled **ESTIMATE** |
| **Google Trends** | Official explore URL only | Not scraped | `grounded` or `unavailable` |

**Live `POST /api/scientist/market` from this VM (fictional Nazareth clinic, no Meta token, no ADC in shell):**

| platform | status |
|---|---|
| youtube_suggest | `ok` (later UI scan with a different query: `empty`) |
| google_ads_transparency | `grounded` (explore + label; no HTML scrape) |
| pinterest_trends | `grounded` (explore + label) |
| meta_ad_library | `no_token` |
| tiktok_creative_center | `blocked` |
| linkedin_ad_library | `blocked` |
| gemini_search_grounding | `empty` (no Vertex citations this pass) |
| google_trends | `unavailable` |

That scan stored 8 YouTube suggestion rows, **0** public-ad patterns, NBE **UNKNOWN**. No invented advertisers.

**Working without extra secrets from this VM:** YouTube suggest (when the suggest endpoint returns rows).  
**Working when Cloud Run already has Vertex ADC (same $300 pack as Phase 2):** Search Grounding — **UNKNOWN on hosted Run**; **empty** in this shell.  
**Working only with `META_ADS_LIBRARY_TOKEN`:** Meta `ads_archive`.  
**Not working as a live feed:** TikTok CC API, LinkedIn library, Google Transparency as an API.

---

## 3. What evidence is being collected

For every kept row:

- `source` / `platform` / `url` / `advertiser` (only if the source supplied it) / `region` / `language` / `category` / `objective` / `dates.asOf` / `extractedAt`
- `kind`: `public_ad` | `search_suggestion` | `grounded_note`
- `claim`: OBSERVED_FACT (official API or YouTube suggest text) · ESTIMATE (grounded notes) · INFERENCE (pattern clusters) · UNKNOWN (missing)
- `performance[]` stays **empty** unless a source actually provided an indicator. This VM never saw a source-provided metric, so performance is **UNKNOWN**
- Creative structure when text exists: hook / problem / desire / promise / angle / offer / proof / CTA / format (`format` is UNKNOWN unless stated)
- Source card: status + honest reason + explore URL
- Scan metadata: controls, cached/incremental flags, `insufficient_context` when identity/industry/region are missing

Duplicates collapse on a fingerprint of platform + advertiser + URL (query-string stripped) + title. Fake-metric strings (`ROAS:`, `million views`, “performed extremely well”) are dropped.

---

## 4. What Market DNA is now stored

`GrowthWorkspace.market.dna` (evolves; last 10 scans, last 80 ads):

- Controls snapshot: region, language, industry, objective
- Traits with labels: region / industry / language / objective / advertisers / repeating patterns / responding sources / unavailable sources
- `advertiserNames` — union of **observed** public-ad advertisers only
- `patternIds` + clustered patterns (`appears repeatedly across X examples`)
- `sourceStatuses`
- `lastScanId` / `updatedAt`

Legacy workspaces without `market` are normalized via `ensureMarket()`. Payload is the source of truth (`scientist_workspaces` or `feature_type=scientist` blob). Optional `scientist_entities.kind` names are documented in `scripts/supabase-scientist.sql`; no new required table.

---

## 5. How Market Intelligence connects to Business DNA

| Business DNA (existing) | Market DNA (new) | Combined |
|---|---|---|
| Intake identity, offer, audience, advantage | Observed advertisers, repeating patterns, source health | Competitor insights: `businessHas` / `marketHas` / `historicallyTested` |
| User-typed competitors | Public ads with an advertiser field | Named overlap is recorded; new public names are **not** silently added as user competitors |
| Experiment names / hypothesis text | Pattern slugs | If an experiment already contains `problem-first` (etc.), the insight is marked tested |
| Knowledge board | `market.*` facts / inferences / unknowns | Same three columns |
| NBA | Next Best Experiment | `computeNba` prefers a running experiment, then an untested NBE, then the old radar |

`applyLearning` keeps Market DNA across campaign re-ingest and re-attaches market opportunities.

---

## 6. How recommendations connect to experiments

1. Insights that are **in market, not in Business DNA, not historically tested** become opportunities.
2. Those become `recommendedExperiments` + `nextBestExperiment` (primary market output).
3. UI **הפוך לניסוי ב-SAWEK** calls `adoptMarketExperiment` → existing `recordExperiment` (draft A/B, metric `leads`, notes = evidence why).
4. Completing that experiment still runs Phase 2 learning (deltas in code, DNA trait, follow-up hypothesis). A later scan marks the pattern `historicallyTested`.
5. Language stays “test original copy in this pattern” — **not** copy the ad.

If there are no public rows, NBE is **UNKNOWN**.

---

## 7. What Google Cloud services are actually being used

| Service | Used? | Why |
|---|---|---|
| Cloud Run | Yes (existing app) | Hosts `/api/scientist/market` |
| Vertex Gemini Pro + Search Grounding | Yes, **only** via existing `runMarketResearch` | One grounded pass per cache miss |
| Vertex Gemini Flash / Imagen | No extra calls | Not justified for this layer |
| Cloud Translation | No extra calls | UI already HE/AR/EN |
| Embeddings / Vector Search | **No** | Deterministic clustering is cheaper and more honest |
| Cloud Scheduler | **Optional, not provisioned from this VM** | `POST /api/scientist/market/cron` if `MARKET_WATCH_SECRET` is set. Default watch is `/growth` load |
| Cloud Storage | No new buckets | Existing local / Supabase payload |
| BigQuery / Pub/Sub | **No** | Explicitly avoided |
| Supabase Postgres | Existing scientist tables | Owner-scoped JSON |
| Meta Graph | Optional token | Same as research desk |

GCP project credits / billing account from this VM: **UNKNOWN** (`gcloud` not available; `GOOGLE_CLOUD_PROJECT` unset in the shell). Code still defaults to the documented pack project when ADC exists on Cloud Run.

---

## 8. Estimated / observed resource consumption

Observed in this VM:

- Unit tests: no Vertex, no Imagen, no Scheduler
- Source probes: 4 short HTTPS GETs (YouTube, TikTok radar, Meta untokened, Google Transparency homepage). TikTok/Meta failed closed
- No $300-pack spend measured here

Estimated per **cache-miss** scan (when Vertex is up on Cloud Run):

- 1× Gemini Pro + Search Grounding (same cost class as today’s `/api/research`)
- 1× YouTube suggest
- 1× TikTok radar probe (fails closed)
- 0–1× Meta Graph if a token exists (limit 6 rows)
- Memory cache 10 minutes (`ad-research`) + scan identity 30 minutes
- Auto-scan at most every 6 hours per workspace; Watch default 24 hours
- Rate limit: same `research` bucket (20 / 15 min anon, 2× signed-in, per instance)

A full desk boot does **not** scan 8 campaigns — only the primary workspace, and only if stale.

---

## 9. Tests performed

**Automated (this VM)**

| Check | Result |
|---|---|
| `npm run check:market-intel` | PASS — scan, blocked sources, duplicates, dropped fake ROAS, missing metrics UNKNOWN, Market DNA persist, NBE → experiment, watch material advertiser, tested-pattern flag, no scraper-bypass strings |
| `npm run check:scientist` | PASS — Phase 2 loop unchanged |
| `npm run check:ad-research` | PASS |
| `npm run check:empty-campaign` | PASS |
| `npm run check:vertex-stack` | PASS |

**Covered in `check-market-intel` (no network)**

- Scan with insufficient context does not invent ads
- Meta `ok` example = OBSERVED_FACT; grounded notes = ESTIMATE
- Duplicate advertiser+URL collapsed
- Fake `ROAS: 12` / `million views` dropped
- TikTok / LinkedIn stay blocked
- Performance array empty → UNKNOWN metrics
- Pattern language is “appears repeatedly…”, not “guaranteed”
- Incremental scan emits a **material** new-advertiser notification only
- Re-ingest pack keeps Market DNA + experiments
- Cron source requires `MARKET_WATCH_SECRET`

**Not executed / UNKNOWN**

| Scenario | Status |
|---|---|
| Live Vertex grounding on **hosted** Cloud Run after this deploy | UNKNOWN |
| Meta `ads_archive` with a real token | UNKNOWN (token absent) |
| Cloud Scheduler actually attached | UNKNOWN / unconfigured unless secret is set |
| Signed-in persistence of market payload on hosted Supabase | Code path same as Phase 2; live apply UNKNOWN |
| Browser HE/AR/EN + mobile **local Next** (`127.0.0.1:43147`) | PASS — empty `/growth` RTL HE / LTR EN / RTL AR, no invented DNA; seeded clinic shows Business DNA; Scan Now + Watch controls; `/growth/market` lists honest source statuses; no ROAS; NBE UNKNOWN when no public ads; `/growth/dna` + `/growth/experiments` still render; 390px cards stack and tabs scroll |
| Browser HE/AR/EN + mobile after **hosted** deploy | UNKNOWN |
| Cross-user isolation of market blobs | Same owner RLS as scientist; live two-account UNKNOWN |

---

## 10. Any limitations or unavailable sources

- **TikTok Creative Center live ads:** unavailable (no official free ads API; radar `no permission`). Official page links only.
- **LinkedIn Ad Library:** usually login-walled. No bypass.
- **Google Ads Transparency / Pinterest / Trends:** no official free listing API used. Explore URLs + optional grounding. HTML is not scraped.
- **Meta Ad Library live rows:** require `META_ADS_LIBRARY_TOKEN` with `ads_archive`. Without it: public URL + grounding estimates.
- **Gemini grounding / multimodal snapshots:** Meta snapshot URLs are typically login-walled; we do **not** fetch them. No Imagen/vision spend added.
- **Performance / ROAS / “performed extremely well”:** never claimed without a source-provided indicator. None were observed.
- **Advertiser names from grounding:** labeled ESTIMATE, not silently written as user competitors.
- **Market Watch cron:** unconfigured without `MARKET_WATCH_SECRET` + service role. Desk-load watch still works.
- **Embeddings / BigQuery / Pub/Sub:** not used.
- **Hosted deploy of this PR:** not done from this VM. Do not treat production `/growth` as having Market DNA until this revision is released.

Honest leftovers that are **not** bugs: live media buying, statistical significance, forecasted ROAS, login-walled social ingest.
