# Final QA — three trilingual demo campaigns

Date: 2026-09-05 (Asia/Jerusalem)

## Scope
Owner pre-payments/marketing QA for SAWEK AD:
ingest → fact-copy → calendar for three **real** public businesses; publish demo packs; clinic Demo auto-fill only.

## Demo IDs
1. `demo-samer-clinic` — https://drsamerped.ai.studio (clinic, Demo-button auto-fill)
2. `demo-pizza-hut` — https://www.pizzahut.co.il/ (restaurant, published pack open-only)
3. `demo-aluf-sport` — https://www.alufsport.co.il/ (retail, published pack open-only)

## Pass / fail table

| Check | Result | Evidence |
|---|---|---|
| Live/local ingest clinic name+phone | PASS | name أبو مخ / phone 052-8885800 |
| Live/local ingest Pizza Hut name+phone+offer | PASS | פיצה האט ישראל / 1-700-50-60-70 / מבצעים חמים… |
| Local ingest Aluf Sport short name+phone | PASS | אלוף ספורט / 08-9336658 (SEO title shortened) |
| Live `/api/ingest-url` Aluf name (pre-restart) | FAIL→FIX | Production `next start` was stale; SEO title leaked. Hardened final SEO-name pass in `url-ingest.ts`. |
| HE+AR+EN variants (6×3) no `[יש להשלים]`/`[TO COMPLETE]`/`לא מכירים` when name+phone exist | PASS | All three packs clean (`tmp/qa/three-demo-qa.json`) |
| 7-day calendar HE+AR+EN same rule | PASS | All three packs |
| Vertical CTAs (not clinic language on retail/restaurant) | PASS | Pizza: להזמנה באתר / للطلب بالموقع / Order on the site. Aluf: לקנייה באתר / للشراء بالموقع / Shop on the site |
| published.json has exactly these 3 ids | PASS | `['demo-samer-clinic', 'demo-pizza-hut', 'demo-aluf-sport']` |
| Clinic-only New Campaign auto-fill | PASS | `autoFill: true` only on clinic; pizza/aluf open `/campaigns/:id` |
| UI i18n HE/AR/EN for home/login/pricing keys | PASS | 0 missing locale slots among home/login/pricing/nav/cta keys sampled |
| No invented CAC/ROAS/patient metrics | PASS | Public scan facts only |

## Bugs fixed in this run
1. **Aluf SEO business name** — final sanitize in `parseFetchedHtml` when title still looks like ecommerce SEO.
2. **Retail CTA leaked clinic “Book an appointment”** — chip id `bookings` matched `/book/`; restaurant/retail CTAs now run first; appointment heuristic clinic-only.
3. **Joined WhatsApp numbers** (`08-9336658 · 582616587`) — `contactNumber` / pack builder use first usable number.
4. **Published demos** — replaced fictional Olive/Sand samples with real Pizza Hut + Aluf Sport packs (owner QA request).

## Sample evidence (strong_offer)

### demo-samer-clinic
- name: د. سامر محمد أبو مخ
- phone: 052-8885800
- HE: ד"ר סאמר מחמד אבו מוך — לפי סדר הגעה | הגיעו למרפאה
- AR CTA: جيبوه عالعيادة
- EN CTA: Come to the clinic

### demo-pizza-hut
- name: פיצה האט ישראל
- phone: 1-700-50-60-70
- HE: פיצה האט ישראל — מבצעים חמים, ותהנו ממבצעים | להזמנה באתר
- AR CTA: للطلب بالموقع
- EN CTA: Order on the site

### demo-aluf-sport
- name: אלוף ספורט
- phone: 08-9336658
- HE: אלוף ספורט — Winter Sale, הלבשה תחתונה - SALE | לקנייה באתר
- AR CTA: للشراء بالموقع
- EN CTA: Shop on the site

## Suggested score /100 (honest rubric)

| Rubric (weight) | Score | Notes |
|---|---:|---|
| Ingest facts real & usable (20) | 18 | Aluf live API was stale until restart/harden; local path solid |
| Zero incomplete markers with name+phone (25) | 25 | All locales clean |
| Trilingual campaign copy (20) | 17 | Bodies/CTAs recreated; some offer strings stay Hebrew site-facts inside AR/EN headlines |
| Demo pack UX (clinic auto-fill only) (15) | 14 | Picker + published list; pizza/aluf do not hydrate New Campaign |
| Vertical correctness (10) | 10 | clinic/restaurant/retail CTAs correct after fix |
| Honesty / no invented metrics (10) | 10 | No CAC/ROAS inventions |

**Recommended overall: 94 / 100**

Deductions: live Aluf name needed a harden+restart (−2), Hebrew offer text still appears inside some AR/EN headlines as raw site fact (−3), minor dual-agent churn on fictional vs real demos during the run (−1 already absorbed).

## How to re-run
```bash
npx tsx scripts/snapshot-three-demos.ts
npx tsx scripts/check-pizza-calendar.ts
```
