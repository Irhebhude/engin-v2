
-- Add premium fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_since timestamp with time zone,
ADD COLUMN IF NOT EXISTS poi_points integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS lite_mode boolean NOT NULL DEFAULT false;

-- Create businesses table for B2B verification
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  phone text,
  whatsapp text,
  email text,
  website text,
  address text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'Nigeria',
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamp with time zone,
  trust_score integer NOT NULL DEFAULT 0,
  logo_url text,
  inventory_csv_url text,
  member_discount_percent numeric(5,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verified businesses" ON public.businesses
  FOR SELECT TO public USING (is_verified = true);

CREATE POLICY "Owners can read own businesses" ON public.businesses
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can insert businesses" ON public.businesses
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own businesses" ON public.businesses
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());

-- POI Points log
CREATE TABLE public.poi_points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.poi_points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own points" ON public.poi_points_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Function to award POI points
CREATE OR REPLACE FUNCTION public.award_poi_points(target_user_id uuid, amount integer, point_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.poi_points_log (user_id, points, reason)
  VALUES (target_user_id, amount, point_reason);
  
  UPDATE public.profiles
  SET poi_points = poi_points + amount
  WHERE id = target_user_id;
END;
$$;
