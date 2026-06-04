-- ─────────────────────────────────────────────────────────────────────
-- D1 (SQLite) port of the Supabase Postgres schema — Batch B2
-- ─────────────────────────────────────────────────────────────────────
-- Conversions applied:
--   uuid              → TEXT  (app fills via crypto.randomUUID())
--   timestamptz       → INTEGER  (unix ms; default strftime('%s','now')*1000)
--   jsonb             → TEXT     (JSON string; validate in worker)
--   text[]            → TEXT     (JSON array string)
--   tsvector          → FTS5 virtual table (see 0002_fts.sql)
--   numeric           → REAL
--   boolean           → INTEGER (0/1)
--   RLS policies      → enforced in the Data API Worker (Batch B4)
--   gen_random_bytes  → app-layer hex via crypto.getRandomValues
-- ─────────────────────────────────────────────────────────────────────

PRAGMA foreign_keys = ON;

-- ───── auth (replaces auth.users) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,                 -- NULL for OAuth-only accounts
  email_verified_at INTEGER,
  provider      TEXT NOT NULL DEFAULT 'password',  -- password | google
  provider_sub  TEXT,                 -- Google sub
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_users_provider_sub ON users(provider_sub);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,             -- refresh token id
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash  TEXT NOT NULL,                -- SHA-256 of refresh token
  user_agent    TEXT,
  ip            TEXT,
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  expires_at    INTEGER NOT NULL,
  revoked_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ───── profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username        TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  referral_code   TEXT NOT NULL UNIQUE,
  referred_by     TEXT REFERENCES profiles(id),
  email_verified  INTEGER NOT NULL DEFAULT 0,
  search_count    INTEGER NOT NULL DEFAULT 0,
  is_premium      INTEGER NOT NULL DEFAULT 0,
  premium_since   INTEGER,
  poi_points      INTEGER NOT NULL DEFAULT 0,
  lite_mode       INTEGER NOT NULL DEFAULT 0,
  signup_ip       TEXT,
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  updated_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by  ON profiles(referred_by);

-- ───── referrals ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id           TEXT PRIMARY KEY,
  referrer_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id  TEXT NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending|verified|flagged|rewarded
  verified_at  INTEGER,
  created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_type     TEXT NOT NULL DEFAULT 'free_month',
  referral_batch  INTEGER NOT NULL,
  activated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  expires_at      INTEGER NOT NULL,
  UNIQUE(user_id, referral_batch)
);

