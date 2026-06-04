# D1 schema port — Batch B2

SQLite port of the Supabase Postgres schema. Apply in order:

```
0001_core_schema.sql        # all tables, indexes, FKs
0002_fts.sql                # FTS5 replacement for tsvector
0003_updated_at_triggers.sql # per-table updated_at maintenance
```

## Provision

Once `wrangler` is authenticated:

```bash
wrangler d1 create search-poi
# → copy the database_id into wrangler.jsonc under d1_databases.binding=DB

wrangler d1 execute search-poi --remote --file=cloudflare/d1/migrations/0001_core_schema.sql
wrangler d1 execute search-poi --remote --file=cloudflare/d1/migrations/0002_fts.sql
wrangler d1 execute search-poi --remote --file=cloudflare/d1/migrations/0003_updated_at_triggers.sql
```

## Logic that moved out of the database (handled by the Workers in B3/B4/B5)

The following Postgres `SECURITY DEFINER` functions/RLS rules become app-layer code:

| Postgres                       | Cloudflare replacement |
|--------------------------------|------------------------|
| RLS policies                   | Auth-checked queries in Data API Worker (B4) |
| `gen_random_uuid()` default    | `crypto.randomUUID()` in Worker before INSERT |
| `gen_random_bytes(6)` referral | `crypto.getRandomValues(new Uint8Array(6))` → hex |
| `handle_new_user()` trigger    | Worker creates `profiles` row inside signup transaction |
| `process_referral()`           | Worker RPC `/v1/auth/referral` |
| `verify_referral()`            | Worker job triggered after first search |
| `award_poi_points()`           | Worker RPC `/v1/poi/award` |
| `increment_search_count()`     | Worker RPC `/v1/search/log` |
| `log_search_activity()`        | Worker RPC `/v1/search/log` (also prunes to 500) |
| `search_poi_index()`           | Worker SELECT using FTS5 `bm25()` ranking + domain/freshness boosts |
| `get_admin_*` functions        | Worker admin endpoints gated by hardcoded admin email |
| `increment_shared_view()`      | Worker RPC `/v1/share/view` |
| `lookup_referrer_by_code()`    | Public Worker endpoint, restricted columns |
| `get_referral_details()`       | Worker, owner-only |
| `update_signup_ip()`           | Worker writes signup_ip on first authenticated request |
| `crawled_pages_tsv_update()`   | Replaced by FTS5 triggers in 0002_fts.sql |

## Notes

- `auth.users` is replaced by the local `users` table (B3 implements signup, login, JWT, refresh rotation, Google OAuth).
- `auth.uid()` becomes `ctx.userId` derived from the verified JWT in each Worker request.
- All timestamps are `INTEGER` unix-ms for D1 friendliness; the client converts to Date as needed.
- `jsonb` columns are `TEXT` containing JSON; Workers `JSON.parse`/`JSON.stringify` at the boundary.
