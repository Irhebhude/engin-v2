// /api/user/places — module 19: Home + Work saved locations.
import { jsonResponse, errorResponse, handleOptions } from "../../_shared/cors";
import { AuthEnv, requireUser } from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const rows = await env.DB.prepare(
    `SELECT kind,label,address,lat,lng,updated_at FROM user_places WHERE user_id = ?`
  ).bind(u.sub).all();
  return jsonResponse({ places: rows.results ?? [] });
};

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const b = await request.json().catch(() => null) as any;
  const kind = String(b?.kind || "").toLowerCase();
  if (!["home", "work"].includes(kind)) return errorResponse("kind must be home|work");
  const lat = Number(b?.lat), lng = Number(b?.lng);
  if (!b?.address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return errorResponse("address, lat, lng required");
  }
  await env.DB.prepare(
    `INSERT INTO user_places (user_id,kind,label,address,lat,lng,updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id, kind) DO UPDATE SET
       label=excluded.label, address=excluded.address,
       lat=excluded.lat, lng=excluded.lng, updated_at=excluded.updated_at`
  ).bind(u.sub, kind, b.label ?? null, String(b.address), lat, lng, Date.now()).run();
  return jsonResponse({ ok: true });
};
