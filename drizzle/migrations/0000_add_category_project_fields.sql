ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT '';