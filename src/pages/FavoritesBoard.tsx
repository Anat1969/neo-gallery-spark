import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import ArtworkWall, { type WallArtwork } from "@/components/media/ArtworkWall";
import ScreeningMode from "@/components/media/ScreeningMode";
import { toast } from "sonner";

/** The shared curated selection: Anat's picks across every gallery, as one wall. */
const FavoritesBoard = () => {
  const [screening, setScreening] = useState(false);
  const { data: works = [], isLoading } = useQuery({
    queryKey: ["favorites-board"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neo_favorites")
        .select("created_at, artwork:neo_artworks(id, title, topic, image_url, media_url, media_type, width, height, sort_order)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as { artwork: WallArtwork | null }[]).map((r) => r.artwork).filter(Boolean) as WallArtwork[];
    },
  });

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "נבחרות, ART-AI גלריה", url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("הקישור הועתק");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 md:px-8 lg:px-12" dir="rtl">
      <header className="mb-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">אוצרות</span>
          <h1 className="mt-1 text-4xl font-extralight tracking-tight md:text-6xl">נבחרות</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">העבודות שסומנו "לנבחרות" מכל הגלריות, בקיר אחד.</p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{works.length} עבודות</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={share} className="h-11 rounded-full border border-border px-5 text-sm hover:bg-secondary">שיתוף</button>
          {works.length > 0 && (
            <motion.button type="button" whileHover={{ scale: 1.03 }} onClick={() => setScreening(true)} className="h-11 rounded-full bg-foreground px-6 text-sm text-background shadow-deep">
              הקרנה
            </motion.button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {[280, 200, 340, 240].map((h, i) => <Skeleton key={i} className="mb-5 w-full" style={{ height: h }} />)}
        </div>
      ) : works.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">עדיין אין נבחרות. בכל יצירה יש "לנבחרות" בפינה.</p>
      ) : (
        <ArtworkWall artworks={works} editing={false} actions={[]} onReorder={() => undefined} onUpload={() => undefined} onReplaceMedia={() => undefined} />
      )}

      <AnimatePresence>{screening && <ScreeningMode artworks={works} title="נבחרות" onClose={() => setScreening(false)} />}</AnimatePresence>
    </div>
  );
};

export default FavoritesBoard;
