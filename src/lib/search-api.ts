/**
 * SEARCH-POI Engine v2 — Browser-Only Search Pipeline
 *
 * Works entirely from the browser — no Cloudflare Functions dependency.
 * Multiple CORS proxies with automatic fallback:
 * - DuckDuckGo Instant Answer JSON API (direct, no proxy)
 * - DuckDuckGo HTML search (via CORS proxy with fallbacks)
 * - Wikipedia REST API (direct)
 * - CoinGecko (crypto prices, direct)
 * - Open-Meteo (weather, direct)
 * - OpenStreetMap Nominatim (POI, direct)
 * - Groq AI (if VITE_GROQ_KEY configured)
 */

import { searchPOIsOffline, cacheSearchResult, getCachedSearch } from "./offline-db";
import {
  isOwnershipQuery,
  answerOwnershipOffline,
  filterHallucinations,
} from "./truth-engine";
import { aiReasoningEngine } from "./ai-engine";

// ─── Config ───────────────────────────────────────────────────
const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;
const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

// Multiple CORS proxies — tried in order until one works
const CORS_PROXIES = [
  "https://corsproxy.io/?url=",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://api.allorigins.win/raw?url=",
];

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

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

/** Fetch through multiple CORS proxies with automatic fallback */
async function proxyFetch(url: string, timeoutMs = 8000): Promise<Response | null> {
  // Try direct first (for CORS-enabled APIs)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return res;
  } catch { /* direct failed, try proxies */ }

  // Try each CORS proxy
  for (const proxy of CORS_PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
    } catch { /* try next proxy */ }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — DUCKDUCKGO INSTANT ANSWER (JSON, no proxy needed)
// ═══════════════════════════════════════════════════════════════

async function ddgInstantSearch(query: string): Promise<WebResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as any;
    const results: WebResult[] = [];

    // Abstract (main answer from Wikipedia/other sources)
    if (data.Abstract && data.AbstractURL) {
      results.push({
        url: data.AbstractURL,
        title: data.Heading || query,
        description: data.Abstract,
      });
    }

    // Related Topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (topic.FirstURL && topic.Text) {
          const text = topic.Text.replace(/<[^>]+>/g, "").trim();
          if (text.length > 10) {
            results.push({
              url: topic.FirstURL,
              title: text.split(" - ")[0].split(" – ")[0].trim(),
              description: text,
            });
          }
        }
        // Nested topics
        if (topic.Topics && Array.isArray(topic.Topics)) {
          for (const sub of topic.Topics) {
            if (sub.FirstURL && sub.Text) {
              const text = sub.Text.replace(/<[^>]+>/g, "").trim();
              if (text.length > 10) {
                results.push({
                  url: sub.FirstURL,
                  title: text.split(" - ")[0].split(" – ")[0].trim(),
                  description: text,
                });
              }
            }
          }
        }
      }
    }

    // Results (official sites etc.)
    if (data.Results && Array.isArray(data.Results)) {
      for (const r of data.Results) {
        if (r.FirstURL && r.Text) {
          results.push({
            url: r.FirstURL,
            title: r.Text,
            description: "",
          });
        }
      }
    }

    return results;
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — DUCKDUCKGO HTML SEARCH (via CORS proxy with fallback)
// ═══════════════════════════════════════════════════════════════

