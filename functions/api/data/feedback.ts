// POST /api/data/feedback  { message, category? }
import { errorResponse, handleOptions, jsonResponse } from "../../_shared/cors";
import { AuthEnv, requireUser } from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  let body: { message?: string; category?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const msg = (body.message || "").trim();
  if (!msg || msg.length > 4000) return errorResponse("Invalid message", 400);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO feedback (id, user_id, message, category, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`
  ).bind(id, u.sub, msg, body.category || "general", Date.now()).run();
  return jsonResponse({ id }, { status: 201 });
};
