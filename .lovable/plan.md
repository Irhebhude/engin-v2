# Next delivery — 3 parts

## Part 1 (ship this turn) — Pages Directory + always-on passcode

### 1A. Pages Directory tool (`/pages`)
The app already has 26 pages, but only ~8 are reachable from the header. Add a single hub that lists every internal route so you (and users) can jump to anything.

- **New file:** `src/pages/PagesDirectory.tsx` — cyberpunk grid of cards, grouped by category:
  - **Core:** Home, Search, Insights, Trending, Shared Search, Knowledge Vaults, Query Pages
  - **Intelligence:** Nexus Core, Live Sources, POI Points, Developer Dashboard
  - **Account & Security:** Auth, Security (passcode), Referral, Premium, Pricing, Waitlist
  - **Business:** Business Dashboard, B2B widgets
  - **Info:** About, Contact, Feedback, Policies, Rights
  - **Admin (admin-only):** Admin Dashboard, Acquisition Control
  - Each card: Orbitron title, route, one-line description, icon, `#00FFE7` border.
- **Route:** `/pages` in `src/App.tsx`.
- **Header entry:** Add **`◉ ALL PAGES`** button to `Header.tsx` (desktop nav + mobile hamburger), visible only after the user has set up a passcode (`hasPasscode() || hasBiometric()`).

### 1B. Passcode pops up every return
Currently the gate keeps a 24h fresh session. Change it so any new tab visit / reload / regained focus prompts the passcode.

- `src/lib/device-lock.ts`: Drop `SESSION_MS` to **0** (no fresh window). `isSessionFresh()` returns `false` once the tab is hidden or reloaded. Keep lockout/throttle untouched.
- `src/components/security/DeviceLockGate.tsx`: Always lock on mount when enrolled; re-lock on `visibilitychange → hidden` so coming back triggers the LockScreen.
- LockScreen already supports passcode + biometric + "Forgot passcode?" recovery — no UI change.
- Preview-iframe escape hatch stays (so Lovable editor isn't blocked).

---

## Part 2 — Track B: Cloudflare migration scope (6 batches, multi-turn)

This will replace Lovable Cloud (Supabase) with Cloudflare. Each batch is one approval.

| Batch | Title | Deliverable |
|---|---|---|
| **B1** | Cloudflare project skeleton | `wrangler.toml`, `functions/` dir, Pages config, env var contract, deploy script. No code cutover yet — runs alongside Supabase. |
| **B2** | D1 schema port | Translate all current Postgres tables (profiles, referrals, search_activity, trending_searches, businesses, nexus_*, etc.) to D1 SQLite migrations. Drop Postgres-only bits (RLS → app-layer checks, tsvector → FTS5, gen_random_uuid → crypto.randomUUID). |
| **B3** | Auth Worker | Email+password + Google OAuth via Cloudflare Workers, JWT (HS256) in httpOnly cookie, refresh rotation. Replaces `@supabase/supabase-js` auth client. |
| **B4** | Data API Worker | REST + RPC layer (D1 queries, R2 file storage, KV cache). One endpoint per current `supabase.from(...).select()` usage. Type-safe via generated `cf-types.ts`. |
| **B5** | Edge Functions port | Move every `supabase/functions/*` to `functions/api/*` (Workers). Same Lovable AI Gateway calls — only the runtime changes. |
| **B6** | Client cutover | Replace `@/integrations/supabase/client` with `@/integrations/cf/client`. Swap calls site-by-site. Remove Supabase deps. Verify on Cloudflare Pages preview. Flip DNS. |

**Constraints kept:** free public endpoints only, no paid keys, cyberpunk theme, mobile-first, RLS-equivalent app-layer authorization.

**You'll need to provide (when we reach B1):** Cloudflare account ID, API token with Pages+Workers+D1+R2+KV scopes, domain name. I'll request these via the secrets flow at that time.

---

## Part 3 — After B ships
Run page-consolidation audit (Track C from earlier plan) using the new `/pages` hub as the inventory source.

---

## Confirm to proceed
Reply **"go"** → I ship Part 1 now (Pages Directory + passcode-on-return) and queue Batch B1 next.
