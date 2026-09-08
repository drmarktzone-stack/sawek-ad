import type { CampaignPack, Locale } from "../types";
import { parseNumber } from "../utils";
import { uid } from "../utils";
import type {
  AudienceIntel,
  AudienceNode,
  BusinessDna,
  BusinessRecord,
  CompetitorIntel,
  CreativeBattle,
  CreativeScore,
  DnaTrait,
  EvidenceLink,
  Experiment,
  ExperimentMetric,
  ExperimentOutcome,
  GrowthWorkspace,
  Hypothesis,
  KnowledgeBoard,
  LayerKind,
  LearningRecord,
  NextBestAction,
  Opportunity,
  PerformanceIntel,
  RevenueAttribution,
  Uncertainty,
} from "./types";
import { emptyKnowledge, emptyNba } from "./types";
import { emptyMarketIntel } from "./market-types";
import { localizeIntakeValue, localizeTopicKey } from "../copy-purity";

const nowIso = () => new Date().toISOString();

export function evidence(
  source: EvidenceLink["source"],
  ref: string,
  layer: LayerKind,
  excerpt?: string,
): EvidenceLink {
  return { source, ref, layer, excerpt: excerpt?.slice(0, 280), asOf: nowIso() };
}

export function uncertaintyFromPresence(hasEvidence: boolean, thin?: boolean): Uncertainty {
  if (!hasEvidence) return "unknown";
  if (thin) return "low";
  return "medium";
}

function textOf(tri: Record<Locale, string> | undefined, locale?: Locale): string {
  if (!tri) return "";
  if (locale) {
    const hit = String(tri[locale] || "").trim();
    if (hit) return hit;
    return "";
  }
  return String(tri.he || tri.en || tri.ar || "").trim();
}

export function businessIdFromName(name: string): string {
  const n = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0590-\u05ff\u0600-\u06ff.-]/g, "")
    .slice(0, 80);
  return n || "unnamed-business";
}

export function extractBusiness(pack: CampaignPack): BusinessRecord {
  const name = String(pack.intake.businessName || pack.name || "").trim();
  const t = nowIso();
  return {
    id: businessIdFromName(name || pack.id),
    name: name || pack.name,
    category: String(pack.intake.category ?? "").trim(),
    location: String(pack.intake.location ?? "").trim(),
    website: String(pack.intake.website ?? "").trim(),
    operatingModel: pack.intake.operatingModel,
    createdAt: pack.createdAt || t,
    updatedAt: t,
  };
}

export function extractDna(pack: CampaignPack, prior?: BusinessDna, locale: Locale = "he"): BusinessDna {
  const business = extractBusiness(pack);
  const traits: DnaTrait[] = [];
  const push = (topic: string, claim: string, ref: string, kind: DnaTrait["kind"], extra?: EvidenceLink[]) => {
    const c = claim.trim();
    if (!c) return;
    traits.push({
      id: uid("dna"),
      topic,
      claim: c,
      confidence: kind === "know" ? "medium" : kind === "think" ? "low" : "unknown",
      kind,
      evidence: [evidence(kind === "know" ? "user_input" : "ai_interpretation", ref, kind === "know" ? "observed" : "ai_interpretation", c), ...(extra ?? [])],
      updatedAt: nowIso(),
    });
  };

  push("identity", business.name, "intake.businessName", "know");
  push("category", business.category, "intake.category", "know");
  push("location", business.location, "intake.location", "know");
  push("offer", localizeIntakeValue(String(pack.intake.offer ?? ""), locale), "intake.offer", "know");
  push("advantage", localizeIntakeValue(String(pack.intake.uniqueAdvantage ?? ""), locale), "intake.uniqueAdvantage", "know");
  push("problem", localizeIntakeValue(String(pack.intake.biggestProblem ?? ""), locale), "intake.biggestProblem", "know");
  push("audience", localizeIntakeValue(String(pack.intake.audience ?? ""), locale), "intake.audience", "know");
  push("voice", String(pack.intake.voice?.coreMessage ?? ""), "intake.voice.coreMessage", "know");
  if (pack.intake.avgOrderValue) push("aov", String(pack.intake.avgOrderValue), "intake.avgOrderValue", "know");
  if (pack.intake.targetCac) push("target_cac", String(pack.intake.targetCac), "intake.targetCac", "know");
  if (pack.intake.monthlyBudget) push("budget", String(pack.intake.monthlyBudget), "intake.monthlyBudget", "know");

  for (const h of pack.diagnosis?.hypotheses ?? []) {
    const finding = textOf(h.finding, locale);
    const rec = textOf(h.recommendation, locale);
    if (!finding && !rec) continue;
    push(
      `diagnosis.${h.area}`,
      `${finding}${finding && rec ? " — " : ""}${rec}`,
      `diagnosis.hypotheses.${h.area}`,
      "think",
      [evidence("hypothesis", `diagnosis.${h.area}`, "hypothesis", textOf(h.evidence, locale))],
    );
  }

  if (prior?.traits.length && prior.businessId === business.id) {
    const seen = new Set(traits.map((t) => `${t.topic}:${t.claim}`));
    for (const old of prior.traits) {
      const userOrObserved = old.evidence.every((e) => e.source === "user_input" || e.source === "observed_metric");
      if (old.kind !== "know" || !userOrObserved) continue;
      const key = `${old.topic}:${old.claim}`;
      if (!seen.has(key)) {
        traits.push(old);
        seen.add(key);
      }
    }
  }

  return { businessId: business.id, traits, updatedAt: nowIso() };
}

