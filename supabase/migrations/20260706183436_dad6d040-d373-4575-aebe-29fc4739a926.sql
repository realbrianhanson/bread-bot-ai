
-- 1) published_apps
CREATE TABLE public.published_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  storage_prefix TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_apps TO authenticated;
GRANT ALL ON public.published_apps TO service_role;

ALTER TABLE public.published_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own published apps"
  ON public.published_apps FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert their own published apps"
  ON public.published_apps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their own published apps"
  ON public.published_apps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete their own published apps"
  ON public.published_apps FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX published_apps_user_idx ON public.published_apps(user_id);
CREATE INDEX published_apps_slug_idx ON public.published_apps(slug) WHERE is_published;

CREATE TRIGGER published_apps_updated_at
  BEFORE UPDATE ON public.published_apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2) custom_domains: allow pointing to a published_app instead of a shared_preview
ALTER TABLE public.custom_domains
  ADD COLUMN IF NOT EXISTS published_app_id UUID REFERENCES public.published_apps(id) ON DELETE CASCADE;

-- Drop old NOT NULL on shared_preview_id if it exists
ALTER TABLE public.custom_domains ALTER COLUMN shared_preview_id DROP NOT NULL;

-- Exactly one of shared_preview_id or published_app_id must be set
ALTER TABLE public.custom_domains
  DROP CONSTRAINT IF EXISTS custom_domains_target_exactly_one;
ALTER TABLE public.custom_domains
  ADD CONSTRAINT custom_domains_target_exactly_one
  CHECK ((shared_preview_id IS NOT NULL)::int + (published_app_id IS NOT NULL)::int = 1);

CREATE INDEX IF NOT EXISTS custom_domains_published_app_idx ON public.custom_domains(published_app_id);
