-- Add missing DELETE policy for sandbox-outputs
CREATE POLICY "Users can delete their own sandbox outputs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sandbox-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add UPDATE policies for all three buckets
CREATE POLICY "Users can update their own sandbox outputs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sandbox-outputs' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'sandbox-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own generated files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-files' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'generated-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own chat files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);