export function extractAudience(pack: CampaignPack, locale: Locale = "he"): AudienceIntel {
  const business = extractBusiness(pack);
  const nodes: AudienceNode[] = [];
  const add = (kind: AudienceNode["kind"], text: string, ref: string, knowledge: AudienceNode["knowledge"]) => {
    const t = text.trim();
    if (!t) return;
    nodes.push({
      id: uid("aud"),
      kind,
      text: t,
      uncertainty: knowledge === "know" ? "medium" : knowledge === "think" ? "low" : "unknown",
      knowledge,
      evidence: [evidence(knowledge === "know" ? "user_input" : "ai_interpretation", ref, knowledge === "know" ? "observed" : "ai_interpretation", t)],
    });
  };

  add("segment", localizeIntakeValue(String(pack.intake.audience ?? ""), locale), "intake.audience", "know");
  add("pain", localizeIntakeValue(String(pack.intake.biggestProblem ?? ""), locale), "intake.biggestProblem", "know");
  add("desire", localizeIntakeValue(String(pack.intake.mainGoal ?? ""), locale), "intake.mainGoal", "know");

  for (const p of pack.agency?.discovery?.personas ?? []) {
    const name = textOf(p.name, locale);
    if (name) add("segment", name, "agency.discovery.personas", "think");
    if (p.jtbd) add("desire", textOf(p.jtbd, locale), "agency.discovery.personas.jtbd", "think");
    const unknown = textOf(p.unknown, locale);
    if (unknown) add("pain", unknown, "agency.discovery.personas.unknown", "dont_know");
  }

  if (pack.proDesk?.audience) {
    add("segment", textOf(pack.proDesk.audience, locale), "proDesk.audience", "think");
  }

  return { businessId: business.id, nodes, updatedAt: nowIso() };
}

export function extractCompetitors(pack: CampaignPack): CompetitorIntel {
  const business = extractBusiness(pack);
  const listed = pack.intake.competitors ?? [];
  const cards = pack.agency?.discovery?.battlecards ?? [];
  const gaps: CompetitorIntel["gaps"] = [];
  for (const c of listed) {
    const name = String(c.name ?? "").trim();
    if (!name) continue;
    gaps.push({
      id: uid("gap"),
      competitorName: name,
      competitorUrl: String(c.url ?? "").trim() || undefined,
      observation: String(c.notes ?? "").trim() || "Name supplied by the user. No other observed claims.",
      gap: String(c.notes ?? "").trim() || undefined,
      evidence: [evidence("user_input", "intake.competitors", "observed", name)],
      uncertainty: String(c.notes ?? "").trim() ? "medium" : "low",
    });
  }
  for (const b of cards) {
    const name = String(b.name ?? "").trim();
    if (!name) continue;
    if (gaps.some((g) => g.competitorName === name)) continue;
    const observation = [b.notes, textOf(b.weakness), textOf(b.strength)].filter(Boolean).join(" — ");
    gaps.push({
      id: uid("gap"),
      competitorName: name,
      observation: observation || "Battlecard name only — no extra observed claims.",
      gap: textOf(b.opportunity) || textOf(b.weakness) || undefined,
      evidence: [evidence("user_input", "agency.discovery.battlecards", "observed", name)],
      uncertainty: observation ? "medium" : "low",
    });
  }
  return {
    businessId: business.id,
    gaps,
    missing: listed.length === 0 && !gaps.length,
    updatedAt: nowIso(),
  };
}

