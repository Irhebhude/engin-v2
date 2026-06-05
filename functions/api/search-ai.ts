// POST /api/search-ai { query, mode? } — replaces supabase/functions/search-ai
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors";
import { callAi, AiEnv } from "../_shared/ai";

export const onRequestOptions = () => handleOptions();

const SYSTEM = `You are SEARCH-POI, an AI search engine focused on African business intelligence.
Speed-to-Insight: lead with a direct one-sentence answer, then 3-5 bullets, then a ⚡ Key Takeaways line.`;

export const onRequestPost: PagesFunction<AiEnv> = async ({ request, env }) => {
  let body: { query?: string; mode?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const q = (body.query || "").trim();
  if (!q) return errorResponse("Query required", 400);

  try {
    const content = await callAi(env, "google/gemini-2.5-flash", [
      { role: "system", content: SYSTEM },
      { role: "user", content: q },
    ]);
    return jsonResponse({ answer: content, model: "google/gemini-2.5-flash" }, { headers: corsHeaders });
  } catch (e: any) {
    return errorResponse(e.message || "AI call failed", 502);
  }
};
