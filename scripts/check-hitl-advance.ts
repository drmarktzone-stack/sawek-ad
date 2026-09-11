/**
 * HITL approve/continue must never silently no-op or grey-out.
 * Default path auto-approves every gate to a finished campaign.
 * Covers Prompt 6 status mismatch after scan → /task/ad assemble.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack, idleStatus } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { generateStrategy } from "../lib/engine/strategy";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import {
  hitlCtaDisabled,
  hitlCtaKey,
  nextHitlGate,
  shouldResumeAgents,
  simulateAutoHitlGates,
} from "../lib/engine/hitl";
import { fillIntakeFromScanTruth } from "../lib/campaign-prefill";
import { t } from "../lib/i18n";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentId, AgentStatus, CampaignPack, Intake } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

function aamLike(): Intake {
  return {
    ...emptyIntake(),
    businessName: "AAM",
    category: "ציוד משרדי",
    description: "חנות ציוד משרדי",
    location: "ישראל",
    website: "https://www.aam.co.il",
    audience: "עסקים",
    biggestProblem: "צריך אספקה מהירה",
    uniqueAdvantage: "מלאי מקומי",
    mainGoal: "leads",
    offer: "אין מבצע",
  };
}

function packOf(
  intake: Intake,
  extra: {
    agentStatus: Record<AgentId, AgentStatus>;
    approved?: boolean;
    withStrategy?: boolean;
  },
): CampaignPack {
  const report = validateIntake(intake);
  const diagnosis = diagnose(intake, report);
  const variants = generateVariants(intake);
  const strategy = extra.withStrategy ? generateStrategy(intake, { ...diagnosis, approved: true }) : [];
  const media = generateMedia(intake);
  return assemblePack(intake, {
    report,
    diagnosis: extra.approved
      ? { ...diagnosis, approved: true, approvedAt: new Date().toISOString() }
      : diagnosis,
    variants,
    strategy,
    media,
    optimizer: generateOptimizer(intake, media),
    agentStatus: extra.agentStatus,
  });
}

const intake = aamLike();

const afterScanDiagnosis = packOf(intake, {
  agentStatus: {
    intake: "complete",
    diagnostic: "needs_approval",
    strategic: "blocked",
    media: "blocked",
    optimizer: "blocked",
  },
});
if (nextHitlGate(afterScanDiagnosis.agentStatus, afterScanDiagnosis) !== "diagnostic") {
  fail("fresh diagnosis pack must gate on diagnostic / runStrategic");
}

const continueStageMismatch = packOf(intake, {
  agentStatus: {
    intake: "complete",
    diagnostic: "complete",
    strategic: "complete",
    media: "complete",
    optimizer: "complete",
  },
});
if (continueStageMismatch.diagnosis.approved) fail("createCompleteAd diagnosis should start unapproved");
if (nextHitlGate(continueStageMismatch.agentStatus, continueStageMismatch) !== "diagnostic") {
  fail("all-complete + unapproved diagnosis must still runStrategic (not silent no-op)");
}
if (nextHitlGate(idleStatus(), continueStageMismatch) !== "diagnostic") {
  fail("stale idle agentStatus with diagnosis pack must recover diagnostic gate");
}

const afterApprove = packOf(intake, {
  approved: true,
  withStrategy: true,
  agentStatus: {
    intake: "complete",
    diagnostic: "approved",
    strategic: "needs_approval",
    media: "blocked",
    optimizer: "blocked",
  },
});
if (nextHitlGate(afterApprove.agentStatus, afterApprove) !== "strategic") {
  fail("after diagnosis approval, gate must be strategic / runMedia");
}

const afterMedia = packOf(intake, {
  approved: true,
  withStrategy: true,
  agentStatus: {
    intake: "complete",
    diagnostic: "approved",
    strategic: "approved",
    media: "needs_approval",
    optimizer: "blocked",
  },
});
if (nextHitlGate(afterMedia.agentStatus, afterMedia) !== "media") {
  fail("media needs_approval must run optimizer");
}

const finished = packOf(intake, {
  approved: true,
  withStrategy: true,
  agentStatus: {
    intake: "complete",
    diagnostic: "approved",
    strategic: "approved",
    media: "approved",
    optimizer: "complete",
  },
});
if (nextHitlGate(finished.agentStatus, finished) !== "complete") {
  fail("finished HITL must be complete (open campaign), not a silent return");
}

if (nextHitlGate(idleStatus(), null) !== "diagnostic") {
  fail("missing pack still reports a gate so UI can show pack-missing error instead of no-op");
}

const seen: string[] = [];
const autoFromStart = simulateAutoHitlGates(afterScanDiagnosis.agentStatus, afterScanDiagnosis, (gate) => {
  seen.push(gate);
  if (gate === "diagnostic") return afterApprove;
  if (gate === "strategic") return afterMedia;
  return finished;
});
if (seen.join(",") !== "diagnostic,strategic,media") {
  fail(`startBuild auto path must run diagnosis→strategy→media→optimizer, got ${seen.join(",")}`);
}
if (nextHitlGate(autoFromStart.agentStatus, autoFromStart) !== "complete") {
  fail("startBuild auto-approve must land complete, never a needs_approval dead-end");
}

const fromStrategy: string[] = [];
const autoFromStrategy = simulateAutoHitlGates(afterApprove.agentStatus, afterApprove, (gate) => {
  fromStrategy.push(gate);
  if (gate === "diagnostic") throw new Error("redirect loop back to diagnostic");
  if (gate === "strategic") return afterMedia;
  return finished;
});
if (fromStrategy.join(",") !== "strategic,media") {
  fail(`after diagnosis approved + strategy present, advance must run media then optimizer, got ${fromStrategy.join(",")}`);
}
if (nextHitlGate(autoFromStrategy.agentStatus, autoFromStrategy) !== "complete") {
  fail("strategy needs_approval auto path must finish without redirect loops");
}

if (shouldResumeAgents({ phase: "wizard", pack: afterApprove })) {
  /* mid-campaign on remount must reopen agents, even if draft phase was wrongly wizard */
} else {
  fail("remount with strategic needs_approval must resume agents, not kick to start");
}
if (shouldResumeAgents({ phase: "agents", pack: finished })) {
  fail("finished pack must not keep the customer on the agents dead-end");
}
if (!shouldResumeAgents({ phase: "agents", pack: null })) {
  fail("agents phase with missing pack still resumes agents so restore/retry can run");
}

