# SEARCH-POI Engine v2.1 — Cloudflare Deploy

Frontend: Cloudflare Pages (`*.pages.dev`) · Backend: Pages Functions (`/functions/**`)
Storage: **D1** (SQL), **KV** (`CRYPTO_CACHE`, `AUTH_SESSIONS`), **R2** (`ASSETS`)

## 1. Google OAuth client (5 min)

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID**.
2. Application type: **Web application**.
3. Authorized redirect URI (add both preview + prod):
   - `https://search-poi-v2.pages.dev/api/auth/google/callback`
   - `https://engin-v2.searchpoi.workers.dev/api/auth/google/callback`
4. Copy the **Client ID** and **Client secret**.

## 2. Create bindings

```bash
wrangler d1 create search-poi-db-global
wrangler kv namespace create CRYPTO_CACHE
wrangler kv namespace create AUTH_SESSIONS
wrangler r2 bucket create voice-notes-global
```

Paste the returned IDs into `wrangler.jsonc` (replace `REPLACE_WITH_*`).

## 3. Push secrets

```bash
wrangler pages secret put JWT_SECRET                     # any long random string
wrangler pages secret put GOOGLE_OAUTH_CLIENT_ID         # from step 1
wrangler pages secret put GOOGLE_OAUTH_CLIENT_SECRET     # from step 1
```

## 4. Migrate D1

```bash
wrangler d1 execute search-poi-db-global --file=cloudflare/d1/migrations/0001_core_schema.sql
wrangler d1 execute search-poi-db-global --file=cloudflare/d1/migrations/0002_fts.sql
wrangler d1 execute search-poi-db-global --file=cloudflare/d1/migrations/0003_updated_at_triggers.sql
```

## 5. Deploy

```bash
npm run build
wrangler pages deploy dist --project-name=search-poi-v2-global
```

## 6. Smoke tests

- `GET /api/health` → `{ ok: true, ... }`
- `GET /api/time` → `{ server_time, edge: { colo, country, timezone } }`
- Click **Continue with Google** on `/auth` → redirects to Google → returns to `/` with `sp_access` + `sp_refresh` cookies.
- Header shows live date/time ticking every second (drift-syncs every 60s).

## What was removed in v2.1

- `@lovable.dev/cloud-auth-js` — replaced by `/api/auth/google/{start,callback}` (Cloudflare Pages Functions + D1 users table + JWT + KV sessions once you migrate off Supabase entirely).
- Hardcoded dates anywhere in the UI — all timestamps flow through `new Date()` + `/api/time` drift sync.
