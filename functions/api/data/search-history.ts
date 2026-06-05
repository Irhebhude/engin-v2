// GET  /api/data/search-history?limit=20 — current user's recent searches
// POST /api/data/search-history  { query, result_count? }
import { errorResponse, handleOptions, jsonResponse } from "../../_shared/cors";
import { AuthEnv, requireUser } from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const limit = Math.min(parseInt(new URL(request.url).searchParams.get("limit") || "20", 10), 100);
  const { results } = await env.DB.prepare(
    `SELECT id, query, result_count, created_at FROM search_history
     WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  ).bind(u.sub, limit).all();
  return jsonResponse({ items: results });
};

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  let body: { query?: string; result_count?: number };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const q = (body.query || "").trim();
  if (!q || q.length > 500) return errorResponse("Invalid query", 400);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO search_history (id, user_id, query, result_count, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, u.sub, q, body.result_count ?? 0, Date.now()).run();
  // Bump profile counter
  await env.DB.prepare(`UPDATE profiles SET search_count = search_count + 1 WHERE id = ?`).bind(u.sub).run();
  return jsonResponse({ id }, { status: 201 });
};
