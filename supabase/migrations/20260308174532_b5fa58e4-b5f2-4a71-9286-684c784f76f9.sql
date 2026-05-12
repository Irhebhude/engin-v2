
-- Add signup_ip column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_ip text;

-- Create a function to update signup IP (called from client after signup)
CREATE OR REPLACE FUNCTION public.update_signup_ip(ip_address text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET signup_ip = ip_address
  WHERE id = auth.uid() AND signup_ip IS NULL;
END;
$$;

-- Create a function to check if referred users share IP with referrer
CREATE OR REPLACE FUNCTION public.get_referral_details(referrer_uid uuid)
RETURNS TABLE(
  referred_id uuid,
  referred_display_name text,
  referred_ip text,
  referrer_ip text,
  status text,
  created_at timestamptz,
  is_flagged boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_ip text;
BEGIN
  SELECT p.signup_ip INTO v_referrer_ip FROM public.profiles p WHERE p.id = referrer_uid;

  RETURN QUERY
  SELECT
    r.referred_id,
    p.display_name,
    p.signup_ip,
    v_referrer_ip,
    r.status,
    r.created_at,
    (p.signup_ip IS NOT NULL AND v_referrer_ip IS NOT NULL AND p.signup_ip = v_referrer_ip) as is_flagged
  FROM public.referrals r
  JOIN public.profiles p ON p.id = r.referred_id
  WHERE r.referrer_id = referrer_uid
  ORDER BY r.created_at DESC;
END;
$$;
