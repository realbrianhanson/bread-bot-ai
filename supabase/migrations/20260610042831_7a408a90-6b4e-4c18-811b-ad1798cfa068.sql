-- Re-enable realtime on public.tasks.
-- Safe: "Users can view their own tasks" RLS policy (auth.uid() = user_id)
-- means realtime only delivers change events to the row owner.
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;