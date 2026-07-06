-- SECURITY DEFINER RPC for anonymous view counter increments
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
     AND is_published = true;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_page_views(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_page_views(text) TO anon, authenticated;

-- Legacy api_keys rows were encrypted with the service-role-key derivation, which is being replaced
-- by a dedicated ENCRYPTION_KEY. Since consumers used them incorrectly (as plaintext) they were already broken.
-- Delete existing rows so users can re-enter them under the new encryption scheme.
DELETE FROM public.api_keys;
