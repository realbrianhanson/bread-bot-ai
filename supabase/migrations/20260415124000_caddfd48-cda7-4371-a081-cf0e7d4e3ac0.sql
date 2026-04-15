
-- Fix 1: Remove overly broad shared_previews SELECT policy
DROP POLICY IF EXISTS "Anyone can view shared previews" ON public.shared_previews;

-- Now only the "Anyone can view published pages" policy remains for anon,
-- and authenticated owners can see their own via existing owner policies.
-- Add a policy so authenticated users can also view published pages
CREATE POLICY "Authenticated users can view published pages"
ON public.shared_previews
FOR SELECT
TO authenticated
USING (is_published = true OR auth.uid() = user_id);

-- Fix 2: Prevent privilege escalation on user_roles
-- Drop existing INSERT policy and replace with a more restrictive one
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

-- Create a restrictive policy that prevents self-elevation
-- Only existing admins can insert roles, and they cannot assign admin to themselves
CREATE POLICY "Only admins can insert roles for others"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND user_id <> auth.uid()
);
