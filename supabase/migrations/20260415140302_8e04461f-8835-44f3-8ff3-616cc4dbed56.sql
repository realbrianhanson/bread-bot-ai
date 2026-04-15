ALTER TABLE public.messages ADD COLUMN feedback text DEFAULT NULL;

COMMENT ON COLUMN public.messages.feedback IS 'User feedback on message: up, down, or null';