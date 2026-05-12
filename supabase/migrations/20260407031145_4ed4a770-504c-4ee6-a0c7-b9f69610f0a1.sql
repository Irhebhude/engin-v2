-- Fix 1: feedback table - restrict SELECT to only the submitter's own feedback
DROP POLICY IF EXISTS "Users can read their own feedback by email" ON public.feedback;

CREATE POLICY "Users can read their own feedback by email"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Fix 2: contact_messages - tighten INSERT to authenticated only
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;

CREATE POLICY "Authenticated users can insert contact messages"
  ON public.contact_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix 3: feedback INSERT - restrict to authenticated
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;

CREATE POLICY "Authenticated users can insert feedback"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);