ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT '';

GRANT SELECT ON public.galleries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.galleries TO authenticated;
GRANT ALL ON public.galleries TO service_role;