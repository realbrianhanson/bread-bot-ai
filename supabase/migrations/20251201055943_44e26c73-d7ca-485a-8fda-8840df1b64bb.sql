-- Create browser_profiles table for persistent login sessions
CREATE TABLE IF NOT EXISTS public.browser_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  browser_use_profile_id TEXT,
  description TEXT,
  sites TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT browser_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.browser_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for browser_profiles
CREATE POLICY "Users can view their own browser profiles"
  ON public.browser_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own browser profiles"
  ON public.browser_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own browser profiles"
  ON public.browser_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own browser profiles"
  ON public.browser_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_browser_profiles_user_id ON public.browser_profiles(user_id);
CREATE INDEX idx_browser_profiles_last_used ON public.browser_profiles(last_used_at DESC);