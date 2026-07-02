# SEARCH-POI v2.1 — Modules 13-20 Deploy Guide

This document only covers the new **Cloudflare Workers / D1 / R2** surface
added on top of the existing v2. It **does not rebuild v2**. Existing GPS /
POI / Voice / Map code is untouched.

## 1. Files added

```
functions/api/time.ts                (already present — server clock)
functions/api/ics.ts                 (live ICS proxy, 10s KV cache)
functions/api/geocode.ts             (Mapbox forward/reverse proxy)
functions/api/directions.ts          (Mapbox turn-by-turn + traffic)
functions/api/trips.ts               (module 13 — trip history/favorites)
functions/api/sos.ts                 (module 14 — SOS + Twilio dispatch)
functions/api/expenses.ts            (module 15 — expense tracker)
functions/api/ratings.ts             (module 16 — POI ratings)
functions/api/voice.ts               (module 17 — R2 voice notes)
functions/api/user/places.ts         (module 19 — Home/Work)
cloudflare/d1/migrations/0004_modules.sql
```

All endpoints reuse the same JWT cookie set by the existing Google Auth
flow (`functions/api/auth/google/callback.ts`), so no new auth layer.

## 2. One-time provisioning

```bash
# D1
wrangler d1 create search-poi-db-global
# → paste id into wrangler.jsonc → d1_databases[0].database_id

# KV (cache for /api/ics + crypto data)
wrangler kv namespace create CRYPTO_CACHE
wrangler kv namespace create AUTH_SESSIONS

# R2 (voice notes bucket, module 17)
wrangler r2 bucket create voice-notes-global

# Migrations (0001 → 0004 in order)
for f in cloudflare/d1/migrations/000*.sql; do
  wrangler d1 execute search-poi-db-global --remote --file "$f"
done
```

## 3. Secrets

```bash
wrangler pages secret put JWT_SECRET                    # 32+ random chars
wrangler pages secret put GOOGLE_OAUTH_CLIENT_ID
wrangler pages secret put GOOGLE_OAUTH_CLIENT_SECRET
wrangler pages secret put MAPBOX_KEY                    # optional (geocode + directions)
wrangler pages secret put ICS_UPSTREAM_URL              # optional (falls back to stub)
wrangler pages secret put ICS_API_KEY                   # optional
wrangler pages secret put TWILIO_SID                    # optional (SOS SMS)
wrangler pages secret put TWILIO_TOKEN
wrangler pages secret put TWILIO_FROM
```

Anything omitted degrades gracefully — the endpoint returns 500 for
Mapbox routes if `MAPBOX_KEY` is missing, `/api/ics` returns an empty
envelope, `/api/sos` still logs but skips SMS.

## 4. Deploy

```bash
npm run build
wrangler pages deploy dist --project-name search-poi-v2-global
```

## 5. Endpoint reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET  | `/api/time`            | none | server NTP sync (already live, ticks clock) |
| GET  | `/api/ics`             | none | live POI/traffic/danger, `?lat&lng&radius_km` |
| GET  | `/api/geocode`         | none | `?q=` forward / `?lat&lng` reverse |
| GET  | `/api/directions`      | none | `?from=lng,lat&to=lng,lat&profile=driving-traffic` |
| GET/POST | `/api/trips`       | JWT  | list / create trip |
| GET/POST | `/api/expenses`    | JWT  | list / create expense |
| GET/POST | `/api/ratings`     | GET public / POST JWT | POI ratings |
| GET/POST | `/api/sos`         | JWT  | emergency log + optional SMS |
| GET/POST | `/api/voice`       | JWT  | R2 audio upload / list |
| GET/POST | `/api/user/places` | JWT  | Home + Work locations |

## 6. Live-date guarantee

- Frontend clock: `src/components/LiveDateTime.tsx` ticks every 1 s and
  drift-syncs with `/api/time` every 60 s. No `Date` literal, no
  hardcoded string.
- Every backend response includes `server_time_ms` so the UI can verify
  drift and never regress to a past date.

## 7. Vendor-neutral

- No `lovable.dev`, no `lovable.auth`, no `lovable.db`.
- All data lives in the buyer's Cloudflare account (D1 + R2 + KV).
- Buyer can rehost frontend on any static host and repoint API to
  another Workers-compatible runtime with zero code changes.