export function extractOpportunities(pack: CampaignPack, competitors: CompetitorIntel): Opportunity[] {
  const out: Opportunity[] = [];
  const moves = pack.cmoIdeas?.gapPlan?.moves ?? pack.brief?.gaps?.moves ?? [];
  for (const m of moves) {
    const title = textOf(m.move);
    if (!title) continue;
    out.push({
      id: uid("opp"),
      title,
      whyNow: m.missingField
        ? `Intake field “${m.missingField}” is incomplete — compensation move, not a win probability.`
        : "Gap move from intake / CMO gap plan — not a predicted win rate.",
      evidence: [evidence("user_input", "cmoIdeas.gapPlan.moves", "observed", title)],
      confidence: m.priority === "now" ? "medium" : "low",
      action: title,
      createdAt: nowIso(),
    });
  }
  for (const g of competitors.gaps) {
    if (!g.gap) continue;
    out.push({
      id: uid("opp"),
      title: `Gap vs ${g.competitorName}`,
      whyNow: g.gap,
      evidence: g.evidence,
      confidence: g.uncertainty,
      action: g.gap,
      createdAt: nowIso(),
    });
  }
  if (!out.length) {
    out.push({
      id: uid("opp"),
      title: "UNKNOWN — no opportunity evidence yet",
      whyNow: "No gap moves, competitor notes, or observed results are on file.",
      evidence: [],
      confidence: "unknown",
      action: "Add a real competitor observation or enter campaign results.",
      createdAt: nowIso(),
    });
  }
  return out;
}

export function extractHypotheses(pack: CampaignPack, locale: Locale = "he"): Hypothesis[] {
  const list: Hypothesis[] = [];
  for (const h of pack.diagnosis?.hypotheses ?? []) {
    const finding = textOf(h.finding, locale);
    const ev = textOf(h.evidence, locale);
    const hasEvidence = Boolean(ev);
    if (!finding) continue;
    list.push({
      id: uid("hyp"),
      statement: finding,
      area: h.area,
      status: "open",
      result: undefined,
      conclusion: undefined,
      evidence: [
        evidence("hypothesis", `diagnosis.${h.area}`, "hypothesis", finding),
        ...(hasEvidence ? [evidence("user_input", `diagnosis.${h.area}.evidence`, "observed", ev)] : []),
      ],
      confidence: h.confidence === "high" ? "high" : h.confidence === "medium" ? "medium" : hasEvidence ? "low" : "unknown",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      campaignId: pack.id,
    });
  }
  return list;
}

export function extractCreativeBattle(pack: CampaignPack): CreativeBattle {
  const scores: CreativeScore[] = [];
  for (const idea of pack.cmoIdeas?.selected ?? []) {
    scores.push({
      variantId: idea.id,
      label: textOf(idea.name) || idea.id,
      prePublishScore: typeof idea.planningScore === "number" ? idea.planningScore : undefined,
      prePublishNote: "Planning score (1–100). Not live performance. Not ROAS.",
      actualNote: "UNKNOWN — no observed metric for this idea yet.",
    });
  }
  for (const v of pack.variants ?? []) {
    if (v.locale !== "he") continue;
    scores.push({
      variantId: `${v.kind}-${v.locale}`,
      label: `${v.kind}: ${v.headline}`,
      prePublishNote: "Copy variant — no pre-publish numeric score unless a lab score exists.",
      actualNote: "UNKNOWN — enter experiment or optimizer results to attach actuals.",
    });
  }
  return { campaignId: pack.id, scores, updatedAt: nowIso() };
}

