
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
     AND is_published = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_preview_views(uuid) TO anon, authenticated;

UPDATE public.tier_limits SET browser_tasks_per_month = 10 WHERE tier = 'free';
