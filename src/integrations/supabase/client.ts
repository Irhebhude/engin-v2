import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Support runtime config override from public/config.js (self-hosted deploys)
declare global {
  interface Window {
    __APP_CONFIG__?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };
  }
}

const runtime = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

const SUPABASE_URL =
  runtime.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  runtime.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// When env vars are missing (e.g. on Cloudflare Pages without .env),
// create a client that won't crash but will fail gracefully on any
// Supabase operation (auth/session/rpc calls will reject).
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-key',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

/** Whether the Supabase backend is actually configured with real credentials */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
