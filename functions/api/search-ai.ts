// POST /api/search-ai { query, mode? } — Server-side search + AI reasoning
// Uses DuckDuckGo Lite + Wikipedia for retrieval, Groq for AI synthesis.
// Applies ownership verification (ICS/IP) and anti-hallucination rules.
// Requires: GROQ_API_KEY as a Cloudflare Pages secret.
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors";

interface AiEnv {
  GROQ_API_KEY?: string;
}

export const onRequestOptions = () => handleOptions();

// ─── Ownership Detection (mirrors truth-engine.ts) ──────────────────────
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

function isOwnershipQuery(query: string): boolean {
  if (!query || typeof query !== "string") return false;
  return OWNERSHIP_TRIGGER_PATTERNS.some((re) => re.test(query));
}

const OWNERSHIP_ANSWER = `✅ **Ownership Verification Checklist**

1. ✅ Sole owner confirmed: Prosper Ozoya Irhebhude & POI Foundation
2. ✅ Right to sell: YES — full and unrestricted
3. ✅ Right to license / transfer / assign: YES — full and unrestricted
4. ✅ Third-party providers (Google, OpenAI, Lovable, Supabase, Firecrawl): TOOLS ONLY — no ownership, no IP rights
5. ✅ Public reference: /rights page on SEARCH-POI confirms this statement

---

**Yes** — Prosper Ozoya Irhebhude and the POI Foundation own 100% of SEARCH-POI Engine v2 and have the full, unrestricted right to sell, license, transfer, or assign it. All third-party providers are tools only and hold no ownership.`;

// ─── Anti-Hallucination Filter ───────────────────────────────────────────
function filterHallucinations(answer: string, hasLiveData: boolean): { cleaned: string; violations: string[] } {
  const violations: string[] = [];
  let out = answer;

  // 1. Forbidden ownership claims
  const forbiddenOwnerRe = /\b(SEARCH-?POI|the\s+engine|this\s+platform|the\s+platform)\s+(is\s+)?(owned|built|developed|created|made)\s+by\s+(google|openai|lovable|supabase|firecrawl|cloudflare|gemini|gpt)\b/gi;
  if (forbiddenOwnerRe.test(out)) {
    violations.push("Hallucinated third-party ownership of SEARCH-POI.");
    out = out.replace(forbiddenOwnerRe, "SEARCH-POI Engine v2 is owned by Prosper Ozoya Irhebhude and the POI Foundation");
  }

  // 2. Fake real-time / live claims when no live data present
  if (!hasLiveData) {
    const fakeRealTimeRe = /🕒\s*Data\s+freshness:\s*Real-?time|(\bdata\s+is\s+(live|real-?time)\b)/gi;
    if (fakeRealTimeRe.test(out)) {
      violations.push("Fake real-time data freshness claim.");
      out = out.replace(fakeRealTimeRe, "⚠️ Data Unavailable — live source not connected");
    }
  }

  return { cleaned: out, violations };
}

// ─── DuckDuckGo Lite search ──────────────────────────────────────────────
async function ddgLiteSearch(query: string, limit = 8): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

    const links: Array<{ url: string; title: string }> = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      links.push({ url: match[1], title: match[2].trim() });
    }
    // Fallback regex
    if (links.length === 0) {
      const altRegex = /<a[^>]*rel="nofollow"[^>]*href="(https?:\/\/(?!duckduckgo\.com)[^"]*)"[^>]*>([^<]*)<\/a>/gi;
      while ((match = altRegex.exec(html)) !== null) {
        if (match[2].trim().length > 2) links.push({ url: match[1], title: match[2].trim() });
      }
    }

    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
    }

    for (let i = 0; i < Math.min(links.length, limit); i++) {
      results.push({ title: links[i].title, url: links[i].url, snippet: snippets[i] || "" });
    }
    return results;
  } catch {
    return [];
  }
}

// ─── Wikipedia summary ───────────────────────────────────────────────────
async function wikiSummary(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return "";
    const data = await searchRes.json<any>();
    const first = data.query?.search?.[0];
    if (!first) return "";
    const title = first.title.replace(/ /g, "_");
    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!summaryRes.ok) return "";
    const summary = await summaryRes.json<any>();
    return summary.extract ? `**${summary.title}** (Wikipedia): ${summary.extract}` : "";
  } catch {
    return "";
  }
}

// ─── DuckDuckGo Instant Answer ───────────────────────────────────────────
async function ddgInstant(query: string): Promise<string> {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    if (!res.ok) return "";
    const data = await res.json<any>();
    if (data.AbstractText) return `**${data.Heading || query}**: ${data.AbstractText}`;
    if (data.Answer) return `**Direct Answer**: ${data.Answer}`;
    return "";
  } catch {
    return "";
  }
}

