
-- Table for shareable preview links
CREATE TABLE public.shared_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  html_content text NOT NULL,
  title text DEFAULT 'Untitled Page',
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone DEFAULT now(),
  view_count integer DEFAULT 0
);

ALTER TABLE public.shared_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own previews" ON public.shared_previews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own previews" ON public.shared_previews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own previews" ON public.shared_previews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view by token" ON public.shared_previews
  FOR SELECT TO anon USING (expires_at > now());

CREATE INDEX idx_shared_previews_token ON public.shared_previews(token);
CREATE INDEX idx_shared_previews_user_id ON public.shared_previews(user_id);

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_preview_views(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE shared_previews SET view_count = view_count + 1 WHERE token = p_token;
$$;
