/**
 * SEARCH-POI Engine v2 — Browser-Only Search Pipeline
 *
 * Works entirely from the browser — no Cloudflare Functions dependency for search.
 * Uses free APIs with CORS proxies:
 * - DuckDuckGo HTML search (via allorigins CORS proxy)
 * - Wikipedia REST API
 * - CoinGecko (crypto prices)
 * - Open-Meteo (weather)
 * - OpenStreetMap Nominatim (POI)
 * - Groq AI (if VITE_GROQ_KEY configured)
 *
 * ICS/IP: ownership queries, anti-hallucination, truth engine system prompt.
 */

import { searchPOIsOffline, cacheSearchResult, getCachedSearch } from "./offline-db";
import {
  isOwnershipQuery,
  answerOwnershipOffline,
  filterHallucinations,
  runICS,
} from "./truth-engine";

// ─── Config ───────────────────────────────────────────────────
const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;
const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

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
function now() { return Date.now(); }

function streamText(text: string, onDelta: (text: string) => void): void {
  const chunks = text.match(/.{1,12}/gs) || [text];
  for (const c of chunks) onDelta(c);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — DUCKDUCKGO WEB SEARCH (via CORS proxy)
// ═══════════════════════════════════════════════════════════════

async function ddgWebSearch(query: string, limit = 10): Promise<WebResult[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(searchUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return [];
    const html = await res.text();

    const results: WebResult[] = [];
    // Parse DDG HTML results
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links: Array<{ url: string; title: string }> = [];
    let match;
    while ((match = resultRegex.exec(html)) !== null) {
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      // DDG wraps URLs in redirects
      let url = match[1];
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
      if (title && url) links.push({ url, title });
    }

    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
    }

    for (let i = 0; i < Math.min(links.length, limit); i++) {
      let domain = "";
      try { domain = new URL(links[i].url).hostname.replace("www.", ""); } catch {}
      results.push({
        url: links[i].url,
        title: links[i].title,
        description: snippets[i] || "",
      });
    }
    return results;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — WIKIPEDIA
// ═══════════════════════════════════════════════════════════════

async function wikiSearch(query: string): Promise<{ answer: string; sources: SourceMeta[] }> {
  try {
    const topic = encodeURIComponent(query.replace(/[?!.]/g, "").trim());
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`;
    const res = await fetch(url);
    if (!res.ok) {
      // Try search API
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${topic}&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return { answer: "", sources: [] };
      const searchData = await searchRes.json() as any;
      if (!searchData?.query?.search?.length) return { answer: "", sources: [] };
      const first = searchData.query.search[0];
      const cleanTitle = first.title.replace(/ /g, "_");
      const retryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
      const retryRes = await fetch(retryUrl);
      if (!retryRes.ok) return { answer: "", sources: [] };
      const retryData = await retryRes.json() as any;
      if (retryData?.extract) {
        return {
          answer: `**${retryData.title}** (Wikipedia): ${retryData.extract}`,
          sources: [{ name: "Wikipedia", url: retryData.content_urls?.desktop?.page, type: "live", fetchedAt: now() }],
        };
      }
      return { answer: "", sources: [] };
    }
    const data = await res.json() as any;
    if (data?.extract) {
      return {
        answer: `**${data.title}** (Wikipedia): ${data.extract}`,
        sources: [{ name: "Wikipedia", url: data.content_urls?.desktop?.page, type: "live", fetchedAt: now() }],
      };
    }
    return { answer: "", sources: [] };
  } catch {
    return { answer: "", sources: [] };
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — SPECIALIZED RETRIEVAL
// ═══════════════════════════════════════════════════════════════

async function cryptoPrices(): Promise<{ answer: string; sources: SourceMeta[] }> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,binancecoin&vs_currencies=usd,ngn&include_24hr_change=true");
    if (!res.ok) return { answer: "", sources: [] };
    const data = await res.json() as any;
    const names: Record<string, string> = { bitcoin: "Bitcoin (BTC)", ethereum: "Ethereum (ETH)", solana: "Solana (SOL)", ripple: "XRP", binancecoin: "BNB" };
    const lines: string[] = [];
    for (const [id, name] of Object.entries(names)) {
      const d = data[id];
      if (!d) continue;
      const usd = d.usd ? `$${d.usd.toLocaleString()}` : "N/A";
      const ngn = d.ngn ? ` / ₦${d.ngn.toLocaleString()}` : "";
      const change = d.usd_24h_change ? ` (${d.usd_24h_change > 0 ? "+" : ""}${d.usd_24h_change.toFixed(1)}% 24h)` : "";
      lines.push(`- **${name}**: ${usd}${ngn}${change}`);
    }
    return {
      answer: lines.length > 0 ? `**Live Crypto Prices** (CoinGecko):\n${lines.join("\n")}\n\n🕐 *Live market rates.*` : "",
      sources: lines.length > 0 ? [{ name: "CoinGecko", url: "https://www.coingecko.com", type: "live", fetchedAt: now() }] : [],
    };
  } catch { return { answer: "", sources: [] }; }
}

async function weatherData(): Promise<{ answer: string; sources: SourceMeta[] }> {
  try {
    const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=6.5244&longitude=3.3792&current_weather=true&timezone=auto");
    if (!res.ok) return { answer: "", sources: [] };
    const data = await res.json() as any;
    if (!data?.current_weather) return { answer: "", sources: [] };
    const cw = data.current_weather;
    const wmoMap: Record<number, string> = { 0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 51: "Drizzle", 61: "Rain", 63: "Moderate rain", 65: "Heavy rain", 80: "Rain showers", 95: "Thunderstorm" };
    const answer = `**Weather — Lagos** (Open-Meteo): ${cw.temperature}°C, ${wmoMap[cw.weathercode] || `code ${cw.weathercode}`}, wind ${cw.windspeed} km/h`;
    return { answer, sources: [{ name: "Open-Meteo", url: "https://open-meteo.com", type: "live", fetchedAt: now() }] };
  } catch { return { answer: "", sources: [] }; }
}

async function poiSearch(query: string): Promise<{ answer: string; webResults: WebResult[]; sources: SourceMeta[] }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return { answer: "", webResults: [], sources: [] };
    const data = await res.json() as any[];
    if (!data?.length) return { answer: "", webResults: [], sources: [] };

    const webResults: WebResult[] = data.map((r: any) => ({
      url: `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon}`,
      title: r.display_name?.split(",")[0] || r.type,
      description: r.display_name || `${r.type} at ${r.lat}, ${r.lon}`,
    }));

    const lines = data.slice(0, 5).map((r: any, i: number) => {
      const name = r.display_name?.split(",")[0] || r.type;
      return `${i + 1}. **${name}** — 📍 [Map](https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon})`;
    });

    return {
      answer: `**POI Results** (OpenStreetMap):\n${lines.join("\n")}\n\n🟢 *Live data.*`,
      webResults,
      sources: [{ name: "OpenStreetMap", url: "https://www.openstreetmap.org", type: "live", fetchedAt: now() }],
    };
  } catch { return { answer: "", webResults: [], sources: [] }; }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — RETRIEVAL ORCHESTRATOR
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

  const isPOI = /\b(near|around|in|at|find|restaurant|hotel|shop|market|hospital|school|bank|fuel|petrol|gas station|office|church|mosque|beach|park|mall|pharmacy|clinic|gym|bar|club|cafe|lounge)\b/i.test(q)
    && /\b(lagos|abuja|nigeria|victoria island|ikeja|lekki|yaba|surulere|ajah|ikoyi|mainland|island|ph|benin|kano|ibadan|enugu|calabar|aba|onitsha|warri|benin city|jos|kaduna|port harcourt)\b/i.test(q);
  const isCrypto = /\b(bitcoin|btc|ethereum|eth|solana|crypto|coin|token|price|trading|defi|nft|blockchain)\b/i.test(q);
  const isWeather = /\b(weather|forecast|temperature|rain|sunny|cloudy|storm|wind|humidity)\b/i.test(q);

  // Run ALL sources in parallel for maximum speed
  const tasks: Promise<void>[] = [];

  // DuckDuckGo web search (via CORS proxy)
  tasks.push(ddgWebSearch(query, 8).then(results => {
    if (results.length > 0) {
      webResults = results;
      const text = results.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description || ""}`).join("\n");
      contextParts.push(`[WEB_SEARCH — ${results.length} results from DuckDuckGo]:\n${text}`);
      allSources.push(...results.slice(0, 5).map(r => {
        let domain = "";
        try { domain = new URL(r.url).hostname.replace("www.", ""); } catch {}
        return { name: domain || "Web", url: r.url, type: "live" as const, fetchedAt: now() };
      }));
    }
  }));

  // Wikipedia
  tasks.push(wikiSearch(query).then(r => {
    if (r.answer) { contextParts.push(`[WIKIPEDIA]\n${r.answer}`); allSources.push(...r.sources); }
  }));

  if (isCrypto) {
    tasks.push(cryptoPrices().then(r => {
      if (r.answer) { contextParts.push(`[LIVE_CRYPTO]\n${r.answer}`); allSources.push(...r.sources); }
    }));
  }
  if (isWeather) {
    tasks.push(weatherData().then(r => {
      if (r.answer) { contextParts.push(`[LIVE_WEATHER]\n${r.answer}`); allSources.push(...r.sources); }
    }));
  }
  if (isPOI) {
    tasks.push(poiSearch(query).then(r => {
      if (r.answer) { contextParts.push(`[POI_LIVE]\n${r.answer}`); allSources.push(...r.sources); webResults = [...webResults, ...r.webResults]; }
    }));
  }

  // Offline POI DB
  tasks.push(searchPOIsOffline(query, 5).then(pois => {
    if (pois.length > 0) {
      const text = pois.map((p, i) => `${i + 1}. ${p.name} (${p.category}) — ${p.city}, ${p.state}`).join("\n");
      contextParts.push(`[OFFLINE_POI_DB]\n${text}`);
      allSources.push({ name: "Offline POI DB", type: "offline_poi", fetchedAt: now() });
    }
  }));

  await Promise.allSettled(tasks);
  return { contextParts, sources: allSources, webResults };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — AI REASONING (Groq, if configured)
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(mode: SearchMode): string {
  return `You are SEARCH-POI Engine v2 — an advanced AI search engine. Owned by Prosper Ozoya Irhebhude and the POI Foundation.

ABSOLUTE OWNERSHIP (NON-NEGOTIABLE):
- SEARCH-POI is owned 100% by Prosper Ozoya Irhebhude and the POI Foundation.
- Third-party providers are TOOLS ONLY — no ownership, no IP rights.
- For ownership/sell/IP queries, output the Ownership Verification Checklist at the TOP.

ANTI-HALLUCINATION:
1. ONLY use information from the RETRIEVAL CONTEXT.
2. NEVER fabricate prices, statistics, dates, or numbers.
3. When sources conflict, show BOTH sides.
4. If context is empty, say "🔴 No verified data available."

ADVANCED REASONING:
- Decompose complex queries into sub-questions
- Cross-validate across multiple sources
- Score confidence: 🟢 HIGH (80+) / 🟡 MEDIUM (50-79) / 🔴 LOW (<50)
- Always end with ⚡ Key Takeaway

FORMAT: Direct answer → Evidence → Confidence → Key Takeaway
${mode === "deep_research" ? "\n[MODE: DEEP RESEARCH — Minimum 300 words.]" : ""}
${mode === "business" ? "\n[MODE: BUSINESS — Market intelligence.]" : ""}`;
}

