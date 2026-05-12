
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  referral_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  referred_by UUID REFERENCES public.profiles(id),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  search_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Anyone can read basic profile info (for referral display)
CREATE POLICY "Public can read referral codes" ON public.profiles
  FOR SELECT TO anon
  USING (true);

-- Referrals tracking table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rewarded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals
CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Rewards table
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL DEFAULT 'free_month',
  referral_batch INTEGER NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE(user_id, referral_batch)
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own rewards" ON public.referral_rewards
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Handle referral on signup (called after profile creation)
CREATE OR REPLACE FUNCTION public.process_referral(referral_code_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_profile_id UUID;
  verified_count INTEGER;
BEGIN
  -- Find referrer by code
  SELECT id INTO referrer_profile_id
  FROM public.profiles
  WHERE referral_code = referral_code_input
  AND id != auth.uid();

  IF referrer_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update referred_by
  UPDATE public.profiles SET referred_by = referrer_profile_id WHERE id = auth.uid();

  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, status)
  VALUES (referrer_profile_id, auth.uid(), 'pending')
  ON CONFLICT (referred_id) DO NOTHING;

  RETURN true;
END;
$$;

-- Function to verify a referral (called when user verifies email + meets activity threshold)
CREATE OR REPLACE FUNCTION public.verify_referral()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_record RECORD;
  verified_count INTEGER;
  batch_num INTEGER;
BEGIN
  -- Mark this user's referral as verified
  UPDATE public.referrals
  SET status = 'verified', verified_at = now()
  WHERE referred_id = auth.uid() AND status = 'pending';

  -- Check if referrer has hit 10 verified referrals
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
      -- Grant reward for completed batch
      INSERT INTO public.referral_rewards (user_id, referral_batch)
      VALUES (ref_record.referrer_id, batch_num)
      ON CONFLICT (user_id, referral_batch) DO NOTHING;

      -- Mark referrals as rewarded
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
$$;

-- Increment search count function
CREATE OR REPLACE FUNCTION public.increment_search_count()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET search_count = search_count + 1
  WHERE id = auth.uid();

  -- Auto-verify referral if user has 3+ searches and verified email
  IF (SELECT search_count FROM public.profiles WHERE id = auth.uid()) >= 3 THEN
    IF EXISTS (
      SELECT 1 FROM public.referrals
      WHERE referred_id = auth.uid() AND status = 'pending'
    ) THEN
      PERFORM public.verify_referral();
    END IF;
  END IF;
END;
$$;
