import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { toast } from "sonner";

/** Uploads any number of files; each becomes a work in the gallery (or room), two at a time. */
export const useArtworkUploader = (opts: { galleryId?: string; roomId?: string | null; nextOrder: number; onDone: () => void }) => {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const upload = useCallback(
    async (files: File[]) => {
      if (!opts.galleryId || !files.length) return;
      setProgress({ done: 0, total: files.length });
      let done = 0;
      let failed = 0;
      const queue = files.map((f, i) => ({ f, i }));
      const worker = async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          try {
            const m = await uploadMedia(job.f);
            const { error } = await supabase.from("neo_artworks").insert({
              gallery_id: opts.galleryId!,
              room_id: opts.roomId ?? null,
              sort_order: opts.nextOrder + job.i,
              ...m,
            });
            if (error) throw error;
          } catch (e) {
            failed++;
            toast.error(`${job.f.name}: ${e instanceof Error ? e.message : "ההעלאה נכשלה"}`);
          }
          setProgress({ done: ++done, total: files.length });
        }
      };
      await Promise.all([worker(), worker()]);
      setProgress(null);
      if (files.length - failed > 0) toast.success(files.length - failed === 1 ? "היצירה נוספה" : `${files.length - failed} יצירות נוספו`);
      opts.onDone();
    },
    [opts],
  );

  const replace = useCallback(
    async (artworkId: string, file: File) => {
      try {
        const m = await uploadMedia(file);
        const { title: _t, ...rest } = m;
        const { error } = await supabase.from("neo_artworks").update(rest).eq("id", artworkId);
        if (error) throw error;
        toast.success("הקובץ הוחלף");
        opts.onDone();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ההעלאה נכשלה");
      }
    },
    [opts],
  );

  return { upload, replace, progress };
};