export function extractPerformance(pack: CampaignPack): PerformanceIntel {
  const observed: PerformanceIntel["observed"] = [];
  const calculated: PerformanceIntel["calculated"] = [];
  const aiInterpretation: PerformanceIntel["aiInterpretation"] = [];
  const latest = pack.optimizerRuns?.[0];
  if (latest) {
    const spend = parseNumber(latest.input.spend);
    const leads = parseNumber(latest.input.leads);
    const purchases = parseNumber(latest.input.purchases);
    const ctr = parseNumber(latest.input.ctr);
    if (spend != null) {
      observed.push({
        label: "spend",
        value: String(spend),
        evidence: evidence("observed_metric", "optimizerRuns[0].input.spend", "observed", String(spend)),
      });
    }
    if (leads != null) {
      observed.push({
        label: "leads",
        value: String(leads),
        evidence: evidence("observed_metric", "optimizerRuns[0].input.leads", "observed", String(leads)),
      });
    }
    if (purchases != null) {
      observed.push({
        label: "purchases",
        value: String(purchases),
        evidence: evidence("observed_metric", "optimizerRuns[0].input.purchases", "observed", String(purchases)),
      });
    }
    if (ctr != null) {
      observed.push({
        label: "ctr",
        value: String(ctr),
        evidence: evidence("observed_metric", "optimizerRuns[0].input.ctr", "observed", String(ctr)),
      });
    }
    const conversions = purchases ?? leads;
    if (spend != null && conversions != null && conversions > 0) {
      const cpa = spend / conversions;
      calculated.push({
        label: "cpa",
        value: String(Math.round(cpa * 100) / 100),
        formula: "spend / (purchases ?? leads)",
        evidence: evidence("calculated", "optimizerRuns[0]", "calculated", `CPA=${cpa}`),
      });
    }
    for (const line of latest.advice) {
      const text = textOf(line);
      if (text) {
        aiInterpretation.push({
          text,
          evidence: evidence("ai_interpretation", "optimizerRuns[0].advice", "ai_interpretation", text),
        });
      }
    }
  }
  const funnel: PerformanceIntel["funnel"] = [
    { name: "spend", value: latest ? parseNumber(latest.input.spend) ?? undefined : undefined, present: Boolean(latest && parseNumber(latest.input.spend) != null) },
    { name: "leads", value: latest ? parseNumber(latest.input.leads) ?? undefined : undefined, present: Boolean(latest && parseNumber(latest.input.leads) != null) },
    { name: "purchases", value: latest ? parseNumber(latest.input.purchases) ?? undefined : undefined, present: Boolean(latest && parseNumber(latest.input.purchases) != null) },
  ];
  return {
    observed,
    calculated,
    aiInterpretation,
    hypotheses: (pack.diagnosis?.hypotheses ?? []).map((h) => textOf(h.finding)).filter(Boolean),
    funnel,
    updatedAt: nowIso(),
  };
}

export function extractRevenue(pack: CampaignPack, extra?: RevenueAttribution): RevenueAttribution {
  const latest = pack.optimizerRuns?.[0];
  const purchases = latest ? parseNumber(latest.input.purchases) : null;
  const aov = parseNumber(pack.intake.avgOrderValue);
  const events = extra?.events ? [...extra.events] : [];
  if (purchases != null && aov != null && purchases > 0 && aov > 0) {
    events.push({
      id: uid("rev"),
      amount: purchases * aov,
      currency: "ILS",
      source: "purchases × intake.avgOrderValue",
      createdAt: nowIso(),
      evidence: [
        evidence("calculated", "optimizerRuns[0].input.purchases", "calculated", String(purchases)),
        evidence("user_input", "intake.avgOrderValue", "observed", String(aov)),
      ],
    });
  }
  const total = events.length ? events.reduce((s, e) => s + e.amount, 0) : undefined;
  const confidence: Uncertainty =
    events.length === 0 ? "unknown" : purchases != null && aov != null ? "low" : "unknown";
  return {
    events,
    total,
    currency: events[0]?.currency,
    confidence,
    note:
      events.length === 0
        ? "UNKNOWN — no revenue events. Enter purchases and average order value, or add a revenue row. Not ROAS."
        : "Partial attribution: purchases × stated AOV. No ad-platform reconciliation. Attribution confidence is low.",
    updatedAt: nowIso(),
  };
}

export function extractLeads(pack: CampaignPack): GrowthWorkspace["leads"] {
  const latest = pack.optimizerRuns?.[0];
  const n = latest ? parseNumber(latest.input.leads) : null;
  if (n == null || n <= 0) return [];
  return [
    {
      id: uid("lead-agg"),
      source: "optimizerRuns[0].input.leads",
      note: `${n} leads entered by the user (aggregate, not a CRM row).`,
      createdAt: latest?.createdAt || nowIso(),
      campaignId: pack.id,
    },
  ];
}

