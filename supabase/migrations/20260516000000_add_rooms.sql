-- Rooms table: sub-collections inside a gallery
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  cover_image text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, slug)
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms"
  ON public.rooms FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert rooms"
  ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update rooms"
  ON public.rooms FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rooms"
  ON public.rooms FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add room_id to artworks (nullable — artwork without room stays in gallery root)
ALTER TABLE public.artworks ADD COLUMN room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;
