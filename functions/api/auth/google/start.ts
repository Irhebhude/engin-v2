// GET /api/auth/google/start?redirect=/  — kicks off Google OAuth
import { errorResponse, handleOptions } from "../../../_shared/cors";
import { AuthEnv } from "../../../_shared/auth";

export const onRequestOptions = () => handleOptions();

export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  if (!env.GOOGLE_OAUTH_CLIENT_ID) return errorResponse("Google OAuth not configured", 500);
  const url = new URL(request.url);
  const redirectAfter = url.searchParams.get("redirect") || "/";
  const state = btoa(JSON.stringify({ r: redirectAfter, n: crypto.randomUUID() }));
  const cb = `${url.origin}/api/auth/google/callback`;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
  auth.searchParams.set("redirect_uri", cb);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("access_type", "online");
  auth.searchParams.set("prompt", "select_account");
  return Response.redirect(auth.toString(), 302);
};
