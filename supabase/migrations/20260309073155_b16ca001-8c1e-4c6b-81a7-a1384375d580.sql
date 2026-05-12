CREATE OR REPLACE FUNCTION public.verify_referral()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ref_record RECORD;
  verified_count INTEGER;
  batch_num INTEGER;
  v_referrer_ip text;
  v_referred_ip text;
BEGIN
  SELECT signup_ip INTO v_referred_ip FROM public.profiles WHERE id = auth.uid();

  FOR ref_record IN
    SELECT r.referrer_id
    FROM public.referrals r
    WHERE r.referred_id = auth.uid() AND r.status = 'pending'
  LOOP
    SELECT signup_ip INTO v_referrer_ip FROM public.profiles WHERE id = ref_record.referrer_id;
    
    IF v_referred_ip IS NOT NULL AND v_referrer_ip IS NOT NULL AND v_referred_ip = v_referrer_ip THEN
      UPDATE public.referrals
      SET status = 'flagged', verified_at = now()
      WHERE referred_id = auth.uid() AND status = 'pending';
      RETURN;
    END IF;
  END LOOP;

  UPDATE public.referrals
  SET status = 'verified', verified_at = now()
  WHERE referred_id = auth.uid() AND status = 'pending';

  FOR ref_record IN
    SELECT referrer_id, COUNT(*) as cnt
    FROM public.referrals
    WHERE referred_id = auth.uid() AND status = 'verified'
    GROUP BY referrer_id
  LOOP
    SELECT COUNT(*) INTO verified_count
    FROM public.referrals
    WHERE referrer_id = ref_record.referrer_id AND status IN ('verified', 'rewarded');

    batch_num := verified_count / 10;

    IF batch_num > 0 THEN
      INSERT INTO public.referral_rewards (user_id, referral_batch)
      VALUES (ref_record.referrer_id, batch_num)
      ON CONFLICT (user_id, referral_batch) DO NOTHING;

      UPDATE public.referrals
      SET status = 'rewarded'
      WHERE referrer_id = ref_record.referrer_id
      AND status = 'verified'
      AND id IN (
        SELECT id FROM public.referrals
        WHERE referrer_id = ref_record.referrer_id AND status = 'verified'
        ORDER BY created_at
        LIMIT (batch_num * 10)
      );
    END IF;
  END LOOP;
END;
$function$