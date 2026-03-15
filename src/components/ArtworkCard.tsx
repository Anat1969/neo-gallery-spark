import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ShareExport from "@/components/ShareExport";
import {
  ArrowRight,
  Heart,
  ExternalLink,
  ImageIcon,
  X,
} from "lucide-react";

interface ArtworkData {
  id: string;
  title: string;
  topic: string;
  post: string;
  tags: string[];
  style: string;
  concept: string;
  year: number;
  image: string;
  inspirationUrl?: string;
  inspirationLabel?: string;
}

const MOCK_ARTWORKS: Record<string, ArtworkData> = {
  "1": {
    id: "1",
    title: "מגדל הרוח",
    topic: "אדריכלות עתידנית",
    post: "מגדל הרוח נולד מתוך שאלה פשוטה — מה יקרה אם בניין ינשום? הפרויקט חוקר את הגבול בין מבנה סטטי לאורגניזם חי, עם חזית דינמית שמגיבה לתנאי מזג האוויר ומייצרת אנרגיה מתחדשת.",
    tags: ["אדריכלות", "עתידנות", "קיימות", "AI", "פרמטרי"],
    style: "ניאו-ברוטליזם",
    concept: "ארכיטקטורה נושמת",
    year: 2024,
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80",
    inspirationUrl: "https://example.com",
    inspirationLabel: "Zaha Hadid Architects",
  },
  "2": {
    id: "2",
    title: "גשר הזכוכית",
    topic: "תשתיות",
    post: "חיבור בין שני עולמות דרך שקיפות מוחלטת. גשר הזכוכית מציע מעבר שבו הנוף הוא חלק מהחוויה הפיזית של התנועה במרחב.",
    tags: ["תשתיות", "זכוכית", "חיבור", "נוף"],
    style: "מינימליזם",
    concept: "שקיפות כמעבר",
    year: 2023,
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=1200&q=80",
  },
};

const DEFAULT_ARTWORK: ArtworkData = {
  id: "0",
  title: "יצירה ללא שם",
  topic: "נושא",
  post: "תיאור היצירה יופיע כאן.",
  tags: ["אומנות"],
  style: "מעורב",
  concept: "חופשי",
  year: 2024,
  image: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=1200&q=80",
};

type ArtworkState = "loading" | "error" | "empty-image" | "loaded";

interface ArtworkCardProps {
  /** When true, renders as modal overlay with close button */
  asModal?: boolean;
  onClose?: () => void;
}

const ArtworkCard = ({ asModal = false, onClose }: ArtworkCardProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state] = useState<ArtworkState>("loaded");
  const [isFavorited, setIsFavorited] = useState(false);

  const artwork = MOCK_ARTWORKS[id ?? ""] ?? DEFAULT_ARTWORK;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: artwork.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const handlePrint = () => window.print();

  const handleEmail = () => {
    const subject = encodeURIComponent(artwork.title);
    const body = encodeURIComponent(`${artwork.title}\n\n${artwork.post}\n\n${window.location.href}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const content = (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-sm md:px-8">
        {asModal ? (
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Button>
        )}
      </div>

      {/* Loading */}
      {state === "loading" && (
        <div className="px-4 md:px-8 lg:px-12">
          <Skeleton className="mx-auto aspect-[3/2] max-h-[60vh] w-full max-w-4xl rounded-lg" />
          <div className="mx-auto mt-6 max-w-3xl space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא ניתן לטעון את היצירה</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {/* Loaded / Empty-image */}
      {(state === "loaded" || state === "empty-image") && (
        <div className="px-4 pb-12 md:px-8 lg:px-12">
          {/* Image */}
          {state === "empty-image" ? (
            <div className="mx-auto flex max-h-[60vh] max-w-4xl items-center justify-center rounded-lg bg-secondary aspect-[3/2]">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-12 w-12" />
                <span className="text-sm">אין תמונה</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl">
              <img
                src={artwork.image}
                alt={artwork.title}
                className="mx-auto max-h-[60vh] w-full rounded-lg object-contain"
              />
            </div>
          )}

          {/* Details */}
          <div className="mx-auto mt-6 max-w-3xl">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              {artwork.title}
            </h1>

            <p className="mt-2 text-base text-muted-foreground">{artwork.topic}</p>

            <p className="mt-4 text-base leading-relaxed text-foreground/90">{artwork.post}</p>

            {/* Tags */}
            <div className="mt-5 flex flex-wrap gap-2">
              {artwork.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Style + Concept badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                סגנון: {artwork.style}
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                קונספט: {artwork.concept}
              </span>
            </div>

            {/* Year */}
            <p className="mt-3 text-sm text-muted-foreground">{artwork.year}</p>

            {/* Inspiration */}
            {artwork.inspirationUrl && (
              <a
                href={artwork.inspirationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
              >
                מקור השראה — {artwork.inspirationLabel ?? "קישור"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
              <Button
                variant="ghost"
                onClick={() => setIsFavorited(!isFavorited)}
                className={`gap-2 ${isFavorited ? "text-primary" : "text-muted-foreground"} hover:text-primary`}
              >
                <Heart className={`h-4 w-4 ${isFavorited ? "fill-primary" : ""}`} />
                שמור למועדפים
              </Button>
              <Button
                variant="ghost"
                onClick={handleShare}
                className="gap-2 text-muted-foreground hover:text-primary"
              >
                <Share2 className="h-4 w-4" />
                שתפי
              </Button>
              <Button
                variant="ghost"
                onClick={handlePrint}
                className="gap-2 text-muted-foreground hover:text-primary"
              >
                <Printer className="h-4 w-4" />
                הדפיסי
              </Button>
              <Button
                variant="ghost"
                onClick={handleEmail}
                className="gap-2 text-muted-foreground hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                שלחי
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export default ArtworkCard;
