-- 1. Tighten admin policy on user_roles to only SELECT/UPDATE/DELETE (not INSERT for public role)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Re-create as separate policies so INSERT is more controlled
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Add UPDATE policy for browser-screenshots
CREATE POLICY "Users can update own screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'browser-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'browser-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);