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

## Demo pack set (exactly 3)

1. **demo-samer-clinic** — real pediatric clinic (owner-approved).
2. **demo-olive-kitchen** — fictional Mediterranean restaurant «מטבח הזית» / «مطبخ الزيتون» / Olive Kitchen in fictional **נווה שקד** (not a real brand).
3. **demo-sand-boutique** — fictional clothing boutique «בוטיק חול» / «بوتيك الرمل» / Sand Boutique in fictional **עין ברק** (not a real brand).

Homepage / wizard / campaigns expose all three as selectable demos. **New empty campaign** never auto-loads any demo. Only the clinic may be a real business demo — do not ship Pizza Hut, Aluf Sport, or other real brands without permission.

`public/packs/published.json` contains only these three ids. Rebuild with `npx tsx scripts/publish-three-demos.ts` and QA with `npx tsx scripts/qa-three-demos.ts`.

Each pack is built by the app engines with a **CMO idea pack**: distinctive platforms/hooks, planning scorecards (1–100 — never ROAS/CAC/likes), gap-compensation moves, studio still SVGs under `public/packs/assets/`, and idea names on the demo picker.

General 5-agent OmniAd flow is unchanged on `/`.

Hebrew, Arabic, and English are equal first-class languages. Visual identity is dark **black + red + neon yellow**.

Read [PROJECT_SPEC.md](./PROJECT_SPEC.md) for the full contract.

## Run locally (no keys)

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

Zero API keys required. Copy is generated from intake with local templates. The app does **not** call Cloud Run, Vertex, or any billed GCP API unless you already have Application Default Credentials on a GCP runtime.

## Deploy free on Vercel Hobby (no card, no GCP)

Vercel Hobby is the free host. Do not add a payment method. Do not enable Google Cloud billing. Do not create a Cloud Run service.

1. Create a free Gemini key at [Google AI Studio](https://aistudio.google.com/apikey). No credit card. You can skip this step — the site still builds and serves template copy.
2. Push this repo to GitHub (the branch that contains `vercel.json`).
3. Sign in at [vercel.com/new](https://vercel.com/new) with the Hobby plan. Import the GitHub repo. Framework preset: **Next.js**. Do not change the plan to Pro. If Vercel asks for a card, cancel — Hobby does not need one.
4. Environment variables (Project → Settings → Environment Variables), then Deploy:

| Name | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | No | Free AI Studio key. Live copy, stills, and HE/AR/EN translation. Empty = local templates. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical URL after you attach a domain, e.g. `https://sawek.example`. Empty = `https://$VERCEL_URL`. |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Optional campaign sync. Empty = browser localStorage. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Pairs with the Supabase URL. |
| `TOKEN_ENCRYPTION_KEY` | No | 64 hex chars. Only if you connect Facebook or LinkedIn OAuth. |

Do **not** set `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION`, or `GOOGLE_APPLICATION_CREDENTIALS` on Vercel. Those opt into paid Vertex and are ignored without a GCP service account.

5. After the deployment is Ready, open the `*.vercel.app` URL. `GET /` returns 200. `GET /api/gemini-status` returns JSON (`provider: "ai_studio"` when the key is set, `provider: "none"` when it is not).

Build command is `npm run build` (`vercel.json`). Functions under `app/api` use `maxDuration` 60, which is the Hobby ceiling. Region is `iad1` (included on Hobby).

### If the Vercel CLI is already logged in

From the repo root, with `VERCEL_TOKEN` or an existing `vercel login` session (Hobby scope only):

```bash
npx vercel deploy --yes --prod
```

Do not pass `--scope` for a team that has billing, and do not run `vercel integration` or any command that adds a payment method.

### Cloudflare Pages

Not the default. Next.js 16 on Cloudflare still needs their Next adapter and does not match this `vercel.json`. Prefer Vercel Hobby. A static `output: "export"` build would drop the API routes (`/api/generate`, `/api/gemini-status`), so do not switch this app to a static export just to sit on Pages.

Gemini 1.5 Pro/Flash stay mapped to **gemini-2.5-pro** / **gemini-2.5-flash** for an optional Vertex opt-in. On the free key, text uses the AI Studio flash/pro list and stills use **gemini-2.5-flash-image** through the Gemini API. Status: `/status` and `GET /api/gemini-status`. Check routing with `npm run check:vertex-stack`.

Hook/retention scores are Gemini **estimates**, never live platform metrics or fake ROAS.

Copy `.env.example` if you want the optional names. The app runs the same without them (localStorage).

## Pro payments (Bit + bank — PayPal off)

Public **`/pricing`** shows plans and prices only. Checkout is **`/checkout`** after sign-in. Bit / Bank Hapoalim receive numbers appear **only** after a logged-in customer picks a method, together with a `SAWEK-XXXX` order code. PayPal Business for `drmarktzone@gmail.com` is **permanently deactivated** — do not set `PAYPAL_ME`.

Customers tap **«שילמתי»**. That creates a **pending review**. Pro is never auto-upgraded. Owner confirms on `/billing/bank`. Stripe cards stay off until real keys are set. No fake success screen. No invented IBAN. `GET /api/public-config` must not leak Bit phone or bank account.

Documented env + Cloud Run commands: [docs/PAYMENTS.md](./docs/PAYMENTS.md). Check with `npm run check:payments`.

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
