-- Idempotency table for Stripe webhooks
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_events TO service_role;

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- No policies; service_role only (via edge functions). Deny-all for other roles.

-- Allow anonymous visitors to read tier_limits so the public /pricing page can
-- fetch stripe_price_id and pricing info without requiring auth.
DROP POLICY IF EXISTS "Public can view tier limits" ON public.tier_limits;
CREATE POLICY "Public can view tier limits"
  ON public.tier_limits
  FOR SELECT
  TO anon
  USING (true);

GRANT SELECT ON public.tier_limits TO anon;

-- Atomic quota check-and-increment RPC.
-- Reads usage in the current billing period and, only if under limit, inserts
-- a usage_tracking row in the same transaction. Returns JSON with allowed/used/limit.
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
    RETURN jsonb_build_object(
      'allowed', false,
      'used', v_used,
      'limit', v_limit,
      'tier', v_tier
    );
  END IF;

  INSERT INTO usage_tracking (user_id, usage_type, quantity)
    VALUES (p_user_id, p_usage_type, 1);

  RETURN jsonb_build_object(
    'allowed', true,
    'used', v_used + 1,
    'limit', v_limit,
    'tier', v_tier
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_usage(uuid, text) TO service_role;

-- Simple per-user rate limit helper used by the anthropic-proxy.
-- Counts usage_tracking rows for the given user & usage_type within the last
-- p_window_seconds, then (if under limit) inserts one. Atomic per transaction.
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_usage_type text,
  p_limit int,
  p_window_seconds int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used int;
BEGIN
  SELECT COUNT(*)::int INTO v_used
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND usage_type = p_usage_type
    AND created_at >= now() - (p_window_seconds || ' seconds')::interval;

  IF v_used >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', v_used, 'limit', p_limit);
  END IF;

  INSERT INTO usage_tracking (user_id, usage_type, quantity)
    VALUES (p_user_id, p_usage_type, 1);

  RETURN jsonb_build_object('allowed', true, 'used', v_used + 1, 'limit', p_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, int, int) TO service_role;