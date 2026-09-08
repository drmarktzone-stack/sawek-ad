/**
 * HITL approve/continue must never silently no-op.
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
import { nextHitlGate } from "../lib/engine/hitl";
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

if (t("he", "cta.continueStage") !== "אשר שלב והמשך") {
  fail(`continueStage he drifted: ${t("he", "cta.continueStage")}`);
}
if (t("he", "agents.packMissing").length < 8) fail("agents.packMissing missing");
if (t("he", "agents.hitlError").length < 8) fail("agents.hitlError missing");
if (t("he", "agents.advancing").length < 4) fail("agents.advancing missing");

const wizardSrc = readFileSync(join(__dirname, "../components/wizard-flow.tsx"), "utf8");
if (!wizardSrc.includes("nextHitlGate(")) fail("wizard-flow must dispatch HITL via nextHitlGate");
if (/if\s*\(\s*!pack\s*\)\s*return\s*;/.test(wizardSrc)) fail("advanceHitl must not silently return when pack is missing");
if (!wizardSrc.includes("hitl-actions")) fail("HITL CTAs must use hitl-actions so the mobile dock cannot steal taps");
if (!wizardSrc.includes("data-testid=\"hitl-approve\"")) fail("hitl-approve testid missing");

if (failures.length) {
  console.error("check-hitl-advance FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("check-hitl-advance PASS");
