-- 1. FIX: Restrict user_roles - block non-admin INSERT
CREATE POLICY "Block self role insertion"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2. FIX: Tighten browser-screenshots INSERT to match user folder
DROP POLICY IF EXISTS "Users can upload browser screenshots" ON storage.objects;
CREATE POLICY "Users can upload browser screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'browser-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. FIX: Make chat-uploads private and restrict SELECT to owner
-- First remove the public read policy
DROP POLICY IF EXISTS "Public read access for chat uploads" ON storage.objects;

-- Add authenticated-only SELECT scoped to user folder
CREATE POLICY "Users can read own chat uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-uploads';