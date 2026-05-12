import { searchPOIsOffline, cacheSearchResult, getCachedSearch } from "./offline-db";

const BASE = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const CHAT_URL = `${BASE}/functions/v1/search-ai`;
const WEB_SEARCH_URL = `${BASE}/functions/v1/web-search`;
const SUMMARIZE_URL = `${BASE}/functions/v1/summarize-url`;
const IMAGE_SEARCH_URL = `${BASE}/functions/v1/image-search`;
const VIDEO_SEARCH_URL = `${BASE}/functions/v1/video-search`;
const NEWS_SEARCH_URL = `${BASE}/functions/v1/news-search`;

export type SearchMode = "default" | "deep_research" | "code" | "academic" | "business";

export interface WebResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

/** Build an offline answer from local IndexedDB POIs */
async function buildOfflineAnswer(query: string): Promise<string> {
  const pois = await searchPOIsOffline(query, 10);
  if (pois.length === 0) {
    return `**Offline Mode** — No matching results in the local POI database for "${query}".\n\n⚡ **Key Takeaways**\n- You're currently offline\n- ${query} did not match any cached entries\n- Connect to the internet for full AI-powered search\n- Try a broader query like "Lagos", "market", or "hotel"`;
  }
  const top = pois.slice(0, 5);
  const list = top.map((p, i) => `${i + 1}. **${p.name}** (${p.category}) — ${p.city}, ${p.state}. ${p.description ?? ""}`).join("\n");
  return `**Offline Mode** — Showing ${top.length} matching POI${top.length > 1 ? "s" : ""} from your local database.\n\n${list}\n\n⚡ **Key Takeaways**\n- Results served from local IndexedDB cache\n- GPS coordinates available for navigation\n- Connect online for AI-generated insights and live web data`;
}

/** Build offline web results from POIs */
async function buildOfflineWebResults(query: string): Promise<WebResult[]> {
  const pois = await searchPOIsOffline(query, 10);
  return pois.map((p) => ({
    url: p.website || `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}`,
    title: p.name,
    description: `${p.category} • ${p.city}, ${p.state}. ${p.description ?? ""}`,
  }));
}

export async function webSearch(query: string, limit = 10): Promise<WebResult[]> {
  if (isOffline()) return buildOfflineWebResults(query);
  try {
    const resp = await fetch(WEB_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ query, limit }),
    });
    if (!resp.ok) {
      console.error("Web search failed:", resp.status);
      return buildOfflineWebResults(query);
    }
    const data = await resp.json();
    const results: WebResult[] = (data.data || []).map((r: any) => ({
      url: r.url || "",
      title: r.title || r.metadata?.title || "",
      description: r.description || r.metadata?.description || "",
      markdown: r.markdown || "",
    }));
    cacheSearchResult(`web:${query}`, results).catch(() => {});
    return results;
  } catch {
    const cached = await getCachedSearch(`web:${query}`);
    if (cached) return cached;
    return buildOfflineWebResults(query);
  }
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
  // OFFLINE PATH: Stream answer from local POI DB
  if (isOffline()) {
    const answer = await buildOfflineAnswer(query);
    // Simulate streaming for UX consistency
    const chunks = answer.match(/.{1,12}/gs) || [answer];
    for (const c of chunks) {
      onDelta(c);
      await new Promise((r) => setTimeout(r, 8));
    }
    onDone();
    return;
  }

  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ query, mode, context }),
    });

    if (resp.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (resp.status === 402) throw new Error("Usage limit reached. Please add credits.");
    if (!resp.ok || !resp.body) throw new Error("Failed to start search");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let fullAnswer = "";

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

    if (fullAnswer) cacheSearchResult(`ai:${query}:${mode}`, fullAnswer).catch(() => {});
    onDone();
  } catch (e) {
    // Fallback to cached or offline POI answer
    const cached = await getCachedSearch(`ai:${query}:${mode}`);
    if (cached) {
      const chunks = (cached as string).match(/.{1,12}/gs) || [cached];
      for (const c of chunks) { onDelta(c); await new Promise((r) => setTimeout(r, 6)); }
      onDone();
      return;
    }
    const offlineAnswer = await buildOfflineAnswer(query);
    const chunks = offlineAnswer.match(/.{1,12}/gs) || [offlineAnswer];
    for (const c of chunks) { onDelta(c); await new Promise((r) => setTimeout(r, 8)); }
    onDone();
  }
}

export async function summarizeUrl(url: string): Promise<string> {
  if (isOffline()) throw new Error("URL summarization requires an internet connection.");
  const resp = await fetch(SUMMARIZE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ url }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || "Failed to summarize URL");
  }
  const data = await resp.json();
  return data.summary;
}

export interface ImageResult {
  url: string;
  alt: string;
  sourceUrl: string;
  sourceTitle: string;
  domain: string;
  isThumbnail?: boolean;
}

export async function imageSearch(query: string, limit = 20): Promise<ImageResult[]> {
  if (isOffline()) return [];
  try {
    const resp = await fetch(IMAGE_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ query, limit }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.images || [];
  } catch { return []; }
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

export async function videoSearch(query: string, limit = 20): Promise<VideoResult[]> {
  if (isOffline()) return [];
  try {
    const resp = await fetch(VIDEO_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ query, limit }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.videos || [];
  } catch { return []; }
}

export interface NewsResult {
  url: string;
  title: string;
  description: string;
  domain: string;
  publishedAt?: string | null;
  favicon?: string;
}

export async function newsSearch(query: string, limit = 20): Promise<NewsResult[]> {
  if (isOffline()) return [];
  try {
    const resp = await fetch(NEWS_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ query, limit }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.news || [];
  } catch { return []; }
}
