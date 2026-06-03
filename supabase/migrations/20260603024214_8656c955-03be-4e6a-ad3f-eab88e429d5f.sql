-- Fix privilege escalation: only admins can insert user_roles
DROP POLICY IF EXISTS "Only admins can insert roles for others" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Remove projects from realtime publication (not used and exposes channel risk)
ALTER PUBLICATION supabase_realtime DROP TABLE public.projects;