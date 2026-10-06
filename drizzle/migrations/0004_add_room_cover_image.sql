ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT SELECT ON public.rooms TO anon;