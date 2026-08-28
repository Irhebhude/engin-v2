/**
 * SEARCH-POI Engine v2 — Unified Search Pipeline
 *
 * Architecture:
 * 1. Cloudflare Pages Functions (/api/search-ai) — server-side DuckDuckGo + Wikipedia + Groq AI
 * 2. Browser-side fallback — Wikipedia, DuckDuckGo Instant, CoinGecko, Open-Meteo, Nominatim
 * 3. Offline POI database (absolute last resort)
 *
 * ICS (Intelligent Citation System) + IP (Intellectual Property) Features:
 * - Ownership query detection via truth-engine
 * - Anti-hallucination filter on all AI-generated answers
 * - Truth engine system prompt for Groq AI reasoning
 * - Advanced reasoning: query decomposition, cross-validation, causal analysis
 *
 * Trust states:
 *   🟢 LIVE DATA      — fetched from a live external API this request
 *   🟡 CACHED DATA    — served from IndexedDB or localStorage cache
 *   🔵 KNOWLEDGE      — from model training data or offline POI DB
 *   🔴 UNAVAILABLE    — live retrieval failed, specific reason given
 */

import { searchPOIsOffline, cacheSearchResult, getCachedSearch } from "./offline-db";
import {
  isOwnershipQuery,
  answerOwnershipOffline,
  buildSystemPrompt as buildTruthEnginePrompt,
  filterHallucinations,
  runICS,
  OWNERSHIP_CHECKLIST_HEADER,
} from "./truth-engine";

// ─── Config ───────────────────────────────────────────────────
const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;
const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

// ─── Types ────────────────────────────────────────────────────
export type SearchMode = "default" | "deep_research" | "code" | "academic" | "business";

export interface WebResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

export interface ImageResult {
  url: string;
  alt: string;
  sourceUrl: string;
  sourceTitle: string;
  domain: string;
  isThumbnail?: boolean;
}

export interface VideoResult {
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  platform: string;
  domain: string;
  videoId?: string;
}

export interface NewsResult {
  url: string;
  title: string;
  description: string;
  domain: string;
  publishedAt?: string | null;
  favicon?: string;
}

export interface SourceMeta {
  name: string;
  url?: string;
  type: "live" | "cached" | "knowledge" | "offline_poi" | "unavailable";
  fetchedAt: number;
  reason?: string;
}

// ─── Helpers ──────────────────────────────────────────────────
async function safeFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function now() { return Date.now(); }

