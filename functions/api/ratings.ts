// /api/ratings — module 16: POI ratings (D1 + forwardable to ICS).
import { jsonResponse, errorResponse, handleOptions } from "../_shared/cors";
import { AuthEnv, requireUser } from "../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const url = new URL(request.url);
  const poi = url.searchParams.get("poi_id");
  if (!poi) return errorResponse("poi_id required");
  const rows = await env.DB.prepare(
    `SELECT stars, review, created_at FROM ratings WHERE poi_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(poi).all<{ stars: number; review: string | null; created_at: number }>();
  const results = rows.results ?? [];
  const avg = results.length ? results.reduce((s, r) => s + r.stars, 0) / results.length : 0;
  return jsonResponse({ poi_id: poi, count: results.length, avg_stars: Number(avg.toFixed(2)), ratings: results });
};

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const b = await request.json().catch(() => null) as any;
  const stars = Number(b?.stars);
  if (!b?.poi_id || !(stars >= 1 && stars <= 5)) return errorResponse("poi_id & stars (1-5) required");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO ratings (id,user_id,poi_id,stars,review,created_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(user_id, poi_id) DO UPDATE SET stars=excluded.stars, review=excluded.review, created_at=excluded.created_at`
  ).bind(id, u.sub, String(b.poi_id), stars, b.review ?? null, Date.now()).run();
  return jsonResponse({ id, forwarded_to_ics: false }, { status: 201 });
};