export function buildKnowledge(
  ws: Pick<GrowthWorkspace, "dna" | "audience" | "competitors" | "performance" | "revenue">,
  locale: Locale = "he",
): KnowledgeBoard {
  const know: KnowledgeBoard["know"] = [];
  const think: KnowledgeBoard["think"] = [];
  const dontKnow: KnowledgeBoard["dontKnow"] = [];
  for (const t of ws.dna.traits) {
    const item = { text: `${localizeTopicKey(t.topic, locale)}: ${localizeIntakeValue(t.claim, locale)}`, evidence: t.evidence };
    if (t.kind === "know") know.push(item);
    else if (t.kind === "think") think.push(item);
    else dontKnow.push(item);
  }
  for (const n of ws.audience.nodes) {
    const item = {
      text: `${localizeTopicKey(n.kind, locale)}: ${localizeIntakeValue(n.text, locale)}`,
      evidence: n.evidence,
    };
    if (n.knowledge === "know") know.push(item);
    else if (n.knowledge === "think") think.push(item);
    else dontKnow.push(item);
  }
  if (ws.competitors.missing) {
    dontKnow.push({
      text:
        locale === "ar"
          ? "المنافسون — ما انكتب أحد."
          : locale === "he"
            ? "מתחרים — לא הוזן אף אחד."
            : "Competitor set — none entered.",
      evidence: [],
    });
  }
  if (!ws.performance.observed.length) {
    dontKnow.push({
      text:
        locale === "ar"
          ? "أداء الحملات — لا مؤشرات مرصودة."
          : locale === "he"
            ? "ביצועי קמפיין — אין מדדים שנצפו."
            : "Live campaign performance — no observed metrics entered.",
      evidence: [],
    });
  }
  if (ws.revenue.confidence === "unknown") {
    dontKnow.push({
      text:
        locale === "ar"
          ? "الإيراد — لا أحداث منسوبة."
          : locale === "he"
            ? "הכנסה — אין אירועים מיוחסים."
            : "Revenue — no attributable events.",
      evidence: [],
    });
  }
  return { know, think, dontKnow, updatedAt: nowIso() };
}

export function computeNba(ws: GrowthWorkspace): NextBestAction {
  const t = nowIso();
  if (!ws.business.name.trim()) {
    return {
      action: "Name the business and save a campaign.",
      reason: "Without a business identity there is nothing to learn from.",
      evidence: [],
      uncertainty: "unknown",
      updatedAt: t,
    };
  }
  if (ws.competitors.missing && !ws.performance.observed.length) {
    return {
      action: "Add one competitor you actually saw, or enter one observed result (spend + leads/purchases).",
      reason: "No competitive evidence and no performance data — the radar cannot rank a next move.",
      evidence: [],
      uncertainty: "unknown",
      updatedAt: t,
    };
  }
  if (!ws.performance.observed.length) {
    const open = ws.hypotheses.find((h) => h.status === "open");
    return {
      action: open
        ? `Enter real results to test: ${open.statement}`
        : "Enter spend + leads or purchases on the campaign optimizer.",
      reason: "Hypotheses stay open until observed metrics exist. AI will not mark them true.",
      evidence: open?.evidence ?? [],
      uncertainty: "low",
      updatedAt: t,
    };
  }
  const running = ws.experiments.find((e) => e.status === "running");
  if (running) {
    return {
      action: `Record actuals for experiment “${running.name}”.`,
      reason: "An experiment is running without a completed outcome.",
      evidence: [evidence("user_input", `experiments.${running.id}`, "observed", running.name)],
      uncertainty: "medium",
      updatedAt: t,
    };
  }
  const nbe = ws.market?.nextBestExperiment;
  if (nbe && nbe.claim !== "UNKNOWN" && !nbe.tested) {
    return {
      action: nbe.title,
      reason: nbe.why,
      evidence: nbe.evidence,
      uncertainty: nbe.confidence,
      updatedAt: t,
    };
  }
  const opp = ws.opportunities.find((o) => o.confidence !== "unknown");
  if (opp) {
    return {
      action: opp.action,
      reason: opp.whyNow,
      evidence: opp.evidence,
      uncertainty: opp.confidence,
      updatedAt: t,
    };
  }
  return {
    action: "Create an experiment on the strongest open hypothesis.",
    reason: "Results exist but no experiment is tracking a variant vs baseline.",
    evidence: ws.performance.observed[0] ? [ws.performance.observed[0].evidence] : [],
    uncertainty: "low",
    updatedAt: t,
  };
}

