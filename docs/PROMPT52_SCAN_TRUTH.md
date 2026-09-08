# SAWEK AD — Prompt 5.2 Scan Truth Isolation & Business Fact Governance

**Host:** https://sawek-ad-308665814452.me-west1.run.app  
**Repo:** https://github.com/drmarktzone-stack/sawek-ad  
**Date:** 2026-09-08

---

## STATUS

**NOT READY**

Architecture, fixtures, adversarial cases, and **local** parse of live Levain / Mass General HTML are clean. Cloud Run still serves the previous revision. This environment has **no gcloud credentials**, so ingest-url was **not** re-verified on a deployed revision.

Do **not** start Design Overhaul until a human deploys this PR and re-runs live `POST /api/ingest-url` for Levain and Mass General.

---

## ROOT CAUSE

PR #20 / #21 added **patch-style filters** (shipping / tote / incidental women / schema rank). They could not stop the same failure class on other sites because:

1. **LLM and extractors jumped page → Truth.** Full-page blobs (nav, footer, H2, OG, widgets, related products) were mined for offer / audience / problem.
2. **`mergeUrlIngestResults` re-extracted from concatenated extra pages**, so cart / blog / chrome could refill Truth after the homepage was clean.
3. **Gemini `mode=scan` wrote inferences into Truth fields** (audience=women, problem=tote-shaped questions).
4. **JSON-LD used first/highest-rank type without identity binding** (cafeteria Restaurant vs Hospital).
5. **Confidence was treated as Truth.** A high-confidence inference from a banner was still a non-fact.
6. **Brand-specific string bans** (`tote`, Levain, Mass General) do not generalize. The next site uses a different merch noun or a different demographic word.

Raw scan text ≠ Business Truth. Only identity-bound, classified, evidence-validated facts may enter Truth.

---

## FIX (architectural)

Mandatory pipeline. The LLM must not jump page → Truth.

```
RAW PAGE
  → CONTENT EXTRACTION   (DOM regions, JSON-LD, OG, headings, widgets, iframes)
  → CONTENT CLASSIFICATION  (A–J)
  → BUSINESS FACT CANDIDATES  (class A only)
  → EVIDENCE VALIDATION  (qualification + identity bind + sourceType)
  → BUSINESS TRUTH
```

### Content classes (A–J)

| Class | Name | May enter Truth? |
|---|---|---|
| A | BUSINESS_FACTS | Yes, after evidence validation |
| B | PAGE_CHROME | No |
| C | NAV/UI | No |
| D | GENERIC | No |
| E | BLOG/EDITORIAL | No |
| F | THIRD-PARTY | No |
| G | COMPETITOR | No |
| H | REVIEWS | No |
| I | GENERATED/DEMO | No |
| J | UNKNOWN | No (stays UNKNOWN) |

### Fact qualification (before Truth)

**Allowed:** `VERIFIED_BUSINESS_FACT` · `USER_PROVIDED_FACT` · `SOURCE_VERIFIED_FACT` · `UNKNOWN`  
**Rejected:** `PAGE_CHROME` · `GENERIC_TEXT` · `EDITORIAL` · `THIRD_PARTY` · `COMPETITOR` · `NAVIGATION` · `UI` · `UNRELATED` · `GENERATED` · `UNSUPPORTED_INFERENCE`

`UNKNOWN` is stored as empty / sentinel. It never falls back to a previous business’s Truth.

### Field rules (generic — no brand ifs)

