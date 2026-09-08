# SAWEK AD — Prompt 6 Design Overhaul

**Repo:** `drmarktzone-stack/sawek-ad`  
**Base:** `main` @ `f902583` (PR #22 scan-truth isolation, Cloud Run `sawek-ad-00088-bkv`)  
**Live inspected:** `https://sawek-ad-308665814452.me-west1.run.app/?lang=he` and `/task/ad`  
**Constraint:** presentation + UX layer only. Zero content / feature / engine / language / route loss.

This revision is **not** claimed live on Cloud Run until a human deploys it.

---

## Inventory (inspected before coding)

### Routes (verified in `app/**/page.tsx`)

| Route | Role | Primary component |
| --- | --- | --- |
| `/` | Home + scan + HITL wizard | `home-studio.tsx` + `wizard-flow.tsx` |
| `/task/ad` | Primary Create Ad workspace | `task-workspace.tsx` |
| `/dashboard` | Campaign/lab index + growth strip | `dashboard-page.tsx` |
| `/campaigns`, `/campaigns/[id]` | Saved campaigns | `campaigns-list.tsx`, `result-view.tsx` |
| `/studio` | Creative dept + studio + variations + viral | `dept-creative`, `content-studio`, `variations-panel` |
| `/discovery` `/strategy` `/media` `/leads` | Department shells | `dept-*` |
| `/growth` + dna/market/patterns/experiments/hypotheses/audience/competitors/performance/radar | Growth Scientist | `growth-desk.tsx`, `market-desk.tsx` |
| `/lab` `/viral` `/self` | Lab, viral, self-marketing | existing |
| `/plan/[id]` `/lp/[slug]` | Plan + public landing | existing |
| `/pricing` `/checkout` `/checkout/pending` `/billing/bank` | Honest Bit + Bank checkout | existing |
| `/login` `/signup` `/settings/social` `/status` `/about` `/privacy` `/terms` | Auth + legal + status | existing |
| `/medical/*` | Legacy OptiBrain | preserve |

### Real post-scan / create flow (must stay)

1. Header `UrlIngest` scan → review dialog → `applyIntakeToDraft` → **redirect `/task/ad`**
2. `/task/ad` hydrates draft, builds `TaskContext`, runs **existing** `assemblePack` + `overlayPackAgency` on Create Complete Ad
3. `CompleteAdCard` + `CampaignAdVisual` (image-composition protection)
4. Wizard HITL remains on `/` `#studio` and embedded on `/task/ad`

### Data sources allowed for Command Center (no invention)

- Draft intake / latest user pack (`loadDraft`, `latestPack`, `loadCampaigns`)
- Growth workspace (`getPrimaryWorkspace`) — NBA, opportunities, experiments, learnings, market patterns
- Intake completeness / diagnosis gaps already computed
- Honest `UNKNOWN` when a field or workspace is missing

### AI architecture (do not touch)

Business Truth, Campaign Context, Creative History, Market Intelligence, AI Insights, Generated Output, Novelty Engine, Validation Gate, Learning/Experiment engines, Market Scanner, business isolation, fact validation, `lib/engine/image-composition.ts`.

### Old → new UX mapping

| Old | New (same routes/APIs) |
| --- | --- |
| 16 equal header chips | Grouped command nav + More + mobile dock |
| Home = long marketing scroll + buried wizard | Home = Command Center; marketing kept in disclosure; wizard stays at `#studio` |
| Dashboard = card list | Dashboard = TODAY + module summaries + campaign table |
| `/task/ad` stacked boards | Focused workspace: summary → Create Complete Ad → product preview |
| Complete Ad = dark text wall | Product hierarchy: hook / copy / CTA / visual + progressive disclosure |
| Function rail = 9 cards | Compact module strip (all functions kept) |
| Growth boards = equal white cards | Sections / lists / status badges; same data |
| Studio = stacked dept blocks | Campaign → concept → preview → copy → visual → variants hierarchy labels |
| Ivory + rainbow accents | Desk Noir evolved: ink chrome, paper canvas, one teal accent |

---

## A. What was redesigned

- **Design tokens** (`app/globals.css`): Desk Noir evolved — ink chrome, paper canvas, one teal accent, semantic coral/ok/warn only. Less shadow, tighter radius, new OS utilities (section, row, tab, table, dock, badges).
- **Navigation**: grouped Command / Create / Campaigns / Studio / Market + More (DNA, Experiments, Leads, and every previous route). Mobile bottom dock. All old function-rail links still in the menu.
- **Home**: Command Center hero (Create Complete Ad + scan + empty campaign). TODAY + module summaries + campaign table from real local data only. Marketing how/vs/pricing kept in a disclosure. Wizard still at `#studio`.
- **Dashboard**: Command context + TODAY + summaries + existing campaign/lab table (same fetch/sync).
- **`/task/ad`**: compact scan summary, dominant Create Complete Ad, real-route next actions, Complete Ad as product hierarchy, wizard in disclosure.
- **Complete Ad**: hook / primary copy / CTA / visual first; why / evidence / novelty / scores behind disclosure; overlay SAFE / LIMITED / NOT RECOMMENDED from `imageComposition`.
- **Growth Scientist**: sections + lists instead of equal cards; DNA split FACTS / INSIGHTS / HISTORY; experiment PLANNED / RUNNING / COMPLETED / LEARNED badges.
- **Studio / campaigns / department shell / demo picker**: hierarchy labels, table-like lists, compact demos (same `data-demo` + `startDemoFlow`).

## B. What existing functionality was preserved

- Every route in the inventory (including `/medical/*`, checkout, auth, legal, viral, lab, self).
- Scan → review → `/task/ad` redirect; one-click `assemblePack` + `overlayPackAgency`; novelty / fact / validation fields and `data-testid`s.
- Image composition engine (`lib/engine/image-composition.ts`) untouched; UI only surfaces its decision.
- Market Intelligence, Business DNA, experiments, leads, campaigns, HITL wizard, demos, pricing/checkout, Vertex badge.
- HE / AR / EN dictionaries expanded, not replaced. No fake ROAS / metrics / publishing.

## C. Routes/screens changed

Presentation-only on: `/`, `/dashboard`, `/task/ad`, `/campaigns`, `/studio`, `/growth*`, department shells (`/discovery` `/strategy` `/media` `/leads`), plus global header/footer/dock. URLs unchanged.

## D. Major UX improvements

- User lands on decisions (what happened / opportunity / problem / next action) instead of a marketing wall.
- Create Complete Ad is the primary action on home, header, dock, and task workspace.
- Dashboard is navigation + intelligence summaries.
- Generated ad reads as a finished creative, not a chat dump.
- Overlay honesty and UNKNOWN placeholders instead of invented numbers.
- Mobile dock keeps Create / Command / Campaigns / Market one tap away.

## E. Mobile/RTL/LTR verification

Verified on local `next dev` (127.0.0.1:43147):

| Viewport | Locale | Result |
| --- | --- | --- |
| ~1440 desktop | HE RTL | Command hero, grouped nav, TODAY UNKNOWN when empty |
| ~1440 desktop | EN LTR | Layout mirrors; English chrome |
| 768 tablet | HE | Stacked CTAs, no overflow |
| 390 mobile | HE | Dock + hamburger; no horizontal overflow |
| 390 mobile | AR RTL | Arabic chrome, mirrored dock |

Demo **מטבח הזית** → `/task/ad` → Create Complete Ad produced hook / copy / CTA (real pipeline). Screenshots in PR artifacts.

## F. Regression test results

**Automated (PASS):**
`check-scan-truth`, `check-url-ingest`, `check-prompt5`, `check-ad-engine`, `check-payments`, `check-scientist`, `check-market-intel`, `check-ux-readability`, `check-empty-campaign`, `check-product-path`, `check-cmo-product`

**Manual / scripted against this revision:**

| # | Check | Result |
| --- | --- | --- |
| 1–3 | Scan chrome present; scan still routes to `/task/ad`; Create Complete Ad runs existing pipeline | PASS (demo path exercised) |
| 4–10 | Diversity / novelty / isolation / contamination | Covered by prompt5 + ad-engine (engine unchanged) |
| 11–12 | Market Intelligence + honest UNKNOWN | PASS (empty UNKNOWN; no invented metrics) |
| 13–14 | Overlay status from composition decision | PASS (badge wired; engine unchanged) |
| 15–17 | HE / AR / EN | PASS |
| 18–19 | Mobile 390 / desktop 1440 | PASS |
| 20 | Refresh/state | Draft/local storage unchanged |
| 21–25 | Campaigns, leads, experiments, self, demo isolation | Routes 200; demo isolation engines unchanged |
| 26–28 | Empty / error / no fake data | PASS (UNKNOWN, empty workspace) |
| 29 | No broken routes | All inventoried routes HTTP 200 |
| 30 | Console | Unauthenticated `POST /api/scientist` 401 is **pre-existing** (growth desk / dashboard remote sync when logged out). No new critical client exceptions on home/task. |

## G. Remaining real limitations

- Header URL scan remains always-on chrome (required existing flow) — it still consumes vertical space on mobile.
- HITL wizard is still a long form; it is disclosed on `/task/ad` and kept at `#studio` on home (not deleted).
- Some older department interiors (`dept-*`, viral, lab, medical) inherited tokens/shell but were not fully rewritten.
- More menu does not dismiss on outside click.
- Command Center summaries read **local** draft/workspace only — no new API calls; remote scientist sync still 401 until login (same as before).
- Not deployed. Live Cloud Run is still PR #22 until a human ships this.

## H. Production readiness score /100

**86 / 100** for this UX revision (functionality still ~90 from PR #22).

Deducted for: remaining dept interiors, scan-bar density on 390, unauthenticated scientist 401 (pre-existing), and no production deploy yet. Ready for human review and deploy — do not self-merge.
