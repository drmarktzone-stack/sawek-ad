# Ilan (אילן / إعلان)

**Ilan** is the product. Hebrew first name *Ilan* (tree) and Arabic *i‘lān* (إعلان, advertisement) — same pronunciation for Jewish and Arab users.

Inside: **OmniAd engine** (4-step RTL wizard, 6 ad variants, design studio, truth layer) and **AdBrain agents** (five-agent HITL pipeline). This is a **third app**. It does **not** replace or rename the original OmniAd or AdBrain products.

The five agents stay the only agents. They produce **departments** of a marketing holding company: Discovery, Strategy, Creative, Media, Leads & promo, Ops — each with structured HE / AR / EN artifacts. Media is **PLAN only** (never live-publish to Meta/Google/TikTok/YouTube).

Hebrew, Arabic, and English are equal first-class languages. Visual identity is dark **black + red + neon yellow**.

Read [PROJECT_SPEC.md](./PROJECT_SPEC.md) for the full contract.

## Run (free, one command)

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

Zero API keys required. Copy is generated from intake with templates. Optional:

```
OPENAI_API_KEY=                 # enrich /api/generate only
NEXT_PUBLIC_SUPABASE_URL=       # optional campaign sync
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Copy `.env.example` if you want those. The app runs the same without them (localStorage).

## Demo walkthrough (no typing)

1. On **בניית קמפיין** click **הדגמה בלי להקליד**.
2. Review the clinic pack (offer is **אין מבצע**, not a free consult).
3. Click **בנה לי קמפיין מלא**.
4. Approve HITL gates: diagnosis → strategy → media → optimizer.
5. Open **דיסקברי / אסטרטגיה / קריאייטיב / מדיה / לידים / אופס** — the full agency pack in HE+AR+EN.
6. Or from any department, click **טען פק הדגמה מלא** so no screen is empty.
7. Download the campaign bible PDF from Ops. Save. Build a second campaign with **קמפיין חדש**.

## What you get

| Surface | Route |
|---|---|
| 4-step wizard + CMO interview + HITL | `/` |
| Discovery (audit, ICP, personas, battlecards) | `/discovery` |
| Strategy (positioning, offer stack, 90-day calendar) | `/strategy` |
| Creative factory (hooks, 12 mockups, all copy formats) | `/studio` |
| Media plans (Meta/Google/TikTok/YouTube, PLAN only) | `/media` |
| Leads & promo (magnet, CRM, cadence) | `/leads` |
| Ops (library, bible PDF, score, HITL gates) | `/campaigns` |
| Result pack | `/campaigns/[id]` |
| What is Ilan | `/about` |
| Self-marketing | `/self` |

No live ad-network APIs. No credit card. No invented lead gauges. KPI numbers appear only from budget/CAC you typed.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn-style primitives

Repo: this Origin project only. Originals (OmniAd Base44, AdBrain GitHub/Origin) are untouched.
