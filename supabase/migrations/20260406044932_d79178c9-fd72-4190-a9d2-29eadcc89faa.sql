
-- 1. Remove subscription self-insert policy (privilege escalation risk)
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;

-- 2. Make browser-screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'browser-screenshots';

-- 3. Fix browser-screenshots storage SELECT policy to be owner-scoped
DROP POLICY IF EXISTS "Users can view browser screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own browser screenshots" ON storage.objects;
CREATE POLICY "Users can view own browser screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'browser-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
