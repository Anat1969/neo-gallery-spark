import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ImageIcon, Pencil, Trash2, Plus } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";

interface Gallery {
  id: string;
  slug: string;
  name: string;
  category: string;
  coverImage: string;
  artworkCount: number;
}

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

// Mock data for development
const MOCK_GALLERIES: Gallery[] = [
  { id: "1", slug: "urban-dreams", name: "חלומות עירוניים", category: "אדריכלות", coverImage: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80", artworkCount: 12 },
  { id: "2", slug: "fabric-futures", name: "עתיד הבד", category: "אופנה", coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80", artworkCount: 8 },
  { id: "3", slug: "inner-spaces", name: "מרחבים פנימיים", category: "פנים", coverImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80", artworkCount: 15 },
  { id: "4", slug: "sculpted-light", name: "אור מפוסל", category: "פיסול", coverImage: "https://images.unsplash.com/photo-1544413164-5f1b361f5bfa?w=600&q=80", artworkCount: 6 },
  { id: "5", slug: "lens-poetry", name: "שירת העדשה", category: "צילום", coverImage: "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=600&q=80", artworkCount: 21 },
  { id: "6", slug: "tool-art", name: "אומנות הכלי", category: "כלים", coverImage: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80", artworkCount: 9 },
  { id: "7", slug: "raw-forms", name: "צורות גולמיות", category: "אומנות", coverImage: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&q=80", artworkCount: 17 },
  { id: "8", slug: "concrete-visions", name: "חזיונות בטון", category: "אדריכלות", coverImage: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=600&q=80", artworkCount: 11 },
];

type GalleryGridState = "loading" | "error" | "empty" | "loaded";

const GalleryGrid = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("הכל");

  // Simulate state — swap to test: "loading" | "error" | "empty" | "loaded"
  const [state] = useState<GalleryGridState>("loaded");

  const filtered =
    activeCategory === "הכל"
      ? MOCK_GALLERIES
      : MOCK_GALLERIES.filter((g) => g.category === activeCategory);

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
      {state === "loading" && (
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
      {state === "error" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא ניתן לטעון גלריות</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {/* Empty */}
      {state === "empty" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">עדיין אין גלריות — חזרי בקרוב</p>
        </div>
      )}

      {/* Loaded */}
      {state === "loaded" && (
        <div className="art-grid">
          {filtered.map((gallery) => (
            <button
              key={gallery.id}
              onClick={() => navigate(`/gallery/${gallery.slug}`)}
              className="group overflow-hidden rounded-lg border border-border bg-card text-right transition-all hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={gallery.coverImage}
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
      )}
    </div>
  );
};

export default GalleryGrid;
