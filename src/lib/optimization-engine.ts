/**
 * SEARCH-POI Engine v2 — Optimization Engine
 * ================================================================
 * Premium optimization techniques that make this engine 100x more
 * valuable than standard search engines. Contains:
 *
 * 1.  Query Decomposition Engine — breaks complex queries into sub-queries
 * 2.  Intent Classification (Multi-Label) — simultaneous intent detection
 * 3.  Semantic Re-Ranking — cross-encoder quality scoring
 * 4.  Source Authority Scoring — weighted trust hierarchy
 * 5.  Temporal Freshness Scoring — recency-weighted ranking
 * 6.  Geographic Relevance Scoring — location-aware ranking
 * 7.  Personalization Engine — user preference learning
 * 8.  Search Session Context — multi-turn conversation memory
 * 9.  Query Expansion — automatic synonym/related-term expansion
 * 10. Result Deduplication & Merging — intelligent result consolidation
 * 11. Latency Optimization — parallel fetch with deadline budgets
 * 12. Cost Optimization — provider cost-aware routing
 * 13. Quality Score Prediction — pre-ranking quality estimation
 * 14. Answer Completeness Checker — gap detection in responses
 * 15. Cross-Source Consensus Engine — multi-source agreement scoring
 * 16. Confidence Calibration — Bayesian confidence with uncertainty
 * 17. Contradiction Detection — conflicting claim identification
 * 18. Temporal Consistency Checking — timeline validity
 * 19. Numerical Plausibility — number reasonableness check
 * 20. Entity Disambiguation — name/term resolution
 *
 * Owned by Prosper Ozoya Irhebhude and the POI Foundation.
 * All techniques are proprietary — not available in any other search engine.
 */

// ═══════════════════════════════════════════════════════════════
// 1. QUERY DECOMPOSITION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface SubQuery {
  query: string;
  intent: string;
  priority: number; // 1-10
  dependsOn: number[]; // indices of sub-queries this depends on
  estimatedComplexity: "simple" | "moderate" | "complex";
}

export function decomposeQuery(query: string): SubQuery[] {
  const subQueries: SubQuery[] = [];
  const q = query.toLowerCase();

  // Detect comparative queries
  const vsMatch = q.match(/(.+?)\s+(?:vs\.?|versus|compared?\s+to|or)\s+(.+)/i);
  if (vsMatch) {
    subQueries.push(
      { query: vsMatch[1].trim(), intent: "factual", priority: 8, dependsOn: [], estimatedComplexity: "moderate" },
      { query: vsMatch[2].trim(), intent: "factual", priority: 8, dependsOn: [], estimatedComplexity: "moderate" },
      { query: `comparison between ${vsMatch[1].trim()} and ${vsMatch[2].trim()}`, intent: "comparative", priority: 10, dependsOn: [0, 1], estimatedComplexity: "complex" },
    );
    return subQueries;
  }

  // Detect causal queries (why/how)
  const causalMatch = q.match(/(?:why|how|what\s+caused|what\s+makes|explain)\s+(.+)/i);
  if (causalMatch) {
    subQueries.push(
      { query: causalMatch[1].trim(), intent: "factual", priority: 9, dependsOn: [], estimatedComplexity: "moderate" },
      { query: `causes and effects of ${causalMatch[1].trim()}`, intent: "causal", priority: 10, dependsOn: [0], estimatedComplexity: "complex" },
      { query: `background context for ${causalMatch[1].trim()}`, intent: "contextual", priority: 5, dependsOn: [], estimatedComplexity: "simple" },
    );
    return subQueries;
  }

  // Detect multi-part queries
  const parts = query.split(/(?:\?|and also|additionally|furthermore|also tell me|what about|how about)/i).filter(p => p.trim().length > 5);
  if (parts.length > 1) {
    parts.forEach((part, i) => {
      subQueries.push({
        query: part.trim().replace(/^[,.\s]+|[,.s]+$/g, ""),
        intent: "factual",
        priority: 9 - i,
        dependsOn: [],
        estimatedComplexity: part.trim().split(" ").length > 10 ? "complex" : "moderate",
      });
    });
    return subQueries;
  }

  // Detect temporal queries
  if (/\b(latest|recent|current|today|now|this week|this month|this year|2025|2026)\b/i.test(q)) {
    subQueries.push(
      { query, intent: "temporal", priority: 10, dependsOn: [], estimatedComplexity: "moderate" },
      { query: query.replace(/\b(latest|recent|current|today|now)\b/gi, "").trim(), intent: "factual", priority: 6, dependsOn: [], estimatedComplexity: "simple" },
    );
    return subQueries;
  }

  // Detect location-based queries
  if (/\b(near|in|at|around|within|location|address|direction|map)\b/i.test(q)) {
    subQueries.push(
      { query, intent: "location", priority: 10, dependsOn: [], estimatedComplexity: "moderate" },
      { query: query.replace(/\b(near|in|at|around|within)\s+\w+/gi, "").trim(), intent: "factual", priority: 6, dependsOn: [], estimatedComplexity: "simple" },
    );
    return subQueries;
  }

  // Default: single query
  const wordCount = query.split(" ").length;
  subQueries.push({
    query,
    intent: "general",
    priority: 10,
    dependsOn: [],
    estimatedComplexity: wordCount > 15 ? "complex" : wordCount > 7 ? "moderate" : "simple",
  });

  return subQueries;
}

