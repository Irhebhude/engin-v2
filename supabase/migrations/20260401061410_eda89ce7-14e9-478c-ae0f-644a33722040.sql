
-- Shared searches for permalink system
CREATE TABLE public.shared_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  query text NOT NULL,
  answer text NOT NULL,
  search_mode text NOT NULL DEFAULT 'default',
  sources jsonb DEFAULT '[]'::jsonb,
  slug text NOT NULL UNIQUE,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared searches" ON public.shared_searches
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert shared searches" ON public.shared_searches
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Knowledge Vaults
CREATE TABLE public.knowledge_vaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  is_public boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public vaults" ON public.knowledge_vaults
  FOR SELECT TO public USING (is_public = true);

CREATE POLICY "Owners can read own vaults" ON public.knowledge_vaults
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Owners can insert vaults" ON public.knowledge_vaults
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can update own vaults" ON public.knowledge_vaults
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Owners can delete own vaults" ON public.knowledge_vaults
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Knowledge Vault Items
CREATE TABLE public.knowledge_vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid REFERENCES public.knowledge_vaults(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  answer text,
  sources jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read items of public vaults" ON public.knowledge_vault_items
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM public.knowledge_vaults v WHERE v.id = vault_id AND v.is_public = true)
  );

CREATE POLICY "Owners can read own vault items" ON public.knowledge_vault_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.knowledge_vaults v WHERE v.id = vault_id AND v.user_id = auth.uid())
  );

CREATE POLICY "Owners can insert vault items" ON public.knowledge_vault_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.knowledge_vaults v WHERE v.id = vault_id AND v.user_id = auth.uid())
  );

CREATE POLICY "Owners can delete own vault items" ON public.knowledge_vault_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.knowledge_vaults v WHERE v.id = vault_id AND v.user_id = auth.uid())
  );

-- POI Tasks (bounty system)
CREATE TABLE public.poi_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  points_reward integer NOT NULL DEFAULT 10,
  task_type text NOT NULL DEFAULT 'verify_price',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.poi_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tasks" ON public.poi_tasks
  FOR SELECT TO public USING (is_active = true);

-- POI Task completions
CREATE TABLE public.poi_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.poi_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  proof_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.poi_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own completions" ON public.poi_task_completions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert completions" ON public.poi_task_completions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Increment shared search view count function
CREATE OR REPLACE FUNCTION public.increment_shared_view(search_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.shared_searches SET view_count = view_count + 1 WHERE id = search_id;
END;
$$;

-- Insert some default POI tasks
INSERT INTO public.poi_tasks (title, description, points_reward, task_type) VALUES
('Verify a Local Shop Price', 'Confirm or update the price of a product at a local shop near you.', 15, 'verify_price'),
('Report Incorrect Business Hours', 'Found wrong opening/closing times? Report it and earn points.', 10, 'report_hours'),
('Add a New Local Business', 'Know a business not yet on SEARCH-POI? Add it to help the community.', 25, 'add_business'),
('Verify Fuel Price at a Station', 'Confirm the current fuel price at a petrol station near you.', 20, 'verify_fuel'),
('Share SEARCH-POI on Social Media', 'Share a SEARCH-POI result on Twitter, WhatsApp or Instagram.', 5, 'social_share');
