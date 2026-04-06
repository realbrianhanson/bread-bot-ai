
-- Create user-images storage bucket (public for persistent URLs in generated code)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-images', 'user-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: owner can upload to their own folder
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can view (public bucket for use in generated pages)
CREATE POLICY "Anyone can view user images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'user-images');

-- RLS: owner can delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);
