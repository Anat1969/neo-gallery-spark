import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { thumbUrl } from "@/lib/media";

/** Ctrl+K: jump to any gallery or work by name. */
const QuickSearch = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const { data } = useQuery({
    queryKey: ["quick-index"],
    queryFn: async () => {
      const [g, a] = await Promise.all([
        supabase.from("neo_galleries").select("id, name, slug, category"),
        supabase.from("neo_artworks").select("id, title, topic, image_url").order("created_at", { ascending: false }),
      ]);
      return { galleries: g.data ?? [], artworks: a.data ?? [] };
    },
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const go = (path: string) => {
    onOpenChange(false);
    setQ("");
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div dir="rtl">
        <CommandInput placeholder="שם של גלריה או יצירה..." value={q} onValueChange={setQ} />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>{data ? "לא נמצא" : "טוען..."}</CommandEmpty>
          <CommandGroup heading="גלריות">
            {(data?.galleries ?? []).map((g) => (
              <CommandItem key={g.id} value={`גלריה ${g.name} ${g.category}`} onSelect={() => go(`/gallery/${g.slug}`)}>
                <span className="flex-1">{g.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{g.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {q.length > 0 && (
            <CommandGroup heading="יצירות">
              {(data?.artworks ?? []).slice(0, 400).map((a) => (
                <CommandItem key={a.id} value={`${a.title} ${a.topic ?? ""} ${a.id}`} onSelect={() => go(`/artwork/${a.id}`)}>
                  {a.image_url ? <img src={thumbUrl(a.image_url, 64)} alt="" className="ml-3 h-8 w-8 rounded-sm object-cover" loading="lazy" /> : <span className="ml-3 h-8 w-8 rounded-sm bg-secondary" />}
                  <span className="flex-1 truncate">{a.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </div>
    </CommandDialog>
  );
};

export default QuickSearch;
