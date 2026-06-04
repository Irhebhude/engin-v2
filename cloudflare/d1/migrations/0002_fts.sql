-- FTS5 replacement for Postgres tsvector on crawled_pages.
-- Replaces: cp.tsv + crawled_pages_tsv_update() trigger + websearch_to_tsquery.
-- Query syntax in Worker: SELECT ... FROM crawled_pages_fts WHERE crawled_pages_fts MATCH ?
-- with bm25() for relevance ranking.

CREATE VIRTUAL TABLE IF NOT EXISTS crawled_pages_fts USING fts5(
  title,
  description,
  content_md,
  content='crawled_pages',
  content_rowid='rowid',
  tokenize = 'porter unicode61'
);

-- Keep FTS index in sync with crawled_pages
CREATE TRIGGER IF NOT EXISTS crawled_pages_ai AFTER INSERT ON crawled_pages BEGIN
  INSERT INTO crawled_pages_fts(rowid, title, description, content_md)
  VALUES (new.rowid, new.title, new.description, new.content_md);
END;

CREATE TRIGGER IF NOT EXISTS crawled_pages_ad AFTER DELETE ON crawled_pages BEGIN
  INSERT INTO crawled_pages_fts(crawled_pages_fts, rowid, title, description, content_md)
  VALUES('delete', old.rowid, old.title, old.description, old.content_md);
END;

CREATE TRIGGER IF NOT EXISTS crawled_pages_au AFTER UPDATE ON crawled_pages BEGIN
  INSERT INTO crawled_pages_fts(crawled_pages_fts, rowid, title, description, content_md)
  VALUES('delete', old.rowid, old.title, old.description, old.content_md);
  INSERT INTO crawled_pages_fts(rowid, title, description, content_md)
  VALUES (new.rowid, new.title, new.description, new.content_md);
END;
