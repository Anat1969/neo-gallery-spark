
-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
ON public.categories FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default categories
INSERT INTO public.categories (name, sort_order) VALUES
  ('אופנה', 0),
  ('פנים', 1),
  ('אדריכלות', 2),
  ('כלים', 3),
  ('אומנות', 4),
  ('פיסול', 5),
  ('צילום', 6)
ON CONFLICT (name) DO NOTHING;
