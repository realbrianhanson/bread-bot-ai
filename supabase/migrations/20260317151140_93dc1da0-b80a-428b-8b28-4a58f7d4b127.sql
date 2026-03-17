CREATE OR REPLACE FUNCTION public.get_user_tier_and_usage(p_user_id UUID)
RETURNS TABLE (
  tier subscription_tier,
  chat_messages_used INTEGER,
  browser_tasks_used INTEGER,
  chat_messages_limit INTEGER,
  browser_tasks_limit INTEGER,
  can_use_own_keys BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier subscription_tier;
  v_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
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
    (v_tier IN ('enterprise', 'lifetime'))
  FROM tier_limits tl
  WHERE tl.tier = v_tier;
END;
$$;