async function callGroqStreaming(
  query: string, context: string, mode: SearchMode,
  history: string[], onDelta: (t: string) => void,
): Promise<string> {
  if (!GROQ_KEY) throw new Error("NO_AI_KEY");

  const messages: any[] = [
    { role: "system", content: buildSystemPrompt(mode) + `\n\n---\nRETRIEVAL CONTEXT:\n${context}\n---` },
  ];
  if (history.length > 0) {
    messages.push({ role: "system", content: `Recent searches: ${history.slice(-5).join(", ")}` });
  }
  messages.push({ role: "user", content: query });

  const res = await fetch(GROQ_BASE, {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: GROQ_MODEL, messages, stream: true, temperature: 0.3, max_tokens: 2048 }),
  });

  if (!res.ok || !res.body) throw new Error(`Groq ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") return full;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) { onDelta(content); full += content; }
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  return full;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — PUBLIC API
// ═══════════════════════════════════════════════════════════════

export async function webSearch(query: string, limit = 10): Promise<WebResult[]> {
  const results = await ddgWebSearch(query, limit);
  if (results.length > 0) {
    cacheSearchResult(`web:${query}`, results).catch(() => {});
    return results;
  }
  const cached = await getCachedSearch(`web:${query}`);
  if (cached) return cached;
  const pois = await searchPOIsOffline(query, 10);
  return pois.map(p => ({
    url: p.website || `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}`,
    title: p.name,
    description: `${p.category} • ${p.city}, ${p.state}`,
  }));
}

export async function streamSearch({
  query, mode = "default", context = [], onDelta, onDone,
}: {
  query: string; mode?: SearchMode; context?: string[];
  onDelta: (text: string) => void; onDone: () => void;
}) {
  // STEP 0: Ownership queries
  if (isOwnershipQuery(query)) {
    const result = answerOwnershipOffline(query);
    streamText(result.answer, onDelta);
    onDone();
    return;
  }

  // STEP 1: Retrieve from ALL sources in parallel
  const { contextParts, webResults } = await retrieveContext(query);

  // STEP 2: Try Groq AI synthesis
  if (GROQ_KEY && contextParts.length > 0) {
    try {
      const fullAnswer = await callGroqStreaming(query, contextParts.join("\n\n"), mode, context, onDelta);
      if (fullAnswer) {
        const hasLive = contextParts.some(p => p.includes("[WEB_SEARCH") || p.includes("[WIKIPEDIA") || p.includes("[CRYPTO") || p.includes("[WEATHER"));
        const { cleaned } = filterHallucinations(fullAnswer, { hasLiveData: hasLive });
        cacheSearchResult(`ai:${query}:${mode}`, cleaned).catch(() => {});
      }
      onDone();
      return;
    } catch (e) {
      console.warn("[search-api] Groq failed:", e);
    }
  }

  // STEP 3: No AI — return LIVE results formatted nicely
  if (contextParts.length > 0) {
    let answer = `## 🔍 Search Results: "${query}"\n\n`;

    if (webResults.length > 0) {
      answer += `### 📋 Web Results (${webResults.length} found)\n\n`;
      webResults.slice(0, 8).forEach((r, i) => {
        answer += `${i + 1}. **[${r.title}](${r.url})**\n   ${r.description || ""}\n\n`;
      });
    }

    const other = contextParts.filter(p => !p.startsWith("[WEB_SEARCH"));
    if (other.length > 0) {
      answer += `### 📚 Additional Information\n\n${other.join("\n\n")}\n\n`;
    }

    answer += `---\n\n🟢 **Live Data** — ${contextParts.length} source(s)\n`;
    answer += `⚡ **Key Takeaway**: ${webResults.length > 0 ? `${webResults.length} web results for "${query}"` : `Results from ${contextParts.length} sources`}`;

    streamText(answer, onDelta);
    cacheSearchResult(`ai:${query}:${mode}`, answer).catch(() => {});
    onDone();
    return;
  }

  // STEP 4: Cached
  const cached = await getCachedSearch(`ai:${query}:${mode}`);
  if (cached) { streamText(cached as string, onDelta); onDone(); return; }

  // STEP 5: Offline
  const pois = await searchPOIsOffline(query, 5);
  if (pois.length > 0) {
    const list = pois.map((p, i) => `${i + 1}. **${p.name}** (${p.category}) — ${p.city}`).join("\n");
    streamText(`**Offline POI Results:**\n\n${list}\n\n🔵 *Local database*`, onDelta);
  } else {
    streamText(`🔴 No results found for "${query}". Try a different search.`, onDelta);
  }
  onDone();
}

