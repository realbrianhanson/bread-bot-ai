
-- Atomic usage counter table (replaces the TOCTOU race in check_and_increment_usage).
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  usage_type text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start, usage_type)
);
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
-- No user policies: only SECURITY DEFINER functions touch this table.

-- Backfill from usage_tracking for the current period so nobody's usage resets.
INSERT INTO public.usage_counters (user_id, period_start, usage_type, count)
SELECT
  ut.user_id,
  COALESCE(s.current_period_start, date_trunc('month', now())) AS period_start,
  ut.usage_type,
  COUNT(*)::int
FROM public.usage_tracking ut
LEFT JOIN public.subscriptions s ON s.user_id = ut.user_id
WHERE ut.created_at >= COALESCE(s.current_period_start, date_trunc('month', now()))
GROUP BY ut.user_id, s.current_period_start, ut.usage_type
ON CONFLICT (user_id, period_start, usage_type) DO NOTHING;

-- Genuinely atomic check-and-increment.
-- Same signature as before so callers don't change.
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(p_user_id uuid, p_usage_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier subscription_tier;
  v_period_start timestamptz;
  v_limit int;
  v_new_count int;
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

  IF v_limit IS NULL THEN v_limit := 0; END IF;

  -- Atomic bump: only increment when strictly under the limit.
  -- The WHERE on the DO UPDATE branch makes concurrent requests at the boundary
  -- serializable: PostgreSQL evaluates it against the locked row, so exactly
  -- v_limit total increments succeed.
  INSERT INTO public.usage_counters (user_id, period_start, usage_type, count)
    VALUES (p_user_id, v_period_start, p_usage_type, 1)
  ON CONFLICT (user_id, period_start, usage_type)
  DO UPDATE SET
    count = public.usage_counters.count + 1,
    updated_at = now()
  WHERE public.usage_counters.count < v_limit
  RETURNING count INTO v_new_count;

  IF v_new_count IS NULL THEN
    -- Over the limit: read current value for the response payload.
    SELECT count INTO v_new_count
      FROM public.usage_counters
     WHERE user_id = p_user_id
       AND period_start = v_period_start
       AND usage_type = p_usage_type;
    RETURN jsonb_build_object(
      'allowed', false,
      'used', COALESCE(v_new_count, v_limit),
      'limit', v_limit,
      'tier', v_tier
    );
  END IF;

  -- Keep usage_tracking for auditing / analytics dashboards.
  INSERT INTO public.usage_tracking (user_id, usage_type, quantity)
    VALUES (p_user_id, p_usage_type, 1);

  RETURN jsonb_build_object(
    'allowed', true,
    'used', v_new_count,
    'limit', v_limit,
    'tier', v_tier
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_usage(uuid, text) TO service_role, authenticated;

-- E2B sandbox ownership: prevents one user from targeting another user's live sandbox
-- by passing sandboxId to execute-code.
CREATE TABLE IF NOT EXISTS public.code_sandboxes (
  sandbox_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.code_sandboxes TO authenticated;
GRANT ALL ON public.code_sandboxes TO service_role;
ALTER TABLE public.code_sandboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sandboxes"
  ON public.code_sandboxes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Persisted OAuth state nonces for CSRF validation on OAuth callbacks.
CREATE TABLE IF NOT EXISTS public.oauth_states (
  nonce text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
GRANT ALL ON public.oauth_states TO service_role;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- No user policies: only SECURITY DEFINER / service_role touches this table.
