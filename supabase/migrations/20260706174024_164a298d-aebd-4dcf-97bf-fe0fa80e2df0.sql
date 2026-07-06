
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_preview_id uuid NOT NULL REFERENCES public.shared_previews(id) ON DELETE CASCADE,
  domain text NOT NULL,
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_domains_domain_lower CHECK (domain = lower(domain)),
  CONSTRAINT custom_domains_domain_format CHECK (
    domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS custom_domains_domain_key ON public.custom_domains(domain);
CREATE INDEX IF NOT EXISTS custom_domains_user_id_idx ON public.custom_domains(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_domains TO authenticated;
GRANT SELECT ON public.custom_domains TO anon;  -- needed for public serve-page lookup by host
GRANT ALL ON public.custom_domains TO service_role;

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their domains"
  ON public.custom_domains FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all domains"
  ON public.custom_domains FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon may look up verified domains"
  ON public.custom_domains FOR SELECT
  TO anon
  USING (verified = true);

-- 5-domain per-user limit enforced by trigger
CREATE OR REPLACE FUNCTION public.enforce_custom_domain_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.custom_domains WHERE user_id = NEW.user_id;
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Custom domain limit reached (5 per user)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS custom_domains_limit ON public.custom_domains;
CREATE TRIGGER custom_domains_limit
  BEFORE INSERT ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION public.enforce_custom_domain_limit();
