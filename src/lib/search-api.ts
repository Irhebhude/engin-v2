/**
 * SEARCH-POI Engine v2 — Unified Search Pipeline
 *
 * Search priority:
 * 1. Cloudflare Pages Functions (/api/search-ai, /api/web-search) — server-side Gemini + Firecrawl
 * 2. Browser-side live APIs — DuckDuckGo, Wikipedia, CoinGecko, Open-Meteo, Nominatim
 * 3. Groq AI reasoning (if VITE_GROQ_KEY available)
 * 4. Raw retrieved context (if no AI key)
 * 5. Offline POI database (absolute last resort)
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

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — CLOUDFLARE PAGES FUNCTIONS (server-side, best quality)
// ═══════════════════════════════════════════════════════════════

async function callCloudflareSearchAI(query: string, mode: SearchMode): Promise<string | null> {
  try {
    const res = await fetch("/api/search-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ query, mode }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.answer || null;
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
      url: r.url || r.metadata?.sourceURL || "",
      title: r.title || r.metadata?.title || "",
      description: r.description || r.markdown?.slice(0, 200) || "",
      markdown: r.markdown || "",
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — BROWSER-SIDE LIVE RETRIEVAL (free APIs, no keys)
// ═══════════════════════════════════════════════════════════════

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
  answer += `- Temperature: **${cw.temperature}°C** (wind: ${cw.windspeed} km/h)\n`;
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
// SECTION 3 — RETRIEVAL ROUTER
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
  const isNewsQuery = /\b(latest|news|recent|breaking|today|yesterday|update|development|happening)\b/i.test(q);

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

  if (contextParts.length === 0) {
    contextParts.push(`[KNOWLEDGE_FALLBACK]\nNo live retrieval sources returned data. Answer from general knowledge, clearly labeled as such.`);
    allSources.push({ name: "AI Knowledge", type: "knowledge", fetchedAt: now() });
  }

  return { contextParts, sources: allSources, webResults };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — GROQ AI REASONING (browser-side, needs VITE_GROQ_KEY)
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(mode: SearchMode): string {
  const base = `You are SEARCH-POI Engine v2 — an intelligent reasoning search engine.\nYou receive RETRIEVAL CONTEXT from live external sources. Use this context to answer the user's query.\n\nCRITICAL RULES:\n1. Use the RETRIEVAL CONTEXT to answer. If context says 🟢 LIVE DATA, cite it and use it.\n2. NEVER fabricate real-time data. If no live context was retrieved, say "🔴 Live retrieval unavailable: [reason]" and answer from general knowledge.\n3. When you cite live data, include the source name and freshness (e.g., "Live from CoinGecko, just now").\n4. Keep answers SHORT and direct (3-8 sentences unless detail is requested).\n5. Always end with a ⚡ Key Takeaway section (one sentence).\n6. Add 📊 Confidence (High/Medium/Low) based on source quality.\n7. Structure answers with clear headers, bullet points, and bold text.\n8. For POI/location queries, present results as a ranked list with map links.\n9. For price/market data, always show the exact numbers and 24h change.\n10. For news queries, focus on the latest developments.`;

  const modePrompts: Record<string, string> = {
    deep_research: "\n\nYou are in DEEP RESEARCH mode. Be thorough, academic, and multi-faceted. Minimum 300 words.",
    code: "\n\nYou are in CODE mode. Provide working code examples with explanations.",
    academic: "\n\nYou are in ACADEMIC mode. Use scholarly methodology and rigorous analysis.",
    business: "\n\nYou are in BUSINESS mode. Focus on market intelligence, actionable insights, and strategic recommendations.",
  };

  return base + (modePrompts[mode] || "");
}

async function callGroqStreaming(
  query: string,
  retrievalContext: string,
  mode: SearchMode,
  context: string[],
  onDelta: (text: string) => void,
): Promise<string> {
  if (!GROQ_KEY) throw new Error("NO_AI_KEY");

  const systemPrompt = buildSystemPrompt(mode);
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
    body: JSON.stringify({ model: GROQ_MODEL, messages, stream: true, temperature: 0.3, max_tokens: 1024 }),
  });

  if (res.status === 429) throw new Error("🔴 Rate limit exceeded. Please try again in a moment.");
  if (res.status === 402) throw new Error("🔴 Groq usage limit reached. Please add credits.");
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
// SECTION 5 — OFFLINE FALLBACKS
// ═══════════════════════════════════════════════════════════════

async function buildOfflineAnswer(query: string): Promise<string> {
  const pois = await searchPOIsOffline(query, 10);
  if (pois.length === 0) {
    return `🔴 **Live Retrieval Unavailable**\n\nNo live sources returned results for "${query}".\n\nThis may be because:\n- The Cloudflare search backend is not configured (missing API keys)\n- No matching data found in external sources\n- You are offline\n\n⚡ **Key Takeaways**\n- Check that the Cloudflare Pages Functions are properly configured\n- Try a different search query\n- Ensure you have an internet connection`;
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
  // Priority 1: Cloudflare Functions (Firecrawl-backed, rich results)
  const cfResults = await callCloudflareWebSearch(query, limit);
  if (cfResults.length > 0) {
    cacheSearchResult(`web:${query}`, cfResults).catch(() => {});
    return cfResults;
  }

  // Priority 2: Browser-side retrieval (DDG, Wikipedia, Nominatim)
  try {
    const { webResults } = await retrieveContext(query);
    if (webResults.length > 0) {
      const results = webResults.slice(0, limit);
      cacheSearchResult(`web:${query}`, results).catch(() => {});
      return results;
    }

    // Build synthetic results from context
    const { sources } = await retrieveContext(query);
    const synthResults: WebResult[] = sources
      .filter(s => s.url)
      .map(s => ({ url: s.url!, title: s.name, description: "" }));
    if (synthResults.length > 0) return synthResults.slice(0, limit);
  } catch { /* fallback */ }

  // Priority 3: Cached results
  const cached = await getCachedSearch(`web:${query}`);
  if (cached) return cached;

  // Priority 4: Offline POI DB
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
  const start = Date.now();

  // STEP 1: Try Cloudflare Functions first (best quality — Gemini + Firecrawl context)
  const cfAnswer = await callCloudflareSearchAI(query, mode);
  if (cfAnswer) {
    // Stream the Cloudflare answer character by character for the streaming UI
    const chunks = cfAnswer.match(/.{1,12}/gs) || [cfAnswer];
    for (const c of chunks) {
      onDelta(c);
      await new Promise((r) => setTimeout(r, 6));
    }
    cacheSearchResult(`ai:${query}:${mode}`, cfAnswer).catch(() => {});
    onDone();
    return;
  }

  // STEP 2: Browser-side retrieval + Groq AI reasoning
  try {
    const { contextParts } = await retrieveContext(query);

    if (GROQ_KEY) {
      // Groq available — use it for AI synthesis
      const fullAnswer = await callGroqStreaming(query, contextParts.join("\n\n"), mode, context, onDelta);
      if (fullAnswer) {
        cacheSearchResult(`ai:${query}:${mode}`, fullAnswer).catch(() => {});
      }
      onDone();
      return;
    }

    // STEP 3: No AI key available — return raw retrieved context
    if (contextParts.length > 0) {
      const rawAnswer = `## Search Results for "${query}"\n\n${contextParts.join("\n\n---\n\n")}\n\n---\n\n📊 **Confidence: Medium** (retrieved from live sources, no AI synthesis)\n⚡ **Key Takeaway**: Results retrieved from ${contextParts.length} live source(s).`;
      const chunks = rawAnswer.match(/.{1,12}/gs) || [rawAnswer];
      for (const c of chunks) {
        onDelta(c);
        await new Promise((r) => setTimeout(r, 6));
      }
      onDone();
      return;
    }
  } catch (e) {
    console.warn("[search-api] Browser-side retrieval failed:", e);
  }

  // STEP 4: Try cached answer
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

  // STEP 5: Offline POI fallback (absolute last resort)
  const offlineAnswer = await buildOfflineAnswer(query);
  const chunks = offlineAnswer.match(/.{1,12}/gs) || [offlineAnswer];
  for (const c of chunks) {
    onDelta(c);
    await new Promise((r) => setTimeout(r, 8));
  }
  onDone();
}

export async function summarizeUrl(url: string): Promise<string> {
  // Try Cloudflare Function first
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

  // Browser-side fallback
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
  // Try Cloudflare Function
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
  // Try Cloudflare Function
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

  // Browser-side fallback via DDG
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
