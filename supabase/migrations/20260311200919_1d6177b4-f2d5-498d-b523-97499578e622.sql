
CREATE OR REPLACE FUNCTION public.increment_search_count()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET search_count = search_count + 1
  WHERE id = auth.uid();

  IF (SELECT search_count FROM public.profiles WHERE id = auth.uid()) >= 1 THEN
    IF EXISTS (
      SELECT 1 FROM public.referrals
      WHERE referred_id = auth.uid() AND status = 'pending'
    ) THEN
      PERFORM public.verify_referral();
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_user_stats()
RETURNS TABLE(
  total_users bigint,
  active_users bigint,
  inactive_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_users,
    COUNT(*) FILTER (WHERE p.search_count > 0 OR p.updated_at > now() - interval '30 days')::bigint as active_users,
    COUNT(*) FILTER (WHERE p.search_count = 0 AND p.updated_at <= now() - interval '30 days')::bigint as inactive_users
  FROM public.profiles p;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email_verified boolean,
  search_count integer,
  referral_code text,
  signup_ip text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.email_verified,
    p.search_count,
    p.referral_code,
    p.signup_ip,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;
