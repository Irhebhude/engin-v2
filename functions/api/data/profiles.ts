// GET/POST /api/data/profiles — current user's profile read + partial update.
// Pattern: each table that the React app reads gets one Pages Function under
// functions/api/data/<table>.ts that wraps D1 with auth + validation.
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../../_shared/cors";
import { AuthEnv, requireUser } from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const row = await env.DB.prepare(`SELECT * FROM profiles WHERE id = ?`).bind(u.sub).first();
  return jsonResponse({ profile: row });
};

const ALLOWED = new Set(["display_name", "avatar_url", "username", "lite_mode"]);

export const onRequestPatch: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED.has(k)) continue;
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (!sets.length) return errorResponse("No allowed fields", 400);
  sets.push(`updated_at = ?`); vals.push(Date.now());
  vals.push(u.sub);

  await env.DB.prepare(`UPDATE profiles SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
  const row = await env.DB.prepare(`SELECT * FROM profiles WHERE id = ?`).bind(u.sub).first();
  return jsonResponse({ profile: row }, { headers: corsHeaders });
};
