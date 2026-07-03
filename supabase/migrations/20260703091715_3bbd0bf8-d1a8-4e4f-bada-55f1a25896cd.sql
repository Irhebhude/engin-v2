
-- Lock down crawler internal tables to service_role only
DROP POLICY IF EXISTS "Public read crawl_domains" ON public.crawl_domains;
DROP POLICY IF EXISTS "Public read crawl_queue" ON public.crawl_queue;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.crawl_domains FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.crawl_queue FROM anon, authenticated;

-- search_poi_index reads crawl_domains for ranking; make it SECURITY DEFINER so anon RPC still works
ALTER FUNCTION public.search_poi_index(text, integer) SECURITY DEFINER SET search_path = public;

-- trending_searches: block 4-digit year patterns and require popularity threshold
DROP POLICY IF EXISTS "Public can read non-PII trending searches" ON public.trending_searches;
CREATE POLICY "Public can read non-PII trending searches"
ON public.trending_searches
FOR SELECT
TO anon, authenticated
USING (
  query !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  AND query !~ '\d{4}'
  AND length(query) <= 120
  AND search_count > 5
);

-- search_activity: tighten sanitizer to block 4-digit years, hide user_id from public
DROP POLICY IF EXISTS "Public can read sanitized search activity" ON public.search_activity;
CREATE POLICY "Public can read sanitized search activity"
ON public.search_activity
FOR SELECT
TO anon, authenticated
USING (
  query !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  AND query !~ '\d{4}'
  AND length(query) <= 120
);

-- Column-level: hide user_id from public roles; keep full access for service_role
REVOKE SELECT ON public.search_activity FROM anon, authenticated;
GRANT SELECT (id, query, search_mode, created_at) ON public.search_activity TO anon, authenticated;
GRANT SELECT (user_id) ON public.search_activity TO authenticated;
