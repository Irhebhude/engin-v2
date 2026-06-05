// POST /api/auth/login { email, password }
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../../_shared/cors";
import {
  ACCESS_COOKIE, ACCESS_TTL, REFRESH_COOKIE, REFRESH_TTL,
  AuthEnv, buildSetCookie, newRefreshToken, signJwt, verifyPassword,
} from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return errorResponse("Email + password required", 400);

  const user = await env.DB.prepare(
    `SELECT id, email, password_hash FROM users WHERE email = ?`
  ).bind(email).first<{ id: string; email: string; password_hash: string }>();
  if (!user || !user.password_hash) return errorResponse("Invalid credentials", 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return errorResponse("Invalid credentials", 401);

  const access = await signJwt({ sub: user.id, email: user.email }, env.JWT_SECRET, ACCESS_TTL);
  const refresh = await newRefreshToken(env, user.id);

  return jsonResponse(
    { user: { id: user.id, email: user.email } },
    {
      headers: {
        ...corsHeaders,
        "Set-Cookie": [
          buildSetCookie(ACCESS_COOKIE, access, ACCESS_TTL),
          buildSetCookie(REFRESH_COOKIE, refresh, REFRESH_TTL),
        ].join(", "),
      },
    }
  );
};