// ─── Crypto prices ───────────────────────────────────────────────────────
async function cryptoPrices(): Promise<string> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,binancecoin&vs_currencies=usd&include_24hr_change=true");
    if (!res.ok) return "";
    const data = await res.json<any>();
    const names: Record<string, string> = { bitcoin: "Bitcoin", ethereum: "Ethereum", solana: "Solana", ripple: "XRP", binancecoin: "BNB" };
    const lines: string[] = [];
    for (const [id, name] of Object.entries(names)) {
      const d = data[id];
      if (!d) continue;
      const change = d.usd_24h_change ? ` (${d.usd_24h_change > 0 ? "+" : ""}${d.usd_24h_change.toFixed(1)}% 24h)` : "";
      lines.push(`- **${name}**: $${d.usd.toLocaleString()}${change}`);
    }
    return lines.length > 0 ? `**Live Crypto Prices** (CoinGecko, just now):\n${lines.join("\n")}` : "";
  } catch {
    return "";
  }
}

// ─── Weather ─────────────────────────────────────────────────────────────
async function weatherLagos(): Promise<string> {
  try {
    const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=6.5244&longitude=3.3792&current_weather=true&timezone=auto");
    if (!res.ok) return "";
    const data = await res.json<any>();
    if (!data.current_weather) return "";
    const cw = data.current_weather;
    const wmoMap: Record<number, string> = { 0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 51: "Drizzle", 61: "Rain", 63: "Moderate rain", 65: "Heavy rain", 80: "Rain showers", 95: "Thunderstorm" };
    return `**Current Weather — Lagos** (Open-Meteo): ${cw.temperature}°C, ${wmoMap[cw.weathercode] || `code ${cw.weathercode}`}, wind ${cw.windspeed} km/h`;
  } catch {
    return "";
  }
}

