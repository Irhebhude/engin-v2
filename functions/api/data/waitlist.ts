// POST /api/data/waitlist  { email, source? } — public insert
import { errorResponse, handleOptions, jsonResponse } from "../../_shared/cors";
import { AuthEnv } from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  let body: { email?: string; source?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse("Invalid email", 400);
  try {
    await env.DB.prepare(
      `INSERT INTO waitlist (id, email, source, created_at) VALUES (?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), email, body.source || "web", Date.now()).run();
  } catch (e: any) {
    if (String(e?.message || "").includes("UNIQUE")) return jsonResponse({ ok: true, dedup: true });
    throw e;
  }
  return jsonResponse({ ok: true }, { status: 201 });
};
