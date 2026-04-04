ALTER TABLE public.design_templates ADD COLUMN IF NOT EXISTS marketing_md text;
ALTER TABLE public.design_templates ADD COLUMN IF NOT EXISTS source text DEFAULT 'seeded';