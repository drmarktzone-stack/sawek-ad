# Final QA — three trilingual demo campaigns

Date: 2026-09-05 (Asia/Jerusalem)

## Scope
Owner pre-payments/marketing QA for SAWEK AD:
engines → fact-copy → calendar for **exactly three** published demo packs; clinic Demo auto-fill only.

**Owner brand rule:** only the real clinic may ship as a real-business demo. Do **not** publish Pizza Hut, Aluf Sport, or other real brands without permission. The other two packs must be fictional samples.

## Demo IDs (only these)
1. `demo-samer-clinic` — https://drsamerped.ai.studio (real clinic, Demo-button auto-fill) — OK
2. `demo-olive-kitchen` — Olive Kitchen (fictional Mediterranean restaurant)
3. `demo-sand-boutique` — Sand Boutique (fictional clothing boutique)

## Pass / fail table

| Check | Result | Evidence |
|---|---|---|
| published.json ids exactly clinic + olive + sand | PASS | `['demo-samer-clinic', 'demo-olive-kitchen', 'demo-sand-boutique']` |
| Olive/Sand marked fictional sample | PASS | `demoMeta.sample` + `demoMeta.fictional: true` |
| No Pizza Hut / Aluf Sport pack ids or demo identities | PASS | Catalog + published packs purged |
| Clinic Demo auto-fill only | PASS | Real clinic entry; fictional packs open published sample |
| HE+AR+EN variants / calendar engines | PASS | Clinic kept; olive/sand rebuilt via catalog intakes |
| UI picker selectors | PASS | `data-demo=samer|olive|sand` only |
| No invented CAC/ROAS/patient metrics | PASS | Public clinic facts + invented fictional pack facts only |

## Sample evidence (strong_offer)

### demo-samer-clinic
- Real clinic (owner-approved)
- HE: ד"ר סאמר מחמד אבו מוך — לפי סדר הגעה

### demo-olive-kitchen
- Fictional — מטבח הזית / مطبخ الزيتون / Olive Kitchen
- HE: מטבח הזית — ארוחת טעימות זוגית ב-₪149 בהזמנה

### demo-sand-boutique
- Fictional — בוטיק חול / بوتيك الرمل / Sand Boutique
- HE: בוטיק חול — הנחת פתיחה רכה 15% על קולקציית

## Rebuild
```bash
npx tsx scripts/publish-three-demos.ts
```

## Notes
- `lib/demo-catalog.ts` must export only clinic + olive + sand (never alias olive→pizza or sand→aluf).
- New Campaign must not auto-load demos.
- Leak detectors may still *match* Pizza Hut / Aluf Sport strings to block accidental contamination; those brands must never appear as selectable demos.
