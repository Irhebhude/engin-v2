// Frontend heuristics that derive Batch-1 intelligence panels from an existing
// search-ai answer + sources. Zero new backend calls — pure client-side.

import type { SourceRef } from "@/components/SourceCitations";

const SENT_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9])/;

export interface DerivedReasoning {
  intent: string;
  evidence: { source: string; weight: number }[];
  assumptions: string[];
  confidenceBreakdown: { label: string; value: number }[];
  limitations: string[];
}

export interface DerivedEffect {
  horizon: "Immediate" | "Short-term" | "Long-term";
  text: string;
  likelihood: number; // 0-100
  impact: "Low" | "Medium" | "High";
}

export interface CausalNode {
  id: string;
  label: string;
  type: "cause" | "mechanism" | "effect";
}

export interface CausalEdge {
  from: string;
  to: string;
}

export interface DecisionVerdict {
  verdict: "Yes" | "No" | "Maybe" | "Insufficient Data";
  score: number;
  pros: { text: string; weight: number }[];
  cons: { text: string; weight: number }[];
  recommendation: string;
}

export interface DebateView {
  side: "For" | "Against";
  point: string;
  strength: number;
}

export interface DetectedFallacy {
  name: string;
  excerpt: string;
  severity: "low" | "medium" | "high";
}

const splitSentences = (text: string): string[] =>
  text
    .replace(/\s+/g, " ")
    .split(SENT_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 400);

export const deriveReasoning = (
  query: string,
  answer: string,
  sources: SourceRef[],
): DerivedReasoning => {
  const sents = splitSentences(answer);
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const intent = /how|why|explain/i.test(query)
    ? "Explanatory — user wants mechanism + reasoning"
    : /best|vs|versus|compare|better/i.test(query)
    ? "Comparative — user wants ranked trade-offs"
    : /should|can|will|is it/i.test(query)
    ? "Decision — user wants a verdict"
    : "Informational — user wants facts and context";

  const evidence = sources.slice(0, 8).map((s) => {
    const govBoost = /\.gov|\.edu|\.org/i.test(s.domain) ? 25 : 0;
    const freshBoost = 20;
    const matchBoost = tokens.filter((t) => (s.title || "").toLowerCase().includes(t)).length * 8;
    return {
      source: s.domain || new URL(s.url).hostname,
      weight: Math.min(100, 35 + govBoost + freshBoost + matchBoost),
    };
  });

  const assumptions: string[] = [];
  if (/typically|usually|generally|in most cases/i.test(answer))
    assumptions.push("Generalizing from typical cases — edge cases may differ");
  if (/in nigeria|naira|ngn/i.test(answer))
    assumptions.push("Assumes Nigerian market context");
  if (/2024|2025|2026|currently|today/i.test(answer))
    assumptions.push("Time-sensitive — verify against latest sources");
  if (sources.length < 2)
    assumptions.push("Limited cross-source corroboration");

  const sourceAuthority = sources.length === 0 ? 30 :
    sources.some((s) => /\.gov|\.edu|\.org/i.test(s.domain)) ? 90 :
    sources.length >= 4 ? 78 : 65;

  const confidenceBreakdown = [
    { label: "Source authority", value: sourceAuthority },
    { label: "Cross-source agreement", value: Math.min(95, 40 + sources.length * 10) },
    { label: "Answer specificity", value: Math.min(95, 40 + sents.length * 4) },
    { label: "Recency signal", value: /2025|2026|recent/i.test(answer) ? 88 : 65 },
  ];

  const limitations: string[] = [];
  if (sources.length < 3) limitations.push("Fewer than 3 sources — verify independently");
  if (!/\d/.test(answer)) limitations.push("No quantitative figures cited");
  if (answer.length < 300) limitations.push("Short answer — depth may be limited");
  if (limitations.length === 0) limitations.push("None detected at this confidence level");

  return { intent, evidence, assumptions, confidenceBreakdown, limitations };
};

export const deriveSecondOrderEffects = (
  query: string,
  answer: string,
): DerivedEffect[] => {
  const sents = splitSentences(answer);
  const isBusiness = /price|cost|market|business|invest|sme|trade|export|import/i.test(query + answer);
  const isPolicy = /policy|regulation|government|law|tax/i.test(query + answer);

  const out: DerivedEffect[] = [];

  if (isBusiness) {
    out.push(
      { horizon: "Immediate", text: "Price discovery shifts — buyers/sellers recalibrate within days", likelihood: 78, impact: "Medium" },
      { horizon: "Short-term", text: "Supply-chain partners renegotiate terms over 1–3 months", likelihood: 64, impact: "High" },
      { horizon: "Long-term", text: "Market structure consolidates around the dominant signal (12+ months)", likelihood: 52, impact: "High" },
    );
  }
  if (isPolicy) {
    out.push(
      { horizon: "Immediate", text: "Compliance teams trigger internal reviews", likelihood: 82, impact: "Medium" },
      { horizon: "Short-term", text: "Affected sectors lobby for amendments or exemptions", likelihood: 70, impact: "Medium" },
      { horizon: "Long-term", text: "Adjacent regulations follow — precedent effect", likelihood: 58, impact: "High" },
    );
  }
  if (out.length === 0 && sents.length > 0) {
    out.push(
      { horizon: "Immediate", text: "Direct users adjust behavior based on this information", likelihood: 70, impact: "Low" },
      { horizon: "Short-term", text: "Related topics gain attention through association", likelihood: 55, impact: "Medium" },
      { horizon: "Long-term", text: "Underlying assumptions may be challenged as new data emerges", likelihood: 45, impact: "Medium" },
    );
  }
  return out;
};