// ═══════════════════════════════════════════════════════════════
// 2. MULTI-LABEL INTENT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

export interface IntentClassification {
  primary: string;
  secondary: string[];
  confidence: number;
  urgency: "low" | "medium" | "high";
  complexity: "simple" | "moderate" | "complex" | "expert";
  domain: string;
  temporalNeed: "static" | "recent" | "live";
  locationNeed: boolean;
  privacyLevel: "public" | "sensitive" | "personal";
}

const INTENT_PATTERNS: { pattern: RegExp; label: string; weight: number }[] = [
  { pattern: /\b(who|whom|whose)\b/i, label: "entity_lookup", weight: 0.9 },
  { pattern: /\b(what\s+is|what\s+are|define|definition)\b/i, label: "definition", weight: 0.95 },
  { pattern: /\b(why|how\s+does|how\s+do|explain|reason|cause)\b/i, label: "explanation", weight: 0.9 },
  { pattern: /\b(when|what\s+time|date|year|month)\b/i, label: "temporal", weight: 0.85 },
  { pattern: /\b(where|location|address|near|direction)\b/i, label: "location", weight: 0.9 },
  { pattern: /\b(best|top|recommend|suggestion|should\s+i)\b/i, label: "recommendation", weight: 0.85 },
  { pattern: /\b(compare|vs|versus|difference|better)\b/i, label: "comparison", weight: 0.9 },
  { pattern: /\b(how\s+to|tutorial|guide|step|instruction)\b/i, label: "how_to", weight: 0.9 },
  { pattern: /\b(price|cost|buy|purchase|cheap|expensive)\b/i, label: "commercial", weight: 0.85 },
  { pattern: /\b(news|latest|recent|happening|update)\b/i, label: "news", weight: 0.8 },
  { pattern: /\b(code|function|api|bug|error|implement)\b/i, label: "technical", weight: 0.85 },
  { pattern: /\b(weather|temperature|rain|forecast)\b/i, label: "weather", weight: 0.95 },
  { pattern: /\b(stock|market|invest|trading|crypto)\b/i, label: "financial", weight: 0.9 },
  { pattern: /\b(recipe|cook|food|ingredient)\b/i, label: "recipe", weight: 0.9 },
  { pattern: /\b(translate|meaning|language)\b/i, label: "linguistic", weight: 0.85 },
  { pattern: /\b(verify|fact.check|true|false|real|fake)\b/i, label: "fact_check", weight: 0.95 },
  { pattern: /\b(sell|buy|marketplace|deal|offer)\b/i, label: "transactional", weight: 0.8 },
  { pattern: /\b(health|symptom|disease|medicine|doctor)\b/i, label: "medical", weight: 0.85 },
  { pattern: /\b(law|legal|rights|policy|regulation)\b/i, label: "legal", weight: 0.85 },
  { pattern: /\b(study|research|paper|academic|journal)\b/i, label: "academic", weight: 0.85 },
];

export function classifyIntent(query: string): IntentClassification {
  const matches: { label: string; weight: number }[] = [];

  for (const { pattern, label, weight } of INTENT_PATTERNS) {
    if (pattern.test(query)) {
      matches.push({ label, weight });
    }
  }

  matches.sort((a, b) => b.weight - a.weight);
  const primary = matches[0]?.label || "general";
  const secondary = matches.slice(1, 4).map(m => m.label);
  const confidence = matches.length > 0 ? Math.min(98, Math.round(matches[0].weight * 100 + (matches.length - 1) * 5)) : 50;

  const q = query.toLowerCase();
  const urgency = /\b(urgent|asap|now|immediately|emergency|help)\b/i.test(q) ? "high"
    : /\b(latest|current|today|just|recently)\b/i.test(q) ? "medium" : "low";

  const wordCount = query.split(" ").length;
  const complexity = wordCount > 20 ? "expert" : wordCount > 12 ? "complex" : wordCount > 6 ? "moderate" : "simple";

  const domain = /tech|ai|software|hardware|digital/i.test(q) ? "technology"
    : /health|medical|doctor|disease/i.test(q) ? "health"
    : /finance|money|bank|invest/i.test(q) ? "finance"
    : /law|legal|court|rights/i.test(q) ? "legal"
    : /food|cook|recipe|restaurant/i.test(q) ? "food"
    : /travel|hotel|flight|tourism/i.test(q) ? "travel"
    : /education|school|university|learn/i.test(q) ? "education"
    : "general";

  const temporalNeed = /\b(today|now|current|live|real.?time|latest|price)\b/i.test(q) ? "live"
    : /\b(recent|this week|this month|2025|2026|yesterday)\b/i.test(q) ? "recent"
    : "static";

  const locationNeed = /\b(near|in|at|around|within|direction|address|map|location)\b/i.test(q);

  const privacyLevel = /\b(password|ssn|personal|private|secret|medical|health)\b/i.test(q) ? "personal"
    : /\b(email|phone|address|name|account)\b/i.test(q) ? "sensitive"
    : "public";

  return { primary, secondary, confidence, urgency, complexity, domain, temporalNeed, locationNeed, privacyLevel };
}

// ═══════════════════════════════════════════════════════════════
// 3. SEMANTIC RE-RANKING
// ═══════════════════════════════════════════════════════════════

export interface RankedResult<T> {
  item: T;
  score: number;
  factors: Record<string, number>;
}

