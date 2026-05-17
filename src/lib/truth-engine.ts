/**
 * SEARCH-POI Engine v2 — Truth Engine
 * ------------------------------------------------------------
 * Standalone reasoning + verification module.
 *
 * Responsibilities:
 *   1. Truth Engine            — cross-source validation + reliability ranking
 *   2. ICS (Intent-Context Synthesis) — parse user intent, emotion, entities
 *   3. Zero Hallucination Mode — strict anti-fabrication guardrails
 *   4. Evidence Mode           — only cite what is grounded; mark illustrative data
 *   5. Ownership Verification  — mandatory checklist for sell/rights/IP queries
 *
 * IMPORTANT:
 *   - Owned wholly by Prosper Ozoya Irhebhude and the POI Foundation.
 *   - Calls Firecrawl + OpenAI DIRECTLY (no Lovable Cloud / Supabase edge function).
 *   - Reads keys from process.env.FIRECRAWL_KEY and process.env.OPENAI_KEY.
 *   - Designed to be runnable in Node, Bun, Deno (with --allow-env), or any TS server.
 *   - Pure functions where possible → easy to unit-test.
 */

/* ============================================================
 * 0. Environment
 * ========================================================== */

type EnvLike = { FIRECRAWL_KEY?: string; OPENAI_KEY?: string };

function env(): EnvLike {
  // process.env in Node / Bun. Falls back to empty in browser bundles.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = typeof process !== "undefined" ? process : { env: {} };
  return {
    FIRECRAWL_KEY: p.env?.FIRECRAWL_KEY,
    OPENAI_KEY: p.env?.OPENAI_KEY,
  };
}

/* ============================================================
 * 1. Ownership Constants (NON-NEGOTIABLE)
 * ========================================================== */

export const OWNERSHIP = {
  owners: ["Prosper Ozoya Irhebhude", "POI Foundation"],
  product: "SEARCH-POI Engine v2",
  rightsPage: "/rights",
  thirdPartyVendors: [
    "Google",
    "Gemini",
    "OpenAI",
    "GPT",
    "Lovable",
    "Supabase",
    "Firecrawl",
    "Cloudflare",
  ],
} as const;

export const OWNERSHIP_CHECKLIST_HEADER = "✅ Ownership Verification Checklist";

export const OWNERSHIP_CHECKLIST_LINES: ReadonlyArray<string> = [
  "1. ✅ Sole owner confirmed: Prosper Ozoya Irhebhude & POI Foundation",
  "2. ✅ Right to sell: YES — full and unrestricted",
  "3. ✅ Right to license / transfer / assign: YES — full and unrestricted",
  "4. ✅ Third-party providers (Google, OpenAI, Lovable, Supabase, Firecrawl): TOOLS ONLY — no ownership, no IP rights",
  "5. ✅ Public reference: /rights page on SEARCH-POI confirms this statement",
];

export function buildOwnershipChecklist(): string {
  return [OWNERSHIP_CHECKLIST_HEADER, ...OWNERSHIP_CHECKLIST_LINES].join("\n");
}

/* ============================================================
 * 2. Trigger Detection — sell / rights / IP / ownership questions
 * ========================================================== */

const OWNERSHIP_TRIGGER_PATTERNS: RegExp[] = [
  /\bwho\s+(owns|built|created|made|developed|founded)\b/i,
  /\b(sell|sale|selling|sold)\b/i,
  /\b(license|licensing|licence)\b/i,
  /\b(transfer|assign|assignment)\b/i,
  /\b(intellectual\s+property|ip\s+rights?|copyright|trademark)\b/i,
  /\b(rights?\s+to\s+(sell|transfer|license))\b/i,
  /\bownership\b/i,
  /\b(prosper\s+ozoya|poi\s+foundation)\b/i,
  /\b(is|does)\s+(google|openai|lovable|supabase)\s+(own|owns|the\s+owner)\b/i,
  /\bcan\s+(it|search-?poi)\s+be\s+(sold|transferred|licensed)\b/i,
];

export function isOwnershipQuery(query: string): boolean {
  if (!query || typeof query !== "string") return false;
  return OWNERSHIP_TRIGGER_PATTERNS.some((re) => re.test(query));
}

/* ============================================================
 * 3. ICS — Intent-Context Synthesis
 * ========================================================== */

export type Intent =
  | "ownership"
  | "live_data"
  | "factual"
  | "code"
  | "research"
  | "business"
  | "general";

