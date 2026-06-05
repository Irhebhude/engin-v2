// POST /api/auth/signup  { email, password, displayName?, referralCode? }
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../../_shared/cors";
import {
  ACCESS_COOKIE, ACCESS_TTL, REFRESH_COOKIE, REFRESH_TTL,
  AuthEnv, buildSetCookie, hashPassword, newRefreshToken, signJwt,
} from "../../_shared/auth";

interface Body {
  email?: string;
  password?: string;
  displayName?: string;
  referralCode?: string;
}

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  let body: Body;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse("Invalid email", 400);
  if (password.length < 6) return errorResponse("Password must be ≥6 chars", 400);

  const existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
  if (existing) return errorResponse("Email already registered", 409);

  const id = crypto.randomUUID();
  const now = Date.now();
  const pwHash = await hashPassword(password);
  const refCode = id.slice(0, 8).toUpperCase();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`
    ).bind(id, email, pwHash, now, now),
    env.DB.prepare(
      `INSERT INTO profiles (id, display_name, referral_code, referred_by, search_count, is_premium, poi_points, lite_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`
    ).bind(id, body.displayName || null, refCode, body.referralCode || null, now, now),
  ]);

  const access = await signJwt({ sub: id, email }, env.JWT_SECRET, ACCESS_TTL);
  const refresh = await newRefreshToken(env, id);

  return jsonResponse(
    { user: { id, email, displayName: body.displayName, referralCode: refCode } },
    {
      status: 201,
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