for (const gate of ["diagnostic", "strategic", "media"] as const) {
  if (hitlCtaDisabled(gate, true)) fail(`${gate} CTA must stay ENABLED while running`);
  if (hitlCtaDisabled(gate, false)) fail(`${gate} CTA must stay ENABLED when idle`);
}
if (hitlCtaKey("strategic", { pauseForReview: true }) !== "cta.approveContinue") {
  fail("paused strategy gate must be اعتمد وكمل");
}
if (hitlCtaKey("media", { pauseForReview: true }) !== "cta.finishToEnd") {
  fail("paused media gate must be يلا نكمّل للآخر");
}
if (hitlCtaKey("strategic", { pauseForReview: false }) !== "cta.finishToEnd") {
  fail("default auto path CTA must be finish-to-end, not disabled continueStage");
}

if (t("he", "cta.continueStage") !== "אשר שלב והמשך") {
  fail(`continueStage he drifted: ${t("he", "cta.continueStage")}`);
}
if (t("ar", "cta.approveContinue") !== "اعتمد وكمل") {
  fail(`approveContinue ar drifted: ${t("ar", "cta.approveContinue")}`);
}
if (t("ar", "cta.finishToEnd") !== "يلا نكمّل للآخر") {
  fail(`finishToEnd ar drifted: ${t("ar", "cta.finishToEnd")}`);
}
if (t("he", "agents.packMissing").length < 8) fail("agents.packMissing missing");
if (t("he", "agents.hitlError").length < 8) fail("agents.hitlError missing");
if (t("he", "agents.advancing").length < 4) fail("agents.advancing missing");
if (t("ar", "agents.pauseReview").length < 4) fail("agents.pauseReview ar missing");
if (t("ar", "agents.fillFromScan") !== "كمّل الناقص من المسح") {
  fail(`fillFromScan ar drifted: ${t("ar", "agents.fillFromScan")}`);
}

const filled = fillIntakeFromScanTruth({
  ...emptyIntake(),
  businessName: "سوبر ماركت البلد",
  category: "GroceryStore",
  description: "",
  landingLines: "بيض، حليب، أجبان",
});
if (!filled.description.trim()) fail("fill from scan must complete empty description from page copy");
if (filled.targetCac || filled.monthlyBudget) fail("fill from scan must not invent CAC/budget/ROAS");

const wizardSrc = readFileSync(join(__dirname, "../components/wizard-flow.tsx"), "utf8");
if (!wizardSrc.includes("nextHitlGate(")) fail("wizard-flow must dispatch HITL via nextHitlGate");
if (/if\s*\(\s*!pack\s*\)\s*return\s*;/.test(wizardSrc)) fail("advanceHitl must not silently return when pack is missing");
if (!wizardSrc.includes("hitl-actions")) fail("HITL CTAs must use hitl-actions so the mobile dock cannot steal taps");
if (!wizardSrc.includes('data-testid="hitl-approve"')) fail("hitl-approve testid missing");
if (!wizardSrc.includes("runFullPipeline")) fail("default startBuild must auto-run the full pipeline");
if (!wizardSrc.includes("restoreLivePack")) fail("remount must restore pack from draft/campaign store");
if (!wizardSrc.includes("pauseForReview")) fail("HITL pause-for-review must be an optional toggle");
if (!wizardSrc.includes("hitlCtaDisabled")) fail("HITL CTA disabled state must use hitlCtaDisabled (never running-only grey)");
if (!wizardSrc.includes("agentStatus")) fail("draft persist must keep agentStatus");
if (!wizardSrc.includes("fillIntakeFromScanTruth") && !wizardSrc.includes("fillMissingFromScan")) {
  fail("failure path must offer fill-from-scan");
}
if (wizardSrc.includes('withLang("/tools/core-message"')) {
  fail("auto HITL must not redirect to /tools/core-message");
}
if (wizardSrc.includes('withLang("/task/ad"')) {
  fail("startBuild must not kick the customer to /task/ad");
}
if (/await runAgents\(/.test(wizardSrc)) fail("missing pack must not restart agents from stage 1");
if (/data-testid="hitl-approve"[\s\S]{0,280}disabled=\{running\}/.test(wizardSrc)) {
  fail("hitl-approve must not be disabled={running} — that is the grey dead-end");
}
if (wizardSrc.includes("diagnosisApproved ? null")) {
  fail("HITL continue must stay visible after diagnosis approval");
}
if (!wizardSrc.includes('t("cta.finishToEnd")') && !wizardSrc.includes("hitlCtaKey(")) {
  fail("finish-to-end CTA must be wired");
}

const advanceSrc = readFileSync(join(__dirname, "../lib/engine/hitl-advance.ts"), "utf8");
if (advanceSrc.includes("/tools/core-message") || advanceSrc.includes("/task/ad")) {
  fail("hitl-advance must not redirect to other tools");
}

if (failures.length) {
  console.error("check-hitl-advance FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("check-hitl-advance PASS");
