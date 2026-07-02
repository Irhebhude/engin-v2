// /api/expenses — module 15: expense tracker (D1-backed).
import { jsonResponse, errorResponse, handleOptions } from "../_shared/cors";
import { AuthEnv, requireUser } from "../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const rows = await env.DB.prepare(
    `SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`
  ).bind(u.sub).all();
  return jsonResponse({ expenses: rows.results ?? [] });
};

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const b = await request.json().catch(() => null) as any;
  const amt = Number(b?.amount);
  if (!b?.category || !Number.isFinite(amt)) return errorResponse("category & numeric amount required");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO expenses (id,user_id,trip_id,category,amount,currency,note,created_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(id, u.sub, b.trip_id ?? null, String(b.category), amt, String(b.currency ?? "NGN"), b.note ?? null, Date.now()).run();
  return jsonResponse({ id }, { status: 201 });
};
