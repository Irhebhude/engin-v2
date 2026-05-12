// Runtime-aware Supabase client.
// Used when self-hosting (Firebase Hosting / Cloud Run) — reads
// SUPABASE_URL and SUPABASE_ANON_KEY from /public/config.js at runtime
// so a single build can be re-pointed to any backend without rebuilding.
//
// HOW TO ADOPT (only needed for self-hosted deploys):
//   1) Edit /public/config.js and fill in your own Supabase URL + anon key
//   2) Run a one-time find/replace across the codebase:
//        FROM:  from "@/integrations/supabase/client"
//        TO:    from "@/lib/supabase-runtime"
//   3) Rebuild + deploy. To switch backends later just edit config.js
//      on the host and refresh — no rebuild required.
//
// If config.js values are empty, this falls back to the build-time
// Lovable Cloud values, so existing behavior is preserved.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

declare global {
  interface Window {
    __APP_CONFIG__?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };
  }
}

const runtime = (typeof window !== "undefined" && window.__APP_CONFIG__) || {};
const SUPABASE_URL = runtime.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  runtime.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
});
