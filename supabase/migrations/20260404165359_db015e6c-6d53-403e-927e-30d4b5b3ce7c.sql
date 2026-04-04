UPDATE storage.buckets SET public = true WHERE id = 'chat-uploads';

CREATE POLICY "Public read access for chat uploads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-uploads');