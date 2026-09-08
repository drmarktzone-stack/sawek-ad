# SAWEK AD — Prompt 5.1 LIVE VERIFY

**Host:** https://sawek-ad-308665814452.me-west1.run.app  
**Task route:** https://sawek-ad-308665814452.me-west1.run.app/task/ad  
**Repo HEAD tested:** Cloud Run = `main` @ PR #19 (`4237cca`). Fixes in this PR (#20) are **not** on Cloud Run yet (no gcloud credentials in this environment).  
**Method:** Live HTTP + live Chromium against the production host. Not claimed from unit tests or PR #19 docs.

---

## 1. Overall Status

**NOT READY**

Current Cloud Run fails the scan → Business Truth gate: website chrome (`Have an account?`, cafeteria/restaurant words, `parents` from incidental copy, `H2:` promo prefixes) becomes intake and then Complete Ad copy. Novelty status on every successive Complete Ad is displayed as `original` because overlay re-sync rebuilds the package against empty history.

PR #20 in this repo fixes those two root causes. **Owner must deploy Cloud Run**, then re-run tests 1, 2, 5, and 6 on the new revision. This agent cannot deploy.

---

## 2. Test Matrix

| # | Test | Result | Evidence |
|---|---|---|---|
| 1 | Scan → Task Workspace: Website Scan → Business Understanding → Create Ad opens `/task/ad` with correct context; no long-home scroll; no old demo contamination. Empty workspace must not invent context. | **PARTIAL** | Empty `/task/ad?lang=en`: “No business in this workspace” / “we will not invent context.” No clinic/Olive/Sand demo. Screenshot `live_task_ad_empty.png`. Scan `https://www.levainbakery.com` → confirm → landed on `/task/ad` (no homepage scroll to wizard). Business key `levain-bakery`, name Levain Bakery, 16 assets, history 0. **FAIL inside the same flow:** live extract set Audience=`parents`, Problem=`Have an account?`, Offer=`H2: Unlock Free Shipping…`. Screenshot `live_task_ad_levain.png`. Mass General ingest API on this host returned `category: restaurant`. Fixed in PR #20; **not retested on a new Cloud Run revision**. |
| 2 | One-click Complete Ad from available verified data only — no inventing. | **PARTIAL** | Clean seeded bakery on live JS: Offer `UNKNOWN — not invented`, Proof `UNKNOWN — none in intake`, copy uses name / hours / 6-oz cookie / New York only. Screenshot `live_clean_complete_1.png`. **FAIL on real scan path:** Complete Ad #1 headline `Levain Bakery — Have an account?`, audience Parents, offer H2 shipping line (chrome treated as USER-PROVIDED). Screenshot `live_complete_ad_1.png`. |
| 3 | Same business, five consecutive Complete Ads — strategic fingerprints; reject same-idea+reword. | **PASS** | Live families (clean Levain): `authority` → `educational` → `comparison` → `transformation` → `curiosity`. Headlines: `Levain Bakery · New York` / `… 7:00 AM - 10:00 PM` / `… 6-ounce chocolate chip walnut cookie` / `… One clear step` / `… when?`. Scan-path first three: `problem_led` / `offer_led` / `authority`. No consecutive same family. Screenshots `live_clean_complete_1.png`, `live_clean_complete_5.png`, `live_complete_ad_1.png`. |
| 4 | Day1/2/3 diversity — not A→A→A / A→reword→A / A→B→A without performance evidence. | **PASS** | Live campaign result listed `DAY 1 · FACEBOOK`, `DAY 2 · INSTAGRAM`, `DAY 3 · INSTAGRAM` (distinct channels + week1 sources: strong / emotional / advantage variants). Five Complete Ads used five families (test 3). Screenshot `live_campaign_calendar.png`. Calendar section was below the fold; channel labels captured from live DOM. |
| 5 | Novelty Gate BEFORE display (candidates → compare history → reject → other direction → show). | **PARTIAL** | Families rotate (gate is selecting different directions). Live UI novelty chip was `original` on ads 1–5 because overlay `attachCompleteAd(rotate:false)` rebuilt against empty history and wiped novelty/rejected-family metadata. PR #20 keeps the gated package. Not retested on deployed revision. |
| 6 | Contamination: no 30% / fake testimonial / stat / competitor offer becoming Business Truth. | **PARTIAL** | Injected competitor `לחם הזהב` + `30% הנחה` + “דנה אמרה” on live Complete Ad: **no 30%**, **no competitor name**, **no testimonial** in the package. Clinic copy used only `long waits` / `Same-day quiet visit` / Baqa. Screenshot `live_contamination_30pct.png`. **FAIL on scan extract:** login CTA and restaurant word → Business Truth (test 1). |
| 7 | Business A vs B isolation both ways. | **PASS** | A = Levain (`businessId=levain-bakery`). B = IKEA (`businessId=ikea`): category furniture, no Levain/cookie/bakery leak in understanding or Complete Ad (`IKEA — A better everyday life at home`). Switching A→B replaced context. Screenshots `live_task_ad_levain.png`, `live_isolation_ikea.png`, `live_isolation_ikea_ad.png`. |
| 8 | Google/YouTube Suggestions: short queries, real rows OR honest UNKNOWN + Retry + alternate + reason; never blank silent fail; no invented volumes. | **PASS** | Live UI Google rows: `bakery near me`, `bakery tel aviv`, `bakery dizengoff`, `bakery haifa`. YouTube: `bakery asmr`, `bakery vlog`, `bakery work in israel`. Query sent: `bakery`. Disclaimer: “Public search suggestion — not a volume, trend, or performance number.” Retry present. Meta/TikTok/LinkedIn: UNKNOWN + reason + Retry, no invented CPC/ROAS. Live API `/api/research` for `מאפייה`: google_suggest 8 rows, youtube_suggest 8 rows. Screenshots `live_google_suggest_rows.png`, `live_youtube_suggest_rows.png`. |
| 9 | Image WITH existing text: no text-on-text; A/B/C composition only. | **PASS** | Scan photos (https assets): `data-image-composition=separate_headline`, `data-image-collision=1`, treatment “Image + separate headline area”. Screenshot `live_complete_ad_1.png`. |
| 10 | Image WITHOUT text: overlay still works when space OK. | **PASS** | Clean bakery (0 scan assets, studio still): `overlay_safe`, collision `0`. Screenshot `live_clean_complete_1.png`. |
| 11 | HE / AR / EN RTL/LTR. | **PASS** | EN LTR. AR: `dir=rtl`, title إنشاء إعلان. HE: `dir=rtl`, title יצירת מודעה. Language toggle on chrome. Screenshots `live_lang_ar.png`, `live_lang_he.png`, `live_task_ad_empty.png`. |
| 12 | Mobile 390px: workspace, complete ad, suggestions, no overflow. | **PASS** | Viewport 390×844: `scrollWidth=390`, overflow=false. Empty workspace + scan + nav stack without horizontal scroll. Screenshot `live_mobile_390_workspace.png`. |
| 13 | Regression: scan, campaign, strategy, creative, market intel, experiment, leads, languages, demos, SelfAD, persistence. | **PASS** | Live HTTP 200: `/`, `/task/ad`, `/self`, `/studio`, `/strategy`, `/discovery`, `/leads`, `/growth`, `/growth/market`, `/campaigns`, `/status`, `/pricing`. Home still has wizard + three demos. `/self` Self-marketing form loads. Screenshot `live_home.png`, `live_selfad.png`. |
| 14 | Refresh/state: history/context survive refresh/back/reopen; no wrong stale/demo state. | **PASS** | After Complete Ad + open campaign + return to `/task/ad`: Levain still in Business Understanding, complete ad family `curiosity` still shown. Empty workspace did not revive a demo. New empty campaign path present. |
| 15 | No fake success on failed APIs. | **PASS** | `POST /api/generate` `{}` → `{ok:false, reason:"no_facts", useTemplates:true}`. Mayo Clinic scan: red error “The site blocked the scan (bot protection / Cloudflare)…” — **no** Confirm-and-apply dialog. Imagen empty → `plan_required`. Screenshot `live_mayo_blocked_ui.png`. |
| — | SawekSelfAD `/self` | **PASS** | Live `/self?lang=en` loads Self-marketing workspace (name / what you sell / audience / cadence / channels / אין מבצע / 7-day plan). Screenshot `live_selfad.png`. |

