# SAWEK AD — Production audit (2026-09-07)

Scope: this repo only (`sawek-ad`). Live checked: `https://sawek-ad-308665814452.me-west1.run.app`. SawekSelfAD not touched. No new product surfaces. No credit-card billing changes.

## A) What you found

- Clinic demo could return from session leftovers (`consumePendingDemo`), department `latestPack()`, a generic “load demo” default, medical localStorage, and unknown `/lp/*` 404s — not only an explicit Demo click.
- New-campaign empty path was otherwise guarded (`check:empty-campaign` already passed). Saved packs were kept (correct).
- Wizard + URL ingest invented `facebook, instagram` when the page never named those channels.
- Supabase `campaigns` used anon key with `using (true)` RLS. Dashboard merged every remote row into the browser. Live `/api/public-config` exposes the anon key (expected for the current client) and Bit/bank flags only — no receive numbers.
- `/lp/[slug]` resolved packs from this device’s localStorage + three published demos. Share-by-link on another device was empty, then offered the pediatric clinic.
- Owner confirm wrote payment **method** (`bit`/`bank`) into `billing_interval`. `mark-paid` returned `ok: true` even when Supabase did not persist — owner queue never saw a local-only tap.
- `/api/social/publish` fetched any `http(s)` `imageUrl` (SSRF). Vertex/Gemini routes stay anonymous (app must run without login); only Imagen is plan-gated. Brand-voice POST is unauthenticated.
- Imagen `publicUrl` pointed at in-memory `/api/imagen/:id` — 404 after Cloud Run restart. API already returned `imageBase64`.
- Result pack showed a permanently disabled “Publish” button while `PublishToSocial` above it is the real control.
- Honest limitations that are **not** bugs: no live Meta/Google/TikTok buying; planning scores are not ROAS; login-walled social ingest fails closed; 30-day calendar is Pro; Bit/bank stay behind authenticated checkout; PayPal hard-off.

## B) What you fixed

- Demo only from `?demo=` / Demo picker. Session leftovers no longer refill the wizard. `latestPack()` skips published/demo packs. Department generic clinic button removed. New Campaign wipes pediatric medical leftovers. Unknown landing is a neutral 404 + home, not the clinic.
- Stop inventing Facebook/Instagram channel notes in the wizard and ingest.
- Stamp `ownerId` / `clientId` on sync; dashboard waits for auth and does not merge unsigned foreign rows. SQL file now has owner RLS + share-by-id note. `GET /api/campaigns/[id]` + remote-by-id so a saved landing can load off-device when Supabase is configured.
- Confirm preserves `monthly`/`yearly`. `mark-paid` returns 503 when the owner queue was not written; checkout shows an honest message.
- Social publish uses the URL-ingest SSRF guards (plus same-origin Imagen).
- Imagen `publicUrl` is now a data URL so selected stills survive instance recycle.
- Dead publish button removed. Vertex QA accepts `attachResearchAndSync`.

## C) What remains unfixable and why (honest blockers)

- **Production RLS is not applied by this PR.** SQL is in-repo. Until the owner runs it, the anon key can still `SELECT` all campaign rows directly. The app no longer *displays* unsigned foreign packs.
- **Vertex/Gemini/Translate/research stay callable without login.** Gating them like Imagen would break the “runs with zero keys / anonymous template overlay” contract. Cost abuse is a Cloud Run/GCP quota problem, not a UI bug.
- **Landing off-device needs Supabase (or the original device).** There is no object store. Medical `/lp` slugs are still localStorage-only.
- **No live ad accounts, no real ROAS, no login-wall crawl.** Those are product limits, not missing screens.
- **Brand-voice POST is still public** (viral desk writes it while anonymous). Tightening it would break unsigned viral voice save.
- **Owner must apply `scripts/supabase-campaigns.sql` and confirm the live Cloud Run revision has Vertex/Imagen/Translate.** This agent cannot change GCP/Supabase console.

## D) Production Readiness score /100

**71 / 100** after these fixes (was ~58). Ship-safe for template campaigns, three demos, HE/AR/EN, and gated Bit/bank. Not yet a multi-tenant agency OS.

## E) Top 5 must-be-solid items before next phase

1. Apply `scripts/supabase-campaigns.sql` on the live project and confirm dashboard isolation.
2. Add auth + rate limits on Vertex routes **without** killing anonymous template generation.
3. Prove Imagen / Translate / Pro desk on the **deployed** Cloud Run revision (not only local scripts).
4. End-to-end: signed-in save → `/lp/{id}` on a second browser (Supabase path).
5. Repeat New Campaign after each demo: empty wizard, empty medical desk, no clinic on `/discovery`.
