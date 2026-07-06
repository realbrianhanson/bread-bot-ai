
-- 1. form_key generator
CREATE OR REPLACE FUNCTION public.gen_form_key()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'fk_' || encode(extensions.gen_random_bytes(12), 'hex')
$$;

-- 2. Columns on published_apps
ALTER TABLE public.published_apps
  ADD COLUMN IF NOT EXISTS form_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS forward_url text;
UPDATE public.published_apps SET form_key = public.gen_form_key() WHERE form_key IS NULL;
ALTER TABLE public.published_apps ALTER COLUMN form_key SET NOT NULL;
ALTER TABLE public.published_apps ALTER COLUMN form_key SET DEFAULT public.gen_form_key();

-- 3. Columns on shared_previews
ALTER TABLE public.shared_previews
  ADD COLUMN IF NOT EXISTS form_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS forward_url text;
UPDATE public.shared_previews SET form_key = public.gen_form_key() WHERE form_key IS NULL;
ALTER TABLE public.shared_previews ALTER COLUMN form_key SET NOT NULL;
ALTER TABLE public.shared_previews ALTER COLUMN form_key SET DEFAULT public.gen_form_key();

-- 4. tier_limits column
ALTER TABLE public.tier_limits
  ADD COLUMN IF NOT EXISTS form_submissions_per_month integer NOT NULL DEFAULT 100;
UPDATE public.tier_limits SET form_submissions_per_month =
  CASE tier::text
    WHEN 'free' THEN 100
    WHEN 'pro' THEN 5000
    WHEN 'enterprise' THEN 25000
    WHEN 'lifetime' THEN 25000
    ELSE 100
  END;

-- 5. form_submissions table
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('app','page')),
  source_id uuid NOT NULL,
  form_name text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  forwarded_status text NOT NULL DEFAULT 'none' CHECK (forwarded_status IN ('none','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_submissions_user_idx ON public.form_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS form_submissions_source_idx ON public.form_submissions(source_type, source_id, created_at DESC);

GRANT SELECT, DELETE ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own form submissions"
  ON public.form_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete own form submissions"
  ON public.form_submissions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
