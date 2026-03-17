ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check 
  CHECK (task_type = ANY (ARRAY['web_browsing'::text, 'code_generation'::text, 'file_processing'::text, 'automation'::text, 'browser_automation'::text, 'scheduled_browser_automation'::text]));