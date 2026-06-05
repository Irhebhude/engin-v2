// POST /api/summarize-url { url } — fetch + summarize. Replaces supabase/functions/summarize-url.
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors";
import { callAi, AiEnv } from "../_shared/ai";

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<AiEnv> = async ({ request, env }) => {
  let body: { url?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const url = body.url || "";
  try { new URL(url); } catch { return errorResponse("Invalid URL", 400); }

  let html = "";
  try {
    const r = await fetch(url, { headers: { "User-Agent": "SEARCH-POI/1.0" } });
    html = (await r.text()).slice(0, 50_000);
  } catch (e: any) {
    return errorResponse(`Fetch failed: ${e.message}`, 502);
  }
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ")
                   .replace(/<style[\s\S]*?<\/style>/gi, " ")
                   .replace(/<[^>]+>/g, " ")
                   .replace(/\s+/g, " ")
                   .slice(0, 15_000);
  try {
    const summary = await callAi(env, "google/gemini-2.5-flash", [
      { role: "system", content: "Summarize the page in 5 bullets, extract any prices/contacts, and rate trust 1-10." },
      { role: "user", content: `URL: ${url}\n\n${text}` },
    ]);
    return jsonResponse({ summary }, { headers: corsHeaders });
  } catch (e: any) {
    return errorResponse(e.message, 502);
  }
};