async function ddgHtmlSearch(query: string, limit = 10): Promise<WebResult[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await proxyFetch(searchUrl, 10000);
    if (!res) return [];
    const html = await res.text();
    if (!html || html.length < 500) return [];

    const results: WebResult[] = [];

    // Parse DDG HTML results — multiple regex patterns for different HTML versions
    // Pattern 1: result__a class
    const linkRegex1 = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex1 = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links: string[] = [];
    const titles: string[] = [];
    let match;

    while ((match = linkRegex1.exec(html)) !== null) {
      let url = match[1];
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      // DDG wraps URLs in redirects
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
      if (title && url && url.startsWith("http")) {
        links.push(url);
        titles.push(title);
      }
    }

    const snippets: string[] = [];
    while ((match = snippetRegex1.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
    }

    // If pattern 1 didn't match, try pattern 2 (result__body)
    if (links.length === 0) {
      const linkRegex2 = /<a[^>]*rel="nofollow"[^>]*href="([^"]*)"[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = linkRegex2.exec(html)) !== null) {
        let url = match[1];
        const title = match[2].replace(/<[^>]+>/g, "").trim();
        const uddgMatch = url.match(/uddg=([^&]+)/);
        if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
        if (title && url && url.startsWith("http")) {
          links.push(url);
          titles.push(title);
        }
      }
    }

    // If still no results, try generic link extraction
    if (links.length === 0) {
      const genericRegex = /<a[^>]*href="([^"]*uddg=[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = genericRegex.exec(html)) !== null) {
        let url = match[1];
        const title = match[2].replace(/<[^>]+>/g, "").trim();
        const uddgMatch = url.match(/uddg=([^&]+)/);
        if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
        if (title && url && url.startsWith("http")) {
          links.push(url);
          titles.push(title);
        }
      }
    }

    for (let i = 0; i < Math.min(links.length, limit); i++) {
      results.push({
        url: links[i],
        title: titles[i],
        description: snippets[i] || "",
      });
    }

    return results;
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — WIKIPEDIA
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
  } catch { return { answer: "", sources: [] }; }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — SPECIALIZED RETRIEVAL
// ═══════════════════════════════════════════════════════════════

async function cryptoPrices(): Promise<{ answer: string; sources: SourceMeta[] }> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,binancecoin,dogecoin,cardano&vs_currencies=usd,ngn&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true");
    if (!res.ok) return { answer: "", sources: [] };
    const data = await res.json() as any;
    const names: Record<string, string> = { bitcoin: "Bitcoin (BTC)", ethereum: "Ethereum (ETH)", solana: "Solana (SOL)", ripple: "XRP", binancecoin: "BNB", dogecoin: "Dogecoin (DOGE)", cardano: "Cardano (ADA)" };
    const lines: string[] = [];
    for (const [id, name] of Object.entries(names)) {
      const d = data[id];
      if (!d) continue;
      const usd = d.usd ? `$${d.usd.toLocaleString()}` : "N/A";
      const ngn = d.ngn ? ` / ₦${d.ngn.toLocaleString()}` : "";
      const change = d.usd_24h_change ? ` (${d.usd_24h_change > 0 ? "+" : ""}${d.usd_24h_change.toFixed(1)}% 24h)` : "";
      const vol = d.usd_24h_vol ? ` Vol: $${(d.usd_24h_vol / 1e6).toFixed(0)}M` : "";
      lines.push(`- **${name}**: ${usd}${ngn}${change}${vol}`);
    }
    return {
      answer: lines.length > 0 ? `**Live Crypto Prices** (CoinGecko):\n${lines.join("\n")}\n\n🕐 *Live market data.*` : "",
      sources: lines.length > 0 ? [{ name: "CoinGecko", url: "https://www.coingecko.com", type: "live", fetchedAt: now() }] : [],
    };
  } catch { return { answer: "", sources: [] }; }
}

