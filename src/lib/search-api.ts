/**
 * SEARCH-POI Engine v2 — Browser-Side Retrieval Pipeline
 *
 * Replaces the broken Supabase Edge Function calls with a self-contained
 * browser-side pipeline that uses:
 *   - Groq API (VITE_GROQ_KEY) for AI reasoning
 *   - DuckDuckGo Instant Answers (free, no key) for web knowledge
 *   - Wikipedia REST API (free, no key) for factual knowledge
 *   - CoinGecko API (free, no key) for crypto/financial data
 *   - Open-Meteo API (free, no key) for weather
 *   - Offline POI IndexedDB for location data
 *
 * Trust-state indicators:
 *   🟢 LIVE DATA      — fetched from a live external API this request
 *   🟡 CACHED DATA    — served from IndexedDB or localStorage cache
 *   🔵 KNOWLEDGE      — from model training data or offline POI DB
 *   🔴 UNAVAILABLE    — live retrieval failed, specific reason given
 */

import { searchPOIsOffline, cacheSearchResult, getCachedSearch } from "./offline-db";

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

/** Metadata about where retrieved data came from */
export interface SourceMeta {
  name: string;
  url?: string;
  type: "live" | "cached" | "knowledge" | "offline_poi" | "unavailable";
  fetchedAt: number;
  reason?: string; // when unavailable, explain why
}

// ─── Helpers ──────────────────────────────────────────────────
const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

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

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — RETRIEVAL FUNCTIONS (browser-callable)
// ═══════════════════════════════════════════════════════════════

/**
 * DuckDuckGo Instant Answer API — free, CORS-enabled, no key.
 * Returns a short answer + related topics for factual queries.
 */
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
  // Related topics
  if (data.RelatedTopics?.length) {
    const related = data.RelatedTopics
      .filter((t: any) => t.Text && !t.FirstURL?.includes("duckduckgo.com"))
      .slice(0, 4)
      .map((t: any) => `- ${t.Text}`)
      .join("\n");
    if (related) parts.push(`**Related**: \n${related}`);
  }

  return { answer: parts.join("\n\n"), sources: src };
}

/**
 * Wikipedia REST API — free, CORS-enabled, no key.
 * Returns summary text for a topic.
 */
