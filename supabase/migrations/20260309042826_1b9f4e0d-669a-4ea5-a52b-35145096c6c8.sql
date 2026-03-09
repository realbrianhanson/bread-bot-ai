
CREATE TABLE public.scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  prompt text NOT NULL,
  cron_expression text NOT NULL DEFAULT '0 9 * * *',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  run_count integer NOT NULL DEFAULT 0,
  profile_id uuid REFERENCES public.browser_profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled tasks"
  ON public.scheduled_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled tasks"
  ON public.scheduled_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled tasks"
  ON public.scheduled_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled tasks"
  ON public.scheduled_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
