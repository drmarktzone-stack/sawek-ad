# Sprint 1 — Practical marketing tools

**Repo:** `drmarktzone-stack/sawek-ad`  
**Base:** `main` @ Prompt 6 + PR #24  
**Scope:** Tools A / F / G only. Sprint 2–3 omitted (no “coming soon” stubs).

This revision is **not** claimed live on Cloud Run until a human deploys it.

---

## What shipped

| Tool | Route | What it does |
| --- | --- | --- |
| **A — הודעת ליבה / الرسالة الجوهرية** | `/tools/core-message` | Niche + audience + dialect (HE / AR: خليجي, مصري, شامي, فصحى خفيفة + MSA + EN) + 3 beliefs + never-say → locked voice profile saved on the campaign. Later generators reuse it. |
| **F — בונה הצעה** | `/tools/offer` | Dream outcome, proof, time, effort, price, objections → headline, value stack, 3 hooks. Guarantee **only** if the user marks it real. Skip — not recommended is explicit. |
| **G — מודעות HSO** | `/tools/hso` | Saved offer (or skip) + Meta / TikTok / Google → **≥5** Hook · Story · Offer/CTA · format variants. Feeds `/task/ad` and `/studio`; does **not** replace Complete Ad. |

Journey rail on Command Center, task workspace, studio/departments, and every tool:

**קמפיין → הצעה → מודעות → תוכן → מעקב**  
(`/` → `/tools/offer` → `/tools/hso` + `/task/ad` → `/studio` → `/growth/performance`)

Core message is a lock chip on the rail (`/tools/core-message`). Demo clinic still **only** via the Demo click.

## What already existed (reused, not reinvented)

- `intake.voice` + `lib/engine/voice.ts` + `VoiceFields` / viral desk — extended with audience, beliefs, never-say, lock, Egyptian + light fusHa.
- Offer **chips** on the wizard (`אין מבצע` default) — still there. Tool F is the Grand Slam / value-equation layer.
- Strategy accordion HSO in `buildAgency` — left as strategy copy. Tool G is the working studio.
- Brand-voice API (`/api/brand-voice`) — Core Message POSTs a campaign-scoped profile after lock.
- Prompt 6 Command Center, scan-truth, novelty, image composition, HITL, clinic-leak isolation — untouched engines.

## Persistence

- Voice + offer blueprint on **draft intake** (`omniad-draft`) and on the matching **campaign pack**.
- HSO studio on the pack and on the draft (`hsoStudio`) so a pack created later still carries variants.
- Same localStorage / optional Supabase `syncCampaign` path as the rest of the app.

## Offer gate

`offerGate(intake, pack)` blocks **UI** Generate / Create Complete Ad / wizard Build until:

1. a saved Tool F offer exists, **or**
2. the user confirms **Skip — not recommended**, **or**
3. the pack is an explicit **demo** (`demoMeta.sample` — Demo click only).

`assemblePack` itself is **not** gated (tests, overlays, demos keep working).

## Generators that auto-use locked voice

- `produceAd`
- `generateVariants` (complete-ad pack)
- `channelFields`
- Gemini fact lines (`voiceFactLines`)
- HSO studio
- Offer copy prefers the locked message when no offer headline exists

Never-say phrases are stripped. No fake scientific scores.

## i18n / mobile

- New `voice.*` / `offer.*` / `hso.*` / `journey.*` / `gate.*` keys in HE + AR + EN.
- Tools are RTL-first (`dir` from locale). Forms use 16px inputs (existing mobile styles). Journey rail scrolls horizontally on 390px.

## Tests

```
npx tsx scripts/check-sprint1-tools.ts
npx tsx scripts/check-clinic-isolation.ts
npx tsx scripts/check-ad-engine.ts
npx tsx scripts/check-prompt5.ts
npx tsx scripts/check-hitl-advance.ts
```

## Not in this PR

Sprint 2 (7 scripts, 30-day board, bio/carousel, hook checker) and Sprint 3 — omitted on purpose.
