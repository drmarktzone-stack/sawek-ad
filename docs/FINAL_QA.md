# FINAL_QA — three demo packs

Date: 2026-09-05 (UTC+3)
Packs: demo-samer-clinic, demo-olive-kitchen, demo-sand-boutique
Honest score: **100/100**
Fails: 0 · Warns: 0

## Scope
- Engines: `generateVariants`, `assemblePack`, `buildPostingCalendar`, `cmo-ideas` (planning scorecards), `spokenCta`, `whatsappScript`, `detectVertical`
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

## CMO idea names (HE, top 3)
- `demo-samer-clinic`: וואטסאפ רך · שקט באותו יום · מפת בוקר
- `demo-olive-kitchen`: טעימות לשניים · טקס שולחן הזית · ים-תיכון בלי תור
- `demo-sand-boutique`: סיפור מתלה אחד · אלגנטיות יומיומית · שמירה בוואטסאפ

## Notes
- All three packs rebuilt with filled CMO interview desks (sample planning inputs, no fake ROAS) + real JPEG photos + studio stills.
- New Campaign must not auto-load demos (empty-campaign wipe + demo identity blocklist).
- Demo UI exposes all three as selectable demos.
