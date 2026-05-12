-- POI Foundation owned crawler & index

-- 1. crawl_domains: track per-domain politeness + priority
CREATE TABLE public.crawl_domains (
  domain TEXT PRIMARY KEY,
  respect_robots BOOLEAN NOT NULL DEFAULT true,
  crawl_delay_ms INTEGER NOT NULL DEFAULT 2000,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  last_robots_check TIMESTAMPTZ,
  robots_disallow TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crawl_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read crawl_domains" ON public.crawl_domains FOR SELECT TO public USING (true);

-- 2. crawled_pages: the POI-owned index with Postgres FTS
CREATE TABLE public.crawled_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  title TEXT,
  description TEXT,
  content_md TEXT,
  language TEXT DEFAULT 'en',
  country TEXT,
  trust_score INTEGER NOT NULL DEFAULT 50,
  last_crawled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tsv TSVECTOR
);
ALTER TABLE public.crawled_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read crawled_pages" ON public.crawled_pages FOR SELECT TO public USING (true);

CREATE INDEX idx_crawled_pages_tsv ON public.crawled_pages USING GIN(tsv);
CREATE INDEX idx_crawled_pages_domain ON public.crawled_pages(domain);
CREATE INDEX idx_crawled_pages_last_crawled ON public.crawled_pages(last_crawled_at DESC);

-- Trigger to keep tsv in sync
CREATE OR REPLACE FUNCTION public.crawled_pages_tsv_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_md, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER crawled_pages_tsv_trigger
BEFORE INSERT OR UPDATE OF title, description, content_md
ON public.crawled_pages
FOR EACH ROW EXECUTE FUNCTION public.crawled_pages_tsv_update();

-- 3. crawl_queue: URLs waiting to be crawled
CREATE TABLE public.crawl_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crawl_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read crawl_queue" ON public.crawl_queue FOR SELECT TO public USING (true);

CREATE INDEX idx_crawl_queue_status_scheduled ON public.crawl_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_crawl_queue_priority ON public.crawl_queue(priority DESC) WHERE status = 'pending';

-- 4. Search RPC: hybrid FTS over POI index with ranking boosts
CREATE OR REPLACE FUNCTION public.search_poi_index(query_text TEXT, result_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  url TEXT,
  domain TEXT,
  title TEXT,
  description TEXT,
  trust_score INTEGER,
  last_crawled_at TIMESTAMPTZ,
  rank REAL,
  is_priority BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.url,
    cp.domain,
    cp.title,
    cp.description,
    cp.trust_score,
    cp.last_crawled_at,
    (
      ts_rank(cp.tsv, websearch_to_tsquery('english', query_text)) +
      CASE WHEN cp.domain LIKE '%.gov.ng' THEN 0.5
           WHEN cp.domain LIKE '%.ng' THEN 0.3
           ELSE 0 END +
      COALESCE((SELECT CASE WHEN cd.is_priority THEN 0.2 ELSE 0 END FROM crawl_domains cd WHERE cd.domain = cp.domain), 0) +
      CASE WHEN cp.last_crawled_at > now() - interval '7 days' THEN 0.1 ELSE 0 END
    )::REAL AS rank,
    COALESCE((SELECT cd.is_priority FROM crawl_domains cd WHERE cd.domain = cp.domain), false) AS is_priority
  FROM crawled_pages cp
  WHERE cp.tsv @@ websearch_to_tsquery('english', query_text)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;