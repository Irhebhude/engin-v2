// /api/voice — module 17: voice note upload to R2 + D1 metadata.
// POST binary body (audio/*) with ?lat=&lng=&duration_ms= query params.
import { jsonResponse, errorResponse, handleOptions } from "../_shared/cors";
import { AuthEnv, requireUser } from "../_shared/auth";

interface VoiceEnv extends AuthEnv { ASSETS: R2Bucket }

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<VoiceEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const ct = request.headers.get("content-type") || "application/octet-stream";
  if (!ct.startsWith("audio/")) return errorResponse("Content-Type must be audio/*", 415);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return errorResponse("Empty body");
  if (body.byteLength > 25 * 1024 * 1024) return errorResponse("Max 25MB", 413);

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat")); const lng = Number(url.searchParams.get("lng"));
  const dur = Number(url.searchParams.get("duration_ms"));
  const id = crypto.randomUUID();
  const now = Date.now();
  const ext = ct.split("/")[1]?.split(";")[0] || "webm";
  const key = `voice/${u.sub}/${now}-${id}.${ext}`;

  await env.ASSETS.put(key, body, { httpMetadata: { contentType: ct } });
  await env.DB.prepare(
    `INSERT INTO voice_notes (id,user_id,r2_key,lat,lng,duration_ms,created_at) VALUES (?,?,?,?,?,?,?)`
  ).bind(id, u.sub, key,
    Number.isFinite(lat) ? lat : null,
    Number.isFinite(lng) ? lng : null,
    Number.isFinite(dur) ? dur : null,
    now).run();

  return jsonResponse({ id, r2_key: key, timestamp: now }, { status: 201 });
};

export const onRequestGet: PagesFunction<VoiceEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const rows = await env.DB.prepare(
    `SELECT id,r2_key,lat,lng,duration_ms,created_at FROM voice_notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
  ).bind(u.sub).all();
  return jsonResponse({ notes: rows.results ?? [] });
};