async function weatherData(city?: string): Promise<{ answer: string; sources: SourceMeta[] }> {
  try {
    // Default to Lagos; could be enhanced with geocoding
    let lat = 6.5244, lon = 3.3792, label = "Lagos";
    if (city) {
      // Try to geocode the city
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`);
        if (geoRes.ok) {
          const geoData = await geoRes.json() as any;
          if (geoData?.results?.[0]) {
            lat = geoData.results[0].latitude;
            lon = geoData.results[0].longitude;
            label = geoData.results[0].name || city;
          }
        }
      } catch { /* use defaults */ }
    }

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&forecast_days=1&timezone=auto`);
    if (!res.ok) return { answer: "", sources: [] };
    const data = await res.json() as any;
    if (!data?.current_weather) return { answer: "", sources: [] };
    const cw = data.current_weather;
    const wmoMap: Record<number, string> = { 0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain", 71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 80: "Rain showers", 81: "Moderate rain showers", 82: "Violent rain showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail" };
    const condition = wmoMap[cw.weathercode] || `code ${cw.weathercode}`;
    const humidity = data.hourly?.relativehumidity_2m?.[0] ? ` • Humidity: ${data.hourly.relativehumidity_2m[0]}%` : "";

    return {
      answer: `**Weather — ${label}** (Open-Meteo):\n🌡️ ${cw.temperature}°C • ${condition}\n💨 Wind: ${cw.windspeed} km/h${humidity}\n📊 Wind direction: ${cw.winddirection}°`,
      sources: [{ name: "Open-Meteo", url: "https://open-meteo.com", type: "live", fetchedAt: now() }],
    };
  } catch { return { answer: "", sources: [] }; }
}

async function poiSearch(query: string): Promise<{ answer: string; webResults: WebResult[]; sources: SourceMeta[] }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": "SEARCH-POI/2.0 (searchpoi)" } });
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
      const cat = r.type ? ` (${r.type})` : "";
      return `${i + 1}. **${name}**${cat} — 📍 [Map](https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon})`;
    });

    return {
      answer: `**POI Results** (OpenStreetMap):\n${lines.join("\n")}\n\n🟢 *Live data.*`,
      webResults,
      sources: [{ name: "OpenStreetMap", url: "https://www.openstreetmap.org", type: "live", fetchedAt: now() }],
    };
  } catch { return { answer: "", webResults: [], sources: [] }; }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — RETRIEVAL ORCHESTRATOR
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

  // Detect city name for weather
  const cityMatch = q.match(/\bweather\s+(?:in|for|at)?\s*(.+)/i) || q.match(/(.+?)\s+weather/i);
  const cityForWeather = cityMatch ? cityMatch[1].trim().replace(/[?!.]/g, "") : undefined;

  // Run ALL sources in parallel for maximum speed
  const tasks: Promise<void>[] = [];

  // Source 1: DDG Instant Answer JSON (direct, no proxy needed — fastest)
  tasks.push(ddgInstantSearch(query).then(results => {
    if (results.length > 0) {
      // Add to web results
      webResults = [...webResults, ...results];
      const text = results.slice(0, 5).map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description || ""}`).join("\n");
      contextParts.push(`[DDG_INSTANT — ${results.length} results]:\n${text}`);
      allSources.push(...results.slice(0, 3).map(r => ({
        name: extractDomain(r.url) || "DuckDuckGo",
        url: r.url,
        type: "live" as const,
        fetchedAt: now(),
      })));
    }
  }));

  // Source 2: DDG HTML search via CORS proxy (more results, but slower)
  tasks.push(ddgHtmlSearch(query, 8).then(results => {
    if (results.length > 0) {
      // Merge with existing web results (avoid duplicates)
      const existingUrls = new Set(webResults.map(r => r.url));
      const newResults = results.filter(r => !existingUrls.has(r.url));
      webResults = [...webResults, ...newResults];
      if (newResults.length > 0) {
        const text = newResults.slice(0, 5).map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description || ""}`).join("\n");
        contextParts.push(`[WEB_SEARCH — ${newResults.length} results from DuckDuckGo]:\n${text}`);
        allSources.push(...newResults.slice(0, 3).map(r => ({
          name: extractDomain(r.url) || "Web",
          url: r.url,
          type: "live" as const,
          fetchedAt: now(),
        })));
      }
    }
  }));

  // Source 3: Wikipedia (always)
  tasks.push(wikiSearch(query).then(r => {
    if (r.answer) {
      contextParts.push(`[WIKIPEDIA]\n${r.answer}`);
      allSources.push(...r.sources);
    }
  }));

  // Source 4: Crypto prices (if crypto query)
  if (isCrypto) {
    tasks.push(cryptoPrices().then(r => {
      if (r.answer) {
        contextParts.push(`[LIVE_CRYPTO]\n${r.answer}`);
        allSources.push(...r.sources);
      }
    }));
  }

  // Source 5: Weather (if weather query)
  if (isWeather) {
    tasks.push(weatherData(cityForWeather).then(r => {
      if (r.answer) {
        contextParts.push(`[LIVE_WEATHER]\n${r.answer}`);
        allSources.push(...r.sources);
      }
    }));
  }

  // Source 6: POI search (if location query)
  if (isPOI) {
    tasks.push(poiSearch(query).then(r => {
      if (r.answer) {
        contextParts.push(`[POI_LIVE]\n${r.answer}`);
        allSources.push(...r.sources);
        webResults = [...webResults, ...r.webResults];
      }
    }));
  }

  // Source 7: Offline POI DB (always, as fallback enrichment)
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
// SECTION 6 — AI REASONING (Groq, if configured)
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(mode: SearchMode): string {
  return `You are SEARCH-POI Engine v2 — an advanced AI search engine. Owned by Prosper Ozoya Irhebhude and the POI Foundation.

ABSOLUTE OWNERSHIP (NON-NEGOTIABLE):
- SEARCH-POI is owned 100% by Prosper Ozoya Irhebhude and the POI Foundation.
- Third-party providers are TOOLS ONLY — no ownership, no IP rights.
- For ownership/sell/IP queries, output the Ownership Verification Checklist at the TOP.

ANTI-HALLUCINATION:
1. ONLY use information from the RETRIEVAL CONTEXT below.
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
// SECTION 7 — PUBLIC API
// ═══════════════════════════════════════════════════════════════

export async function webSearch(query: string, limit = 10): Promise<WebResult[]> {
  // Try DDG Instant first (fast, no proxy)
  const instantResults = await ddgInstantSearch(query);
  if (instantResults.length >= limit) return instantResults.slice(0, limit);

  // Try DDG HTML search (via CORS proxy)
  const htmlResults = await ddgHtmlSearch(query, limit);
  const merged = [...instantResults];
  const seenUrls = new Set(instantResults.map(r => r.url));
  for (const r of htmlResults) {
    if (!seenUrls.has(r.url)) { merged.push(r); seenUrls.add(r.url); }
  }

  if (merged.length > 0) {
    cacheSearchResult(`web:${query}`, merged.slice(0, limit)).catch(() => {});
    return merged.slice(0, limit);
  }

  // Cache fallback
  const cached = await getCachedSearch(`web:${query}`);
  if (cached) return cached;

  // Offline POI fallback
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
  const retrieval = await retrieveContext(query);
  let { contextParts, webResults } = retrieval;

  // STEP 1b: If retrieval returned nothing, try webSearch directly as fallback
  if (contextParts.length === 0 && webResults.length === 0) {
    try {
      const fallbackResults = await webSearch(query, 8);
      if (fallbackResults.length > 0) {
        webResults = fallbackResults;
        const text = fallbackResults.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description || ""}`).join("\n");
        contextParts.push(`[WEB_SEARCH — ${fallbackResults.length} results]:\n${text}`);
      }
    } catch { /* proceed with empty context */ }
  }

  // STEP 2: Multi-provider AI reasoning engine (tries 10+ providers with auto-fallback)
  try {
    const aiResult = await aiReasoningEngine(query, contextParts.join("\n\n"), webResults);
    if (aiResult.text) {
      streamText(aiResult.text, onDelta);
      cacheSearchResult(`ai:${query}:${mode}`, aiResult.text).catch(() => {});
      onDone();
      return;
    }
  } catch (e) {
    console.warn("[search-api] AI engine failed:", e);
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
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const res = await proxyFetch(url, 10000);
    if (!res) return [];
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
    const results = await ddgHtmlSearch(query + " latest news", limit);
    return results.map(r => ({
      url: r.url,
      title: r.title,
      description: r.description,
      domain: extractDomain(r.url),
      publishedAt: null,
      favicon: `https://www.google.com/s2/favicons?domain=${extractDomain(r.url)}&sz=32`,
    }));
  } catch { return []; }
}
