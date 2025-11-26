-- Create storage bucket for browser task screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('browser-screenshots', 'browser-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view screenshots
CREATE POLICY "Users can view browser screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'browser-screenshots' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to upload their own screenshots
CREATE POLICY "Users can upload browser screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'browser-screenshots' AND auth.uid() IS NOT NULL);