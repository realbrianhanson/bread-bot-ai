
ALTER TABLE public.shared_previews 
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS shared_previews_slug_unique ON public.shared_previews (slug) WHERE slug IS NOT NULL;

-- Allow anyone to read published pages by slug
CREATE POLICY "Anyone can view published pages"
ON public.shared_previews
FOR SELECT
TO anon
USING (is_published = true);
