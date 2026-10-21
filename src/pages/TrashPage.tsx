import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { thumbUrl } from "@/lib/media";
import { toast } from "sonner";

const KIND: Record<string, string> = {
  neo_artworks: "יצירה",
  neo_galleries: "גלריה",
  neo_rooms: "חדר",
  neo_categories: "קטגוריה",
};

type TrashRow = { id: number; table_name: string; row_id: string; row_data: Record<string, unknown>; deleted_at: string };

/** Editing is open to everyone, so every deletion lands here and can be put back in one click. */
const TrashPage = () => {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["trash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("neo_trash" as never).select("*").order("deleted_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as TrashRow[];
    },
    staleTime: 0,
  });

  const restore = async (r: TrashRow) => {
    const { error } = await supabase.from(r.table_name as "neo_artworks").upsert(r.row_data as never);
    if (error) {
      toast.error(/foreign key/i.test(error.message) ? "צריך קודם לשחזר את הגלריה או החדר שהפריט היה בהם" : error.message);
      return;
    }
    toast.success(`${KIND[r.table_name] ?? "פריט"} שוחזר`);
    qc.invalidateQueries();
  };

  return (
    <div className="min-h-screen px-4 py-10 md:px-8 lg:px-12" dir="rtl">
      <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">ניהול</span>
      <h1 className="mt-1 text-4xl font-extralight tracking-tight md:text-6xl">סל מחזור</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">כל מה שנמחק נשמר כאן. שחזור מחזיר את הפריט בדיוק כפי שהיה.</p>

      <div className="mt-10 grid gap-3">
        {isLoading && <p className="font-mono text-xs text-muted-foreground">טוען...</p>}
        {!isLoading && rows.length === 0 && <p className="text-muted-foreground">הסל ריק.</p>}
        {rows.map((r, i) => {
          const d = r.row_data as { title?: string; name?: string; image_url?: string; cover_image?: string };
          const pic = d.image_url || d.cover_image;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.03 }}
              className="flex items-center gap-4 rounded-md border border-border/70 bg-card p-3 shadow-deep"
            >
              {pic ? <img src={thumbUrl(pic, 96)} alt="" className="h-12 w-12 rounded-sm object-cover" loading="lazy" /> : <span className="h-12 w-12 rounded-sm bg-secondary" />}
              <div className="min-w-0 flex-1">
                <p className="truncate">{d.title || d.name || "ללא שם"}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {KIND[r.table_name] ?? r.table_name} · נמחק {new Date(r.deleted_at).toLocaleString("he-IL")}
                </p>
              </div>
              <button type="button" onClick={() => restore(r)} className="h-9 min-h-0 rounded-full border border-border px-4 text-sm hover:bg-secondary">
                שחזור
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TrashPage;
