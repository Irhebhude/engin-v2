// /api/sos — module 14: emergency SOS. Logs GPS + returns share link + timestamp.
// Twilio/WhatsApp dispatch stubbed — wire TWILIO_SID/TOKEN secrets to enable.
import { jsonResponse, errorResponse, handleOptions } from "../_shared/cors";
import { AuthEnv, requireUser } from "../_shared/auth";

interface SosEnv extends AuthEnv {
  TWILIO_SID?: string; TWILIO_TOKEN?: string; TWILIO_FROM?: string;
}

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<SosEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const b = await request.json().catch(() => null) as any;
  const lat = Number(b?.lat), lng = Number(b?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return errorResponse("lat & lng required");
  const id = crypto.randomUUID();
  const now = Date.now();
  const contacts: string[] = Array.isArray(b?.contacts) ? b.contacts.slice(0, 5).map(String) : [];
  const shareUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const message = String(b?.message ?? `SOS from SEARCH-POI: ${shareUrl}`);

  await env.DB.prepare(
    `INSERT INTO sos_logs (id,user_id,lat,lng,message,contacts,created_at) VALUES (?,?,?,?,?,?,?)`
  ).bind(id, u.sub, lat, lng, message, JSON.stringify(contacts), now).run();

  // Fire-and-forget Twilio SMS if configured.
  let notified = 0;
  if (env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM && contacts.length) {
    const auth = "Basic " + btoa(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`);
    await Promise.all(contacts.map(async (to) => {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Messages.json`, {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to, From: env.TWILIO_FROM!, Body: message }),
      });
      if (r.ok) notified++;
    }));
  }

  return jsonResponse({ id, share_url: shareUrl, timestamp: now, contacts_notified: notified }, { status: 201 });
};

export const onRequestGet: PagesFunction<SosEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const rows = await env.DB.prepare(
    `SELECT id,lat,lng,message,created_at FROM sos_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(u.sub).all();
  return jsonResponse({ sos: rows.results ?? [] });
};
