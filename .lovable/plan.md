# Cloudflare migration plan — Track B (live)

Goal: zero Lovable / Supabase dependency. Cloudflare-only: Pages (frontend) + Functions/Workers (API) + D1 (DB) + R2 (storage) + KV (cache).

Status legend: ✅ shipped · 🟡 in progress · ⬜ pending

## B1 — Project skeleton ✅
- `wrangler.jsonc` rewritten for Pages + future D1/R2/KV bindings
- `functions/api/health.ts` first Pages Function (healthcheck)
- `CLOUDFLARE_MIGRATION.md` env + secret contract

## B2 — D1 schema port ✅
- 3 migrations under `cloudflare/d1/migrations/` (core schema, FTS5, updated_at triggers)
- Local `users` + `sessions` tables added (replace `auth.users` ahead of B3)

## B3 — Auth Worker ✅
`functions/_shared/auth.ts` — PBKDF2 (WebCrypto), HS256 JWT, httpOnly cookies, D1 refresh sessions.
- `POST /api/auth/signup` — creates user + profile, sets access + refresh cookies
- `POST /api/auth/login` — verifies password, rotates session
- `POST /api/auth/refresh` — rotates refresh token, issues new access JWT
- `POST /api/auth/logout` — clears cookies + revokes session row
- `GET  /api/auth/me` — returns current user + profile
- `GET  /api/auth/google/start` → Google OAuth consent
- `GET  /api/auth/google/callback` — exchanges code, upserts user, sets cookies
Required secrets (set via `wrangler pages secret put`):
  `JWT_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.

## B4 — Data API Worker ✅ (initial surface)
Pattern in place under `functions/api/data/*`; each endpoint = one D1 table, auth-gated.
Shipped:
- `GET/PATCH /api/data/profiles`
- `GET/POST  /api/data/search-history`
- `POST      /api/data/waitlist`  (public)
- `POST      /api/data/feedback`
Remaining tables (vaults, business listings, POI points, referrals, etc.) follow the same `functions/api/data/<name>.ts` template — added incrementally as the React client migrates calls off `@/integrations/supabase/client`.

## B5 — Edge Functions port ✅ (first wave)
- `functions/_shared/ai.ts` — Lovable AI Gateway helper (drop-in swap target for direct OpenAI/Gemini in B6).
- `POST /api/search-ai` ← supabase/functions/search-ai
- `POST /api/web-search` ← supabase/functions/web-search (Firecrawl)
- `POST /api/summarize-url` ← supabase/functions/summarize-url
Remaining (image-search, video-search, news-search, nexus-*, poi-crawler, generate-blueprint, generate-build-guide, generate-trending-content, ayrshare-post, feedback-ai, poi-api) follow the same template — ported as the client switches over in B6.

## B6 — Client cutover 🟡
- ✅ `src/integrations/cf/client.ts` — fetch wrapper for `/api/auth`, `/api/data/*`, `/api/<fn>`
- ✅ `src/contexts/AuthContext.tsx` cut over to `cf.auth` (no more `@supabase/supabase-js` in the auth path)
- ✅ Removed `public/config.js` + `src/lib/supabase-runtime.ts` (runtime-Supabase fallback gone)
- ✅ `robots.txt` sitemap → `engin-v2.searchpoi.workers.dev`
- ⬜ Codemod remaining 27 files: replace `from "@/integrations/supabase/client"` with `from "@/integrations/cf/client"` and rewrite `.from(table).select/insert/update` → `cf.data.get/post/patch`
- ⬜ Delete `src/integrations/supabase/{client,types}.ts` + `supabase/` directory once codemod is green
- ⬜ `bun remove @supabase/supabase-js`
- ⬜ `wrangler d1 create` + apply migrations + `wrangler pages secret put` for each item in `CLOUDFLARE_MIGRATION.md`
- ⬜ `wrangler pages deploy` → smoke test → flip DNS

## B6 — Original checklist (reference)
- Add `src/integrations/cf/client.ts` (fetch wrapper around the `/api/*` surface)
- Codemod `@/integrations/supabase/client` → `@/integrations/cf/client`
- Delete `src/integrations/supabase/*`, `src/integrations/lovable/*`, `src/lib/supabase-runtime.ts`, `supabase/`, `public/config.js`
- `bun remove @supabase/supabase-js`
- `wrangler d1 create` + apply migrations + `wrangler pages secret put` for each item in `CLOUDFLARE_MIGRATION.md`
- `wrangler pages deploy` → smoke test → flip DNS

## Next from you
1. Provision D1: I'll request the `database_id` via secrets and uncomment the binding in `wrangler.jsonc`.
2. Add the auth/AI/Firecrawl/NASA secrets to the Pages project (I'll prompt with the secrets tool when ready).
3. Reply **"go B6"** when the auth + data surface above is enough to swap the client.
