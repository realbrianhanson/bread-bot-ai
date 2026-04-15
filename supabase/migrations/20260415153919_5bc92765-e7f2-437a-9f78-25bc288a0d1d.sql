CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workflows"
ON public.workflows FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
ON public.workflows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
ON public.workflows FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
ON public.workflows FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();