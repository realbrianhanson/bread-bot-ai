
-- Fix: gen_form_key search_path mutable
CREATE OR REPLACE FUNCTION public.gen_form_key()
RETURNS text
LANGUAGE sql
SET search_path = public, extensions
AS $$
  SELECT 'fk_' || encode(extensions.gen_random_bytes(12), 'hex')
$$;

-- Fix: realtime.messages policies fall back to ELSE true
DROP POLICY IF EXISTS "Authenticated users can read own task channel" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can write own task channel" ON realtime.messages;

CREATE POLICY "Authenticated users can read own task channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() ~* 'tasks?[:/]'::text)
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.user_id = (SELECT auth.uid())
      AND (
        realtime.topic() = ('tasks:' || t.id::text)
        OR realtime.topic() = ('task:' || t.id::text)
        OR realtime.topic() LIKE ('%' || t.id::text || '%')
      )
  )
);

CREATE POLICY "Authenticated users can write own task channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() ~* 'tasks?[:/]'::text)
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.user_id = (SELECT auth.uid())
      AND (
        realtime.topic() = ('tasks:' || t.id::text)
        OR realtime.topic() = ('task:' || t.id::text)
        OR realtime.topic() LIKE ('%' || t.id::text || '%')
      )
  )
);
