-- Drop the existing check constraint
ALTER TABLE tasks DROP CONSTRAINT tasks_task_type_check;

-- Add the updated check constraint with browser_automation included
ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check 
  CHECK (task_type = ANY (ARRAY['web_browsing'::text, 'code_generation'::text, 'file_processing'::text, 'automation'::text, 'browser_automation'::text]));