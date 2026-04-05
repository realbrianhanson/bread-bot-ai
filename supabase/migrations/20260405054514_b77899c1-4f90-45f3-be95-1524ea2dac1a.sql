-- 1. CRITICAL: Remove user self-UPDATE on subscriptions (privilege escalation)
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- 2. Add DELETE policy for browser-screenshots bucket
CREATE POLICY "Users can delete own screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'browser-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Explicitly deny client INSERT/DELETE on usage_tracking
-- (No INSERT policy exists, but let's be explicit by ensuring none can be added accidentally)
-- We'll add a restrictive INSERT policy that only service_role can use
CREATE POLICY "Only service role can insert usage"
ON public.usage_tracking FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Only service role can delete usage"
ON public.usage_tracking FOR DELETE
TO authenticated
USING (false);