/**
 * Evidence-only Growth Scientist: no fake ROAS, p-values, or invented competitors.
 */
import { readFileSync } from "fs";
import { join } from "path";
import type { CampaignPack, Intake } from "../lib/types";
import { emptyIntake } from "../lib/engine/validate";
import {
  applyLearning,
  experimentDeltas,
  experimentOutcomeFromMetrics,
  extractCompetitors,
  extractRevenue,
  forbiddenScientistClaims,
  workspaceFromPack,
} from "../lib/scientist/engines";
import { completeExperiment, recordExperiment } from "../lib/scientist/store";

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

const mem = new Map<string, string>();
const g = globalThis as unknown as { window: { localStorage: Storage }; localStorage: Storage };
function storage(): Storage {
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => {
      mem.set(k, String(v));
    },
    removeItem: (k) => {
      mem.delete(k);
    },
    clear: () => mem.clear(),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  } as Storage;
}
g.localStorage = storage();
g.window = { localStorage: g.localStorage };

function pack(intake: Partial<Intake>, extra?: Partial<CampaignPack>): CampaignPack {
  const i = { ...emptyIntake(), ...intake };
  const base: CampaignPack = {
    id: extra?.id ?? "camp-test",
    createdAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-07T00:00:00.000Z",
    name: extra?.name ?? i.businessName ?? "test",
    intake: i,
    intakeReport: { completeness: 20, missing: [], inconsistencies: [], refusedGuesses: [] },
    diagnosis: {
      summary: { he: "", ar: "", en: "" },
      hypotheses: extra?.diagnosis?.hypotheses ?? [],
      approved: false,
    },
    variants: [],
    strategy: [],
    media: {
      split: [],
      assumptions: [],
      missingForLiveBuy: [],
      worstCase: { he: "", ar: "", en: "" },
      realistic: { he: "", ar: "", en: "" },
      scenarioFromUserNumbers: false,
    },
    optimizer: { ifThen: [], killRules: [], scaleRules: [] },
    optimizerRuns: extra?.optimizerRuns ?? [],
    producedAds: [],
    agentStatus: {
      intake: "complete",
      diagnostic: "complete",
      strategic: "complete",
      media: "complete",
      optimizer: "complete",
    },
    saved: true,
    planActivated: false,
  };
  return { ...base, ...extra, intake: i, name: extra?.name ?? i.businessName ?? base.name };
}

const empty = workspaceFromPack(pack({ businessName: "" }, { name: "" }));
if (empty.competitors.missing !== true) fail("empty intake should have missing competitors");
if (empty.revenue.confidence !== "unknown") fail("no revenue should be unknown");
if (!/Name the business|Add one competitor|Enter spend/i.test(empty.nba.action)) {
  fail(`empty NBA should demand identity or evidence, got ${empty.nba.action}`);
}

const named = workspaceFromPack(
  pack({
    businessName: "עיר המותגים",
    category: "retail",
    audience: "neighbors",
    biggestProblem: "no walk-ins",
  }),
);
if (!named.dna.traits.some((t) => t.topic === "identity" && t.kind === "know")) fail("DNA identity must be know");
if (named.competitors.gaps.length) fail("must not invent competitor gaps");
if (named.opportunities.some((o) => /probability|%/i.test(o.whyNow) && o.confidence !== "unknown")) {
  fail("opportunity must not invent probability");
}

const withComp = workspaceFromPack(
  pack({
    businessName: "עיר המותגים",
    competitors: [{ id: "c1", name: "חנות רחוב", url: "", notes: "שלט גדול" }],
  }),
);
if (withComp.competitors.gaps.length !== 1) fail("user competitor must appear once");
if (withComp.competitors.gaps[0]?.competitorName !== "חנות רחוב") fail("competitor name must stay user-supplied");

const withResults = workspaceFromPack(
  pack(
    { businessName: "עיר המותגים", avgOrderValue: "100", targetCac: "40" },
    {
      optimizerRuns: [
        {
          createdAt: "2026-09-07T12:00:00.000Z",
          input: { spend: "200", leads: "4", purchases: "2", ctr: "1.2", notes: "" },
          advice: [{ he: "CPA מחושב", ar: "", en: "CPA calculated" }],
        },
      ],
    },
  ),
);
if (!withResults.performance.observed.some((o) => o.label === "spend")) fail("observed spend missing");
if (!withResults.performance.calculated.some((o) => o.label === "cpa")) fail("CPA must be calculated in code");
if (withResults.revenue.total !== 200) fail(`revenue should be 2×100=200, got ${withResults.revenue.total}`);
if (withResults.revenue.confidence === "high") fail("must not claim high revenue confidence");

const deltas = experimentDeltas([
  { name: "leads", baseline: 10, actual: 14 },
  { name: "ctr", baseline: 1, actual: 0.8 },
]);
if (deltas.length !== 2) fail("both numeric metrics should delta");
if (deltas.some((d) => /significant/i.test(d.note))) fail("delta note must not claim significance");
if (experimentOutcomeFromMetrics([{ name: "leads", baseline: 10, actual: 14 }]) !== "improved") fail("improved");
if (experimentOutcomeFromMetrics([{ name: "leads", baseline: 10 }]) !== "unknown") fail("missing actual = unknown");

let ws = workspaceFromPack(pack({ businessName: "עיר המותגים" }));
ws = recordExperiment(ws, {
  name: "hook test",
  status: "running",
  variants: [
    { id: "a", name: "A", notes: "" },
    { id: "b", name: "B", notes: "" },
  ],
  metrics: [{ name: "leads", baseline: 3 }],
  notes: "",
});
if (ws.experiments[0]?.outcome !== "unknown") fail("running without actual must be unknown");
ws = completeExperiment(ws, ws.experiments[0]!.id, [{ name: "leads", baseline: 3, actual: 6 }]);
if (ws.experiments[0]?.outcome !== "improved") fail("completed improved");
if (!ws.learnings.length) fail("learning record missing after result");
if (!ws.dna.traits.some((t) => t.topic === "experiment")) fail("DNA not updated from experiment");
if (ws.hypotheses.some((h) => h.status === "supported" && !h.result)) fail("supported without result text");
if (forbiddenScientistClaims("statistically significant p<0.05 predicted ROAS")) {
  /* good */
} else fail("forbiddenScientistClaims should catch fake science");
if (forbiddenScientistClaims("CPA ≈ 50 from spend/leads")) fail("real CPA language is not forbidden");

const learned = applyLearning(ws);
if (!learned.nba.action) fail("NBA must exist after learning");
if (/win probability|p < 0.05|ROAS 3x/i.test(JSON.stringify(learned))) fail("learning payload leaked fake science");

const src = {
  engines: readFileSync(join(process.cwd(), "lib/scientist/engines.ts"), "utf8"),
  desk: readFileSync(join(process.cwd(), "components/scientist/growth-desk.tsx"), "utf8"),
  sql: readFileSync(join(process.cwd(), "scripts/supabase-scientist.sql"), "utf8"),
};
if (/p-value|p\s*<\s*0\.05|chi-squared|t-test/i.test(src.engines) && !src.engines.includes("forbiddenScientistClaims")) {
  fail("engines must not compute significance");
}
if (!src.desk.includes("sci.exp.nosig")) fail("UI must label no significance");
if (!src.sql.includes("owner_id")) fail("scientist schema must be owner-scoped");

if (failures.length) {
  console.error("FAIL scientist\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS scientist: DNA/audience/competitors/radar/hypothesis/experiment/learning/NBA — evidence only");