- **OFFER:** shipping unlock, free-shipping bars, coupons, nav “50% OFF”, footer widgets → not Truth. Labeled on-page sale (`מבצע` / `חיסול` / `1+1` / identity-bound heading) may enter after evidence check. Else OFFER = UNKNOWN.
- **AUDIENCE:** no women/parents from image, stock, “women’s health”, “care for women”, parent-organization copy, or hospital department pages. Parents only when the **business** is pediatric (clinic / kids’ product with owned pain copy), or a labeled target-audience statement. Else UNKNOWN.
- **PROBLEM/PAIN:** merch upsell (`Add a {x} for the perfect…`), account/login, tote-shaped cart questions are not pain. Only explicit / multi strong owned signals. Else UNKNOWN. Inferences never Truth.
- **PAGE CHROME:** header/nav/footer/cookie/login/search/shipping banners/promo widgets/newsletter/related products/recommendations/third-party/embedded/tracking/generic ecommerce — not auto facts.
- **IDENTITY ANCHOR:** name/domain/canonical/org JSON-LD. Unmatched orgs (Campus Cafeteria vs Hospital) are THIRD_PARTY.
- **EVIDENCE:** fact, source URL, sourceType, timestamp, confidence, snippet, qualification. **Confidence ≠ Truth** (INFERENCE + HIGH still not Truth).
- **FACTS vs AI INSIGHTS:** Gemini scan output is `insights[]` (`INFERENCE · scan: …`) only. It does not merge into `fields`.
- **No leakage:** scan does not read previous creatives, campaign history, Market DNA, competitors, or demo intake as Truth sources. Extra pages may fill **contact/hours only**. Weak never overwrites strong. Miss → UNKNOWN, not old Truth.

Downstream remains **Truth → Campaign → Market → Insights → Creative only.** `unknown` sentinels are stripped to empty in `buildBusinessTruth` so Complete Ad does not print “unknown” as a problem.

---

## FILES

| Path | Role |
|---|---|
| `lib/scan-truth/types.ts` | Classes A–J, qualifications, evidence, merge strength |
| `lib/scan-truth/patterns.ts` | Generic chrome / pain / audience / offer detectors (no brand strings) |
| `lib/scan-truth/page.ts` | Extract units + classify + identity + business corpus |
| `lib/scan-truth/govern.ts` | Evidence validation; weak never overwrites strong |
| `lib/scan-truth/pipeline.ts` | RAW → extract → classify → candidates → validate → Truth |
| `lib/scan-truth/index.ts` | Public exports |
| `lib/url-ingest.ts` | `parseFetchedHtml` / extra-page merge use the pipeline; raw `text` stays scan layer |
| `lib/document-ingest.ts` | Extractors call generic chrome/pain gates; incidental demographics rejected |
| `app/api/ingest-url/route.ts` | Gemini scan → insights only |
| `lib/engine/ad-engine/sources.ts` | `unknown` sentinel ≠ copy |
| `scripts/check-scan-truth.ts` | Prompt 5.2 matrix |
| `scripts/fixtures/url-ingest-adversarial-chrome.html` | Nav/footer/blog/iframe chrome |
| `docs/PROMPT52_SCAN_TRUTH.md` | This document |

No `if (levain)` / tote / Mass General string bans in `lib/scan-truth/`.

---

## TEST MATRIX

