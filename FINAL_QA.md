# FINAL_QA — three demo packs

Date: 2026-09-05 (UTC+3)
Packs: demo-samer-clinic, demo-olive-kitchen, demo-sand-boutique
Honest score: **100/100**
Fails: 0 · Warns: 0

## Scope
- Engines: `generateVariants` (spoken/fact-copy), `assemblePack`, `buildPostingCalendar`, `spokenCta`, `whatsappScript`, `detectVertical`
- published.json must contain exactly clinic + Olive Kitchen + Sand Boutique
- Fictional packs must be marked `demoMeta.sample` + `demoMeta.fictional`
- No Pizza Hut / Aluf Sport / other real brands
- No `[יש להשלים]` on fictional packs when invented facts are provided

## Results
- All engine checks passed.

## Sample HE headlines (strong_offer)
- `demo-samer-clinic`: ד"ר סאמר מחמד אבו מוך — לפי סדר הגעה
- `demo-olive-kitchen`: מטבח הזית — ארוחת טעימות זוגית ב-₪149 בהזמנה
- `demo-sand-boutique`: בוטיק חול — הנחת פתיחה רכה 15% על קולקציית

## Notes
- Clinic pack kept from prior publish (owner-approved real clinic); fictional packs rebuilt from catalog intakes via engines.
- New Campaign must not auto-load demos (empty-campaign wipe + demo identity blocklist).
- Demo UI exposes all three as selectable demos.
