-- Add the missing column
ALTER TABLE public.tier_limits ADD COLUMN code_executions_per_month integer NOT NULL DEFAULT 5;

-- Set per-tier values
UPDATE public.tier_limits SET code_executions_per_month = 5 WHERE tier = 'free';
UPDATE public.tier_limits SET code_executions_per_month = 25 WHERE tier = 'starter';
UPDATE public.tier_limits SET code_executions_per_month = 50 WHERE tier = 'pro';
UPDATE public.tier_limits SET code_executions_per_month = -1 WHERE tier = 'lifetime';