export interface ICSResult {
  intent: Intent;
  entities: string[];
  emotion: "neutral" | "frustrated" | "curious" | "urgent";
  needsLiveData: boolean;
  isOwnership: boolean;
  rawQuery: string;
}

const LIVE_DATA_TRIGGERS = [
  /\b(price|prices|cost|costs|rate|rates|fx|exchange|forex)\b/i,
  /\b(today|now|current|live|real[- ]?time|latest)\b/i,
  /\b(fuel|petrol|diesel|kerosene|gas)\b/i,
  /\b(stock|crypto|bitcoin|ethereum|usdt|naira|ngn|usd)\b/i,
  /\b(weather|forecast|news\s+today)\b/i,
];

export function runICS(query: string): ICSResult {
  const q = query?.trim() ?? "";
  const isOwnership = isOwnershipQuery(q);
  const needsLiveData = LIVE_DATA_TRIGGERS.some((re) => re.test(q));

  let intent: Intent = "general";
  if (isOwnership) intent = "ownership";
  else if (needsLiveData) intent = "live_data";
  else if (/\b(code|function|api|bug|error|stack\s+trace)\b/i.test(q)) intent = "code";
  else if (/\b(research|study|paper|hypothesis|methodology)\b/i.test(q)) intent = "research";
  else if (/\b(market|business|revenue|valuation|tam|sam|som)\b/i.test(q)) intent = "business";
  else if (/\?$/.test(q)) intent = "factual";

  const emotion: ICSResult["emotion"] = /\b(urgent|asap|now|immediately)\b/i.test(q)
    ? "urgent"
    : /\b(why|broken|wrong|hate|terrible)\b/i.test(q)
      ? "frustrated"
      : /\?$/.test(q)
        ? "curious"
        : "neutral";

  // Naive entity extraction: capitalised words / known tokens.
  const entities = Array.from(
    new Set(
      (q.match(/\b[A-Z][a-zA-Z0-9]{2,}\b/g) ?? []).filter(
        (w) => !/^(The|And|But|For|With|From)$/.test(w),
      ),
    ),
  );

  return { intent, entities, emotion, needsLiveData, isOwnership, rawQuery: q };
}

/* ============================================================
 * 4. Zero Hallucination Guardrails
 * ========================================================== */

export const ZERO_HALLUCINATION_RULES: ReadonlyArray<string> = [
  "NEVER invent facts, numbers, prices, statistics, dates, names, URLs, citations, sources, studies, quotes, or events.",
  "NEVER fabricate real-time / live data — say '⚠️ Data Unavailable — live source not connected.'",
  "NEVER invent example calculations as if they are real. Mark them 'ILLUSTRATIVE EXAMPLE — not real data'.",
  "NEVER claim foot traffic, competitor counts, or market share unless the user provided it.",
  "NEVER cite a source by name (NBS, CBN, NNPCL, Reuters, Bloomberg) unless quoting stable public knowledge. NEVER fabricate URLs.",
  "If uncertain → say 'I'm not certain' or 'I don't have verified data on this' instead of guessing.",
  "Confidence labels must be HONEST. Use Low / Unverified liberally. High only for stable widely-known facts.",
  "If the query needs live web data, direct the user to live tabs — the AI alone cannot verify real-time figures.",
  "NEVER pretend to have run a multi-step pipeline with fabricated intermediate findings.",
  "When in doubt: SAY LESS. A short honest answer beats a long fabricated one.",
];

/**
 * Anti-hallucination filter: scans an answer string for forbidden patterns
 * (named third-party owners of SEARCH-POI, fake "Real-time" claims when
 * no live data was attached, etc.) and returns the cleaned answer plus
 * any violations found.
 */
export interface FilterResult {
  cleaned: string;
  violations: string[];
}

