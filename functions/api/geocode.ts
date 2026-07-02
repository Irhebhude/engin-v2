// /api/geocode — Mapbox forward/reverse geocoding proxy. Keeps MAPBOX_KEY
// server-side; frontend never sees the token.
import { jsonResponse, errorResponse, handleOptions } from "../_shared/cors";

interface GeoEnv { MAPBOX_KEY?: string }

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<GeoEnv> = async ({ request, env }) => {
  if (!env.MAPBOX_KEY) return errorResponse("Geocoding not configured", 500);
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  let target: string;
  if (q) {
    target = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${env.MAPBOX_KEY}&limit=5`;
  } else if (lat && lng) {
    target = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${env.MAPBOX_KEY}&limit=1`;
  } else {
    return errorResponse("Provide ?q= or ?lat=&lng=");
  }
  const r = await fetch(target);
  if (!r.ok) return errorResponse(`Geocoder error ${r.status}`, 502);
  const body = await r.json();
  return jsonResponse({ server_time_ms: Date.now(), result: body });
};
