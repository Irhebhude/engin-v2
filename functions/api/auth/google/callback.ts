// GET /api/auth/google/callback?code&state — completes Google OAuth
import { errorResponse, handleOptions } from "../../../_shared/cors";
import {
  ACCESS_COOKIE, ACCESS_TTL, REFRESH_COOKIE, REFRESH_TTL,
  AuthEnv, buildSetCookie, newRefreshToken, signJwt,
} from "../../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return errorResponse("Google OAuth not configured", 500);
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  if (!code || !stateRaw) return errorResponse("Missing code/state", 400);
  let redirectAfter = "/";
  try { redirectAfter = JSON.parse(atob(stateRaw)).r || "/"; } catch {}

  // Exchange code for tokens
  const cb = `${url.origin}/api/auth/google/callback`;
  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: cb, grant_type: "authorization_code",
    }),
  });
  if (!tokRes.ok) return errorResponse(`Google token exchange failed: ${await tokRes.text()}`, 502);
  const tok = await tokRes.json<{ id_token: string; access_token: string }>();

  // Decode id_token payload (no need to verify — we trust the channel)
  const [, payloadB64] = tok.id_token.split(".");
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  const email: string = (payload.email || "").toLowerCase();
  const name: string | undefined = payload.name;
  const picture: string | undefined = payload.picture;
  if (!email) return errorResponse("Google profile missing email", 400);

  // Upsert user
  let user = await env.DB.prepare(`SELECT id, email FROM users WHERE email = ?`).bind(email).first<{ id: string }>();
  const now = Date.now();
  if (!user) {
    const id = crypto.randomUUID();
    const refCode = id.slice(0, 8).toUpperCase();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at)
         VALUES (?, ?, NULL, 1, ?, ?)`
      ).bind(id, email, now, now),
      env.DB.prepare(
        `INSERT INTO profiles (id, display_name, avatar_url, referral_code, search_count, is_premium, poi_points, lite_mode, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`
      ).bind(id, name || null, picture || null, refCode, now, now),
    ]);
    user = { id };
  }

  const access = await signJwt({ sub: user.id, email }, env.JWT_SECRET, ACCESS_TTL);
  const refresh = await newRefreshToken(env, user.id);

  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectAfter,
      "Set-Cookie": [
        buildSetCookie(ACCESS_COOKIE, access, ACCESS_TTL),
        buildSetCookie(REFRESH_COOKIE, refresh, REFRESH_TTL),
      ].join(", "),
    },
  });
};
