-- Add expires_at with 7-day default and backfill existing rows
ALTER TABLE public.shared_previews
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.shared_previews
SET expires_at = COALESCE(expires_at, GREATEST(created_at, now()) + INTERVAL '7 days')
WHERE expires_at IS NULL;

ALTER TABLE public.shared_previews
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '7 days');

-- Extend expiry when the owner updates the preview
CREATE OR REPLACE FUNCTION public.bump_shared_preview_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.html_content IS DISTINCT FROM OLD.html_content
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.is_published IS DISTINCT FROM OLD.is_published THEN
    NEW.expires_at := now() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shared_previews_bump_expiry ON public.shared_previews;
CREATE TRIGGER shared_previews_bump_expiry
BEFORE UPDATE ON public.shared_previews
FOR EACH ROW EXECUTE FUNCTION public.bump_shared_preview_expiry();

-- Only serve non-expired previews to anonymous readers
DROP POLICY IF EXISTS "Anon can read published previews" ON public.shared_previews;
CREATE POLICY "Anon can read published previews"
  ON public.shared_previews
  FOR SELECT
  TO anon
  USING (is_published = true AND expires_at > now());

DROP POLICY IF EXISTS "Anon can read shared previews" ON public.shared_previews;
CREATE POLICY "Anon can read shared previews"
  ON public.shared_previews
  FOR SELECT
  TO anon
  USING (share_id IS NOT NULL AND expires_at > now());

-- Also gate the view-increment RPCs so expired links do not accrue views
CREATE OR REPLACE FUNCTION public.increment_preview_views(p_share_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_previews
     SET views = COALESCE(views, 0) + 1
   WHERE share_id = p_share_id
     AND is_published = true
     AND expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_page_views(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_previews
     SET views = COALESCE(views, 0) + 1
   WHERE slug = p_slug
     AND is_published = true
     AND expires_at > now();
END;
$$;