// GET /api/time — authoritative server time for client drift-sync.
// Public endpoint (no auth). Used by <LiveDateTime /> in the header.
import { jsonResponse, handleOptions } from "../_shared/cors";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction = async ({ request }) => {
  const now = new Date();
  const cf = (request as any).cf || {};
  return jsonResponse({
    server_time: now.toISOString(),
    server_time_ms: now.getTime(),
    edge: {
      colo: cf.colo || null,
      country: cf.country || null,
      city: cf.city || null,
      timezone: cf.timezone || null,
    },
  }, { headers: { "cache-control": "no-store" } });
};
