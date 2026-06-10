CREATE POLICY "Users can read own build snapshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-builds' AND auth.uid()::text = (storage.foldername(name))[1]);