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

_(filled after implementation)_

## B. What existing functionality was preserved

_(filled after implementation)_

## C. Routes/screens changed

_(filled after implementation)_

## D. Major UX improvements

_(filled after implementation)_

## E. Mobile/RTL/LTR verification

_(filled after implementation)_

## F. Regression test results

_(filled after implementation)_

## G. Remaining real limitations

_(filled after implementation)_

## H. Production readiness score /100

_(filled after implementation)_