-- ───── POI points ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poi_points_log (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_poi_points_log_user ON poi_points_log(user_id);

CREATE TABLE IF NOT EXISTS poi_tasks (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  points_reward  INTEGER NOT NULL DEFAULT 10,
  task_type      TEXT NOT NULL DEFAULT 'verify_price',
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS poi_task_completions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id    TEXT NOT NULL REFERENCES poi_tasks(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending',
  proof_data TEXT NOT NULL DEFAULT '{}',  -- JSON
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

-- ───── businesses ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id                       TEXT PRIMARY KEY,
  owner_id                 TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  description              TEXT,
  category                 TEXT NOT NULL DEFAULT 'general',
  phone                    TEXT,
  whatsapp                 TEXT,
  email                    TEXT,
  website                  TEXT,
  address                  TEXT,
  city                     TEXT,
  state                    TEXT,
  country                  TEXT NOT NULL DEFAULT 'Nigeria',
  logo_url                 TEXT,
  inventory_csv_url        TEXT,
  member_discount_percent  REAL DEFAULT 0,
  trust_score              INTEGER NOT NULL DEFAULT 0,
  is_verified              INTEGER NOT NULL DEFAULT 0,
  verified_at              INTEGER,
  created_at               INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  updated_at               INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_businesses_owner    ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON businesses(is_verified);

-- ───── shared searches / vaults ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_searches (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  slug         TEXT NOT NULL UNIQUE,
  query        TEXT NOT NULL,
  answer       TEXT NOT NULL,
  sources      TEXT NOT NULL DEFAULT '[]',   -- JSON
  search_mode  TEXT NOT NULL DEFAULT 'default',
  view_count   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS knowledge_vaults (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_public   INTEGER NOT NULL DEFAULT 1,
  view_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS knowledge_vault_items (
  id         TEXT PRIMARY KEY,
  vault_id   TEXT NOT NULL REFERENCES knowledge_vaults(id) ON DELETE CASCADE,
  query      TEXT NOT NULL,
  answer     TEXT,
  sources    TEXT NOT NULL DEFAULT '[]',   -- JSON
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_kv_items_vault ON knowledge_vault_items(vault_id);

-- ───── trending / activity ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_activity (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  query       TEXT NOT NULL,
  search_mode TEXT NOT NULL DEFAULT 'default',
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_search_activity_created ON search_activity(created_at DESC);

CREATE TABLE IF NOT EXISTS trending_searches (
  id                TEXT PRIMARY KEY,
  query             TEXT NOT NULL,
  query_lower       TEXT NOT NULL UNIQUE,    -- replaces lower(query) unique index
  search_count      INTEGER NOT NULL DEFAULT 1,
  last_searched_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  created_at        INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS trending_content (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'trending',
  keywords    TEXT NOT NULL DEFAULT '[]',   -- JSON array
  view_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

-- ───── forms ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id         TEXT PRIMARY KEY,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS feedback (
  id          TEXT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  message     TEXT NOT NULL,
  rating      INTEGER,
  ai_response TEXT,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS waitlist (
  id         TEXT PRIMARY KEY,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  company    TEXT,
  use_case   TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

-- ───── developer API ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT 'Default',
  key_prefix        TEXT NOT NULL,
  key_hash          TEXT NOT NULL,
  credits_remaining INTEGER NOT NULL DEFAULT 100,
  total_calls       INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1,
  last_used_at      INTEGER,
  created_at        INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS api_usage_log (
  id          TEXT PRIMARY KEY,
  api_key_id  TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  mode        TEXT NOT NULL DEFAULT 'default',
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage_log(api_key_id);

-- ───── crawler ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crawl_domains (
  domain            TEXT PRIMARY KEY,
  is_priority       INTEGER NOT NULL DEFAULT 0,
  is_blocked        INTEGER NOT NULL DEFAULT 0,
  crawl_delay_ms    INTEGER NOT NULL DEFAULT 2000,
  respect_robots    INTEGER NOT NULL DEFAULT 1,
  robots_disallow   TEXT NOT NULL DEFAULT '[]',  -- JSON array
  last_robots_check INTEGER,
  created_at        INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS crawl_queue (
  id           TEXT PRIMARY KEY,
  url          TEXT NOT NULL,
  domain       TEXT NOT NULL,
  priority     INTEGER NOT NULL DEFAULT 5,
  status       TEXT NOT NULL DEFAULT 'pending',
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  scheduled_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_crawl_queue_status ON crawl_queue(status, scheduled_at);

CREATE TABLE IF NOT EXISTS crawled_pages (
  id              TEXT PRIMARY KEY,
  url             TEXT NOT NULL UNIQUE,
  domain          TEXT NOT NULL,
  title           TEXT,
  description     TEXT,
  content_md      TEXT,
  language        TEXT DEFAULT 'en',
  country         TEXT,
  trust_score     INTEGER NOT NULL DEFAULT 50,
  last_crawled_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_domain ON crawled_pages(domain);

-- ───── nexus ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nexus_missions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'running',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS nexus_agent_outputs (
  id          TEXT PRIMARY KEY,
  mission_id  TEXT NOT NULL REFERENCES nexus_missions(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_name  TEXT NOT NULL,
  output      TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS nexus_memory (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight    TEXT NOT NULL,
  domain     TEXT NOT NULL DEFAULT 'general',
  confidence INTEGER NOT NULL DEFAULT 75,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS nexus_intel_feed (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  domain     TEXT NOT NULL,
  content    TEXT NOT NULL,
  anomaly    INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
);
