
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-files', 'generated-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own generated files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own generated files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own generated files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generated-files' AND (storage.foldername(name))[1] = auth.uid()::text);
