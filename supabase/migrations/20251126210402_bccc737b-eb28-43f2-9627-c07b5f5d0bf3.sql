-- Add new subscription tiers to enum
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'lifetime';

-- Add can_use_own_keys column to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS can_use_own_keys BOOLEAN DEFAULT false;