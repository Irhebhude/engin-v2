// /api/directions — Mapbox turn-by-turn directions proxy with traffic profile.
import { jsonResponse, errorResponse, handleOptions } from "../_shared/cors";

interface DirEnv { MAPBOX_KEY?: string }

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<DirEnv> = async ({ request, env }) => {
  if (!env.MAPBOX_KEY) return errorResponse("Directions not configured", 500);
  const url = new URL(request.url);
  const from = url.searchParams.get("from"); // "lng,lat"
  const to = url.searchParams.get("to");     // "lng,lat"
  const profile = url.searchParams.get("profile") || "driving-traffic";
  if (!from || !to) return errorResponse("from & to (lng,lat) required");
  const target = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from};${to}?access_token=${env.MAPBOX_KEY}&geometries=geojson&steps=true&overview=full&annotations=duration,distance,congestion`;
  const r = await fetch(target);
  if (!r.ok) return errorResponse(`Directions error ${r.status}`, 502);
  const body = await r.json();
  return jsonResponse({ server_time_ms: Date.now(), ...body as any });
};
