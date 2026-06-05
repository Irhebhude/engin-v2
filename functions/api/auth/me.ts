// GET /api/auth/me — current user + profile
import { errorResponse, handleOptions, jsonResponse } from "../../_shared/cors";
import { AuthEnv, requireUser } from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const u = await requireUser(request, env);
  if (!u) return errorResponse("Unauthorized", 401);
  const profile = await env.DB.prepare(
    `SELECT p.*, u.email, u.email_verified
     FROM profiles p JOIN users u ON u.id = p.id WHERE p.id = ?`
  ).bind(u.sub).first();
  return jsonResponse({ user: { id: u.sub, email: u.email }, profile });
};
