
-- Enable RLS on realtime.messages (no-op if already enabled)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present so this migration is idempotent
DROP POLICY IF EXISTS "Authenticated users can read own task channel" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can write own task channel" ON realtime.messages;

-- Channel topics for task updates are expected to be of the form:
--   tasks:<task_uuid>            (preferred)
--   task:<task_uuid>             (legacy)
--   public:tasks:id=eq.<uuid>    (postgres_changes filter style)
-- We extract any uuid that appears in the topic and check ownership.
CREATE POLICY "Authenticated users can read own task channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow non-task topics through (other features); restrict task topics to owner.
  CASE
    WHEN realtime.topic() ~* 'tasks?[:/]' THEN EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.user_id = (SELECT auth.uid())
        AND (
          realtime.topic() = 'tasks:' || t.id::text
          OR realtime.topic() = 'task:' || t.id::text
          OR realtime.topic() LIKE '%' || t.id::text || '%'
        )
    )
    ELSE true
  END
);

CREATE POLICY "Authenticated users can write own task channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() ~* 'tasks?[:/]' THEN EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.user_id = (SELECT auth.uid())
        AND (
          realtime.topic() = 'tasks:' || t.id::text
          OR realtime.topic() = 'task:' || t.id::text
          OR realtime.topic() LIKE '%' || t.id::text || '%'
        )
    )
    ELSE true
  END
);