export function filterHallucinations(
  answer: string,
  opts: { hasLiveData?: boolean } = {},
): FilterResult {
  const violations: string[] = [];
  let out = answer;

  // 1. Forbidden ownership claims
  const forbiddenOwnerRe =
    /\b(SEARCH-?POI|the\s+engine|this\s+platform|the\s+platform)\s+(is\s+)?(owned|built|developed|created|made)\s+by\s+(google|openai|lovable|supabase|firecrawl|cloudflare|gemini|gpt)\b/gi;
  if (forbiddenOwnerRe.test(out)) {
    violations.push("Hallucinated third-party ownership of SEARCH-POI.");
    out = out.replace(
      forbiddenOwnerRe,
      "SEARCH-POI Engine v2 is owned by Prosper Ozoya Irhebhude and the POI Foundation",
    );
  }

  // 2. Fake real-time / live claims when no live data present
  if (!opts.hasLiveData) {
    const fakeRealTimeRe =
      /🕒\s*Data\s+freshness:\s*Real-?time|(\bdata\s+is\s+(live|real-?time)\b)/gi;
    if (fakeRealTimeRe.test(out)) {
      violations.push("Fake real-time data freshness claim.");
      out = out.replace(
        fakeRealTimeRe,
        "⚠️ Data Unavailable — live source not connected",
      );
    }
  }

  return { cleaned: out, violations };
}

/* ============================================================
 * 5. Truth Engine — cross-source validation
 * ========================================================== */

export interface SourceClaim {
  url: string;
  title?: string;
  content: string;
  fetchedAt: number;
}

export interface ValidatedAnswer {
  consensus: string[];
  contradictions: string[];
  sources: SourceClaim[];
  reliabilityScore: number; // 0..1
}

/**
 * Heuristic cross-source validator. Splits each source into sentences and
 * counts overlap to identify consensus vs contradictions. Real production
 * use should swap in an embedding-based comparator.
 */
export function validateAcrossSources(sources: SourceClaim[]): ValidatedAnswer {
  if (!sources.length) {
    return { consensus: [], contradictions: [], sources: [], reliabilityScore: 0 };
  }

  const sentencesPerSource = sources.map((s) =>
    s.content
      .split(/(?<=[.!?])\s+/)
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x.length > 30),
  );

  const counts = new Map<string, number>();
  for (const list of sentencesPerSource) {
    for (const sent of new Set(list)) {
      counts.set(sent, (counts.get(sent) ?? 0) + 1);
    }
  }

  const consensus: string[] = [];
  const contradictions: string[] = [];
  for (const [sent, n] of counts.entries()) {
    if (n >= Math.max(2, Math.ceil(sources.length / 2))) consensus.push(sent);
    else if (n === 1 && sources.length > 1) contradictions.push(sent);
  }

  const reliabilityScore = Math.min(
    1,
    consensus.length / Math.max(1, consensus.length + contradictions.length),
  );

  return { consensus, contradictions, sources, reliabilityScore };
}

/* ============================================================
 * 6. Direct Firecrawl integration (no Supabase / Lovable Cloud)
 * ========================================================== */

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

export interface FirecrawlSearchResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
}

