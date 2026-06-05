// POST /api/web-search { query, limit? } — Firecrawl-backed web search.
// Replaces supabase/functions/web-search.
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors";
import { AiEnv } from "../_shared/ai";

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<AiEnv> = async ({ request, env }) => {
  if (!env.FIRECRAWL_API_KEY) return errorResponse("FIRECRAWL_API_KEY missing", 500);
  let body: { query?: string; limit?: number };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const q = (body.query || "").trim();
  if (!q) return errorResponse("Query required", 400);

  const res = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: q, limit: Math.min(body.limit ?? 10, 25) }),
  });
  if (!res.ok) return errorResponse(`Firecrawl ${res.status}: ${await res.text()}`, 502);
  const data = await res.json<any>();
  return jsonResponse({ results: data.data ?? data.results ?? [] }, { headers: corsHeaders });
};
