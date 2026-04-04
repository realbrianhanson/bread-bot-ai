
CREATE TABLE public.marketing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  icon text,
  marketing_md text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active marketing templates"
  ON public.marketing_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anon can view active marketing templates"
  ON public.marketing_templates
  FOR SELECT
  TO anon
  USING (is_active = true);