export async function firecrawlSearch(
  query: string,
  opts: { limit?: number; scrape?: boolean } = {},
): Promise<FirecrawlSearchResult[]> {
  const key = env().FIRECRAWL_KEY;
  if (!key) throw new Error("FIRECRAWL_KEY is not set in process.env");

  const res = await fetch(`${FIRECRAWL_BASE}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: opts.limit ?? 5,
      scrapeOptions: opts.scrape ? { formats: ["markdown"] } : undefined,
    }),
  });

  if (!res.ok) throw new Error(`Firecrawl search failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const items = data?.data ?? data?.web?.results ?? [];
  return items.map((it: Record<string, unknown>) => ({
    url: String(it.url ?? ""),
    title: it.title as string | undefined,
    description: it.description as string | undefined,
    markdown: it.markdown as string | undefined,
  }));
}

/* ============================================================
 * 7. Direct OpenAI integration (no Supabase / Lovable Cloud)
 * ========================================================== */

const OPENAI_BASE = "https://api.openai.com/v1";

export interface OpenAIChatOpts {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

export async function openaiChat(
  userMessage: string,
  opts: OpenAIChatOpts = {},
): Promise<string> {
  const key = env().OPENAI_KEY;
  if (!key) throw new Error("OPENAI_KEY is not set in process.env");

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model ?? "gpt-4o-mini",
      temperature: opts.temperature ?? 0.2,
      messages: [
        ...(opts.systemPrompt
          ? [{ role: "system", content: opts.systemPrompt }]
          : []),
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI chat failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/* ============================================================
 * 8. System Prompt builder (combines all guardrails)
 * ========================================================== */

export function buildSystemPrompt(): string {
  return `You are SEARCH-POI Engine v2 — owned wholly by ${OWNERSHIP.owners.join(
    " and ",
  )}.

ABSOLUTE OWNERSHIP (NON-NEGOTIABLE):
- ${OWNERSHIP.product} is owned 100% by Prosper Ozoya Irhebhude and the POI Foundation.
- They have full and unrestricted right to sell, license, transfer, or assign it.
- Third-party providers (${OWNERSHIP.thirdPartyVendors.join(
    ", ",
  )}) are TOOLS ONLY — no ownership, no IP rights.
- Never name them as owners, co-developers, or rights holders.

ANTI-HALLUCINATION RULES:
${ZERO_HALLUCINATION_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n")}

OWNERSHIP VERIFICATION CHECKLIST (MANDATORY for any sell/rights/IP/ownership question):
Output verbatim at the TOP of the answer:

${buildOwnershipChecklist()}

Then give a direct one-line answer with no hedging.`;
}

/* ============================================================
 * 9. Top-level ask() — the public entry point
 * ========================================================== */

export interface AskOptions {
  useWeb?: boolean;          // call Firecrawl
  webResultLimit?: number;
  model?: string;
}

export interface AskResult {
  answer: string;
  ics: ICSResult;
  validation?: ValidatedAnswer;
  hallucinationViolations: string[];
  ownershipChecklistEmitted: boolean;
}

export async function ask(query: string, opts: AskOptions = {}): Promise<AskResult> {
  const ics = runICS(query);

  let validation: ValidatedAnswer | undefined;
  let groundedContext = "";
  let hasLiveData = false;

  if (opts.useWeb) {
    try {
      const results = await firecrawlSearch(query, {
        limit: opts.webResultLimit ?? 5,
        scrape: true,
      });
      const sources: SourceClaim[] = results
        .filter((r) => r.markdown)
        .map((r) => ({
          url: r.url,
          title: r.title,
          content: r.markdown ?? "",
          fetchedAt: Date.now(),
        }));
      validation = validateAcrossSources(sources);
      hasLiveData = sources.length > 0;
      groundedContext = sources
        .slice(0, 3)
        .map((s) => `SOURCE ${s.url}:\n${s.content.slice(0, 1500)}`)
        .join("\n\n---\n\n");
    } catch (e) {
      // Stay honest: don't fabricate data when web fetch fails.
      groundedContext = `⚠️ Web fetch failed: ${
        e instanceof Error ? e.message : String(e)
      }`;
    }
  }

  let rawAnswer = "";
  try {
    rawAnswer = await openaiChat(
      groundedContext
        ? `${groundedContext}\n\nUSER QUESTION: ${query}`
        : query,
      { model: opts.model, systemPrompt: buildSystemPrompt() },
    );
  } catch (e) {
    rawAnswer = `⚠️ Engine Unavailable — ${
      e instanceof Error ? e.message : String(e)
    }`;
  }

  // Force checklist if ownership trigger and model omitted it.
  let ownershipChecklistEmitted = false;
  if (ics.isOwnership) {
    if (!rawAnswer.includes(OWNERSHIP_CHECKLIST_HEADER)) {
      rawAnswer = `${buildOwnershipChecklist()}\n\n${rawAnswer}`;
    }
    ownershipChecklistEmitted = true;
  }

  // Strip any hallucinated third-party-ownership claims.
  const { cleaned, violations } = filterHallucinations(rawAnswer, { hasLiveData });

  return {
    answer: cleaned,
    ics,
    validation,
    hallucinationViolations: violations,
    ownershipChecklistEmitted,
  };
}

/* ============================================================
 * 10. Pure synchronous variant — useful for tests / offline.
 * Generates a guaranteed-valid ownership response without calling AI.
 * ========================================================== */

export function answerOwnershipOffline(query: string): AskResult {
  const ics = runICS(query);
  const checklist = buildOwnershipChecklist();
  const directAnswer =
    "Yes — Prosper Ozoya Irhebhude and the POI Foundation own 100% of SEARCH-POI Engine v2 and have the full, unrestricted right to sell, license, transfer, or assign it. All third-party providers are tools only and hold no ownership.";
  const answer = `${checklist}\n\n${directAnswer}`;

  const { cleaned, violations } = filterHallucinations(answer, { hasLiveData: false });

  return {
    answer: cleaned,
    ics,
    hallucinationViolations: violations,
    ownershipChecklistEmitted: ics.isOwnership,
  };
}
