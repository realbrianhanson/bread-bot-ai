-- Consolidate user_roles INSERT policies: remove redundant block, tighten admin policy
DROP POLICY IF EXISTS "Block self role insertion" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Single INSERT policy: only admins, and cannot self-assign
CREATE POLICY "Admins can insert roles for others"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND user_id != auth.uid()
);