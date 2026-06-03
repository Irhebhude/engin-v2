
-- 1. Profiles: remove broad anon SELECT, expose only referral fields via a view
DROP POLICY IF EXISTS "Public can read referral codes" ON public.profiles;

CREATE OR REPLACE VIEW public.public_referral_codes
WITH (security_invoker = on) AS
  SELECT id, referral_code, display_name FROM public.profiles;

GRANT SELECT ON public.public_referral_codes TO anon, authenticated;

-- Provide a SECURITY DEFINER lookup so anon can resolve a referral code to a referrer id
CREATE OR REPLACE FUNCTION public.lookup_referrer_by_code(code text)
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE p.referral_code = code
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_referrer_by_code(text) TO anon, authenticated;

-- 2. Search activity: drop public table read; expose sanitized view
DROP POLICY IF EXISTS "Anyone can read search activity" ON public.search_activity;

CREATE POLICY "Users can read own search activity"
ON public.search_activity
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE VIEW public.search_activity_public
WITH (security_invoker = off) AS
  SELECT id, query, search_mode, created_at
  FROM public.search_activity
  WHERE query !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
    AND query !~ '\d{6,}'
    AND length(query) <= 120;

GRANT SELECT ON public.search_activity_public TO anon, authenticated;

-- 3. Trending searches: filter PII rows from public read
DROP POLICY IF EXISTS "Anyone can read trending searches" ON public.trending_searches;

CREATE POLICY "Public can read non-PII trending searches"
ON public.trending_searches
FOR SELECT
TO anon, authenticated
USING (
  query !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  AND query !~ '\d{6,}'
  AND length(query) <= 120
);

-- 4. Nexus intel feed: only service_role inserts
DROP POLICY IF EXISTS "Authenticated can append intel" ON public.nexus_intel_feed;
-- (Service role bypasses RLS, so no policy needed for inserts from edge functions.)
