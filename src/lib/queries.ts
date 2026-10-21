import { supabase } from "@/integrations/supabase/client";

// Shared fetchers so pages and hover-prefetch use identical queries (one cache entry each).

export const galleryKey = (slug?: string) => ["gallery", slug] as const;
export const fetchGallery = async (slug: string) => {
  const { data, error } = await supabase.from("neo_galleries").select("*").eq("slug", slug).single();
  if (error) throw error;
  return data;
};

export const rootArtworksKey = (galleryId?: string) => ["artworks", galleryId] as const;
export const fetchRootArtworks = async (galleryId: string) => {
  const { data, error } = await supabase
    .from("neo_artworks")
    .select("*")
    .eq("gallery_id", galleryId)
    .is("room_id", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
};
