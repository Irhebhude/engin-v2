# Cloudflare migration plan — Track B (live)

Goal: zero Lovable / Supabase dependency. Cloudflare-only: Pages (frontend) + Functions/Workers (API) + D1 (DB) + R2 (storage) + KV (cache).

Status legend: ✅ shipped · 🟡 in progress · ⬜ pending

## B1 — Project skeleton ✅
- `wrangler.jsonc` rewritten for Pages + future D1/R2/KV bindings
- `functions/api/health.ts` first Pages Function (healthcheck)
- `CLOUDFLARE_MIGRATION.md` env + secret contract
- App still runs on Supabase. Nothing broken.

## B2 — D1 schema port ✅
- `cloudflare/d1/migrations/0001_core_schema.sql` — every public table ported to SQLite (uuid→TEXT, timestamptz→INTEGER ms, jsonb→TEXT, arrays→JSON, RLS removed)
- `cloudflare/d1/migrations/0002_fts.sql` — FTS5 virtual table + sync triggers replacing the `tsvector` index
- `cloudflare/d1/migrations/0003_updated_at_triggers.sql` — per-table `updated_at` maintenance
- `cloudflare/d1/README.md` — provisioning commands + map of every Postgres `SECURITY DEFINER` function to its Worker replacement (B3/B4/B5)
- Local `users` + `sessions` tables added (replace `auth.users` ahead of B3)

## B3 — Auth Worker ⬜
`functions/api/auth/*` — email+password (PBKDF2 via WebCrypto) + Google OAuth. JWT (HS256) in httpOnly Secure cookie, refresh rotation. Replaces `@supabase/supabase-js` auth.

## B4 — Data API Worker ⬜
`functions/api/data/*` — one endpoint per current `supabase.from(...)` call site, typed via generated `src/integrations/cf/types.ts`. RPC endpoints replace each SECURITY DEFINER function listed in `cloudflare/d1/README.md`.

## B5 — Edge Functions port ⬜
Every `supabase/functions/*/index.ts` re-implemented as `functions/api/*.ts` Pages Function.

## B6 — Client cutover ⬜
- Add `src/integrations/cf/client.ts` (fetch-based)
- Codemod: `@/integrations/supabase/client` → `@/integrations/cf/client`
- Delete `src/integrations/supabase/*`, `src/integrations/lovable/*`, `src/lib/supabase-runtime.ts`, `supabase/` dir, `public/config.js`
- `bun remove @supabase/supabase-js`
- Deploy to Cloudflare Pages preview, smoke test, flip DNS

## What I need from you next
1. **Rotate the API token you pasted in chat** (treat it as leaked). I'll request the new one via the secrets tool when B6 needs to deploy — never paste tokens in chat.
2. Confirm D1 primary region (default: WEUR — closest to Lagos). KV/R2/Workers are global.
3. Reply **"go B3"** for the Auth Worker.

---

## Why this can't be a single turn
The app has ~40 files importing `@/integrations/supabase/client`, 14 edge functions, 30+ RLS policies, and auth-bound session storage. Swapping it all atomically without B2-B5 in place would render the app unusable (no auth, no data, no AI). Each batch is independently testable and reversible.
