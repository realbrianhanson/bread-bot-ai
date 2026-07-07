-- Restrict anon column access on shared_previews (hide forward_url and form_key)
REVOKE SELECT ON public.shared_previews FROM anon;
GRANT SELECT (id, slug, title, html_content, views, is_published, created_at, share_id, user_id) ON public.shared_previews TO anon;

-- Drop anon lookup policy on custom_domains (exposes verification_token)
DROP POLICY IF EXISTS "Anon may look up verified domains" ON public.custom_domains;