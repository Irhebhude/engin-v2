// /api/ics — live ICS feed proxy (POI cash, queue, traffic, borders, weather,
// danger alerts). Cached in KV for 10s so 50k users cost pennies.
//
// Upstream is configured via ICS_UPSTREAM_URL secret; if unset we return a
// synthesized envelope so the UI never breaks. NEVER hardcodes dates —
// timestamps always reflect the moment of the request.
import { jsonResponse, errorResponse, handleOptions } from "../_shared/cors";

interface IcsEnv {
  CRYPTO_CACHE?: KVNamespace;
  ICS_UPSTREAM_URL?: string;
  ICS_API_KEY?: string;
}

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<IcsEnv> = async ({ request, env }) => {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const radius = url.searchParams.get("radius_km") ?? "50";
  const cacheKey = `ics:${lat ?? "-"}:${lng ?? "-"}:${radius}`;

  if (env.CRYPTO_CACHE) {
    const hit = await env.CRYPTO_CACHE.get(cacheKey);
    if (hit) return jsonResponse({ ...JSON.parse(hit), cached: true });
  }

  let payload: unknown = null;
  if (env.ICS_UPSTREAM_URL) {
    const up = new URL(env.ICS_UPSTREAM_URL);
    if (lat) up.searchParams.set("lat", lat);
    if (lng) up.searchParams.set("lng", lng);
    up.searchParams.set("radius_km", radius);
    try {
      const r = await fetch(up.toString(), {
        headers: env.ICS_API_KEY ? { "Authorization": `Bearer ${env.ICS_API_KEY}` } : {},
      });
      if (r.ok) payload = await r.json();
    } catch { /* fall through to empty envelope */ }
  }

  const now = Date.now();
  const envelope = {
    server_time_ms: now,
    server_time: new Date(now).toISOString(),
    query: { lat, lng, radius_km: Number(radius) },
    poi: (payload as any)?.poi ?? [],
    traffic: (payload as any)?.traffic ?? [],
    borders: (payload as any)?.borders ?? [],
    weather: (payload as any)?.weather ?? null,
    danger: (payload as any)?.danger ?? [],
    source: env.ICS_UPSTREAM_URL ? "ics-live" : "ics-stub",
  };

  if (env.CRYPTO_CACHE) {
    await env.CRYPTO_CACHE.put(cacheKey, JSON.stringify(envelope), { expirationTtl: 10 });
  }
  return jsonResponse(envelope, { headers: { "cache-control": "public, max-age=5" } });
};
