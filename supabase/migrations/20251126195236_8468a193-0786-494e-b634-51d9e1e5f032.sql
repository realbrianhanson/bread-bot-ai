-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create tier limits table
CREATE TABLE public.tier_limits (
  tier subscription_tier PRIMARY KEY,
  chat_messages_per_month INTEGER NOT NULL,
  browser_tasks_per_month INTEGER NOT NULL,
  price_monthly_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb
);

-- Insert default tier limits
INSERT INTO public.tier_limits (tier, chat_messages_per_month, browser_tasks_per_month, price_monthly_cents, features) VALUES
('free', 100, 10, 0, '["100 chat messages/month", "10 browser tasks/month", "Shared API keys", "Community support"]'::jsonb),
('pro', 5000, 100, 2900, '["5,000 chat messages/month", "100 browser tasks/month", "Shared API keys", "Priority support", "Advanced analytics"]'::jsonb),
('enterprise', -1, -1, 9900, '["Unlimited chat messages", "Unlimited browser tasks", "Bring Your Own API Keys", "Dedicated support", "Custom integrations", "SLA guarantee"]'::jsonb);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for tier_limits (read-only for all authenticated users)
CREATE POLICY "Anyone can view tier limits"
ON public.tier_limits
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create function to get user's current tier and usage
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
  -- Get user's tier and period start
  SELECT s.tier, COALESCE(s.current_period_start, date_trunc('month', now()))
  INTO v_tier, v_period_start
  FROM subscriptions s
  WHERE s.user_id = p_user_id;
  
  -- If no subscription exists, create free tier
  IF v_tier IS NULL THEN
    INSERT INTO subscriptions (user_id, tier)
    VALUES (p_user_id, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    v_tier := 'free';
    v_period_start := date_trunc('month', now());
  END IF;
  
  -- Get usage counts for current period
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
    (v_tier = 'enterprise')
  FROM tier_limits tl
  WHERE tl.tier = v_tier;
END;
$$;