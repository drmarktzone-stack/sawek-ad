# OmniAd Studio

**OmniAd — The Future of Advertising**

A third app: the union of OmniAd (4-step RTL wizard, 6 ad variants, design studio, truth layer) and AdBrain (five-agent HITL pipeline, media blueprints, performance optimizer). It does **not** replace or modify the original OmniAd or AdBrain products.

Hebrew, Arabic, and English are equal first-class languages. Visual identity is dark **black + red + yellow**.

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
4. Read the diagnostic cards and **אשר אבחון והמשך לבנייה**.
5. Watch the five agents complete, then the full HE/AR/EN pack: 6 ads, accordions, media blueprint, 12 design styles, truth layer.
6. Save. Build a second campaign with **קמפיין חדש**.

## What you get

| Surface | Route |
|---|---|
| 4-step wizard + CMO interview + HITL diagnosis | `/` |
| Content Studio | `/studio` |
| My campaigns | `/campaigns` |
| Result pack | `/campaigns/[id]` |
| What is OmniAd | `/about` |
| Self-marketing | `/self` |

No live Meta/Google/TikTok APIs. No credit card. No invented lead gauges.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn-style primitives
