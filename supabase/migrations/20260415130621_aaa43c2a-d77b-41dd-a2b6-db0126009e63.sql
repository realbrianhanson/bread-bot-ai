-- Enable realtime for the projects table so conversation list updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;