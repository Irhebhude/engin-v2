-- Migration 0004 — Modules 13-20 (Trip history, SOS, Expenses, Ratings,
-- Voice notes, Home/Work locations). All timestamps stored as unix-ms.
-- Runs after 0001_core_schema.sql (users table exists).

CREATE TABLE IF NOT EXISTS trips (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin        TEXT NOT NULL,
  destination   TEXT NOT NULL,
  origin_lat    REAL,
  origin_lng    REAL,
  dest_lat      REAL,
  dest_lng      REAL,
  distance_km   REAL,
  duration_sec  INTEGER,
  is_favorite   INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id     TEXT REFERENCES trips(id) ON DELETE SET NULL,
  category    TEXT NOT NULL,        -- fuel|toll|food|lodging|other
  amount      REAL NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'NGN',
  note        TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ratings (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  poi_id      TEXT NOT NULL,
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review      TEXT,
  created_at  INTEGER NOT NULL,
  UNIQUE (user_id, poi_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_poi ON ratings(poi_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sos_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  message     TEXT,
  contacts    TEXT,                 -- JSON array of contacts notified
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sos_user ON sos_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS voice_notes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,        -- object key in R2 voice-notes bucket
  lat         REAL,
  lng         REAL,
  duration_ms INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_voice_user ON voice_notes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_places (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,        -- home|work
  label       TEXT,
  address     TEXT NOT NULL,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind)
);
