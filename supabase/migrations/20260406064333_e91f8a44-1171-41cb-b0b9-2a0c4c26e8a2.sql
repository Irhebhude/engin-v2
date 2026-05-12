
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  credits_remaining integer NOT NULL DEFAULT 100,
  total_calls integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE public.api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  query text NOT NULL,
  mode text NOT NULL DEFAULT 'default',
  tokens_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own API keys" ON public.api_keys FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own API keys" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own API keys" ON public.api_keys FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own API keys" ON public.api_keys FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can read own usage" ON public.api_usage_log FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.api_keys k WHERE k.id = api_usage_log.api_key_id AND k.user_id = auth.uid()));
