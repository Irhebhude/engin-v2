// POST /api/auth/logout — clears cookies + revokes refresh token
import { corsHeaders, handleOptions, jsonResponse } from "../../_shared/cors";
import { ACCESS_COOKIE, REFRESH_COOKIE, AuthEnv, buildClearCookie, parseCookies } from "../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  const cookies = parseCookies(request);
  const refresh = cookies[REFRESH_COOKIE];
  if (refresh) {
    await env.DB.prepare(`DELETE FROM sessions WHERE refresh_token = ?`).bind(refresh).run();
  }
  return jsonResponse(
    { ok: true },
    {
      headers: {
        ...corsHeaders,
        "Set-Cookie": [buildClearCookie(ACCESS_COOKIE), buildClearCookie(REFRESH_COOKIE)].join(", "),
      },
    }
  );
};