| Site | Test | Result | Contamination? | Evidence |
|---|---|---|---|---|
| **Levain** (fixture `url-ingest-bakery-chrome.html`) | Offer/problem/audience from shipping, tote, account, parents | **PASS** | No | `offer=""`, `biggestProblem=unknown`, no tote/shipping/women in Truth. Name + 74th Street kept. |
| **Levain** (live HTML, local pipeline) | Same class on `https://www.levainbakery.com/` (581KB, 2026-09-08) | **PASS locally** | No | Name `Levain Bakery`. Offer empty. Problem `unknown`. No Free Shipping / tote in fields. Live JSON-LD is Organization/WebSite only → location UNKNOWN (not invented). |
| **Levain** (production ingest-url) | Deployed Cloud Run | **FAIL (old revision)** | **Yes — offer** | `offer` = “This order ships free. *Up to $20 shipping discount…”. Problem already `unknown`. **Not this PR.** |
| **Mass General** (fixture `url-ingest-hospital-cafeteria.html`) | Cafeteria Restaurant vs Hospital; women/parents; podium location | **PASS** | No | Name Mass Test Hospital. Category Hospital (not Restaurant). Audience empty. Location 55 Fruit Street. |
| **Mass General** (live home HTML, local) | `massgeneral.org` → Brigham about page | **PASS locally** | No | Name Mass General Brigham. Audience empty. Problem unknown. |
| **Mass General** (live OB/GYN, local) | “care for women” + pediatric/infant on a health-system department page | **PASS locally** | No | Audience empty (was `parents,women` before department/hospital guard). |
| **Mass General** (production ingest-url) | Deployed Cloud Run home URL | **PARTIAL (old revision)** | No women on this URL today | Audience empty; location 55 Fruit Street. Does **not** prove the architecture is live — Levain still polluted. |
| **Local** (fixture `url-ingest-localbusiness.html`) | Grill facts; no invented offer | **PASS** | No | Name פיקציה גריל. Phone/address kept. Offer empty. |
| **Ecommerce** (store-sale + aam fixture) | Verified `מבצע`/`חיסול` kept; shipping bar not Truth | **PASS** | No | Store-sale offer contains חיסול/מבצע. AAM top-bar “משלוחים חינם” does not become the offer; on-page `מבצע חדש` / Hot Sale may. |
| **Service** (clinic fixture) | Phone, hours, free-service offer, pediatric parents | **PASS** | No | WhatsApp 052-8885800. Offer مجان/100%. Audience parents from clinic identity, not chrome. wizardReady. |
| **Adversarial** (`url-ingest-adversarial-chrome.html`) | Free Shipping / Women / Tote / 50% OFF / Limited Time / Best Results / Customer Review in nav/footer/aside/blog/iframe | **PASS** | No | None of those strings in Truth. Name North Harbor Lamps. Location Herzl Street. |
| **Cross-business** | Grill HITL then Levain HITL | **PASS** | No | Grill name/phone not retained. Demo clinic leftover still cleared on pedi/grill/store (`check-url-ingest`). |
| **Final Ad** | Scan → Truth → Create Ad → Complete Ad (Levain fixture) | **PASS** | No | Complete Ad JSON has no free shipping / tote / have-an-account. `buildBusinessTruth` strips unknown sentinel. |

Commands: `npx tsx scripts/check-scan-truth.ts` · `npx tsx scripts/check-url-ingest.ts` · `npx tsx scripts/check-prompt5.ts` · `npx tsx scripts/check-ad-engine.ts` — all **PASS** on this branch.

---

## REGRESSION

**PASS**

Existing URL ingest (pedi-guide OG split, SPA unwell, clinic leftover, nav extras, SSRF, store 1+1, aam, JS corpus hours), Prompt 5 workspace/Complete Ad, and ad-engine family rotation keep working. Extra pages no longer copy offer/audience/problem. Gemini scan no longer writes Truth.

---

## FINAL PRODUCTION READINESS

**84 / 100 — NOT READY**

| Band | Score |
|---|---|
| Classification architecture (A–J) + evidence qualifications | strong |
| Fixture + adversarial + cross-business + Complete Ad | strong |
| Local parse of **live** Levain HTML: no Free Shipping / Tote | strong |
| Local parse of **live** Mass General home + OB/GYN: no unsupported women | strong |
| Existing ingest / Prompt 5 / ad-engine regression | strong |
| **Live ingest-url on a deployed Cloud Run revision** | **fail (undeployed)** |
| Production Levain still writes shipping into offer | **fail (old revision)** |

READY only after: deploy this revision → `POST /api/ingest-url` `{url:"https://www.levainbakery.com/"}` has empty/unknown offer (no ships-free / Free Shipping) and problem not tote → Mass General audience not women → Complete Ad from that Truth has no chrome.

---

## REMAINING LIMITATIONS

- **Deploy gate:** this agent cannot publish Cloud Run. Production ingest remains the previous filter stack until the owner deploys.
- **JS-only contact:** if address/hours exist only in a late-loaded bundle and are not in HTML / JSON-LD, they stay UNKNOWN (correct — not invented). Live Levain homepage JSON-LD has no PostalAddress, so local location is UNKNOWN.
- **Thin / redirected hospital shells:** `massgeneral.org` currently redirects to a short Brigham about page. Women’s-health copy lives on department URLs; those are classified as hospital/department, not business audience.
- **Landing lines** may still carry merch H2s that are not offer/problem Truth. Cart chrome (“Your bag is empty”) is stripped.
- **Gemini** may still emit scan insights; they are labeled INFERENCE and never merged into `fields`.
- Unofficial suggest endpoints, pixel OCR, and bot-blocked sites are unchanged from Prompt 5.1.

No Design Overhaul. No new features. No brand-specific blacklists.