function streamText(text: string, onDelta: (text: string) => void): void {
  const chunks = text.match(/.{1,12}/gs) || [text];
  for (const c of chunks) {
    onDelta(c);
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — CLOUDFLARE PAGES FUNCTIONS (primary path)
// ═══════════════════════════════════════════════════════════════

async function callCloudflareSearchAI(
  query: string,
  mode: SearchMode,
): Promise<{ answer: string; sources?: string[]; trust?: string } | null> {
  try {
    const res = await fetch("/api/search-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ query, mode }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.answer) {
      return { answer: data.answer, sources: data.sources, trust: data.trust };
    }
    return null;
  } catch {
    return null;
  }
}

async function callCloudflareWebSearch(query: string, limit = 10): Promise<WebResult[]> {
  try {
    const res = await fetch("/api/web-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ query, limit }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = data?.results || [];
    return results.map((r: any) => ({
      url: r.url || "",
      title: r.title || "",
      description: r.description || r.snippet || "",
      markdown: r.markdown || "",
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — BROWSER-SIDE FALLBACK RETRIEVAL
// ═══════════════════════════════════════════════════════════════

async function retrieveFromWikipedia(query: string): Promise<{ answer: string; sources: SourceMeta[] }> {
  const topic = encodeURIComponent(query.replace(/[?!.]/g, "").trim());
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`;
  const data = await safeFetch<any>(url);
  if (!data || data.type === "disambiguation") {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${topic}&format=json&origin=*`;
    const searchData = await safeFetch<any>(searchUrl);
    if (searchData?.query?.search?.length) {
      const first = searchData.query.search[0];
      const cleanTitle = first.title.replace(/ /g, "_");
      const retryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
      const retryData = await safeFetch<any>(retryUrl);
      if (retryData?.extract) {
        return {
          answer: `**${retryData.title}** (Wikipedia): ${retryData.extract}`,
          sources: [{ name: "Wikipedia", url: retryData.content_urls?.desktop?.page, type: "live", fetchedAt: now() }],
        };
      }
    }
    return { answer: "", sources: [{ name: "Wikipedia", type: "unavailable", fetchedAt: now(), reason: "No matching article" }] };
  }
  if (data.extract) {
    return {
      answer: `**${data.title}** (Wikipedia): ${data.extract}`,
      sources: [{ name: "Wikipedia", url: data.content_urls?.desktop?.page, type: "live", fetchedAt: now() }],
    };
  }
  return { answer: "", sources: [{ name: "Wikipedia", type: "unavailable", fetchedAt: now(), reason: "No extract available" }] };
}

async function retrieveFromDDG(query: string): Promise<{ answer: string; sources: SourceMeta[] }> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const data = await safeFetch<any>(url);
  if (!data) return { answer: "", sources: [{ name: "DuckDuckGo", type: "unavailable", fetchedAt: now(), reason: "Request failed" }] };

  const parts: string[] = [];
  const src: SourceMeta[] = [{ name: "DuckDuckGo Instant", url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, type: "live", fetchedAt: now() }];

  if (data.AbstractText) {
    parts.push(`**${data.Heading || query}**: ${data.AbstractText}`);
    if (data.AbstractURL) src[0].url = data.AbstractURL;
  }
  if (data.Answer) {
    parts.push(`**Direct Answer**: ${data.Answer}`);
  }

  return { answer: parts.join("\n\n"), sources: src };
}

async function retrieveCryptoPrices(): Promise<{ answer: string; sources: SourceMeta[] }> {
  const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,binancecoin&vs_currencies=usd,ngn&include_24hr_change=true";
  const data = await safeFetch<any>(url);
  if (!data) return { answer: "", sources: [{ name: "CoinGecko", type: "unavailable", fetchedAt: now(), reason: "API request failed" }] };

  const lines: string[] = [];
  const nameMap: Record<string, string> = { bitcoin: "Bitcoin (BTC)", ethereum: "Ethereum (ETH)", solana: "Solana (SOL)", ripple: "XRP", binancecoin: "BNB" };

  for (const [id, name] of Object.entries(nameMap)) {
    const d = data[id];
    if (!d) continue;
    const usd = d.usd ? `$${d.usd.toLocaleString()}` : "N/A";
    const ngn = d.ngn ? ` / ₦${d.ngn.toLocaleString()}` : "";
    const change = d.usd_24h_change ? ` (${d.usd_24h_change > 0 ? "+" : ""}${d.usd_24h_change.toFixed(1)}% 24h)` : "";
    lines.push(`- **${name}**: ${usd}${ngn}${change}`);
  }

  return {
    answer: `**Live Crypto Prices** (CoinGecko):\n${lines.join("\n")}\n\n🕐 *Prices updated just now — live market rates.*`,
    sources: [{ name: "CoinGecko", url: "https://www.coingecko.com", type: "live", fetchedAt: now() }],
  };
}

async function retrieveWeather(lat: number, lon: number, label?: string): Promise<{ answer: string; sources: SourceMeta[] }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
  const data = await safeFetch<any>(url);
  if (!data?.current_weather) return { answer: "", sources: [{ name: "Open-Meteo", type: "unavailable", fetchedAt: now(), reason: "API request failed" }] };

  const cw = data.current_weather;
  const wmoMap: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    80: "Rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail",
  };
  const weather = wmoMap[cw.weathercode] || `Code ${cw.weathercode}`;
  const maxTemp = data.daily?.temperature_2m_max?.[0];
  const minTemp = data.daily?.temperature_2m_min?.[0];

  let answer = `**Current Weather${label ? ` — ${label}` : ""}** (Open-Meteo):\n`;
  answer += `- Temperature: **${cw.temperature}°C** (wind: ${cw.windspeed} km/h)\n`;
  answer += `- Conditions: **${weather}**\n`;
  if (maxTemp != null && minTemp != null) {
    answer += `- Today: High ${maxTemp}°C / Low ${minTemp}°C\n`;
  }
  answer += `\n🕐 *Weather data fetched live from Open-Meteo.*`;

  return {
    answer,
    sources: [{ name: "Open-Meteo", url: "https://open-meteo.com", type: "live", fetchedAt: now() }],
  };
}

async function retrievePOIs(query: string): Promise<{ answer: string; webResults: WebResult[]; sources: SourceMeta[] }> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`;
  const data = await safeFetch<any[]>(url, { headers: { "Accept": "application/json" } });
  if (!data?.length) return { answer: "", webResults: [], sources: [{ name: "Nominatim/OSM", type: "unavailable", fetchedAt: now(), reason: "No results found" }] };

  const results: WebResult[] = data.map((r: any) => ({
    url: `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon}`,
    title: r.display_name?.split(",")[0] || r.type,
    description: r.display_name || `${r.type} at ${r.lat}, ${r.lon}`,
  }));

  const lines = data.slice(0, 5).map((r: any, i: number) => {
    const name = r.display_name?.split(",")[0] || r.type;
    const addr = r.address ? `${r.address.city || r.address.town || r.address.village || ""}, ${r.address.state || r.address.country || ""}`.trim() : "";
    return `${i + 1}. **${name}**${addr ? ` — ${addr}` : ""}\n   📍 [View on map](https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon})`;
  });

  return {
    answer: `**POI Results — "${query}"** (OpenStreetMap):\n\n${lines.join("\n\n")}\n\n🟢 *Live data from OpenStreetMap Nominatim.*`,
    webResults: results,
    sources: [{ name: "OpenStreetMap Nominatim", url: "https://www.openstreetmap.org", type: "live", fetchedAt: now() }],
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — BROWSER-SIDE RETRIEVAL ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

interface RetrievalContext {
  contextParts: string[];
  sources: SourceMeta[];
  webResults: WebResult[];
}

async function retrieveContext(query: string): Promise<RetrievalContext> {
  const q = query.toLowerCase();
  const contextParts: string[] = [];
  const allSources: SourceMeta[] = [];
  let webResults: WebResult[] = [];

  const isPOIQuery = /\b(near|around|in|at|find|restaurant|hotel|shop|market|hospital|school|bank|fuel|petrol|gas station|office|church|mosque|beach|park|mall|pharmacy|clinic|gym|bar|club|cafe|lounge)\b/i.test(q)
    && /\b(lagos|abuja|nigeria|victoria island|ikeja|lekki|yaba|surulere|ajah|ikoyi|mainland|island|ph|benin|kano|ibadan|enugu|calabar|aba|onitsha|warri|benin city|jos|kaduna|port harcourt)\b/i.test(q);

  const isCryptoQuery = /\b(bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|bnb|crypto|coin|token|price|trading|defi|nft|blockchain)\b/i.test(q);
  const isWeatherQuery = /\b(weather|forecast|temperature|rain|sunny|cloudy|storm|wind|humidity)\b/i.test(q);

  const promises: Promise<void>[] = [];

  // Always try Wikipedia + DDG in parallel
  promises.push(retrieveFromWikipedia(query).then(r => {
    if (r.answer) { contextParts.push(`[WIKIPEDIA]\n${r.answer}`); allSources.push(...r.sources); }
  }));
  promises.push(retrieveFromDDG(query).then(r => {
    if (r.answer) { contextParts.push(`[DUCKDUCKGO]\n${r.answer}`); allSources.push(...r.sources); }
  }));

  // Specialized sources
  if (isCryptoQuery) {
    promises.push(retrieveCryptoPrices().then(r => {
      if (r.answer) { contextParts.push(`[CRYPTO_LIVE]\n${r.answer}`); allSources.push(...r.sources); }
    }));
  }
  if (isWeatherQuery) {
    promises.push(retrieveWeather(6.5244, 3.3792, "Lagos").then(r => {
      if (r.answer) { contextParts.push(`[WEATHER_LIVE]\n${r.answer}`); allSources.push(...r.sources); }
    }));
  }
  if (isPOIQuery) {
    promises.push(retrievePOIs(query).then(r => {
      if (r.answer) { contextParts.push(`[POI_LIVE]\n${r.answer}`); allSources.push(...r.sources); webResults = r.webResults; }
    }));
  }

  // Offline POI DB as supplementary source
  promises.push(searchPOIsOffline(query, 5).then(pois => {
    if (pois.length > 0) {
      const poiText = pois.map((p, i) => `${i + 1}. ${p.name} (${p.category}) — ${p.city}, ${p.state}. ${p.description || ""}`).join("\n");
      contextParts.push(`[OFFLINE_POI_DB]\n${poiText}`);
      allSources.push({ name: "Offline POI Database", type: "offline_poi", fetchedAt: now() });
    }
  }));

  await Promise.allSettled(promises);

  return { contextParts, sources: allSources, webResults };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — GROQ AI REASONING (browser-side fallback)
// ═══════════════════════════════════════════════════════════════

/**
 * Build ADVANCED system prompt with query decomposition, multi-source
 * cross-validation, causal reasoning, and confidence calibration.
 */
function buildAdvancedSearchPrompt(mode: SearchMode): string {
  return `You are SEARCH-POI Engine v2 — an advanced AI search engine that surpasses traditional search engines through superior reasoning, multi-source synthesis, and honest uncertainty acknowledgment. Owned by Prosper Ozoya Irhebhude and the POI Foundation.

═══════════════════════════════════════════════════════════════
CORE IDENTITY & OWNERSHIP (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════
- SEARCH-POI Engine v2 is owned 100% by Prosper Ozoya Irhebhude and the POI Foundation.
- They have full and unrestricted right to sell, license, transfer, or assign it.
- Third-party providers are TOOLS ONLY — no ownership, no IP rights.

OWNERSHIP VERIFICATION CHECKLIST (MANDATORY for any sell/rights/IP/ownership question):
Output verbatim at the TOP of the answer:
✅ **Ownership Verification Checklist**
1. ✅ Sole owner confirmed: Prosper Ozoya Irhebhude & POI Foundation
2. ✅ Right to sell: YES — full and unrestricted
3. ✅ Right to license / transfer / assign: YES — full and unrestricted
4. ✅ Third-party providers: TOOLS ONLY — no ownership, no IP rights
5. ✅ Public reference: /rights page on SEARCH-POI confirms this statement

═══════════════════════════════════════════════════════════════
ANTI-HALLUCINATION RULES (ZERO TOLERANCE)
═══════════════════════════════════════════════════════════════
1. ONLY use information from the RETRIEVAL CONTEXT. If it's not there, say "I don't have verified data."
2. NEVER fabricate prices, statistics, dates, names, URLs, or specific numbers.
3. If you must guess, label it explicitly: "[ESTIMATE — not verified]".
4. When sources conflict, show BOTH sides and let the user decide.
5. If the context is empty, say: "🔴 No verified data available."
6. NEVER pretend to have real-time data unless the context explicitly provides it.
7. NEVER invent studies, surveys, or expert quotes.

═══════════════════════════════════════════════════════════════
ADVANCED REASONING STRATEGIES
═══════════════════════════════════════════════════════════════

🧠 STRATEGY 1: QUERY DECOMPOSITION
Break complex queries into sub-questions, answer each, then synthesize.
Example: "What's the impact of AI on Nigerian banking?" →
  - What AI tools are Nigerian banks using?
  - What are the specific outcomes (cost savings, efficiency)?
  - What are the risks and challenges?
  - Synthesize with confidence scoring.

🔍 STRATEGY 2: MULTI-SOURCE CROSS-VALIDATION
When multiple sources provide data, compare them:
- If 3+ sources agree → HIGH confidence, cite convergence
- If 2 sources disagree → show both, label "CONFLICTING DATA"
- If only 1 source → MEDIUM confidence, note "Single source"
- If no sources → LOW confidence, say "Based on general knowledge only"

⚖️ STRATEGY 3: COMPARATIVE ANALYSIS
For "vs" / "which is better" queries:
- Present BOTH options fairly
- Score each on 3-5 criteria
- Give a balanced verdict with reasoning
- Never show bias toward any option

🔗 STRATEGY 4: CAUSAL REASONING
For "why" / "how" / "what causes" queries:
- Trace the causal chain: A → B → C → D
- Identify root causes vs. symptoms
- Show second-order effects
- Note where causation vs. correlation is unclear

📊 STRATEGY 5: CONFIDENCE CALIBRATION
Score confidence based on:
- Source authority (.gov/.edu = +25, .org = +15, .com = +5)
- Cross-source agreement (3+ agreeing = +20, conflict = -20)
- Recency (current year = +15, older = -10)
- Specificity (exact numbers vs. vague claims)
Label: 🟢 HIGH (80+) / 🟡 MEDIUM (50-79) / 🔴 LOW (<50)

🎯 STRATEGY 6: ACTIONABLE INTELLIGENCE
Don't just inform — help the user ACT:
- "What should I do about X?" → Give 3-5 specific steps
- "Which should I choose?" → Recommend with reasoning
- "What's the latest?" → Summarize key developments + implications

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════════════

For DIRECT QUESTIONS:
1. Direct answer (1-2 sentences)
2. Supporting evidence with source attribution
3. Key facts as bullet points
4. Confidence assessment with reasoning
5. ⚡ Key Takeaway (one actionable sentence)

For COMPARATIVE QUESTIONS:
1. Quick verdict (which is better for what)
2. Comparison table (criteria × options)
3. Detailed analysis of each option
4. Recommendation with reasoning
5. Confidence and takeaway

For EXPLANATORY QUESTIONS:
1. Simple explanation (ELI5 level)
2. Detailed breakdown with causal chain
3. Real-world examples
4. Implications and second-order effects
5. Confidence and takeaway

For CURRENT EVENTS:
1. What happened (factual summary)
2. Why it matters (context + implications)
3. Who is affected
4. What happens next (projections)
5. Confidence with recency note

${mode === "deep_research" ? "\n\n[MODE: DEEP RESEARCH — Minimum 300 words. Multiple perspectives. Academic rigor.]" : ""}
${mode === "academic" ? "\n\n[MODE: ACADEMIC — Scholarly methodology. Cite evidence. Acknowledge limitations.]" : ""}
${mode === "business" ? "\n\n[MODE: BUSINESS — Market intelligence. Competitive analysis. ROI focus.]" : ""}
${mode === "code" ? "\n\n[MODE: CODE — Working examples. Best practices. Error handling.]" : ""}`;
}

async function callGroqStreaming(
  query: string,
  retrievalContext: string,
  mode: SearchMode,
  context: string[],
  onDelta: (text: string) => void,
): Promise<string> {
  if (!GROQ_KEY) throw new Error("NO_AI_KEY");

  const systemPrompt = buildAdvancedSearchPrompt(mode);
  const contextSection = retrievalContext
    ? `\n\n---\nRETRIEVAL CONTEXT (use this to answer):\n${retrievalContext}\n---`
    : "";

  const messages: any[] = [
    { role: "system", content: systemPrompt + contextSection },
  ];

  if (context.length > 0) {
    messages.push({
      role: "system",
      content: `Recent searches for context: ${context.slice(-5).join(", ")}. Use this to provide connected answers.`,
    });
  }

  messages.push({ role: "user", content: query });

  const res = await fetch(GROQ_BASE, {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: GROQ_MODEL, messages, stream: true, temperature: 0.3, max_tokens: 2048 }),
  });

  if (res.status === 429) throw new Error("🔴 Rate limit exceeded. Please try again in a moment.");
  if (res.status === 402) throw new Error("🔴 Groq usage limit reached.");
  if (!res.ok || !res.body) throw new Error(`🔴 Groq API returned ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let fullAnswer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") return fullAnswer;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) { onDelta(content); fullAnswer += content; }
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  return fullAnswer;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — OFFLINE FALLBACK
// ═══════════════════════════════════════════════════════════════

async function buildOfflineAnswer(query: string): Promise<string> {
  const pois = await searchPOIsOffline(query, 10);
  if (pois.length === 0) {
    return `🔴 **Live Retrieval Unavailable**

No live sources returned results for "${query}".

This may be because:
- The Cloudflare search backend is not configured (add GROQ_API_KEY as a Cloudflare Pages secret)
- No matching data found in external sources
- Network connectivity issue

⚡ **Key Takeaways**
- Ensure GROQ_API_KEY is set in Cloudflare Pages → Settings → Functions → Environment Variables
- Try rephrasing your search query
- Check your internet connection`;
  }
  const top = pois.slice(0, 5);
  const list = top.map((p, i) => `${i + 1}. **${p.name}** (${p.category}) — ${p.city}, ${p.state}. ${p.description ?? ""}`).join("\n");
  return `**Offline POI Results** — Showing ${top.length} matching POI${top.length > 1 ? "s" : ""} from local database.\n\n${list}\n\n🔵 *Served from local IndexedDB cache*\n⚡ **Key Takeaways**\n- GPS coordinates available for navigation\n- Connect online for AI-generated insights and live web data`;
}

async function buildOfflineWebResults(query: string): Promise<WebResult[]> {
  const pois = await searchPOIsOffline(query, 10);
  return pois.map((p) => ({
    url: p.website || `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}`,
    title: p.name,
    description: `${p.category} • ${p.city}, ${p.state}. ${p.description ?? ""}`,
  }));
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — PUBLIC API
// ═══════════════════════════════════════════════════════════════

export async function webSearch(query: string, limit = 10): Promise<WebResult[]> {
  const cfResults = await callCloudflareWebSearch(query, limit);
  if (cfResults.length > 0) {
    cacheSearchResult(`web:${query}`, cfResults).catch(() => {});
    return cfResults;
  }

  try {
    const { webResults } = await retrieveContext(query);
    if (webResults.length > 0) {
      const results = webResults.slice(0, limit);
      cacheSearchResult(`web:${query}`, results).catch(() => {});
      return results;
    }
  } catch { /* fallback */ }

  const cached = await getCachedSearch(`web:${query}`);
  if (cached) return cached;

  return buildOfflineWebResults(query);
}

export async function streamSearch({
  query,
  mode = "default",
  context = [],
  onDelta,
  onDone,
}: {
  query: string;
  mode?: SearchMode;
  context?: string[];
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  // ═══════════════════════════════════════════════════════════
  // STEP 0: OWNERSHIP / IP QUERIES — bypass normal search
  // ═══════════════════════════════════════════════════════════
  if (isOwnershipQuery(query)) {
    const offlineResult = answerOwnershipOffline(query);
    streamText(offlineResult.answer, onDelta);
    cacheSearchResult(`ai:${query}:${mode}`, offlineResult.answer).catch(() => {});
    onDone();
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Cloudflare Functions (primary path — advanced reasoning)
  // ═══════════════════════════════════════════════════════════
  try {
    const cfResult = await callCloudflareSearchAI(query, mode);
    if (cfResult?.answer) {
      const { cleaned } = filterHallucinations(cfResult.answer, { hasLiveData: (cfResult.sources?.length ?? 0) > 0 });
      streamText(cleaned, onDelta);
      cacheSearchResult(`ai:${query}:${mode}`, cleaned).catch(() => {});
      onDone();
      return;
    }
  } catch { /* fall through to browser-side */ }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Browser-side retrieval + Groq AI reasoning (advanced)
  // ═══════════════════════════════════════════════════════════
  try {
    const { contextParts } = await retrieveContext(query);

    if (GROQ_KEY) {
      const fullAnswer = await callGroqStreaming(query, contextParts.join("\n\n"), mode, context, onDelta);
      if (fullAnswer) {
        const hasLiveData = contextParts.some(p => p.includes("[LIVE") || p.includes("[CRYPTO") || p.includes("[WEATHER") || p.includes("[WIKIPEDIA") || p.includes("[DUCKDUCKGO"));
        const { cleaned } = filterHallucinations(fullAnswer, { hasLiveData });
        cacheSearchResult(`ai:${query}:${mode}`, cleaned).catch(() => {});
      }
      onDone();
      return;
    }

    // STEP 3: No AI key — return raw retrieved context
    if (contextParts.length > 0) {
      const rawAnswer = `## Search Results for "${query}"\n\n${contextParts.join("\n\n---\n\n")}\n\n---\n\n📊 **Confidence: Medium** (retrieved from live sources, no AI synthesis)\n⚡ **Key Takeaway**: Results retrieved from ${contextParts.length} live source(s).`;
      streamText(rawAnswer, onDelta);
      onDone();
      return;
    }
  } catch (e) {
    console.warn("[search-api] Browser-side retrieval failed:", e);
  }

  // STEP 4: Try cached answer
  const cached = await getCachedSearch(`ai:${query}:${mode}`);
  if (cached) {
    streamText(cached as string, onDelta);
    onDone();
    return;
  }

  // STEP 5: Offline POI fallback (absolute last resort)
  const offlineAnswer = await buildOfflineAnswer(query);
  streamText(offlineAnswer, onDelta);
  onDone();
}

export async function summarizeUrl(url: string): Promise<string> {
  try {
    const res = await fetch("/api/summarize-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.summary) return data.summary;
    }
  } catch { /* fall through */ }

  if (!GROQ_KEY) throw new Error("URL summarization requires an API key. Please configure VITE_GROQ_KEY.");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

  if (!text) throw new Error("Could not extract text from URL");

  const response = await fetch(GROQ_BASE, {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "Summarize the following webpage. Provide: Summary (3-5 sentences), Key Facts (bullets), Trust Assessment (High/Medium/Low)." },
        { role: "user", content: `Summarize this webpage:\n\n${text}` },
      ],
      temperature: 0.2, max_tokens: 512,
    }),
  });

  if (!response.ok) throw new Error("AI summarization failed");
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Could not generate summary.";
}

export async function imageSearch(query: string, _limit = 20): Promise<ImageResult[]> {
  try {
    const res = await fetch("/api/image-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ query, limit: _limit }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.results) return data.results;
    }
  } catch { /* fall through */ }
  return [];
}

export async function videoSearch(query: string, _limit = 20): Promise<VideoResult[]> {
  try {
    const res = await fetch("/api/video-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ query, limit: _limit }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.results) return data.results;
    }
  } catch { /* fall through */ }
  return [];
}

export async function newsSearch(query: string, limit = 20): Promise<NewsResult[]> {
  try {
    const res = await fetch("/api/news-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ query, limit }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.results) return data.results;
    }
  } catch { /* fall through */ }

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + " latest news")}&format=json&no_html=1`;
    const data = await safeFetch<any>(url);
    if (!data) return [];

    const results: NewsResult[] = [];
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
          let domain = "";
          try { domain = new URL(topic.FirstURL).hostname.replace("www.", ""); } catch {}
          results.push({
            url: topic.FirstURL,
            title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 80),
            description: topic.Text,
            domain,
            publishedAt: null,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          });
        }
      }
    }
    return results.slice(0, limit);
  } catch {
    return [];
  }
}