export async function summarizeUrl(url: string): Promise<string> {
  if (!GROQ_KEY) throw new Error("Requires VITE_GROQ_KEY");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const html = await res.text();
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
  const response = await fetch(GROQ_BASE, {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [
      { role: "system", content: "Summarize this webpage in 3-5 sentences with key facts." },
      { role: "user", content: text },
    ], temperature: 0.2, max_tokens: 512 }),
  });
  if (!response.ok) throw new Error("AI failed");
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Could not summarize.";
}

export async function imageSearch(query: string, limit = 20): Promise<ImageResult[]> {
  // DuckDuckGo image search via CORS proxy
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) return [];
    const html = await res.text();
    const imgRegex = /<img[^>]*src="([^"]*)"[^>]*class="result__image"/gi;
    const results: ImageResult[] = [];
    let match;
    while ((match = imgRegex.exec(html)) !== null && results.length < limit) {
      results.push({ url: match[1], alt: query, sourceUrl: "", sourceTitle: "", domain: "" });
    }
    return results;
  } catch { return []; }
}

export async function videoSearch(query: string, limit = 20): Promise<VideoResult[]> { return []; }

export async function newsSearch(query: string, limit = 20): Promise<NewsResult[]> {
  try {
    const results = await ddgWebSearch(query + " latest news", limit);
    return results.map(r => {
      let domain = "";
      try { domain = new URL(r.url).hostname.replace("www.", ""); } catch {}
      return { url: r.url, title: r.title, description: r.description, domain, publishedAt: null, favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32` };
    });
  } catch { return []; }
}
