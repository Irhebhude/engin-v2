
-- Table to track trending searches for autocomplete
CREATE TABLE public.trending_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  search_count integer NOT NULL DEFAULT 1,
  last_searched_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_trending_searches_query ON public.trending_searches (lower(query));

ALTER TABLE public.trending_searches ENABLE ROW LEVEL SECURITY;

-- Anyone can read trending searches
CREATE POLICY "Anyone can read trending searches"
  ON public.trending_searches FOR SELECT
  TO public
  USING (true);

-- Table to track live search activity for real-time feed
CREATE TABLE public.search_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  search_mode text NOT NULL DEFAULT 'default',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.search_activity ENABLE ROW LEVEL SECURITY;

-- Anyone can read activity (anonymized)
CREATE POLICY "Anyone can read search activity"
  ON public.search_activity FOR SELECT
  TO public
  USING (true);

-- Enable realtime for live activity
ALTER PUBLICATION supabase_realtime ADD TABLE public.search_activity;

-- Function to log a search and update trending
CREATE OR REPLACE FUNCTION public.log_search_activity(search_query text, search_mode text DEFAULT 'default')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log activity
  INSERT INTO public.search_activity (user_id, query, search_mode)
  VALUES (auth.uid(), search_query, search_mode);

  -- Update trending
  INSERT INTO public.trending_searches (query, search_count, last_searched_at)
  VALUES (search_query, 1, now())
  ON CONFLICT (lower(query))
  DO UPDATE SET
    search_count = trending_searches.search_count + 1,
    last_searched_at = now();

  -- Prune old activity (keep last 500)
  DELETE FROM public.search_activity
  WHERE id NOT IN (
    SELECT id FROM public.search_activity
    ORDER BY created_at DESC
    LIMIT 500
  );
END;
$$;

-- Table for auto-generated trending content pages
CREATE TABLE public.trending_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'trending',
  keywords text[] DEFAULT '{}',
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trending_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trending content"
  ON public.trending_content FOR SELECT
  TO public
  USING (true);
