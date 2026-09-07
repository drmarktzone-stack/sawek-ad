# SAWEK AD — Phase 2 FINAL REPORT

Scope: this repo only (`drmarktzone-stack/sawek-ad`). Live host checked from this VM: `https://sawek-ad-308665814452.me-west1.run.app`. SawekSelfAD / Origin SelfAD were not opened. Prior `docs/PRODUCTION_AUDIT.md` was re-read as a claim list, then re-verified against current code. Missing live facts are marked **UNKNOWN**.

---

## 1. Production issues fixed

Re-verified (not trusted from the audit doc):

| Issue | What the code actually did | Fix in this PR |
|---|---|---|
| Anon RLS `using (true)` on `campaigns` | `scripts/supabase-campaigns.sql` allowed the anon key to `SELECT` every row. App listed via owner/client filters after PR #15, but a raw anon client could still dump the table **if** that SQL was applied live. | Dropped that policy. Anon may read **only** `share_enabled = true`. Authenticated policies stay `owner_id = auth.uid()`. |
| Browser Supabase client had **no user JWT** | Cookie auth (`sawek-sb-access`) never reached `createClient` in `lib/supabase.ts`. Owner RLS would reject browser upserts; unscoped fallback could leak. | Signed-in save/list/get go through `GET/POST /api/campaigns` + `GET/PATCH /api/campaigns/[id]` using the cookie session. Service role still filters by `owner_id`. Browser client no longer does an unscoped `select *`. |
| `GET /api/campaigns/[id]` used service role with no authz | Any id returned any pack. | Returns 404 unless the caller is the owner **or** the row is `share_enabled`. |
| Vertex / Translate / Pro / research had **no app rate limit** | Anonymous templates must keep working. | Per-instance sliding window. On trip, routes return honest `reason: "rate_limited"` and `useTemplates: true` (or Pro `down: true`). Templates still run. |
| Demo → New Campaign leftover paths | Clinic draft was guarded; olive/sand names were not in the empty-session blocklist; `latestPack()` could refill departments; medical leads/appointments from the peds demo could remain; scientist demo blob did not exist yet. | Blocklist includes Olive Kitchen / Sand Boutique. `latestPack()` returns null while the empty flag is on. Department shell listens for the empty event. Pediatric leads/appointments wiped. Demo scientist workspaces cleared. |
| Share-by-id vs ownership | Landing used remote-by-id without an owner check. | Same owner-or-share rule. Published demos still come from `/packs/published.json`. |

Honest leftovers that are **not** bugs:

- Live ad buying / live ROAS: still out of scope.
- Login-walled Facebook/Instagram ingest: still fails closed.
- 30-day calendar: still Pro.
- Bit/bank: still behind authenticated checkout; PayPal still off.
- **Live Supabase SQL apply from this VM: UNKNOWN** (no service-role proof that the new policies are on the hosted project).

---

## 2. Supabase RLS / owner isolation

**Shipped SQL**

- `scripts/supabase-campaigns.sql` — `owner_id` RLS for authenticated CRUD; `share_enabled` for anon SELECT; **no** `using (true)`.
- `scripts/supabase-scientist.sql` — `scientist_workspaces` + `scientist_entities`, owner-scoped.

**App path (works even if SQL is not applied yet)**

- `lib/campaign-server.ts` + `/api/campaigns*` stamp and filter `owner_id` from `sessionFromRequest`.
- `fetchRemoteCampaigns()` returns `[]` unless `ownerId` or `clientId` exists. No table-wide fetch.
- Cross-user write onto an existing `owner_id` is rejected (`forbidden`).

**Verification**

```bash
npm run verify:rls
```

The script asserts SQL/app invariants and tries a live REST ping **only if** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set. In this Cloud Agent VM that ping is **UNKNOWN** (credentials not present).

**Owner checklist (must be run in the Supabase SQL editor)**

1. Apply `scripts/supabase-campaigns.sql`.
2. Apply `scripts/supabase-scientist.sql`.
3. In Table Editor: confirm `campaigns.share_enabled` exists.
4. As user A: save a campaign while signed in. As user B (incognito): `GET /api/campaigns` must not include A’s rows; `GET /api/campaigns/{A-id}` must be 404 unless A set share.
5. Re-run `npm run verify:rls` on Cloud Run with the service role in env (server only — never `NEXT_PUBLIC_`).

---

## 3. Vertex rate limiting and honest AI failures

| Route | Limit (anon / 15 min / instance) | On trip |
|---|---|---|
| `/api/generate`, variations, viral, vision, score, `/api/viral` | 24 Vertex | `{ ok:false, reason:"rate_limited", useTemplates:true }` — HTTP 200 |
| `/api/generate/pro-desk` | same Vertex bucket | `{ tier:"pro", down:true, reason:"rate_limited" }` |
| `/api/imagen` | 8 | `{ ok:false, reason:"rate_limited", images:[] }` — never fake bytes |
| `/api/translate` | 40 | `{ ok:false, reason:"rate_limited" }` |
| `/api/research` | 20 | skeleton + `reason:"rate_limited"` |
| `/api/brand-voice` POST | 40 | `{ ok:false, reason:"rate_limited" }` |

