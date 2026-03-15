import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, ImageIcon, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";

interface Artwork {
  id: string;
  title: string;
  topic: string;
  image: string;
}

interface GalleryData {
  name: string;
  description: string;
  category: string;
  artworks: Artwork[];
}

const MOCK_GALLERIES: Record<string, GalleryData> = {
  "urban-dreams": {
    name: "חלומות עירוניים",
    description: "סדרת עבודות המתארות חזיונות אדריכליים עתידניים בנוף העירוני. שילוב בין בטון, אור טבעי וצורות אורגניות.",
    category: "אדריכלות",
    artworks: [
      { id: "1", title: "מגדל הרוח", topic: "אדריכלות עתידנית", image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80" },
      { id: "2", title: "גשר הזכוכית", topic: "תשתיות", image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=600&q=80" },
      { id: "3", title: "חצר הצללים", topic: "מרחב ציבורי", image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&q=80" },
      { id: "4", title: "קיר הנשימה", topic: "חזית בניין", image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80" },
      { id: "5", title: "מדרגות האור", topic: "פנים", image: "https://images.unsplash.com/photo-1496307653780-42ee777d4833?w=600&q=80" },
      { id: "6", title: "כיפת השמיים", topic: "גג ירוק", image: "https://images.unsplash.com/photo-1439337153520-7082a56a81f4?w=600&q=80" },
    ],
  },
};

const DEFAULT_GALLERY: GalleryData = {
  name: "גלריה",
  description: "תיאור הגלריה יופיע כאן.",
  category: "אומנות",
  artworks: [
    { id: "1", title: "יצירה ראשונה", topic: "נושא", image: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&q=80" },
    { id: "2", title: "יצירה שנייה", topic: "נושא", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80" },
    { id: "3", title: "יצירה שלישית", topic: "נושא", image: "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=600&q=80" },
  ],
};

type RoomState = "loading" | "error" | "empty" | "loaded";

const GalleryRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state] = useState<RoomState>("loaded");

  const gallery = MOCK_GALLERIES[id ?? ""] ?? DEFAULT_GALLERY;

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה לגלריות
      </Button>

      {/* Header */}
      {state === "loaded" && (
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">{gallery.name}</h1>
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {gallery.category}
            </span>
          </div>
          <p className="text-muted-foreground max-w-2xl mb-1">{gallery.description}</p>
          <p className="text-sm text-muted-foreground">{gallery.artworks.length} עבודות</p>
        </header>
      )}

      {/* Loading */}
      {state === "loading" && (
        <>
          <div className="mb-8 space-y-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg bg-card">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא ניתן לטעון את הגלריה</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {/* Empty */}
      {state === "empty" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">הגלריה ריקה — יצירות יתווספו בקרוב</p>
        </div>
      )}

      {/* Artwork Grid */}
      {state === "loaded" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gallery.artworks.map((artwork) => (
            <button
              key={artwork.id}
              onClick={() => navigate(`/artwork/${artwork.id}`)}
              className="group overflow-hidden rounded-lg border border-border bg-card text-right transition-all hover:border-primary/40 hover:shadow-[0_0_20px_hsl(76_90%_61%/0.1)]"
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={artwork.image}
                  alt={artwork.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-foreground">{artwork.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground truncate">{artwork.topic}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GalleryRoom;
