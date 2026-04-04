INSERT INTO storage.buckets (id, name, public) VALUES ('sandbox-outputs', 'sandbox-outputs', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload sandbox outputs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sandbox-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their sandbox outputs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sandbox-outputs' AND (storage.foldername(name))[1] = auth.uid()::text);