---

## 3. Bugs Found & Fixed (this PR)

1. **Scan chrome → Business Truth** (`lib/document-ingest.ts`, `lib/url-ingest.ts`, `app/api/ingest-url/route.ts`)  
   Live ingest turned `Have an account?` into `biggestProblem`, incidental `Restaurant`/`Store`/`parents`/`women` into category/audience, and podium “street level” copy into location. Gemini scan overlay could fill empty brand fields not grounded in the page.  
   **Fix:** junk-UI regex (login/account), schema-labeled category only, audience requires child/pediatric context, JSON-LD type ranking (Hospital > Restaurant), Gemini brand must appear in page text.

2. **Novelty gate wiped after overlay** (`lib/engine/ad-engine/complete-ad.ts`)  
   Live chips stayed `original` on ads 2–5. Research/pro-desk overlay called `attachCompleteAd({rotate:false})`, which rebuilt the winner against empty history.  
   **Fix:** if `rotate === false` and a fingerprinted complete ad already exists, keep it.

Tests added: hospital+cafeteria fixture in `check-url-ingest`; prompt5 chrome + overlay-preserve assertions.

---

## 4. Remaining Limitations (API / platform / missing data only)

- Unofficial Google/YouTube suggest endpoints can be blocked from some egress; UI already shows UNKNOWN + query + public URLs + Retry. **This host returned real rows.**
- Suggest rows are observed strings, never volumes. Meta/TikTok/LinkedIn stay UNKNOWN without tokens — honest.
- Pixel OCR is heuristic; cross-origin scan photos default to separate headline until a same-origin sample exists.
- Query list can include awkward Latin stems from page phrases (`for our` / `ounce chocolate chip walnut`) after the short `bakery` stem. Autocomplete still used the short stem.
- Two-account fingerprint isolation on live Supabase was **not** exercised (anonymous browser).
- **Cloud Run was not redeployed from this PR.** Scan contamination and novelty-chip wipe remain on the public revision until the owner deploys.

---

## 5. Final Production Readiness

**78 / 100 — NOT READY to call production PASS**

| Band | Score |
|---|---|
| Live `/task/ad` empty + scan navigation + isolation + suggestions + i18n + mobile + SelfAD + honest API failures | strong |
| Five-family rotation + image A/B composition + 30% competitor reject on Complete Ad | strong |
| Live website scan writing chrome into Business Truth | fail (fixed, undeployed) |
| Novelty chip always `original` after overlay | fail (fixed, undeployed) |

Do not treat Cloud Run as READY until PR #20 is deployed and a human (or this suite) re-runs **scan Levain → `/task/ad` → five Complete Ads** and confirms Problem is not `Have an account?` and novelty is not stuck on `original`.