export function experimentDeltas(metrics: ExperimentMetric[]): Experiment["deltas"] {
  const deltas: Experiment["deltas"] = [];
  for (const m of metrics) {
    if (typeof m.baseline !== "number" || typeof m.actual !== "number") continue;
    const delta = m.actual - m.baseline;
    deltas.push({
      name: m.name,
      delta,
      note: "Arithmetic actual − baseline. Not statistical significance.",
    });
  }
  return deltas;
}

export function experimentOutcomeFromMetrics(metrics: ExperimentMetric[]): ExperimentOutcome {
  const comparable = metrics.filter((m) => typeof m.baseline === "number" && typeof m.actual === "number");
  if (!comparable.length) return "unknown";
  const ups = comparable.filter((m) => (m.actual as number) > (m.baseline as number)).length;
  const downs = comparable.filter((m) => (m.actual as number) < (m.baseline as number)).length;
  if (ups && !downs) return "improved";
  if (downs && !ups) return "worse";
  return "inconclusive";
}

export function applyHypothesisResult(h: Hypothesis, outcome: ExperimentOutcome): Hypothesis {
  if (outcome === "unknown") {
    return { ...h, status: "open", result: "No comparable baseline/actual.", conclusion: undefined, updatedAt: nowIso() };
  }
  if (outcome === "inconclusive") {
    return {
      ...h,
      status: "inconclusive",
      result: "Metrics moved in mixed directions. Inconclusive — not proven.",
      conclusion: "Do not treat as true.",
      updatedAt: nowIso(),
    };
  }
  if (outcome === "improved") {
    return {
      ...h,
      status: "supported",
      result: "Observed actuals beat baseline on entered metrics.",
      conclusion: "Supported by entered numbers only — not a scientific proof.",
      updatedAt: nowIso(),
    };
  }
  return {
    ...h,
    status: "contradicted",
    result: "Observed actuals were worse than baseline on entered metrics.",
    conclusion: "Contradicted by entered numbers. Not a proof of the opposite.",
    updatedAt: nowIso(),
  };
}

