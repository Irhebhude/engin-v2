-- Tighten waitlist INSERT to authenticated
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

CREATE POLICY "Authenticated users can join waitlist"
  ON public.waitlist FOR INSERT
  TO authenticated
  WITH CHECK (
    length(trim(full_name)) > 0
    AND length(trim(email)) > 0
  );

-- Tighten contact_messages INSERT with validation
DROP POLICY IF EXISTS "Authenticated users can insert contact messages" ON public.contact_messages;

CREATE POLICY "Authenticated users can insert contact messages"
  ON public.contact_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    length(trim(full_name)) > 0
    AND length(trim(email)) > 0
    AND length(trim(message)) > 0
  );

-- Tighten feedback INSERT with validation
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedback;

CREATE POLICY "Authenticated users can insert feedback"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    length(trim(full_name)) > 0
    AND length(trim(email)) > 0
    AND length(trim(message)) > 0
  );