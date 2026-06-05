// POST /api/auth/refresh — rotates refresh token, issues new access JWT
import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../../_shared/cors";
import {
  ACCESS_COOKIE, ACCESS_TTL, REFRESH_COOKIE, REFRESH_TTL,
  AuthEnv, buildSetCookie, parseCookies, rotateRefreshToken, signJwt,
} from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const old = parseCookies(request)[REFRESH_COOKIE];
  if (!old) return errorResponse("No refresh token", 401);

  const rotated = await rotateRefreshToken(env, old);
  if (!rotated) return errorResponse("Refresh expired", 401);

  const user = await env.DB.prepare(`SELECT email FROM users WHERE id = ?`).bind(rotated.userId).first<{ email: string }>();
  const access = await signJwt({ sub: rotated.userId, email: user?.email }, env.JWT_SECRET, ACCESS_TTL);

  return jsonResponse(
    { ok: true },
    {
      headers: {
        ...corsHeaders,
        "Set-Cookie": [
          buildSetCookie(ACCESS_COOKIE, access, ACCESS_TTL),
          buildSetCookie(REFRESH_COOKIE, rotated.newTok, REFRESH_TTL),
        ].join(", "),
      },
    }
  );
};
