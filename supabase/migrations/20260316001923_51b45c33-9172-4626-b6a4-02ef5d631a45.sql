
-- Galleries table
CREATE TABLE public.galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  category text NOT NULL,
  cover_image text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

-- Public can read galleries
CREATE POLICY "Anyone can read galleries"
  ON public.galleries FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can insert galleries
CREATE POLICY "Admins can insert galleries"
  ON public.galleries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update galleries
CREATE POLICY "Admins can update galleries"
  ON public.galleries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete galleries
CREATE POLICY "Admins can delete galleries"
  ON public.galleries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Artworks table
CREATE TABLE public.artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text DEFAULT '',
  post text DEFAULT '',
  image_url text DEFAULT '',
  tags text[] DEFAULT '{}',
  style text DEFAULT '',
  concept text DEFAULT '',
  year integer DEFAULT extract(year from now())::integer,
  inspiration_url text DEFAULT '',
  inspiration_label text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

-- Public can read artworks
CREATE POLICY "Anyone can read artworks"
  ON public.artworks FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can insert artworks
CREATE POLICY "Admins can insert artworks"
  ON public.artworks FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update artworks
CREATE POLICY "Admins can update artworks"
  ON public.artworks FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete artworks
CREATE POLICY "Admins can delete artworks"
  ON public.artworks FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for artwork images
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-images', 'artwork-images', true);

-- Anyone can read artwork images
CREATE POLICY "Anyone can read artwork images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'artwork-images');

-- Admins can upload artwork images
CREATE POLICY "Admins can upload artwork images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'artwork-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins can update artwork images
CREATE POLICY "Admins can update artwork images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'artwork-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete artwork images
CREATE POLICY "Admins can delete artwork images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'artwork-images' AND public.has_role(auth.uid(), 'admin'));
