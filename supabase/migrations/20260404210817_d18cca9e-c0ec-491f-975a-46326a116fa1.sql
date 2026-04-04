
-- Create design_templates table
CREATE TABLE public.design_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  design_md TEXT NOT NULL,
  preview_colors TEXT[],
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can see active global templates + their own
CREATE POLICY "Anyone can view active templates"
  ON public.design_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true AND (user_id IS NULL OR user_id = auth.uid()));

-- Allow anon to see global templates too (for unauthenticated preview)
CREATE POLICY "Anon can view global active templates"
  ON public.design_templates
  FOR SELECT
  TO anon
  USING (is_active = true AND user_id IS NULL);

-- Users can manage their own custom templates
CREATE POLICY "Users can insert own templates"
  ON public.design_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.design_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.design_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
