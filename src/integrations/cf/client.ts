// Cloudflare API client — drop-in replacement for the old Supabase client.
// Talks to Pages Functions under /api/* (auth, data, AI). Uses httpOnly
// cookies for sessions, so no token plumbing on the client.

export interface CfUser {
  id: string;
  email: string;
  display_name?: string | null;
}

export interface CfProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  referral_code: string;
  referred_by: string | null;
  email_verified: boolean;
  search_count: number;
  created_at: string;
  is_premium: boolean;
  poi_points: number;
  lite_mode: boolean;
}

const BASE = "/api";

async function req<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      ...init,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) return { data: null, error: json?.error || res.statusText };
    return { data: json as T, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ───────────────── Auth ─────────────────
type AuthListener = (event: "SIGNED_IN" | "SIGNED_OUT", user: CfUser | null) => void;
const listeners = new Set<AuthListener>();
function emit(event: "SIGNED_IN" | "SIGNED_OUT", user: CfUser | null) {
  listeners.forEach((l) => l(event, user));
}

export const cf = {
  auth: {
    async signUp(email: string, password: string, displayName?: string, referralCode?: string) {
      const r = await req<{ user: CfUser }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name: displayName, referral_code: referralCode }),
      });
      if (r.data?.user) emit("SIGNED_IN", r.data.user);
      return r;
    },
    async signIn(email: string, password: string) {
      const r = await req<{ user: CfUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (r.data?.user) emit("SIGNED_IN", r.data.user);
      return r;
    },
    async signOut() {
      await req("/auth/logout", { method: "POST" });
      emit("SIGNED_OUT", null);
    },
    async getUser() {
      return req<{ user: CfUser; profile: CfProfile }>("/auth/me");
    },
    signInWithGoogle() {
      window.location.href = `${BASE}/auth/google/start`;
    },
    onAuthStateChange(cb: AuthListener) {
      listeners.add(cb);
      return { unsubscribe: () => listeners.delete(cb) };
    },
  },

  // Thin data layer — one helper per CRUD verb against /api/data/<table>.
  data: {
    get: <T = unknown>(table: string, query = "") =>
      req<T>(`/data/${table}${query ? `?${query}` : ""}`),
    post: <T = unknown>(table: string, body: unknown) =>
      req<T>(`/data/${table}`, { method: "POST", body: JSON.stringify(body) }),
    patch: <T = unknown>(table: string, body: unknown) =>
      req<T>(`/data/${table}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: <T = unknown>(table: string, query = "") =>
      req<T>(`/data/${table}${query ? `?${query}` : ""}`, { method: "DELETE" }),
  },

  // AI / edge-function surface.
  fn: {
    invoke: <T = unknown>(name: string, body: unknown = {}) =>
      req<T>(`/${name}`, { method: "POST", body: JSON.stringify(body) }),
  },
};

export default cf;
