// DEPRECATED — Lovable auth removed in v2.1 (Cloudflare Workers migration).
// Google sign-in now flows through /api/auth/google/start (Pages Functions).
// This shim is kept only to avoid breaking stale imports; do NOT use.
export const lovable = {
  auth: {
    signInWithOAuth: async () => {
      if (typeof window !== "undefined") {
        window.location.href = `/api/auth/google/start?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      return { redirected: true } as { redirected: true; error?: never };
    },
  },
};
