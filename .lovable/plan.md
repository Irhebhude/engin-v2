# Cloudflare migration plan — Track B (live)

Goal: zero Lovable / Supabase dependency. Cloudflare-only: Pages (frontend) + Functions/Workers (API) + D1 (DB) + R2 (storage) + KV (cache).

Status legend: ✅ shipped · 🟡 in progress · ⬜ pending

## B1 — Project skeleton ✅
- `wrangler.jsonc` rewritten for Pages + future D1/R2/KV bindings
- `functions/api/health.ts` first Pages Function (healthcheck)
- `CLOUDFLARE_MIGRATION.md` env + secret contract
- App still runs on Supabase. Nothing broken.

## B2 — D1 schema port ⬜
Translate every public-schema table (profiles, referrals, search_activity, trending_searches, businesses, nexus_*, crawled_pages, poi_points_log, shared_searches, …) to D1 SQLite migrations under `migrations/`. RLS → app-layer checks. tsvector → FTS5. gen_random_uuid → crypto.randomUUID. Seed scripts included.

## B3 — Auth Worker ⬜
`functions/api/auth/*` — email+password (Argon2 via WebCrypto) + Google OAuth. JWT (HS256) in httpOnly Secure cookie, refresh rotation. Replaces `@supabase/supabase-js` auth.

## B4 — Data API Worker ⬜
`functions/api/data/*` — one endpoint per current `supabase.from(...)` site, typed via generated `src/integrations/cf/types.ts`. RPC endpoints replace each SECURITY DEFINER function.

## B5 — Edge Functions port ⬜
Every `supabase/functions/*/index.ts` re-implemented as `functions/api/*.ts`. Same Lovable AI Gateway calls until you decide whether to swap to direct OpenAI/Gemini keys.

## B6 — Client cutover ⬜
- Add `src/integrations/cf/client.ts` (fetch-based)
- Codemod: `@/integrations/supabase/client` → `@/integrations/cf/client`
- Delete `src/integrations/supabase/*`, `src/integrations/lovable/*`, `src/lib/supabase-runtime.ts`, `supabase/` dir, `public/config.js`
- `bun remove @supabase/supabase-js @lovable.dev/cloud-auth-js`
- Deploy to Cloudflare Pages preview, smoke test, flip DNS

## What I need from you to start B2
Provide:
1. Cloudflare Account ID
2. API token (scopes in `CLOUDFLARE_MIGRATION.md`)
3. Desired D1 region (e.g. WEUR / ENAM / WNAM)

Reply **"go B2"** with those three values.

---

## Why this can't be a single turn
The app has ~40 files importing `@/integrations/supabase/client`, 14 edge functions, 30+ RLS policies, and auth-bound session storage. Swapping it all atomically without B2-B5 in place would render the app unusable (no auth, no data, no AI). Each batch is independently testable and reversible.
