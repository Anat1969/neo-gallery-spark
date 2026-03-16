import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ImageIcon, Pencil, Trash2, Plus } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";

const CATEGORIES = [
  "הכל",
  "אופנה",
  "פנים",
  "אדריכלות",
  "כלים",
  "אומנות",
  "פיסול",
  "צילום",
] as const;

const GalleryGrid = () => {
  const navigate = useNavigate();
  const { isEditMode } = useEditMode();
  const [activeCategory, setActiveCategory] = useState<string>("הכל");

  const { data: galleries = [], isLoading, isError } = useQuery({
    queryKey: ["galleries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("*, artworks(count)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map((g: any) => ({
        ...g,
        artworkCount: g.artworks?.[0]?.count ?? 0,
      }));
    },
  });

  const filtered =
    activeCategory === "הכל"
      ? galleries
      : galleries.filter((g: any) => g.category === activeCategory);

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      {/* Category Filter */}
      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="art-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-card">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא ניתן לטעון גלריות</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && galleries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">עדיין אין גלריות — חזרי בקרוב</p>
        </div>
      )}

      {/* Loaded */}
      {!isLoading && !isError && galleries.length > 0 && (
        <>
          {isEditMode && (
            <div className="mb-4 flex justify-end">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                גלריה חדשה
              </Button>
            </div>
          )}
          <div className="art-grid">
            {filtered.map((gallery: any) => (
              <button
                key={gallery.id}
                onClick={() => navigate(`/gallery/${gallery.slug}`)}
                className="group relative overflow-hidden rounded-lg border border-border bg-card text-right transition-all hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
              >
                {isEditMode && (
                  <div className="absolute right-2 top-2 z-10 flex gap-1">
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                )}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={gallery.cover_image}
                    alt={gallery.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {gallery.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-foreground">{gallery.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{gallery.artworkCount} עבודות</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GalleryGrid;