Signed-in callers get 2× the window. This is **per Cloud Run instance**, not a global store — GCP quotas still apply. **UNKNOWN** whether two instances share a counter (they do not).

Anonymous **template overlays are not blocked**. The generate client already treats `ok:false` / `useTemplates` as “use intake templates”. Pro overlay already treats `down:true`.

Imagen / Translate / Pro were re-checked in code: failures stay `ok:false` / `down:true` with a reason. No success SVG. Live Cloud Run behavior of the **current production revision** for Vertex 200s is **UNKNOWN from this VM** (no ADC proof against the hosted service in this session). After deploy, confirm `/status` and `GET /api/gemini-status`.

---

## 4. Persistence and cross-browser ownership

When Supabase **and** a signed-in session exist:

1. Save stamps `ownerId` and `POST /api/campaigns`.
2. Dashboard and My Campaigns wait for auth, then `GET /api/campaigns` (cookie).
3. `/campaigns/[id]` uses `getCampaignMerged` → local → published demo → owner-or-share API.

A second browser of the **same user** can open the campaign after login. A second user cannot.

If Supabase is unset, localStorage remains the source of truth (documented). Cross-device persistence in that mode is **UNKNOWN / impossible by design**.

`shareEnabled` defaults false. Public `/lp/{id}` for a user pack works off-device only after the owner PATCHes share (API exists; no vanity toggle was added on the result chrome beyond the existing landing link).

---

## 5. Demo isolation

Demo → **קמפיין ריק חדש** now:

- Strips `?demo=` / pending demo keys.
- Writes a blank draft and a sticky empty flag.
- `latestPack()` returns null so Discovery/Strategy/Studio/Media/Leads do not show the last clinic/olive/sand pack.
- Wipes pediatric medical clinic/campaign/desk **and** matching leads/appointments.
- Clears `sawek-scientist-demo` only (user scientist workspaces are kept).
- Empty-session save blocks clinic + olive + sand + leftover real-brand names.

Saved **user** campaigns are still kept (product rule). `check:empty-campaign` was extended.

---

## 6. Security re-check (SSRF, authz, secrets, leakage)

Re-verified in this pass:

- URL ingest / vision / viral / social publish still use `inspectUrl` + DNS private-IP blocks + `selfHosts`.
- Public `/api/public-config` still exposes only the anon key + payment **flags** (not Bit phone / bank account).
- Service role stays server-only.
- Auth errors still strip password/token text.
- Open redirects still go through `safeNextPath`.
- Brand-voice POST remains usable while anonymous (viral desk contract) **plus** a rate limit. Tightening it to login would break unsigned voice save — left as a known limit.
- Campaign GET no longer dumps arbitrary ids via service role.

No new secrets were committed. `.env.example` unchanged except existing comments.

---

## 7. Scientist architecture and learning loop

Same app — no fork. Departments stay views of `CampaignPack`. A **GrowthWorkspace** is derived from evidence and stored locally + optionally remotely (`feature_type=scientist` blob, or `scientist_workspaces` after SQL).

Loop implemented in code (`lib/scientist/engines.ts` + `store.ts`):

`BUSINESS → DNA → AUDIENCE → COMPETITOR GAPS → OPPORTUNITY RADAR → HYPOTHESIS → EXPERIMENT → CREATIVE/CAMPAIGN (existing pack) → (user publish/execute) → PERFORMANCE (entered) → LEADS/CONVERSIONS (entered) → REVENUE (partial) → LEARNING ENGINE → UPDATE DNA → NBA`

AI split (`lib/scientist/ai-split.ts`): extraction / reasoning / scoring / learning / generation / validation. **Scoring and deltas are deterministic.** Vertex never marks a hypothesis `supported` without an entered baseline+actual.

Wired into: wizard save (`syncCampaign` → `ingestPack`), optimizer “enter results”, dashboard strip, `/growth*` desk, header / function rail / department rail, result-view CTA.

---

## 8. Schema

Owner-scoped, timestamped, evidence-bearing:

| Entity | Where |
|---|---|
| Business, DNA traits, audience nodes, competitor gaps, opportunities, hypotheses, experiments + variants + metrics, performance layers, leads (aggregate), conversions, revenue events, learnings, NBA, knowledge board | `GrowthWorkspace` JSON |
| SQL | `scientist_workspaces(payload)` + optional `scientist_entities` |
| Fallback | `campaigns` row with `feature_type='scientist'` |