export const deriveCausalChain = (
  query: string,
  answer: string,
): { nodes: CausalNode[]; edges: CausalEdge[] } => {
  const sents = splitSentences(answer).slice(0, 3);
  const nodes: CausalNode[] = [
    { id: "q", label: query.slice(0, 40), type: "cause" },
  ];
  const edges: CausalEdge[] = [];

  sents.forEach((s, i) => {
    const mid = `m${i}`;
    const eff = `e${i}`;
    nodes.push({ id: mid, label: s.slice(0, 60).replace(/[.!?]$/, ""), type: "mechanism" });
    nodes.push({
      id: eff,
      label:
        /therefore|thus|so|hence|as a result/i.test(s)
          ? "Direct outcome"
          : i === 0
          ? "Primary effect"
          : i === 1
          ? "Secondary effect"
          : "Downstream effect",
      type: "effect",
    });
    edges.push({ from: i === 0 ? "q" : `m${i - 1}`, to: mid });
    edges.push({ from: mid, to: eff });
  });

  return { nodes, edges };
};

export const deriveDecision = (
  query: string,
  answer: string,
  sources: SourceRef[],
): DecisionVerdict => {
  const lower = answer.toLowerCase();
  const proSignals = (lower.match(/benefit|advantage|positive|recommended|effective|profit|growth/g) || []).length;
  const conSignals = (lower.match(/risk|drawback|disadvantage|caution|loss|decline|threat|concern/g) || []).length;

  const score = Math.round(((proSignals + 1) / (proSignals + conSignals + 2)) * 100);
  let verdict: DecisionVerdict["verdict"] = "Maybe";
  if (sources.length === 0 && proSignals + conSignals < 2) verdict = "Insufficient Data";
  else if (score >= 65) verdict = "Yes";
  else if (score <= 35) verdict = "No";

  const sents = splitSentences(answer);
  const pros = sents
    .filter((s) => /benefit|advantage|positive|grow|profit|effective/i.test(s))
    .slice(0, 4)
    .map((text, i) => ({ text, weight: 90 - i * 10 }));
  const cons = sents
    .filter((s) => /risk|disadvantage|caution|loss|decline|threat|concern/i.test(s))
    .slice(0, 4)
    .map((text, i) => ({ text, weight: 90 - i * 10 }));

  const recommendation =
    verdict === "Yes"
      ? "Evidence leans positive. Proceed with a small pilot before scaling."
      : verdict === "No"
      ? "Evidence leans negative. Do not proceed without addressing the listed risks."
      : verdict === "Insufficient Data"
      ? "Not enough verified signal to decide. Gather 2–3 more independent sources."
      : "Mixed signal. Define success metrics first, then run a bounded experiment.";

  return { verdict, score, pros, cons, recommendation };
};

export const deriveDebate = (
  query: string,
  answer: string,
): { views: DebateView[]; fallacies: DetectedFallacy[] } => {
  const sents = splitSentences(answer);
  const views: DebateView[] = [];

  sents.slice(0, 6).forEach((s, i) => {
    const isNeg = /not|never|risk|disadvantage|fail|wrong|loss|decline|concern/i.test(s);
    views.push({
      side: isNeg ? "Against" : "For",
      point: s,
      strength: 80 - i * 8,
    });
  });

  if (!views.some((v) => v.side === "Against")) {
    views.push({
      side: "Against",
      point: `Skeptical view: the claim assumes the cited sources are representative — selection bias is possible for "${query.slice(0, 60)}".`,
      strength: 55,
    });
  }
  if (!views.some((v) => v.side === "For")) {
    views.push({
      side: "For",
      point: `Supportive view: the answer cites converging evidence for the central claim.`,
      strength: 60,
    });
  }

  const fallacies: DetectedFallacy[] = [];
  const fmap: { rx: RegExp; name: string; sev: DetectedFallacy["severity"] }[] = [
    { rx: /everyone (knows|agrees)|nobody (denies|disputes)/i, name: "Bandwagon", sev: "medium" },
    { rx: /always|never|all|none|every/i, name: "Hasty generalization", sev: "low" },
    { rx: /experts say|according to (an? )?expert/i, name: "Appeal to authority (unnamed)", sev: "low" },
    { rx: /if .* then .* will (collapse|fail|destroy|ruin)/i, name: "Slippery slope", sev: "high" },
    { rx: /because (it|that) is (obvious|clear|certain)/i, name: "Begging the question", sev: "medium" },
  ];
  sents.forEach((s) => {
    for (const f of fmap) {
      if (f.rx.test(s)) {
        fallacies.push({ name: f.name, excerpt: s.slice(0, 140), severity: f.sev });
        break;
      }
    }
  });

  return { views, fallacies };
};
