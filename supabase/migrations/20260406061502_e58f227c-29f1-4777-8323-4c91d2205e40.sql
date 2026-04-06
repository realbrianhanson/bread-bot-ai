
CREATE TABLE public.task_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  query TEXT,
  results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results" ON public.task_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results" ON public.task_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own results" ON public.task_results
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_task_results_user_created ON public.task_results (user_id, created_at DESC);
