
CREATE TABLE public.knowledge_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_urls TEXT[],
  source_task_id UUID,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge" ON public.knowledge_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge" ON public.knowledge_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge" ON public.knowledge_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge" ON public.knowledge_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX knowledge_entries_user_topic ON public.knowledge_entries (user_id, topic);

CREATE INDEX knowledge_entries_search ON public.knowledge_entries
  USING gin(to_tsvector('english', topic || ' ' || title || ' ' || content));