Every trait/opportunity/hypothesis carries `EvidenceLink` (`user_input` | `observed_metric` | `calculated` | `ai_interpretation` | `hypothesis` | `public_research`) and `Uncertainty` high/medium/low/**unknown**.

---

## 9. Evidence / uncertainty / no fake intelligence

Hard rules enforced in engines + `check:scientist`:

- No invented competitor names.
- No fake win probability on the radar.
- Hypothesis status stays `open` until comparable baseline/actual exist. AI does not stamp true from copy.
- Experiment delta = actual − baseline. Copy says “not statistical significance.”
- Creative battle: planning score labeled **pre-publish ≠ actual**. Actual stays UNKNOWN until a metric is entered.
- Performance layers are split: observed / calculated / AI interpretation / hypothesis. Funnel steps render UNKNOWN when the input is missing.
- Revenue = purchases × stated AOV or a user-entered amount. Attribution confidence is **low** or **unknown**. Never fabricated ROAS.
- Knowledge board: WHAT WE KNOW / THINK / DON’T KNOW.

---

## 10. UX (decision-first, RTL, wiring)

- `/growth` is a decision board: what happened / learned / opportunity / next + the three knowledge columns.
- Detail routes: `/growth/dna|audience|competitors|radar|hypotheses|experiments|performance`.
- Dashboard shows a compact NBA strip when a workspace exists.
- HE / AR / EN strings in `lib/i18n.ts`. Pages use `dir` from locale (RTL for he/ar).
- Empty and partial states say **UNKNOWN**, not a vanity chart.
- Existing Strategy / Campaign / Creative / Analytics (optimizer) / Leads routes are unchanged as department views; they feed the scientist instead of being replaced.

Mobile: stacked cards, overflow-x rails (same pattern as departments). **Browser E2E of the live Cloud Run revision after this deploy is UNKNOWN until a human or browser pass on the new revision.** Local component structure matches existing department shells.

---

## 11. Self-validation / E2E

**Automated (this PR, run in the VM)**

| Check | Result |
|---|---|
| `npm run check:scientist` | PASS (this VM) |
| `npm run verify:rls` | PASS app/SQL guards; live DB **UNKNOWN** (no service role) |
| `npm run check:empty-campaign` | PASS |
| `npm run check:vertex-stack` | PASS |
| orchestrator / payments / url-ingest | PASS (this VM) |

**Manual / environment-limited (UNKNOWN unless noted)**

| Scenario | Status |
|---|---|
| New user, empty campaign | Local `/growth` empty desk: no invented DNA/charts (browser, this VM) |
| Existing user, multiple campaigns | Workspace keyed by business id; campaign ids appended |
| Demo user → New Campaign | Browser: clinic demo → New Campaign → `/discovery` empty; `/growth` did not keep demo DNA |
| Experiment create + result → DNA + NBA | `check:scientist` PASS |
| Signed-in persistence, second browser | Code path present; **live Supabase apply UNKNOWN** |
| Cross-user isolation | Unit + `GET /api/campaigns` anonymous `[]`; `POST` 401; live two-account **UNKNOWN** |
| AR/HE RTL | Browser: HE/AR RTL and EN LTR on home + `/growth` |
| Mobile ~390px | **PARTIAL / UNKNOWN** — DevTools device mode failed in the agent browser |
| API/AI failure | Rate-limit tripped locally (`useTemplates:true`); Imagen 403 `plan_required` when unsigned |
| Unauthorized campaign GET | 404 missing id; POST without session 401 |
| Live Vertex/Imagen/Translate on **hosted** Cloud Run revision | **UNKNOWN in this session** |

---

## 12. Final Production Readiness /100

**80 / 100** for this revision (code + static checks + local browser on `/`, `/growth`, demo isolation, HE/AR/EN).

Not 100: live RLS was not applied or proven from this VM; live Vertex/Imagen/Translate on the **hosted** revision were not re-proven here; two-browser signed-in persistence and two-account isolation were not executed against production credentials; mobile 390px was only a partial attempt.

Ship-safe for: template campaigns with honest AI fallbacks, owner-scoped **app** APIs, evidence-only scientist desk, three demos, HE/AR/EN, gated Bit/bank (unchanged). Not yet a multi-tenant agency OS with proven hosted RLS.

### Cloud Run deploy notes

1. Apply the two SQL files in Supabase (required for hosted isolation).
2. Redeploy this revision (`Dockerfile` unchanged: `next start --hostname 0.0.0.0 --port 8080`).
3. Confirm env on the service: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` (server), Vertex ADC via the Cloud Run SA, `APP_BASE_URL`.
4. Hit `/status` and `GET /api/gemini-status`. A down Vertex must show a reason — never a fake pack.
5. Signed-in: save → logout on another browser → login → `/dashboard` and `/growth`.
6. Repeat Demo → New Campaign on HE and AR.
