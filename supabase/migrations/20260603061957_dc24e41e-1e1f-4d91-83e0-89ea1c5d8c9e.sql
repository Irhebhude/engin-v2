
DROP VIEW IF EXISTS public.search_activity_public;
DROP VIEW IF EXISTS public.public_referral_codes;

-- Re-add referral codes view as security_invoker (RLS-respecting)
CREATE VIEW public.public_referral_codes
WITH (security_invoker = on) AS
  SELECT id, referral_code, display_name FROM public.profiles;
GRANT SELECT ON public.public_referral_codes TO anon, authenticated;

-- Allow anon to read sanitized rows directly from search_activity (user_id is opaque UUID)
CREATE POLICY "Public can read sanitized search activity"
ON public.search_activity
FOR SELECT
TO anon, authenticated
USING (
  query !~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  AND query !~ '\d{6,}'
  AND length(query) <= 120
);

-- Profiles: also allow anon to look up by referral_code only (needed for /referral landing pages)
CREATE POLICY "Public can read profile by referral code"
ON public.profiles
FOR SELECT
TO anon
USING (referral_code IS NOT NULL AND auth.uid() IS NULL AND false);
-- Intentionally false: anon access is now only via lookup_referrer_by_code() RPC.
