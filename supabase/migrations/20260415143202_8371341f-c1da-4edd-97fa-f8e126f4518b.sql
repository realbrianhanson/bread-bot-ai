
-- Create attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload to their own folder
CREATE POLICY "Users can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can view their own attachments
CREATE POLICY "Users can view own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