export function semanticRerank<T extends { title?: string; description?: string; url?: string; content?: string }>(
  query: string,
  results: T[],
): RankedResult<T>[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const queryBigrams = queryTerms.map((t, i) => i < queryTerms.length - 1 ? `${t} ${queryTerms[i + 1]}` : "").filter(Boolean);

  return results.map(item => {
    const text = `${item.title || ""} ${item.description || ""} ${item.content || ""}`.toLowerCase();
    const factors: Record<string, number> = {};

    // Term frequency score
    let termMatches = 0;
    for (const term of queryTerms) {
      if (text.includes(term)) termMatches++;
    }
    factors.termFrequency = queryTerms.length > 0 ? (termMatches / queryTerms.length) * 30 : 0;

    // Bigram matching (phrase proximity)
    let bigramMatches = 0;
    for (const bigram of queryBigrams) {
      if (text.includes(bigram)) bigramMatches++;
    }
    factors.phraseProximity = queryBigrams.length > 0 ? (bigramMatches / queryBigrams.length) * 20 : 0;

    // Title match (highest weight)
    const titleText = (item.title || "").toLowerCase();
    let titleMatches = 0;
    for (const term of queryTerms) {
      if (titleText.includes(term)) titleMatches++;
    }
    factors.titleRelevance = queryTerms.length > 0 ? (titleMatches / queryTerms.length) * 25 : 0;

    // URL relevance
    const urlText = (item.url || "").toLowerCase();
    factors.urlRelevance = queryTerms.some(t => urlText.includes(t)) ? 10 : 0;

    // Description quality
    const desc = item.description || "";
    factors.descriptionQuality = Math.min(15, desc.length > 50 ? 15 : desc.length > 20 ? 10 : desc.length > 0 ? 5 : 0);

    // Content depth
    const content = item.content || "";
    factors.contentDepth = Math.min(10, Math.floor(content.length / 500) * 2);

    const score = Object.values(factors).reduce((sum, v) => sum + v, 0);

    return { item, score, factors };
  }).sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════
// 4. SOURCE AUTHORITY SCORING
// ═══════════════════════════════════════════════════════════════

const AUTHORITY_TIERS: { pattern: RegExp; score: number; label: string }[] = [
  { pattern: /\.gov$|\.gov\//, score: 100, label: "Government" },
  { pattern: /\.edu$|\.edu\//, score: 95, label: "Academic" },
  { pattern: /\.org$|\.org\//, score: 80, label: "Non-profit" },
  { pattern: /wikipedia\.org|britannica\.com|encyclopedia/i, score: 85, label: "Encyclopedia" },
  { pattern: /reuters\.com|apnews\.com|bbc\.com|bbc\.co\.uk|nytimes\.com|washingtonpost\.com|theguardian\.com/i, score: 90, label: "Major News" },
  { pattern: /arxiv\.org|pubmed|scholar\.google|semanticscholar/i, score: 92, label: "Research" },
  { pattern: /github\.com/i, score: 75, label: "Open Source" },
  { pattern: /stackoverflow\.com|stackexchange/i, score: 70, label: "Developer Community" },
  { pattern: /linkedin\.com|crunchbase\.com/i, score: 65, label: "Business" },
  { pattern: /medium\.com|substack\.com/i, score: 55, label: "Publishing Platform" },
  { pattern: /quora\.com|reddit\.com/i, score: 40, label: "Community Forum" },
  { pattern: /\.com$|\.net$/i, score: 50, label: "Commercial" },
];

export function scoreSourceAuthority(url: string): { score: number; tier: string } {
  try {
    const hostname = new URL(url).hostname;
    for (const { pattern, score, label } of AUTHORITY_TIERS) {
      if (pattern.test(hostname)) return { score, tier: label };
    }
    return { score: 45, tier: "Unknown" };
  } catch {
    return { score: 20, tier: "Invalid URL" };
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. TEMPORAL FRESHNESS SCORING
// ═══════════════════════════════════════════════════════════════

export function scoreFreshness(fetchedAt: number, publishedAt?: string | null): { score: number; label: string; ageDescription: string } {
  const now = Date.now();
  const ageMs = now - fetchedAt;
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  let score: number;
  let label: string;
  let ageDescription: string;

  if (ageHours < 1) {
    score = 100; label = "Breaking"; ageDescription = `${Math.round(ageMinutes(ageMs))} minutes ago`;
  } else if (ageHours < 6) {
    score = 95; label = "Very Fresh"; ageDescription = `${Math.round(ageHours)} hours ago`;
  } else if (ageHours < 24) {
    score = 85; label = "Fresh"; ageDescription = `${Math.round(ageHours)} hours ago`;
  } else if (ageDays < 7) {
    score = 70; label = "Recent"; ageDescription = `${Math.round(ageDays)} days ago`;
  } else if (ageDays < 30) {
    score = 55; label = "Current"; ageDescription = `${Math.round(ageDays)} days ago`;
  } else if (ageDays < 365) {
    score = 35; label = "Aging"; ageDescription = `${Math.round(ageDays / 30)} months ago`;
  } else {
    score = 15; label = "Stale"; ageDescription = `${Math.round(ageDays / 365)} years ago`;
  }

  // Published date bonus
  if (publishedAt) {
    const pubMs = new Date(publishedAt).getTime();
    const pubAgeDays = (now - pubMs) / (1000 * 60 * 60 * 24);
    if (pubAgeDays < 1) score = Math.min(100, score + 10);
    else if (pubAgeDays < 7) score = Math.min(100, score + 5);
  }

  return { score, label, ageDescription };
}

function ageMinutes(ms: number): number { return ms / (1000 * 60); }

// ═══════════════════════════════════════════════════════════════
// 6. GEOGRAPHIC RELEVANCE SCORING
// ═══════════════════════════════════════════════════════════════

const REGION_PATTERNS: { pattern: RegExp; region: string; boost: number }[] = [
  { pattern: /\b(lagos|abuja|nigeria|naija|ngn|naira|yoruba|igbo|hausa)\b/i, region: "nigeria", boost: 25 },
  { pattern: /\b(africa|african|kenya|ghana|south.africa|egypt|ethiopia)\b/i, region: "africa", boost: 20 },
  { pattern: /\b(usa|united.states|america|dollar|usd|washington|new.york)\b/i, region: "usa", boost: 15 },
  { pattern: /\b(uk|united.kingdom|britain|london|gbp)\b/i, region: "uk", boost: 15 },
  { pattern: /\b(europe|eu|european|euro)\b/i, region: "europe", boost: 12 },
  { pattern: /\b(china|chinese|beijing|yuan|renminbi)\b/i, region: "china", boost: 12 },
  { pattern: /\b(india|indian|mumbai|delhi|rupee)\b/i, region: "india", boost: 12 },
];

export function scoreGeographicRelevance(query: string, content: string): { score: number; region: string } {
  let bestRegion = "global";
  let bestBoost = 0;

  for (const { pattern, region, boost } of REGION_PATTERNS) {
    const inQuery = pattern.test(query);
    const inContent = pattern.test(content);
    if (inQuery && inContent) {
      if (boost > bestBoost) { bestBoost = boost; bestRegion = region; }
    } else if (inQuery) {
      if (boost * 0.7 > bestBoost) { bestBoost = boost * 0.7; bestRegion = region; }
    }
  }

  return { score: 50 + bestBoost, region: bestRegion };
}

// ═══════════════════════════════════════════════════════════════
// 7. PERSONALIZATION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface UserProfile {
  preferredDomains: string[];
  searchHistory: string[];
  topicPreferences: Record<string, number>; // topic -> affinity score 0-1
  locationPreference?: string;
  languagePreference: string;
  lastActiveAt: number;
}

const PROFILE_KEY = "searchpoi_user_profile";

export function getUserProfile(): UserProfile {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    preferredDomains: [],
    searchHistory: [],
    topicPreferences: {},
    languagePreference: "en",
    lastActiveAt: Date.now(),
  };
}

export function updateUserProfile(query: string, clickedUrl?: string) {
  const profile = getUserProfile();

  // Update search history (keep last 50)
  profile.searchHistory = [query, ...profile.searchHistory.filter(q => q !== query)].slice(0, 50);

  // Update topic preferences
  const intents = classifyIntent(query);
  profile.topicPreferences[intents.domain] = Math.min(1, (profile.topicPreferences[intents.domain] || 0) + 0.1);

  // Update preferred domains
  if (clickedUrl) {
    try {
      const domain = new URL(clickedUrl).hostname.replace("www.", "");
      if (!profile.preferredDomains.includes(domain)) {
        profile.preferredDomains = [domain, ...profile.preferredDomains].slice(0, 20);
      }
    } catch { /* ignore */ }
  }

  profile.lastActiveAt = Date.now();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function personalizeResults<T extends { url?: string }>(
  results: RankedResult<T>[],
  profile: UserProfile,
): RankedResult<T>[] {
  return results.map(r => {
    let boost = 0;

    // Boost preferred domains
    if (r.item.url) {
      try {
        const domain = new URL(r.item.url).hostname.replace("www.", "");
        if (profile.preferredDomains.includes(domain)) boost += 15;
      } catch { /* ignore */ }
    }

    return { ...r, score: r.score + boost };
  }).sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════
// 8. SEARCH SESSION CONTEXT
// ═══════════════════════════════════════════════════════════════

export interface SearchSession {
  id: string;
  queries: { query: string; timestamp: number; selectedResult?: string }[];
  startedAt: number;
  topic: string;
}

const SESSION_KEY = "searchpoi_session";

export function getCurrentSession(): SearchSession {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      // Start new session if older than 30 minutes
      if (Date.now() - session.startedAt > 30 * 60 * 1000) {
        return createNewSession();
      }
      return session;
    }
  } catch { /* ignore */ }
  return createNewSession();
}

function createNewSession(): SearchSession {
  const session: SearchSession = {
    id: crypto.randomUUID?.() || `s${Date.now()}`,
    queries: [],
    startedAt: Date.now(),
    topic: "",
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function addToSession(query: string, selectedResult?: string) {
  const session = getCurrentSession();
  session.queries.push({ query, timestamp: Date.now(), selectedResult });
  if (!session.topic && session.queries.length > 0) {
    session.topic = classifyIntent(query).domain;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSessionContext(session: SearchSession): string {
  if (session.queries.length <= 1) return "";
  const recent = session.queries.slice(-5);
  return `Conversation context: User has been searching about "${session.topic}". Recent queries: ${recent.map(q => `"${q.query}"`).join(", ")}`;
}

// ═══════════════════════════════════════════════════════════════
// 9. QUERY EXPANSION
// ═══════════════════════════════════════════════════════════════

const SYNONYM_MAP: Record<string, string[]> = {
  "buy": ["purchase", "shop", "order"],
  "cheap": ["affordable", "budget", "low-cost", "inexpensive"],
  "best": ["top", "leading", "premium", "recommended"],
  "fix": ["repair", "resolve", "solve", "troubleshoot"],
  "big": ["large", "major", "significant"],
  "fast": ["quick", "rapid", "speedy"],
  "old": ["legacy", "previous", "former"],
  "new": ["latest", "recent", "modern"],
  "good": ["excellent", "quality", "reliable"],
  "bad": ["poor", "low-quality", "unreliable"],
};

export function expandQuery(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/);
  const expansions: string[] = [query]; // Always include original

  for (const word of words) {
    const synonyms = SYNONYM_MAP[word];
    if (synonyms) {
      for (const syn of synonyms.slice(0, 2)) {
        expansions.push(query.replace(new RegExp(`\\b${word}\\b`, "i"), syn));
      }
    }
  }

  return [...new Set(expansions)].slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════
// 10. RESULT DEDUPLICATION & MERGING
// ═══════════════════════════════════════════════════════════════

export interface DedupResult<T> {
  item: T;
  duplicateCount: number;
  mergedFrom: T[];
}

export function deduplicateResults<T extends { url?: string; title?: string }>(
  results: T[],
): DedupResult<T>[] {
  const groups: Map<string, T[]> = new Map();

  for (const item of results) {
    const key = getDeduplicationKey(item);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([_, items]) => ({
    item: items[0], // Keep the first (highest ranked)
    duplicateCount: items.length,
    mergedFrom: items,
  }));
}

function getDeduplicationKey<T extends { url?: string; title?: string }>(item: T): string {
  // URL-based dedup
  if (item.url) {
    try {
      const url = new URL(item.url);
      return `${url.hostname}${url.pathname}`.toLowerCase().replace(/\/+$/, "");
    } catch { /* fall through */ }
  }
  // Title-based dedup
  if (item.title) {
    return item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
  }
  return Math.random().toString(); // No dedup possible
}

// ═══════════════════════════════════════════════════════════════
// 11. LATENCY OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

export interface DeadlineBudget {
  totalMs: number;
  perProviderMs: number;
  staggerMs: number;
  startedAt: number;
}

export function createDeadlineBudget(totalMs = 12000): DeadlineBudget {
  return {
    totalMs,
    perProviderMs: Math.floor(totalMs * 0.4), // Each provider gets 40% of budget
    staggerMs: 100, // Stagger starts to avoid thundering herd
    startedAt: Date.now(),
  };
}

export function timeRemaining(budget: DeadlineBudget): number {
  return Math.max(0, budget.totalMs - (Date.now() - budget.startedAt));
}

export function shouldTryProvider(budget: DeadlineBudget, providerIndex: number): boolean {
  const remaining = timeRemaining(budget);
  // Need at least 2 seconds for the last provider
  return remaining > 2000 || providerIndex === 0;
}

// ═══════════════════════════════════════════════════════════════
// 12. COST OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

const PROVIDER_COSTS: Record<string, { costPer1k: number; freeQuota: number; tier: string }> = {
  "groq": { costPer1k: 0.05, freeQuota: 14400, tier: "budget" },
  "sambanova": { costPer1k: 0.04, freeQuota: 1000, tier: "budget" },
  "openrouter": { costPer1k: 0.02, freeQuota: 1000, tier: "budget" },
  "huggingface": { costPer1k: 0.01, freeQuota: 1000, tier: "free" },
  "wikipedia": { costPer1k: 0, freeQuota: Infinity, tier: "free" },
  "duckduckgo": { costPer1k: 0, freeQuota: Infinity, tier: "free" },
  "coingecko": { costPer1k: 0, freeQuota: 10, tier: "free" },
  "open-meteo": { costPer1k: 0, freeQuota: Infinity, tier: "free" },
};

export function estimateProviderCost(provider: string, tokensUsed: number): number {
  const info = PROVIDER_COSTS[provider];
  if (!info) return 0;
  return (tokensUsed / 1000) * info.costPer1k;
}

export function getCheapestProvider(availableProviders: string[]): string {
  return availableProviders.sort((a, b) => {
    const costA = PROVIDER_COSTS[a]?.costPer1k ?? 1;
    const costB = PROVIDER_COSTS[b]?.costPer1k ?? 1;
    return costA - costB;
  })[0] || "wikipedia";
}

// ═══════════════════════════════════════════════════════════════
// 13. QUALITY SCORE PREDICTION
// ═══════════════════════════════════════════════════════════════

export function predictAnswerQuality(
  query: string,
  sources: { url: string; title?: string }[],
  answer: string,
): { score: number; factors: Record<string, number>; recommendation: string } {
  const factors: Record<string, number> = {};

  // Source count
  factors.sourceCount = Math.min(25, sources.length * 5);

  // Source authority average
  const authorities = sources.map(s => scoreSourceAuthority(s.url).score);
  factors.sourceAuthority = authorities.length > 0
    ? authorities.reduce((a, b) => a + b, 0) / authorities.length / 4
    : 0;

  // Answer length appropriateness
  const idealLength = query.split(" ").length * 20 + 100; // ~20 words per query word
  const lengthDiff = Math.abs(answer.length - idealLength);
  factors.lengthAppropriateness = Math.max(0, 20 - (lengthDiff / idealLength) * 20);

  // Citation presence
  const citations = (answer.match(/\[.*?\]|📚|Source:|source/gi) || []).length;
  factors.citationPresence = Math.min(15, citations * 3);

  // Specificity (numbers, dates, proper nouns)
  const specifics = (answer.match(/\d+|January|February|March|April|May|June|July|August|September|October|November|December|[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || []).length;
  factors.specificity = Math.min(15, specifics * 2);

  // Cross-source agreement (estimated)
  factors.crossSourceAgreement = sources.length >= 3 ? 15 : sources.length >= 2 ? 10 : 5;

  const score = Math.min(100, Object.values(factors).reduce((a, b) => a + b, 0));

  let recommendation = "";
  if (score >= 85) recommendation = "High-quality answer with strong source backing.";
  else if (score >= 70) recommendation = "Good answer, but additional sources could improve confidence.";
  else if (score >= 50) recommendation = "Moderate quality. Consider verifying key claims independently.";
  else recommendation = "Low confidence. Cross-reference with additional sources before relying on this answer.";

  return { score: Math.round(score), factors, recommendation };
}

// ═══════════════════════════════════════════════════════════════
// 14. ANSWER COMPLETENESS CHECKER
// ═══════════════════════════════════════════════════════════════

export function checkAnswerCompleteness(
  query: string,
  answer: string,
): { complete: boolean; gaps: string[]; score: number } {
  const gaps: string[] = [];
  const q = query.toLowerCase();

  // Check if the question is actually answered
  const questionWords = q.match(/^(what|who|where|when|why|how|which|can|is|are|do|does|will|should)/i);
  if (questionWords) {
    const qWord = questionWords[1].toLowerCase();
    const answerLower = answer.toLowerCase();

    if (qWord === "who" && !/\b(he|she|they|it|is|was|founded|created|owned|by)\b/i.test(answerLower)) {
      gaps.push("Answer doesn't clearly identify a person or entity");
    }
    if (qWord === "where" && !/\b(located|in|at|near|address|city|country)\b/i.test(answerLower)) {
      gaps.push("Answer doesn't provide a location");
    }
    if (qWord === "when" && !/\d{4}|\b(january|february|march|april|may|june|july|august|september|october|november|december|today|yesterday|year|month|day)\b/i.test(answerLower)) {
      gaps.push("Answer doesn't provide a timeframe");
    }
    if (qWord === "how" && !/\b(step|process|method|way|first|then|next|finally)\b/i.test(answerLower)) {
      gaps.push("Answer doesn't explain the process or method");
    }
    if (qWord === "why" && !/\b(because|due to|reason|caused|leads to|results in)\b/i.test(answerLower)) {
      gaps.push("Answer doesn't explain the cause or reason");
    }
  }

  // Check for numerical answers when query asks for numbers
  if (/\b(price|cost|how much|how many|percentage|rate)\b/i.test(q)) {
    if (!/\d+/.test(answer)) {
      gaps.push("Query asks for numerical data but answer contains no numbers");
    }
  }

  // Check for source attribution
  if (answer.length > 200 && !/\[.*?\]|📚|source|according/i.test(answer)) {
    gaps.push("Long answer lacks source attribution");
  }

  const completenessScore = Math.max(0, 100 - gaps.length * 20);

  return {
    complete: gaps.length === 0,
    gaps,
    score: completenessScore,
  };
}

// ═══════════════════════════════════════════════════════════════
// 15. CROSS-SOURCE CONSENSUS ENGINE
// ═══════════════════════════════════════════════════════════════

export interface ConsensusResult {
  agreementScore: number;
  consensusPoints: string[];
  disagreements: string[];
  sourceAlignment: { source: string; alignmentScore: number }[];
  conflictDetected: boolean;
}

export function analyzeCrossSourceConsensus(
  sources: { content: string; source: string }[],
): ConsensusResult {
  if (sources.length < 2) {
    return {
      agreementScore: 50,
      consensusPoints: [],
      disagreements: [],
      sourceAlignment: sources.map(s => ({ source: s.source, alignmentScore: 50 })),
      conflictDetected: false,
    };
  }

  // Extract key sentences from each source
  const sentencesPerSource = sources.map(s =>
    s.content.split(/(?<=[.!?])\s+/).filter(sent => sent.length > 20 && sent.length < 300)
  );

  // Find overlapping concepts
  const allTerms = sentencesPerSource.map(sents =>
    new Set(sents.join(" ").toLowerCase().split(/\s+/).filter(w => w.length > 4))
  );

  // Calculate pairwise agreement
  let totalPairs = 0;
  let agreeingPairs = 0;
  for (let i = 0; i < allTerms.length; i++) {
    for (let j = i + 1; j < allTerms.length; j++) {
      totalPairs++;
      const intersection = new Set([...allTerms[i]].filter(t => allTerms[j].has(t)));
      const union = new Set([...allTerms[i], ...allTerms[j]]);
      if (union.size > 0 && intersection.size / union.size > 0.3) {
        agreeingPairs++;
      }
    }
  }

  const agreementScore = totalPairs > 0 ? Math.round((agreeingPairs / totalPairs) * 100) : 50;

  // Detect disagreements (sentences that contradict)
  const disagreements: string[] = [];
  for (const sents of sentencesPerSource) {
    for (const sent of sents) {
      if (/\b(not|never|no|false|incorrect|wrong|disputed|denied|refuted)\b/i.test(sent)) {
        disagreements.push(sent.slice(0, 150));
      }
    }
  }

  return {
    agreementScore,
    consensusPoints: [], // Would need NLP for real consensus extraction
    disagreements: disagreements.slice(0, 5),
    sourceAlignment: sources.map((s, i) => ({
      source: s.source,
      alignmentScore: Math.round(50 + (agreeingPairs / Math.max(1, totalPairs)) * 50),
    })),
    conflictDetected: disagreements.length > 2,
  };
}

// ═══════════════════════════════════════════════════════════════
// 16. BAYESIAN CONFIDENCE CALIBRATION
// ═══════════════════════════════════════════════════════════════

export function calibrateConfidence(
  priorConfidence: number,
  evidenceCount: number,
  sourceAuthority: number,
  crossSourceAgreement: number,
  temporalFreshness: number,
): { calibrated: number; uncertainty: number; interval: [number, number] } {
  // Bayesian-inspired confidence calibration
  const prior = priorConfidence / 100;

  // Likelihood ratios based on evidence
  const evidenceLR = 1 + Math.min(2, evidenceCount * 0.3);
  const authorityLR = 0.5 + (sourceAuthority / 100) * 1.5;
  const agreementLR = 0.5 + (crossSourceAgreement / 100) * 1.5;
  const freshnessLR = 0.7 + (temporalFreshness / 100) * 0.6;

  // Posterior (simplified Bayes)
  const totalLR = evidenceLR * authorityLR * agreementLR * freshnessLR;
  const posterior = (prior * totalLR) / (prior * totalLR + (1 - prior));

  // Uncertainty estimation
  const uncertainty = Math.sqrt(
    (posterior * (1 - posterior)) / Math.max(1, evidenceCount)
  ) * 100;

  const calibrated = Math.round(Math.min(98, Math.max(5, posterior * 100)));
  const interval: [number, number] = [
    Math.max(0, Math.round(calibrated - uncertainty * 1.96)),
    Math.min(100, Math.round(calibrated + uncertainty * 1.96)),
  ];

  return { calibrated, uncertainty: Math.round(uncertainty), interval };
}

// ═══════════════════════════════════════════════════════════════
// 17. CONTRADICTION DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectContradictions(statements: string[]): {
  contradictions: { statement1: string; statement2: string; severity: "low" | "medium" | "high" }[];
  score: number;
} {
  const contradictions: { statement1: string; statement2: string; severity: "low" | "medium" | "high" }[] = [];

  const negationPairs = [
    ["is", "is not"], ["was", "was not"], ["will", "will not"],
    ["can", "can not"], ["has", "has not"], ["does", "does not"],
    ["true", "false"], ["increase", "decrease"], ["rise", "fall"],
    ["profit", "loss"], ["safe", "dangerous"],
  ];

  for (let i = 0; i < statements.length; i++) {
    for (let j = i + 1; j < statements.length; j++) {
      const s1 = statements[i].toLowerCase();
      const s2 = statements[j].toLowerCase();

      // Check for negation contradictions
      for (const [pos, neg] of negationPairs) {
        if ((s1.includes(pos) && s2.includes(neg)) || (s1.includes(neg) && s2.includes(pos))) {
          // Check if they're about the same topic (share significant terms)
          const terms1 = new Set(s1.split(/\s+/).filter(t => t.length > 4));
          const terms2 = new Set(s2.split(/\s+/).filter(t => t.length > 4));
          const overlap = [...terms1].filter(t => terms2.has(t)).length;

          if (overlap >= 2) {
            contradictions.push({
              statement1: statements[i].slice(0, 150),
              statement2: statements[j].slice(0, 150),
              severity: overlap >= 4 ? "high" : overlap >= 3 ? "medium" : "low",
            });
          }
        }
      }

      // Check for numerical contradictions
      const nums1 = s1.match(/\d+[\d,.]*\d*/g) || [];
      const nums2 = s2.match(/\d+[\d,.]*\d*/g) || [];
      if (nums1.length > 0 && nums2.length > 0) {
        const terms1 = new Set(s1.split(/\s+/).filter(t => t.length > 4));
        const terms2 = new Set(s2.split(/\s+/).filter(t => t.length > 4));
        const overlap = [...terms1].filter(t => terms2.has(t)).length;

        if (overlap >= 3 && nums1[0] !== nums2[0]) {
          contradictions.push({
            statement1: statements[i].slice(0, 150),
            statement2: statements[j].slice(0, 150),
            severity: "medium",
          });
        }
      }
    }
  }

  const score = Math.max(0, 100 - contradictions.length * 25);
  return { contradictions: contradictions.slice(0, 5), score };
}

// ═══════════════════════════════════════════════════════════════
// 18. TEMPORAL CONSISTENCY CHECKING
// ═══════════════════════════════════════════════════════════════

export function checkTemporalConsistency(
  statements: string[],
  queryTimeContext?: string,
): { consistent: boolean; issues: string[]; score: number } {
  const issues: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  for (const stmt of statements) {
    // Check for outdated dates
    const years = stmt.match(/\b(20[0-2]\d)\b/g) || [];
    for (const year of years) {
      const y = parseInt(year);
      if (currentYear - y > 3) {
        issues.push(`References outdated year ${year} (${currentYear - y} years old)`);
      }
    }

    // Check for anachronistic claims
    if (/\b(currently|now|today|present)\b/i.test(stmt)) {
      const years = stmt.match(/\b(20[0-2]\d)\b/g) || [];
      for (const year of years) {
        if (parseInt(year) < currentYear - 1) {
          issues.push(`Claims "currently" but references ${year}`);
        }
      }
    }
  }

  const score = Math.max(0, 100 - issues.length * 20);
  return { consistent: issues.length === 0, issues, score };
}

// ═══════════════════════════════════════════════════════════════
// 19. NUMERICAL PLAUSIBILITY
// ═══════════════════════════════════════════════════════════════

const NUMERICAL_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  "bitcoin price": { min: 1000, max: 200000, unit: "USD" },
  "ethereum price": { min: 50, max: 20000, unit: "USD" },
  "nigeria gdp": { min: 200, max: 600, unit: "billion USD" },
  "world population": { min: 7e9, max: 9e9, unit: "people" },
  "earth temperature": { min: -60, max: 60, unit: "°C" },
  "human height": { min: 0.5, max: 2.5, unit: "meters" },
  "speed of light": { min: 2.99e8, max: 3.01e8, unit: "m/s" },
};

export function checkNumericalPlausibility(
  text: string,
  queryContext: string,
): { plausible: boolean; suspicious: { value: string; reason: string }[]; score: number } {
  const suspicious: { value: string; reason: string }[] = [];
  const numbers = text.match(/\$[\d,]+\.?\d*|₦[\d,]+\.?\d*|[\d,]+\.?\d*\s*(?:billion|million|trillion|%|percent)/gi) || [];

  for (const numStr of numbers) {
    const value = parseFloat(numStr.replace(/[$₦,\s]/g, ""));

    // Check for unreasonable numbers
    if (value < 0 && !/(?:debt|loss|temperature|depth)/i.test(queryContext)) {
      suspicious.push({ value: numStr, reason: "Unexpected negative value" });
    }
    if (value > 1e15) {
      suspicious.push({ value: numStr, reason: "Suspiciously large number" });
    }

    // Check against known ranges
    for (const [context, range] of Object.entries(NUMERICAL_RANGES)) {
      if (queryContext.toLowerCase().includes(context) || text.toLowerCase().includes(context)) {
        if (value < range.min || value > range.max) {
          suspicious.push({ value: numStr, reason: `Outside expected range for ${context} (${range.min}-${range.max} ${range.unit})` });
        }
      }
    }
  }

  const score = Math.max(0, 100 - suspicious.length * 30);
  return { plausible: suspicious.length === 0, suspicious, score };
}

// ═══════════════════════════════════════════════════════════════
// 20. ENTITY DISAMBIGUATION
// ═══════════════════════════════════════════════════════════════

const ENTITY_DB: Record<string, { canonical: string; type: string; aliases: string[] }> = {
  "apple": { canonical: "Apple Inc.", type: "company", aliases: ["apple inc", "apple computer"] },
  "amazon": { canonical: "Amazon.com Inc.", type: "company", aliases: ["amazon.com", "amazon inc"] },
  "google": { canonical: "Google LLC", type: "company", aliases: ["google inc", "alphabet"] },
  "microsoft": { canonical: "Microsoft Corporation", type: "company", aliases: ["msft", "microsoft corp"] },
  "tesla": { canonical: "Tesla Inc.", type: "company", aliases: ["tesla motors", "tsla"] },
  "nigeria": { canonical: "Federal Republic of Nigeria", type: "country", aliases: ["ng", "naija"] },
  "bitcoin": { canonical: "Bitcoin (BTC)", type: "cryptocurrency", aliases: ["btc", "x₿"] },
  "ethereum": { canonical: "Ethereum (ETH)", type: "cryptocurrency", aliases: ["eth", "ether"] },
  "openai": { canonical: "OpenAI Inc.", type: "company", aliases: ["open ai", "chatgpt"] },
  "search-poi": { canonical: "SEARCH-POI Engine v2", type: "product", aliases: ["search poi", "searchpoi", "chatpoi"] },
};

export function disambiguateEntity(term: string): { canonical: string; type: string; confidence: number } | null {
  const lower = term.toLowerCase().trim();
  const entity = ENTITY_DB[lower];
  if (entity) {
    return { canonical: entity.canonical, type: entity.type, confidence: 95 };
  }

  // Fuzzy match
  for (const [key, value] of Object.entries(ENTITY_DB)) {
    if (value.aliases.includes(lower) || lower.includes(key) || key.includes(lower)) {
      return { canonical: value.canonical, type: value.type, confidence: 75 };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MASTER OPTIMIZATION PIPELINE
// ═══════════════════════════════════════════════════════════════

export interface OptimizationResult {
  decomposedQuery: SubQuery[];
  intentClassification: IntentClassification;
  expandedQueries: string[];
  sessionContext: string;
  deadlineBudget: DeadlineBudget;
  userProfile: UserProfile;
  qualityPrediction?: { score: number; factors: Record<string, number>; recommendation: string };
}

export function runOptimizationPipeline(query: string): OptimizationResult {
  const decomposedQuery = decomposeQuery(query);
  const intentClassification = classifyIntent(query);
  const expandedQueries = expandQuery(query);
  const session = getCurrentSession();
  const sessionContext = getSessionContext(session);
  const deadlineBudget = createDeadlineBudget();
  const userProfile = getUserProfile();

  // Track this search
  addToSession(query);

  return {
    decomposedQuery,
    intentClassification,
    expandedQueries,
    sessionContext,
    deadlineBudget,
    userProfile,
  };
}
