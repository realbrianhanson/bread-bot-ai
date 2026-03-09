
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['task.completed', 'task.failed'],
  is_active boolean NOT NULL DEFAULT true,
  secret text,
  last_triggered_at timestamp with time zone,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhook endpoints"
  ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhook endpoints"
  ON public.webhook_endpoints FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook endpoints"
  ON public.webhook_endpoints FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook endpoints"
  ON public.webhook_endpoints FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
