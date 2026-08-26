# OmniAd Studio — Product Spec (source of truth)

Working title: **OmniAd Studio**. Product name in the UI: **OmniAd**.  
Tagline: **The Future of Advertising**.

This repository is a **third app**: the union of OmniAd (Base44 app `6a7712d0685a826e3eab0819`) and AdBrain (GitHub `drmarktzone-stack/adbrain-ai`, Origin `tmp-90dd9f664feed126`). It must **not** modify, overwrite, or replace either original.

No paid SaaS, no credit card, no live Meta/Google/TikTok APIs, no Lovable.

---

## Visual identity (non-negotiable)

- Dark UI: **black + red + yellow**.
- Primary yellow ≈ `#F5C518` (CTA, active steps, highlights). Text on yellow is black.
- Accent red ≈ `#FF2A2A` (underline on the conquer word, warnings, logo gradient).
- Surfaces: `#0A0A0A` page, `#141414` / `#1A1A1A` cards, hairline `#2A2A2A`.
- RTL-first. Hebrew / Arabic / English are **equal first-class** languages. Language toggle on every chrome surface (header) plus a pack-language toggle on generated copy.
- Layout energy matches OmniAd: 4-step wizard, review table, big generate CTA, result page with 6 ad variants, expandable strategy sections, 12-style design grid, truth-layer panels.

## Information architecture

| Route | Nav label (HE) | Purpose |
|---|---|---|
| `/` | בניית קמפיין | 4-step wizard + CMO interview + HITL diagnosis |
| `/studio` | סטודיו תוכן | Content Studio (briefs, variants, produce-ad) |
| `/campaigns` | הקמפיינים שלי | Saved campaigns (localStorage; optional Supabase) |
| `/campaigns/[id]` | — | Full result pack |
| `/about` | מה זה OmniAd | Product explainer |
| `/self` | ניהול שיווק עצמי | Self-marketing workspace |

## Combined flow (do not drop either product)

1. **OmniAd 4-step wizard**
   1. **סוג (Type)** — business / product / service / app / personal brand.
   2. **העסק (The business)** — name, category, description, location, website.
   3. **פרטים (Details)** — chips + **כתוב בעצמך** for audience, problem, unique advantage, goal, offer, depth (`קמפיין מהיר` / `קמפיין מעמיק`).
   4. **בנייה (Review & build)** — summary table, optional competitor add, generate CTA.
2. **AdBrain CMO interview** — extra questions when numbers are missing (business model, margin, target CAC, audience proof, past ads, budget). **Refuse to guess missing numbers.**
3. **Intake & Data Validator** runs consistency checks (e.g. CAC vs contribution margin).
4. **Diagnostic Agent** produces why-ads-fail cards (offer / hook / price / audience / creative / targeting). **HITL: user must Approve before the pack is built.**
5. After approval, generate in HE+AR+EN:
   - Full OmniAd marketing pack (6 copy variants + 12 strategy accordions + design studio).
   - AdBrain media/budget **blueprints** (Meta / Google / TikTok plans only).
   - Performance Optimizer playbook + a form to enter real results and get tweaks.
6. Save to My Campaigns. A second campaign must be possible (new campaign clears draft).

Demo sample client is one click: intake → approve → 5-agent run → full pack, no typing.

## OmniAd output contract

### Six copy variants (every locale)

1. ההצעה החזקה — The strong offer  
2. גרסה קצרה מאוד — Very short  
3. גרסה רגשית — Emotional  
4. גרסה סיפורית — Narrative  
5. גרסה ישירה ומכירתית — Direct / sales  
6. גרסה שמתמקדת ביתרון ייחודי — Unique advantage  

Each card has copy. Pack toolbar: language HE/AR/EN, copy-all, download txt, download PDF, save, new campaign.

### Strategy accordions

זוויות מכירה, סקריפטים לסרטונים, רצף הקמפיין המלא, שיווק האפליקציה, אבחון שיווקי, ניתוח העסק והקהל, פסיכולוגיית הקנייה, ניהול התנגדויות, הצעות טירגוט, רעיונות קריאייטיב, מבנה הקמפיין, שאלות להשלמת התמונה.

### Design studio

12 styles (lifestyle, soft organic, social proof, pastel, sketch, modern flat, editorial dark, bold type, cinematic, minimal light, street, warm documentary). Produce-ad from **style + idea** (CSS mock, not a live generative image API).

### Offer chips

Must include **אין מבצע**. Default selected offer is **אין מבצע**. Do **not** push ייעוץ חינם / הנחה as the default (especially for clinics).

### Competitors

Optional. If empty, say so. **Never invent competitor names, claims, or screenshots.**

## AdBrain five-agent architecture

Visible dashboard/status on the run screen and result header.

| # | Agent | Job |
|---|---|---|
| 1 | Intake & Data Validator | CMO interview before generating. Refuse to guess missing numbers. Consistency checks. |
| 2 | Diagnostic Agent | Why past ads failed (offer/hook/price/audience/creative/targeting). HITL approve required. |
| 3 | Strategic Marketing Agent | AIDA, PAS, Hook–Story–Offer, Hormozi value equation → angles. |
| 4 | Media Buyer Strategist | Budget split + targeting **blueprints** for Meta / Google / TikTok. Plans only. |
| 5 | Performance Optimizer | Given results, recommend tweaks. Kill/scale rules. Worst-case vs realistic scenarios. |

Structured JSON is the source; UI renders readable cards.

## Truth layer (anti-hallucination)

- Flag missing info instead of inventing.
- **No fake “32–68 leads/month” gauges.** No invented testimonials, ratings, or success rates.
- An **intake completeness** score (how much the user actually provided) is allowed.
- Numeric scenarios (leads, CPA) appear **only** when the user supplied budget and/or target CAC, and are labeled as **scenarios from your numbers**, not forecasts.
- Worst-case cost is shown next to a realistic case. No rosy-only promises.
- App-marketing accordion for non-app businesses must not invent an app.

## Storage

- Default: `localStorage` (`omniad-locale`, `omniad-draft`, `omniad-campaigns`, `omniad-studio-library`, `omniad-self`).
- Optional Supabase if `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. App **must run with zero keys**.
- Optional `OPENAI_API_KEY` may enrich copy via `/api/generate`. Fallback templates always work and must be intake-driven, not lorem.

## Engine rules

- Templates interpolate **only provided fields**.
- Empty offer / `אין מבצע` → copy talks about the service itself, not a fake discount.
- Diagnostic confidence is `low` when past-ad evidence is missing.
- Media blueprints never call ad-network APIs.
- Performance optimizer without entered results only shows **conditional** if/then rules.

## Out of scope

Live ad buying, billing, auth walls, credit systems, scraping competitors, generating fake social proof.
