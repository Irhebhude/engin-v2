// Unified live public data sources. All endpoints are free, CORS-enabled, no key required.
// Used by the Live Sources dashboard, ticker, and live indicators.

export type SourceStatus = "live" | "delayed" | "offline";

export interface LiveResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  fetchedAt: number;
}

async function jget<T>(url: string, init?: RequestInit): Promise<LiveResult<T>> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, fetchedAt: Date.now() };
    const data = (await res.json()) as T;
    return { ok: true, data, fetchedAt: Date.now() };
  } catch (e: any) {
    return { ok: false, error: e?.message || "network error", fetchedAt: Date.now() };
  }
}

// ───────────────── 1. Web knowledge ─────────────────
export const ddgInstant = (q: string) =>
  jget<any>(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`);

export const wikiSummary = (topic: string) =>
  jget<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);

// ───────────────── 2. News (RSS via public CORS proxy) ─────────────────
const RSS_PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";
export const NEWS_FEEDS = [
  { id: "bbc", label: "BBC", url: "http://feeds.bbci.co.uk/news/rss.xml" },
  { id: "aljazeera", label: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "techcrunch", label: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { id: "reuters", label: "Reuters", url: "https://feeds.reuters.com/reuters/topNews" },
];
export const fetchRss = (rssUrl: string) => jget<any>(`${RSS_PROXY}${encodeURIComponent(rssUrl)}`);

// ───────────────── 3. Financial ─────────────────
export const cryptoPrices = () =>
  jget<any>(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,binancecoin&vs_currencies=usd,ngn&include_24hr_change=true"
  );

export const fxRates = () => jget<any>("https://open.er-api.com/v6/latest/USD");

// ───────────────── 4. Academic ─────────────────
export const arxivSearch = async (q: string, max = 10): Promise<LiveResult<any[]>> => {
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&sortBy=submittedDate&sortOrder=descending&max_results=${max}`
    );
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, fetchedAt: Date.now() };
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const entries = Array.from(doc.getElementsByTagName("entry")).map((e) => ({
      title: e.getElementsByTagName("title")[0]?.textContent?.trim() ?? "",
      summary: e.getElementsByTagName("summary")[0]?.textContent?.trim() ?? "",
      published: e.getElementsByTagName("published")[0]?.textContent ?? "",
      link: e.getElementsByTagName("id")[0]?.textContent ?? "",
      authors: Array.from(e.getElementsByTagName("author")).map(
        (a) => a.getElementsByTagName("name")[0]?.textContent ?? ""
      ),
    }));
    return { ok: true, data: entries, fetchedAt: Date.now() };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "error", fetchedAt: Date.now() };
  }
};

export const semanticScholar = (q: string) =>
  jget<any>(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&limit=10&fields=title,authors,year,citationCount,abstract,url`
  );

// ───────────────── 5. Space ─────────────────
export const nasaApod = () => jget<any>("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY");
export const nasaNeo = () => {
  const d = new Date().toISOString().slice(0, 10);
  return jget<any>(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${d}&end_date=${d}&api_key=DEMO_KEY`);
};
export const spaceWeather = () => jget<any>("https://services.swpc.noaa.gov/products/alerts.json");

// ───────────────── 6. Trending ─────────────────
export const githubTrending = () =>
  jget<any>("https://api.github.com/search/repositories?q=stars:%3E10000&sort=updated&order=desc&per_page=10");
export const huggingfaceModels = () => jget<any>("https://huggingface.co/api/models?sort=downloads&limit=10");
export const wikiTrending = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return jget<any>(
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${day}`
  );
};

// ───────────────── 7. Weather ─────────────────
export const weather = (lat: number, lon: number) =>
  jget<any>(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
  );

// ───────────────── 8. Government / Economic ─────────────────
export const worldBankGdp = (iso: string) =>
  jget<any>(`https://api.worldbank.org/v2/country/${iso}/indicator/NY.GDP.MKTP.CD?format=json&per_page=10`);

// ───────────────── Registry for dashboard ─────────────────
export interface SourceMeta {
  id: string;
  name: string;
  category: string;
  refreshSec: number;
  test: () => Promise<LiveResult>;
}

export const LIVE_SOURCES: SourceMeta[] = [
  { id: "ddg", name: "DuckDuckGo Instant", category: "Web", refreshSec: 300, test: () => ddgInstant("nigeria") },
  { id: "wiki", name: "Wikipedia REST", category: "Web", refreshSec: 600, test: () => wikiSummary("Lagos") },
  { id: "bbc", name: "BBC News RSS", category: "News", refreshSec: 300, test: () => fetchRss(NEWS_FEEDS[0].url) },
  { id: "techcrunch", name: "TechCrunch RSS", category: "News", refreshSec: 300, test: () => fetchRss(NEWS_FEEDS[2].url) },
  { id: "coingecko", name: "CoinGecko Prices", category: "Finance", refreshSec: 30, test: cryptoPrices },
  { id: "fx", name: "ExchangeRate API", category: "Finance", refreshSec: 3600, test: fxRates },
  { id: "arxiv", name: "arXiv Papers", category: "Academic", refreshSec: 900, test: () => arxivSearch("ai", 1) },
  { id: "semantic", name: "Semantic Scholar", category: "Academic", refreshSec: 900, test: () => semanticScholar("ai") },
  { id: "nasa-apod", name: "NASA APOD", category: "Space", refreshSec: 3600, test: nasaApod },
  { id: "nasa-neo", name: "NASA Near-Earth Objects", category: "Space", refreshSec: 3600, test: nasaNeo },
  { id: "noaa", name: "NOAA Space Weather", category: "Space", refreshSec: 1800, test: spaceWeather },
  { id: "gh", name: "GitHub Trending", category: "Trending", refreshSec: 900, test: githubTrending },
  { id: "hf", name: "HuggingFace Models", category: "Trending", refreshSec: 900, test: huggingfaceModels },
  { id: "wiki-trend", name: "Wikipedia Trending", category: "Trending", refreshSec: 900, test: wikiTrending },
  { id: "meteo", name: "Open-Meteo Weather", category: "Weather", refreshSec: 1800, test: () => weather(6.5244, 3.3792) },
  { id: "wb", name: "World Bank GDP", category: "Government", refreshSec: 86400, test: () => worldBankGdp("NG") },
];

export function freshnessStatus(fetchedAt: number): { color: string; label: string } {
  const ageMin = (Date.now() - fetchedAt) / 60000;
  if (ageMin < 5) return { color: "#00FF88", label: "Fresh" };
  if (ageMin < 60) return { color: "#00D4FF", label: "Recent" };
  if (ageMin < 360) return { color: "#FFB800", label: "Aging" };
  return { color: "#FF3B3B", label: "Stale" };
}

export function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
