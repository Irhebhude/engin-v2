// /api/trips — module 13: trip history + favorites (D1-backed).
import { jsonResponse, errorResponse, handleOptions } from "../_shared/cors";
import { AuthEnv, requireUser } from "../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const rows = await env.DB.prepare(
    `SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
  ).bind(u.sub).all();
  return jsonResponse({ trips: rows.results ?? [] });
};

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const b = await request.json().catch(() => null) as any;
  if (!b?.origin || !b?.destination) return errorResponse("origin & destination required");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO trips (id,user_id,origin,destination,origin_lat,origin_lng,dest_lat,dest_lng,distance_km,duration_sec,is_favorite,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, u.sub, String(b.origin), String(b.destination),
    b.origin_lat ?? null, b.origin_lng ?? null,
    b.dest_lat ?? null, b.dest_lng ?? null,
    b.distance_km ?? null, b.duration_sec ?? null,
    b.is_favorite ? 1 : 0, Date.now(),
  ).run();
  return jsonResponse({ id }, { status: 201 });
};
