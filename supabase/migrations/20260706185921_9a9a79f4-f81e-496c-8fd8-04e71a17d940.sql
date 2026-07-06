ALTER TABLE public.tier_limits
  ADD COLUMN IF NOT EXISTS app_builds_per_month INTEGER NOT NULL DEFAULT 3;

UPDATE public.tier_limits SET app_builds_per_month = 3   WHERE tier = 'free';
UPDATE public.tier_limits SET app_builds_per_month = 50  WHERE tier = 'pro';
UPDATE public.tier_limits SET app_builds_per_month = 200 WHERE tier = 'enterprise';
UPDATE public.tier_limits SET app_builds_per_month = 500 WHERE tier = 'lifetime';

DROP FUNCTION IF EXISTS public.get_user_tier_and_usage(uuid);

CREATE OR REPLACE FUNCTION public.get_user_tier_and_usage(p_user_id uuid)
RETURNS TABLE(
  tier subscription_tier,
  chat_messages_used integer,
  browser_tasks_used integer,
  chat_messages_limit integer,
  browser_tasks_limit integer,
  can_use_own_keys boolean,
  code_executions_used integer,
  code_executions_limit integer,
  app_builds_used integer,
  app_builds_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier subscription_tier;
  v_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT s.tier, COALESCE(s.current_period_start, date_trunc('month', now()))
  INTO v_tier, v_period_start
  FROM subscriptions s WHERE s.user_id = p_user_id;

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
              WHERE user_id = p_user_id AND usage_type = 'chat_message'
              AND created_at >= v_period_start), 0),
    COALESCE((SELECT COUNT(*)::INTEGER FROM usage_tracking
              WHERE user_id = p_user_id AND usage_type = 'browser_task'
              AND created_at >= v_period_start), 0),
    tl.chat_messages_per_month,
    tl.browser_tasks_per_month,
    (v_tier IN ('enterprise', 'lifetime')),
    COALESCE((SELECT COUNT(*)::INTEGER FROM usage_tracking
              WHERE user_id = p_user_id AND usage_type = 'code_execution'
              AND created_at >= v_period_start), 0),
    tl.code_executions_per_month,
    COALESCE((SELECT COUNT(*)::INTEGER FROM usage_tracking
              WHERE user_id = p_user_id AND usage_type = 'app_build'
              AND created_at >= v_period_start), 0),
    tl.app_builds_per_month
  FROM tier_limits tl WHERE tl.tier = v_tier;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  p_user_id uuid,
  p_usage_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier subscription_tier;
  v_period_start timestamptz;
  v_limit int;
  v_used int;
BEGIN
  SELECT s.tier, COALESCE(s.current_period_start, date_trunc('month', now()))
  INTO v_tier, v_period_start
  FROM subscriptions s WHERE s.user_id = p_user_id;

  IF v_tier IS NULL THEN
    INSERT INTO subscriptions (user_id, tier)
      VALUES (p_user_id, 'free')
      ON CONFLICT (user_id) DO NOTHING;
    v_tier := 'free';
    v_period_start := date_trunc('month', now());
  END IF;

  SELECT CASE p_usage_type
    WHEN 'chat_message'   THEN tl.chat_messages_per_month
    WHEN 'browser_task'   THEN tl.browser_tasks_per_month
    WHEN 'code_execution' THEN tl.code_executions_per_month
    WHEN 'app_build'      THEN tl.app_builds_per_month
    ELSE 0
  END
  INTO v_limit
  FROM tier_limits tl WHERE tl.tier = v_tier;

  IF v_limit IS NULL THEN
    v_limit := 0;
  END IF;

  SELECT COUNT(*)::int INTO v_used
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND usage_type = p_usage_type
    AND created_at >= v_period_start;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', v_used, 'limit', v_limit, 'tier', v_tier);
  END IF;

  INSERT INTO usage_tracking (user_id, usage_type, quantity)
    VALUES (p_user_id, p_usage_type, 1);

  RETURN jsonb_build_object('allowed', true, 'used', v_used + 1, 'limit', v_limit, 'tier', v_tier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_usage(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tier_and_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tier_and_usage(uuid) TO service_role;