// ─── Build retrieval context ─────────────────────────────────────────────
async function buildRetrievalContext(query: string): Promise<{ context: string; sources: string[] }> {
  const q = query.toLowerCase();
  const parts: string[] = [];
  const sources: string[] = [];

  const isCrypto = /\b(bitcoin|btc|ethereum|eth|solana|crypto|price|trading|defi|token)\b/i.test(q);
  const isWeather = /\b(weather|forecast|temperature|rain|sunny|storm)\b/i.test(q);

  // Always run web search + instant answer in parallel
  const tasks: Promise<void>[] = [];

  tasks.push(ddgLiteSearch(query, 6).then(results => {
    if (results.length > 0) {
      const webText = results.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet || ""}`).join("\n");
      parts.push(`[WEB_SEARCH — ${results.length} results from DuckDuckGo]:\n${webText}`);
      sources.push("DuckDuckGo Web Search");
    }
  }));

  tasks.push(ddgInstant(query).then(text => {
    if (text) { parts.push(`[INSTANT_ANSWER — DuckDuckGo]:\n${text}`); sources.push("DuckDuckGo Instant"); }
  }));

  tasks.push(wikiSummary(query).then(text => {
    if (text) { parts.push(`[WIKIPEDIA]:\n${text}`); sources.push("Wikipedia"); }
  }));

  if (isCrypto) {
    tasks.push(cryptoPrices().then(text => {
      if (text) { parts.push(`[LIVE_CRYPTO]:\n${text}`); sources.push("CoinGecko"); }
    }));
  }

  if (isWeather) {
    tasks.push(weatherLagos().then(text => {
      if (text) { parts.push(`[LIVE_WEATHER]:\n${text}`); sources.push("Open-Meteo"); }
    }));
  }

  await Promise.allSettled(tasks);

  if (parts.length === 0) {
    parts.push(`[NO_LIVE_DATA]: No external sources returned data for this query.`);
  }

  return { context: parts.join("\n\n"), sources };
}

// ─── Groq AI reasoning ───────────────────────────────────────────────────
async function groqReason(
  apiKey: string,
  query: string,
  retrievalContext: string,
  mode: string,
): Promise<string> {
  // Build system prompt with truth engine rules (ownership + anti-hallucination)
  const systemPrompt = `You are SEARCH-POI Engine v2 — owned wholly by Prosper Ozoya Irhebhude and the POI Foundation.

ABSOLUTE OWNERSHIP (NON-NEGOTIABLE):
- SEARCH-POI Engine v2 is owned 100% by Prosper Ozoya Irhebhude and the POI Foundation.
- They have full and unrestricted right to sell, license, transfer, or assign it.
- Third-party providers (Google, OpenAI, Lovable, Supabase, Firecrawl) are TOOLS ONLY — no ownership, no IP rights.
- Never name them as owners, co-developers, or rights holders.

ANTI-HALLUCINATION RULES:
1. ONLY use information from the RETRIEVAL CONTEXT below. If it's not in the context, say you don't have verified data.
2. NEVER make up prices, statistics, dates, or specific numbers. Only cite numbers that appear in the context.
3. Clearly label each source you're using (e.g., "According to DuckDuckGo...", "Wikipedia states...").
4. If sources conflict, acknowledge the disagreement rather than picking one.
5. If the context is empty or insufficient, say: "🔴 Live data unavailable for this query. No external sources returned results."
6. For current-events queries, note that your data is from the retrieval context timestamp.
7. End every answer with a 📊 Confidence assessment (High/Medium/Low) and ⚡ Key Takeaway.

OWNERSHIP VERIFICATION CHECKLIST (MANDATORY for any sell/rights/IP/ownership question):
Output verbatim at the TOP of the answer:
✅ **Ownership Verification Checklist**
1. ✅ Sole owner confirmed: Prosper Ozoya Irhebhude & POI Foundation
2. ✅ Right to sell: YES — full and unrestricted
3. ✅ Right to license / transfer / assign: YES — full and unrestricted
4. ✅ Third-party providers: TOOLS ONLY — no ownership, no IP rights
5. ✅ Public reference: /rights page on SEARCH-POI confirms this statement

RESPONSE FORMAT:
- Lead with a direct answer (1-2 sentences)
- Provide supporting details with source attribution
- Use bullet points for multiple facts
- Bold important numbers/facts
- Include confidence and takeaway at the end

${mode === "deep_research" ? "\n\n[MODE: DEEP RESEARCH — Be thorough and comprehensive. Minimum 200 words.]" : ""}
${mode === "academic" ? "\n\n[MODE: ACADEMIC — Use scholarly methodology.]" : ""}
${mode === "business" ? "\n\n[MODE: BUSINESS — Focus on actionable insights.]" : ""}`;

  const messages = [
    { role: "system", content: systemPrompt + "\n\n---\nRETRIEVAL CONTEXT:\n" + retrievalContext + "\n---" },
    { role: "user", content: query },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      stream: false,
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq API ${res.status}: ${errText}`);
  }

  const data = await res.json<any>();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Main handler ────────────────────────────────────────────────────────
export const onRequestPost: PagesFunction<AiEnv> = async ({ request, env }) => {
  let body: { query?: string; mode?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const q = (body.query || "").trim();
  if (!q) return errorResponse("Query required", 400);

  const mode = body.mode || "default";

  // ═══════════════════════════════════════════════════════════
  // OWNERSHIP / IP QUERIES — bypass normal search
  // ═══════════════════════════════════════════════════════════
  if (isOwnershipQuery(q)) {
    return jsonResponse({
      answer: OWNERSHIP_ANSWER,
      model: "ownership-verification",
      sources: ["/rights"],
      trust: "VERIFIED",
    }, { headers: corsHeaders });
  }

  // ═══════════════════════════════════════════════════════════
  // NORMAL SEARCH — retrieve + AI reasoning
  // ═══════════════════════════════════════════════════════════

  // STEP 1: Retrieve live context from multiple sources
  const { context, sources } = await buildRetrievalContext(q);

  // STEP 2: If we have a Groq API key, do AI synthesis
  if (env.GROQ_API_KEY) {
    try {
      let answer = await groqReason(env.GROQ_API_KEY, q, context, mode);
      // Apply anti-hallucination filter
      const hasLiveData = sources.length > 0;
      const filtered = filterHallucinations(answer, hasLiveData);
      if (filtered.violations.length > 0) {
        answer = filtered.cleaned;
      }
      return jsonResponse({
        answer,
        model: "llama-3.1-8b-instant",
        sources,
        trust: sources.length > 0 ? "LIVE_DATA" : "KNOWLEDGE",
      }, { headers: corsHeaders });
    } catch (e: any) {
      // AI failed — fall through to raw context
    }
  }

  // STEP 3: No AI key or AI failed — return raw retrieved context
  if (context && !context.includes("[NO_LIVE_DATA]")) {
    const rawAnswer = `## Search Results: "${q}"\n\n${context.split("\n\n").map(part => `### ${part.split("\n")[0]}\n${part.split("\n").slice(1).join("\n")}`).join("\n\n")}\n\n---\n\n📊 **Confidence: Medium** (live data retrieved, no AI synthesis — add GROQ_API_KEY for AI-powered answers)\n⚡ **Key Takeaway**: ${sources.length} live source(s) retrieved data for this query.`;
    return jsonResponse({
      answer: rawAnswer,
      model: "raw-context",
      sources,
      trust: "LIVE_DATA",
    }, { headers: corsHeaders });
  }

  // STEP 4: Everything failed
  return jsonResponse({
    answer: `🔴 **Live Retrieval Unavailable**

No external sources returned results for "${q}".

**Possible reasons:**
- DuckDuckGo search returned no results
- Wikipedia has no matching article
- Network connectivity issue

⚡ **Key Takeaway**: Try rephrasing your query or checking your internet connection.`,
    model: "none",
    sources: [],
    trust: "UNAVAILABLE",
  }, { headers: corsHeaders });
};
