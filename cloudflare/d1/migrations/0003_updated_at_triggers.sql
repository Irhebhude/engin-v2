-- SQLite has no shared trigger function; replicate update_updated_at_column()
-- per-table for everything that has an updated_at column.

CREATE TRIGGER IF NOT EXISTS users_updated_at
  AFTER UPDATE ON users FOR EACH ROW
  BEGIN UPDATE users SET updated_at = strftime('%s','now')*1000 WHERE id = old.id; END;

CREATE TRIGGER IF NOT EXISTS profiles_updated_at
  AFTER UPDATE ON profiles FOR EACH ROW
  BEGIN UPDATE profiles SET updated_at = strftime('%s','now')*1000 WHERE id = old.id; END;

CREATE TRIGGER IF NOT EXISTS businesses_updated_at
  AFTER UPDATE ON businesses FOR EACH ROW
  BEGIN UPDATE businesses SET updated_at = strftime('%s','now')*1000 WHERE id = old.id; END;

CREATE TRIGGER IF NOT EXISTS knowledge_vaults_updated_at
  AFTER UPDATE ON knowledge_vaults FOR EACH ROW
  BEGIN UPDATE knowledge_vaults SET updated_at = strftime('%s','now')*1000 WHERE id = old.id; END;

CREATE TRIGGER IF NOT EXISTS trending_content_updated_at
  AFTER UPDATE ON trending_content FOR EACH ROW
  BEGIN UPDATE trending_content SET updated_at = strftime('%s','now')*1000 WHERE id = old.id; END;