export function applyLearning(ws: GrowthWorkspace, pack?: CampaignPack, locale: Locale = "he"): GrowthWorkspace {
  const next: GrowthWorkspace = { ...ws, updatedAt: nowIso() };
  if (pack) {
    next.dna = extractDna(pack, ws.dna, locale);
    next.audience = extractAudience(pack, locale);
    next.competitors = extractCompetitors(pack);
    next.opportunities = extractOpportunities(pack, next.competitors);
    next.performance = extractPerformance(pack);
    next.revenue = extractRevenue(pack, ws.revenue);
    next.creativeBattle = extractCreativeBattle(pack);
    next.leads = extractLeads(pack);
    if (!next.campaignIds.includes(pack.id)) next.campaignIds = [...next.campaignIds, pack.id];
    const existingStatements = new Set(next.hypotheses.map((h) => h.statement));
    for (const h of extractHypotheses(pack, locale)) {
      if (!existingStatements.has(h.statement)) next.hypotheses.push(h);
    }
  }

  const latestExp = next.experiments
    .filter((e) => e.status === "completed")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];

  const dnaUpdates: string[] = [];
  const newHypothesisIds: string[] = [];

  if (latestExp && latestExp.outcome !== "unknown") {
    const trait: DnaTrait = {
      id: uid("dna"),
      topic: "experiment",
      claim: `${latestExp.name}: ${latestExp.outcome} (${latestExp.deltas.map((d) => `${d.name} Δ${d.delta}`).join(", ") || "no numeric delta"})`,
      confidence: latestExp.outcome === "inconclusive" ? "low" : "medium",
      kind: "know",
      evidence: [evidence("observed_metric", `experiments.${latestExp.id}`, "observed", latestExp.name)],
      updatedAt: nowIso(),
    };
    next.dna = { ...next.dna, traits: [...next.dna.traits, trait], updatedAt: nowIso() };
    dnaUpdates.push(trait.claim);

    if (latestExp.hypothesisId) {
      next.hypotheses = next.hypotheses.map((h) =>
        h.id === latestExp.hypothesisId ? applyHypothesisResult(h, latestExp.outcome) : h,
      );
    }

    const follow: Hypothesis = {
      id: uid("hyp"),
      statement:
        latestExp.outcome === "improved"
          ? `Repeat the winning variant of “${latestExp.name}” on the next flight.`
          : latestExp.outcome === "worse"
            ? `Stop scaling the losing variant of “${latestExp.name}” until a new test.`
            : `Gather one more comparable metric for “${latestExp.name}”.`,
      area: "learning",
      status: "open",
      evidence: [evidence("observed_metric", `experiments.${latestExp.id}`, "observed", latestExp.name)],
      confidence: "low",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      campaignId: latestExp.campaignId,
    };
    next.hypotheses = [...next.hypotheses, follow];
    newHypothesisIds.push(follow.id);

    next.opportunities = [
      {
        id: uid("opp"),
        title: `After ${latestExp.name}`,
        whyNow: follow.statement,
        evidence: follow.evidence,
        confidence: "medium",
        action: follow.statement,
        createdAt: nowIso(),
      },
      ...next.opportunities,
    ];
  }

  if (dnaUpdates.length || newHypothesisIds.length) {
    const rec: LearningRecord = {
      id: uid("learn"),
      summary: dnaUpdates[0] || "Learning recorded from entered evidence.",
      dnaUpdates,
      newHypothesisIds,
      evidence: [evidence("observed_metric", "learning", "observed", dnaUpdates[0])],
      createdAt: nowIso(),
    };
    next.learnings = [rec, ...next.learnings].slice(0, 40);
  }

  if (ws.market) {
    next.market = ws.market;
    const marketOpps = ws.opportunities.filter((o) => /Untested market pattern|Observed advertiser/i.test(o.title));
    if (marketOpps.length) {
      const keep = next.opportunities.filter((o) => !/UNKNOWN — no opportunity evidence/i.test(o.title));
      next.opportunities = [...marketOpps, ...keep].slice(0, 20);
    }
  }

  next.knowledge = buildKnowledge(next, locale);
  next.nba = computeNba(next);
  return next;
}

export function emptyWorkspace(business: BusinessRecord, extras?: Partial<GrowthWorkspace>): GrowthWorkspace {
  const t = nowIso();
  const dna: BusinessDna = { businessId: business.id, traits: [], updatedAt: t };
  const audience: AudienceIntel = { businessId: business.id, nodes: [], updatedAt: t };
  const competitors: CompetitorIntel = { businessId: business.id, gaps: [], missing: true, updatedAt: t };
  const base: GrowthWorkspace = {
    id: uid("ws"),
    businessId: business.id,
    business,
    dna,
    audience,
    competitors,
    opportunities: [],
    hypotheses: [],
    experiments: [],
    creativeBattle: { scores: [], updatedAt: t },
    performance: { observed: [], calculated: [], aiInterpretation: [], hypotheses: [], funnel: [], updatedAt: t },
    leads: [],
    conversions: [],
    revenue: {
      events: [],
      confidence: "unknown",
      note: "UNKNOWN — no revenue events.",
      updatedAt: t,
    },
    learnings: [],
    nba: emptyNba(),
    knowledge: emptyKnowledge(),
    campaignIds: [],
    market: extras?.market ?? emptyMarketIntel(business.id),
    createdAt: t,
    updatedAt: t,
    ...extras,
  };
  base.knowledge = buildKnowledge(base);
  base.nba = computeNba(base);
  return base;
}

export function workspaceFromPack(pack: CampaignPack, prior?: GrowthWorkspace, locale: Locale = "he"): GrowthWorkspace {
  const business = extractBusiness(pack);
  const seed = prior && prior.businessId === business.id ? prior : emptyWorkspace(business);
  seed.business = business;
  seed.sample = Boolean(pack.demoMeta);
  return applyLearning(seed, pack, locale);
}

export function forbiddenScientistClaims(text: string): boolean {
  return /statistically significant|p\s*<\s*0\.05|predicted roas|guaranteed leads|win probability\s*\d|forecasted revenue/i.test(
    text,
  );
}
