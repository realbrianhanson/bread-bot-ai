-- Fix 1: Tighten user_roles INSERT policy to prevent privilege escalation
-- Drop the existing permissive INSERT policy and replace with a restrictive one
DROP POLICY IF EXISTS "Admins can insert roles for others" ON public.user_roles;

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Fix browser-screenshots SELECT policy to use authenticated role only
DROP POLICY IF EXISTS "Users can view own browser screenshots" ON storage.objects;

CREATE POLICY "Users can view own browser screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'browser-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 3: Add missing DELETE policy for tasks table
CREATE POLICY "Users can delete their own tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix 4: Add missing DELETE policy for profiles table
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);