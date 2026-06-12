ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_type_check CHECK (task_type = ANY (ARRAY['web_browsing'::text, 'code_generation'::text, 'file_processing'::text, 'automation'::text, 'browser_automation'::text, 'scheduled_browser_automation'::text, 'app_build'::text]));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status = ANY (ARRAY['pending'::text, 'running'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'stopped'::text, 'initializing'::text]));