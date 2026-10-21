import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** One shared curated selection ("נבחרות"); editing is open, so no per-user lists. */
export const useFavorites = () => {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("neo_favorites").select("id, artwork_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isFavorite = useCallback((artworkId: string) => rows.some((r) => r.artwork_id === artworkId), [rows]);

  const toggle = useCallback(
    async (artworkId: string) => {
      const existing = rows.find((r) => r.artwork_id === artworkId);
      const { error } = existing
        ? await supabase.from("neo_favorites").delete().eq("id", existing.id)
        : await supabase.from("neo_favorites").insert({ artwork_id: artworkId });
      if (error) {
        toast.error("השמירה נכשלה");
        return;
      }
      toast.success(existing ? "הוסר מהנבחרות" : "נוסף לנבחרות");
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["favorites-board"] });
    },
    [rows, qc],
  );

  return { isFavorite, toggle };
};
