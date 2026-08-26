# SAWEK AD (סאווק / ساويك)

**SAWEK AD** is the product. Optional wordmarks: Hebrew **סאווק**, Arabic **ساويك**. The brand stays **SAWEK AD** — not OmniAd Studio.

Inside: **OmniAd engine** (4-step RTL wizard, 6 ad variants, design studio, truth layer) and **five Gemini agents** (HITL pipeline). This is a **third app**. It does **not** replace or rename the original OmniAd, AdBrain, or OptiBrain products.

The five Gemini agents stay the only agents. They produce **departments** of a marketing holding company: Discovery, Strategy, Creative, Media, Leads & promo, Ops — plus an **OptiBrain medical desk** inside SAWEK AD. Media is **PLAN only**. Originals (OmniAd, AdBrain, OptiBrain Lovable) are not overwritten.

## GitHub: no public OptiBrain repo was visible

The user asked to merge from GitHub account **drmarktzone-stack**, treating GitHub as OptiBrain’s source of truth.

This agent listed that account with the **unauthenticated public GitHub API**. GitHub MCP in this environment was in **error**, so **private** repos could not be listed.

**Repos that were visible (public):**

| Repo | Size | Notes |
|---|---|---|
| `drmarktzone-stack/AestheticAI` | 85920 | Public |
| `drmarktzone-stack/https-med-campaign-creator.lovable.app` | **0** | Empty placeholder — ignored as instructed |
| `drmarktzone-stack/medscan-ai` | 36688 | Public |
| `drmarktzone-stack/medscan-connect` | 1053 | Public |

**No public repository named `opti-brain`, `OptiBrain`, or `optibrain` appeared.** Search `opti` / `optibrain` / `opti-brain` under that user returned 0. User `drmarktzone` (without `-stack`) 404. No public orgs. **This report does not invent a GitHub URL.**

Features were therefore merged from a **read-only** listing of Lovable project `1b75b82e-6b26-401e-aa7a-1ce137d0dfa8` (`name: opti-brain`, https://opti-brain.lovable.app). That Lovable project was **not** edited. To clone a private OptiBrain GitHub repo later, authenticate GitHub MCP or add a read-only `GH_TOKEN`.

## Demo — medical (pediatric, no keys)

1. Open **OptiBrain** (`/medical/optibrain`) for the 15-module desk, or `/medical` for the clinic landing builder.
2. On the homepage, click **הדגמה: מרפאת ילדים ד״ר סאמר אבו מוך** only when you want the demo. It is a button — it is **not** restored on reload if you chose **התחל קמפיין ריק** / **ابدأ حملة فارغة** or if the UI locale is Arabic. Unknown numbers stay empty / `[יש להשלים]` / `[يجب الاستكمال]`. Offer is **אין מבצע** / **لا يوجد عرض**.
3. Advance Type → Business → Details → Review, then **בנה לי קמפיין מלא**. Approve the three HITL gates (diagnosis, strategy, media). Empty price/tech/success rate become markers. Ethics banner stays on copy and on `/lp/:slug`.

General 5-agent OmniAd flow is unchanged on `/`.

Hebrew, Arabic, and English are equal first-class languages. Visual identity is dark **black + red + neon yellow**.

Read [PROJECT_SPEC.md](./PROJECT_SPEC.md) for the full contract.

## Run (free, one command)

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

**Origin does not host a public website for this repo.** `origin repo view` returns the git remote only. This environment has no `VERCEL_TOKEN`, and the Origin CLI has no deploy/pages command. To open SAWEK AD in a browser, run the command above locally, or use a tunnel to this machine while the agent is running.

Zero API keys required. Copy is generated from intake with templates. Optional:

```
OPENAI_API_KEY=                 # enrich /api/generate only
NEXT_PUBLIC_SUPABASE_URL=       # optional campaign sync
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Copy `.env.example` if you want those. The app runs the same without them (localStorage).

## Demo walkthrough (no typing)

1. On **בניית קמפיין** (`/`) or **OptiBrain** (`/medical/optibrain`) click the yellow **הדגמה: מרפאת ילדים ד״ר סאמר אבו מוך** (AR/EN labels work the same).
2. The OmniAd wizard opens at **Business** (step 2) with the clinic filled — including WhatsApp **052-8885800**. Offer is **אין מבצע**. Unknown budget/CAC stay blank.
3. Click **המשך** through Details → Review, then **בנה לי קמפיין מלא**. The five-agent HITL starts immediately (no CMO numbers invented).
4. Approve HITL gates: diagnosis → strategy → media → optimizer.
5. Open **דיסקברי / אסטרטגיה / קריאייטיב / מדיה / לידים / אופס** — the full agency pack in HE+AR+EN.
6. Or from any department, click **טען פק הדגמה מלא** so no screen is empty.
7. Download the campaign bible PDF from Ops. Save. **קמפיין חדש** / **ابدأ حملة فارغة** clears the draft, keeps the current language, and returns to wizard step 1. The stepper jumps to completed steps. Locale is stored in `localStorage`, `?lang=`, and React state so العربية survives every nav/hash change.

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
| Medical desk (clinic, specialty, campaign, ethics) | `/medical` |
| Public landing | `/lp/[slug]` |
| Medical leads CRM | `/medical/leads` |
| Appointments | `/medical/appointments` |
| Claim credibility | `/medical/credibility` |
| OptiBrain desk (15 modules) | `/medical/optibrain` |
| What is SAWEK AD | `/about` |
| Self-marketing | `/self` |

No live ad-network APIs. No credit card. No invented lead gauges. KPI numbers appear only from budget/CAC you typed.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn-style primitives

Repo: this Origin project only. Originals (OmniAd Base44, AdBrain GitHub/Origin, OptiBrain Lovable `1b75b82e`) are untouched. No GitHub URL is claimed for OptiBrain until a repo named opti-brain is visible.
