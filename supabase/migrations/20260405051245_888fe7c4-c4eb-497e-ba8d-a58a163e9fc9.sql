
-- 1. Remove the dangerous INSERT policy on subscriptions that allows privilege escalation
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;

-- 2. Fix browser-screenshots storage SELECT policy to restrict by owner
DROP POLICY IF EXISTS "Users can view browser screenshots" ON storage.objects;
CREATE POLICY "Users can view own browser screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'browser-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Make browser-screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'browser-screenshots';

-- 4. Fix get_user_tier_and_usage to validate caller identity
CREATE OR REPLACE FUNCTION public.get_user_tier_and_usage(p_user_id uuid)
RETURNS TABLE(tier subscription_tier, chat_messages_used integer, browser_tasks_used integer, chat_messages_limit integer, browser_tasks_limit integer, can_use_own_keys boolean, code_executions_used integer, code_executions_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier subscription_tier;
  v_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Validate caller can only query their own data (or admin)
  IF p_user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT s.tier, COALESCE(s.current_period_start, date_trunc('month', now()))
  INTO v_tier, v_period_start
  FROM subscriptions s
  WHERE s.user_id = p_user_id;
  
  IF v_tier IS NULL THEN
    INSERT INTO subscriptions (user_id, tier)
    VALUES (p_user_id, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    v_tier := 'free';
    v_period_start := date_trunc('month', now());
  END IF;
  
  RETURN QUERY
  SELECT 
    v_tier,
    COALESCE((SELECT COUNT(*)::INTEGER FROM usage_tracking 
              WHERE user_id = p_user_id 
              AND usage_type = 'chat_message' 
              AND created_at >= v_period_start), 0),
    COALESCE((SELECT COUNT(*)::INTEGER FROM usage_tracking 
              WHERE user_id = p_user_id 
              AND usage_type = 'browser_task' 
              AND created_at >= v_period_start), 0),
    tl.chat_messages_per_month,
    tl.browser_tasks_per_month,
    (v_tier IN ('enterprise', 'lifetime')),
    COALESCE((SELECT COUNT(*)::INTEGER FROM usage_tracking 
              WHERE user_id = p_user_id 
              AND usage_type = 'code_execution' 
              AND created_at >= v_period_start), 0),
    tl.code_executions_per_month
  FROM tier_limits tl
  WHERE tl.tier = v_tier;
END;
$$;
