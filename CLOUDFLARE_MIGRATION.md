# Cloudflare migration — env contract

This is the target environment for the Cloudflare cutover. Each variable maps
1:1 to a current Lovable/Supabase value and will be filled with
`wrangler pages secret put <NAME>` once the Cloudflare account is connected.

## Build-time (committed in wrangler.jsonc vars or in dashboard env)
- APP_ENV                       production | preview

## Runtime secrets (wrangler pages secret put …)
- JWT_SECRET                    32-byte random — signs auth JWTs (replaces Supabase Auth JWT signing)
- GOOGLE_OAUTH_CLIENT_ID        Google Cloud Console → OAuth client (Web)
- GOOGLE_OAUTH_CLIENT_SECRET    paired with above
- LOVABLE_API_KEY               kept until Edge Functions port (Batch B5). After B5 we can swap to direct OpenAI/Gemini keys if desired.
- FIRECRAWL_API_KEY             carried over
- NASA_API_KEY                  carried over
- AYRSHARE_API_KEY              carried over (admin acquisition)
- TURNSTILE_SECRET_KEY          Cloudflare Turnstile (already in-house with CF)

## Bindings (declared in wrangler.jsonc once resources exist)
- DB        (D1)   — replaces Supabase Postgres. Schema port = Batch B2.
- STORAGE   (R2)   — replaces Supabase Storage. No buckets in use yet.
- CACHE     (KV)   — replaces ad-hoc Supabase caches + future rate-limit store.

## What still needs you (cannot self-serve)
1. Cloudflare Account ID
2. Cloudflare API token with scopes: Pages:Edit, Workers Scripts:Edit, D1:Edit, R2:Edit, KV:Edit, Workers Routes:Edit
3. Target domain (e.g. searchpoi.com) for the DNS flip in Batch B6

Provide these when ready and I'll wire B2 (D1 schema port).