async function retrieveFromWikipedia(query: string): Promise<{ answer: string; sources: SourceMeta[] }> {
  // Try a direct topic match first
  const topic = encodeURIComponent(query.replace(/[?!.]/g, "").trim());
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`;
  const data = await safeFetch<any>(url);
  if (!data || data.type === "disambiguation") {
    // Try search API for disambiguation
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

/**
 * CoinGecko API — free, CORS-enabled, no key.
 * Returns live crypto prices.
 */
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
    const ngn = d.ngn ? `₦${d.ngn.toLocaleString()}` : "";
    const change = d.usd_24h_change ? `${d.usd_24h_change > 0 ? "+" : ""}${d.usd_24h_change.toFixed(1)}%` : "";
    lines.push(`- **${name}**: ${usd}${ngn ? ` / ${ngn}` : ""}${change ? ` (${change} 24h)` : ""}`);
  }

  return {
    answer: `**Live Crypto Prices** (CoinGecko):\n${lines.join("\n")}\n\n🕐 *Prices updated just now — these are live market rates.*`,
    sources: [{ name: "CoinGecko", url: "https://www.coingecko.com", type: "live", fetchedAt: now() }],
  };
}

/**
 * Open-Meteo API — free, CORS-enabled, no key.
 * Returns current weather for given coordinates.
 */
async function retrieveWeather(lat: number, lon: number, label?: string): Promise<{ answer: string; sources: SourceMeta[] }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
  const data = await safeFetch<any>(url);
  if (!data?.current_weather) return { answer: "", sources: [{ name: "Open-Meteo", type: "unavailable", fetchedAt: now(), reason: "API request failed" }] };

  const cw = data.current_weather;
  const wmoMap: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
    55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
  };
  const weather = wmoMap[cw.weathercode] || `Code ${cw.weathercode}`;
  const maxTemp = data.daily?.temperature_2m_max?.[0];
  const minTemp = data.daily?.temperature_2m_min?.[0];

  let answer = `**Current Weather${label ? ` — ${label}` : ""}** (Open-Meteo):\n`;
  answer += `- Temperature: **${cw.temperature}°C** (feels like wind at ${cw.windspeed} km/h)\n`;
  answer += `- Conditions: **${weather}**\n`;
  answer += `- Wind: ${cw.windspeed} km/h from ${cw.winddirection}°\n`;
  if (maxTemp != null && minTemp != null) {
    answer += `- Today: High ${maxTemp}°C / Low ${minTemp}°C\n`;
  }
  answer += `\n🕐 *Weather data fetched live from Open-Meteo.*`;

  return {
    answer,
    sources: [{ name: "Open-Meteo", url: "https://open-meteo.com", type: "live", fetchedAt: now() }],
  };
}

/**
 * Nominatim (OpenStreetMap) — free POI search by text.
 * Returns places matching a query, useful for "restaurants near X" etc.
 */
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
// SECTION 2 — RETRIEVAL ROUTER (decides which sources to query)
// ═══════════════════════════════════════════════════════════════

interface RetrievalContext {
  contextParts: string[];
  sources: SourceMeta[];
  webResults: WebResult[];
}

/**
 * Detect what kind of query this is and route to appropriate sources.
 * Runs multiple retrievals in parallel when safe.
 */
async function retrieveContext(query: string): Promise<RetrievalContext> {
  const q = query.toLowerCase();
  const contextParts: string[] = [];
  const allSources: SourceMeta[] = [];
  let webResults: WebResult[] = [];

  // Detect POI / location queries
  const isPOIQuery = /\b(near|around|in|at|find|restaurant|hotel|shop|market|hospital|school|bank|fuel|petrol|gas station|office|church|mosque|beach|park|mall|pharmacy|clinic|pharmacy|gym|bar|club|cafe|lounge)\b/i.test(q)
    && /\b(lagos|abuja|nigeria|victoria island|ikeja|lekki|yaba|surulere|ajah|ikoyi|mainland|island|ph|benin|kano|ibadan|enugu|calabar|aba|onitsha|warri|benin city|jos|kaduna|abuja|port harcourt)\b/i.test(q);

  // Detect crypto/financial queries
  const isCryptoQuery = /\b(bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|bnb|crypto|coin|token|price|trading|defi|nft|blockchain)\b/i.test(q);

  // Detect weather queries
  const isWeatherQuery = /\b(weather|forecast|temperature|rain|sunny|cloudy|storm|wind|humidity)\b/i.test(q);

  // Run parallel retrievals
  const promises: Promise<void>[] = [];

  // Always try Wikipedia for knowledge
  promises.push(
    retrieveFromWikipedia(query).then(r => {
      if (r.answer) {
        contextParts.push(`[WIKIPEDIA]\n${r.answer}`);
        allSources.push(...r.sources);
      }
    })
  );

  // Always try DDG for broader web knowledge
  promises.push(
    retrieveFromDDG(query).then(r => {
      if (r.answer) {
        contextParts.push(`[DUCKDUCKGO]\n${r.answer}`);
        allSources.push(...r.sources);
      }
    })
  );

  // Add specialized sources based on query type
  if (isCryptoQuery) {
    promises.push(
      retrieveCryptoPrices().then(r => {
        if (r.answer) {
          contextParts.push(`[CRYPTO_LIVE]\n${r.answer}`);
          allSources.push(...r.sources);
        }
      })
    );
  }

  if (isWeatherQuery) {
    // Default to Lagos coordinates for Nigerian context
    promises.push(
      retrieveWeather(6.5244, 3.3792, "Lagos").then(r => {
        if (r.answer) {
          contextParts.push(`[WEATHER_LIVE]\n${r.answer}`);
          allSources.push(...r.sources);
        }
      })
    );
  }

  if (isPOIQuery) {
    promises.push(
      retrievePOIs(query).then(r => {
        if (r.answer) {
          contextParts.push(`[POI_LIVE]\n${r.answer}`);
          allSources.push(...r.sources);
          webResults = r.webResults;
        }
      })
    );
  }

  // Also check offline POI DB for Nigerian locations
  promises.push(
    searchPOIsOffline(query, 5).then(pois => {
      if (pois.length > 0) {
        const poiText = pois.map((p, i) => `${i + 1}. ${p.name} (${p.category}) — ${p.city}, ${p.state}. ${p.description || ""}`).join("\n");
        contextParts.push(`[OFFLINE_POI_DB]\n${poiText}`);
        allSources.push({ name: "Offline POI Database", type: "offline_poi", fetchedAt: now() });
      }
    })
  );

  await Promise.allSettled(promises);

  // If no sources returned anything useful, add a knowledge fallback
  if (contextParts.length === 0) {
    contextParts.push(`[KNOWLEDGE_FALLBACK]\nNo live retrieval sources returned data for this query. Answer based on your training knowledge, but clearly label it as such.`);
    allSources.push({ name: "AI Knowledge", type: "knowledge", fetchedAt: now() });
  }

  return { contextParts, sources: allSources, webResults };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — GROQ AI REASONING (streams response)
// ═══════════════════════════════════════════════════════════════

/** Build system prompt based on search mode */
function buildSystemPrompt(mode: SearchMode): string {
  const base = `You are SEARCH-POI Engine v2 — an intelligent reasoning search engine.
You receive RETRIEVAL CONTEXT from live external sources. Use this context to answer the user's query.

CRITICAL RULES:
1. Use the RETRIEVAL CONTEXT to answer. If context says 🟢 LIVE DATA, cite it and use it.
2. NEVER fabricate real-time data. If no live context was retrieved, say "🔴 Live retrieval unavailable: [reason]" and answer from general knowledge.
3. When you cite live data, include the source name and freshness (e.g., "Live from CoinGecko, just now").
4. Keep answers SHORT and direct (3-8 sentences unless detail is requested).
5. Always end with a ⚡ Key Takeaway section (one sentence).
6. Add 📊 Confidence (High/Medium/Low) based on source quality.
7. Structure answers with clear headers, bullet points, and bold text.
8. For POI/location queries, present results as a ranked list with map links.
9. For price/market data, always show the exact numbers and 24h change.
10. For news queries, focus on the latest developments.`;

  const modePrompts: Record<string, string> = {
    deep_research: "\n\nYou are in DEEP RESEARCH mode. Be thorough, academic, and multi-faceted. Minimum 300 words.",
    code: "\n\nYou are in CODE mode. Provide working code examples with explanations.",
    academic: "\n\nYou are in ACADEMIC mode. Use scholarly methodology and rigorous analysis.",
    business: "\n\nYou are in BUSINESS mode. Focus on market intelligence, actionable insights, and strategic recommendations.",
  };

  return base + (modePrompts[mode] || "");
}

/**
 * Call Groq API with streaming — falls back to non-streaming if needed.
 */
async function callGroqStreaming(
  query: string,
  retrievalContext: string,
  mode: SearchMode,
  context: string[],
  onDelta: (text: string) => void,
): Promise<string> {
  if (!GROQ_KEY) {
    throw new Error("🔴 Live retrieval unavailable: VITE_GROQ_KEY is not configured. Add your Groq API key to the project environment.");
  }

  const systemPrompt = buildSystemPrompt(mode);
  const contextSection = retrievalContext
    ? `\n\n---\nRETRIEVAL CONTEXT (use this to answer):\n${retrievalContext}\n---`
    : "";

  const messages: any[] = [
    { role: "system", content: systemPrompt + contextSection },
  ];

  // Add recent context
  if (context.length > 0) {
    messages.push({
      role: "system",
      content: `Recent searches for context: ${context.slice(-5).join(", ")}. Use this to provide connected answers, but still answer the current query directly.`,
    });
  }

  messages.push({ role: "user", content: query });

  const res = await fetch(GROQ_BASE, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (res.status === 429) throw new Error("🔴 Live retrieval unavailable: Rate limit exceeded. Please try again in a moment.");
  if (res.status === 402) throw new Error("🔴 Live retrieval unavailable: Groq usage limit reached. Please add credits.");
  if (!res.ok || !res.body) throw new Error(`🔴 Live retrieval unavailable: Groq API returned ${res.status}`);

  // Parse SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let fullAnswer = "";
  let streamDone = false;

  while (!streamDone) {
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
      if (jsonStr === "[DONE]") { streamDone = true; break; }
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

  // Process any remaining buffer
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) { onDelta(content); fullAnswer += content; }
      } catch { /* ignore */ }
    }
  }

  return fullAnswer;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — OFFLINE FALLBACKS
// ═══════════════════════════════════════════════════════════════

async function buildOfflineAnswer(query: string): Promise<string> {
  const pois = await searchPOIsOffline(query, 10);
  if (pois.length === 0) {
    return `**Offline Mode** — No matching results in the local POI database for "${query}".\n\n🔴 **Live Retrieval Unavailable**: You are currently offline and no cached answer exists for this query.\n\n⚡ **Key Takeaways**\n- Connect to the internet for full AI-powered search\n- Try a broader query like "Lagos", "market", or "hotel"`;
  }
  const top = pois.slice(0, 5);
  const list = top.map((p, i) => `${i + 1}. **${p.name}** (${p.category}) — ${p.city}, ${p.state}. ${p.description ?? ""}`).join("\n");
  return `**Offline Mode** — Showing ${top.length} matching POI${top.length > 1 ? "s" : ""} from your local database.\n\n${list}\n\n🔵 *Served from local IndexedDB cache*\n⚡ **Key Takeaways**\n- Results served from offline POI database\n- GPS coordinates available for navigation\n- Connect online for AI-generated insights and live web data`;
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
// SECTION 5 — PUBLIC API (consumed by SearchResults.tsx etc.)
// ═══════════════════════════════════════════════════════════════

/**
 * Web search — retrieve web results for a query.
 * Tries retrieval pipeline first, falls back to offline POI DB.
 */
export async function webSearch(query: string, limit = 10): Promise<WebResult[]> {
  if (isOffline()) return buildOfflineWebResults(query);

  try {
    // Use the retrieval router to get web results
    const { webResults } = await retrieveContext(query);
    if (webResults.length > 0) {
      const results = webResults.slice(0, limit);
      cacheSearchResult(`web:${query}`, results).catch(() => {});
      return results;
    }

    // Fallback: try to build results from retrieved context
    const { contextParts, sources } = await retrieveContext(query);
    if (contextParts.length > 0) {
      // Build synthetic WebResults from the context
      const results: WebResult[] = sources
        .filter(s => s.url)
        .map(s => ({
          url: s.url!,
          title: s.name,
          description: contextParts.find(c => c.toLowerCase().includes(s.name.toLowerCase()))?.slice(0, 200) || "",
        }));
      if (results.length > 0) {
        cacheSearchResult(`web:${query}`, results).catch(() => {});
        return results.slice(0, limit);
      }
    }

    return buildOfflineWebResults(query);
  } catch {
    const cached = await getCachedSearch(`web:${query}`);
    if (cached) return cached;
    return buildOfflineWebResults(query);
  }
}

/**
 * Main search function — retrieves context, calls Groq AI, streams response.
 */
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
  // OFFLINE PATH
  if (isOffline()) {
    const answer = await buildOfflineAnswer(query);
    const chunks = answer.match(/.{1,12}/gs) || [answer];
    for (const c of chunks) {
      onDelta(c);
      await new Promise((r) => setTimeout(r, 8));
    }
    onDone();
    return;
  }

  try {
    // Step 1: Retrieve context from multiple sources in parallel
    const { contextParts } = await retrieveContext(query);

    // Step 2: Call Groq AI with the retrieved context
    const fullAnswer = await callGroqStreaming(
      query,
      contextParts.join("\n\n"),
      mode,
      context,
      onDelta,
    );

    // Step 3: Cache the result
    if (fullAnswer) {
      cacheSearchResult(`ai:${query}:${mode}`, fullAnswer).catch(() => {});
    }

    onDone();
  } catch (e) {
    // Fallback: cached answer
    const cached = await getCachedSearch(`ai:${query}:${mode}`);
    if (cached) {
      const chunks = (cached as string).match(/.{1,12}/gs) || [cached];
      for (const c of chunks) {
        onDelta(c);
        await new Promise((r) => setTimeout(r, 6));
      }
      onDone();
      return;
    }

    // Final fallback: offline POI answer
    const offlineAnswer = await buildOfflineAnswer(query);
    const chunks = offlineAnswer.match(/.{1,12}/gs) || [offlineAnswer];
    for (const c of chunks) {
      onDelta(c);
      await new Promise((r) => setTimeout(r, 8));
    }
    onDone();
  }
}

/**
 * Summarize a URL — uses Groq AI to summarize web page content.
 */
export async function summarizeUrl(url: string): Promise<string> {
  if (isOffline()) throw new Error("URL summarization requires an internet connection.");
  if (!GROQ_KEY) throw new Error("VITE_GROQ_KEY is not configured.");

  try {
    // Fetch the page content via a simple GET
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
    const html = await res.text();

    // Extract text content (strip HTML tags)
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
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a URL summarizer. Analyze the following web page content and provide:\n\n## Summary\nA clear, concise summary (3-5 sentences)\n\n## Key Facts\n- Bullet points of the most important facts\n\n## Trust Assessment\nRate reliability: High / Medium / Low",
          },
          { role: "user", content: `Summarize this webpage:\n\n${text}` },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!response.ok) throw new Error("AI summarization failed");
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Could not generate summary.";
  } catch (e) {
    throw new Error(`Summarization failed: ${e instanceof Error ? e.message : "Unknown error"}`);
  }
}

/**
 * Image search — returns empty array with a note (CORS limitations prevent
 * direct image search from the browser without a backend).
 */
export async function imageSearch(query: string, _limit = 20): Promise<ImageResult[]> {
  if (isOffline()) return [];
  // Image search requires server-side rendering due to CORS.
  // Return empty — the UI should show a "Live image search requires a backend" note.
  console.log("[search-api] Image search not available without Supabase Edge Functions");
  return [];
}

/**
 * Video search — same limitation as image search.
 */
export async function videoSearch(query: string, _limit = 20): Promise<VideoResult[]> {
  if (isOffline()) return [];
  console.log("[search-api] Video search not available without Supabase Edge Functions");
  return [];
}

/**
 * News search — returns news from the retrieval context.
 * Uses web search to find recent news articles.
 */
export async function newsSearch(query: string, limit = 20): Promise<NewsResult[]> {
  if (isOffline()) return [];

  try {
    // Use DDG to find news-related results
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + " latest news")}&format=json&no_html=1`;
    const data = await safeFetch<any>(url);
    if (!data) return [];

    const results: NewsResult[] = [];

    // Extract from related topics that look like news
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

    // Also try the Wikipedia current events
    if (results.length < limit) {
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/Portal:Current_events`;
      const wikiData = await safeFetch<any>(wikiUrl);
      if (wikiData?.extract) {
        results.push({
          url: wikiData.content_urls?.desktop?.page || "https://en.wikipedia.org/wiki/Portal:Current_events",
          title: "Wikipedia Current Events",
          description: wikiData.extract.slice(0, 300),
          domain: "wikipedia.org",
          publishedAt: null,
          favicon: "https://www.google.com/s2/favicons?domain=wikipedia.org&sz=32",
        });
      }
    }

    return results.slice(0, limit);
  } catch {
    return [];
  }
}
