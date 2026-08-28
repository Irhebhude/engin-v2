// POST /api/web-search { query, limit? } — DuckDuckGo Lite + Wikipedia (free, no keys)
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors";

interface Env {}

export const onRequestOptions = () => handleOptions();

// ─── DuckDuckGo Lite HTML scrape (server-side, no CORS issues) ──────────
async function ddgLiteSearch(query: string, limit: number): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();

  // Parse DDG Lite HTML — results are in table rows with class "result-link"
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // Extract links from result links
  const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

  const links: Array<{ url: string; title: string }> = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    links.push({ url: match[1], title: match[2].trim() });
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
  }

  // Also try a more lenient regex for DDG Lite format
  if (links.length === 0) {
    const altRegex = /<a[^>]*rel="nofollow"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    while ((match = altRegex.exec(html)) !== null) {
      const href = match[1];
      const title = match[2].trim();
      if (title && href && !href.includes("duckduckgo.com")) {
        links.push({ url: href, title });
      }
    }
  }

  // Another fallback: extract all non-ddg links
  if (links.length === 0) {
    const anyLinkRegex = /<a[^>]*href="(https?:\/\/(?!duckduckgo\.com)[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    while ((match = anyLinkRegex.exec(html)) !== null) {
      const title = match[2].trim();
      if (title.length > 3) {
        links.push({ url: match[1], title });
      }
    }
  }

  for (let i = 0; i < Math.min(links.length, limit); i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] || "",
    });
  }

  return results;
}

// ─── DuckDuckGo Instant Answers API (supplementary) ──────────────────────
async function ddgInstantAnswer(query: string): Promise<{ abstract: string; heading: string; url: string } | null> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json<any>();
    if (data.AbstractText) {
      return { abstract: data.AbstractText, heading: data.Heading || query, url: data.AbstractURL || "" };
    }
    if (data.Answer) {
      return { abstract: data.Answer, heading: data.Heading || "Direct Answer", url: "" };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Wikipedia search (supplementary context) ────────────────────────────
async function wikipediaSearch(query: string): Promise<Array<{ title: string; extract: string; url: string }>> {
  try {
    // Search for matching articles
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json<any>();
    const results: Array<{ title: string; extract: string; url: string }> = [];

    for (const item of (searchData.query?.search || []).slice(0, 3)) {
      const title = item.title.replace(/ /g, "_");
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      try {
        const summaryRes = await fetch(summaryUrl);
        if (summaryRes.ok) {
          const summary = await summaryRes.json<any>();
          if (summary.extract) {
            results.push({
              title: summary.title || item.title,
              extract: summary.extract,
              url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${title}`,
            });
          }
        }
      } catch { /* skip */ }
    }
    return results;
  } catch {
    return [];
  }
}

// ─── Main handler ────────────────────────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  let body: { query?: string; limit?: number };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const q = (body.query || "").trim();
  if (!q) return errorResponse("Query required", 400);
  const limit = Math.min(body.limit ?? 10, 25);

  // Run all searches in parallel
  const [ddgResults, ddgInstant, wikiResults] = await Promise.all([
    ddgLiteSearch(q, limit),
    ddgInstantAnswer(q),
    wikipediaSearch(q),
  ]);

  // Build combined results
  const results: any[] = [];

  // DDG Lite results (main web results)
  for (const r of ddgResults) {
    results.push({
      url: r.url,
      title: r.title,
      description: r.snippet,
      markdown: r.snippet,
      source: "duckduckgo",
    });
  }

  // DDG Instant Answer (if it has one)
  if (ddgInstant) {
    results.unshift({
      url: ddgInstant.url || `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
      title: ddgInstant.heading,
      description: ddgInstant.abstract,
      markdown: `**${ddgInstant.heading}**: ${ddgInstant.abstract}`,
      source: "duckduckgo_instant",
    });
  }

  // Wikipedia results
  for (const w of wikiResults) {
    results.push({
      url: w.url,
      title: `${w.title} (Wikipedia)`,
      description: w.extract.slice(0, 300),
      markdown: `**${w.title}** (Wikipedia): ${w.extract}`,
      source: "wikipedia",
    });
  }

  return jsonResponse(
    { results, query: q, resultCount: results.length },
    { headers: corsHeaders }
  );
};
