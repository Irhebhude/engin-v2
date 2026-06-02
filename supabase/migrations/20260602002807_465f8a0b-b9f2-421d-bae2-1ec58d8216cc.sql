
-- NEXUS CORE tables

CREATE TABLE public.nexus_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nexus_missions TO authenticated;
GRANT ALL ON public.nexus_missions TO service_role;
ALTER TABLE public.nexus_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own missions" ON public.nexus_missions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own missions" ON public.nexus_missions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own missions" ON public.nexus_missions FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.nexus_agent_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL,
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.nexus_agent_outputs TO authenticated;
GRANT ALL ON public.nexus_agent_outputs TO service_role;
ALTER TABLE public.nexus_agent_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own agent outputs" ON public.nexus_agent_outputs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own agent outputs" ON public.nexus_agent_outputs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.nexus_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  confidence INTEGER NOT NULL DEFAULT 75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.nexus_memory TO authenticated;
GRANT ALL ON public.nexus_memory TO service_role;
ALTER TABLE public.nexus_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own memory" ON public.nexus_memory FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own memory" ON public.nexus_memory FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own memory" ON public.nexus_memory FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.nexus_intel_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  content TEXT NOT NULL,
  anomaly BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nexus_intel_feed TO anon;
GRANT SELECT, INSERT ON public.nexus_intel_feed TO authenticated;
GRANT ALL ON public.nexus_intel_feed TO service_role;
ALTER TABLE public.nexus_intel_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read intel feed" ON public.nexus_intel_feed FOR SELECT USING (true);
CREATE POLICY "Authenticated can append intel" ON public.nexus_intel_feed FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_nexus_agent_outputs_mission ON public.nexus_agent_outputs(mission_id);
CREATE INDEX idx_nexus_intel_feed_created ON public.nexus_intel_feed(created_at DESC);
CREATE INDEX idx_nexus_memory_user ON public.nexus_memory(user_id, created_at DESC);
