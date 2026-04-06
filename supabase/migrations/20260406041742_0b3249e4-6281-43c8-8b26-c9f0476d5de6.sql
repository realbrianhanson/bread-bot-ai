
-- Drop existing table and recreate with new schema
DROP FUNCTION IF EXISTS public.increment_preview_views(text);
DROP TABLE IF EXISTS public.shared_previews;

CREATE TABLE public.shared_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id text NOT NULL UNIQUE DEFAULT substr(encode(gen_random_bytes(8), 'hex'), 1, 10),
  html_content text NOT NULL,
  title text DEFAULT 'Untitled Page',
  conversation_id text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  views integer DEFAULT 0
);

ALTER TABLE public.shared_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared previews" ON public.shared_previews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own previews" ON public.shared_previews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own previews" ON public.shared_previews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own previews" ON public.shared_previews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_shared_previews_share_id ON public.shared_previews(share_id);
CREATE INDEX idx_shared_previews_user_id ON public.shared_previews(user_id);
